'use server';

/* ============================================================================
   Organizer · Acciones del asistente de planificar

   proposePlan: pide propuestas (con los turnos anteriores). No escribe nada.
                En modo "week" (el ritual del domingo) solo quedan sesiones
                de la semana que se arma, aunque el modelo proponga otras.
   acceptPlan:  guarda la propuesta que elegiste. Vuelve a calcular los huecos
                antes de escribir: si entre medias algo ocupó esa hora, no se
                guarda nada y se dice. Cada sesión es una tarea planificada con
                su bloque y su aviso 15 min antes, igual que una hecha a mano.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { zonedIso } from '@/lib/tz';
import { loadPlanContext } from './context';
import { proposeWithLlm, weekRange, type PlanAnswer, type PlanMode, type PlanSession } from './llm';
import { sanitizeHistory, summarizeAnswer } from './validate';
import { fitsInSlots, fromClock, toClock } from './slots';

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
    /* Cada sugerencia se acepta por separado: ninguna puede pisar a otra. */
    const { from, to } = weekRange(ctx.today);
    const taken: { date: string; from: number; to: number }[] = [];
    const free = (x: PlanSession) => {
      const a = fromClock(x.start) as number;
      if (taken.some((t) => t.date === x.date && a < t.to && t.from < a + x.minutes)) return false;
      taken.push({ date: x.date, from: a, to: a + x.minutes });
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

  for (const s of sessions) {
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
    const title = s.title.trim().slice(0, 120);

    const { data: item, error } = await supabase
      .from('items')
      .insert({ user_id: user.id, title, status: 'planned', due_on: s.date, estimate_min: s.minutes })
      .select('id')
      .single();
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
