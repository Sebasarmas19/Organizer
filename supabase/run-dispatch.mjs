/* ============================================================================
   Organizer · Correr el despachador en local, contra la base de verdad

       node supabase/run-dispatch.mjs cron
       node supabase/run-dispatch.mjs cron --now=2026-09-15T12:00:00Z
       node supabase/run-dispatch.mjs preview --now=2026-09-15T12:00:00Z
       node supabase/run-dispatch.mjs test --user=<uuid>

   POR QUE EXISTE
   --------------
   La Edge Function solo usa `fetch`, `crypto.subtle` y `Deno.env`. Node 24
   trae los dos primeros, asi que el MISMO codigo que se despliega se puede
   ejecutar aqui. Eso permite comprobar contra la base en linea —claves VAPID,
   consultas, idempotencia, texto compuesto— antes de desplegar nada y sin
   necesitar un iPhone delante.

     cron     hace lo que hara `pg_cron`: mira que toca y lo manda de verdad.
     preview  NO MANDA NADA. Compone el texto del dia y lo imprime con su
              largo, para ver si cabe en los 38 y 88 de iOS.
     test     manda la notificacion de prueba a un usuario.

   Lee las claves de `web/.env.local`, que git ignora.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');

function loadEnv() {
  const text = readFileSync(join(repoRoot, 'web', '.env.local'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnv();
const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) ?? 'preview';
const flag = (name) => {
  const found = args.find((a) => a.startsWith('--' + name + '='));
  return found ? found.slice(name.length + 3) : undefined;
};

const missing = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
].filter((name) => !env[name]);
if (missing.length) {
  console.error('Faltan en web/.env.local: ' + missing.join(', '));
  process.exit(1);
}

const environment = {
  db: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },
  vapid: {
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT ?? 'mailto:organizer@example.com',
  },
  now: flag('now') ? new Date(flag('now')) : undefined,
};

const { dispatchDue, dispatchTest } = await import(
  './functions/dispatch-notifications/dispatch.ts'
);
const { previewDay } = await import('./functions/dispatch-notifications/dispatch.ts');

if (mode === 'preview') {
  const preview = await previewDay(environment, flag('user'));
  for (const [label, text] of Object.entries(preview)) {
    console.log('\n── ' + label + ' ' + '─'.repeat(Math.max(0, 30 - label.length)));
    console.log('  título  (' + String(text.title.length).padStart(2) + '/38)  ' + text.title);
    console.log('  cuerpo  (' + String(text.body.length).padStart(2) + '/88)  ' + text.body);
    if (text.title.length > 38 || text.body.length > 88) {
      console.log('  ⚠ SE PASA DEL TECHO DE iOS');
    }
  }
  console.log('');
} else if (mode === 'test') {
  const user = flag('user');
  if (!user) {
    console.error('Falta --user=<uuid>. Sale de la tabla `profiles`.');
    process.exit(1);
  }
  console.log(JSON.stringify(await dispatchTest(environment, user), null, 2));
} else {
  console.log(JSON.stringify(await dispatchDue(environment), null, 2));
}
