/* ============================================================================
   Organizer · El texto de la notificacion

   ESTE ARCHIVO ES EL PRODUCTO. Todo lo demas —el cifrado, el cron, la tabla de
   suscripciones— existe para que estas lineas lleguen a una pantalla de
   bloqueo. El usuario no tiene un problema de captura, tiene un problema de
   relectura (`docs/00-problema.md`): si la notificacion llega vacia o recortada
   a la mitad, el proyecto entero no resuelve nada.

   LAS TRES REGLAS
   ---------------
   1. La notificacion LLEVA EL CONTENIDO DENTRO. Nunca "tienes 3 pendientes,
      abre la app". Si con leer la pantalla de bloqueo ya sabe su dia, funciono.
      Ese es el criterio, no que la notificacion llegue.
   2. Una diaria, no una por tarea (decision 33).
   3. EL TECHO REAL SON 38 Y 88 CARACTERES. Medido en FD sobre la notificacion
      PLEGADA de iOS —1 linea de titulo, 2 de cuerpo, ~44 caracteres por linea
      a 15px en una tarjeta de 334px— y escrito en `docs/estado-FD.md` §3.2.
      Pasarse NO DA ERROR: iOS recorta con puntos suspensivos, y lo que se
      pierde es justo el final. Por eso el texto se compone con presupuesto,
      y nada de lo que sale de aqui puede pasarse. `tests/compose.test.ts` lo
      comprueba en todos los casos.

   Los seis textos estan dibujados con su largo real en
   `app/comps/notificacion.html`. Las funciones de aqui reproducen esos textos
   exactamente cuando les llegan esos mismos datos, y la prueba lo fija.

   NI UN SIMBOLO DE ALARMA. Ni triangulo, ni rojo, ni "ojo". Es literal del
   comp: "la urgencia la da la frase, no un glifo". `Manana: Parcial de
   Calculo` ya se entiende y no regana a nadie. Ademas cada glifo cuesta dos
   de los 38 caracteres del titulo.

   Modulo puro: sin base de datos, sin red, sin reloj. Todo lo que necesita
   entra por parametro, que es lo que lo hace comprobable.
   ========================================================================= */

/** El techo de iOS con la notificacion plegada. Ver la cabecera. */
export const TITLE_MAX = 38;
export const BODY_MAX = 88;

export interface NotificationText {
  title: string;
  body: string;
}

/* ─────────────────────────────────────────────────── recorte de texto ── */

/**
 * Recorta a `max` caracteres cortando por la ultima palabra entera.
 *
 * Cortar a mitad de palabra ("Migrar el sche…") se lee como un error de la
 * app; cortar por palabra ("Migrar el…") se lee como una lista que sigue.
 * Solo se retrocede hasta la palabra anterior si eso no se come mas del 40%
 * del presupuesto — si no, mas vale un corte feo que una linea casi vacia.
 */
export function fitText(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  if (max <= 1) return '…';

  const hard = clean.slice(0, max - 1);
  const lastSpace = hard.lastIndexOf(' ');
  const cut = lastSpace >= Math.floor(max * 0.6) ? hard.slice(0, lastSpace) : hard;
  return cut.trimEnd() + '…';
}

/* ─────────────────────────────────────────────────── la lista del dia ── */

export interface DaySlot {
  /** Hora local ya formateada: `8:00`. `null` si la tarea no tiene hora. */
  time: string | null;
  title: string;
  /** Las materias (decision 52). Se agrupan antes de perder una tarea. */
  isClass: boolean;
}

const SEPARATOR = ' · ';

function renderSlot(slot: DaySlot): string {
  return slot.time ? slot.time + ' ' + slot.title : slot.title;
}

/**
 * Arma la lista del dia dentro del presupuesto que quede.
 *
 * El orden de sacrificios esta en `docs/estado-FD.md` §3.2, que lo dejaba
 * propuesto y sin cerrar. Se cierra aqui asi, y es facil de revertir porque
 * son dos pasos separados:
 *
 *   1. AGRUPAR LAS MATERIAS.  `8:00 Calculo · 11:00 Algebra` pasa a
 *      `2 clases`. Las clases ya las sabe: son fijas y estan en el horario.
 *      Lo que no sabe —y lo que decidio el domingo— son las tareas, asi que
 *      las clases se ceden primero.
 *   2. SOLTAR POR EL FINAL.  Si aun no cabe, caen las entradas mas tardias.
 *      A las 8:00, saber la hora de la sexta tarea no cambia nada.
 *
 * Lo que NO se hace nunca es cortar una frase por la mitad. Una lista que
 * termina en "20:00 Resu…" es exactamente la notificacion que el proyecto
 * existe para no mandar.
 */
