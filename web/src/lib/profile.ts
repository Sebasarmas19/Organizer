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

/** La zona del perfil, o la de por defecto si todavía no hay fila. */
export async function getProfileTimezone(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  const { data } = await supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle();
  return data?.timezone ?? DEFAULT_TIMEZONE;
}

/**
 * Resuelve de forma determinista el perfil del dueño de la aplicación.
 * Si se especifica ALLOWED_EMAILS en el entorno, prioriza la cuenta autorizada.
 * Si no o en caso de fallo, selecciona el primer perfil creado (orden determinista por created_at).
 */
export async function getOwnerProfile(
  admin: SupabaseClient<Database>
): Promise<{ id: string; timezone: string } | null> {
  const allowed = process.env.ALLOWED_EMAILS?.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (allowed && allowed.length > 0 && !allowed.includes('*')) {
    try {
      const { data: usersData } = await admin.auth.admin.listUsers();
      const ownerUser = usersData?.users?.find(
        (u) => u.email && allowed.includes(u.email.toLowerCase())
      );
      if (ownerUser) {
        const { data: p } = await admin
          .from('profiles')
          .select('id, timezone')
          .eq('id', ownerUser.id)
          .maybeSingle();
        if (p) return { id: p.id, timezone: p.timezone || DEFAULT_TIMEZONE };
      }
    } catch {
      // Continuar con el fallback determinista
    }
  }

  const { data: fallback } = await admin
    .from('profiles')
    .select('id, timezone')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback) {
    return { id: fallback.id, timezone: fallback.timezone || DEFAULT_TIMEZONE };
  }
  return null;
}

