// Test de aritmética de fechas para Calendario (mes, semana, día) y medianoche Caracas (UTC-4)

function parseDateString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function formatDateString(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function addDays(dateStr, days) {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return formatDateString(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getDayOfWeek(dateStr) {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

function getMondayOfWeek(dateStr) {
  const dow = getDayOfWeek(dateStr);
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(dateStr, diff);
}

function stepDate(view, dateStr, delta) {
  if (view === 'dia') return addDays(dateStr, delta);
  if (view === 'semana') return addDays(getMondayOfWeek(dateStr), delta * 7);

  const { year, month, day } = parseDateString(dateStr);
  const target = month - 1 + delta;
  const y = year + Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;
  return formatDateString(y, m + 1, Math.min(day, getDaysInMonth(y, m + 1)));
}

console.log('=== TEST DE ARITMÉTICA DE FECHAS Y LIMITES DE MES/AÑO ===');
const cases = [
  { view: 'mes', from: '2026-01-31', delta: 1, expected: '2026-02-28', desc: 'Fin de mes 31 enero -> febrero no bisiesto' },
  { view: 'mes', from: '2024-01-31', delta: 1, expected: '2024-02-29', desc: 'Fin de mes 31 enero -> febrero bisiesto (2024)' },
  { view: 'mes', from: '2026-03-31', delta: -1, expected: '2026-02-28', desc: 'Retroceso 31 marzo -> febrero' },
  { view: 'mes', from: '2026-01-15', delta: -1, expected: '2025-12-15', desc: 'Retroceso de año (enero -> diciembre)' },
  { view: 'mes', from: '2026-12-15', delta: 1, expected: '2027-01-15', desc: 'Avance de año (diciembre -> enero)' },
  { view: 'dia', from: '2026-12-31', delta: 1, expected: '2027-01-01', desc: 'Día a través de fin de año' },
  { view: 'dia', from: '2026-02-28', delta: 1, expected: '2026-03-01', desc: 'Día a través de fin de febrero' },
  { view: 'semana', from: '2026-09-28', delta: 1, expected: '2026-10-05', desc: 'Semana a través de cambio de mes (sep -> oct)' },
  { view: 'semana', from: '2026-10-04', delta: -1, expected: '2026-09-21', desc: 'Semana desde domingo retrocediendo una semana' }
];

let allPassed = true;
for (const c of cases) {
  const result = stepDate(c.view, c.from, c.delta);
  const passed = result === c.expected;
  if (!passed) allPassed = false;
  console.log(`${passed ? '✅' : '❌'} ${c.desc}: ${c.from} + (${c.delta} ${c.view}) => ${result} (esperado ${c.expected})`);
}

console.log('\n=== TEST DE MEDIANOCHE CARACAS (UTC-4) ===');
const dStart = new Date('2026-09-28T00:00:00-04:00').toISOString();
const dEnd = new Date('2026-09-28T23:59:59-04:00').toISOString();
console.log('2026-09-28 00:00:00-04:00 en UTC:', dStart);
console.log('2026-09-28 23:59:59-04:00 en UTC:', dEnd);
const tzOk = dStart === '2026-09-28T04:00:00.000Z' && dEnd.startsWith('2026-09-29T03:59:59');
console.log('Medianoche Caracas correcta:', tzOk ? '✅ PASSED' : '❌ FAILED');
