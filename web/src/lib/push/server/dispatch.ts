/* ============================================================================
   Organizer · El despachador

   Junta las tres piezas: `schedule.ts` dice QUE toca ahora, este archivo lee
   la base y arma los datos, `compose.ts` los convierte en las dos lineas que
   se leen en la pantalla de bloqueo, y `webpush.ts` las manda.

   EL ORDEN QUE NO SE PUEDE INVERTIR
   --------------------------------
   Se escribe `notification_log` ANTES de enviar, no despues. Si se escribiera
   despues, un fallo a mitad de camino —el proceso se corta, el servicio de
   push tarda, la funcion agota su tiempo— dejaria el envio hecho y la clave
   sin escribir, y la pasada siguiente del cron, cinco minutos mas tarde,
   mandaria lo mismo otra vez. Escribiendo antes, el peor caso es una
   notificacion que no sale y queda registrada como fallida, que es el caso que
   se puede ver y reintentar.

   El candado es el indice UNIQUE de `dedupe_key`. Quien consigue insertar,
   manda. Ver `db.ts`.

   QUE HACE Y QUE NO HACE CON LOS REMINDERS
   ----------------------------------------
   Un reminder cercano NO genera una notificacion propia: ENCABEZA la de la
   manana (decision 57), con la anticipacion de `reminders.notice_days` —un dia
   si esta vacio, decision 60— y con el corte de la decision 61: si todas sus
   tareas estan hechas, no encabeza nada.

   `advance_notice` si es una notificacion aparte, y es la UNICA excepcion a
   "una al dia" (decision 33). Sale solo de `items.advance_notice_days`, que el
   usuario activa a mano tarea por tarea, tal y como lo describen
   `docs/02-arquitectura.md` y el texto 5 de `app/comps/notificacion.html`.
   Hacerlo tambien por reminder sacaria el mismo parcial dos veces el mismo dia.
   ========================================================================= */

import {
  composeAdvanceNotice,
  composeBeforeBlock,
  composeEvening,
  composePrepAlert,
  composeResource,
  composeMorning,
  composeTest,
  composeWeeklyReview,
  type DaySlot,
  type NotificationText,
} from './compose.ts';
import { inList, insertUnique, select, update, type PostgrestConfig } from './db.ts';
import {
  capitalize,
  daysBetween,
  dueNotifications,
  formatLocalTime,
  localDayRangeUtc,
  localNow,
  minutesBeforeStart,
  PREP_ALERT_DAYS,
  relativeDayLabel,
  reviewWeekStart,
  shiftDate,
  weekdayLabel,
  weekdayOf,
  dayNumberOf,
  type NotifyProfile,
} from './schedule.ts';
import { sendPush, type PushSubscription, type VapidKeys } from './webpush.ts';

/* ───────────────────────────────────────────────────── filas de la base ── */

interface BlockRow {
  id: string;
  item_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  source: string;
}

interface ItemRow {
  id: string;
  title: string;
  status: string;
  due_on: string | null;
  advance_notice_days: number | null;
  reminder_id: string | null;
}

interface ReminderRow {
  id: string;
  title: string;
  occurs_on: string;
  occurs_at: string | null;
  notice_days: number | null;
}

interface SubscriptionRow extends PushSubscription {
  id: string;
}

interface ResourceRow {
  id: string;
  title: string;
  notes: string | null;
  created_at: string;
}

interface BeforeBlockRow {
  id: string;
  item_id: string | null;
  template_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  source: string;
  reminder_min: number | null;
}

const PROFILE_COLUMNS =
  'id,timezone,notify_morning,notify_evening,notify_weekly_dow,notify_weekly_time,notify_resources';

/** Decision 60: sin valor, un dia. Seis dias serian seis avisos y ruido. */
const DEFAULT_NOTICE_DAYS = 1;

/** Estados de `items` que siguen vivos: ni hechos ni soltados. */
const OPEN_ITEM_STATUSES = '(inbox,someday,planned)';