export function renderDay(slots: DaySlot[], budget: number): string {
  if (slots.length === 0) return '';

  const joined = (list: DaySlot[]) => list.map(renderSlot).join(SEPARATOR);

  if (joined(slots).length <= budget) return joined(slots);

  /* Paso 1 · agrupar las materias en su primera posicion. */
  const classCount = slots.filter((slot) => slot.isClass).length;
  let working = slots;
  if (classCount >= 2) {
    const grouped: DaySlot[] = [];
    let placed = false;
    for (const slot of slots) {
      if (!slot.isClass) {
        grouped.push(slot);
        continue;
      }
      if (!placed) {
        grouped.push({ time: null, title: classCount + ' clases', isClass: true });
        placed = true;
      }
    }
    working = grouped;
    if (joined(working).length <= budget) return joined(working);
  }

  /* Paso 2 · soltar por el final. */
  for (let count = working.length - 1; count >= 1; count--) {
    const candidate = joined(working.slice(0, count));
    if (candidate.length <= budget) return candidate;
  }

  /* Ni una sola entrada cabe: un titulo larguisimo. Aqui si toca recortar,
     porque la alternativa es un cuerpo vacio. */
  return fitText(renderSlot(working[0]), budget);
}

/* ─────────────────────────────────────────────────────────── 1 · manana ── */

export interface LeadReminder {
  title: string;
  /** Ya en espanol: `Hoy`, `Manana`, `Viernes`. Lo calcula quien llama. */
  whenLabel: string;
}

export interface MorningInput {
  /** `jueves` — para el titulo cuando no hay reminder que lo ocupe. */
  weekdayLabel: string;
  dayNumber: number;
  slots: DaySlot[];
  /**
   * El reminder que manda hoy, o `null`.
   *
   * Decision 57: el reminder se lleva el titulo y las tareas se recortan para
   * que quepa, nunca al reves. Con 88 caracteres, un parcial manana es lo mas
   * importante del dia.
   *
   * Decision 61: si todas sus tareas estan hechas, NO encabeza. Estar
   * preparado es justamente la senal de que no hace falta avisar. Quien llama
   * ya aplico ese filtro; aqui llega `null`.
   */
  reminder: LeadReminder | null;
  /**
   * Tareas con fecha anterior a hoy que siguen abiertas. Van al FINAL del
   * cuerpo como un recuento: "nada se pierde en silencio" (regla 5), pero
   * sin quitarle sitio a lo de hoy.
   */
  overdue?: number;
}

/** ` · 2 atrasadas` · vacío si no hay ninguna. */
export function overdueSuffix(count: number | undefined): string {
  if (!count || count <= 0) return '';
  return SEPARATOR + count + (count === 1 ? ' atrasada' : ' atrasadas');
}

export function composeMorning(input: MorningInput): NotificationText {
  const suffix = overdueSuffix(input.overdue);

  if (input.reminder) {
    const prefix = input.reminder.whenLabel + ': ';
    const title = fitText(prefix + input.reminder.title, TITLE_MAX);

    /* `Hoy: ` delante, porque el titulo ya esta hablando de otro dia y sin la
       marca la lista se leeria como si fuera del dia del parcial. */
    const lead = 'Hoy: ';
    const day = renderDay(input.slots, BODY_MAX - lead.length - suffix.length);
    const body = day
      ? lead + day + suffix
      : suffix
        ? 'Hoy nada planificado' + suffix
        : 'Hoy no tienes nada planificado para eso.';
    return { title, body: fitText(body, BODY_MAX) };
  }

  const title = fitText(
    'Hoy, ' + input.weekdayLabel + ' ' + input.dayNumber,
    TITLE_MAX
  );
  const day = renderDay(input.slots, BODY_MAX - suffix.length);
  if (day) return { title, body: day + suffix };
  if (suffix) {
    const n = input.overdue ?? 0;
    return {
      title,
      body:
        'Nada planificado para hoy. ' +
        (n === 1 ? 'Queda 1 tarea atrasada.' : 'Quedan ' + n + ' tareas atrasadas.'),
    };
  }
  return { title, body: 'Hoy no tienes nada planificado.' };
}

