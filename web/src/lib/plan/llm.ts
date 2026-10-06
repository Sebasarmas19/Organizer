/* ============================================================================
   Organizer · El asistente de planificar (Gemini)

   Recibe lo que quieres hacer y tu contexto (ver context.ts) y devuelve una
   respuesta corta más hasta tres propuestas de sesiones.

   · Los huecos libres los calcula el código; el modelo solo elige entre
     ellos por su id. Cada sesión se valida: si no cabe entera en su hueco,
     se descarta. Una propuesta sin sesiones válidas no se enseña.
   · Nada se guarda aquí. Guardar es un toque del usuario (actions.ts).
   ========================================================================= */

import type { PlanContext } from './context';
import { fitsInSlots, fromClock, toClock } from './slots';

/* Flash y no Flash-Lite: aquí importa razonar bien, no responder en 1 s.
   Medido el 2026-10-05: 3.8-flash ~9 s, 3.5-flash ~8 s, 3.5-flash-lite ~2 s.
   Los tres intentos caben en el maxDuration (60 s) de /planear. */
const DEFAULT_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const FIRST_TIMEOUT_MS = 22000;
const FALLBACK_TIMEOUT_MS = 12000;
const MAX_OPTIONS = 3;
const MAX_SESSIONS = 14;

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export type PlanSession = { date: string; start: string; minutes: number; title: string };
export type PlanOption = { title: string; why: string; sessions: PlanSession[] };
export type PlanAnswer = { reply: string; options: PlanOption[] };

function dayName(date: string): string {
  return WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()];
}

function describeContext(ctx: PlanContext): string {
  const days = ctx.days
    .map((d) => {
      const lines = [
        ...d.agenda.map((a) => `  · ${a}`),
        ...d.looseTasks.map((t) => `  · sin hora, tarea: ${t}`),
      ];
      return `${dayName(d.date)} ${d.date}${d.date === ctx.today ? ' (hoy)' : ''}\n${lines.length ? lines.join('\n') : '  · (nada)'}`;
    })
    .join('\n');

  const slots = ctx.slots
    .map((s) => `${s.id}: ${dayName(s.date)} ${s.date} ${toClock(s.from)}–${toClock(s.to)} (${s.to - s.from} min)`)
    .join('\n');

  const upcoming = ctx.upcoming.length
    ? ctx.upcoming.map((r) => `· ${dayName(r.date)} ${r.date}${r.time ? ` ${r.time}` : ''}: ${r.title}`).join('\n')
    : '· (ninguno)';

  const backlog = ctx.backlog.length ? ctx.backlog.map((t) => `· ${t}`).join('\n') : '· (vacío)';

  return `AGENDA DE LAS PRÓXIMAS DOS SEMANAS
${days}

HUECOS LIBRES (ya descontadas clases, tareas con hora y reminders con hora, con margen)
${slots || '(ninguno)'}

REMINDERS PRÓXIMOS (45 días: parciales, entregas, fechas fijas)
${upcoming}

PENDIENTES SIN FECHA
${backlog}`;
}

function instructions(ctx: PlanContext): string {
  return `Eres el asistente de planificación de Sebastián, que estudia en la universidad en Venezuela y tiene TDAH.
Ahora: ${dayName(ctx.today)} ${ctx.today} ${toClock(ctx.nowMinutes)}, zona ${ctx.timezone}.

Te escribe algo que quiere hacer (leer un libro, estudiar para un parcial, un proyecto, un hábito) o te
pregunta por su semana. Tu trabajo: mirar su agenda real y proponer CUÁNDO hacerlo.

Cómo pensar:
- Mira la carga de cada día y los reminders próximos. Antes de un parcial o una entrega, no le llenes
  esos días con cosas opcionales; si lo que pide es estudiar para algo, reparte antes de la fecha.
- Sesiones cortas y repetidas funcionan mejor con TDAH que un bloque largo: 25–60 min, rara vez más de 90.
- No uses todos los huecos. Deja aire. No pongas nada antes de las 7:30 ni después de las 22:30.
- Respeta lo que diga (días, horas, duración). Si pide algo imposible con su agenda, dilo y propón lo más cercano.
- Para hábitos o cosas largas (un libro), propone un ritmo para estas dos semanas y dilo en "why".

Límites (obligatorios):
- Solo puedes proponer sesiones NUEVAS. No puedes mover, editar, completar ni borrar tareas o reminders
  que ya existen. Si te pide eso, dilo en reply ("eso se cambia desde la tarea en la app") y options = [].
- Solo sabes lo que está en el contexto de abajo. Si menciona una tarea, parcial o fecha que no aparece,
  dile que no lo ves en su agenda. Nunca inventes fechas, notas ni datos que no estén ahí.
- Si pregunta algo ajeno a su agenda, contesta en una frase y options = [].

Respuesta (JSON):
- reply: 1–3 frases en español, directas, tuteando, sin marcar género. Qué ves en su agenda y qué recomiendas. Sin saludos.
- options: de 1 a 3 alternativas distintas de verdad (por ejemplo: constante y corto / pocas sesiones
  largas / solo fines de semana). Cada una:
  - title: nombre corto de la alternativa ("30 min, 3 noches por semana").
  - why: una frase de por qué encaja con su agenda.
  - sessions: cada sesión con slot (id de HUECOS LIBRES, p. ej. "H4"), start (HH:MM dentro de ese hueco),
    minutes (15–180) y title (corto: "Leer Atomic Habits", "Repasar Cálculo: derivadas").
    La sesión tiene que caber ENTERA dentro del hueco. Máximo ${MAX_SESSIONS} sesiones.
- Si solo pregunta algo y no hay que agendar nada, options = [] y responde en reply.

${describeContext(ctx)}`;
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    options: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          why: { type: 'STRING' },
          sessions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                slot: { type: 'STRING' },
                start: { type: 'STRING' },
                minutes: { type: 'INTEGER' },
                title: { type: 'STRING' },
              },
              required: ['slot', 'start', 'minutes', 'title'],
            },
          },
        },
        required: ['title', 'why', 'sessions'],
      },
    },
  },
  required: ['reply', 'options'],
};

