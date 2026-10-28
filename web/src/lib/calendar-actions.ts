'use server';

/* ============================================================================
   Organizer · Guardar el horario del semestre

   Una semana de materias se replica hasta el final del semestre.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { materializeScheduleTemplates } from './calendar';
import { addDays, getTodayString } from './date-utils';
import { getProfileTimezone } from './profile';
import { dayRangeUtc } from './tz';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export async function saveScheduleTemplatesAction(payload: {
  activeFrom: string;
  activeUntil: string;
  templates: {
    title: string;
    weekday: number; // 0=dom, 1=lun, ..., 6=sab
    startTime: string; // "08:00"
    endTime: string; // "10:00"
    location?: string | null;
    reminderMin?: number | null;
  }[];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };

  if (!payload || !Array.isArray(payload.templates)) {
    return { ok: false, error: 'Datos de horario no válidos' };
  }

  if (!payload.activeFrom || !DATE_RE.test(payload.activeFrom)) {
    return { ok: false, error: 'Fecha de inicio del horario no válida.' };
  }

  if (payload.activeUntil && !DATE_RE.test(payload.activeUntil)) {
    return { ok: false, error: 'Fecha de fin del horario no válida.' };
  }

  if (payload.activeUntil && payload.activeUntil < payload.activeFrom) {
    return { ok: false, error: 'La fecha de fin no puede ser anterior a la de inicio.' };
  }

  for (const t of payload.templates) {
    const title = typeof t.title === 'string' ? t.title.trim() : '';
    if (!title) return { ok: false, error: 'Todas las materias deben tener nombre.' };
    if (title.length > 200) return { ok: false, error: `"${title.slice(0, 30)}...": nombre demasiado largo.` };
    if (!Number.isInteger(t.weekday) || t.weekday < 0 || t.weekday > 6) {
      return { ok: false, error: `"${title}": día de la semana no válido.` };
    }
    const start = typeof t.startTime === 'string' ? t.startTime.slice(0, 5) : '';
    const end = typeof t.endTime === 'string' ? t.endTime.slice(0, 5) : '';
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      return { ok: false, error: `"${title}": formato de hora no válido.` };
    }
    if (end <= start) {
      return { ok: false, error: `"${title}": la hora de fin tiene que ser después del inicio.` };
    }
    if (t.reminderMin !== undefined && t.reminderMin !== null) {
      const rm = Number(t.reminderMin);
      if (!Number.isInteger(rm) || rm < 0 || rm > 1440) {
        return { ok: false, error: `"${title}": aviso previo no válido.` };
      }
    }
  }

  const timezone = await getProfileTimezone(supabase, user.id);
  const todayStr = getTodayString(timezone);

  /* Guardamos los context_id asociados a cada materia para no destruirlos al guardar */
  const { data: oldTemplates } = await supabase
    .from('schedule_templates')
    .select('title, context_id')
    .eq('user_id', user.id);

  const contextMap = new Map<string, string | null>();
  (oldTemplates ?? []).forEach((ot) => {
    if (ot.context_id) contextMap.set(ot.title.trim().toLowerCase(), ot.context_id);
  });

  /* 1 · Las clases de hoy en adelante se regeneran desde cero. Sin esto, al
     borrar las plantillas viejas sus bloques quedaban huérfanos
     (`template_id = null`) y el calendario mostraba cada clase dos veces.
     Las clases pasadas se quedan: son historia, no plan. */
  const { error: delBlocksErr } = await supabase
    .from('blocks')
    .delete()
    .eq('user_id', user.id)
    .eq('source', 'template')
    .gte('starts_at', dayRangeUtc(todayStr, timezone).start);
  if (delBlocksErr) return { ok: false, error: delBlocksErr.message };

  const { error: delErr } = await supabase.from('schedule_templates').delete().eq('user_id', user.id);
  if (delErr) return { ok: false, error: delErr.message };

  const toInsert = payload.templates.map((t) => ({
    user_id: user.id,
    title: t.title.trim(),
    weekday: t.weekday,
    start_time: t.startTime.length === 5 ? `${t.startTime}:00` : t.startTime,
    end_time: t.endTime.length === 5 ? `${t.endTime}:00` : t.endTime,
    location: t.location?.trim() || null,
    reminder_min: t.reminderMin ?? null,
    context_id: contextMap.get(t.title.trim().toLowerCase()) ?? null,
    active_from: payload.activeFrom,
    active_until: payload.activeUntil || null,
  }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('schedule_templates').insert(toInsert);
    if (insErr) return { ok: false, error: insErr.message };
  }

  /* 2 · El semestre entero de una vez (decisión 54). Si no hay fecha de fin,
     cinco meses, que es lo que dura un semestre. */
  const from = payload.activeFrom > todayStr ? payload.activeFrom : todayStr;
  const until = payload.activeUntil || addDays(from, 150);
  if (until >= from) {
    await materializeScheduleTemplates(supabase, user.id, from, until, timezone);
  }

  revalidatePath('/horario');
  revalidatePath('/calendario');
  revalidatePath('/');
  return { ok: true };
}
