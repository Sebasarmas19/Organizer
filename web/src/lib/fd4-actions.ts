'use server';

/**
 * Organizer · Server mutations for FD4 UI actions.
 * All mutations run through authenticated user client (RLS) and revalidate active routes.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* Las tres rutas de FD4 comparten datos: marcar una tarea en Inicio cambia
   Pendientes y puede cambiar el punto de un dia en Calendario. Revalidar las
   tres es mas barato que razonar cual se salvo. */
function revalidateFd4() {
  revalidatePath('/', 'layout');
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  return { supabase, user };
}

/** Marcar o desmarcar una tarea. Es la unica accion de un solo toque. */
export async function toggleTask(id: string, done: boolean) {
  const { supabase, user } = await requireUser();

  /* Desmarcar la devuelve a donde estaba, no a "por clasificar": con fecha,
     planificada; sin fecha, en algún día (como al editarla). */
  let reopened: 'planned' | 'someday' = 'someday';
  if (!done) {
    const { data } = await supabase
      .from('items')
      .select('due_on')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.due_on) reopened = 'planned';
  }

  const { error } = await supabase
    .from('items')
    .update({
      status: done ? 'done' : reopened,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  /* El bloque de la hora sigue a la tarea. Sin esto, una tarea marcada en
     Inicio seguia "pendiente" en el calendario y en el cierre de la noche. */
  await supabase
    .from('blocks')
    .update({ status: done ? 'done' : 'pending' })
    .eq('item_id', id)
    .eq('user_id', user.id)
    .eq('source', 'manual');

  revalidateFd4();
}

/**
 * Quitar un reminder.
 * Regla 5 del proyecto ("nada se pierde en silencio"): las tareas que colgaban
 * de este reminder NO se borran — simplemente se desvinculan (reminder_id = null)
 * y siguen existiendo en Pendientes.
 */
export async function deleteReminder(id: string) {
  const { supabase, user } = await requireUser();

  // 1. Desvincular tareas asociadas
  const { error: unlinkError } = await supabase
    .from('items')
    .update({ reminder_id: null })
    .eq('reminder_id', id)
    .eq('user_id', user.id);

  if (unlinkError) throw new Error(unlinkError.message);

  // 2. Eliminar el reminder
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  revalidateFd4();
}

/**
 * Marcar o desmarcar una tarea desde el Calendario (riel de horas o chip sin hora).
 * Mantiene sincronizados `blocks` y `items`.
 */
export async function toggleBlockTask(
  blockId: string | null,
  itemId: string | null,
  done: boolean
) {
  const { supabase, user } = await requireUser();

  let resolvedItemId = itemId;

  if (blockId) {
    const { data: b, error: blockError } = await supabase
      .from('blocks')
      .update({ status: done ? 'done' : 'pending' })
      .eq('id', blockId)
      .eq('user_id', user.id)
      .select('item_id')
      .maybeSingle();

    if (blockError) throw new Error(blockError.message);

    if (b?.item_id && !resolvedItemId) {
      resolvedItemId = b.item_id;
    }
  }

  if (resolvedItemId) {
    const { error: itemError } = await supabase
      .from('items')
      .update({
        status: done ? 'done' : 'planned',
        completed_at: done ? new Date().toISOString() : null,
      })
      .eq('id', resolvedItemId)
      .eq('user_id', user.id);

    if (itemError) throw new Error(itemError.message);
  }

  revalidateFd4();
}


/* ------------------------------------------------------------- de ayer ----
   Las tres salidas del bloque "De ayer". Ninguna borra nada, que es la
   regla 5 del proyecto: si una tarea no se cumple, la app pregunta que
   hacer — no la arrastra sola ni la desaparece.                          */

/** "Hoy" · la tarea se mueve a la fecha de hoy. */
export async function moveTaskToDate(id: string, dateStr: string | null) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('items')
    .update({ due_on: dateStr, status: dateStr ? 'planned' : 'inbox' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  /* Si tenia hora, esa hora era de OTRO dia. Se suelta en vez de arrastrarla:
     la tarea queda "sin hora" en su nuevo dia y se le pone hora si hace falta. */
  await supabase
    .from('blocks')
    .delete()
    .eq('item_id', id)
    .eq('user_id', user.id)
    .eq('source', 'manual')
    .eq('status', 'pending');

  revalidateFd4();
}

/** "Quitar" · se le suelta la fecha y vuelve a Pendientes · Sin fecha.
    NO es borrar y no es descartar: la tarea sigue existiendo y sigue
    apareciendo, solo que ya no reclama un dia concreto. */
export async function unscheduleTask(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from('items')
    .update({ due_on: null, status: 'someday' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
  await supabase
    .from('blocks')
    .delete()
    .eq('item_id', id)
    .eq('user_id', user.id)
    .eq('source', 'manual')
    .eq('status', 'pending');
  revalidateFd4();
}

/* -------------------------------------------------------------- capturar --
   Sin campos obligatorios, sin categoria, sin fecha (regla 3). Entra en
   `inbox` y se clasifica despues, o nunca.                               */

export async function captureTask(title: string) {
  const raw = title.trim();
  if (!raw) return null;

  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from('items')
    .insert({ user_id: user.id, title: raw, status: 'inbox' })
    .select('id, title')
    .single();

  if (error) throw new Error(error.message);
  revalidateFd4();
  return data;
}
