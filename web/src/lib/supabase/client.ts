/* ============================================================================
   Organizer · Cliente de Supabase en el NAVEGADOR

   Se usa solo desde componentes marcados con 'use client'. Lleva la clave
   anonima, que es publica por diseno: lo que protege los datos es RLS
   (`docs/schema.sql`), no el secreto de la clave.

   Lo que NUNCA entra aqui: `SUPABASE_SERVICE_ROLE_KEY`. Esa vive en
   `admin.ts`, que es `server-only` y falla la compilacion si alguien la
   importa desde el cliente.
   ========================================================================= */

import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
