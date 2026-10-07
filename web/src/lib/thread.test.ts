/* Pruebas del hilo de Inicio. "Hoy" es el martes 6 de octubre de 2026, en
   America/Bogota (UTC-5, sin horario de verano). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ayerText,
  buildTimeline,
  capSubtitle,
  dayEvents,
  digestRows,
  laterDays,
  listTitles,
  nextLines,
  placeReceipt,
  weekSub,
  type DayLog,
  type ThreadEvent,
} from './thread.ts';

const TODAY = '2026-10-06';
const TZ = 'America/Bogota';
/** 7:00 en Bogota = 12:00 UTC. */
const at = (hhmm: string) => `${TODAY}T${String(Number(hhmm.slice(0, 2)) + 5).padStart(2, '0')}:${hhmm.slice(3)}:00.000Z`;

const EMPTY: DayLog = { morningAt: null, reviewAt: null, notices: [], created: [], completed: [] };

function shape(events: ThreadEvent[]) {
  return buildTimeline(events, TZ).map((r) =>
    r.kind === 'stamp' ? `[${r.day ? 'Hoy' : ''}${r.day && r.clock ? ' ' : ''}${r.clock}]` : `${r.key}${r.tail ? '*' : ''}`
  );
}

test('sin aviso de la mañana, el resumen va arriba con sello "Hoy" y sin hora', () => {
  const events = dayEvents(EMPTY, { todayStr: TODAY, hasAyer: true, reviewDue: false });
  assert.deepEqual(shape(events), ['[Hoy]', 'dia', 'se-viene', 'ayer*']);
});

test('con aviso de la mañana, el sello lleva su hora real', () => {
  const events = dayEvents({ ...EMPTY, morningAt: at('07:00') }, { todayStr: TODAY, hasAyer: false, reviewDue: false });
  assert.deepEqual(shape(events), ['[Hoy 7:00]', 'dia', 'se-viene*']);
});

test('el día del ritual, "armar la semana" sustituye a lo de ayer', () => {
  const events = dayEvents(EMPTY, { todayStr: TODAY, hasAyer: true, reviewDue: true });
  assert.deepEqual(
    events.map((e) => e.key),
    ['dia', 'se-viene', 'domingo']
  );
});

test('los avisos que ya son el resumen o la prueba no se repiten como burbuja', () => {
  const log: DayLog = {
    ...EMPTY,
    morningAt: at('07:00'),
    notices: [
      { id: 'a', kind: 'morning', at: at('07:00'), title: 'Hoy, martes 6', body: '…' },
      { id: 'b', kind: 'test', at: at('08:00'), title: 'Notificaciones activadas', body: '…' },
      { id: 'c', kind: 'before', at: at('10:30'), title: 'En 30 min: Electricidad', body: '11:00 – 12:30 · L027' },
    ],
  };
  const events = dayEvents(log, { todayStr: TODAY, hasAyer: false, reviewDue: false });
  assert.deepEqual(shape(events), ['[Hoy 7:00]', 'dia', 'se-viene*', '[10:30]', 'aviso:c*']);
});

test('sello nuevo solo si pasan más de 15 minutos; la cola cambia con el lado', () => {
  const log: DayLog = {
    ...EMPTY,
    morningAt: at('07:00'),
    created: [{ id: 'n1', title: 'comprar cable usb-c', status: 'inbox', dueOn: null, at: at('07:10') }],
    completed: [{ id: 't1', title: 'Gym', at: at('09:12') }],
  };
  const events = dayEvents(log, { todayStr: TODAY, hasAyer: false, reviewDue: false });
  assert.deepEqual(shape(events), ['[Hoy 7:00]', 'dia', 'se-viene*', 'nueva:n1*', '[9:12]', 'hecho:t1*']);
});

test('a la misma hora manda el orden de llegada', () => {
  const t = Date.parse(at('09:00'));
  const events: ThreadEvent[] = [
    { key: 'b', at: t, item: { type: 'notice', title: 'B', body: '' } },
    { key: 'a', at: t, item: { type: 'notice', title: 'A', body: '' } },
  ];
  assert.deepEqual(shape(events), ['[Hoy 9:00]', 'b', 'a*']);
});

test('el acuse dice dónde quedó lo que anotaste', () => {
  assert.equal(placeReceipt('inbox', null, TODAY), 'En Pendientes');
  assert.equal(placeReceipt('someday', null, TODAY), 'En Pendientes');
  assert.equal(placeReceipt('planned', TODAY, TODAY), 'Para hoy');
  assert.equal(placeReceipt('planned', '2026-10-07', TODAY), 'Para mañana');
  assert.equal(placeReceipt('planned', '2026-10-09', TODAY), 'Para el vie 9');
  assert.equal(placeReceipt('planned', '2026-10-12', TODAY), 'Para el lun 12');
  /* Mas alla de una semana, "vie 6" pareceria de esta: va el mes. */
  assert.equal(placeReceipt('planned', '2026-11-06', TODAY), 'Para el 6 de nov');
  assert.equal(placeReceipt('done', TODAY, TODAY), 'Hecha');
});

test('lo de ayer habla como el aviso de la noche y no cuenta', () => {
  assert.equal(
    ayerText([{ title: 'Leer el paper de RAG', dueOn: '2026-10-05' }], TODAY),
    'Ayer quedó abierto: Leer el paper de RAG.'
  );
  assert.equal(
    ayerText(
      [
        { title: 'Leer el paper de RAG', dueOn: '2026-10-05' },
        { title: 'Lavar la ropa', dueOn: '2026-10-05' },
      ],
      TODAY
    ),
    'Ayer quedaron abiertos: Leer el paper de RAG y Lavar la ropa.'
  );
  assert.equal(
    ayerText(
      [
        { title: 'A', dueOn: '2026-10-05' },
        { title: 'B', dueOn: '2026-10-02' },
      ],
      TODAY
    ),
    'Quedaron abiertos de días anteriores: A y B.'
  );
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

test('la cápsula lleva la racha solo si la hay', () => {
  assert.equal(capSubtitle('martes 6 de octubre', 0), 'martes 6 de octubre');
  assert.equal(capSubtitle('martes 6 de octubre', 1), 'martes 6 · 1 día seguido');
  assert.equal(capSubtitle('martes 6 de octubre', 12), 'martes 6 · 12 días seguidos');
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
