/* ============================================================================
   Organizer · FD5 · Inicio · las clases dentro de "Resto de hoy"

   Solo presentacion. Toma lo que `getClassesView` ya devuelve (el horario
   por dia, con "11:00 – 12:50" como texto) y la hora de ahora, y decide que
   clases de HOY quedan por delante y que frase va cuando no queda ninguna.
   No consulta nada: si un dato no esta en `Fd4ClassesData`, no se pinta.
   ========================================================================= */

import type { Fd4ClassesData } from '@/lib/fd4-calendar';

export type RestClass = {
  id: string;
  title: string;
  location: string | null;
  /** "11:00" */
  start: string;
  startMin: number;
  /** Ahora mismo en clase. */
  now: boolean;
};

export type ClassNote = {
  /** "Sin clases hoy" o "Sin más clases hoy". */
  line: string;
  /** "Mañana empieza con Electricidad · 11:00". Vacio si no hay horario. */
  next: string;
} | null;

/** "11:00" o "9:05" -> minutos desde medianoche. NaN si no es una hora. */
export function clockToMin(clock: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(clock.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

/** Minutos -> "10:40". Sin cero delante, como el resto de la app. */
export function minToClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function restOfTodayClasses(
  data: Fd4ClassesData,
  todayDow: number,
  nowMin: number
): { classes: RestClass[]; note: ClassNote } {
  if (data.days.length === 0) return { classes: [], note: null };

  const today = data.days.find((d) => d.isToday);
  const classes: RestClass[] = (today?.slots ?? [])
    .map((s) => {
      const [startTxt, endTxt = ''] = s.hours.split('–').map((x) => x.trim());
      const startMin = clockToMin(startTxt);
      const endMin = clockToMin(endTxt);
      return {
        id: s.id,
        title: s.title,
        location: s.location,
        start: startTxt,
        startMin,
        endMin,
      };
    })
    .filter((c) => !Number.isNaN(c.startMin) && (Number.isNaN(c.endMin) || c.endMin > nowMin))
    .map(({ endMin, ...c }) => ({ ...c, now: c.startMin <= nowMin && nowMin < endMin }));

  if (classes.length > 0) return { classes, note: null };

  /* El proximo dia con clase, empezando por manana. */
  let nextLine = '';
  for (let i = 1; i <= 7; i++) {
    const dow = (todayDow + i) % 7;
    const day = data.days.find((d) => d.weekday === dow);
    if (!day || day.slots.length === 0) continue;
    const first = day.slots[0];
    const start = first.hours.split('–')[0].trim();
    const who = i === 1 ? 'Mañana' : `El ${day.label.toLowerCase()}`;
    nextLine = `${who} empieza con ${first.title} · ${start}`;
    break;
  }

  return {
    classes,
    note: {
      line: today ? 'Sin más clases hoy' : 'Sin clases hoy',
      next: nextLine,
    },
  };
}

/** "viernes 9 · 10:00" -> "vie 9". Para la columna de fecha de "Se viene". */
export function shortWhen(when: string): string {
  const [date] = when.split(' · ');
  const [weekday, ...rest] = date.split(' ');
  if (!weekday || rest.length === 0) return date;
  return `${weekday.slice(0, 3)} ${rest.join(' ')}`;
}

/** "15:00 – 17:00 · Proyecto IA" -> { start: "15:00", ctx: "Proyecto IA" }. */
export function splitTaskMeta(meta: string): { start: string; startMin: number; ctx: string } {
  const parts = meta ? meta.split(' · ') : [];
  const first = parts[0] ?? '';
  const startMin = clockToMin(first);
  if (Number.isNaN(startMin)) return { start: '', startMin: NaN, ctx: parts.join(' · ') };
  return { start: first.split('–')[0].trim(), startMin, ctx: parts.slice(1).join(' · ') };
}