export interface DispatchEnvironment {
  db: PostgrestConfig;
  vapid: VapidKeys;
  /** Inyectable para poder probar con una hora concreta. */
  now?: Date;
  /**
   * Reparte las materias en bloques para un rango. La inyecta la ruta de
   * Next (usa supabase-js); sin ella, la mañana usa lo que ya haya.
   */
  materialize?: (userId: string, from: string, to: string, timezone: string) => Promise<void>;
}

export interface DispatchReport {
  checkedAt: string;
  profiles: number;
  sent: { kind: string; dedupeKey: string; title: string; body: string; delivered: number }[];
  skipped: string[];
  failed: { dedupeKey: string; error: string }[];
  deadSubscriptions: number;
}

/* ══════════════════════════════════════════════════════ el cron, cada 5' ══ */

export async function dispatchDue(env: DispatchEnvironment): Promise<DispatchReport> {
  const now = env.now ?? new Date();
  const report: DispatchReport = {
    checkedAt: now.toISOString(),
    profiles: 0,
    sent: [],
    skipped: [],
    failed: [],
    deadSubscriptions: 0,
  };

  const profiles = await select<NotifyProfile>(
    env.db,
    'profiles?select=' + PROFILE_COLUMNS
  );
  report.profiles = profiles.length;

  for (const profile of profiles) {
    const local = localNow(now, profile.timezone);
    const due_ = dueNotifications(now, profile);
    const isMorning = due_.some((due) => due.kind === 'morning');

    /* Las clases de las dos próximas semanas, ANTES de componer la mañana:
       así la notificación las trae aunque nadie haya abierto el calendario. */
    if (env.materialize && isMorning) {
      try {
        await env.materialize(profile.id, local.date, shiftDate(local.date, 14), profile.timezone);
      } catch (error) {
        report.skipped.push('materialize (' + (error instanceof Error ? error.message : 'error') + ')');
      }
    }

    for (const due of due_) {
      let text: NotificationText;
      let url = '/';
      if (due.kind === 'morning') text = await buildMorning(env, profile, due.date);
      else if (due.kind === 'resource') {
        const pick = await buildResource(env, profile, now);
        if (!pick) {
          report.skipped.push(due.dedupeKey + ' (no hay recursos sin abrir)');
          continue;
        }
        text = pick.text;
        url = '/api/resources/' + pick.id + '/open';
      } else if (due.kind === 'evening') {
        const evening = await buildEvening(env, profile, due.date);
        /* Un dia en el que no habia nada que hacer no merece un repaso por la
           noche: seria la notificacion vacia que el proyecto existe para no
           mandar. */
        if (!evening) {
          report.skipped.push(due.dedupeKey + ' (día sin nada planificado)');
          continue;
        }
        text = evening;
        url = '/pendientes';
      } else {
        /* F4 · si la semana ya esta armada (se abrio el ritual antes de la
           hora), el aviso sobra: seria pedir algo ya hecho. */
        if (await isWeekReviewed(env, profile.id, due.date)) {
          report.skipped.push(due.dedupeKey + ' (semana ya armada)');
          continue;
        }
        text = await buildWeeklyReview(env, profile, due.date);
        /* La notificacion abre el ritual, no una lista (regla 1). */
        url = '/domingo';
      }

      await deliver(env, profile.id, due.kind, due.dedupeKey, text, report, { url });
    }

    /* La excepcion de la decision 33. Se evalua dentro de la ventana de la
       manana para que no llegue de madrugada. */
    if (isMorning) {
      for (const notice of await buildAdvanceNotices(env, profile, local.date)) {
        await deliver(env, profile.id, 'advance_notice', notice.dedupeKey, notice.text, report);
      }
      /* v2 · reminders que se acercan sin ninguna tarea. */
      for (const notice of await buildPrepAlerts(env, profile, local.date)) {
        await deliver(env, profile.id, 'prep_alert', notice.dedupeKey, notice.text, report, {
          url: notice.url,
          tag: notice.dedupeKey,
        });
      }
    }

    /* v2 · minutos antes de una clase o una tarea con hora. Cada pasada. */
    for (const notice of await buildBeforeBlocks(env, profile, now)) {
      await deliver(env, profile.id, 'before', notice.dedupeKey, notice.text, report, {
        url: notice.url,
        tag: notice.dedupeKey,
      });
    }
  }

  return report;
}

