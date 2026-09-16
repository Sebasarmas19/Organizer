/* ============================================================================
   Organizer · El texto de la notificacion, contra el comp aprobado

   Dos cosas se comprueban aqui, y la segunda es la que de verdad protege el
   producto:

   1. QUE SALGAN LOS TEXTOS DEL COMP. `app/comps/notificacion.html` lleva los
      seis textos escritos con su largo real y validados por el usuario desde
      su iPhone (decision 45/46). Con los mismos datos, el compositor tiene que
      producir exactamente esos textos. Si alguien "mejora" una frase, esto
      falla y se entera antes de que llegue al telefono.

   2. QUE NADA SE PASE DE 38 Y 88. Ese es el techo de la notificacion plegada
      de iOS (`docs/estado-FD.md` §3.2). Pasarse no da error: iOS recorta, y lo
      que se pierde es el final. Asi que se prueba con datos hostiles —titulos
      larguisimos, dias de nueve bloques— y se exige el limite en todos.

       node --test "supabase/functions/dispatch-notifications/tests/*.test.ts"
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BODY_MAX,
  TITLE_MAX,
  composeAdvanceNotice,
  composeEvening,
  composeMorning,
  composeTest,
  composeWeekArmed,
  composeWeeklyReview,
  fitText,
  renderDay,
  type DaySlot,
} from '../compose.ts';

/** El dia del comp: dos clases y dos tareas, jueves 17. */
const COMP_DAY: DaySlot[] = [
  { time: '8:00', title: 'Cálculo', isClass: true },
  { time: '11:00', title: 'Álgebra', isClass: true },
  { time: '15:00', title: 'Migrar el schema', isClass: false },
  { time: '20:00', title: 'Resumen', isClass: false },
];

function within(text: { title: string; body: string }, label: string) {
  assert.ok(
    text.title.length <= TITLE_MAX,
    label + ': el titulo mide ' + text.title.length + ', el techo es ' + TITLE_MAX +
      ' — «' + text.title + '»'
  );
  assert.ok(
    text.body.length <= BODY_MAX,
    label + ': el cuerpo mide ' + text.body.length + ', el techo es ' + BODY_MAX +
      ' — «' + text.body + '»'
  );
}

/* ══════════════════════════════ los seis textos del comp, literales ══ */

test('1 · mañana · sale el texto del comp, con su largo del comp', () => {
  const text = composeMorning({
    weekdayLabel: 'jueves',
    dayNumber: 17,
    slots: COMP_DAY,
    reminder: null,
  });

  assert.equal(text.title, 'Hoy, jueves 17');
  assert.equal(
    text.body,
    '8:00 Cálculo · 11:00 Álgebra · 15:00 Migrar el schema · 20:00 Resumen'
  );
  /* Los numeros que el propio comp muestra al lado de cada texto. */
  assert.equal(text.title.length, 14);
  assert.equal(text.body.length, 69);
});

test('2 · con un reminder cerca · el reminder se lleva el titulo (decisión 57)', () => {
  const text = composeMorning({
    weekdayLabel: 'jueves',
    dayNumber: 17,
    slots: [
      { time: '8:00', title: 'Cálculo', isClass: true },
      { time: '15:00', title: 'Migrar el schema', isClass: false },
      { time: '20:00', title: 'Repaso final', isClass: false },
    ],
    reminder: { title: 'Parcial de Cálculo', whenLabel: 'Mañana' },
  });

  assert.equal(text.title, 'Mañana: Parcial de Cálculo');
  assert.equal(text.body, 'Hoy: 8:00 Cálculo · 15:00 Migrar el schema · 20:00 Repaso final');
  assert.equal(text.title.length, 26);
  assert.equal(text.body.length, 63);
});

test('2b · el título no lleva ningún símbolo de alarma', () => {
  const text = composeMorning({
    weekdayLabel: 'jueves',
    dayNumber: 17,
    slots: [],
    reminder: { title: 'Parcial de Cálculo', whenLabel: 'Mañana' },
  });
  /* Literal del comp: "no lleva ningun simbolo de alarma. Ni un triangulo, ni
     un rojo, ni un ojo. La urgencia la da la frase, no un glifo". */
  assert.doesNotMatch(text.title, /[⚠!❗🔴👀]/u);
});

test('3 · noche · pregunta, no señala', () => {
  const text = composeEvening({ open: ['Resumen de Cálculo'] });
  assert.equal(text.title, 'Cierre del día');
  assert.equal(text.body, 'Quedó abierto: Resumen de Cálculo. ¿Lo pasas a mañana o lo sueltas?');
  assert.equal(text.title.length, 14);
  assert.equal(text.body.length, 67);
  assert.doesNotMatch(text.body, /no cumpliste|fallaste|deberías/i);
});

