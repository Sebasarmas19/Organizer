/* ============================================================================
   Organizer · POST /api/push/action
   Acciones interactivas desde notificaciones Push (✓ Ya la hice, Pasar a mañana).
   Hardening: Autenticación por sesión o token firmado HMAC, verificación estricta
   de propiedad del recurso (anti-IDOR) y validación de parámetros.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { verifyPushActionToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: { action?: string; itemId?: string; blockId?: string; actionToken?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const { action, itemId, blockId } = body;
  if (!itemId || !action || (action !== 'done' && action !== 'tomorrow')) {
    return NextResponse.json({ error: 'Parámetros insuficientes' }, { status: 400 });
  }

  if (!UUID_REGEX.test(itemId) || (blockId && !UUID_REGEX.test(blockId))) {
    return NextResponse.json({ error: 'Identificador con formato inválido' }, { status: 400 });
  }

  // 1. Obtener usuario de sesión (cookies)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  // 2. Si no hay sesión en cookies del SW, validar el actionToken criptográfico HMAC
  if (!userId) {
    const pushToken = body.actionToken || body.token;
    if (pushToken) {
      const verified = verifyPushActionToken(pushToken, itemId);
      if (verified.valid && verified.userId) {
        userId = verified.userId;
      }
    }
  }

  // Si no se pudo verificar la identidad ni por sesión ni por token firmado, rechazar
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 3. Verificar que la tarea exista y pertenezca estrictamente al usuario (anti-IDOR)
  const { data: item, error: itemErr } = await admin
    .from('items')
    .select('id, user_id')
    .eq('id', itemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (itemErr || !item) {
    return NextResponse.json({ error: 'Tarea no encontrada o no autorizada' }, { status: 404 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();

  const timezone = profile?.timezone || DEFAULT_TIMEZONE;
  const nowIso = new Date().toISOString();

  if (action === 'done') {
    // 1. Marcar la tarea como completada
    await admin
      .from('items')
      .update({ status: 'done', completed_at: nowIso })
      .eq('id', itemId)
      .eq('user_id', userId);

    // 2. Marcar el bloque como hecho si existe
    if (blockId) {
      await admin
        .from('blocks')
        .update({ status: 'done' })
        .eq('id', blockId)
        .eq('user_id', userId);
    } else {
      await admin
        .from('blocks')
        .update({ status: 'done' })
        .eq('item_id', itemId)
        .eq('user_id', userId);
    }

    return NextResponse.json({ ok: true, message: 'Tarea completada' });
  }

  if (action === 'tomorrow') {
    const todayStr = getTodayString(timezone);
    const tomorrowStr = addDays(todayStr, 1);

    // 1. Mover la tarea a mañana
    await admin
      .from('items')
      .update({ due_on: tomorrowStr, status: 'planned' })
      .eq('id', itemId)
      .eq('user_id', userId);

    // 2. Soltar el bloque manual pendiente de hoy
    await admin
      .from('blocks')
      .delete()
      .eq('item_id', itemId)
      .eq('user_id', userId)
      .eq('source', 'manual')
      .eq('status', 'pending');

    return NextResponse.json({ ok: true, message: 'Tarea postergada para mañana' });
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
}
