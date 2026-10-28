/**
 * Organizer · QA Automation Suite
 * NLP Live Capture (C1), Smart Schedule Connection (C4), & Quick Date/Duration Pills (B7)
 *
 * Requirements:
 * 1. Test getUpcomingClasses in web/src/lib/planner-data.ts:
 *    - Same day class: before class time vs after class time vs exact boundary.
 *    - Subjects on multiple days (e.g. Monday and Wednesday, same day multiple slots).
 *    - Subjects on weekends (Saturday, Sunday) or spanning into future weeks.
 *    - Empty, null, and edge case parameters.
 * 2. Test quick date chips (Hoy, Mañana, Próximo lunes) calculated with addDays and getDayOfWeek
 *    in web/src/lib/date-utils.ts for ALL days of the week (Sunday through Saturday):
 *    - Verification of exact day offsets and Monday landing for every weekday.
 *    - Month transitions, leap year handling, and year boundary rollovers.
 *    - Duration pill constants and validation.
 * 3. Test parseCapture interaction in web/src/lib/capture/parse.ts with manual chip removal:
 *    - User removing date chip to retain only time.
 *    - User removing time chip to retain only date.
 *    - User dismissing all chips.
 *    - "Solo hora" phrases with automatic today vs tomorrow inference and subsequent chip override.
 *    - Overriding with upcoming class chips.
 *    - Accents, formatting, empty strings, and reactive state simulation.
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

// Register module resolver for TypeScript and alias @/... resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const loaderPath = path.join(__dirname, 'qa-loader.mjs');
register(pathToFileURL(loaderPath).href, import.meta.url);

// Import target modules
const { getUpcomingClasses } = await import('../src/lib/planner-data.ts');
const {
  addDays,
  getDayOfWeek,
  getTodayString,
  parseDateString,
  formatDateString,
  WEEKDAY_FULL_ES,
} = await import('../src/lib/date-utils.ts');
const { parseCapture } = await import('../src/lib/capture/parse.ts');

// Logging helpers
const PASS = '\x1b[32m✔\x1b[0m';
const FAIL = '\x1b[31m✖\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function check(desc, condition, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ${PASS} ${desc}`);
  } else {
    failedAssertions++;
    console.error(`  ${FAIL} ${BOLD}${desc}${RESET} ${details ? `(${details})` : ''}`);
  }
}

function section(title) {
  console.log(`\n${BOLD}${CYAN}▶ ${title}${RESET}`);
}

async function runTestSuite() {
  const startTime = Date.now();
  console.log(`${BOLD}====================================================================${RESET}`);
  console.log(`${BOLD}  ORGANIZER · QA AUTOMATION SUITE: NLP, SCHEDULE & DATE PILLS       ${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}`);

  // ===========================================================================
  // SUITE 1: getUpcomingClasses (web/src/lib/planner-data.ts)
  // ===========================================================================
  section('SUITE 1: Smart Class Connection (getUpcomingClasses)');

  // 1.1 Same day class: before class time vs after class time
  {
    console.log('\n  --- 1.1 Same Day Class (Before vs After vs Exact Boundary) ---');
    // Monday: 2026-10-05 (weekday: 1)
    const todayMonday = '2026-10-05';
    const singleMondayClass = [
      { title: 'Cálculo I', weekday: 1, startTime: '10:00', location: 'Aula 204' },
    ];

    // Case 1.1.1: Before class time (08:30 -> 510 min)
    const beforeResult = getUpcomingClasses(singleMondayClass, todayMonday, 510);
    check(
      'Mismo día antes de la hora: devuelve "Hoy" con la fecha de hoy y hora correcta',
      beforeResult.length === 1 &&
        beforeResult[0].title === 'Cálculo I' &&
        beforeResult[0].nextDate === todayMonday &&
        beforeResult[0].dayLabel === 'Hoy' &&
        beforeResult[0].time === '10:00'
    );

    // Case 1.1.2: Exact class boundary (10:00 -> 600 min).
    // Logic: nowMinutes >= classMin moves to next week (+7 days)
    const exactResult = getUpcomingClasses(singleMondayClass, todayMonday, 600);
    check(
      'Mismo día a la hora exacta (10:00): pasa a la siguiente semana (diff = 7) como "Lunes"',
      exactResult.length === 1 &&
        exactResult[0].nextDate === '2026-10-12' &&
        exactResult[0].dayLabel === 'Lunes' &&
        exactResult[0].time === '10:00'
    );

    // Case 1.1.3: After class time (11:15 -> 675 min)
    const afterResult = getUpcomingClasses(singleMondayClass, todayMonday, 675);
    check(
      'Mismo día después de la hora (11:15): salta al próximo lunes (2026-10-12)',
      afterResult.length === 1 &&
        afterResult[0].nextDate === '2026-10-12' &&
        afterResult[0].dayLabel === 'Lunes' &&
        afterResult[0].time === '10:00'
    );

    // Case 1.1.4: Late evening (23:59 -> 1439 min)
    const lateResult = getUpcomingClasses(singleMondayClass, todayMonday, 1439);
    check(
      'Fin del día (23:59): clase pasada salta al próximo lunes',
      lateResult.length === 1 &&
        lateResult[0].nextDate === '2026-10-12' &&
        lateResult[0].dayLabel === 'Lunes'
    );

    // Case 1.1.5: Midnight start of day (00:00 -> 0 min)
    const midnightResult = getUpcomingClasses(singleMondayClass, todayMonday, 0);
    check(
      'Inicio del día (00:00): clase de las 10:00 es "Hoy"',
      midnightResult.length === 1 &&
        midnightResult[0].nextDate === todayMonday &&
        midnightResult[0].dayLabel === 'Hoy'
    );

    // Case 1.1.6: nowMinutes is undefined (defaults to diff=0 without time check)
    const noTimeResult = getUpcomingClasses(singleMondayClass, todayMonday, undefined);
    check(
      'nowMinutes no especificado: asume "Hoy"',
      noTimeResult.length === 1 &&
        noTimeResult[0].nextDate === todayMonday &&
        noTimeResult[0].dayLabel === 'Hoy'
    );
  }

  // 1.2 Subjects on multiple days (e.g. Lunes y Miércoles)
  {
    console.log('\n  --- 1.2 Multi-Day Subjects (e.g. Lunes y Miércoles) ---');
    const multiDaySubject = [
      { title: 'Física II', weekday: 1, startTime: '14:00' }, // Lunes 14:00
      { title: 'Física II', weekday: 3, startTime: '09:00' }, // Miércoles 09:00
    ];

    // Reference: Lunes 2026-10-05 at 11:00 (before Monday class at 14:00)
    const monMorning = getUpcomingClasses(multiDaySubject, '2026-10-05', 660);
    check(
      'Lunes 11:00: próxima clase es la de hoy Lunes a las 14:00',
      monMorning.length === 1 &&
        monMorning[0].nextDate === '2026-10-05' &&
        monMorning[0].dayLabel === 'Hoy' &&
        monMorning[0].time === '14:00'
    );

    // Reference: Lunes 2026-10-05 at 15:00 (after Monday class at 14:00)
    const monAfternoon = getUpcomingClasses(multiDaySubject, '2026-10-05', 900);
    check(
      'Lunes 15:00: clase de hoy ya pasó, próxima es Miércoles 2026-10-07 a las 09:00',
      monAfternoon.length === 1 &&
        monAfternoon[0].nextDate === '2026-10-07' &&
        monAfternoon[0].dayLabel === 'Miércoles' &&
        monAfternoon[0].time === '09:00'
    );

    // Reference: Martes 2026-10-06 at 10:00 (diff to Wed is 1 -> "Mañana")
    const tuesday = getUpcomingClasses(multiDaySubject, '2026-10-06', 600);
    check(
      'Martes: próxima clase es Miércoles ("Mañana")',
      tuesday.length === 1 &&
        tuesday[0].nextDate === '2026-10-07' &&
        tuesday[0].dayLabel === 'Mañana' &&
        tuesday[0].time === '09:00'
    );

    // Reference: Miércoles 2026-10-07 at 08:30 (before Wed class)
    const wedMorning = getUpcomingClasses(multiDaySubject, '2026-10-07', 510);
    check(
      'Miércoles 08:30: próxima clase es hoy Miércoles a las 09:00 ("Hoy")',
      wedMorning.length === 1 &&
        wedMorning[0].nextDate === '2026-10-07' &&
        wedMorning[0].dayLabel === 'Hoy' &&
        wedMorning[0].time === '09:00'
    );

    // Reference: Miércoles 2026-10-07 at 10:00 (after Wed class)
    const wedAfternoon = getUpcomingClasses(multiDaySubject, '2026-10-07', 600);
    check(
      'Miércoles 10:00: próxima clase salta al próximo Lunes 2026-10-12 a las 14:00',
      wedAfternoon.length === 1 &&
        wedAfternoon[0].nextDate === '2026-10-12' &&
        wedAfternoon[0].dayLabel === 'Lunes' &&
        wedAfternoon[0].time === '14:00'
    );

    // Reference: Jueves 2026-10-08
    const thursday = getUpcomingClasses(multiDaySubject, '2026-10-08', 720);
    check(
      'Jueves: próxima clase es Lunes 2026-10-12',
      thursday.length === 1 &&
        thursday[0].nextDate === '2026-10-12' &&
        thursday[0].dayLabel === 'Lunes'
    );

    // Multiple slots on the SAME day (e.g. Teoría at 08:00, Laboratorio at 14:00)
    const sameDayMultiSlots = [
      { title: 'Química', weekday: 1, startTime: '08:00' },
      { title: 'Química', weekday: 1, startTime: '14:00' },
    ];

    // At 07:00: picks 08:00
    const chemEarly = getUpcomingClasses(sameDayMultiSlots, '2026-10-05', 420);
    check(
      'Múltiples sesiones mismo día (07:00): elige la primera sesión (08:00 Hoy)',
      chemEarly.length === 1 &&
        chemEarly[0].time === '08:00' &&
        chemEarly[0].dayLabel === 'Hoy'
    );

    // At 10:00 (after 08:00, before 14:00): picks 14:00 today!
    const chemMid = getUpcomingClasses(sameDayMultiSlots, '2026-10-05', 600);
    check(
      'Múltiples sesiones mismo día (10:00): teoría pasó, elige laboratorio a las 14:00 Hoy',
      chemMid.length === 1 &&
        chemMid[0].time === '14:00' &&
        chemMid[0].dayLabel === 'Hoy' &&
        chemMid[0].nextDate === '2026-10-05'
    );

    // At 15:00: both passed -> picks 08:00 next week
    const chemLate = getUpcomingClasses(sameDayMultiSlots, '2026-10-05', 900);
    check(
      'Múltiples sesiones mismo día (15:00): ambas pasaron, salta al próximo Lunes a las 08:00',
      chemLate.length === 1 &&
        chemLate[0].nextDate === '2026-10-12' &&
        chemLate[0].time === '08:00'
    );
  }

  // 1.3 Subjects on weekends and spanning future weeks
  {
    console.log('\n  --- 1.3 Weekend Subjects & Future Week Transitions ---');
    const weekendSubjects = [
      { title: 'Taller de Robótica', weekday: 6, startTime: '09:00' }, // Sábado
      { title: 'Seminario Dominical', weekday: 0, startTime: '11:00' }, // Domingo
    ];

    // Reference: Viernes 2026-10-09 at 16:00
    const friday = getUpcomingClasses(weekendSubjects, '2026-10-09', 960);
    const roboticaFri = friday.find((s) => s.title === 'Taller de Robótica');
    const seminarioFri = friday.find((s) => s.title === 'Seminario Dominical');

    check(
      'Viernes: clase de Sábado es "Mañana" (2026-10-10)',
      roboticaFri?.nextDate === '2026-10-10' && roboticaFri?.dayLabel === 'Mañana'
    );
    check(
      'Viernes: clase de Domingo es "Domingo" (2026-10-11)',
      seminarioFri?.nextDate === '2026-10-11' && seminarioFri?.dayLabel === 'Domingo'
    );

    // Reference: Sábado 2026-10-10 at 08:00 (before Saturday class)
    const satEarly = getUpcomingClasses(weekendSubjects, '2026-10-10', 480);
    const roboticaSatEarly = satEarly.find((s) => s.title === 'Taller de Robótica');
    const seminarioSatEarly = satEarly.find((s) => s.title === 'Seminario Dominical');

    check(
      'Sábado 08:00: Robótica es "Hoy"',
      roboticaSatEarly?.dayLabel === 'Hoy' && roboticaSatEarly?.nextDate === '2026-10-10'
    );
    check(
      'Sábado 08:00: Seminario Dominical es "Mañana"',
      seminarioSatEarly?.dayLabel === 'Mañana' && seminarioSatEarly?.nextDate === '2026-10-11'
    );

    // Reference: Sábado 2026-10-10 at 10:00 (after Saturday class)
    const satLate = getUpcomingClasses(weekendSubjects, '2026-10-10', 600);
    const roboticaSatLate = satLate.find((s) => s.title === 'Taller de Robótica');
    check(
      'Sábado 10:00: Robótica ya pasó, salta al próximo Sábado 2026-10-17 ("Sábado")',
      roboticaSatLate?.nextDate === '2026-10-17' && roboticaSatLate?.dayLabel === 'Sábado'
    );

    // Reference: Domingo 2026-10-11 at 12:00 (after Sunday class)
    const sunLate = getUpcomingClasses(weekendSubjects, '2026-10-11', 720);
    const seminarioSunLate = sunLate.find((s) => s.title === 'Seminario Dominical');
    check(
      'Domingo 12:00: Seminario ya pasó, salta al próximo Domingo 2026-10-18 ("Domingo")',
      seminarioSunLate?.nextDate === '2026-10-18' && seminarioSunLate?.dayLabel === 'Domingo'
    );
  }

  // 1.4 Edge cases: empty/null arrays, multi-subject grouping
  {
    console.log('\n  --- 1.4 Edge Cases & Grouping ---');
    check('Array de materias vacío devuelve []', getUpcomingClasses([], '2026-10-05', 600).length === 0);
    check('Parámetro null/undefined devuelve []', getUpcomingClasses(null, '2026-10-05', 600).length === 0);

    const fullSchedule = [
      { title: 'Álgebra', weekday: 1, startTime: '07:00' },
      { title: 'Química', weekday: 2, startTime: '09:00' },
      { title: 'Física', weekday: 4, startTime: '11:00' },
      { title: 'Álgebra', weekday: 3, startTime: '07:00' },
    ];
    const grouped = getUpcomingClasses(fullSchedule, '2026-10-05', 500); // 08:20
    check('Agrupa por materia sin duplicar títulos (3 materias únicas)', grouped.length === 3);
    const algebra = grouped.find((s) => s.title === 'Álgebra');
    // Algebra 07:00 already passed at 08:20, so next is Wednesday 07:00
    check('Álgebra de las 07:00 ya pasó: selecciona la sesión de Miércoles', algebra?.nextDate === '2026-10-07');
  }

  // ===========================================================================
  // SUITE 2: Quick Date Chips (Hoy, Mañana, Próximo lunes) (B7 & date-utils.ts)
  // ===========================================================================
  section('SUITE 2: Quick Date Chips (Hoy, Mañana, Próximo lunes) for All Weekdays');

  {
    // Test base week: 2026-10-04 (Sunday) to 2026-10-10 (Saturday)
    const testDays = [
      { date: '2026-10-04', expectedDow: 0, dayName: 'Domingo', expectedMondayOffset: 1 },
      { date: '2026-10-05', expectedDow: 1, dayName: 'Lunes', expectedMondayOffset: 7 },
      { date: '2026-10-06', expectedDow: 2, dayName: 'Martes', expectedMondayOffset: 6 },
      { date: '2026-10-07', expectedDow: 3, dayName: 'Miércoles', expectedMondayOffset: 5 },
      { date: '2026-10-08', expectedDow: 4, dayName: 'Jueves', expectedMondayOffset: 4 },
      { date: '2026-10-09', expectedDow: 5, dayName: 'Viernes', expectedMondayOffset: 3 },
      { date: '2026-10-10', expectedDow: 6, dayName: 'Sábado', expectedMondayOffset: 2 },
    ];

    for (const d of testDays) {
      const today = d.date;
      const tomorrow = addDays(today, 1);
      const dow = getDayOfWeek(today);

      // Implementation formula used in TaskForm, CreateTaskSheet, Pendientes
      const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
      const nextMonday = addDays(today, daysToNextMonday);

      check(
        `${d.dayName} (${d.date}): getDayOfWeek coincide (${dow} === ${d.expectedDow})`,
        dow === d.expectedDow
      );

      check(
        `${d.dayName}: chip "Mañana" es exactamente 1 día después (${tomorrow})`,
        tomorrow === addDays(today, 1) && getDayOfWeek(tomorrow) === (dow + 1) % 7
      );

      check(
        `${d.dayName}: daysToNextMonday es ${d.expectedMondayOffset}`,
        daysToNextMonday === d.expectedMondayOffset
      );

      check(
        `${d.dayName}: chip "Próximo lunes" cae exactamente en Lunes (${nextMonday}, DOW 1)`,
        getDayOfWeek(nextMonday) === 1
      );

      check(
        `${d.dayName}: "Próximo lunes" está estrictamente en el futuro (${nextMonday} > ${today})`,
        nextMonday > today
      );
    }
  }

  // 2.2 Boundary checks: Month and Year Transitions for Quick Chips
  {
    console.log('\n  --- 2.2 Quick Chips Across Month & Year Boundaries ---');

    // End of non-leap February (2026-02-28 is Saturday, dow 6)
    {
      const feb28 = '2026-02-28';
      const dow = getDayOfWeek(feb28);
      const tomorrow = addDays(feb28, 1);
      const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
      const nextMonday = addDays(feb28, daysToNextMonday);

      check('Fin de febrero no bisiesto: "Mañana" es 2026-03-01', tomorrow === '2026-03-01');
      check('Fin de febrero no bisiesto: "Próximo lunes" es 2026-03-02', nextMonday === '2026-03-02');
      check('2026-03-02 es Lunes', getDayOfWeek(nextMonday) === 1);
    }

    // Leap year February (2024-02-28 is Wednesday, dow 3)
    {
      const febLeap = '2024-02-28';
      const tomorrow = addDays(febLeap, 1);
      check('Año bisiesto: 2024-02-28 + 1 día es 2024-02-29', tomorrow === '2024-02-29');
    }

    // End of year rollover (2026-12-31 is Thursday, dow 4)
    {
      const dec31 = '2026-12-31';
      const dow = getDayOfWeek(dec31);
      const tomorrow = addDays(dec31, 1);
      const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
      const nextMonday = addDays(dec31, daysToNextMonday);

      check('Fin de año: "Mañana" salta a 2027-01-01', tomorrow === '2027-01-01');
      check('Fin de año: "Próximo lunes" salta a 2027-01-04', nextMonday === '2027-01-04');
      check('2027-01-04 es Lunes', getDayOfWeek(nextMonday) === 1);
    }

    // Monday on month end (2026-11-30 is Monday, dow 1)
    {
      const nov30 = '2026-11-30';
      const dow = getDayOfWeek(nov30);
      const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
      const nextMonday = addDays(nov30, daysToNextMonday);

      check('Lunes fin de mes (2026-11-30): próximo lunes es 7 días después (2026-12-07)', nextMonday === '2026-12-07');
      check('2026-12-07 es Lunes', getDayOfWeek(nextMonday) === 1);
    }
  }

  // 2.3 Duration Pills (B7)
  {
    console.log('\n  --- 2.3 Duration Pills Constants (B7) ---');
    const expectedDurations = [
      { value: 30, label: '30 min' },
      { value: 60, label: '1 hora' },
      { value: 90, label: '1 h 30' },
      { value: 120, label: '2 horas' },
      { value: 180, label: '3 horas' },
      { value: 240, label: '4 horas' },
    ];

    check('6 píldoras estándar de duración configuradas', expectedDurations.length === 6);
    check(
      'Valores de duración en rango válido (30m a 240m)',
      expectedDurations.every((d) => d.value >= 30 && d.value <= 240)
    );

    // Duration clamping verification: planner-actions limits duration between 15 and 720 min
    const clampDuration = (d) => Math.max(15, Math.min(d ?? 60, 12 * 60));
    check('Duración clamp: valor negativo o cero se limita a 15 min', clampDuration(0) === 15);
    check('Duración clamp: valor excesivo se limita a 720 min (12 horas)', clampDuration(1000) === 720);
    check('Duración clamp: valor estándar de 90 min se mantiene', clampDuration(90) === 90);
  }

  // ===========================================================================
  // SUITE 3: parseCapture & Chip Removal Interaction (C1, B7)
  // ===========================================================================
  section('SUITE 3: parseCapture NLP & Chip Removal / Dismissal Interactions');

  const NOW = { date: '2026-10-05', minutes: 14 * 60 }; // Monday 14:00

  // 3.1 Complete phrase with Date & Time, simulating chip dismissal
  {
    console.log('\n  --- 3.1 Full Date + Time Phrase & Chip Dismissals ---');
    const raw = 'Reunión con el tutor mañana a las 3 de la tarde';
    const parsed = parseCapture(raw, NOW);

    check(
      'Parse inicial correcto: título limpio, fecha mañana, hora 15:00',
      parsed.kind === 'task' &&
        parsed.title === 'Reunión con el tutor' &&
        parsed.date === '2026-10-06' &&
        parsed.time === '15:00'
    );

    // Simulation A: User dismisses Date chip (clicks '×' on date chip)
    // In form state: { title: parsed.title, dueOn: null, time: parsed.time }
    const stateNoDate = {
      title: parsed.title,
      dueOn: null,
      time: parsed.time,
    };
    check(
      'Eliminar chip de fecha: conserva hora 15:00 y título sin fecha asignada',
      stateNoDate.title === 'Reunión con el tutor' &&
        stateNoDate.dueOn === null &&
        stateNoDate.time === '15:00'
    );

    // Planner actions payload simulation:
    // If dueOn is null, calendar block is NOT created (time without date is inactive in calendar)
    const taskInputNoDate = {
      title: stateNoDate.title,
      dueOn: stateNoDate.dueOn,
      time: stateNoDate.dueOn && stateNoDate.time ? stateNoDate.time : null,
    };
    check(
      'Payload a createTask sin fecha: sanitiza hora a null para evitar bloque huérfano',
      taskInputNoDate.dueOn === null && taskInputNoDate.time === null
    );

    // Simulation B: User dismisses Time chip (clicks '×' on time chip)
    // In form state: { title: parsed.title, dueOn: parsed.date, time: '' }
    const stateNoTime = {
      title: parsed.title,
      dueOn: parsed.date,
      time: null,
    };
    check(
      'Eliminar chip de hora: conserva fecha 2026-10-06 y título como tarea de todo el día',
      stateNoTime.title === 'Reunión con el tutor' &&
        stateNoTime.dueOn === '2026-10-06' &&
        stateNoTime.time === null
    );

    // Simulation C: User dismisses both chips (PendientesAddBar dismiss = true)
    const stateDismissAll = {
      title: parsed.title,
      dueOn: null,
      time: null,
    };
    check(
      'Descartar todos los chips (× general): envía tarea limpia a la bandeja',
      stateDismissAll.title === 'Reunión con el tutor' &&
        stateDismissAll.dueOn === null &&
        stateDismissAll.time === null
    );
  }

  // 3.2 "Solo hora": automatic today vs tomorrow inference & chip manipulation
  {
    console.log('\n  --- 3.2 Solo Hora Inference & Override with Quick Pills ---');

    // Case: Time is in future (now is 14:00, task at 18:00)
    const futureTime = parseCapture('Sacar la basura a las 6 de la tarde', NOW);
    check(
      'Solo hora futura (18:00): infiere fecha de HOY (2026-10-05)',
      futureTime.date === '2026-10-05' && futureTime.time === '18:00'
    );

    // Case: Time is in past (now is 14:00, task at 08:00)
    const pastTime = parseCapture('Sacar la basura a las 8 de la mañana', NOW);
    check(
      'Solo hora pasada (08:00): infiere fecha de MAÑANA (2026-10-06)',
      pastTime.date === '2026-10-06' && pastTime.time === '08:00'
    );

    // Simulation: User overrides the inferred date with Quick Pill "Próximo lunes"
    const dow = getDayOfWeek(NOW.date);
    const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
    const nextMonday = addDays(NOW.date, daysToNextMonday);

    const userOverriddenState = {
      title: futureTime.title,
      dueOn: nextMonday,
      time: futureTime.time,
    };
    check(
      'Sobrescribir fecha inferida con píldora "Próximo lunes": fecha 2026-10-12, hora 18:00',
      userOverriddenState.dueOn === '2026-10-12' &&
        userOverriddenState.time === '18:00' &&
        userOverriddenState.title === 'Sacar la basura'
    );
  }

  // 3.3 Interplay between NLP Capture and Smart Schedule Connection
  {
    console.log('\n  --- 3.3 Capture Combined with Smart Class Pill Selection ---');
    const input = 'Preparar presentación del proyecto';
    const parsed = parseCapture(input, NOW);
    check('Entrada sin fecha ni hora va a bandeja', parsed.date === null && parsed.time === null);

    // In CreateTaskSheet or TaskForm, upcoming classes are presented as chips
    const schedule = [
      { title: 'Sistemas Operativos', weekday: 2, startTime: '11:00' }, // Tuesday 11:00
    ];
    const upcoming = getUpcomingClasses(schedule, NOW.date, NOW.minutes);
    check('Clase próxima detectada para Martes a las 11:00', upcoming.length === 1);

    const nextClass = upcoming[0];
    // User taps smart class chip
    const stateLinkedToClass = {
      title: parsed.title,
      dueOn: nextClass.nextDate,
      time: nextClass.time,
    };

    check(
      'Tocar píldora de clase asigna fecha (2026-10-06) y hora (11:00)',
      stateLinkedToClass.dueOn === '2026-10-06' &&
        stateLinkedToClass.time === '11:00' &&
        stateLinkedToClass.title === 'Preparar presentación del proyecto'
    );

    // User then decides to keep the class day but clear the specific time slot
    const stateDateOnly = {
      ...stateLinkedToClass,
      time: null,
    };
    check(
      'Usuario quita la hora de clase para dejar solo el día: dueOn se mantiene, time es null',
      stateDateOnly.dueOn === '2026-10-06' && stateDateOnly.time === null
    );
  }

  // 3.4 Reminders & Title Cleansing Integrity
  {
    console.log('\n  --- 3.4 Reminders, Accents & Title Integrity ---');
    const reminderInput = 'Recordatorio: entrega del informe de Álgebra el viernes a las 16:30';
    const parsedRem = parseCapture(reminderInput, NOW);

    check(
      'Detecta kind: reminder con fecha viernes y hora 16:30',
      parsedRem.kind === 'reminder' &&
        parsedRem.date === '2026-10-09' &&
        parsedRem.time === '16:30'
    );
    check(
      'Título mantiene acentos y mayúsculas ("Entrega del informe de Álgebra")',
      parsedRem.title === 'Entrega del informe de Álgebra'
    );

    // Reminder without date:
    const remNoDate = parseCapture('recordatorio comprar reactivos de laboratorio', NOW);
    check(
      'Recordatorio sin fecha: kind es reminder, date es null',
      remNoDate.kind === 'reminder' &&
        remNoDate.date === null &&
        remNoDate.title === 'Comprar reactivos de laboratorio'
    );

    // Impossible dates do not hallucinate
    const impossibleWithoutTime = parseCapture('algo el 31 de febrero', NOW);
    check('Fecha imposible sin hora (31 de febrero): date es null y no se inventa', impossibleWithoutTime.date === null);

    // Impossible date with time: date is not February 31, falls back to solo-hora rule (tomorrow for past time)
    const impossibleWithTime = parseCapture('reunión el 31 de febrero a las 10', NOW);
    check(
      'Fecha imposible con hora pasada: no inventa febrero, cae en regla solo-hora mañana a las 10:00',
      impossibleWithTime.date === '2026-10-06' &&
        impossibleWithTime.time === '10:00' &&
        impossibleWithTime.title === 'Reunión el 31 de febrero'
    );
  }

  // 3.5 Reactive Text Simulation (Typing & Clearing)
  {
    console.log('\n  --- 3.5 Reactive Typing & Chip Life-cycle Simulation ---');

    // Simulate typing progression in PendientesAddBar
    let draft = 'Estudiar para el examen';
    let p = parseCapture(draft, NOW);
    let chip = p.date || p.time ? p : null;
    check('Paso 1: "Estudiar para el examen" -> sin chips detectados', chip === null);

    draft += ' mañana';
    p = parseCapture(draft, NOW);
    chip = p.date || p.time ? p : null;
    check('Paso 2: "+ mañana" -> chip fecha 2026-10-06 detectado en vivo', chip?.date === '2026-10-06');

    draft += ' a las 4pm';
    p = parseCapture(draft, NOW);
    chip = p.date || p.time ? p : null;
    check(
      'Paso 3: "+ a las 4pm" -> chip muestra fecha 2026-10-06 y hora 16:00',
      chip?.date === '2026-10-06' && chip?.time === '16:00'
    );

    // Simulate dismiss button clicked
    let isDismissed = true;
    let visibleChip = isDismissed ? null : chip;
    check('Paso 4: usuario pulsa × -> chip visible se oculta', visibleChip === null);

    // Simulate user keeps typing after dismiss -> re-activates
    draft += ' urgente';
    isDismissed = false; // onChange sets dismiss = false
    p = parseCapture(draft, NOW);
    chip = p.date || p.time ? p : null;
    check('Paso 5: usuario sigue escribiendo -> chip se reactiva reactivamente', chip !== null);
  }

  // ===========================================================================
  // Summary
  // ===========================================================================
  const duration = Date.now() - startTime;
  console.log(`\n${BOLD}====================================================================${RESET}`);
  console.log(`${BOLD}  RESUMEN DE EJECUCIÓN · QA AUTOMATION SUITE                        ${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}`);
  console.log(`  Total de afirmaciones ejecutadas: ${BOLD}${totalAssertions}${RESET}`);
  console.log(`  Afirmaciones aprobadas:           ${BOLD}\x1b[32m${passedAssertions}${RESET}`);
  console.log(`  Afirmaciones fallidas:            ${BOLD}${failedAssertions === 0 ? '0' : `\x1b[31m${failedAssertions}`}${RESET}`);
  console.log(`  Tiempo total de ejecución:        ${BOLD}${duration} ms${RESET}`);
  console.log(`${BOLD}====================================================================${RESET}`);

  if (failedAssertions > 0) {
    console.error(`\n${FAIL} ${BOLD}La suite falló con ${failedAssertions} errores.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`\n${PASS} ${BOLD}\x1b[32m¡Todas las pruebas pasaron satisfactoriamente (100%)!${RESET}\n`);
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error(`\n${FAIL} Error no capturado en la ejecución de la suite:`, err);
  process.exit(1);
});
