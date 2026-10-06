/* ============================================================================
   Organizer · Lo que dictas a Siri, convertido en tarea o reminder

   "entregar informe el viernes a las 3"      → tarea, viernes, 15:00
   "recordatorio parcial de cálculo el 15"    → reminder, día 15
   "comprar pan"                              → tarea sin fecha (bandeja)

   Código puro: sin red, sin base de datos, sin reloj propio. La fecha y la
   hora de "ahora" entran como parámetro, así las pruebas son deterministas.

   Truco de índices: se busca sobre una copia en minúsculas y sin tildes que
   tiene EXACTAMENTE la misma longitud que el original (cada letra con tilde
   se cambia por una sola letra). Así, lo que se encuentra en la copia se
   puede recortar del original y el título conserva sus tildes.
   ========================================================================= */

export interface CaptureNow {
  /** Fecha local de hoy, `YYYY-MM-DD`. */
  date: string;
  /** Minutos desde medianoche, hora local. */
  minutes: number;
}

export interface ParsedCapture {
  kind: 'task' | 'reminder';
  title: string;
  /** `YYYY-MM-DD` o null. */
  date: string | null;
  /** `HH:MM` o null. */
  time: string | null;
}

const ACCENTS: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
  à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
};

function fold(text: string): string {
  return text.toLowerCase().replace(/[áéíóúüñàèìòù]/g, (c) => ACCENTS[c] ?? c);
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  quince: 15, veinte: 20, treinta: 30,
};
const NUM = '(\\d{1,2}|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)';

function toNumber(token: string): number {
  return /^\d+$/.test(token) ? Number(token) : NUMBER_WORDS[token] ?? NaN;
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6,
};

const MONTHS: Record<string, number> = {
  enero: 1, ene: 1, febrero: 2, feb: 2, marzo: 3, mar: 3, abril: 4, abr: 4,
  mayo: 5, may: 5, junio: 6, jun: 6, julio: 7, jul: 7, agosto: 8, ago: 8,
  septiembre: 9, setiembre: 9, sep: 9, sept: 9, octubre: 10, oct: 10,
  noviembre: 11, nov: 11, diciembre: 12, dic: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

/* ---------------------------------------------------------- fechas ---- */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekday(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCDay();
}

function validDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  const check = new Date(iso + 'T00:00:00Z');
  return check.getUTCMonth() + 1 === m && check.getUTCDate() === d ? iso : null;
}

/** Día y mes sin año: este año, o el que viene si ya pasó. */
function nextDayMonth(today: string, m: number, d: number): string | null {
  const year = Number(today.slice(0, 4));
  const thisYear = validDate(year, m, d);
  if (thisYear && thisYear >= today) return thisYear;
  return validDate(year + 1, m, d);
}