/* ──────────────────────────────────────────────────────────── 2 · noche ── */

export interface EveningInput {
  /** Titulos de lo que quedo sin hacer. Vacio = cerro el dia completo. */
  open: string[];
}

/**
 * Pregunta, no senala. "Quedo abierto", nunca "no cumpliste" — y nada se
 * arrastra solo al dia siguiente: la respuesta la da el (decisiones 5 y 56).
 */
export function composeEvening(input: EveningInput): NotificationText {
  const title = 'Cierre del día';

  if (input.open.length === 0) {
    return { title, body: 'Cumpliste todo lo de hoy. No queda nada abierto.' };
  }

  const one = input.open.length === 1;
  const prefix = one ? 'Quedó abierto: ' : 'Quedaron abiertos: ';
  const question = one
    ? '. ¿Lo pasas a mañana o lo sueltas?'
    : '. ¿Los pasas a mañana o los sueltas?';

  const budget = BODY_MAX - prefix.length - question.length;
  const names = fitList(input.open, budget);
  return { title, body: fitText(prefix + names + question, BODY_MAX) };
}

/** `A, B y C`, soltando por el final hasta caber. Nunca corta una frase. */
function fitList(items: string[], budget: number): string {
  const render = (list: string[]) =>
    list.length === 1
      ? list[0]
      : list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];

  for (let count = items.length; count >= 1; count--) {
    const candidate = render(items.slice(0, count));
    if (candidate.length <= budget) return candidate;
  }
  return fitText(items[0], budget);
}

/* ────────────────────────────────────────────────────────── 3 · domingo ── */

export interface WeeklyReviewInput {
  /** Dia de la semana donde quedo algo sin cerrar: `viernes`. O `null`. */
  looseSince: string | null;
  /** Cuantas capturas siguen sin planificar. */
  unplanned: number;
}

/**
 * Dice cuanto dura. Con TDAH, lo que no tiene tamano no se empieza: "revision
 * semanal" sin numero se lee como una tarde entera.
 */
export function composeWeeklyReview(input: WeeklyReviewInput): NotificationText {
  const base = 'Unos 10 minutos para armar la semana.';

  let extra = '';
  if (input.looseSince) {
    extra = ' Quedó algo suelto del ' + input.looseSince + '.';
  } else if (input.unplanned === 1) {
    extra = ' Hay 1 cosa esperando sin planificar.';
  } else if (input.unplanned > 1) {
    extra = ' Hay ' + input.unplanned + ' cosas esperando sin planificar.';
  }

  const body = (base + extra).length <= BODY_MAX ? base + extra : base;
  return { title: 'Domingo', body };
}

/* ────────────────────────────────────────────── 4 · aviso de entrega ── */

export interface AdvanceNoticeInput {
  title: string;
  /** `Viernes`, `Mañana`, `Hoy`. */
  whenLabel: string;
  daysAway: number;
  /** Lo que ya tiene reservado en el calendario para eso, si tiene algo. */
  reserved: { hours: number; dayLabel: string; time: string } | null;
}

/**
 * La UNICA excepcion a "una notificacion al dia" (decision 33), y solo para
 * las tareas donde el usuario activo el aviso a mano (`items.advance_notice_days`).
 *
 * No dice que falta: dice que ya hay plan. Esa es la diferencia entre un aviso
 * util y una alarma.
 */
export function composeAdvanceNotice(input: AdvanceNoticeInput): NotificationText {
  const title = fitText(input.whenLabel + ': ' + input.title, TITLE_MAX);

  let when: string;
  if (input.daysAway <= 0) when = 'Es hoy.';
  else if (input.daysAway === 1) when = 'Falta 1 día.';
  else when = 'Faltan ' + input.daysAway + ' días.';

  const plan = input.reserved
    ? ' Tienes ' +
      formatReserved(input.reserved.hours) +
      ' ' +
      formatDayLabel(input.reserved.dayLabel) +
      ' a las ' +
      input.reserved.time +
      '.'
    : ' No tienes nada reservado todavía.';

  const body = (when + plan).length <= BODY_MAX ? when + plan : when;
  return { title, body };
}

/** `3 horas reservadas` · `1 hora reservada` · `1,5 horas reservadas`. */
function formatReserved(hours: number): string {
  const rounded = Math.round(hours * 2) / 2;
  if (rounded === 1) return '1 hora reservada';
  /* Coma decimal, que es como se escribe en espanol. */
  return String(rounded).replace('.', ',') + ' horas reservadas';
}

