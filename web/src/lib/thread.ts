/* ============================================================================
   Organizer · Lo que cuenta Inicio

   Textos y orden de los widgets de Inicio: el dia por hora (clases y
   tareas), la linea de "Se viene", "Lo siguiente" y los dias de "Otro dia".
   No consulta nada y no pinta nada.

   Puro a proposito: se prueba con `node --test` sin base de datos
   (thread.test.ts). Antes tambien armaba el hilo de mensajes de Inicio, que
   se descarto en el rediseño (2026-10-06).
   ========================================================================= */

import { clockToMin, splitTaskMeta } from '../components/fd4/homeSchedule.ts';

const SHORT_WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function dayNumber(dateStr: string): number {
  return Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10)) / 86_400_000;
}

/** `A`, `A y B`, `A, B y C`; con mas, `A, B y otras`. Sin recuento: un
    numero de lo pendiente se lee como deuda (Overdue.tsx, decision 4). */
export function listTitles(titles: string[]): string {
  if (titles.length === 0) return '';
  if (titles.length === 1) return titles[0];
  if (titles.length <= 3) return `${titles.slice(0, -1).join(', ')} y ${titles[titles.length - 1]}`;
  return `${titles.slice(0, 2).join(', ')} y otras`;
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
