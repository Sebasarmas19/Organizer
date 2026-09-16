/* ============================================================================
   Organizer · Cuándo toca, en la hora del usuario

   EL PROBLEMA QUE RESUELVE ESTE ARCHIVO
   -------------------------------------
   El cron corre en UTC cada 5 minutos. Los `timestamptz` estan en UTC. Pero
   "las 8:00" son las 8:00 DE EL, y su zona vive en `profiles.timezone`
   (`America/Caracas`, UTC−4 sin horario de verano, decision 14).

   La tentacion es restar 4 horas y seguir. No se hace, y la razon esta escrita
   en la propia decision 14: `America/New_York` tambien es UTC−4 hoy, y en
   noviembre deja de serlo. La zona esta en la base a proposito; si manana el
   usuario viaja o cambia el valor, todo esto tiene que seguir dando la hora
   correcta sin tocar codigo. Por eso las conversiones van con
   `Intl.DateTimeFormat` y la zona IANA, no con aritmetica.

   LA VENTANA, Y POR QUE EXISTE
   ----------------------------
   El cron pasa cada 5 minutos, asi que casi nunca cae exactamente en las 8:00.
   Se manda si la hora local esta DENTRO de la hora siguiente a la configurada.
   Eso aguanta que el cron se retrase o se salte una pasada, y a la vez evita el
   caso tonto: si el usuario activa las notificaciones a las 15:00, no le llega
   de golpe el resumen de la manana.

   La ventana se recorta para no cruzar la medianoche. Si el usuario pusiera las
   23:45, la ventana dura 15 minutos en vez de una hora — preferible a la
   alternativa, que es el enredo de claves de dedupe con la fecha del dia
   anterior.

   Modulo puro: no toca base de datos ni red. `tests/schedule.test.ts` lo
   comprueba con la zona de Venezuela y con una zona con horario de verano.
   ========================================================================= */

/** Cuanto despues de la hora configurada seguimos mandando. */
export const WINDOW_MINUTES = 60;

/** Sin acentos en el codigo no: estos textos los lee el usuario. */
const WEEKDAYS_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/* Los nombres se escriben aqui y no salen de `Intl` con locale `es` a
   proposito: asi el texto de la notificacion no depende de que datos de
   idioma traiga el runtime de turno. Son siete palabras. */
export function weekdayLabel(weekday: number): string {
  return WEEKDAYS_ES[weekday];
}

/** Con mayuscula, para cuando encabeza el titulo: `Viernes: entrega…`. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ──────────────────────────────────────────── la hora local, de verdad ── */

export interface LocalNow {
  /** `2026-09-15`, el dia en la zona del usuario. */
  date: string;
  /** 0 = domingo, como `profiles.notify_weekly_dow` y `schedule_templates`. */
  weekday: number;
  /** Minutos desde la medianoche local. */
  minutes: number;
}

const PARTS_CACHE = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = PARTS_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    PARTS_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function readParts(instant: Date, timeZone: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out;
}

/**
 * Minutos que la zona va por delante de UTC en ese instante.
 *
 * Se calcula comparando la hora de pared con el instante real, en vez de con
 * una tabla: asi funciona igual en una zona con horario de verano.
 */
export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const p = readParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  /* Al segundo, porque `instant` puede traer milisegundos. */
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

export function localNow(instant: Date, timeZone: string): LocalNow {
  const p = readParts(instant, timeZone);
  const date =
    String(p.year).padStart(4, '0') +
    '-' +
    String(p.month).padStart(2, '0') +
    '-' +
    String(p.day).padStart(2, '0');

  /* El dia de la semana se saca del calendario, no de `instant.getUTCDay()`:
     a las 02:00 UTC del lunes en Caracas todavia es domingo. */
  const weekday = new Date(date + 'T12:00:00Z').getUTCDay();

  return { date, weekday, minutes: p.hour * 60 + p.minute };
}

/* ───────────────────────────────────────── fechas locales como texto ── */

/** `2026-09-15` + 2 → `2026-09-17`. Aritmetica en UTC para no pisar zonas. */
export function shiftDate(date: string, days: number): string {
  const at = new Date(date + 'T12:00:00Z');
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** Dias entre dos fechas locales. Positivo si `to` es posterior. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + 'T12:00:00Z');
  const b = Date.parse(to + 'T12:00:00Z');
  return Math.round((b - a) / 86400000);
}

export function weekdayOf(date: string): number {
  return new Date(date + 'T12:00:00Z').getUTCDay();
}

export function dayNumberOf(date: string): number {
  return Number(date.slice(8, 10));
}

/**
 * `Hoy`, `Mañana`, o el dia de la semana con mayuscula. Mas alla de una semana
 * se cae al numero, que es lo unico que sigue siendo claro.
 */