/* ═══════════════════════════════════════ la prueba inmediata al suscribirse ══ */

/**
 * Se manda en cuanto el usuario acepta el permiso. Es la unica forma de que el
 * sepa que funciono, y la unica forma de que nosotros sepamos que el camino
 * completo esta vivo: service worker, suscripcion, VAPID, cifrado y entrega.
 *
 * Lleva dentro el dia de verdad, no un "hola": asi el primer contacto con el
 * sistema ya es el producto.
 */
export async function dispatchTest(
  env: DispatchEnvironment,
  userId: string
): Promise<DispatchReport> {
  const now = env.now ?? new Date();
  const report: DispatchReport = {
    checkedAt: now.toISOString(),
    profiles: 1,
    sent: [],
    skipped: [],
    failed: [],
    deadSubscriptions: 0,
  };

  const [profile] = await select<NotifyProfile>(
    env.db,
    'profiles?id=eq.' + userId +
      '&select=' + PROFILE_COLUMNS
  );
  if (!profile) throw new Error('No hay fila en `profiles` para ' + userId);

  const local = localNow(now, profile.timezone);
  const today = await buildMorning(env, profile, local.date);

  /* La clave lleva el instante: la prueba SE PUEDE repetir a proposito, al
     contrario que las programadas. */
  const dedupeKey = 'test:' + now.toISOString();
  await deliver(env, profile.id, 'test', dedupeKey, composeTest(today), report, {
    url: '/ajustes/notificaciones',
  });
  return report;
}

/* ═══════════════════════════════════════════ ver el texto sin mandarlo ══ */

/**
 * Compone los textos del dia y los devuelve SIN ENVIAR NADA.
 *
 * Es la herramienta con la que se comprueba lo unico que de verdad importa:
 * que con los datos reales del usuario el texto sigue cabiendo en los 38 y 88
 * caracteres de iOS. La usa `supabase/run-dispatch.mjs preview`.
 */
export async function previewDay(
  env: DispatchEnvironment,
  userId?: string
): Promise<Record<string, NotificationText>> {
  const now = env.now ?? new Date();
  const profiles = await select<NotifyProfile>(
    env.db,
    'profiles?' + (userId ? 'id=eq.' + userId + '&' : '') +
      'select=' + PROFILE_COLUMNS
  );
  const profile = profiles[0];
  if (!profile) throw new Error('No hay ninguna fila en `profiles`.');

  const local = localNow(now, profile.timezone);
  const out: Record<string, NotificationText> = {};

  out['mañana ' + profile.notify_morning.slice(0, 5)] = await buildMorning(
    env,
    profile,
    local.date
  );

  const evening = await buildEvening(env, profile, local.date);
  out['noche ' + profile.notify_evening.slice(0, 5)] =
    evening ?? { title: '(no se manda)', body: 'El día no tenía nada planificado.' };

  out['domingo ' + profile.notify_weekly_time.slice(0, 5)] = await buildWeeklyReview(
    env,
    profile,
    local.date
  );

  for (const notice of await buildAdvanceNotices(env, profile, local.date)) {
    out['aviso · ' + notice.dedupeKey.split(':')[1].slice(0, 8)] = notice.text;
  }

  return out;
}

/* ═══════════════════════════════════════════════════════════ el envio ══ */

