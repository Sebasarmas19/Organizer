/* ============================================================================
   Organizer · La hora local y la idempotencia

   Dos fallos posibles, los dos silenciosos:

   1. LA NOTIFICACION LLEGA A LA HORA EQUIVOCADA. El cron corre en UTC, las
      horas del usuario son locales. Un error de signo manda el resumen de la
      manana a medianoche, y una app que despierta a nadie se silencia.
      Se prueba con `America/Caracas` (UTC−4 fijo, decision 14) y ademas con
      `America/New_York`, que es UTC−4 hoy y UTC−5 en noviembre: es el error
      exacto contra el que avisa la decision 14.

   2. LA MISMA NOTIFICACION SALE DOCE VECES POR HORA. El cron pasa cada 5
      minutos; si la clave de dedupe no es estable dentro de la ventana, sale
      una por pasada. Se prueba recorriendo la ventana entera minuto a minuto.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  daysBetween,
  dueNotifications,
  formatLocalTime,
  formatPlainTime,
  isoWeekKey,
  localDayRangeUtc,
  localNow,
  minutesOfDay,
  relativeDayLabel,
  shiftDate,
  timeZoneOffsetMinutes,
  weekdayLabel,
  weekdayOf,
  type NotifyProfile,
} from '../schedule.ts';

/** El perfil real de la base: `docs/schema.sql`, valores por defecto. */
const PROFILE: NotifyProfile = {
  id: 'f9d4cb51-21ac-4c98-ad5e-3aa6ace0402e',
  timezone: 'America/Caracas',
  notify_morning: '08:00:00',
  notify_evening: '21:00:00',
  notify_weekly_dow: 0,
  notify_weekly_time: '19:00:00',
};

/* ═════════════════════════════════════════════════════ la zona horaria ══ */