async function callModel(
  model: string,
  apiKey: string,
  system: string,
  text: string,
  timeoutMs: number
): Promise<{ raw: string | null; retry: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );
    if (!res.ok) {
      console.error('Gemini (plan)', model, 'respondió', res.status, (await res.text()).slice(0, 200));
      return { raw: null, retry: res.status === 429 || res.status >= 500 || res.status === 404 };
    }
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data?.candidates?.[0]?.content?.parts ?? [];
    const raw = parts.filter((p) => !p.thought && p.text).map((p) => p.text).join('');
    return { raw: raw || null, retry: !raw };
  } catch (error) {
    console.error('Gemini (plan)', model, 'no respondió:', error instanceof Error ? error.message : error);
    return { raw: null, retry: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Lo que devuelve el modelo, pasado por el filtro de huecos reales. */
export function validateAnswer(out: unknown, ctx: PlanContext): PlanAnswer | null {
  if (!out || typeof out !== 'object') return null;
  const o = out as { reply?: unknown; options?: unknown };
  const reply = typeof o.reply === 'string' ? o.reply.trim().slice(0, 600) : '';
  const slotById = new Map(ctx.slots.map((s) => [s.id, s]));

  const options: PlanOption[] = [];
  for (const raw of Array.isArray(o.options) ? o.options : []) {
    if (options.length >= MAX_OPTIONS) break;
    const opt = raw as { title?: unknown; why?: unknown; sessions?: unknown };
    const sessions: PlanSession[] = [];
    const taken: { date: string; from: number; to: number }[] = [];

    for (const rs of Array.isArray(opt.sessions) ? opt.sessions : []) {
      if (sessions.length >= MAX_SESSIONS) break;
      const s = rs as { slot?: unknown; start?: unknown; minutes?: unknown; title?: unknown };
      const slot = typeof s.slot === 'string' ? slotById.get(s.slot.trim()) : undefined;
      const from = typeof s.start === 'string' ? fromClock(s.start) : null;
      const minutes = typeof s.minutes === 'number' ? Math.round(s.minutes) : NaN;
      const title = typeof s.title === 'string' ? s.title.trim().slice(0, 120) : '';
      if (!slot || from === null || !title || !(minutes >= 15 && minutes <= 180)) continue;
      if (!fitsInSlots([slot], slot.date, from, minutes)) continue;
      /* Dos sesiones de la misma propuesta no se pisan. */
      if (taken.some((t) => t.date === slot.date && from < t.to && t.from < from + minutes)) continue;
      taken.push({ date: slot.date, from, to: from + minutes });
      sessions.push({ date: slot.date, start: toClock(from), minutes, title });
    }

    if (sessions.length === 0) continue;
    sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    options.push({
      title: typeof opt.title === 'string' ? opt.title.trim().slice(0, 80) : 'Propuesta',
      why: typeof opt.why === 'string' ? opt.why.trim().slice(0, 300) : '',
      sessions,
    });
  }

  if (!reply && options.length === 0) return null;
  return { reply, options };
}

export async function proposeWithLlm(request: string, ctx: PlanContext): Promise<PlanAnswer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const primary = process.env.GEMINI_PLAN_MODEL || DEFAULT_MODEL;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  const system = instructions(ctx);

  for (const [i, model] of models.entries()) {
    const timeout = i === 0 ? FIRST_TIMEOUT_MS : FALLBACK_TIMEOUT_MS;
    const { raw, retry } = await callModel(model, apiKey, system, request, timeout);
    if (raw) {
      try {
        const answer = validateAnswer(JSON.parse(raw), ctx);
        if (answer) return answer;
      } catch {
        console.error('Gemini (plan) devolvió algo que no es JSON válido:', raw.slice(0, 200));
      }
    }
    if (!raw && !retry) break;
  }
  return null;
}
