/* ============================================================================
   Organizer · POST /api/capture
   Endpoint invocado por el Atajo de iOS ("Oye Siri, anota...").
   Inserta siempre UNA TAREA en items con status = 'inbox' (decision 48).
   Sin fecha, sin contexto, sin campos obligatorios salvo el titulo (regla 3).
   Protegido por CAPTURE_TOKEN con tiempo constante y límites de payload.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureToken } from '@/lib/env';
import { timingSafeCompare } from '@/lib/security';

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

  /* 4. Obtener el usuario dueño e insertar la tarea */
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontró el usuario en profiles' },
      { status: 500 }
    );
  }

  /* Siempre tarea (decision 48), status = 'inbox' */
  const { data: item, error: insertError } = await admin
    .from('items')
    .insert({
      user_id: profile.id,
      title: text,
      status: 'inbox',
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

  return NextResponse.json(
    { id: item.id, title: item.title },
    { status: 201 }
  );
}
