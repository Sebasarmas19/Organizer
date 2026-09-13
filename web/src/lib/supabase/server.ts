/* ============================================================================
   Organizer · Cliente de Supabase en el SERVIDOR

   Uno nuevo por peticion, nunca compartido: lleva las cookies de sesion de
   quien esta pidiendo, y reusarlo entre peticiones seria servirle la sesion
   de uno a otro.

   Sobre el try/catch de `setAll`: desde un Server Component no se pueden
   escribir cookies. Eso no es un fallo mientras `proxy.ts` refresque la
   sesion en cada peticion, que es justo lo que hace. El catch existe para
   ese caso concreto y esta documentado para que nadie lo lea como "aqui se
   traga un error".
   ========================================================================= */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from './database.types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* Server Component: no puede escribir cookies. Lo resuelve proxy.ts. */
        }
      },
    },
  });
}
