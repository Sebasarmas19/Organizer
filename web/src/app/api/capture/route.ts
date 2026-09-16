import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureToken } from '@/lib/env';

/**
 * POST /api/capture
 *
 * Endpoint invocado por el Atajo de iOS ("Oye Siri, anota...").
 * Inserta siempre UNA TAREA en items con status = 'inbox' (decision 48).
 * Sin fecha, sin contexto, sin campos obligatorios salvo el titulo (regla 3).
 *
 * Debe responder en menos de un segundo para que el Atajo no se sienta lento.
 */
export async function POST(request: NextRequest) {
  /* 1. Validar autorizacion */
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
      { error: 'CAPTURE_TOKEN no esta configurado en el servidor' },
      { status: 500 }
    );
  }

  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: 'Token invalido' }, { status: 401 });
  }

  /* 2. Parsear y validar el cuerpo JSON */
  let text = '';
  try {
    const body = await request.json();
    if (typeof body?.text === 'string') {
      text = body.text.trim();
    }
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de peticion invalido (se esperaba JSON)' },
      { status: 400 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: 'El campo text es obligatorio' },
      { status: 400 }
    );
  }

  /* 3. Obtener el usuario dueno e insertar la tarea */
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontro el usuario en profiles' },
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
    return NextResponse.json(
      { error: insertError?.message ?? 'Error al insertar la tarea' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: item.id, title: item.title },
    { status: 201 }
  );
}
