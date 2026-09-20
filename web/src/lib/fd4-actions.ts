'use server';

/* ============================================================================
   Organizer · FD4 · las mutaciones que hacen las pantallas nuevas

   POR QUE ESTE ARCHIVO EXISTE Y NO REUSO `app/tareas/actions.ts`
   Aquel modulo revalida `/tareas`, que es la ruta de F1. FD4 mueve las
   pantallas a `/`, `/calendario` y `/pendientes`, y una accion que revalida
   la ruta equivocada no falla: simplemente deja la pantalla mintiendo hasta
   la siguiente navegacion. Eso es peor que fallar.

   Asi que las mutaciones de FD4 viven aqui y revalidan las rutas de FD4.
   `app/tareas/actions.ts` se queda intacto sosteniendo las rutas viejas
   mientras existan.

   Todas pasan por el cliente de usuario, o sea por RLS. Ninguna toca la
   clave de servicio: si una politica esta mal, aqui se nota.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/* Las tres rutas de FD4 comparten datos: marcar una tarea en Inicio cambia
   Pendientes y puede cambiar el punto de un dia en Calendario. Revalidar las
   tres es mas barato que razonar cual se salvo. */
function revalidateFd4() {
  revalidatePath('/');
  revalidatePath('/calendario');
  revalidatePath('/pendientes');
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
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from('items')
    .update({
      status: done ? 'done' : 'inbox',
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateFd4();
}

/* ------------------------------------------------------------- de ayer ----
   Las tres salidas del bloque "De ayer". Ninguna borra nada, que es la
   regla 5 del proyecto: si una tarea no se cumple, la app pregunta que
   hacer — no la arrastra sola ni la desaparece.                          */

/** "Hoy" · la tarea se mueve a la fecha de hoy. */
export async function moveTaskToDate(id: string, dateStr: string | null) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from('items')
    .update({ due_on: dateStr, status: 'inbox' })
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidateFd4();
}

/** "Quitar" · se le suelta la fecha y vuelve a Pendientes · Sin fecha.
    NO es borrar y no es descartar: la tarea sigue existiendo y sigue
    apareciendo, solo que ya no reclama un dia concreto. */
export async function unscheduleTask(id: string) {
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from('items')
    .update({ due_on: null, status: 'someday' })
    .eq('id', id);

  if (error) throw new Error(error.message);
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
