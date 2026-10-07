/* ============================================================================
   Organizer · La racha con perdon (decision 8)

   Dias seguidos cerrando al menos una tarea. Con TDAH, una racha estricta
   se rompe el primer dia malo y con ella se rompe el habito entero: "ya la
   perdi, da igual". Por eso cada mes trae DOS COMODINES: un dia sin cerrar
   nada gasta uno y la racha sigue viva. El tercer dia vacio del mes, si.

   Reglas, en el orden en que se aplican al recorrer hacia atras desde hoy:

   1. Hoy no ha terminado. Si todavia no se cerro nada, no cuenta en contra:
      se empieza a contar por ayer. Cortarla a las 9 de la manana seria
      castigar por no haber empezado.
   2. Un dia con algo cerrado suma uno.
   3. Un dia vacio gasta un comodin de SU mes, si quedan. No suma: el
      comodin sostiene la racha, no la infla.
   4. Un comodin solo se gasta de verdad si detras hay otro dia cerrado. Los
      dias vacios del final del recorrido (antes de que la racha empezara)
      no se cobran: no sostenian nada.

   Sin estado en la base: se calcula entero con el historial de 90 dias que
   Inicio ya pide. Asi no hay un contador que se desincronice ni un cron que
   lo mantenga.
   ========================================================================= */

import { shiftDate } from './push/server/schedule.ts';

export const GRACE_PER_MONTH = 2;
/** Lo mismo que pide Inicio de historial. Mas alla, la racha se da por buena. */
export const STREAK_WINDOW_DAYS = 90;

export type Streak = {
  /** Dias cerrando algo. Los sostenidos por un comodin no suman. */
  days: number;
  /** Comodines que quedan este mes (el de `today`). */
  graceLeft: number;
};

const monthOf = (date: string) => date.slice(0, 7);

/**
 * @param doneDays fechas locales `YYYY-MM-DD` en que se cerro al menos una tarea.
 * @param today    fecha local de hoy.
 */
export function computeStreak(
  doneDays: Iterable<string>,
  today: string,
  gracePerMonth = GRACE_PER_MONTH
): Streak {
  const done = new Set(doneDays);
  /* Comodines ya cobrados, por mes. */
  const spent = new Map<string, number>();
  /* Dias vacios a la espera de saber si sostienen algo (regla 4). */
  let pending: string[] = [];
  let days = 0;

  let cursor = done.has(today) ? today : shiftDate(today, -1);
  for (let i = 0; i < STREAK_WINDOW_DAYS; i++, cursor = shiftDate(cursor, -1)) {
    if (done.has(cursor)) {
      for (const gap of pending) spent.set(monthOf(gap), (spent.get(monthOf(gap)) ?? 0) + 1);
      pending = [];
      days += 1;
      continue;
    }

    const month = monthOf(cursor);
    const waiting = pending.filter((gap) => monthOf(gap) === month).length;
    if ((spent.get(month) ?? 0) + waiting >= gracePerMonth) break;
    pending.push(cursor);
  }

  return {
    days,
    graceLeft: Math.max(0, gracePerMonth - (spent.get(monthOf(today)) ?? 0)),
  };
}
