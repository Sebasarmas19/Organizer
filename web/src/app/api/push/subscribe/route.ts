/* ============================================================================
   Organizer · POST/DELETE /api/push/subscribe

   Guarda (o borra) la suscripcion del navegador en `push_subscriptions`.

   USA EL CLIENTE CON SESION, NO EL DE SERVICIO. Es deliberado: asi la fila
   solo puede quedar a nombre de quien esta pidiendo, porque de eso se encarga
   RLS (`own subscriptions` en `docs/schema.sql`) y no un `if` que alguien
   pueda olvidar al refactorizar. La clave `service_role` no hace falta aqui y
   por tanto no aparece.

   `endpoint` es UNIQUE, asi que se hace `upsert` sobre esa columna: volver a
   entrar en el mismo telefono actualiza la fila en vez de fallar. Y limpia
   `failed_at`, que es el caso real de "reinstale la PWA y volvi a activar".
   ========================================================================= */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* Depende de la cookie de sesion: nunca estatica. */
export const dynamic = 'force-dynamic';

interface Body {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  userAgent?: unknown;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Cuerpo no válido' }, { status: 400 });
  }

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const p256dh = typeof body.p256dh === 'string' ? body.p256dh : '';
  const auth = typeof body.auth === 'string' ? body.auth : '';

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: 'Falta endpoint, p256dh o auth en la suscripción' },
      { status: 400 }
    );
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
      last_seen_at: new Date().toISOString(),
      /* Si esta suscripcion estaba marcada como muerta y el navegador la
         vuelve a dar por buena, revive. Sin esto, reinstalar la PWA dejaria
         una fila que el despachador se salta para siempre. */
      failed_at: null,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 });

  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta el endpoint' }, { status: 400 });
  }

  /* El filtro por `user_id` es redundante con RLS y se deja a proposito: si
     alguien desactivara la politica, esto sigue sin poder borrar lo ajeno. */
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
