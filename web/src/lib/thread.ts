/* ============================================================================
   Organizer · El hilo de Inicio

   Inicio es el hilo de lo que la app te dijo hoy: cada aviso que llego al
   iPhone queda como burbuja, en orden, y lo tuyo (lo que anotaste, lo que
   cerraste) como respuesta. Este modulo decide QUE entra en el hilo, en que
   ORDEN, donde va un sello de hora y que burbuja lleva cola. No consulta
   nada y no pinta nada.

   Puro a proposito: lo usan el servidor (primer pintado) y el cliente (para
   mezclar lo que acaba de pasar en esta sesion), y se prueba con
   `node --test` sin base de datos (thread.test.ts).

   LO QUE NO HACE: inventar avisos. Una burbuja de aviso existe solo si
   `notification_log` dice que llego (status 'sent'). Si el resumen de la
   manana no se envio, el resumen sigue estando (es el dia) pero su sello
   dice "Hoy", sin hora: no finge haber llegado a las 7:00.
   ========================================================================= */

import { clockToMin, splitTaskMeta } from '../components/fd4/homeSchedule.ts';

/** Sello de hora cuando entre dos mensajes pasan mas de 15 min, como Mensajes. */
export const STAMP_GAP_MS = 15 * 60_000;

/** Avisos que no van como burbuja propia: o ya son el resumen, o no son del dia. */
const FOLDED_KINDS = new Set(['morning', 'weekly_review', 'test']);

export type MineMark = 'created' | 'done' | 'later';

export type ThreadItem =
  | { type: 'digest' }
  | { type: 'week' }
  | { type: 'ayer' }
  | { type: 'review' }
  | { type: 'notice'; title: string; body: string }
  | { type: 'mine'; mark: MineMark; text: string; receipt: string; taskId?: string };

export type ThreadEvent = {
  key: string;
  /** Instante en ms. `null`: el principio del dia (el resumen sin aviso enviado). */
  at: number | null;
  item: ThreadItem;
};

export type ThreadRow =
  | { kind: 'stamp'; key: string; day: boolean; clock: string }
  | { kind: 'event'; key: string; event: ThreadEvent; tail: boolean };

/** Lo que paso hoy, tal y como sale de la base de datos. */
export type DayLog = {
  /** `sent_at` del resumen de la manana, si llego. */
  morningAt: string | null;
  /** `sent_at` del aviso del ritual del domingo, si llego. */
  reviewAt: string | null;
  notices: { id: string; kind: string; at: string; title: string; body: string }[];
  /** Lo que se creo hoy (capturas, tareas, lo que trajo el Atajo). */
  created: { id: string; title: string; status: string; dueOn: string | null; at: string }[];
  /** Lo que se cerro hoy. */
  completed: { id: string; title: string; at: string }[];
};

/* --------------------------------------------------------------- textos -- */

export function doneKey(taskId: string): string {
  return `hecho:${taskId}`;
}

export function doneText(title: string): string {
  return `Hecho: ${title}`;
}

export function laterText(title: string): string {
  return `Después: ${title}`;
}

const SHORT_WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function dayNumber(dateStr: string): number {
  return Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10)) / 86_400_000;
}

/** Donde quedo lo que anotaste: el acuse bajo tu burbuja. */
export function placeReceipt(status: string, dueOn: string | null, todayStr: string): string {
  if (status === 'done') return 'Hecha';
  if (!dueOn || status === 'inbox' || status === 'someday') return 'En Pendientes';
  const diff = dayNumber(dueOn) - dayNumber(todayStr);
  if (diff === 0) return 'Para hoy';
  if (diff === 1) return 'Para mañana';
  if (diff < 0) return 'En Pendientes';
  const d = new Date(dueOn + 'T00:00:00Z');
  /* Dentro de esta semana basta el dia ("vie 9"); mas lejos, "vie 6" se
     confunde con un dia de esta semana, asi que va el mes. */
  if (diff <= 6) return `Para el ${SHORT_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
  return `Para el ${d.getUTCDate()} de ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

/** `A`, `A y B`, `A, B y C`; con mas, `A, B y otras`. Sin recuento: un
    numero de lo pendiente se lee como deuda (Overdue.tsx, decision 4). */
export function listTitles(titles: string[]): string {
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0];
  if (titles.length <= 3) return `${titles.slice(0, -1).join(', ')} y ${titles[titles.length - 1]}`;
  return `${titles.slice(0, 2).join(', ')} y otras`;
}

/**
 * La burbuja de lo de ayer, con la voz del aviso de la noche (compose.ts):
 * "quedo abierto", nunca "no cumpliste".
 */
