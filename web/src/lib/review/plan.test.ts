/* Pruebas de "Esta semana": a que dia va una tarea con un solo toque. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayWeight, suggestDay, type DayLoad } from './plan.ts';

const day = (dateStr: string, classes: number, tasks = 0, reminders: string[] = [], past = false): DayLoad => ({
  dateStr,
  classes,
  tasks,
  reminders,
  past,
});

/* Semana del 12 al 18 de octubre: lunes a viernes con clase, finde libre. */
const WEEK: DayLoad[] = [
  day('2026-10-12', 3),
  day('2026-10-13', 1),
  day('2026-10-14', 3),
  day('2026-10-15', 1, 1),
  day('2026-10-16', 2),
  day('2026-10-17', 0),
  day('2026-10-18', 0),
];

test('va al primer día con hueco: ni al lunes lleno ni al sábado lejano', () => {
  assert.deepEqual(suggestDay(WEEK), { dateStr: '2026-10-13', reason: 'room' });
});

test('lo repartido en este ritual cuenta: la siguiente busca otro hueco', () => {
  const added = new Map([['2026-10-13', 1]]);
  /* martes: 1 clase + 1 puesta = 2, todavía cabe otra. */
  assert.deepEqual(suggestDay(WEEK, added), { dateStr: '2026-10-13', reason: 'room' });
  added.set('2026-10-13', 2);
  /* martes ya pesa 3; el jueves (1 clase y 1 tarea) pesa 2 y cabe. */
  assert.deepEqual(suggestDay(WEEK, added), { dateStr: '2026-10-15', reason: 'room' });
  added.set('2026-10-15', 1);
  /* viernes 2 clases: cabe una. */
  assert.deepEqual(suggestDay(WEEK, added), { dateStr: '2026-10-16', reason: 'room' });
  added.set('2026-10-16', 1);
  assert.deepEqual(suggestDay(WEEK, added), { dateStr: '2026-10-17', reason: 'room' });
});

test('un parcial pesa: ese día no tiene hueco aunque no tenga clase', () => {
  const week = [day('2026-10-14', 1, 0, ['Parcial de Cálculo']), day('2026-10-15', 2)];
  assert.equal(dayWeight(week[0]), 3);
  assert.deepEqual(suggestDay(week), { dateStr: '2026-10-15', reason: 'room' });
});

test('si ningún día tiene hueco, al más libre; a igual peso, el más temprano', () => {
  const full = [day('2026-10-12', 4), day('2026-10-13', 3), day('2026-10-14', 3)];
  assert.deepEqual(suggestDay(full), { dateStr: '2026-10-13', reason: 'lightest' });
});

test('los días que ya pasaron no se ofrecen', () => {
  const midweek = [day('2026-10-12', 0, 0, [], true), day('2026-10-13', 4), day('2026-10-14', 1)];
  assert.deepEqual(suggestDay(midweek), { dateStr: '2026-10-14', reason: 'room' });
});

test('sin días por delante no hay a dónde', () => {
  assert.equal(suggestDay([day('2026-10-12', 0, 0, [], true)]), null);
  assert.equal(suggestDay([]), null);
});
