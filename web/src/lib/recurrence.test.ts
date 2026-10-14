import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeNextOccurrence,
  stepRecurrence,
  isOccurrenceOn,
  formatRecurrenceLabel,
  daysInMonth,
} from './date-utils.ts';

test('formatRecurrenceLabel retorna descripciones legibles en español', () => {
  assert.equal(formatRecurrenceLabel('daily'), 'Cada día');
  assert.equal(formatRecurrenceLabel('weekly'), 'Cada semana');
  assert.equal(formatRecurrenceLabel('monthly'), 'Cada mes');
  assert.equal(formatRecurrenceLabel('yearly'), 'Cada año');
  assert.equal(formatRecurrenceLabel(null), 'No se repite');
});

test('daysInMonth maneja años bisiestos y meses de diferente longitud', () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29); // bisiesto
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 1), 31);
});

test('stepRecurrence avanza correctamente según la frecuencia', () => {
  // diario
  assert.equal(stepRecurrence('2026-10-14', 'daily'), '2026-10-15');

  // semanal
  assert.equal(stepRecurrence('2026-10-14', 'weekly'), '2026-10-21');

  // mensual: caso del usuario "pagar Claude el 2 de cada mes"
  assert.equal(stepRecurrence('2026-10-02', 'monthly', '2026-10-02'), '2026-11-02');
  assert.equal(stepRecurrence('2026-11-02', 'monthly', '2026-10-02'), '2026-12-02');

  // mensual: fin de mes (31 de enero -> 28 de febrero en 2026)
  assert.equal(stepRecurrence('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  // y al volver a marzo vuelve a preservar el día 31 original
  assert.equal(stepRecurrence('2026-02-28', 'monthly', '2026-01-31'), '2026-03-31');

  // anual
  assert.equal(stepRecurrence('2026-10-14', 'yearly', '2026-10-14'), '2027-10-14');
});

test('computeNextOccurrence proyecta o avanza ocurrencias vencidas', () => {
  const TODAY = '2026-10-14';

  // Ocurrencia futura o de hoy no se mueve
  assert.equal(computeNextOccurrence('2026-10-14', 'monthly', TODAY), '2026-10-14');
  assert.equal(computeNextOccurrence('2026-11-02', 'monthly', TODAY), '2026-11-02');

  // Caso concreto del usuario: "Pagar Claude yoly" anotado el 2 de octubre (vencido)
  // debe avanzar automáticamente al 2 de noviembre
  assert.equal(computeNextOccurrence('2026-10-02', 'monthly', TODAY), '2026-11-02');

  // Si fue creado hace varios meses en el pasado (ej. 2026-07-02), debe avanzar hasta superar o igualar a TODAY
  assert.equal(computeNextOccurrence('2026-07-02', 'monthly', TODAY), '2026-11-02');

  // Diario en el pasado avanza exactamente a TODAY
  assert.equal(computeNextOccurrence('2026-10-01', 'daily', TODAY), '2026-10-14');

  // Semanal avanza a la siguiente fecha >= TODAY
  // 2026-09-30 (miércoles) -> +7: 10-07, +7: 10-14 (miércoles de hoy)
  assert.equal(computeNextOccurrence('2026-09-30', 'weekly', TODAY), '2026-10-14');
});

test('isOccurrenceOn detecta si la recurrencia cae en una fecha dada del calendario', () => {
  // Caso de pagar cada 2 de mes
  assert.equal(isOccurrenceOn('2026-10-02', 'monthly', '2026-10-02'), true);
  assert.equal(isOccurrenceOn('2026-10-02', 'monthly', '2026-11-02'), true);
  assert.equal(isOccurrenceOn('2026-10-02', 'monthly', '2026-12-02'), true);
  assert.equal(isOccurrenceOn('2026-10-02', 'monthly', '2026-10-03'), false);
  // Fechas antes del inicio son false
  assert.equal(isOccurrenceOn('2026-10-02', 'monthly', '2026-09-02'), false);

  // Semanal
  assert.equal(isOccurrenceOn('2026-10-05', 'weekly', '2026-10-05'), true);
  assert.equal(isOccurrenceOn('2026-10-05', 'weekly', '2026-10-12'), true);
  assert.equal(isOccurrenceOn('2026-10-05', 'weekly', '2026-10-19'), true);
  assert.equal(isOccurrenceOn('2026-10-05', 'weekly', '2026-10-20'), false);

  // Diario
  assert.equal(isOccurrenceOn('2026-10-05', 'daily', '2026-10-06'), true);
  assert.equal(isOccurrenceOn('2026-10-05', 'daily', '2026-10-25'), true);
  assert.equal(isOccurrenceOn('2026-10-05', 'daily', '2026-10-04'), false);
});
