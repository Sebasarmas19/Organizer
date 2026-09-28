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

  const bad = payload.templates.find((t) => t.endTime <= t.startTime);
  if (bad) return { ok: false, error: `"${bad.title}": la hora de fin tiene que ser después del inicio.` };

  const timezone = await getProfileTimezone(supabase, user.id);
  const todayStr = getTodayString(timezone);

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