async function deliver(
  env: DispatchEnvironment,
  userId: string,
  kind: string,
  dedupeKey: string,
  text: NotificationText,
  report: DispatchReport,
  options: { url?: string; tag?: string } = {}
): Promise<void> {
  /* 1 · la clave primero. Si ya estaba, otra pasada del cron gano la carrera. */
  const claim = await insertUnique(env.db, 'notification_log', {
    user_id: userId,
    kind,
    dedupe_key: dedupeKey,
    payload: text,
    status: 'sending',
  });
  if (!claim.inserted) {
    report.skipped.push(dedupeKey + ' (ya estaba en notification_log)');
    return;
  }

  const subscriptions = await select<SubscriptionRow>(
    env.db,
    'push_subscriptions?user_id=eq.' + userId +
      '&failed_at=is.null&select=id,endpoint,p256dh,auth'
  );

  if (subscriptions.length === 0) {
    await markLog(env, dedupeKey, 'failed', 'No hay ninguna suscripción activa');
    report.failed.push({ dedupeKey, error: 'sin suscripciones activas' });
    return;
  }

  const payload = {
    title: text.title,
    body: text.body,
    /* Una por tipo: la nueva sustituye a la del dia anterior en vez de
       apilarse (decision 33). */
    tag: options.tag ?? kind,
    url: options.url ?? '/',
  };

  let delivered = 0;
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    const result = await sendPush(subscription, payload, env.vapid);

    if (result.ok) {
      delivered++;
      await update(env.db, 'push_subscriptions?id=eq.' + subscription.id, {
        last_seen_at: new Date().toISOString(),
      });
      continue;
    }

    errors.push('HTTP ' + result.status + ' · ' + (result.error ?? ''));

    if (result.gone) {
      /* 404 o 410: iOS invalido la suscripcion, casi siempre porque se
         reinstalo la PWA. Se marca y deja de intentarse: sin esto la tabla se
         llena de destinos muertos y cada pasada del cron se hace mas lenta. */
      await update(env.db, 'push_subscriptions?id=eq.' + subscription.id, {
        failed_at: new Date().toISOString(),
      });
      report.deadSubscriptions++;
    }
  }

  if (delivered > 0) {
    await markLog(env, dedupeKey, 'sent', errors.length ? errors.join(' | ') : null);
    report.sent.push({ kind, dedupeKey, title: text.title, body: text.body, delivered });
  } else {
    await markLog(env, dedupeKey, 'failed', errors.join(' | '));
    report.failed.push({ dedupeKey, error: errors.join(' | ') });
  }
}

async function markLog(
  env: DispatchEnvironment,
  dedupeKey: string,
  status: string,
  error: string | null
): Promise<void> {
  await update(env.db, 'notification_log?dedupe_key=eq.' + encodeURIComponent(dedupeKey), {
    status,
    error,
  });
}

/* ══════════════════════════════════════════ armar los datos de cada tipo ══ */

/** Los bloques del dia, ya ordenados y con la hora en la zona del usuario. */
async function readDayBlocks(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  date: string
): Promise<BlockRow[]> {
  const range = localDayRangeUtc(date, profile.timezone);
  return await select<BlockRow>(
    env.db,
    'blocks?user_id=eq.' + profile.id +
      '&starts_at=gte.' + range.start +
      '&starts_at=lt.' + range.end +
      '&order=starts_at.asc&select=id,item_id,title,starts_at,ends_at,status,source'
  );
}

/**
 * La lista del dia: las materias y las tareas juntas, en orden de hora.
 *
 * Diferencia deliberada con la pantalla Inicio, y esta escrita en el comp:
 * alli las clases NO ocupan sitio porque Inicio es para decidir (decision 35),
 * y aqui SI entran, porque a las 8:00 lo que pasa es Calculo.
 *
 * Las tareas con fecha tope de hoy pero sin bloque en el calendario tambien
 * entran, al final y sin hora: si no, una tarea que vence hoy y que nunca se
 * arrastro a un bloque no aparece en ningun sitio el dia que vence.
 */
async function buildDaySlots(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  date: string
): Promise<DaySlot[]> {
  const blocks = await readDayBlocks(env, profile, date);

  const slots: DaySlot[] = blocks.map((block) => ({
    time: formatLocalTime(block.starts_at, profile.timezone),
    title: block.title,
    /* `template` son las materias materializadas del horario (decision 52). */
    isClass: block.source === 'template',
  }));

  const plannedItemIds = new Set(blocks.map((block) => block.item_id).filter(Boolean));

  const dueToday = await select<ItemRow>(
    env.db,
    'items?user_id=eq.' + profile.id +
      '&due_on=eq.' + date +
      '&status=in.' + OPEN_ITEM_STATUSES +
      '&select=id,title,status,due_on,advance_notice_days,reminder_id&order=created_at.asc'
  );

  for (const item of dueToday) {
    if (plannedItemIds.has(item.id)) continue;
    slots.push({ time: null, title: item.title, isClass: false });
  }

  return slots;
}

