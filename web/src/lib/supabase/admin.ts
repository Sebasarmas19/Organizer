/* ============================================================================
   Organizer · Cliente de Supabase con SERVICE ROLE

   Se salta RLS. Es la llave maestra de la base de datos.

   `import 'server-only'` de la primera linea no es decoracion: si alguien
   importa este modulo desde un componente de cliente, la compilacion FALLA
   en vez de mandar la clave al navegador. Es la barrera que pide el brief,
   puesta donde se puede comprobar sola.

   En v1 lo usan dos cosas, y ninguna existe todavia:
     - POST /api/capture   (F1) — inserta la captura de Siri sin sesion
     - dispatch-notifications (F3) — Edge Function, corre sin usuario
   ========================================================================= */

import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl } from '@/lib/env';
import type { Database } from './database.types';

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Es la clave de servidor: va en ' +
        'web/.env.local y en Vercel, nunca en el navegador.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
