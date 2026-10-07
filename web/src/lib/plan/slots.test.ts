/* Pruebas de los huecos libres. "Hoy" es el lunes 5 de octubre de 2026. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canBookBoth, computeFreeSlots, fitsInSlots } from './slots.ts';

const H = (h: number, m = 0) => h * 60 + m;

test('día vacío: un solo hueco de 7:00 a 22:30', () => {
  const s = computeFreeSlots({ today: '2026-10-06', nowMinutes: 0, days: 1, busy: [] });
  assert.deepEqual(s, [{ id: 'H1', date: '2026-10-06', from: H(7), to: H(22, 30) }]);
});

test('una clase parte el día y deja margen a los lados', () => {
  const s = computeFreeSlots({
    today: '2026-10-06',
    nowMinutes: 0,
    days: 1,
    busy: [{ date: '2026-10-06', from: H(8), to: H(9, 30) }],
  });
  /* 7:00–7:50 → 7:00–7:45; 9:40 → 9:45. */
  assert.deepEqual(
    s.map((x) => [x.from, x.to]),
    [
      [H(7), H(7, 45)],
      [H(9, 45), H(22, 30)],
    ]
  );
});

test('hoy empieza después de ahora, redondeado', () => {
  const s = computeFreeSlots({ today: '2026-10-05', nowMinutes: H(19, 2), days: 1, busy: [] });
  assert.equal(s[0].from, H(19, 30));
});

test('huecos de menos de 30 minutos no cuentan; lo solapado se fusiona', () => {
  const s = computeFreeSlots({
    today: '2026-10-06',
    nowMinutes: 0,
    days: 1,
    busy: [
      { date: '2026-10-06', from: H(7), to: H(12) },
      { date: '2026-10-06', from: H(11), to: H(12, 30) },
      { date: '2026-10-06', from: H(12, 50), to: H(22, 30) },
    ],
  });
  assert.deepEqual(s, []);
});

test('fitsInSlots exige que la sesión quepa entera', () => {
  const s = computeFreeSlots({ today: '2026-10-06', nowMinutes: 0, days: 1, busy: [] });
  assert.equal(fitsInSlots(s, '2026-10-06', H(22), 30), true);
  assert.equal(fitsInSlots(s, '2026-10-06', H(22, 15), 30), false);
  assert.equal(fitsInSlots(s, '2026-10-07', H(10), 30), false);
});

test('canBookBoth: 15 min entre dos sugerencias bastan; 10 no', () => {
  const d = '2026-10-07';
  assert.equal(canBookBoth({ date: d, from: H(14), to: H(14, 45) }, { date: d, from: H(15), to: H(15, 45) }), true);
  assert.equal(canBookBoth({ date: d, from: H(14), to: H(14, 50) }, { date: d, from: H(15), to: H(15, 45) }), false);
  assert.equal(canBookBoth({ date: d, from: H(14), to: H(15) }, { date: '2026-10-08', from: H(14), to: H(15) }), true);
});

test('canBookBoth dice lo mismo que guardar una y recalcular los huecos', () => {
  const d = '2026-10-06';
  const fitsAfter = (booked: { from: number; to: number }, other: { from: number; to: number }) =>
    fitsInSlots(
      computeFreeSlots({ today: d, nowMinutes: 0, days: 1, busy: [{ date: d, ...booked }] }),
      d,
      other.from,
      other.to - other.from
    );
  for (let gap = 0; gap <= 30; gap += 5) {
    for (const len of [30, 40, 45]) {
      const a = { date: d, from: H(14), to: H(14) + len };
      const b = { date: d, from: a.to + gap, to: a.to + gap + 30 };
      if (b.from % 15) continue;
      assert.equal(canBookBoth(a, b), fitsAfter(a, b) && fitsAfter(b, a), `len ${len}, gap ${gap}`);
    }
  }
});