test('4 · domingo · dice cuánto dura', () => {
  const text = composeWeeklyReview({ looseSince: 'viernes', unplanned: 3 });
  assert.equal(text.title, 'Domingo');
  assert.equal(text.body, 'Unos 10 minutos para armar la semana. Quedó algo suelto del viernes.');
  assert.equal(text.title.length, 7);
  assert.equal(text.body.length, 68);
  assert.match(text.body, /10 minutos/, 'sin número, se lee como una tarde entera');
});

test('5 · aviso de entrega · no dice que falta, dice que ya hay plan', () => {
  const text = composeAdvanceNotice({
    title: 'entrega del proyecto de IA',
    whenLabel: 'Viernes',
    daysAway: 2,
    reserved: { hours: 3, dayLabel: 'jueves', time: '15:00' },
  });
  assert.equal(text.title, 'Viernes: entrega del proyecto de IA');
  assert.equal(text.body, 'Faltan 2 días. Tienes 3 horas reservadas el jueves a las 15:00.');
  assert.equal(text.title.length, 35);
  assert.equal(text.body.length, 63);
});

test('6 · lunes sin revisión · el texto de la decisión 22, palabra por palabra', () => {
  const text = composeWeekArmed();
  assert.equal(text.title, 'La semana ya está armada');
  assert.equal(text.body, 'Puse tus clases y lo que quedó pendiente. Ajústala cuando quieras.');
  assert.equal(text.title.length, 24);
  assert.equal(text.body.length, 66);
});

/* ══════════════════════════════════ el presupuesto, con datos hostiles ══ */

test('un día de nueve bloques sigue cabiendo en 88', () => {
  const crowded: DaySlot[] = [
    { time: '7:00', title: 'Cálculo III', isClass: true },
    { time: '8:30', title: 'Álgebra Lineal', isClass: true },
    { time: '10:00', title: 'Física II', isClass: true },
    { time: '11:30', title: 'Programación', isClass: true },
    { time: '14:00', title: 'Migrar el schema a Supabase', isClass: false },
    { time: '16:00', title: 'Terminar el modelo de datos', isClass: false },
    { time: '18:00', title: 'Gym', isClass: false },
    { time: '20:00', title: 'Resumen de Cálculo', isClass: false },
    { time: '21:30', title: 'Leer el paper', isClass: false },
  ];
  const text = composeMorning({
    weekdayLabel: 'lunes',
    dayNumber: 15,
    slots: crowded,
    reminder: null,
  });
  within(text, 'día cargado');

  /* Paso 1 del recorte: las clases se agrupan ANTES de perder una tarea. */
  assert.match(text.body, /4 clases/);
  assert.match(text.body, /Migrar el schema/, 'lo que decidió no se cae primero');
  assert.doesNotMatch(text.body, /…$/, 'se sueltan entradas enteras, no se corta una frase');
});

test('con reminder y día cargado, el reminder manda y las tareas ceden', () => {
  const text = composeMorning({
    weekdayLabel: 'lunes',
    dayNumber: 15,
    slots: [
      { time: '8:00', title: 'Cálculo III', isClass: true },
      { time: '10:00', title: 'Álgebra Lineal', isClass: true },
      { time: '14:00', title: 'Migrar el schema a Supabase', isClass: false },
      { time: '17:00', title: 'Terminar el modelo de datos', isClass: false },
      { time: '20:00', title: 'Repaso final de Cálculo', isClass: false },
    ],
    reminder: { title: 'Parcial de Cálculo III', whenLabel: 'Mañana' },
  });
  within(text, 'reminder + día cargado');
  assert.equal(text.title, 'Mañana: Parcial de Cálculo III', 'el título no se recorta');
  assert.match(text.body, /^Hoy: /);
});

test('un título absurdamente largo se recorta por palabra, nunca a media palabra', () => {
  const text = composeAdvanceNotice({
    title: 'entrega del proyecto integrador de inteligencia artificial aplicada',
    whenLabel: 'Viernes',
    daysAway: 6,
    reserved: null,
  });
  within(text, 'título larguísimo');
  assert.ok(text.title.endsWith('…'));
  assert.doesNotMatch(text.title, /\s…$/, 'sin espacio colgando antes de los puntos');
});

test('un reminder con un título larguísimo no empuja el título fuera de 38', () => {
  const text = composeMorning({
    weekdayLabel: 'jueves',
    dayNumber: 17,
    slots: COMP_DAY,
    reminder: {
      title: 'Defensa del anteproyecto de trabajo de grado ante el jurado',
      whenLabel: 'Mañana',
    },
  });
  within(text, 'reminder larguísimo');
  assert.match(text.title, /^Mañana: /, 'el cuándo sobrevive al recorte');
});

