'use server';

/* ============================================================================
   Organizer · Server Actions para el Calendario (F2)
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { materializeScheduleTemplates } from './calendar';
import { addDays, getTodayString } from './date-utils';

/**
 * Guarda un nuevo reminder (decisiones 49, 60, 70).
 * Fecha obligatoria, sin estado de completado, aviso anticipado 1 día por defecto.
 */
export async function createReminderAction(formData: {
  title: string;
  occurs_on: string;
  occurs_at?: string | null;
  notice_days?: number | null;
  notes?: string | null;
  context_id?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };
  if (!formData.title.trim()) return { ok: false, error: 'El título es obligatorio' };
  if (!formData.occurs_on) return { ok: false, error: 'La fecha es obligatoria' };

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    title: formData.title.trim(),
    occurs_on: formData.occurs_on,
    occurs_at: formData.occurs_at || null,
    notice_days: formData.notice_days !== undefined ? formData.notice_days : 1,
    notes: formData.notes?.trim() || null,
    context_id: formData.context_id || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/dia');
  revalidatePath('/semana');
  revalidatePath('/mes');
  return { ok: true };
}

/**
 * Planifica tareas anotadas y/o crea una nueva tarea para un día específico
 * (decisión 71, estado de tarea de anadir.html).
 */
export async function planTasksAction(data: {
  dateStr: string;
  itemIds: string[];
  newTaskTitle?: string | null;
  startTimeStr?: string | null; // e.g. "15:00"
  durationMin?: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };

  const startTime = data.startTimeStr || '09:00';
  const duration = data.durationMin || 60;

  // 1. Si hay nueva tarea escrita
  if (data.newTaskTitle && data.newTaskTitle.trim()) {
    const { data: newItem, error: newErr } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        title: data.newTaskTitle.trim(),
        status: 'planned',
      })
      .select('id, title, context_id')
      .single();

    if (newErr) return { ok: false, error: newErr.message };

    const startISO = new Date(`${data.dateStr}T${startTime}:00-04:00`).toISOString();
    const endMinutes = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10) + duration;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
    const endM = String(endMinutes % 60).padStart(2, '0');
    const endISO = new Date(`${data.dateStr}T${endH}:${endM}:00-04:00`).toISOString();

    await supabase.from('blocks').insert({
      user_id: user.id,
      item_id: newItem.id,
      title: newItem.title,
      context_id: newItem.context_id,
      starts_at: startISO,
      ends_at: endISO,
      status: 'pending',
      source: 'manual',
    });
  }

  // 2. Para cada tarea seleccionada de lo ya anotado
  if (data.itemIds.length > 0) {
    const { data: selectedItems } = await supabase
      .from('items')
      .select('id, title, context_id')
      .in('id', data.itemIds)
      .eq('user_id', user.id);

    if (selectedItems && selectedItems.length > 0) {
      let curStartMin = parseInt(startTime.split(':')[0], 10) * 60 + parseInt(startTime.split(':')[1], 10);

      const blocksToInsert = selectedItems.map((item) => {
        const startH = String(Math.floor(curStartMin / 60)).padStart(2, '0');
        const startM = String(curStartMin % 60).padStart(2, '0');
        const endMinutes = curStartMin + duration;
        const endH = String(Math.floor(endMinutes / 60)).padStart(2, '0');
        const endM = String(endMinutes % 60).padStart(2, '0');

        curStartMin = endMinutes; // Siguiente bloque a continuación

        return {
          user_id: user.id,
          item_id: item.id,
          title: item.title,
          context_id: item.context_id,
          starts_at: new Date(`${data.dateStr}T${startH}:${startM}:00-04:00`).toISOString(),
          ends_at: new Date(`${data.dateStr}T${endH}:${endM}:00-04:00`).toISOString(),
          status: 'pending' as const,
          source: 'manual' as const,
        };
      });

      await supabase.from('blocks').insert(blocksToInsert);

      // Actualizar status de los items a 'planned'
      await supabase
        .from('items')
        .update({ status: 'planned' })
        .in('id', data.itemIds)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/dia');
  revalidatePath('/semana');
  return { ok: true };
}

/**
 * Marca o desmarca un bloque de tarea como cumplido
 */
export async function toggleBlockStatusAction(
  blockId: string,
  newStatus: 'done' | 'pending'
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: block, error } = await supabase
    .from('blocks')
    .update({ status: newStatus })
    .eq('id', blockId)
    .eq('user_id', user.id)
    .select('item_id')
    .single();

  if (error) return { ok: false, error: error.message };

  if (block?.item_id) {
    await supabase
      .from('items')
      .update({
        status: newStatus === 'done' ? 'done' : 'planned',
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', block.item_id)
      .eq('user_id', user.id);
  }

  revalidatePath('/dia');
  revalidatePath('/semana');
  return { ok: true };
}

/**
 * Guarda las plantillas de materias del horario (`schedule_templates`)
 * y materializa de una vez los 5 meses del semestre (decisión 54).
 */
export async function saveScheduleTemplatesAction(payload: {
  activeFrom: string;
  activeUntil: string;
  templates: {
    title: string;
    weekday: number; // 0=dom, 1=lun, ..., 6=sab
    startTime: string; // "08:00"
    endTime: string; // "10:00"
    reminderMin?: number | null;
  }[];
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'No autenticado' };

  // 1. Eliminar plantillas anteriores del usuario
  await supabase.from('schedule_templates').delete().eq('user_id', user.id);

  // 2. Insertar nuevas plantillas
  const toInsert = payload.templates.map((t) => ({
    user_id: user.id,
    title: t.title.trim(),
    weekday: t.weekday,
    start_time: t.startTime.length === 5 ? `${t.startTime}:00` : t.startTime,
    end_time: t.endTime.length === 5 ? `${t.endTime}:00` : t.endTime,
    reminder_min: t.reminderMin ?? null,
    active_from: payload.activeFrom,
    active_until: payload.activeUntil || null,
  }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('schedule_templates').insert(toInsert);
    if (insErr) return { ok: false, error: insErr.message };
  }

  // 3. Materializar para las próximas semanas
  const todayStr = getTodayString('America/Caracas');
  const horizonEnd = addDays(todayStr, 35); // 5 semanas iniciales de bloques
  await materializeScheduleTemplates(supabase, user.id, todayStr, horizonEnd, 'America/Caracas');

  revalidatePath('/dia');
  revalidatePath('/semana');
  revalidatePath('/horario');
  return { ok: true };
}
