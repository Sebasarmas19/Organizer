/* ============================================================================
   Organizer · F4 · A que dia va "Esta semana"

   En el ritual, "Esta semana" es UN toque (el comp lo pide: si decidir
   toma dos pasos, no se hace). Dos formas faciles de hacerlo mal:

   - Todo al lunes: fabrica el lunes imposible (lo de la semana pasada mas
     tres clases), y el domingo siguiente vuelve a quedar todo.
   - Todo al dia mas libre: para un estudiante es siempre el sabado, y una
     tarea que ya se escapo una vez se va otros seis dias mas lejos.

   Asi que va al PRIMER DIA CON HUECO: el mas temprano que pese 2 o menos.
   Pronto, pero sin amontonar. Si ninguno tiene hueco, al mas libre. Y lo
   dice ("al martes 13 · tiene hueco") para que no parezca magia y se pueda
   deshacer.

   Peso de un dia:
     clase           1
     tarea           1
     parcial/entrega 2   (ese dia ya va cargado aunque no tenga nada mas)

   Lo que se reparte en este mismo ritual cuenta, para que la segunda tarea
   no caiga en el mismo hueco que la primera.

   Sin `@/`: se prueba con `node --test`.
   ========================================================================= */

export type DayLoad = {
  dateStr: string;
  classes: number;
  tasks: number;
  reminders: readonly string[];
  /** Ya paso: no se le puede poner nada. */
  past: boolean;
};

export const REMINDER_WEIGHT = 2;
/** Un dia que pesa esto o menos todavia tiene hueco para una tarea mas. */
export const ROOMY_WEIGHT = 2;

export type Suggestion = {
  dateStr: string;
  /** "room": el primero con hueco · "lightest": ninguno tenia, el mas libre. */
  reason: 'room' | 'lightest';
};

export function dayWeight(day: DayLoad, added = 0): number {
  return day.classes + day.tasks + added + REMINDER_WEIGHT * day.reminders.length;
}

/**
 * @param days  los siete dias de la semana que se arma, en orden.
 * @param added tareas que este ritual ya puso en cada dia (`dateStr` -> n).
 * @returns a donde va "Esta semana", o `null` si no queda ningun dia.
 */
export function suggestDay(
  days: readonly DayLoad[],
  added: ReadonlyMap<string, number> = new Map()
): Suggestion | null {
  let lightest: { dateStr: string; weight: number } | null = null;
  for (const day of days) {
    if (day.past) continue;
    const weight = dayWeight(day, added.get(day.dateStr) ?? 0);
    if (weight <= ROOMY_WEIGHT) return { dateStr: day.dateStr, reason: 'room' };
    if (lightest === null || weight < lightest.weight) lightest = { dateStr: day.dateStr, weight };
  }
  return lightest ? { dateStr: lightest.dateStr, reason: 'lightest' } : null;
}