/** Solo el día ("el 15"): este mes, o el siguiente si ya pasó. */
function nextDayOfMonth(today: string, d: number): string | null {
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  for (let i = 0; i < 3; i += 1) {
    const iso = validDate(y, m, d);
    if (iso && iso >= today) return iso;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return null;
}

interface Hit {
  start: number;
  end: number;
}

interface DateHit extends Hit {
  date: string;
}

interface TimeHit extends Hit {
  minutes: number;
}

function findDate(folded: string, today: string): DateHit | null {
  const tries: Array<[RegExp, (m: RegExpExecArray) => string | null]> = [
    [/\bpasado\s+manana\b/, () => addDays(today, 2)],
    [/\b(?:para\s+)?hoy\b/, () => today],
    [/\b(?:para\s+)?(?<!la\s)(?<!por\s)manana\b/, () => addDays(today, 1)],
    [
      new RegExp(`\\b(?:en|dentro\\s+de)\\s+${NUM}\\s+(dias?|semanas?)\\b`),
      (m) => {
        const n = toNumber(m[1]);
        if (!Number.isFinite(n)) return null;
        return addDays(today, m[2].startsWith('semana') ? n * 7 : n);
      },
    ],
    [/\b(?:la\s+)?(?:proxima\s+semana|semana\s+que\s+viene)\b/, () => addDays(today, ((8 - weekday(today)) % 7) || 7)],
    [
      new RegExp(`\\b(?:para\\s+)?(?:el\\s+)?(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${MONTH_RE})\\b(?:\\s+(?:de|del)\\s+(\\d{4}))?`),
      (m) => {
        const d = Number(m[1]);
        const mo = MONTHS[m[2]];
        return m[3] ? validDate(Number(m[3]), mo, d) : nextDayMonth(today, mo, d);
      },
    ],
    [
      /\b(?:para\s+)?(?:el\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
      (m) => {
        const d = Number(m[1]);
        const mo = Number(m[2]);
        if (!m[3]) return nextDayMonth(today, mo, d);
        const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
        return validDate(y, mo, d);
      },
    ],
    [
      /\b(?:para\s+)?(?:el\s+|este\s+)?(?:proximo\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)(?:\s+que\s+viene)?\b/,
      (m) => {
        const target = WEEKDAYS[m[1]];
        const diff = (target - weekday(today) + 7) % 7 || 7;
        return addDays(today, diff);
      },
    ],
    /* "el 15" solo. Si detrás viene un mes, ya lo intentó el patrón de día y
       mes; si no dio fecha es que no existe (31 de febrero), no se inventa. */
    [
      new RegExp(`\\b(?:para\\s+)?el\\s+(?:dia\\s+)?(\\d{1,2})\\b(?!\\s*(?::|h\\b|am\\b|pm\\b))(?!\\s+de\\s+(?:${MONTH_RE})\\b)`),
      (m) => nextDayOfMonth(today, Number(m[1])),
    ],
  ];

  for (const [re, toDate] of tries) {
    const m = re.exec(folded);
    if (!m) continue;
    const date = toDate(m);
    if (date) return { start: m.index, end: m.index + m[0].length, date };
  }
  return null;
}

/* ----------------------------------------------------------- horas ---- */

function toMinutes(hour: number, minute: number, period: string | undefined): number | null {
  if (!Number.isFinite(hour) || hour > 23 || minute > 59) return null;
  let h = hour;
  const p = period ?? '';
  if (/^p|tarde|noche/.test(p)) {
    if (h < 12) h += 12;
  } else if (/^a|manana|madrugada/.test(p)) {
    if (h === 12) h = 0;
  } else if (h >= 1 && h <= 7) {
    /* "a las 3" sin más casi nunca es de madrugada. */
    h += 12;
  }
  return h * 60 + minute;
}

function findTime(folded: string): TimeHit | null {
  const period =
    '(?:\\s*(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)|\\s+(?:de\\s+la|por\\s+la|en\\s+la)\\s+(manana|tarde|noche|madrugada))?';
  const minutes = '(?:(?::|\\.|h)(\\d{2})|\\s+y\\s+(media|cuarto|\\d{1,2}))?';

  const tries: Array<[RegExp, (m: RegExpExecArray) => number | null]> = [
    [/\b(?:a|al)\s+(?:el\s+)?mediodia\b/, () => 12 * 60],
    [/\b(?:a\s+)?(?:la\s+)?medianoche\b/, () => 23 * 60 + 59],
    [
      new RegExp(`\\b(?:a\\s+las?|sobre\\s+las?|tipo)\\s+${NUM}${minutes}${period}`),
      (m) => {
        const extra = m[3] === 'media' ? 30 : m[3] === 'cuarto' ? 15 : m[3] ? Number(m[3]) : 0;
        return toMinutes(toNumber(m[1]), m[2] ? Number(m[2]) : extra, m[4] ?? m[5]);
      },
    ],
    [
      /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)(?=\s|$|[.,;])/,
      (m) => toMinutes(Number(m[1]), m[2] ? Number(m[2]) : 0, m[3]),
    ],
    [/\b(\d{1,2}):(\d{2})\b/, (m) => toMinutes(Number(m[1]), Number(m[2]), 'h24')],
  ];

  for (const [re, toMin] of tries) {
    const m = re.exec(folded);
    if (!m) continue;
    const total = toMin(m);
    if (total !== null) return { start: m.index, end: m.index + m[0].length, minutes: total };
  }
  return null;
}

/* ---------------------------------------------------------- título ---- */

function cut(text: string, folded: string, hit: Hit): [string, string] {
  const blank = (s: string) => s.slice(0, hit.start) + ' '.repeat(hit.end - hit.start) + s.slice(hit.end);
  return [blank(text), blank(folded)];
}

function cleanTitle(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim();
  const edge = /^(?:para|el|la|los|las|de|del|que|y|a|,|-|:)\s+|\s+(?:para|el|la|de|del|que|y|a|en|,|-)$/i;
  for (let i = 0; i < 6 && edge.test(t); i += 1) t = t.replace(edge, '').trim();
  t = t.replace(/\s+([,.;:])/g, '$1').replace(/^[,.;:\-\s]+|[,;:\-\s]+$/g, '').replace(/\.$/, '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/* ----------------------------------------------------------- todo ----- */

export function parseCapture(input: string, now: CaptureNow): ParsedCapture {
  let text = input.trim();
  let folded = fold(text);
  let kind: ParsedCapture['kind'] = 'task';

  const prefix = /^\s*(?:recordatorio|reminder)\b[\s:,-]*(?:de\s+|para\s+)?/.exec(folded);
  if (prefix) {
    kind = 'reminder';
    [text, folded] = cut(text, folded, { start: 0, end: prefix[0].length });
  }

  /* La hora primero: "de la mañana" no debe leerse como "mañana". */
  const timeHit = findTime(folded);
  if (timeHit) [text, folded] = cut(text, folded, timeHit);

  const dateHit = findDate(folded, now.date);
  if (dateHit) [text, folded] = cut(text, folded, dateHit);

  const time = timeHit ? `${pad(Math.floor(timeHit.minutes / 60))}:${pad(timeHit.minutes % 60)}` : null;

  let date = dateHit?.date ?? null;
  /* Solo hora: hoy si aún no ha pasado, si no mañana. */
  if (!date && timeHit) date = timeHit.minutes > now.minutes ? now.date : addDays(now.date, 1);

  const title = cleanTitle(text) || cleanTitle(input) || input.trim();
  return { kind, title, date, time };
}