/**
 * El reminder que encabeza hoy, si hay alguno.
 *
 * Decision 60: la anticipacion es `notice_days`, y un dia si esta vacio.
 * Decision 61: si TODAS sus tareas estan hechas, no encabeza. Estar preparado
 * es justamente la senal de que no hace falta avisar.
 */
async function findLeadReminder(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  today: string
): Promise<{ title: string; whenLabel: string } | null> {
  /* Se pide una ventana generosa y se filtra aqui, porque el umbral depende de
     `notice_days` fila a fila y PostgREST no compara dos columnas. */
  const horizon = shiftDate(today, 30);
  const reminders = await select<ReminderRow>(
    env.db,
    'reminders?user_id=eq.' + profile.id +
      '&occurs_on=gte.' + today +
      '&occurs_on=lte.' + horizon +
      '&order=occurs_on.asc&select=id,title,occurs_on,occurs_at,notice_days'
  );

  const inRange = reminders.filter(
    (reminder) =>
      daysBetween(today, reminder.occurs_on) <= (reminder.notice_days ?? DEFAULT_NOTICE_DAYS)
  );
  if (inRange.length === 0) return null;

  /* Decision 61 · un reminder con todas sus tareas hechas no encabeza. */
  const tasks = await select<ItemRow>(
    env.db,
    'items?user_id=eq.' + profile.id +
      '&reminder_id=in.' + inList(inRange.map((reminder) => reminder.id)) +
      '&select=id,title,status,due_on,advance_notice_days,reminder_id'
  );

  for (const reminder of inRange) {
    const own = tasks.filter((task) => task.reminder_id === reminder.id);
    const prepared = own.length > 0 && own.every((task) => task.status === 'done');
    if (prepared) continue;

    return {
      title: reminder.title,
      whenLabel: relativeDayLabel(today, reminder.occurs_on),
    };
  }

  return null;
}

async function buildMorning(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  date: string
): Promise<NotificationText> {
  const [slots, reminder, overdue] = await Promise.all([
    buildDaySlots(env, profile, date),
    findLeadReminder(env, profile, date),
    /* v2 · lo atrasado entra como recuento: nada se pierde en silencio. */
    select<{ id: string }>(
      env.db,
      'items?user_id=eq.' + profile.id +
        '&due_on=lt.' + date +
        '&status=in.' + OPEN_ITEM_STATUSES +
        '&select=id'
    ),
  ]);

  return composeMorning({
    weekdayLabel: weekdayLabel(weekdayOf(date)),
    dayNumber: dayNumberOf(date),
    slots,
    reminder,
    overdue: overdue.length,
  });
}

/** `null` cuando el dia no tenia nada que cerrar: no se manda nada. */
async function buildEvening(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  date: string
): Promise<NotificationText | null> {
  const blocks = await readDayBlocks(env, profile, date);

  /* Las materias no se "cumplen": una clase no es deuda (decision 52). */
  const own = blocks.filter((block) => block.source !== 'template');
  if (own.length === 0) {
    const dueToday = await select<ItemRow>(
      env.db,
      'items?user_id=eq.' + profile.id +
        '&due_on=eq.' + date +
        '&status=in.' + OPEN_ITEM_STATUSES +
        '&select=id,title,status,due_on,advance_notice_days,reminder_id'
    );
    if (dueToday.length === 0) return null;
    return composeEvening({ open: dueToday.map((item) => item.title) });
  }

  const open = own.filter((block) => block.status === 'pending').map((block) => block.title);
  return composeEvening({ open });
}

/** La semana que el ritual arma ese dia ya tiene fila cerrada en `weekly_reviews`. */
async function isWeekReviewed(env: DispatchEnvironment, userId: string, date: string): Promise<boolean> {
  const rows = await select<{ id: string }>(
    env.db,
    'weekly_reviews?user_id=eq.' + userId +
      '&week_start=eq.' + reviewWeekStart(date) +
      '&completed_at=not.is.null&select=id&limit=1'
  );
  return rows.length > 0;
}

