/* ============================================================================
   Organizer · Pruebas de las notificaciones v2

   Atrasadas en la mañana, reminder sin preparar, recurso para leer y aviso
   minutos antes. Lo que se comprueba es lo mismo que en compose.test.ts: que
   el texto quepa en los 38 / 88 caracteres de la notificación plegada de iOS,
   y que la ventana de tiempo dispare cuando toca y solo entonces.
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BODY_MAX,
  TITLE_MAX,
  composeBeforeBlock,
  composeMorning,
  composePrepAlert,
  composeResource,
  overdueSuffix,
} from '../compose.ts';
import { dueNotifications, minutesBeforeStart, type NotifyProfile } from '../schedule.ts';

const fits = (t: { title: string; body: string }) => {
  assert.ok(t.title.length <= TITLE_MAX, `título de ${t.title.length}: ${t.title}`);
  assert.ok(t.body.length <= BODY_MAX, `cuerpo de ${t.body.length}: ${t.body}`);
};

const PROFILE: NotifyProfile = {
  id: 'u',
  timezone: 'America/Caracas',
  notify_morning: '08:00:00',
  notify_evening: '21:00:00',
  notify_weekly_dow: 0,
  notify_weekly_time: '19:00:00',
  notify_resources: true,
};

/* ───────────────────────────────────────────── atrasadas en la mañana ── */

test('sin atrasadas, la mañana no cambia', () => {
  const text = composeMorning({
    weekdayLabel: 'lunes',
    dayNumber: 28,
    slots: [{ time: '8:00', title: 'Cálculo', isClass: true }],
    reminder: null,
  });
  assert.equal(text.body, '8:00 Cálculo');
  assert.equal(overdueSuffix(0), '');
});

test('las atrasadas van al final como recuento', () => {
  const text = composeMorning({
    weekdayLabel: 'lunes',
    dayNumber: 28,
    slots: [{ time: '8:00', title: 'Cálculo', isClass: true }],
    reminder: null,
    overdue: 2,
  });
  assert.equal(text.body, '8:00 Cálculo · 2 atrasadas');
  fits(text);
});

test('una sola atrasada va en singular', () => {
  assert.equal(overdueSuffix(1), ' · 1 atrasada');
});

test('día vacío con atrasadas: lo dice en vez de "nada planificado" a secas', () => {
  const text = composeMorning({ weekdayLabel: 'lunes', dayNumber: 28, slots: [], reminder: null, overdue: 3 });
  assert.match(text.body, /3 tareas atrasadas/);
  fits(text);
});

test('con un día lleno, el recuento de atrasadas se sigue viendo entero', () => {
  const slots = Array.from({ length: 8 }, (_, i) => ({
    time: `${8 + i}:00`,
    title: `Tarea larga número ${i + 1} del día`,
    isClass: false,
  }));
  const text = composeMorning({ weekdayLabel: 'martes', dayNumber: 29, slots, reminder: null, overdue: 4 });
  assert.ok(text.body.endsWith('· 4 atrasadas'), text.body);
  fits(text);
});

test('con reminder encabezando, el recuento también cabe', () => {
  const text = composeMorning({
    weekdayLabel: 'martes',
    dayNumber: 29,
    slots: [{ time: '10:00', title: 'Repasar semáforos', isClass: false }],
    reminder: { title: 'Primer Parcial Sistemas Operativos', whenLabel: 'Mañana' },
    overdue: 1,
  });
  assert.ok(text.body.includes('1 atrasada'), text.body);
  fits(text);
});

/* ───────────────────────────────────────────── reminder sin preparar ── */

test('prep alert: dice cuánto falta y qué hacer', () => {
  const text = composePrepAlert({ title: 'Entrega Proyecto 1 BD', daysAway: 3 });
  assert.equal(text.title, 'En 3 días: Entrega Proyecto 1 BD');
  assert.match(text.body, /ninguna tarea/);
  fits(text);
});

test('prep alert: mañana y títulos largos no se pasan del techo', () => {
  const text = composePrepAlert({
    title: 'Defensa final del proyecto de Ingeniería de Software II con el jurado',
    daysAway: 1,
  });
  assert.ok(text.title.startsWith('Mañana: '));
  fits(text);
});

/* ─────────────────────────────────────────────── algo para leer ── */

test('recurso sin notas: cuándo lo guardaste', () => {
  const text = composeResource({ title: 'Prompt engineering guide', notes: null, savedDaysAgo: 12 });
  assert.equal(text.title, 'Para leer: Prompt engineering guide');
  assert.match(text.body, /hace 12 días/);
  fits(text);
});

test('recurso con notas largas: la nota se recorta, el cuándo no', () => {
  const text = composeResource({
    title: 'Un artículo con un título larguísimo sobre agentes de IA y memoria',
    notes: 'Lo guardé porque explica cómo montar memoria a largo plazo en agentes con ejemplos reales y código',
    savedDaysAgo: 1,
  });
  assert.ok(text.body.endsWith('Lo guardaste ayer'), text.body);
  fits(text);
});

/* ────────────────────────────────────────────────── minutos antes ── */

test('aviso antes de clase: hora y aula', () => {
  const text = composeBeforeBlock({
    title: 'Cálculo Diferencial',
    minutesLeft: 15,
    range: '8:00 – 10:00',
    location: 'Aula 204',
    isClass: true,
  });
  assert.equal(text.title, 'En 15 min: Cálculo Diferencial');
  assert.equal(text.body, '8:00 – 10:00 · Aula 204');
  fits(text);
});

test('minutesBeforeStart: dentro de la ventana devuelve lo que falta', () => {
  const now = new Date('2026-09-28T11:47:00Z');
  assert.equal(minutesBeforeStart(now, '2026-09-28T12:00:00Z', 15), 13);
});

test('minutesBeforeStart: antes de la ventana, pasada la hora o sin aviso → null', () => {
  const start = '2026-09-28T12:00:00Z';
  assert.equal(minutesBeforeStart(new Date('2026-09-28T11:30:00Z'), start, 15), null);
  assert.equal(minutesBeforeStart(new Date('2026-09-28T12:00:00Z'), start, 15), null);
  assert.equal(minutesBeforeStart(new Date('2026-09-28T11:50:00Z'), start, null), null);
});

/* ──────────────────────────────────────── recursos: martes y sábado ── */

test('recurso: martes a las 19:05 en Caracas toca', () => {
  /* 2026-09-29 es martes. 19:05 en Caracas = 23:05 UTC. */
  const due = dueNotifications(new Date('2026-09-29T23:05:00Z'), PROFILE);
  assert.ok(due.some((d) => d.kind === 'resource' && d.dedupeKey === 'resource:2026-09-29'));
});

test('recurso: miércoles a la misma hora no toca', () => {
  const due = dueNotifications(new Date('2026-09-30T23:05:00Z'), PROFILE);
  assert.ok(!due.some((d) => d.kind === 'resource'));
});

test('recurso: apagado en Ajustes no toca', () => {
  const due = dueNotifications(new Date('2026-09-29T23:05:00Z'), { ...PROFILE, notify_resources: false });
  assert.ok(!due.some((d) => d.kind === 'resource'));
});
