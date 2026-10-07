/* Pruebas de la racha con perdon. "Hoy" es el martes 6 de octubre de 2026. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from './streak.ts';

const TODAY = '2026-10-06';

test('sin nada cerrado nunca, la racha es cero y no se gasta ningún comodín', () => {
  assert.deepEqual(computeStreak([], TODAY), { days: 0, graceLeft: 2 });
});

test('hoy todavía sin cerrar nada no corta la racha de ayer', () => {
  assert.deepEqual(computeStreak(['2026-10-05', '2026-10-04'], TODAY), { days: 2, graceLeft: 2 });
});

test('hoy cerrado cuenta', () => {
  assert.deepEqual(computeStreak(['2026-10-06', '2026-10-05'], TODAY), { days: 2, graceLeft: 2 });
});

test('un día vacío gasta un comodín y la racha sigue, sin sumar ese día', () => {
  const s = computeStreak(['2026-10-06', '2026-10-04', '2026-10-03'], TODAY);
  assert.deepEqual(s, { days: 3, graceLeft: 1 });
});

test('dos días vacíos seguidos también se perdonan', () => {
  const s = computeStreak(['2026-10-06', '2026-10-03', '2026-10-02'], TODAY);
  assert.deepEqual(s, { days: 3, graceLeft: 0 });
});

test('el tercer día vacío del mes corta, y no cobra los comodines que no sostenían nada', () => {
  /* Hoy cerrado; 5, 4 y 3 vacíos; el 2 cerrado ya no llega. */
  const s = computeStreak(['2026-10-06', '2026-10-02', '2026-10-01'], TODAY);
  assert.deepEqual(s, { days: 1, graceLeft: 2 });
});

test('los comodines son de cada mes: el 30 de septiembre gasta uno de septiembre', () => {
  const s = computeStreak(
    ['2026-10-03', '2026-10-02', '2026-10-01', '2026-09-29', '2026-09-28'],
    '2026-10-03'
  );
  /* 3, 2 y 1 de octubre + 29 y 28 de septiembre; el 30 lo sostiene un comodín de septiembre. */
  assert.deepEqual(s, { days: 5, graceLeft: 2 });
});

test('con los dos de este mes gastados, el siguiente día vacío corta', () => {
  const s = computeStreak(
    ['2026-10-06', '2026-10-04', '2026-10-02', '2026-10-01'],
    TODAY
  );
  /* 5 y 3 vacíos gastan los dos comodines de octubre; 6, 4, 2 y 1 suman. */
  assert.deepEqual(s, { days: 4, graceLeft: 0 });
});

test('ayer vacío y antes cerrado: el comodín de ayer sostiene la racha de esta mañana', () => {
  assert.deepEqual(computeStreak(['2026-10-04', '2026-10-03'], TODAY), { days: 2, graceLeft: 1 });
});