export function ayerText(tasks: { title: string; dueOn: string }[], todayStr: string): string {
  if (tasks.length === 0) return '';
  const yesterday = dayNumber(todayStr) - 1;
  const allYesterday = tasks.every((t) => dayNumber(t.dueOn) === yesterday);
  const one = tasks.length === 1;
  const verb = one ? 'quedó abierto' : 'quedaron abiertos';
  const names = listTitles(tasks.map((t) => t.title));
  return allYesterday
    ? `Ayer ${verb}: ${names}.`
    : `${one ? 'Quedó abierto' : 'Quedaron abiertos'} de días anteriores: ${names}.`;
}

/** La linea bajo un reminder de "Se viene". `plan`: ofrecer Planificar. */
export function weekSub(r: { prep: string[]; done: number; nextWhen: string }): { text: string; plan: boolean } {
  const pending = r.prep.length;
  if (pending === 0) {
    return r.done > 0 ? { text: 'Todo preparado', plan: false } : { text: 'Sin preparación', plan: true };
  }
  const total = pending + r.done;
  const steps = `${r.done} de ${total} ${total === 1 ? 'paso' : 'pasos'}`;
  const next = `Siguiente: ${r.prep[0]}${r.nextWhen ? ` · ${r.nextWhen}` : ''}`;
  return { text: `${steps} · ${next}`, plan: false };
}

/** "15:00 – 16:30 · Proyecto IA" -> la hora arriba y el contexto abajo. */
export function nextLines(meta: string): { cap: string; ctx: string } {
  const parts = meta ? meta.split(' · ') : [];
  const first = parts[0] ?? '';
  const timed = !Number.isNaN(clockToMin(first));
  return { cap: timed ? first : '', ctx: (timed ? parts.slice(1) : parts).join(' · ') };
}

/**
 * El subtitulo de la capsula de arriba: la fecha y, si hay, la racha. "12
 * días" a secas parece una cuenta atras, asi que dice "seguidos"; para que
 * quepa en la capsula, con racha la fecha pierde el mes ("martes 6").
 */
export function capSubtitle(dateLabel: string, streakDays: number): string {
  if (streakDays <= 0) return dateLabel;
  const day = dateLabel.split(' de ')[0];
  return `${day} · ${streakDays} ${streakDays === 1 ? 'día seguido' : 'días seguidos'}`;
}

/** Mañana y los cinco dias siguientes: lo que ofrece "Otro día" (decision 56). */
export function laterDays(todayStr: string): { dateStr: string; label: string }[] {
  const base = dayNumber(todayStr);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date((base + i + 1) * 86_400_000);
    return {
      dateStr: d.toISOString().slice(0, 10),
      label: i === 0 ? 'Mañana' : `${SHORT_WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`,
    };
  });
}

/* ------------------------------------------------------------ el dia ----- */

export type DigestRow =
  | {
      kind: 'class';
      key: string;
      time: string;
      title: string;
      place: string;
      /** Ya termino: va en gris. */
      dim: boolean;
      /** En curso ahora mismo. */
      now: boolean;
    }
  | {
      kind: 'task';
      key: string;
      id: string;
      time: string;
      title: string;
      /** Contexto ("Proyecto IA"). */
      sub: string;
      /** El reminder que prepara ("Parcial de Calculo II · viernes 9"). */
      rem: string;
      done: boolean;
    };

/** Lo minimo del horario que necesita el dia: solo hoy, sin el resto. */
export type DigestDay = {
  isToday: boolean;
  slots: { id: string; title: string; location: string | null; hours: string }[];
};

export type DigestTask = { id: string; title: string; meta: string; rem?: string; done: boolean };

/**
 * El dia entero en una lista por hora: las clases de hoy (las que ya
 * terminaron, en gris) y las tareas (con hora primero, sin hora al final).
 * Las hechas se quedan en su sitio, marcadas: el dia es un registro.
 */