test('Caracas es UTC−4 en enero y en julio: no tiene horario de verano', () => {
  assert.equal(timeZoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/Caracas'), -240);
  assert.equal(timeZoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/Caracas'), -240);
});

test('Nueva York sí lo tiene, que es contra lo que avisa la decisión 14', () => {
  /* Si alguien "simplificara" restando cuatro horas fijas, en noviembre todas
     las notificaciones se correrían una hora y nadie sabría por qué. */
  assert.equal(timeZoneOffsetMinutes(new Date('2026-09-15T12:00:00Z'), 'America/New_York'), -240);
  assert.equal(timeZoneOffsetMinutes(new Date('2026-12-15T12:00:00Z'), 'America/New_York'), -300);
});

test('la hora local se lee del calendario, no restando', () => {
  /* 12:00 UTC del 15 de septiembre = 08:00 en Caracas. Y el 15 es martes:
     el semestre empieza en martes, no en lunes. */
  const local = localNow(new Date('2026-09-15T12:00:00Z'), 'America/Caracas');
  assert.deepEqual(local, { date: '2026-09-15', weekday: 2, minutes: 8 * 60 });
});

test('a las 02:00 UTC del lunes en Caracas todavía es domingo', () => {
  const local = localNow(new Date('2026-09-14T02:00:00Z'), 'America/Caracas');
  assert.equal(local.date, '2026-09-13');
  assert.equal(local.weekday, 0, 'domingo');
  assert.equal(local.minutes, 22 * 60);
});

test('el rango UTC de un día local cubre 24 horas y empieza a medianoche local', () => {
  const range = localDayRangeUtc('2026-09-15', 'America/Caracas');
  assert.equal(range.start, '2026-09-15T04:00:00.000Z');
  assert.equal(range.end, '2026-09-16T04:00:00.000Z');
  assert.equal(Date.parse(range.end) - Date.parse(range.start), 86400000);
});

test('el rango UTC sobrevive al cambio de hora de una zona que sí lo tiene', () => {
  /* 1 de noviembre de 2026: Nueva York atrasa el reloj. El día local dura 25
     horas, y el rango tiene que cubrirlas todas o se pierde un bloque. */
  const range = localDayRangeUtc('2026-11-01', 'America/New_York');
  assert.equal(Date.parse(range.end) - Date.parse(range.start), 25 * 3600000);
});

/* ══════════════════════════════════════════════════════ qué toca y cuándo ══ */

test('a las 8:00 en Caracas toca la de la mañana, y solo esa', () => {
  const due = dueNotifications(new Date('2026-09-15T12:00:00Z'), PROFILE);
  assert.deepEqual(
    due.map((d) => d.kind),
    ['morning']
  );
  assert.equal(due[0].dedupeKey, 'morning:2026-09-15');
});

test('a las 21:00 toca la de la noche', () => {
  /* 21:00 en Caracas = 01:00 UTC del día siguiente. */
  const due = dueNotifications(new Date('2026-09-16T01:00:00Z'), PROFILE);
  assert.deepEqual(
    due.map((d) => d.dedupeKey),
    ['evening:2026-09-15'],
    'la clave lleva el día LOCAL, no el UTC: si no, la de la noche se duplicaría'
  );
});

test('el domingo a las 19:00 toca la revisión, con clave por semana ISO', () => {
  /* Domingo 13 de septiembre de 2026, 19:00 en Caracas = 23:00 UTC. */
  const due = dueNotifications(new Date('2026-09-13T23:00:00Z'), PROFILE);
  assert.deepEqual(
    due.map((d) => d.dedupeKey),
    ['weekly_review:2026-W37']
  );
});

test('a las 15:00 no toca nada: activar la app por la tarde no dispara la mañana', () => {
  assert.deepEqual(dueNotifications(new Date('2026-09-15T19:00:00Z'), PROFILE), []);
});

test('la clave no cambia en toda la ventana: el cron de 5 minutos no duplica', () => {
  /* Es la prueba que protege de las doce notificaciones por hora. */
  const keys = new Set<string>();
  for (let minute = 0; minute < 60; minute += 5) {
    const instant = new Date(Date.UTC(2026, 8, 15, 12, minute));
    for (const due of dueNotifications(instant, PROFILE)) keys.add(due.dedupeKey);
  }
  assert.deepEqual([...keys], ['morning:2026-09-15']);
});

test('la ventana dura una hora y ni un minuto más', () => {
  const at = (minutes: number) =>
    dueNotifications(new Date(Date.UTC(2026, 8, 15, 12, minutes)), PROFILE).length;
  assert.equal(at(0), 1, '8:00 en punto');
  assert.equal(at(59), 1, '8:59 todavía');
  assert.equal(at(60), 0, '9:00 ya no');
  assert.equal(
    dueNotifications(new Date(Date.UTC(2026, 8, 15, 11, 59)), PROFILE).length,
    0,
    '7:59 todavía no'
  );
});

test('una hora casi a medianoche no cruza al día siguiente', () => {
  const nightOwl: NotifyProfile = { ...PROFILE, notify_evening: '23:45:00' };
  /* 23:50 local = 03:50 UTC del día siguiente. */
  const inside = dueNotifications(new Date('2026-09-16T03:50:00Z'), nightOwl);
  assert.deepEqual(
    inside.map((d) => d.dedupeKey),
    ['evening:2026-09-15']
  );
  /* 00:10 local del día siguiente: fuera. La ventana se recorta, no se
     arrastra con una clave del día anterior. */
  assert.deepEqual(dueNotifications(new Date('2026-09-16T04:10:00Z'), nightOwl), []);
});

test('las horas salen de profiles: cambiarlas cambia cuándo llega', () => {
  const early: NotifyProfile = { ...PROFILE, notify_morning: '06:30:00' };
  assert.equal(dueNotifications(new Date('2026-09-15T10:30:00Z'), early).length, 1);
  assert.equal(dueNotifications(new Date('2026-09-15T12:00:00Z'), early).length, 0);
});

test('el día de la revisión también sale de profiles', () => {
  const saturday: NotifyProfile = { ...PROFILE, notify_weekly_dow: 6 };
  /* Sábado 12 de septiembre de 2026, 19:00 en Caracas = 23:00 UTC. */
  const due = dueNotifications(new Date('2026-09-12T23:00:00Z'), saturday);
  assert.deepEqual(
    due.map((d) => d.kind),
    ['weekly_review']
  );
});

/* ═══════════════════════════════════════════════════ fechas y etiquetas ══ */

test('la semana ISO se corta el lunes', () => {
  assert.equal(isoWeekKey('2026-09-13'), '2026-W37', 'domingo cierra la semana 37');
  assert.equal(isoWeekKey('2026-09-14'), '2026-W38', 'el lunes abre la 38');
  assert.equal(isoWeekKey('2026-09-15'), '2026-W38');
  /* 1 de enero de 2027 es viernes: ISO lo pone en la última semana de 2026. */
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53');
});

test('sumar y restar días no se rompe en fin de mes', () => {
  assert.equal(shiftDate('2026-09-30', 1), '2026-10-01');
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetween('2026-09-15', '2026-09-18'), 3);
  assert.equal(daysBetween('2026-09-18', '2026-09-15'), -3);
});

test('los días de la semana están en español y empiezan en domingo', () => {
  assert.equal(weekdayLabel(0), 'domingo');
  assert.equal(weekdayLabel(4), 'jueves');
  assert.equal(weekdayOf('2026-09-17'), 4, '17 de septiembre de 2026 es jueves');
});

test('la etiqueta relativa dice Hoy, Mañana o el día de la semana', () => {
  assert.equal(relativeDayLabel('2026-09-15', '2026-09-15'), 'Hoy');
  assert.equal(relativeDayLabel('2026-09-15', '2026-09-16'), 'Mañana');
  assert.equal(relativeDayLabel('2026-09-15', '2026-09-18'), 'Viernes');
});

test('las horas se escriben sin cero delante, como en el comp', () => {
  assert.equal(formatLocalTime('2026-09-15T12:00:00Z', 'America/Caracas'), '8:00');
  assert.equal(formatLocalTime('2026-09-15T19:30:00Z', 'America/Caracas'), '15:30');
  assert.equal(formatPlainTime('08:00:00'), '8:00');
  assert.equal(formatPlainTime('15:00:00'), '15:00');
  assert.equal(minutesOfDay('21:00:00'), 1260);
});
