'use server';

/* ============================================================================
   Organizer · F4 · Lo que escribe el ritual del domingo

   Mover, mandar a "algun dia" y marcar hecha ya existen (`fd4-actions.ts`) y
   el ritual las usa tal cual. Aqui solo vive lo nuevo:

     restoreTask   -> "Deshacer": la tarea vuelve exactamente a como estaba
     captureLines  -> vaciar la cabeza: una linea, una tarea sin dia
     finishReview  -> cerrar la semana en `weekly_reviews`

   Todo pasa por el cliente del usuario (RLS), nunca por la clave de servicio.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { addDays, getTodayString } from '@/lib/date-utils';
import { reviewWeekStart } from '@/lib/push/server/schedule';
import type { TaskBefore } from './data';

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  return { supabase, user };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RESTORABLE: TaskBefore['status'][] = ['inbox', 'someday', 'planned'];

/**
 * Deshacer una decision del ritual. La tarea recupera su dia y su estado.
 * Lo unico que no vuelve es la hora: al moverla se solto su bloque, igual
 * que en "Lo de ayer", y una hora de otro dia no tiene sentido recuperarla.
 */
export async function restoreTask(id: string, before: TaskBefore) {
  if (before.due_on !== null && !DATE_RE.test(before.due_on)) throw new Error('Fecha no válida');
  if (!RESTORABLE.includes(before.status)) throw new Error('Estado no válido');

  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('items')
    .update({ due_on: before.due_on, status: before.status, completed_at: null })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);

  /* Si se habia marcado hecha, su bloque tambien: vuelve a pendiente. */
  await supabase
    .from('blocks')
    .update({ status: 'pending' })
    .eq('item_id', id)
    .eq('user_id', user.id)
    .eq('source', 'manual')
    .eq('status', 'done');

  revalidatePath('/', 'layout');
}

/**
 * Vaciar la cabeza: cada linea no vacia es una tarea sin dia (regla 3: sin
 * campos, sin categoria). Es la migracion de Notion y WhatsApp que la
 * decision 21 deja para la primera revision.
 */
export async function captureLines(text: string): Promise<{ id: string; title: string }[]> {
  const titles = text
    .split(/\r?\n/)
    /* Lo que se pega de una lista trae viñetas y casillas: fuera. */
    .map((line) => line.replace(/^\s*(?:[-*•·]|\[[ xX]?\]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .map((line) => line.slice(0, 200))
    .slice(0, 50);
  if (titles.length === 0) return [];

  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('items')
    .insert(titles.map((title) => ({ user_id: user.id, title, status: 'inbox' as const })))
    .select('id, title, created_at')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  revalidatePath('/', 'layout');
  /* El orden de la respuesta no esta garantizado: se devuelve el del texto. */
  const byTitle = new Map<string, { id: string; title: string }[]>();
  for (const row of data ?? []) {
    byTitle.set(row.title, [...(byTitle.get(row.title) ?? []), { id: row.id, title: row.title }]);
  }
  return titles.flatMap((title) => byTitle.get(title)?.shift() ?? []);
}

/**
 * Cerrar la semana. Se puede volver a cerrar: actualiza la hora y los
 * numeros, no crea otra fila (`unique (user_id, week_start)`).
 *
 * `counts` viene del cliente y solo sirve de registro (cuantas se movieron
 * a la semana, cuantas a "algun dia", cuantas capturas se planificaron). Lo
 * que se ve se calcula aqui: las tareas con dia dentro de la semana.
 */
export async function finishReview(
  weekStart: string,
  counts: { carried: number; dropped: number; promoted: number }
): Promise<{ planned: number }> {
  if (!DATE_RE.test(weekStart)) throw new Error('Semana no válida');
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  const today = getTodayString(profile?.timezone ?? DEFAULT_TIMEZONE);
  /* Solo la semana que toca armar hoy, o la que se acaba de armar (por si
     se cierra pasada la medianoche del domingo). */
  if (weekStart !== reviewWeekStart(today) && weekStart !== reviewWeekStart(addDays(today, -1))) {
    throw new Error('Esa semana ya no se está armando');
  }

  const { count } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('due_on', weekStart)
    .lte('due_on', addDays(weekStart, 6))
    .in('status', ['inbox', 'someday', 'planned', 'done']);

  const clamp = (n: number) => Math.max(0, Math.min(999, Math.round(Number(n) || 0)));
  const now = new Date().toISOString();

  const { error } = await supabase.from('weekly_reviews').upsert(
    {
      user_id: user.id,
      week_start: weekStart,
      completed_at: now,
      items_planned: count ?? 0,
      items_carried: clamp(counts.carried),
      items_dropped: clamp(counts.dropped),
      ideas_promoted: clamp(counts.promoted),
    },
    { onConflict: 'user_id,week_start' }
  );
  if (error) throw new Error(error.message);

  await supabase.from('profiles').update({ last_review_at: now }).eq('id', user.id);

  revalidatePath('/', 'layout');
  return { planned: count ?? 0 };
}