export function digestRows(tasks: DigestTask[], days: DigestDay[], nowMin: number): DigestRow[] {
  type Sorted = { sort: number; row: DigestRow };

  const today = days.find((d) => d.isToday);
  const classes: Sorted[] = [];
  for (const s of today?.slots ?? []) {
    const [startTxt, endTxt = ''] = s.hours.split('–').map((x) => x.trim());
    const start = clockToMin(startTxt);
    const end = clockToMin(endTxt);
    if (Number.isNaN(start)) continue;
    classes.push({
      sort: start,
      row: {
        kind: 'class',
        key: `clase:${s.id}`,
        time: startTxt,
        title: s.title,
        place: s.location ?? '',
        dim: !Number.isNaN(end) && end <= nowMin,
        now: start <= nowMin && (Number.isNaN(end) || nowMin < end),
      },
    });
  }

  const taskRows: Sorted[] = tasks.map((t) => {
    const m = splitTaskMeta(t.meta);
    return {
      sort: m.startMin,
      row: {
        kind: 'task',
        key: `tarea:${t.id}`,
        id: t.id,
        time: m.start,
        title: t.title,
        sub: m.ctx,
        rem: t.rem ?? '',
        done: t.done,
      },
    };
  });

  const timed = [...classes, ...taskRows.filter((r) => !Number.isNaN(r.sort))].sort((a, b) => a.sort - b.sort);
  const untimed = taskRows.filter((r) => Number.isNaN(r.sort));
  return [...timed, ...untimed].map((r) => r.row);
}

/* ------------------------------------------------------- los eventos ----- */

function ms(iso: string): number {
  return Date.parse(iso);
}

/**
 * Lo que paso hoy, como eventos del hilo. El resumen de la manana son tres
 * burbujas seguidas (el dia, lo que se viene, lo de ayer) con la hora del
 * aviso. El dia del ritual, "armar la semana" ocupa el sitio de lo de ayer:
 * su primer paso ya decide lo de ayer, y dos burbujas pidiendo decidir son
 * una de mas (la misma regla que tenia Inicio).
 */
export function dayEvents(
  log: DayLog,
  opts: { todayStr: string; hasAyer: boolean; reviewDue: boolean }
): ThreadEvent[] {
  const morning = log.morningAt ? ms(log.morningAt) : null;
  const events: ThreadEvent[] = [
    { key: 'dia', at: morning, item: { type: 'digest' } },
    { key: 'se-viene', at: morning, item: { type: 'week' } },
  ];

  if (opts.reviewDue) {
    events.push({ key: 'domingo', at: log.reviewAt ? ms(log.reviewAt) : morning, item: { type: 'review' } });
  } else if (opts.hasAyer) {
    events.push({ key: 'ayer', at: morning, item: { type: 'ayer' } });
  }

  for (const n of log.notices) {
    if (FOLDED_KINDS.has(n.kind)) continue;
    events.push({ key: `aviso:${n.id}`, at: ms(n.at), item: { type: 'notice', title: n.title, body: n.body } });
  }

  for (const c of log.created) {
    events.push({
      key: `nueva:${c.id}`,
      at: ms(c.at),
      item: {
        type: 'mine',
        mark: 'created',
        text: c.title,
        receipt: placeReceipt(c.status, c.dueOn, opts.todayStr),
        taskId: c.id,
      },
    });
  }

  for (const d of log.completed) {
    events.push({
      key: doneKey(d.id),
      at: ms(d.at),
      item: { type: 'mine', mark: 'done', text: doneText(d.title), receipt: '', taskId: d.id },
    });
  }

  return events;
}

/* --------------------------------------------------------- el orden ----- */

/** Un instante a "7:00" en la zona del usuario. Sin cero delante. */
export function clockIn(at: number, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(at));
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

function sideOf(item: ThreadItem): 'in' | 'out' {
  return item.type === 'mine' ? 'out' : 'in';
}

/**
 * Ordena por hora (lo que no tiene hora va primero; a igual hora manda el
 * orden de llegada), pone un sello al principio y en cada hueco de mas de
 * 15 minutos, y marca la cola en el ultimo globo de cada tanda.
 */
export function buildTimeline(events: ThreadEvent[], timeZone: string): ThreadRow[] {
  const sorted = events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const ta = a.event.at ?? Number.NEGATIVE_INFINITY;
      const tb = b.event.at ?? Number.NEGATIVE_INFINITY;
      if (ta !== tb) return ta < tb ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ event }) => event);

  const rows: ThreadRow[] = [];
  let prev: ThreadEvent | null = null;
  for (const event of sorted) {
    const first = prev === null;
    const gap =
      prev !== null && event.at !== null && (prev.at === null || event.at - prev.at > STAMP_GAP_MS);
    if (first || gap) {
      rows.push({
        kind: 'stamp',
        key: `sello:${event.key}`,
        day: first,
        clock: event.at === null ? '' : clockIn(event.at, timeZone),
      });
    }
    rows.push({ kind: 'event', key: event.key, event, tail: false });
    prev = event;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind !== 'event') continue;
    const next = rows[i + 1];
    row.tail =
      next === undefined || next.kind === 'stamp' || sideOf(next.event.item) !== sideOf(row.event.item);
  }

  return rows;
}
