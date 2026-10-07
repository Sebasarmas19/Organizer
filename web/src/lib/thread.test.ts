/* Pruebas de los textos de Inicio. "Hoy" es el martes 6 de octubre de 2026. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { digestRows, laterDays, listTitles, nextLines, weekSub } from './thread.ts';

const TODAY = '2026-10-06';

test('una lista de títulos no cuenta: con más de tres, "y otras"', () => {
  assert.equal(listTitles([]), '');
  assert.equal(listTitles(['A']), 'A');
  assert.equal(listTitles(['A', 'B', 'C']), 'A, B y C');
  assert.equal(listTitles(['A', 'B', 'C', 'D']), 'A, B y otras');
});

test('se viene: pasos, siguiente paso y cuándo; sin pasos ofrece planificar', () => {
  assert.deepEqual(weekSub({ prep: ['Resolver la guía', 'Simulacro'], done: 1, nextWhen: 'hoy' }), {
    text: '1 de 3 pasos · Siguiente: Resolver la guía · hoy',
    plan: false,
  });
  assert.deepEqual(weekSub({ prep: [], done: 0, nextWhen: '' }), { text: 'Sin preparación', plan: true });
  assert.deepEqual(weekSub({ prep: [], done: 2, nextWhen: '' }), { text: 'Todo preparado', plan: false });
});

test('el día: clases y tareas por hora, las sin hora al final, la clase pasada en gris', () => {
  const rows = digestRows(
    [
      { id: 't2', title: 'Llamar al banco', meta: '', done: false },
      { id: 't1', title: 'Resolver la guía', meta: '15:00 – 16:30 · Cálculo', rem: 'Parcial · viernes 9', done: false },
    ],
    [
      {
        isToday: true,
        slots: [
          { id: 'c1', title: 'Electricidad', location: 'L027', hours: '8:00 – 9:30' },
          { id: 'c2', title: 'Cálculo II', location: null, hours: '11:00 – 12:30' },
        ],
      },
    ],
    11 * 60 + 15
  );
  assert.deepEqual(
    rows.map((r) => `${r.time}|${r.title}|${r.kind === 'class' ? (r.dim ? 'pasada' : r.now ? 'ahora' : 'luego') : r.sub}`),
    ['8:00|Electricidad|pasada', '11:00|Cálculo II|ahora', '15:00|Resolver la guía|Cálculo', '|Llamar al banco|']
  );
});

test('lo siguiente: la hora arriba, el contexto abajo', () => {
  assert.deepEqual(nextLines('15:00 – 16:30 · Proyecto IA'), { cap: '15:00 – 16:30', ctx: 'Proyecto IA' });
  assert.deepEqual(nextLines('Proyecto IA'), { cap: '', ctx: 'Proyecto IA' });
  assert.deepEqual(nextLines(''), { cap: '', ctx: '' });
});

test('otro día ofrece mañana y los cinco siguientes', () => {
  assert.deepEqual(laterDays(TODAY), [
    { dateStr: '2026-10-07', label: 'Mañana' },
    { dateStr: '2026-10-08', label: 'jue 8' },
    { dateStr: '2026-10-09', label: 'vie 9' },
    { dateStr: '2026-10-10', label: 'sáb 10' },
    { dateStr: '2026-10-11', label: 'dom 11' },
    { dateStr: '2026-10-12', label: 'lun 12' },
  ]);
  /* Cruza el mes sin tropezar. */
  assert.equal(laterDays('2026-10-30')[2].dateStr, '2026-11-02');
});
