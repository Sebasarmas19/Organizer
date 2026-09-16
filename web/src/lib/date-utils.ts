/* ============================================================================
   Organizer · Utilidades de fecha y hora para el calendario (F2)

   Zona horaria del usuario: por defecto 'America/Caracas' (UTC-4, sin DST).
   La semana empieza en LUNES (1) y termina en DOMINGO (0 en DB, 7 en UI).
   Todas las cadenas visibles en espanol con formato determinista.
   ========================================================================= */

export const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const MONTH_NAMES_CAP_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const WEEKDAY_SHORT_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const WEEKDAY_FULL_ES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

/** Formatea una fecha YYYY-MM-DD a objeto numérico seguro. */
export function parseDateString(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** Convierte { year, month, day } a cadena YYYY-MM-DD. */
export function formatDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Obtiene la fecha actual 'YYYY-MM-DD' en la zona horaria especificada.
 * Si no se pasa zona o falla, usa 'America/Caracas'.
 */
export function getTodayString(timezone = 'America/Caracas'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  }
}

/**
 * Devuelve la hora actual en minutos desde la medianoche en la zona horaria (ej. 15:42 -> 15*60 + 42 = 942).
 */
export function getCurrentTimeMinutes(timezone = 'America/Caracas'): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

/** Devuelve el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado). */
export function getDayOfWeek(dateStr: string): number {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return date.getUTCDay();
}

/** Añade o resta N días a una fecha YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return formatDateString(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * Devuelve el lunes de la semana que contiene a dateStr.
 * Si dateStr es domingo (weekday 0), el lunes fue hace 6 días.
 */
export function getMondayOfWeek(dateStr: string): string {
  const dow = getDayOfWeek(dateStr);
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(dateStr, diff);
}

/** Devuelve los 7 días (YYYY-MM-DD) de lunes a domingo. */
export function getDaysOfWeek(dateStr: string): string[] {
  const monday = getMondayOfWeek(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Formato para la vista Día: "jueves 17 de septiembre"
 */
export function formatDayTitle(dateStr: string): string {
  const { day, month } = parseDateString(dateStr);
  const dow = getDayOfWeek(dateStr);
  const weekdayName = WEEKDAY_FULL_ES[dow];
  const monthName = MONTH_NAMES_ES[month - 1];
  return `${weekdayName} ${day} de ${monthName}`;
}

/**
 * Formato para la vista Semana: "14 – 20 de septiembre" (o "28 de sep – 4 de oct" si cruza mes)
 */
export function formatWeekTitle(mondayStr: string): string {
  const sundayStr = addDays(mondayStr, 6);
  const m = parseDateString(mondayStr);
  const s = parseDateString(sundayStr);

  if (m.month === s.month) {
    return `${m.day} – ${s.day} de ${MONTH_NAMES_ES[m.month - 1]}`;
  }
  return `${m.day} de ${MONTH_NAMES_ES[m.month - 1].slice(0, 3)} – ${s.day} de ${MONTH_NAMES_ES[s.month - 1].slice(0, 3)}`;
}

/**
 * Formato para la vista Mes: "Septiembre" o "Septiembre de 2026"
 */
export function formatMonthTitle(year: number, month: number): string {
  return MONTH_NAMES_CAP_ES[month - 1];
}

/** Días en un mes dado. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type MonthGridCell = {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  weekday: number;
};

/**
 * Construye la rejilla de días de un mes (lunes a domingo).
 * Rellena días previos del mes anterior y días posteriores para filas completas de 7.
 */
export function getMonthGrid(year: number, month: number, todayStr: string): MonthGridCell[] {
  const daysInCurMonth = getDaysInMonth(year, month);
  const firstDayStr = formatDateString(year, month, 1);
  const firstDow = getDayOfWeek(firstDayStr); // 0=dom, 1=lun, ..., 6=sab

  // Cuántos días del mes anterior preceden al lunes
  // Si firstDow == 1 (lunes), lead = 0
  // Si firstDow == 2 (martes), lead = 1
  // Si firstDow == 0 (domingo), lead = 6
  const lead = firstDow === 0 ? 6 : firstDow - 1;

  const cells: MonthGridCell[] = [];

  // Días previos
  for (let i = lead; i > 0; i--) {
    const dStr = addDays(firstDayStr, -i);
    const { day } = parseDateString(dStr);
    cells.push({
      dateStr: dStr,
      dayNum: day,
      isCurrentMonth: false,
      isPast: dStr < todayStr,
      isToday: dStr === todayStr,
      weekday: getDayOfWeek(dStr),
    });
  }

  // Días del mes actual
  for (let d = 1; d <= daysInCurMonth; d++) {
    const dStr = formatDateString(year, month, d);
    cells.push({
      dateStr: dStr,
      dayNum: d,
      isCurrentMonth: true,
      isPast: dStr < todayStr,
      isToday: dStr === todayStr,
      weekday: getDayOfWeek(dStr),
    });
  }

  // Días siguientes hasta completar múltiplo de 7
  const lastDayStr = formatDateString(year, month, daysInCurMonth);
  let tailIndex = 1;
  while (cells.length % 7 !== 0) {
    const dStr = addDays(lastDayStr, tailIndex);
    const { day } = parseDateString(dStr);
    cells.push({
      dateStr: dStr,
      dayNum: day,
      isCurrentMonth: false,
      isPast: dStr < todayStr,
      isToday: dStr === todayStr,
      weekday: getDayOfWeek(dStr),
    });
    tailIndex++;
  }

  return cells;
}

/**
 * Convierte hora "HH:MM" o "HH:MM:SS" a minutos desde 00:00.
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calcula top (px) y height (px) en el riel de horas de 7:00 a 22:00.
 * Cada hora mide 56px (`--hour: 56px`).
 */
export function calculateBlockPosition(
  startTimeStr: string,
  endTimeStr: string,
  hourHeight = 56,
  startHour = 7
): { top: number; height: number } {
  const startMin = timeStringToMinutes(startTimeStr);
  const endMin = timeStringToMinutes(endTimeStr);

  const baseMin = startHour * 60;
  const top = Math.max(0, ((startMin - baseMin) / 60) * hourHeight);
  const durationHours = Math.max(0.5, (endMin - startMin) / 60);
  const height = durationHours * hourHeight;

  return { top, height };
}

/**
 * Formatea minutos a formato legible "H:MM" o "H:MM – H:MM"
 */
export function formatTimeRange(startTimeStr: string, endTimeStr: string): string {
  const clean = (t: string) => {
    const [h, m] = t.split(':');
    return `${parseInt(h, 10)}:${m}`;
  };
  return `${clean(startTimeStr)} – ${clean(endTimeStr)}`;
}
