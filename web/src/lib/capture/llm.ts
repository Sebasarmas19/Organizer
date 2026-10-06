/* ============================================================================
   Organizer · Interpretar lo dictado con un modelo de lenguaje (Gemini)

   Siri transcribe bien; lo que fallaba era entender la frase con reglas
   ("un reminder para dos semanas" no encajaba en ningún patrón). Aquí un
   modelo devuelve tipo, título, fecha y hora en JSON estricto.

   · Al modelo solo le llega la frase, la fecha de hoy y la zona horaria.
   · No calcula fechas: recibe la lista de los próximos días con su nombre y
     elige una. Así no se equivoca de día de la semana.
   · Todo lo que devuelve se valida. Si falla, tarda más de TIMEOUT_MS o no
     hay GEMINI_API_KEY, devuelve null y el endpoint usa `parseCapture`.
   ========================================================================= */

import type { CaptureNow, ParsedCapture } from './parse';

/* Por intento. Siri espera la respuesta: dos intentos caben de sobra. */
const TIMEOUT_MS = 4000;
/* Lite: ~1 s por frase y el cupo gratis más amplio. Si Google lo tiene
   saturado (503) o sin cupo (429), se prueba el de respaldo. */
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
const HORIZON_DAYS = 21;

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function calendar(today: string): string {
  return Array.from({ length: HORIZON_DAYS }, (_, i) => {
    const date = addDays(today, i);
    const label = i === 0 ? ' (hoy)' : i === 1 ? ' (mañana)' : '';
    return `${date} ${WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()]}${label}`;
  }).join('\n');
}

function instructions(now: CaptureNow, timezone: string): string {
  const hh = String(Math.floor(now.minutes / 60)).padStart(2, '0');
  const mm = String(now.minutes % 60).padStart(2, '0');
  return `Eres el intérprete de una app de planificación personal de un estudiante universitario en Venezuela.
Recibes una frase dictada a Siri (puede tener errores de transcripción) y devuelves qué guardar.

Ahora: ${now.date} ${hh}:${mm}, zona ${timezone}.
Próximos días (elige fechas de aquí; si es más lejos, calcula con cuidado):
${calendar(now.date)}

Tipos:
- "reminder": un evento con fecha fija que no depende de él: parcial, examen, entrega, defensa, cita,
  cumpleaños, pago con vencimiento. También si dice "reminder", "recordatorio" o "recuérdame que el X es…".
- "task": algo que él tiene que hacer: estudiar, comprar, llamar, enviar, repasar, tomar una pastilla,
  ir al gym, pagar algo. "Recuérdame comprar pan mañana" es una tarea con fecha. Ante la duda, task.

Reglas:
- title: corto y claro, en español, primera letra mayúscula, sin la fecha ni la hora ni palabras como
  "reminder", "recordatorio", "anota", "ponme". Conserva tildes y nombres propios.
- date: YYYY-MM-DD o null si no dice cuándo. "En dos semanas" / "para dos semanas" = hoy + 14 días.
  "El 15" = el próximo día 15. Un día de la semana = el próximo (si es hoy, el de la semana siguiente).
  "Fin de mes" = último día del mes. "La semana que viene" sin día = el lunes siguiente.
- time: HH:MM en 24 h o null. "A las 3" sin más = 15:00 (de 1 a 7 sin "mañana" es tarde).
  "De la mañana" = AM. Si solo dice "en la tarde/noche/mañana" sin hora, time = null.
- Si la frase no tiene un tema claro (por ejemplo solo "para dos semanas"), title = la frase tal cual.`;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', enum: ['task', 'reminder'] },
    title: { type: 'STRING' },
    date: { type: 'STRING', nullable: true },
    time: { type: 'STRING', nullable: true },
  },
  required: ['kind', 'title', 'date', 'time'],
};

function validDate(value: unknown, today: string): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  /* Nada en el pasado ni a más de dos años. */
  if (value < today || value > addDays(today, 730)) return null;
  return value;
}

function validTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

async function callModel(
  model: string,
  apiKey: string,
  text: string,
  now: CaptureNow,
  timezone: string
): Promise<{ raw: string | null; retry: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions(now, timezone) }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            /* Lo mínimo de "pensar": la respuesta es corta y Siri está
               esperando. Gemini 2.5 lo regula por presupuesto; 3.x por nivel. */
            thinkingConfig: model.startsWith('gemini-2.5')
              ? { thinkingBudget: 0 }
              : { thinkingLevel: process.env.GEMINI_THINKING || 'low' },
          },
        }),
      }
    );
    if (!res.ok) {
      console.error('Gemini', model, 'respondió', res.status, (await res.text()).slice(0, 200));
      return { raw: null, retry: res.status === 429 || res.status >= 500 };
    }
    const data = await res.json();
    return { raw: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null, retry: false };
  } catch (error) {
    console.error('Gemini', model, 'no respondió:', error instanceof Error ? error.message : error);
    return { raw: null, retry: true };
  } finally {
    clearTimeout(timer);
  }
}

export async function interpretWithLlm(
  text: string,
  now: CaptureNow,
  timezone: string
): Promise<ParsedCapture | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const models = primary === FALLBACK_MODEL ? [primary] : [primary, FALLBACK_MODEL];

  let raw: string | null = null;
  for (const model of models) {
    const attempt = await callModel(model, apiKey, text, now, timezone);
    raw = attempt.raw;
    if (raw || !attempt.retry) break;
  }
  if (!raw) return null;

  try {
    const out = JSON.parse(raw);
    const kind = out.kind === 'reminder' ? 'reminder' : 'task';
    const title = typeof out.title === 'string' ? out.title.trim().slice(0, 200) : '';
    if (!title) return null;

    const time = validTime(out.time);
    let date = validDate(out.date, now.date);
    /* Hora sin fecha: hoy si no ha pasado, si no mañana (igual que las reglas). */
    if (!date && time) {
      const [h, m] = time.split(':').map(Number);
      date = h * 60 + m > now.minutes ? now.date : addDays(now.date, 1);
    }

    return { kind, title: title.charAt(0).toUpperCase() + title.slice(1), date, time };
  } catch {
    console.error('Gemini devolvió algo que no es JSON válido:', raw.slice(0, 200));
    return null;
  }
}
