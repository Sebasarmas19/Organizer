-- Organizer — esquema Supabase
-- Explicación de las decisiones en docs/03-modelo-datos.md
-- Ejecutar en el SQL Editor de Supabase.

create extension if not exists pg_cron;

-- ───────────────────────────────────────────────────────────── tipos

create type item_status  as enum ('inbox', 'someday', 'planned', 'done', 'dropped');
create type block_status as enum ('pending', 'done', 'missed', 'rescheduled');
create type block_source as enum ('manual', 'template');
create type context_kind as enum ('course', 'project', 'personal', 'reading');

-- ───────────────────────────────────────────────────────────── profiles

create table profiles (
  id                uuid primary key references auth.users on delete cascade,
  timezone          text        not null default 'America/Caracas',

  -- horas locales de notificación (decisión #15: valores por confirmar)
  notify_morning    time        not null default '08:00',
  notify_evening    time        not null default '21:00',
  notify_weekly_dow smallint    not null default 0,          -- 0 = domingo
  notify_weekly_time time       not null default '19:00',

  -- racha con perdón (decisión #8)
  streak_current    int         not null default 0,
  streak_best       int         not null default 0,
  grace_remaining   int         not null default 2,
  grace_reset_at    date        not null default current_date,

  capture_token_hash text,                                    -- hash del token del Atajo
  last_review_at    timestamptz,
  created_at        timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────── contexts

create table contexts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  kind        context_kind not null default 'personal',
  color       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index on contexts (user_id) where archived_at is null;

-- ───────────────────────────────────────────────────────────── items
-- Todo lo capturado: inbox, ideas y tareas. El estado los diferencia.

create table items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null check (length(trim(title)) > 0),
  notes        text,
  status       item_status not null default 'inbox',
  context_id   uuid references contexts on delete set null,
  estimate_min int check (estimate_min is null or estimate_min > 0),  -- sin uso en v1
  due_on       date,                                  -- fecha tope, la pone el usuario

  -- Decisión #28/#31: el sistema NO categoriza tareas ni infiere duración.
  -- Si el usuario quiere aviso anticipado (típicamente algo de varios días),
  -- lo activa él poniendo aquí los días. Null = entra en la notificación
  -- diaria normal y nada más.
  advance_notice_days int check (advance_notice_days is null or advance_notice_days > 0),
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  dropped_at   timestamptz
);

-- la vista de inbox y la biblioteca son las consultas más frecuentes
create index on items (user_id, status, created_at desc);
create index on items (user_id, due_on) where due_on is not null;

-- ───────────────────────────────────────────────────────────── blocks
-- El calendario. item_id es nulo para las clases que vienen de plantilla.

create table blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  item_id      uuid references items on delete cascade,
  template_id  uuid,                                  -- FK más abajo
  title        text not null,                         -- denormalizado a propósito
  context_id   uuid references contexts on delete set null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       block_status not null default 'pending',
  source       block_source not null default 'manual',
  reminder_min int,                                   -- notificación X min antes
  created_at   timestamptz not null default now(),

  constraint block_ends_after_start check (ends_at > starts_at)
);

create index on blocks (user_id, starts_at);
create index on blocks (user_id, status, starts_at) where status = 'pending';
create index on blocks (item_id);

-- ───────────────────────────────────────────── schedule_templates
-- Horario fijo semanal. Hora local, no timestamp.

create table schedule_templates (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  title        text not null,
  context_id   uuid references contexts on delete set null,
  weekday      smallint not null check (weekday between 0 and 6),  -- 0 = domingo
  start_time   time not null,
  end_time     time not null,
  reminder_min int,
  active_from  date not null default current_date,
  active_until date,
  created_at   timestamptz not null default now(),

  constraint template_ends_after_start check (end_time > start_time)
);

create index on schedule_templates (user_id, weekday);

alter table blocks
  add constraint blocks_template_fk
  foreign key (template_id) references schedule_templates on delete set null;

-- materializar la plantilla debe ser idempotente:
-- una plantilla genera como máximo un bloque por día
create unique index blocks_template_per_day
  on blocks (template_id, ((starts_at at time zone 'UTC')::date))
  where template_id is not null;

-- ───────────────────────────────────────────────────── weekly_reviews

create table weekly_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  week_start     date not null,                       -- lunes de esa semana
  completed_at   timestamptz,
  items_planned  int not null default 0,
  items_carried  int not null default 0,
  items_dropped  int not null default 0,
  ideas_promoted int not null default 0,

  unique (user_id, week_start)
);

-- ─────────────────────────────────────────────── push_subscriptions

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  failed_at    timestamptz                            -- se setea con 404/410
);

