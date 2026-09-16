-- ============================================================================
-- Organizer · El reloj de las notificaciones
--
-- Se pega ENTERO en el SQL Editor de Supabase, una sola vez, despues de
-- desplegar la Edge Function. Antes hay que sustituir dos cosas:
--
--     <PROJECT_REF>        el que sale en la URL del proyecto
--     <SERVICE_ROLE_KEY>   Project Settings → API → service_role
--
-- POR QUE ESTE ARCHIVO NO ES `docs/schema.sql`
-- --------------------------------------------
-- Dos razones. La primera: `docs/schema.sql` es del coordinador y F1 y F2
-- dependen de el ahora mismo; el brief de F3 dice expresamente que no se toca
-- sin preguntar. La segunda es de fondo: esto lleva DENTRO la clave de
-- servicio, asi que no puede vivir en un archivo que se commitea con un valor
-- de verdad. El esquema describe la base; esto la conecta a un despliegue
-- concreto. Son cosas distintas.
--
-- LO QUE FALTA EN `docs/schema.sql`, y conviene que el coordinador arregle:
-- el bloque de cron comentado al final usa `net.http_post`, pero el esquema
-- solo crea `pg_cron`. `net` lo trae la extension `pg_net`, que no se crea en
-- ningun sitio. Es una linea, y esta la primera aqui abajo.
-- ============================================================================


-- ─────────────────────────────────────────────────────────── extensiones

-- pg_cron: el reloj. pg_net: quien hace la llamada HTTP desde dentro de
-- Postgres. Sin la segunda, `net.http_post` no existe y el trabajo falla en
-- cada pasada sin decir nada donde se vea.
create extension if not exists pg_cron;
create extension if not exists pg_net;


-- ───────────────────────────────────────────── el trabajo, cada 5 minutos

-- Se desprograma primero para que este archivo se pueda volver a pegar tal
-- cual cuando cambie la clave o la URL. Sin esto quedarian dos trabajos con
-- el mismo nombre haciendo lo mismo.
select cron.unschedule('dispatch-notifications')
where exists (select 1 from cron.job where jobname = 'dispatch-notifications');

-- CADA 5 MINUTOS, y no cada hora en punto, por dos razones:
--
--   1. Las horas las elige el usuario (decision 25) y pueden ser las 8:20.
--   2. Si una pasada falla, la siguiente llega cinco minutos despues en vez
--      de al dia siguiente.
--
-- Que corra doce veces por hora NO duplica nada: `notification_log.dedupe_key`
-- es UNIQUE y la Edge Function escribe la clave ANTES de enviar. La que gana
-- la carrera manda; las otras once se encuentran la clave puesta y se callan.
--
-- Efecto lateral util: el plan gratis de Supabase pausa los proyectos tras
-- ~7 dias sin actividad, y este trabajo cuenta como actividad.
select cron.schedule(
  'dispatch-notifications',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-notifications',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
    body    := '{"mode":"cron"}'::jsonb,
    -- La funcion compone el texto leyendo varias tablas. 30 segundos es
    -- holgado y evita que una pasada lenta quede colgada hasta la siguiente.
    timeout_milliseconds := 30000
  );
  $$
);


-- ══════════════════════════════════════════════════════════════════════════
-- COMPROBAR QUE FUNCIONA
-- ══════════════════════════════════════════════════════════════════════════

-- 1 · ¿existe el trabajo y esta activo?
--
--   select jobid, jobname, schedule, active from cron.job;

-- 2 · ¿esta corriendo? (deberia haber una fila nueva cada 5 minutos)
--
--   select status, start_time, return_message
--   from cron.job_run_details
--   where jobname = 'dispatch-notifications'
--   order by start_time desc
--   limit 10;
--
--   `status = 'succeeded'` aqui solo dice que la LLAMADA salio. Lo que
--   contesto la Edge Function esta en el punto 3.

-- 3 · ¿que contesto la funcion? (pg_net guarda las respuestas)
--
--   select id, status_code, content
--   from net._http_response
--   order by created desc
--   limit 10;
--
--   Un 401 aqui casi siempre es la SERVICE_ROLE_KEY mal pegada.
--   Un 500 trae el motivo dentro de `content`.

-- 4 · ¿que se ha mandado de verdad?
--
--   select kind, dedupe_key, status, error, sent_at
--   from notification_log
--   order by sent_at desc
--   limit 20;
--
--   `status = 'sent'` es el unico que significa que salio hacia el telefono.
--   `status = 'sending'` colgado quiere decir que la funcion se corto a mitad.

-- 5 · ¿hay algun telefono al que mandar?
--
--   select endpoint, last_seen_at, failed_at from push_subscriptions;
--
--   Sin ninguna fila con `failed_at is null`, no llega nada a ningun sitio
--   por mucho que el cron corra. Es el fallo mas facil de pasar por alto.


-- ══════════════════════════════════════════════════════════════════════════
-- APAGARLO
-- ══════════════════════════════════════════════════════════════════════════
--
--   select cron.unschedule('dispatch-notifications');
