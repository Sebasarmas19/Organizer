/* ============================================================================
   Organizer · Formateo de fechas para Venezuela (America/Caracas, UTC-4)

   Convenciones del producto:
   - UI en espanol (decision 16)
   - Zona horaria America/Caracas sin horario de verano (decision 14)
   - Textos naturales ("hoy", "ayer", "en 6 dias") en vez de fechas largas
   ========================================================================= */

export const TIMEZONE = 'America/Caracas';

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD en America/Caracas
 */
export function getTodayDateString(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // 'YYYY-MM-DD'
}

/**
 * Formatea la antiguedad de creacion de una tarea para metadatos ("hace 2 h", "ayer")
 */
export function formatRelativeCreated(isoString: string): string {
  const created = new Date(isoString).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - created) / 1000));

  if (diffSec < 60) return 'hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} d`;

  return new Intl.DateTimeFormat('es-VE', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(new Date(isoString));
}

/**
 * Normaliza una hora '10:00:00' o '10:00' a '10:00'
 */
export function formatShortTime(timeString: string | null | undefined): string | null {
  if (!timeString) return null;
  const parts = timeString.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return timeString;
}

/**
 * Calcula la diferencia en dias entre hoy y una fecha YYYY-MM-DD en America/Caracas
 */
export function getDayDifference(targetDateYmd: string): number {
  const todayYmd = getTodayDateString();
  const today = new Date(`${todayYmd}T00:00:00`);
  const target = new Date(`${targetDateYmd}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

const DOW_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Formato para "Lo que viene" y listas de reminders:
 * "hoy · 23:59", "viernes 18 · 10:00", "miercoles 23 · en 6 dias", "martes 15"
 */
export function formatReminderWhen(occurs_on: string, occurs_at: string | null): string {
  const diffDays = getDayDifference(occurs_on);
  const time = formatShortTime(occurs_at);

  const [y, m, d] = occurs_on.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dow = DOW_NAMES[dateObj.getDay()];

  if (diffDays === 0) {
    return time ? `hoy · ${time}` : 'hoy';
  }
  if (diffDays === 1) {
    return time ? `manana · ${time}` : 'manana';
  }
  if (diffDays > 1 && diffDays <= 7) {
    return time ? `${dow} ${d} · ${time}` : `${dow} ${d} · en ${diffDays} dias`;
  }
  if (diffDays > 7) {
    return time ? `${dow} ${d} · ${time}` : `${dow} ${d}`;
  }
  if (diffDays === -1) {
    return 'ayer';
  }
  return `${dow} ${d}`;
}

/**
 * Formato para la cabecera completa del detalle del reminder:
 * "viernes 18 de septiembre · 10:00"
 */
export function formatReminderDetailDate(occurs_on: string, occurs_at: string | null): string {
  const [y, m, d] = occurs_on.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dow = DOW_NAMES[dateObj.getDay()];
  const monthName = MONTH_NAMES[m - 1];
  const time = formatShortTime(occurs_at);

  const base = `${dow} ${d} de ${monthName}`;
  return time ? `${base} · ${time}` : base;
}

/**
 * Formato de tiempo relativo para subtitulo del reminder:
 * "manana", "en 6 dias", "hoy", etc.
 */
export function formatRelativeDays(occurs_on: string): string {
  const diff = getDayDifference(occurs_on);
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'manana';
  if (diff > 1) return `en ${diff} dias`;
  if (diff === -1) return 'ayer';
  return `hace ${Math.abs(diff)} dias`;
}