test('muchas tareas abiertas por la noche siguen cabiendo', () => {
  const text = composeEvening({
    open: [
      'Resumen de Cálculo',
      'Terminar el modelo de datos',
      'Leer el paper de Anthropic',
      'Migrar el schema a Supabase',
    ],
  });
  within(text, 'noche cargada');
  assert.match(text.body, /¿Los pasas a mañana o los sueltas\?$/);
});

/* ══════════════════════════════════════════════════ los días vacíos ══ */

test('un día sin nada planificado no manda una notificación vacía', () => {
  const text = composeMorning({
    weekdayLabel: 'sábado',
    dayNumber: 19,
    slots: [],
    reminder: null,
  });
  assert.equal(text.title, 'Hoy, sábado 19');
  assert.equal(text.body, 'Hoy no tienes nada planificado.');
  within(text, 'día vacío');
});

test('cerrar el día completo se dice como un logro, no como un hueco', () => {
  const text = composeEvening({ open: [] });
  assert.equal(text.body, 'Cumpliste todo lo de hoy. No queda nada abierto.');
  within(text, 'día cerrado');
});

test('el domingo sin nada suelto no inventa un reproche', () => {
  const text = composeWeeklyReview({ looseSince: null, unplanned: 0 });
  assert.equal(text.body, 'Unos 10 minutos para armar la semana.');
  within(text, 'domingo limpio');
});

test('el domingo cuenta lo que espera sin planificar', () => {
  assert.match(
    composeWeeklyReview({ looseSince: null, unplanned: 1 }).body,
    /Hay 1 cosa esperando/
  );
  assert.match(
    composeWeeklyReview({ looseSince: null, unplanned: 7 }).body,
    /Hay 7 cosas esperando/
  );
});

/* ════════════════════════════════════════════════ el aviso de entrega ══ */

test('el aviso de entrega dice la verdad cuando no hay nada reservado', () => {
  const text = composeAdvanceNotice({
    title: 'entrega de Física',
    whenLabel: 'Jueves',
    daysAway: 1,
    reserved: null,
  });
  assert.equal(text.body, 'Falta 1 día. No tienes nada reservado todavía.');
  within(text, 'sin reserva');
});

test('las horas reservadas concuerdan en número y no dicen «el hoy»', () => {
  assert.equal(
    composeAdvanceNotice({
      title: 'entrega',
      whenLabel: 'Hoy',
      daysAway: 0,
      reserved: { hours: 1, dayLabel: 'hoy', time: '9:00' },
    }).body,
    'Es hoy. Tienes 1 hora reservada hoy a las 9:00.'
  );
  assert.equal(
    composeAdvanceNotice({
      title: 'entrega',
      whenLabel: 'Jueves',
      daysAway: 2,
      reserved: { hours: 1.5, dayLabel: 'miércoles', time: '9:00' },
    }).body,
    'Faltan 2 días. Tienes 1,5 horas reservadas el miércoles a las 9:00.'
  );
});

/* ═══════════════════════════════════ la notificación de prueba ══ */

test('la prueba inmediata lleva dentro el día de verdad', () => {
  const today = composeMorning({
    weekdayLabel: 'jueves',
    dayNumber: 17,
    slots: COMP_DAY,
    reminder: null,
  });
  const text = composeTest(today);
  assert.equal(text.title, 'Notificaciones activadas');
  assert.equal(text.body, today.body, 'el primer contacto ya es el producto');
  within(text, 'prueba');
});

/* ════════════════════════════════════════════════════ las primitivas ══ */

test('fitText corta por palabra y respeta el techo exacto', () => {
  assert.equal(fitText('Migrar el schema a Supabase', 100), 'Migrar el schema a Supabase');
  assert.equal(fitText('Migrar el schema a Supabase', 14), 'Migrar el…');
  assert.equal(fitText('Migrar el schema a Supabase', 27), 'Migrar el schema a Supabase');
  for (const max of [5, 8, 12, 20, 38, 88]) {
    assert.ok(fitText('Defensa del anteproyecto de trabajo de grado', max).length <= max);
  }
});

test('renderDay nunca devuelve más de lo que le cabe', () => {
  for (let count = 1; count <= 12; count++) {
    const slots: DaySlot[] = Array.from({ length: count }, (_, i) => ({
      time: 8 + i + ':00',
      title: 'Tarea número ' + (i + 1) + ' con nombre largo',
      isClass: i % 2 === 0,
    }));
    for (const budget of [20, 40, 88]) {
      assert.ok(
        renderDay(slots, budget).length <= budget,
        count + ' bloques en ' + budget + ' caracteres'
      );
    }
  }
});

test('renderDay respeta las tareas sin hora', () => {
  const text = renderDay(
    [
      { time: null, title: 'Comprar cuadernos', isClass: false },
      { time: '18:00', title: 'Gym', isClass: false },
    ],
    BODY_MAX
  );
  assert.equal(text, 'Comprar cuadernos · 18:00 Gym');
});