export function relativeDayLabel(today: string, target: string): string {
  const delta = daysBetween(today, target);
  if (delta === 0) return 'Hoy';
  if (delta === 1) return 'Mañana';
  if (delta > 1 && delta < 7) return capitalize(weekdayLabel(weekdayOf(target)));
  return 'El ' + dayNumberOf(target);
}

/**
 * El rango UTC que cubre un dia local completo, para filtrar `blocks` por
 * `starts_at`. Dos pasadas porque el desplazamiento de la zona puede ser
 * distinto a medianoche que al mediodia en las zonas con horario de verano.
 */
export function localDayRangeUtc(
  date: string,
  timeZone: string
): { start: string; end: string } {
  const midnightUtc = (localDate: string) => {
    const naive = Date.parse(localDate + 'T00:00:00Z');
    const firstGuess = naive - timeZoneOffsetMinutes(new Date(naive), timeZone) * 60000;
    const offset = timeZoneOffsetMinutes(new Date(firstGuess), timeZone);
    return new Date(naive - offset * 60000);
  };
  return {
    start: midnightUtc(date).toISOString(),
    end: midnightUtc(shiftDate(date, 1)).toISOString(),
  };
}

/* ────────────────────────────────────────────── la semana ISO, para la clave ── */

/**
 * `2026-W38`. Se usa como parte de `notification_log.dedupe_key` de la
 * revision dominical: la clave tiene que ser la misma aunque el usuario cambie
 * el dia de la revision a mitad de semana.
 */
export function isoWeekKey(date: string): string {
  const at = new Date(date + 'T12:00:00Z');
  /* Regla ISO 8601: se salta al jueves de esa semana y se cuenta desde el
     primer jueves del ano. */
  const day = (at.getUTCDay() + 6) % 7; // 0 = lunes
  at.setUTCDate(at.getUTCDate() - day + 3);
  const isoYear = at.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((at.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return isoYear + '-W' + String(week).padStart(2, '0');
}

/* ─────────────────────────────────────────────────── que toca mandar ── */

export interface NotifyProfile {
  id: string;
  timezone: string;
  /** `08:00:00`, tal y como lo devuelve Postgres para un `time`. */
  notify_morning: string;
  notify_evening: string;
  /** 0 = domingo. */
  notify_weekly_dow: number;
  notify_weekly_time: string;
}

export type NotificationKind = 'morning' | 'evening' | 'weekly_review';

export interface DueNotification {
  kind: NotificationKind;
  /** `morning:2026-09-15`. UNIQUE en `notification_log`: esto es la idempotencia. */
  dedupeKey: string;
  /** El dia local al que se refiere. */
  date: string;
}

/** `08:00:00` o `08:00` → 480. */
export function minutesOfDay(time: string): number {
  const [hour, minute] = time.split(':');
  return Number(hour) * 60 + Number(minute);
}

function inWindow(nowMinutes: number, targetMinutes: number): boolean {
  /* Recortada para no cruzar la medianoche. Ver la cabecera. */
  const end = Math.min(targetMinutes + WINDOW_MINUTES, 24 * 60);
  return nowMinutes >= targetMinutes && nowMinutes < end;
}

/**
 * Que notificaciones caen dentro de la ventana AHORA MISMO para este perfil.
 *
 * No mira `notification_log`: eso lo hace quien llama, insertando la clave
 * ANTES de enviar. Ese orden importa y esta explicado en `dispatch.ts`.
 *
 * `advance_notice` no sale de aqui: no depende de una hora configurada sino de
 * la fecha de una tarea, y se calcula en `dispatch.ts` con los datos delante.
 */
export function dueNotifications(
  instant: Date,
  profile: NotifyProfile
): DueNotification[] {
  const local = localNow(instant, profile.timezone);
  const due: DueNotification[] = [];

  if (inWindow(local.minutes, minutesOfDay(profile.notify_morning))) {
    due.push({ kind: 'morning', dedupeKey: 'morning:' + local.date, date: local.date });
  }

  if (inWindow(local.minutes, minutesOfDay(profile.notify_evening))) {
    due.push({ kind: 'evening', dedupeKey: 'evening:' + local.date, date: local.date });
  }

  if (
    local.weekday === profile.notify_weekly_dow &&
    inWindow(local.minutes, minutesOfDay(profile.notify_weekly_time))
  ) {
    due.push({
      kind: 'weekly_review',
      dedupeKey: 'weekly_review:' + isoWeekKey(local.date),
      date: local.date,
    });
  }

  return due;
}

/* ───────────────────────────────────────────────────── horas para leer ── */

/** `2026-09-17T19:00:00+00:00` en Caracas → `15:00`. */
export function formatLocalTime(timestamp: string, timeZone: string): string {
  const p = readParts(new Date(timestamp), timeZone);
  return p.hour + ':' + String(p.minute).padStart(2, '0');
}

/** `15:00:00` (un `time` de Postgres, ya local) → `15:00`. */
export function formatPlainTime(time: string): string {
  const [hour, minute] = time.split(':');
  return Number(hour) + ':' + minute;
}