async function buildWeeklyReview(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  date: string
): Promise<NotificationText> {
  const weekStart = shiftDate(date, -6);
  const range = {
    start: localDayRangeUtc(weekStart, profile.timezone).start,
    end: localDayRangeUtc(date, profile.timezone).end,
  };

  const loose = await select<BlockRow>(
    env.db,
    'blocks?user_id=eq.' + profile.id +
      '&starts_at=gte.' + range.start +
      '&starts_at=lt.' + range.end +
      '&status=in.(pending,missed)&source=eq.manual' +
      '&order=starts_at.desc&limit=1&select=id,item_id,title,starts_at,ends_at,status,source'
  );

  const unplanned = await select<ItemRow>(
    env.db,
    'items?user_id=eq.' + profile.id +
      '&status=eq.inbox&select=id,title,status,due_on,advance_notice_days,reminder_id'
  );

  const looseSince = loose.length
    ? weekdayLabel(weekdayOf(localNow(new Date(loose[0].starts_at), profile.timezone).date))
    : null;

  return composeWeeklyReview({ looseSince, unplanned: unplanned.length });
}

/**
 * Los avisos anticipados de hoy. Uno por tarea: es la excepcion declarada de
 * la decision 33, y solo existe si el usuario puso `advance_notice_days` en
 * esa tarea concreta.
 */
async function buildAdvanceNotices(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  today: string
): Promise<{ dedupeKey: string; text: NotificationText }[]> {
  const horizon = shiftDate(today, 90);
  const items = await select<ItemRow>(
    env.db,
    'items?user_id=eq.' + profile.id +
      '&advance_notice_days=not.is.null' +
      '&due_on=gte.' + today +
      '&due_on=lte.' + horizon +
      '&status=in.' + OPEN_ITEM_STATUSES +
      '&order=due_on.asc&select=id,title,status,due_on,advance_notice_days,reminder_id'
  );

  const out: { dedupeKey: string; text: NotificationText }[] = [];

  for (const item of items) {
    if (!item.due_on || !item.advance_notice_days) continue;
    /* Solo el dia exacto en que toca avisar. Avisar todos los dias desde
       entonces convertiria el aviso en la alarma repetida que la decision 60
       descarta. */
    if (daysBetween(today, item.due_on) !== item.advance_notice_days) continue;

    const reserved = await select<BlockRow>(
      env.db,
      'blocks?item_id=eq.' + item.id +
        '&status=eq.pending&order=starts_at.asc&select=id,item_id,title,starts_at,ends_at,status,source'
    );

    const hours =
      reserved.reduce(
        (total, block) => total + (Date.parse(block.ends_at) - Date.parse(block.starts_at)),
        0
      ) / 3600000;

    const first = reserved[0];

    out.push({
      dedupeKey: 'advance_notice:' + item.id + ':' + today,
      text: composeAdvanceNotice({
        title: item.title,
        whenLabel: capitalize(relativeDayLabel(today, item.due_on)),
        daysAway: item.advance_notice_days,
        reserved: first
          ? {
              hours,
              dayLabel: relativeDayLabel(
                today,
                localNow(new Date(first.starts_at), profile.timezone).date
              ).toLowerCase(),
              time: formatLocalTime(first.starts_at, profile.timezone),
            }
          : null,
      }),
    });
  }

  return out;
}

/* ══════════════════════════════════════════════════════════ v2 · 2026-09 ══ */

/**
 * Reminders que se acercan SIN ninguna tarea. Uno por reminder, solo los
 * días de `PREP_ALERT_DAYS` (7, 3 y 1 antes). En cuanto tiene una tarea,
 * deja de avisar: ya se está preparando.
 */
