/* ============================================================================
   Organizer · Variables de entorno

   Un solo sitio donde se leen, y un error legible cuando falta una. Sin esto,
   una variable ausente se manifiesta como "Invalid URL" a mitad de una
   peticion, que no le dice nada a nadie.

   Las `NEXT_PUBLIC_*` viajan al navegador: se escriben literales a proposito,
   porque Next sustituye el texto `process.env.NEXT_PUBLIC_X` en tiempo de
   compilacion y no lo hace si la clave se calcula.
   ========================================================================= */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      'Falta la variable de entorno ' +
        name +
        '. Copia web/.env.local.example a web/.env.local y rellenala.'
    );
  }
  return value;
}

/** URL del proyecto de Supabase. Publica: el cliente la necesita. */
export function supabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
}

/** Clave anonima. Publica por diseno: quien manda es RLS, no el secreto. */
export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * ¿Estan puestas las dos variables publicas?
 *
 * Existe porque la primera vez que se corre `npm run dev` todavia no hay
 * claves, y una pantalla de error de Next no le dice a nadie que tiene que
 * copiar `.env.local.example`. Con esto la app puede contarlo ella misma.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Token de autenticacion para POST /api/capture (Atajo de Siri). Solo servidor. */
export function captureToken(): string {
  return required(process.env.CAPTURE_TOKEN, 'CAPTURE_TOKEN');
}

