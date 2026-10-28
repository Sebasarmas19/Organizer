/* ============================================================================
   Organizer · POST /api/push/action
   Acciones interactivas desde notificaciones Push (✓ Ya la hice, Pasar a mañana).
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays, getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { action?: string; itemId?: string; blockId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de petición inválido' }, { status: 400 });
  }

  const { action, itemId, blockId } = body;
  if (!itemId || !action || (action !== 'done' && action !== 'tomorrow')) {
    return NextResponse.json({ error: 'Parámetros insuficientes' }, { status: 400 });
  }

  // Intentar obtener usuario de sesión
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch {}

  const admin = createAdminClient();

  // Si no hay sesión en cookies del SW, buscar el user_id del item
  if (!userId) {
    const { data: item } = await admin
      .from('items')
      .select('user_id')
      .eq('id', itemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }
    userId = item.user_id;
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