async function buildPrepAlerts(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  today: string
): Promise<{ dedupeKey: string; text: NotificationText; url: string }[]> {
  const horizon = shiftDate(today, Math.max(...PREP_ALERT_DAYS));
  const reminders = await select<ReminderRow>(
    env.db,
    'reminders?user_id=eq.' + profile.id +
      '&occurs_on=gt.' + today +
      '&occurs_on=lte.' + horizon +
      '&select=id,title,occurs_on,occurs_at,notice_days'
  );
  const candidates = reminders.filter((r) =>
    PREP_ALERT_DAYS.includes(daysBetween(today, r.occurs_on))
  );
  if (candidates.length === 0) return [];

  const tasks = await select<{ reminder_id: string }>(
    env.db,
    'items?user_id=eq.' + profile.id +
      '&reminder_id=in.' + inList(candidates.map((r) => r.id)) +
      '&status=neq.dropped&select=reminder_id'
  );
  const withTasks = new Set(tasks.map((t) => t.reminder_id));

  return candidates
    .filter((r) => !withTasks.has(r.id))
    .map((r) => ({
      dedupeKey: 'prep_alert:' + r.id + ':' + today,
      text: composePrepAlert({ title: r.title, daysAway: daysBetween(today, r.occurs_on) }),
      url: '/reminders/' + r.id,
    }));
}

/**
 * El recurso de hoy: el que nunca se abrió y hace más tiempo que no se
 * propone. Se marca como propuesto ANTES de mandarlo, para que la próxima
 * vez salga otro aunque este no se abra.
 */
async function buildResource(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  now: Date
): Promise<{ id: string; text: NotificationText } | null> {
  const [resource] = await select<ResourceRow>(
    env.db,
    'resources?user_id=eq.' + profile.id +
      '&archived_at=is.null&open_count=eq.0' +
      '&order=last_suggested_at.asc.nullsfirst,created_at.asc&limit=1' +
      '&select=id,title,notes,created_at'
  );
  if (!resource) return null;

  await update(env.db, 'resources?id=eq.' + resource.id, {
    last_suggested_at: now.toISOString(),
  });

  const today = localNow(now, profile.timezone).date;
  const saved = localNow(new Date(resource.created_at), profile.timezone).date;

  return {
    id: resource.id,
    text: composeResource({
      title: resource.title,
      notes: resource.notes,
      savedDaysAgo: daysBetween(saved, today),
    }),
  };
}

/** Avisos "X minutos antes" que tocan en esta pasada. */
async function buildBeforeBlocks(
  env: DispatchEnvironment,
  profile: NotifyProfile,
  now: Date
): Promise<{ dedupeKey: string; text: NotificationText; url: string }[]> {
  const from = now.toISOString();
  const to = new Date(now.getTime() + 121 * 60000).toISOString();
  const blocks = await select<BeforeBlockRow>(
    env.db,
    'blocks?user_id=eq.' + profile.id +
      '&status=eq.pending&reminder_min=not.is.null' +
      '&starts_at=gt.' + encodeURIComponent(from) +
      '&starts_at=lte.' + encodeURIComponent(to) +
      '&order=starts_at.asc' +
      '&select=id,item_id,template_id,title,starts_at,ends_at,source,reminder_min'
  );

  const due = blocks
    .map((block) => ({ block, left: minutesBeforeStart(now, block.starts_at, block.reminder_min) }))
    .filter((x): x is { block: BeforeBlockRow; left: number } => x.left !== null);
  if (due.length === 0) return [];

  const templateIds = due
    .map((d) => d.block.template_id)
    .filter((v): v is string => Boolean(v));
  const locations = new Map<string, string | null>();
  if (templateIds.length > 0) {
    const rows = await select<{ id: string; location: string | null }>(
      env.db,
      'schedule_templates?id=in.' + inList(templateIds) + '&select=id,location'
    );
    for (const row of rows) locations.set(row.id, row.location);
  }

  return due.map(({ block, left }) => {
    const date = localNow(new Date(block.starts_at), profile.timezone).date;
    return {
      dedupeKey: 'before:' + block.id,
      text: composeBeforeBlock({
        title: block.title,
        minutesLeft: left,
        range:
          formatLocalTime(block.starts_at, profile.timezone) +
          ' – ' +
          formatLocalTime(block.ends_at, profile.timezone),
        location: block.template_id ? locations.get(block.template_id) ?? null : null,
        isClass: block.source === 'template',
      }),
      url: block.item_id ? '/tareas/' + block.item_id : '/calendario?v=dia&d=' + date,
    };
  });
}
