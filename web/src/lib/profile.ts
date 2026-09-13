/* ============================================================================
   Organizer · La fila de `profiles`

   La app es de un solo usuario y no tiene registro: el magic link crea la
   cuenta en `auth.users`, pero `profiles` no se rellena solo. Sin esa fila no
   hay zona horaria, y sin zona horaria el despachador de notificaciones no
   puede contestar "¿son las 8:00 para este usuario?" — que es la pregunta de
   la que depende el producto entero (`docs/00-problema.md`).

   Por eso se crea en el retorno del enlace, en el primer momento en que hay
   sesion, y no en una pantalla de bienvenida que el usuario podria saltarse.

   ZONA HORARIA: 'America/Caracas' (decision 14). UTC-4 SIN horario de verano.
   No usar 'America/New_York': hoy coincide, y en noviembre correria todas las
   notificaciones una hora.

   El insert es idempotente. `upsert` con `ignoreDuplicates` no pisa lo que el
   usuario haya cambiado despues —sus horas de notificacion, su racha— si
   vuelve a entrar con otro enlace.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

/** Decision 14. Escrito una sola vez en todo el proyecto. */
export const DEFAULT_TIMEZONE = 'America/Caracas';

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ created: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, timezone: DEFAULT_TIMEZONE },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select('id');

  if (error) return { created: false, error: error.message };

  /* Con `ignoreDuplicates` el upsert es un ON CONFLICT DO NOTHING: devuelve
     la fila solo cuando de verdad la ha insertado. Vacio = ya existia. */
  return { created: (data?.length ?? 0) > 0, error: null };
}
