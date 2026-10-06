/* ============================================================================
   Organizer · Huecos libres para el asistente de planificar

   La IA no calcula huecos: los recibe hechos de aquí. Así no puede proponer
   una hora que choca con una clase, porque esa hora no existe en su lista.

   Todo en minutos locales del día (0–1440) y fechas YYYY-MM-DD. Sin
   dependencias, para poder probarlo con `node --test`.
   ========================================================================= */

export type Busy = { date: string; from: number; to: number };
export type FreeSlot = { id: string; date: string; from: number; to: number };

export type SlotOptions = {
  today: string;
  nowMinutes: number;
  days: number;
  busy: Busy[];
  /** Desde cuándo y hasta cuándo se puede proponer algo cada día. */
  dayStart?: number;
  dayEnd?: number;
  /** Margen alrededor de lo ocupado: salir de clase no es estar libre. */
  buffer?: number;
  /** Hueco más corto que vale la pena proponer. */
  minMinutes?: number;
};

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const STEP = 15;
const ceilTo = (m: number) => Math.ceil(m / STEP) * STEP;
const floorTo = (m: number) => Math.floor(m / STEP) * STEP;

export function computeFreeSlots(opts: SlotOptions): FreeSlot[] {
  const {
    today,
    nowMinutes,
    days,
    busy,
    dayStart = 7 * 60,
    dayEnd = 22 * 60 + 30,
    buffer = 10,
    minMinutes = 30,
  } = opts;

  const slots: FreeSlot[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    /* Hoy empieza dentro de un rato, no ahora mismo. */
    const start = i === 0 ? Math.max(dayStart, ceilTo(nowMinutes + STEP)) : dayStart;
    if (start >= dayEnd) continue;

    const taken = busy
      .filter((b) => b.date === date && b.to > b.from)
      .map((b) => ({ from: b.from - buffer, to: b.to + buffer }))
      .sort((a, b) => a.from - b.from);

    let cursor = start;
    const push = (from: number, to: number) => {
      const f = ceilTo(from);
      const t = floorTo(to);
      if (t - f >= minMinutes) slots.push({ id: '', date, from: f, to: t });
    };
    for (const b of taken) {
      if (b.from > cursor) push(cursor, Math.min(b.from, dayEnd));
      cursor = Math.max(cursor, b.to);
      if (cursor >= dayEnd) break;
    }
    if (cursor < dayEnd) push(cursor, dayEnd);
  }
  return slots.map((s, i) => ({ ...s, id: `H${i + 1}` }));
}

/** ¿Cabe una sesión (fecha, inicio, duración) entera dentro de algún hueco? */
export function fitsInSlots(
  slots: FreeSlot[],
  date: string,
  from: number,
  minutes: number
): boolean {
  return slots.some((s) => s.date === date && from >= s.from && from + minutes <= s.to);
}

export function toClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function fromClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