/** `el jueves`, pero `hoy` y `mañana` van sin articulo. */
function formatDayLabel(label: string): string {
  return label === 'hoy' || label === 'mañana' ? label : 'el ' + label;
}

/* ──────────────────────────────── 5 · lunes sin revision (decision 22) ── */

/**
 * Construido y probado, PERO NADIE LO LLAMA TODAVIA, a proposito.
 *
 * Decision 22: si se salta el domingo, la semana se arma sola con las clases
 * y lo que quedo, y se le avisa el lunes. La parte que ARMA la semana no es de
 * esta fase (la materializacion del horario es F2 y el ritual es F4). Mandar
 * este texto antes de que exista esa parte seria decirle que la semana esta
 * armada cuando no lo esta, y esa es la clase de mentira que hace que se deje
 * de creer a una notificacion.

 * Se deja escrito y con su prueba para que encenderlo sea una linea en
 * `dispatch.ts` el dia que la semana se arme de verdad.
 */
export function composeWeekArmed(): NotificationText {
  return {
    title: 'La semana ya está armada',
    body: 'Puse tus clases y lo que quedó pendiente. Ajústala cuando quieras.',
  };
}

/* ─────────────────────────────── 7 · reminder sin preparar (v2) ── */

export interface PrepAlertInput {
  title: string;
  daysAway: number;
}

/**
 * Un parcial o una entrega que se acerca y NO tiene ninguna tarea. Es la
 * distancia entre "lo sé" y "me estoy preparando" (docs/08). Sale 7, 3 y 1
 * días antes; si ya tiene tareas, no sale.
 */
export function composePrepAlert(input: PrepAlertInput): NotificationText {
  const when =
    input.daysAway <= 0 ? 'Hoy' : input.daysAway === 1 ? 'Mañana' : 'En ' + input.daysAway + ' días';
  return {
    title: fitText(when + ': ' + input.title, TITLE_MAX),
    body: 'Todavía no tiene ninguna tarea. Tócala y pártelo en 3 o 4 pasos con fecha.',
  };
}

/* ───────────────────────────────────── 8 · algo para leer (v2) ── */

export interface ResourceInput {
  title: string;
  notes: string | null;
  /** Días desde que se guardó. */
  savedDaysAgo: number;
}

/**
 * Un recurso guardado y nunca abierto. El problema que resuelve es el mismo
 * del proyecto entero: se guarda para después y después no llega nunca.
 */
export function composeResource(input: ResourceInput): NotificationText {
  const title = fitText('Para leer: ' + input.title, TITLE_MAX);
  const when =
    input.savedDaysAgo <= 0
      ? 'Lo guardaste hoy'
      : input.savedDaysAgo === 1
        ? 'Lo guardaste ayer'
        : 'Lo guardaste hace ' + input.savedDaysAgo + ' días';
  const note = input.notes?.trim();
  const body = note
    ? fitText(note, BODY_MAX - when.length - 2) + ' · ' + when
    : when + ' y no lo has abierto. Toca para leerlo ahora.';
  return { title, body: fitText(body, BODY_MAX) };
}

/* ─────────────────────────────── 9 · minutos antes de una hora (v2) ── */

export interface BeforeBlockInput {
  title: string;
  minutesLeft: number;
  /** `8:00 – 10:00` */
  range: string;
  location: string | null;
  isClass: boolean;
}

export function composeBeforeBlock(input: BeforeBlockInput): NotificationText {
  const lead =
    input.minutesLeft <= 1 ? 'Ya: ' : 'En ' + input.minutesLeft + ' min: ';
  const parts = [input.range, input.location?.trim()].filter(Boolean);
  const body = parts.join(SEPARATOR) || (input.isClass ? 'Clase' : 'Tarea');
  return { title: fitText(lead + input.title, TITLE_MAX), body: fitText(body, BODY_MAX) };
}

/* ──────────────────────────────────────────── 6 · la prueba inmediata ── */

/**
 * La que sale al suscribirse. Lleva dentro el dia de verdad, no un "funciona":
 * asi el primer contacto con el sistema ya es el producto, y si el dia esta
 * vacio se ve el formato igual.
 */
export function composeTest(today: NotificationText): NotificationText {
  return {
    title: 'Notificaciones activadas',
    body: fitText(today.body, BODY_MAX),
  };
}
