'use server';

/* ============================================================================
   Organizer · Acciones del asistente de planificar

   proposePlan: pide propuestas (con los turnos anteriores). No escribe nada.
                En modo "week" (el ritual del domingo) solo quedan sesiones
                de la semana que se arma, aunque el modelo proponga otras, y
                ninguna sugerencia impide guardar otra.
   acceptPlan:  guarda la propuesta que elegiste. Vuelve a calcular los huecos
                antes de escribir: si entre medias algo ocupó esa hora, no se
                guarda nada y se dice. Cada sesión es una tarea planificada con
                su bloque y su aviso 15 min antes, igual que una hecha a mano.
                Si la sesión es una tarea que ya tenías (itemId), se le da
                hora a esa misma tarea: no se crea otra igual.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { zonedIso } from '@/lib/tz';
import { loadPlanContext } from './context';
import { proposeWithLlm, weekRange, type PlanAnswer, type PlanMode, type PlanSession } from './llm';
import { sanitizeHistory, summarizeAnswer } from './validate';
import { canBookBoth, fitsInSlots, fromClock, toClock, type Busy } from './slots';

const REMIND_BEFORE_MIN = 15;
const MAX_REQUEST = 1000;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, user, timezone: profile?.timezone ?? DEFAULT_TIMEZONE };
}

export async function proposePlan(
  request: string,
  history: unknown = [],
  rawMode: unknown = 'chat'
): Promise<{ ok: true; answer: PlanAnswer; memory: string } | { ok: false; error: string }> {
  const text = typeof request === 'string' ? request.trim().slice(0, MAX_REQUEST) : '';
  if (!text) return { ok: false, error: 'Escribe qué quieres hacer.' };
  const mode: PlanMode = rawMode === 'week' ? 'week' : 'chat';

  const { supabase, user, timezone } = await requireUser();
  const ctx = await loadPlanContext(supabase, user.id, timezone);
  let answer = await proposeWithLlm(text, ctx, sanitizeHistory(history), mode);
  if (!answer) {
    return { ok: false, error: 'El asistente no respondió. Prueba otra vez en un minuto.' };
  }
  if (mode === 'week') {
    /* Cada sugerencia se acepta por separado: guardar una no puede dejar a
       otra sin hueco (ni pisarla, ni quedar a menos del margen), y una
       misma tarea no va en dos. */
    const { from, to } = weekRange(ctx.today);
    const taken: Busy[] = [];
    const items = new Set<string>();
    const free = (x: PlanSession) => {
      const a = fromClock(x.start) as number;
      const mine: Busy = { date: x.date, from: a, to: a + x.minutes };
      if (!taken.every((t) => canBookBoth(t, mine))) return false;
      if (x.itemId && items.has(x.itemId)) return false;
      taken.push(mine);
      if (x.itemId) items.add(x.itemId);
      return true;
    };
    answer = {
      ...answer,
      options: answer.options
        .map((o) => ({ ...o, sessions: o.sessions.filter((x) => x.date >= from && x.date <= to && free(x)) }))
        .filter((o) => o.sessions.length > 0),
    };
  }
  /* `memory` es cómo se recuerda esta respuesta en el turno siguiente. */
  return { ok: true, answer, memory: summarizeAnswer(answer) };
}

export async function acceptPlan(
  sessions: PlanSession[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!Array.isArray(sessions) || sessions.length === 0 || sessions.length > 14) {
    return { ok: false, error: 'No hay sesiones que guardar.' };
  }

  const { supabase, user, timezone } = await requireUser();
  const ctx = await loadPlanContext(supabase, user.id, timezone);
  /* Solo se le da hora a una tarea que sigue abierta y sin hora ahora mismo. */
  const openTasks = new Map(ctx.tasks.map((t) => [t.id, t]));
  const linked = new Set<string>();

  for (const s of sessions) {
    if (s.itemId !== undefined) {
      const task = typeof s.itemId === 'string' ? openTasks.get(s.itemId) : undefined;
      if (!task || linked.has(task.id)) {
        return { ok: false, error: 'Una de esas tareas ya tiene hora o ya no está. Pide otra propuesta.' };
      }
      linked.add(task.id);
    }
    const from = typeof s.start === 'string' ? fromClock(s.start) : null;
    const ok =
      typeof s.date === 'string' &&
      typeof s.title === 'string' &&
      s.title.trim().length > 0 &&
      from !== null &&
      Number.isInteger(s.minutes) &&
      s.minutes >= 15 &&
      s.minutes <= 180 &&
      fitsInSlots(ctx.slots, s.date, from, s.minutes);
    if (!ok) {
      return {
        ok: false,
        error: 'Algo de tu agenda cambió y una de esas horas ya no está libre. Pide otra propuesta.',
      };
    }
  }

  let count = 0;
  for (const s of sessions) {
    const from = fromClock(s.start) as number;
    const task = s.itemId ? openTasks.get(s.itemId) : undefined;
    const title = task ? task.title : s.title.trim().slice(0, 120);
    const fields = { status: 'planned' as const, due_on: s.date, estimate_min: s.minutes };

    /* La tarea que ya tenías conserva su reminder y su historia; solo cambia cuándo. */
    const { data: item, error } = task
      ? await supabase.from('items').update(fields).eq('id', task.id).eq('user_id', user.id).select('id').single()
      : await supabase.from('items').insert({ user_id: user.id, title, ...fields }).select('id').single();
    if (error || !item) {
      console.error('acceptPlan: item', error);
      continue;
    }

    const { error: blockError } = await supabase.from('blocks').insert({
      user_id: user.id,
      item_id: item.id,
      title,
      starts_at: zonedIso(s.date, s.start, timezone),
      /* Los huecos acaban como muy tarde a las 22:30: nunca cruza la medianoche. */
      ends_at: zonedIso(s.date, toClock(from + s.minutes), timezone),
      status: 'pending',
      source: 'manual',
      reminder_min: REMIND_BEFORE_MIN,
    });
    if (blockError) console.error('acceptPlan: block', blockError);
    count++;
  }

  revalidatePath('/', 'layout');
  if (count === 0) return { ok: false, error: 'No se pudo guardar. Prueba otra vez.' };
  return { ok: true, count };
}
