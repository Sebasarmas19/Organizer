/* ============================================================================
   Organizer · Acceso a Postgres desde la Edge Function

   POR QUE `fetch` CONTRA PostgREST Y NO `@supabase/supabase-js`
   -------------------------------------------------------------
   Por la misma razon que `webpush.ts` no usa `web-push`: este camino es el
   producto y no puede depender de que un registro de paquetes (npm, jsr,
   esm.sh) este disponible y compile en el Deno del dia. PostgREST es la misma
   API HTTP que usa la libreria por debajo; usarla directa quita una capa que
   solo aportaba azucar.

   Efecto lateral que importa: este archivo corre igual en Node, asi que el
   despachador entero se puede ejecutar en local contra la base de verdad antes
   de desplegar nada.

   CLAVE DE SERVICIO: se usa aqui porque el cron no tiene sesion de usuario y
   tiene que leer los datos del usuario para componer su dia. Se salta RLS por
   diseno (`docs/schema.sql`, al final). Nunca sale de este proceso.
   ========================================================================= */

export interface PostgrestConfig {
  url: string;
  serviceRoleKey: string;
}

async function request(
  config: PostgrestConfig,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return await fetch(config.url + '/rest/v1/' + path, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: 'Bearer ' + config.serviceRoleKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function select<T>(
  config: PostgrestConfig,
  path: string
): Promise<T[]> {
  const response = await request(config, path);
  if (!response.ok) {
    throw new Error(
      'PostgREST ' + response.status + ' en `' + path + '`: ' +
        (await response.text().catch(() => ''))
    );
  }
  return (await response.json()) as T[];
}

export async function update(
  config: PostgrestConfig,
  path: string,
  patch: Record<string, unknown>
): Promise<void> {
  const response = await request(config, path, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    throw new Error(
      'PostgREST PATCH ' + response.status + ' en `' + path + '`: ' +
        (await response.text().catch(() => ''))
    );
  }
}

export interface InsertResult {
  /** `false` cuando choco con un indice unico: ya existia. */
  inserted: boolean;
  row: Record<string, unknown> | null;
}

/**
 * Inserta tolerando el choque contra un indice UNIQUE.
 *
 * Es la pieza de la idempotencia. `notification_log.dedupe_key` es unico y el
 * cron corre cada 5 minutos: quien consigue insertar la clave es quien manda
 * la notificacion, y el resto de pasadas se encuentran el 23505 y se callan.
 * No hace falta ni bloqueo ni transaccion: el indice unico ya es el candado.
 */
export async function insertUnique(
  config: PostgrestConfig,
  table: string,
  row: Record<string, unknown>
): Promise<InsertResult> {
  const response = await request(config, table + '?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });

  if (response.status === 409) {
    await response.text().catch(() => '');
    return { inserted: false, row: null };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    /* PostgREST devuelve 409 para la violacion de unicidad, pero segun version
       puede llegar como 400 con el codigo de Postgres dentro. Se cubren los
       dos: confundir "ya estaba" con "fallo" haria que el cron reintentara
       para siempre. */
    if (text.includes('23505')) return { inserted: false, row: null };
    throw new Error('PostgREST POST ' + response.status + ' en `' + table + '`: ' + text);
  }

  const rows = (await response.json()) as Record<string, unknown>[];
  return { inserted: true, row: rows[0] ?? null };
}

/** Para `in.(a,b,c)` de PostgREST. */
export function inList(values: string[]): string {
  return '(' + values.map((value) => '"' + value.replace(/"/g, '') + '"').join(',') + ')';
}
