/* Pruebas del intérprete de Siri. "Hoy" es el lunes 5 de octubre de 2026,
   a las 19:00 hora local. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCapture } from './parse.ts';

const NOW = { date: '2026-10-05', minutes: 19 * 60 };
const p = (text: string) => parseCapture(text, NOW);

test('sin fecha ni hora: tarea a la bandeja, texto intacto', () => {
  assert.deepEqual(p('comprar pan'), { kind: 'task', title: 'Comprar pan', date: null, time: null });
});

test('mañana y pasado mañana', () => {
  assert.deepEqual(p('llamar al banco mañana'), { kind: 'task', title: 'Llamar al banco', date: '2026-10-06', time: null });
  assert.equal(p('pasado mañana lavar el carro').date, '2026-10-07');
});

test('día de la semana: el siguiente; el mismo día cuenta como la otra semana', () => {
  const r = p('entregar informe el viernes a las 3');
  assert.deepEqual(r, { kind: 'task', title: 'Entregar informe', date: '2026-10-09', time: '15:00' });
  assert.equal(p('gym el lunes').date, '2026-10-12');
  assert.equal(p('reunión el miércoles').date, '2026-10-07');
});

test('día y mes, con y sin año; si ya pasó, el año que viene', () => {
  assert.equal(p('cumpleaños de Ana el 20 de octubre').date, '2026-10-20');
  assert.equal(p('renovar pasaporte el 3 de enero').date, '2027-01-03');
  assert.equal(p('algo el 1 de octubre').date, '2027-10-01');
  assert.equal(p('pagar 15/10').date, '2026-10-15');
  assert.equal(p('cita el 12 de dic del 2026').date, '2026-12-12');
});

test('"el 15" solo: este mes, o el siguiente si ya pasó', () => {
  assert.equal(p('pagar la luz el 15').date, '2026-10-15');
  assert.equal(p('pagar el alquiler el 2').date, '2026-11-02');
});

test('en N días / semanas', () => {
  assert.equal(p('revisar notas en 3 días').date, '2026-10-08');
  assert.equal(p('cortarme el pelo dentro de dos semanas').date, '2026-10-19');
});

test('horas: am/pm, de la tarde, y media, 24h, mediodía', () => {
  assert.equal(p('dentista mañana a las 10').time, '10:00');
  assert.equal(p('dentista mañana a las 4 de la tarde').time, '16:00');
  assert.equal(p('correr mañana a las 6 de la mañana').time, '06:00');
  assert.equal(p('estudiar mañana a las 8 y media').time, '08:30');
  assert.equal(p('llamar mañana 3pm').time, '15:00');
  assert.equal(p('clase extra mañana 14:30').time, '14:30');
  assert.equal(p('almorzar con papá mañana al mediodía').time, '12:00');
  assert.equal(p('café mañana a las tres').time, '15:00');
});

test('"de la mañana" no se confunde con el día "mañana"', () => {
  const r = p('pastilla el viernes a las 8 de la mañana');
  assert.equal(r.date, '2026-10-09');
  assert.equal(r.time, '08:00');
  assert.equal(r.title, 'Pastilla');
});

test('solo hora: hoy si no ha pasado, si no mañana', () => {
  assert.equal(p('llamar a mamá a las 9 de la noche').date, '2026-10-05');
  assert.equal(p('sacar la basura a las 7 de la mañana').date, '2026-10-06');
});

test('recordatorio: reminder con fecha y hora', () => {
  assert.deepEqual(p('recordatorio parcial de cálculo el 15 de octubre a las 8'), {
    kind: 'reminder',
    title: 'Parcial de cálculo',
    date: '2026-10-15',
    time: '08:00',
  });
  assert.deepEqual(p('Reminder: entrega del proyecto de BD el viernes'), {
    kind: 'reminder',
    title: 'Entrega del proyecto de BD',
    date: '2026-10-09',
    time: null,
  });
});

test('recordatorio sin fecha: se marca reminder pero sin fecha (el endpoint decide)', () => {
  const r = p('recordatorio comprar regalo');
  assert.equal(r.kind, 'reminder');
  assert.equal(r.date, null);
  assert.equal(r.title, 'Comprar regalo');
});

test('el título conserva tildes y mayúsculas del dictado', () => {
  assert.equal(p('Revisar el capítulo 3 de Álgebra mañana').title, 'Revisar el capítulo 3 de Álgebra');
});

test('fechas imposibles no se inventan', () => {
  assert.equal(p('algo el 31 de febrero').date, null);
});
