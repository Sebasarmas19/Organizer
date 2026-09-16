/* ============================================================================
   Organizer · Edge Function `dispatch-notifications`

   El unico sitio desde el que sale una notificacion. En iOS no existe la
   Notification Triggers API, asi que no hay forma de programar nada en el
   telefono: TODA notificacion sale de aqui (`docs/02-arquitectura.md`).

   Dos maneras de entrar, y se distinguen por quien firma:

     cron  ·  `pg_cron` llama cada 5 minutos con la clave de servicio.
              Mira que toca ahora para cada perfil y lo manda.

     test  ·  la app llama con el token del usuario en cuanto acepta el
              permiso, para mandarle una al instante. Sin esa notificacion el
              usuario no tiene forma de saber si funciono — y nosotros tampoco.

   Desplegar:

       npx supabase functions deploy dispatch-notifications --project-ref <ref>

   Secretos que necesita (`npx supabase secrets set …`):

       VAPID_PUBLIC_KEY     el mismo valor que NEXT_PUBLIC_VAPID_PUBLIC_KEY
       VAPID_PRIVATE_KEY    la privada; no sale de aqui
       VAPID_SUBJECT        mailto:<tu correo> · RFC 8292: Apple lo exige

   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase sola.
   ========================================================================= */

import { dispatchDue, dispatchTest, type DispatchEnvironment } from './dispatch.ts';

/* Declarado a mano para que `tsc` pueda comprobar este archivo sin tener Deno
   instalado (ver `tsconfig.json` de esta carpeta). En tiempo de ejecucion lo
   pone Deno. */
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};

const CORS = {
  /* La app vive en Vercel y la funcion en Supabase: son origenes distintos, y
     sin esto el navegador ni siquiera manda la peticion. */
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      'Falta el secreto ' + name + ' en la Edge Function. Se ponen con ' +
        '`npx supabase secrets set ' + name + '=…`.'
    );
  }
  return value;
}

function environment(): DispatchEnvironment {
  return {
    db: {
      url: requireEnv('SUPABASE_URL'),
      serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    },
    vapid: {
      publicKey: requireEnv('VAPID_PUBLIC_KEY'),
      privateKey: requireEnv('VAPID_PRIVATE_KEY'),
      subject: requireEnv('VAPID_SUBJECT'),
    },
  };
}

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/**
 * Quien llama con el token del usuario tiene que demostrar que ES ese usuario.
 * Se pregunta a Supabase Auth en vez de decodificar el JWT por nuestra cuenta:
 * decodificar sin verificar la firma es exactamente el fallo que convierte una
 * comprobacion en un adorno.
 */
async function userFromToken(url: string, anonOrUserToken: string): Promise<string | null> {
  const response = await fetch(url + '/auth/v1/user', {
    headers: {
      apikey: anonOrUserToken,
      Authorization: 'Bearer ' + anonOrUserToken,
    },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string };
  return user.id ?? null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  let env: DispatchEnvironment;
  try {
    env = environment();
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  const token = bearer(request);
  if (!token) return json({ error: 'Falta la cabecera Authorization' }, 401);

  let mode = 'cron';
  try {
    const body = (await request.json()) as { mode?: string };
    if (body?.mode) mode = body.mode;
  } catch {
    /* El cron llama sin cuerpo. No es un error. */
  }

  try {
    if (mode === 'test') {
      const userId = await userFromToken(env.db.url, token);
      if (!userId) return json({ error: 'Sesión no válida' }, 401);
      return json(await dispatchTest(env, userId));
    }

    /* Modo cron: solo con la clave de servicio. La comparacion es directa
       porque las claves nuevas de Supabase (`sb_secret_…`) no son JWT y no hay
       nada que decodificar. */
    if (token !== env.db.serviceRoleKey) {
      return json({ error: 'Este modo es solo para el cron' }, 403);
    }
    return json(await dispatchDue(env));
  } catch (error) {
    /* Se devuelve 500 con el motivo dentro: el cron lo registra en
       `cron.job_run_details` y ahi es donde se mira cuando algo deja de
       llegar. Un 200 silencioso haria invisible el fallo. */
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
