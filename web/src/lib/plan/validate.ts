/* ============================================================================
   Organizer · Filtro de lo que devuelve el asistente

   El modelo puede equivocarse; este filtro no. Reglas que se cumplen por
   código, no por pedírselo en el prompt:

   · Solo hay propuestas si la intención es "plan". Una pregunta, un pedido
     de editar, algo fuera de tema o que no se entendió → cero propuestas.
   · Cada sesión tiene que caber entera en un hueco libre real, por su id.
   · Dos sesiones de la misma propuesta no se pisan.
   · Una sesión puede ser una tarea que ya existe (por su id, "T3"): entonces
     lleva el título real de esa tarea, va una sola vez por propuesta y nunca
     después del reminder del que cuelga. Así "Ponerlo" le da hora a esa
     tarea en vez de crear otra igual.
   · Topes de tamaño en todo el texto.

   Sin dependencias de Next ni de red: se prueba con `node --test`.
   ========================================================================= */

import { fitsInSlots, fromClock, toClock, type FreeSlot } from './slots.ts';

export const INTENTS = ['plan', 'question', 'edit', 'off_topic', 'unclear'] as const;
export type Intent = (typeof INTENTS)[number];

/** `itemId`: la tarea ya anotada a la que esta sesión le da hora. */
export type PlanSession = { date: string; start: string; minutes: number; title: string; itemId?: string };
/** Una tarea abierta sin hora que el modelo puede elegir por `ref`. */
export type TaskRef = { ref: string; id: string; title: string; before: string | null };
export type PlanOption = { title: string; why: string; sessions: PlanSession[] };
export type PlanAnswer = { intent: Intent; reply: string; options: PlanOption[] };

export const MAX_OPTIONS = 3;
export const MAX_SESSIONS = 14;

const FALLBACK_REPLY: Record<Intent, string> = {
  plan: 'No encontré huecos que encajen con eso en las próximas dos semanas.',
  question: 'No tengo una respuesta para eso con lo que hay en tu agenda.',
  edit: 'Eso se cambia desde la tarea o el reminder en la app.',
  off_topic: 'Eso no tiene que ver con tu agenda. Dime qué quieres hacer y te digo cuándo.',
  unclear: 'No entendí qué quieres planificar. Dime qué quieres hacer y te busco hueco.',
};

export function validateAnswer(out: unknown, slots: FreeSlot[], tasks: TaskRef[] = []): PlanAnswer | null {
  if (!out || typeof out !== 'object') return null;
  const o = out as { intent?: unknown; reply?: unknown; options?: unknown };

  const intent: Intent = INTENTS.includes(o.intent as Intent) ? (o.intent as Intent) : 'unclear';
  let reply = typeof o.reply === 'string' ? o.reply.trim().slice(0, 600) : '';

  const options: PlanOption[] = [];
  if (intent === 'plan') {
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const taskByRef = new Map(tasks.map((t) => [t.ref.toUpperCase(), t]));

    for (const raw of Array.isArray(o.options) ? o.options : []) {
      if (options.length >= MAX_OPTIONS) break;
      const opt = (raw ?? {}) as { title?: unknown; why?: unknown; sessions?: unknown };
      const sessions: PlanSession[] = [];
      const taken: { date: string; from: number; to: number }[] = [];
      const linked = new Set<string>();

      for (const rs of Array.isArray(opt.sessions) ? opt.sessions : []) {
        if (sessions.length >= MAX_SESSIONS) break;
        const s = (rs ?? {}) as { slot?: unknown; start?: unknown; minutes?: unknown; title?: unknown; task?: unknown };
        const slot = typeof s.slot === 'string' ? slotById.get(s.slot.trim()) : undefined;
        const from = typeof s.start === 'string' ? fromClock(s.start) : null;
        const minutes = typeof s.minutes === 'number' ? Math.round(s.minutes) : NaN;
        const task = typeof s.task === 'string' ? taskByRef.get(s.task.trim().toUpperCase()) : undefined;
        const title = task ? task.title : typeof s.title === 'string' ? s.title.trim().slice(0, 120) : '';
        if (!slot || from === null || !title || !(minutes >= 15 && minutes <= 180)) continue;
        if (!fitsInSlots([slot], slot.date, from, minutes)) continue;
        if (taken.some((t) => t.date === slot.date && from < t.to && t.from < from + minutes)) continue;
        /* Una tarea es una sola cosa: una hora, y antes de su parcial. */
        if (task && (linked.has(task.id) || (task.before !== null && slot.date > task.before))) continue;
        taken.push({ date: slot.date, from, to: from + minutes });
        if (task) linked.add(task.id);
        sessions.push({ date: slot.date, start: toClock(from), minutes, title, ...(task ? { itemId: task.id } : {}) });
      }

      if (sessions.length === 0) continue;
      sessions.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
      options.push({
        title: typeof opt.title === 'string' && opt.title.trim() ? opt.title.trim().slice(0, 80) : 'Propuesta',
        why: typeof opt.why === 'string' ? opt.why.trim().slice(0, 300) : '',
        sessions,
      });
    }
  }

  if (!reply) reply = FALLBACK_REPLY[intent];
  return { intent, reply, options };
}

/* ------------------------------------------------------------ conversación
   Lo que el cliente manda de los turnos anteriores. Viene del navegador, así
   que se recorta y se limpia aquí antes de pasárselo al modelo. */

export type ChatTurn = { role: 'user' | 'model'; text: string };
export const MAX_TURNS = 8;
const MAX_TURN_CHARS = 1500;

export function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is ChatTurn =>
        !!t &&
        typeof t === 'object' &&
        ((t as ChatTurn).role === 'user' || (t as ChatTurn).role === 'model') &&
        typeof (t as ChatTurn).text === 'string' &&
        (t as ChatTurn).text.trim().length > 0
    )
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, text: t.text.trim().slice(0, MAX_TURN_CHARS) }));
}

/** Cómo se recuerda una respuesta del asistente en el turno siguiente. */
export function summarizeAnswer(a: PlanAnswer): string {
  const opts = a.options
    .map(
      (o, i) =>
        `Opción ${i + 1} "${o.title}": ` +
        o.sessions.map((s) => `${s.date} ${s.start} ${s.minutes} min ${s.title}`).join('; ')
    )
    .join('\n');
  return opts ? `${a.reply}\n${opts}` : a.reply;
}