create index on push_subscriptions (user_id) where failed_at is null;

-- ─────────────────────────────────────────────── notification_log
-- dedupe_key único: el cron corre cada 5 min y sin esto duplicaría todo.

create table notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  kind       text not null,                           -- morning | evening | weekly_review | task_reminder
  dedupe_key text not null unique,                    -- ej: 'morning:2026-09-15'
  payload    jsonb,
  sent_at    timestamptz not null default now(),
  status     text not null default 'sent',            -- sent | failed
  error      text
);

create index on notification_log (user_id, sent_at desc);

-- ───────────────────────────────────────────────────────────── RLS

alter table profiles           enable row level security;
alter table contexts           enable row level security;
alter table items              enable row level security;
alter table blocks             enable row level security;
alter table schedule_templates enable row level security;
alter table weekly_reviews     enable row level security;
alter table push_subscriptions enable row level security;
alter table notification_log   enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own contexts" on contexts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own items" on items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own blocks" on blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own templates" on schedule_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own reviews" on weekly_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own subscriptions" on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notification log" on notification_log
  for select using (user_id = auth.uid());

-- El endpoint /api/capture y el dispatcher de notificaciones usan el
-- service role, que se salta RLS por diseño.

-- ─────────────────────────────────────────────────────────── cron
-- Cada 5 minutos. La Edge Function decide qué toca enviar.
-- Reemplazar <PROJECT_REF> y <SERVICE_ROLE_KEY> antes de ejecutar.
--
-- select cron.schedule(
--   'dispatch-notifications',
--   '*/5 * * * *',
--   $$
--   select net.http_post(
--     url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/dispatch-notifications',
--     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb
--   );
--   $$
-- );

-- ═══════════════════════════════════════════════════════════════════
-- MÓDULO RECURSOS (decisión #20)
-- Independiente del planificador. No aparece en Hoy ni en Tareas.
-- Detalle en docs/06-recursos.md
-- ═══════════════════════════════════════════════════════════════════

create type resource_kind as enum ('tool', 'skill', 'article', 'video', 'repo', 'other');

create table resources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  url         text,
  kind        resource_kind not null default 'other',
  notes       text,                              -- por qué lo guardaste
  tags        text[] not null default '{}',
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz,                       -- última consulta
  open_count  int not null default 0
);

-- "poder llegar a la información": la búsqueda es la entrada al módulo
--
-- Una columna generada exige una expresión IMMUTABLE, y ni to_tsvector con el
-- nombre de la configuración como texto ni array_to_string lo son. Se declara
-- una función inmutable que las envuelve: la configuración queda fijada a
-- 'spanish'::regconfig, que es lo que hacía falta para que el plan sea estable.
create or replace function resources_search_vector(
  p_title text, p_notes text, p_tags text[]
) returns tsvector
language sql immutable strict parallel safe
as $$
  select to_tsvector('spanish'::regconfig,
    coalesce(p_title,'') || ' ' || coalesce(p_notes,'') || ' ' ||
    coalesce(array_to_string(p_tags,' '),''));
$$;

alter table resources add column search tsvector
  generated always as (resources_search_vector(title, notes, tags)) stored;

create index on resources using gin (search);
create index on resources using gin (tags);
create index on resources (user_id, created_at desc) where archived_at is null;
-- "guardados y nunca abiertos": higiene de la biblioteca
create index on resources (user_id) where open_count = 0 and archived_at is null;

alter table resources enable row level security;

create policy "own resources" on resources
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- REMINDERS (decisiones #47–#55) — ver docs/08-modelo-tareas-reminders.md
-- Parciales, entregas, defensas. NO se marcan como hechos: pasa el día
-- y quedan listos. El estado se deriva de occurs_on, no se almacena.
-- ═══════════════════════════════════════════════════════════════════

create table reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  notes       text,
  context_id  uuid references contexts on delete set null,

  occurs_on   date not null,          -- obligatoria: sin fecha no es reminder
  occurs_at   time,                   -- opcional: hora exacta si se sabe
  notice_days int check (notice_days is null or notice_days > 0),

  created_at  timestamptz not null default now()
);

-- la vista de mes y la banda de "esta semana" consultan por fecha
create index on reminders (user_id, occurs_on);

alter table reminders enable row level security;
create policy "own reminders" on reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- La asociación tarea -> reminder. SIEMPRE opcional: la mayoría de lo
-- capturado por Siri no tendrá reminder, y esas tareas no son de segunda.
alter table items add column reminder_id uuid references reminders on delete set null;

-- "de este reminder, cuántas tareas llevo" y "este reminder no tiene ninguna"
create index on items (reminder_id) where reminder_id is not null;
