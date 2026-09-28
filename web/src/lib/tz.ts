/**
 * Organizer · Hora local ↔ UTC con la zona IANA del perfil.
 *
 * Sustituye al `-04:00` escrito a mano: la conversión sale de `Intl`, así que
 * sigue siendo correcta si `profiles.timezone` cambia a una zona con horario
 * de verano. La aritmética vive en `push/server/schedule.ts`, que ya tiene
 * pruebas; aquí solo se envuelve para la app.
 */

import { localDayRangeUtc, timeZoneOffsetMinutes } from './push/server/schedule.ts';

/** `2026-09-15` + `08:30` en la zona dada → ISO UTC. */
export function zonedIso(dateStr: string, time: string, timeZone: string): string {
  const [h = '0', m = '0'] = time.split(':');
  const naive = Date.parse(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00Z`);
  const firstGuess = naive - timeZoneOffsetMinutes(new Date(naive), timeZone) * 60000;
  const offset = timeZoneOffsetMinutes(new Date(firstGuess), timeZone);
  return new Date(naive - offset * 60000).toISOString();
}

/** Inicio (incluido) y fin (excluido) del día local, en UTC. */
export function dayRangeUtc(dateStr: string, timeZone: string): { start: string; end: string } {
  return localDayRangeUtc(dateStr, timeZone);
}

/** `10:00:00` (columna `time`) → `10:00`. Sin cero delante: `8:00`. */
export function formatTimeOfDay(time: string | null | undefined): string {
  if (!time) return '';
  const [h, m = '00'] = time.split(':');
  return `${Number(h)}:${m.slice(0, 2)}`;
}

/** `10:30:00` → 630. */
export function timeToMinutes(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** 630 → `10:30`, siempre con dos cifras (valor de `<input type=time>`). */
export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

/** Hora local `HH:MM` de un `timestamptz`. */
export function localTimeOf(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h === '24' ? '00' : h}:${m}`;
}

/** Fecha local `YYYY-MM-DD` de un `timestamptz`. */
export function localDateOf(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
