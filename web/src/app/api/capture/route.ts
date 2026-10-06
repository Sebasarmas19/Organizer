/* ============================================================================
   Organizer · POST /api/capture
   Endpoint invocado por el Atajo de iOS ("Oye Siri, anota...").

   Lee la frase dictada (src/lib/capture/parse.ts):
   · con fecha            → tarea planificada ese día
   · con hora             → además, bloque en el calendario y aviso 15 min antes
   · empieza "recordatorio" y trae fecha → reminder
   · sin fecha            → tarea a la bandeja, como siempre (regla 3)
   Devuelve `message`, una frase para que el Atajo la lea en voz alta.
   Protegido por CAPTURE_TOKEN con tiempo constante y límites de payload.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureToken } from '@/lib/env';
import { timingSafeCompare } from '@/lib/security';
import { parseCapture, type ParsedCapture } from '@/lib/capture/parse';
import { localDateOf, localTimeOf, timeToMinutes, zonedIso } from '@/lib/tz';

const BLOCK_MINUTES = 60;
const REMIND_BEFORE_MIN = 15;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "hoy", "mañana", "el viernes 9", "el jueves 15 de octubre". */
function sayDate(date: string, today: string): string {
  if (date === today) return 'hoy';
  if (date === addDays(today, 1)) return 'mañana';
  const d = new Date(date + 'T00:00:00Z');
  const base = `el ${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
  return date <= addDays(today, 6) ? base : `${base} de ${MONTHS[d.getUTCMonth()]}`;
}

function sayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `a las ${h}:${String(m).padStart(2, '0')}`;
}

function sayResult(parsed: ParsedCapture, kind: 'task' | 'reminder' | 'inbox', today: string): string {
  if (kind === 'inbox') {
    return parsed.kind === 'reminder'
      ? `No entendí la fecha. Lo dejé en la bandeja: ${parsed.title}.`
      : `Anotado: ${parsed.title}.`;
  }
  const when = [sayDate(parsed.date as string, today), parsed.time ? sayTime(parsed.time) : '']
    .filter(Boolean)
    .join(' ');
  if (kind === 'reminder') return `Reminder ${when}: ${parsed.title}.`;
  const aviso = parsed.time ? ` Te aviso ${REMIND_BEFORE_MIN} minutos antes.` : '';
  return `Tarea para ${when}: ${parsed.title}.${aviso}`;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  /* 1. Limitar tamaño de cabecera Content-Length para prevenir DoS */
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 32768) {
    return NextResponse.json(
      { error: 'Cuerpo de petición excede el límite permitido (32KB)' },
      { status: 413 }
    );
  }

  /* 2. Validar autorización con comparación en tiempo constante */
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const providedToken = authHeader.slice(7).trim();
  let expectedToken: string;
  try {
    expectedToken = captureToken();
  } catch {
    return NextResponse.json(
      { error: 'CAPTURE_TOKEN no está configurado en el servidor' },
      { status: 500 }
    );
  }

  if (!timingSafeCompare(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  /* 3. Parsear y validar el cuerpo JSON */
  let text = '';
  try {
    const body = await request.json();
    if (typeof body?.text === 'string') {
      text = body.text.trim();
    }
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido (se esperaba JSON)' },
      { status: 400 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: 'El campo text es obligatorio' },
      { status: 400 }
    );
  }

  if (text.length > 500) {
    return NextResponse.json(
      { error: 'El texto excede el límite de 500 caracteres' },
      { status: 400 }
    );
  }

  /* 4. El dueño y su zona horaria: "mañana" depende de dónde estés. */
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, timezone')
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontró el usuario en profiles' },
      { status: 500 }
    );
  }

  const timezone = profile.timezone || 'America/Caracas';
  const nowIso = new Date().toISOString();
  const today = localDateOf(nowIso, timezone);
  const parsed = parseCapture(text, {
    date: today,
    minutes: timeToMinutes(localTimeOf(nowIso, timezone)),
  });

  /* 5a. Reminder: solo si trae fecha. Sin fecha no es un reminder. */
  if (parsed.kind === 'reminder' && parsed.date) {
    const { data: reminder, error } = await admin
      .from('reminders')
      .insert({
        user_id: profile.id,
        title: parsed.title,
        occurs_on: parsed.date,
        occurs_at: parsed.time,
      })
      .select('id, title')
      .single();

    if (error || !reminder) {
      console.error('Database insert error in /api/capture (reminder):', error);
      return NextResponse.json({ error: 'Error al crear el reminder' }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: reminder.id,
        kind: 'reminder',
        title: reminder.title,
        date: parsed.date,
        time: parsed.time,
        message: sayResult(parsed, 'reminder', today),
      },
      { status: 201 }
    );
  }

  /* 5b. Tarea: con fecha queda planificada; sin fecha va a la bandeja. */
  const planned = parsed.kind === 'task' && parsed.date !== null;
  const title = parsed.kind === 'reminder' || planned ? parsed.title : text;

  const { data: item, error: insertError } = await admin
    .from('items')
    .insert({
      user_id: profile.id,
      title,
      status: planned ? 'planned' : 'inbox',
      due_on: planned ? parsed.date : null,
    })
    .select('id, title')
    .single();

  if (insertError || !item) {
    console.error('Database insert error in /api/capture:', insertError);
    return NextResponse.json(
      { error: 'Error al insertar la tarea' },
      { status: 500 }
    );
  }

  /* Con hora: su hueco en el calendario y el aviso antes, como si la
     hubieras creado a mano en la app. */
  if (planned && parsed.time && parsed.date) {
    const endTotal = timeToMinutes(parsed.time) + BLOCK_MINUTES;
    const endDate = endTotal >= 24 * 60 ? addDays(parsed.date, 1) : parsed.date;
    const endMin = endTotal % (24 * 60);
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const { error: blockError } = await admin.from('blocks').insert({
      user_id: profile.id,
      item_id: item.id,
      title: item.title,
      starts_at: zonedIso(parsed.date, parsed.time, timezone),
      ends_at: zonedIso(endDate, endTime, timezone),
      status: 'pending',
      source: 'manual',
      reminder_min: REMIND_BEFORE_MIN,
    });
    /* La tarea ya está guardada: un fallo aquí no la pierde. */
    if (blockError) console.error('Block insert error in /api/capture:', blockError);
  }

  const kind = planned ? 'task' : 'inbox';
  return NextResponse.json(
    {
      id: item.id,
      kind,
      title: item.title,
      date: planned ? parsed.date : null,
      time: planned ? parsed.time : null,
      message: planned
        ? sayResult({ ...parsed, title: item.title }, 'task', today)
        : sayResult({ ...parsed, title: item.title }, 'inbox', today),
    },
    { status: 201 }
  );
}
