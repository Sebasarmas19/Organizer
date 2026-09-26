/* ============================================================================
   Organizer · POST /api/push/cron & GET /api/push/cron

   Ejecuta el despachador de notificaciones programadas (mañana, noche,
   revisión semanal, avisos anticipados).
   Protegido por Bearer token (SUPABASE_SERVICE_ROLE_KEY o CRON_SECRET).
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { dispatchDue, type DispatchEnvironment } from '@/lib/push/server/dispatch';

export const dynamic = 'force-dynamic';

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  const validTokens = [serviceRoleKey, cronSecret].filter(Boolean);
  const providedToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!providedToken || !validTokens.includes(providedToken)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:organizer@example.com';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { error: 'Faltan variables de configuración en el servidor' },
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
    const report = await dispatchDue(env);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error en despachador cron' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
