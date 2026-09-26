/* ============================================================================
   Organizer · POST /api/push/test

   Dispara una notificación de prueba al usuario autenticado usando el
   despachador de Web Push (VAPID + RFC 8291).
   ========================================================================= */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dispatchTest, type DispatchEnvironment } from '@/lib/push/server/dispatch';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:organizer@example.com';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: 'Faltan variables de configuración VAPID o Supabase en el servidor' },
      { status: 500 }
    );
  }

  const env: DispatchEnvironment = {
    db: {
      url: supabaseUrl,
      serviceRoleKey,
    },
    vapid: {
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
      subject: vapidSubject,
    },
  };

  try {
    const report = await dispatchTest(env, user.id);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al enviar notificación de prueba' },
      { status: 500 }
    );
  }
}
