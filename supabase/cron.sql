-- ============================================================================
-- Organizer · El reloj de las notificaciones
--
-- Supabase llama cada 5 minutos a la app desplegada en Vercel, y la app
-- decide qué toca mandar (mañana, noche, domingo, recursos, avisos antes de
-- clase, reminders sin preparar). Todo el código de envío vive en
-- `web/src/lib/push/server/`; ya no hay Edge Function.
--
-- Se pega ENTERO en el SQL Editor de Supabase, una sola vez, después de
-- desplegar en Vercel. Antes hay que sustituir dos cosas:
--
--     <APP_URL>       la URL de Vercel, sin barra final: https://organizer-xxx.vercel.app
--     <CRON_SECRET>   el mismo valor que la variable CRON_SECRET en Vercel
--
-- Por qué Supabase y no Vercel Cron: el plan gratis de Vercel solo permite un
-- cron al día, y aquí hace falta cada 5 minutos (las horas las eliges tú, y
-- los avisos "15 min antes" necesitan precisión).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Se desprograma primero para poder volver a pegar este archivo cuando
-- cambie la URL o el secreto.
select cron.unschedule('dispatch-notifications')
where exists (select 1 from cron.job where jobname = 'dispatch-notifications');

-- Que corra doce veces por hora NO duplica nada: `notification_log.dedupe_key`
-- es UNIQUE y se escribe ANTES de enviar. La primera pasada manda; las demás
-- encuentran la clave puesta y se callan.
select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := '<APP_URL>/api/push/cron',
    headers := '{"Authorization": "Bearer <CRON_SECRET>", "Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);


-- ══════════════════════════════════════════════════════════════════════════
-- COMPROBAR QUE FUNCIONA
-- ══════════════════════════════════════════════════════════════════════════

-- 1 · ¿existe el trabajo y está activo?
--   select jobid, jobname, schedule, active from cron.job;

-- 2 · ¿qué contestó la app? (200 = bien; 401 = CRON_SECRET distinto; 500 = mirar content)
--   select status_code, left(content, 300), created
--   from net._http_response order by created desc limit 10;

-- 3 · ¿qué se ha mandado de verdad?
--   select kind, dedupe_key, status, error, sent_at
--   from notification_log order by sent_at desc limit 20;

-- 4 · ¿hay algún teléfono suscrito? Sin filas aquí no llega nada.
--   select endpoint, last_seen_at, failed_at from push_subscriptions;


-- ══════════════════════════════════════════════════════════════════════════
-- APAGARLO
-- ══════════════════════════════════════════════════════════════════════════
--   select cron.unschedule('dispatch-notifications');
