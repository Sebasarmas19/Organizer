'use server';

/* ============================================================================
   Organizer · Planificar: crear y editar reminders y tareas

   Lo que faltaba para poder usar la app: hasta aquí solo se podía capturar,
   marcar y mover a un día. Ahora:

     · un reminder se crea con fecha (obligatoria), hora y aviso opcionales
     · una tarea se edita entera: fecha cualquiera, hora, duración, aviso
       antes, a qué reminder prepara, notas
     · una tarea con hora ocupa un bloque en el calendario. El bloque es
       derivado: se borra y se vuelve a crear cada vez que cambia la hora, así
       nunca hay dos versiones de la misma tarea en el riel.

   Todo pasa por el cliente del usuario, con RLS.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ItemStatus, ReminderRecurrence, Update } from '@/lib/supabase/database.types';
import { getProfileTimezone } from './profile';
import { getTaskDetail, getReminderDetail, type TaskDetail, type ReminderDetail, getScheduleSubjects, type ScheduleSubject } from './planner-data';
import { timeToMinutes, zonedIso } from './tz';
import { addDays, computeNextOccurrence } from './date-utils';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

function revalidateAll() {
  revalidatePath('/', 'layout');
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  return { supabase, user };
}

function cleanTitle(raw: string): string {
  const title = raw.trim().replace(/\s+/g, ' ');
  if (!title) throw new Error('Ponle un título.');
  if (title.length > 200) throw new Error('El título es demasiado largo (máx. 200).');
  return title;
}

function cleanDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!DATE_RE.test(raw)) throw new Error('Fecha no válida.');
  return raw;
}

function cleanTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!TIME_RE.test(raw)) throw new Error('Hora no válida.');
  return raw.slice(0, 5);
}

function cleanNotes(raw: string | null | undefined): string | null {
  const notes = raw?.trim();
  return notes ? notes.slice(0, 2000) : null;
}

/* ═════════════════════════════════════════════════════════════ reminders ══ */

export type ReminderInput = {
  title: string;
  occursOn: string;
  occursAt?: string | null;
  /** Días de anticipación para que encabece la notificación. Null = 1. */
  noticeDays?: number | null;
  /** Recurrencia periódica: daily, weekly, monthly, yearly. Null = no se repite. */
  recurrence?: ReminderRecurrence | null;
  /** Minutos de anticipación para notificación push antes del evento (0, 10, 15, 30, 60, 120). */
  reminderMin?: number | null;
  notes?: string | null;
};

function reminderRow(input: ReminderInput) {
  const occursOn = cleanDate(input.occursOn);
  if (!occursOn) throw new Error('Un reminder necesita fecha.');
  const notice = input.noticeDays ?? null;
  if (notice !== null && (!Number.isInteger(notice) || notice < 1 || notice > 60)) {
    throw new Error('El aviso tiene que ser entre 1 y 60 días.');
  }
  const recurrence = input.recurrence ?? null;
  if (recurrence !== null && !['daily', 'weekly', 'monthly', 'yearly'].includes(recurrence)) {
    throw new Error('Recurrencia no válida.');
  }
  const reminderMin = input.reminderMin !== undefined && input.reminderMin !== null ? Number(input.reminderMin) : null;
  if (reminderMin !== null && (!Number.isInteger(reminderMin) || reminderMin < 0)) {
    throw new Error('El aviso previo tiene que ser un número mayor o igual a 0 minutos.');
  }
  const time = cleanTime(input.occursAt);
  return {
    title: cleanTitle(input.title),
    occurs_on: occursOn,
    occurs_at: time ? `${time}:00` : null,
    notice_days: notice,
    recurrence,
    reminder_min: reminderMin,
    notes: cleanNotes(input.notes),
  };
}

/**
 * El bloque en `blocks` para un reminder con hora.
 * Permite que aparezca en el calendario y que el despachador de notificaciones
 * push avise "15 min antes", "30 min antes", etc.
 */
async function syncReminderBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  reminderId: string,
  title: string,
  contextId: string | null,
  occursOn: string,
  occursAt: string | null,
  reminderMin: number | null | undefined
): Promise<void> {
  const { error: delErr } = await supabase
    .from('blocks')
    .delete()
    .eq('user_id', userId)
    .eq('reminder_id', reminderId);
  if (delErr) throw new Error(delErr.message);

  if (!occursAt) return;

  const timezone = await getProfileTimezone(supabase, userId);
  const time = occursAt.slice(0, 5);
  const startMin = timeToMinutes(time);
  const endTotal = startMin + 60; // Duración estándar de 1h
  const endDate = endTotal >= 24 * 60 ? addDays(occursOn, 1) : occursOn;
  const endMin = endTotal % (24 * 60);
  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  const { error } = await supabase.from('blocks').insert({
    user_id: userId,
    reminder_id: reminderId,
    item_id: null,
    title,
    context_id: contextId,
    starts_at: zonedIso(occursOn, time, timezone),
    ends_at: zonedIso(endDate, endTime, timezone),
    status: 'pending',
    source: 'manual',
    reminder_min: reminderMin !== null && reminderMin !== undefined && reminderMin >= 0 ? reminderMin : null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Revisa los recordatorios recurrentes que hayan quedado en el pasado
 * y los adelanta al ciclo actual o próximo.
 */
export async function advancePastRecurringReminders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  todayStr: string
): Promise<void> {
  const { data: pastReminders } = await supabase
    .from('reminders')
    .select('id, title, occurs_on, occurs_at, recurrence, reminder_min, context_id')
    .eq('user_id', userId)
    .not('recurrence', 'is', null)
    .lt('occurs_on', todayStr);

  if (!pastReminders || pastReminders.length === 0) return;

  for (const rem of pastReminders) {
    if (!rem.recurrence) continue;
    const nextOccursOn = computeNextOccurrence(
      rem.occurs_on,
      rem.recurrence as ReminderRecurrence,
      todayStr
    );
    if (nextOccursOn !== rem.occurs_on) {
      await supabase
        .from('reminders')
        .update({ occurs_on: nextOccursOn })
        .eq('id', rem.id)
        .eq('user_id', userId);

      await syncReminderBlock(
        supabase,
        userId,
        rem.id,
        rem.title,
        rem.context_id,
        nextOccursOn,
        rem.occurs_at,
        rem.reminder_min
      );
    }
  }
}

export async function createReminder(input: ReminderInput): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const row = reminderRow(input);
  const { data, error } = await supabase
    .from('reminders')
    .insert({ user_id: user.id, ...row })
    .select('id, context_id')
    .single();
  if (error) throw new Error(error.message);

  await syncReminderBlock(
    supabase,
    user.id,
    data.id,
    row.title,
    data.context_id,
    row.occurs_on,
    row.occurs_at,
    row.reminder_min
  );

  revalidateAll();
  return { id: data.id };
}

export async function updateReminder(id: string, input: ReminderInput): Promise<void> {
  const { supabase, user } = await requireUser();
  const row = reminderRow(input);
  const { data, error } = await supabase
    .from('reminders')
    .update(row)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('context_id')
    .single();
  if (error) throw new Error(error.message);

  await syncReminderBlock(
    supabase,
    user.id,
    id,
    row.title,
    data?.context_id ?? null,
    row.occurs_on,
    row.occurs_at,
    row.reminder_min
  );

  revalidateAll();
}

/* ═════════════════════════════════════════════════════════════════ tareas ══ */

export type TaskInput = {
  title: string;
  dueOn?: string | null;
  /** `HH:MM`. Solo cuenta si hay fecha. */
  time?: string | null;
  durationMin?: number | null;
  /** Minutos antes de la hora para mandar un aviso. Solo si hay hora. */
  remindBeforeMin?: number | null;
  reminderId?: string | null;
  notes?: string | null;
};

const DEFAULT_DURATION = 60;

/**
 * El bloque del calendario que representa la hora de la tarea.
 * Se reemplaza entero: borrar y crear es más simple y más difícil de romper
 * que calcular qué cambió.
 */
async function syncTaskBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemId: string,
  title: string,
  contextId: string | null,
  dueOn: string | null,
  time: string | null,
  durationMin: number | null | undefined,
  remindBeforeMin: number | null | undefined,
  done: boolean
): Promise<void> {
  const { error: delErr } = await supabase
    .from('blocks')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .eq('source', 'manual');
  if (delErr) throw new Error(delErr.message);

  if (!dueOn || !time) return;

  const timezone = await getProfileTimezone(supabase, userId);
  const duration = Math.max(15, Math.min(durationMin ?? DEFAULT_DURATION, 12 * 60));
  const startMin = timeToMinutes(time);
  const endTotal = startMin + duration;
  /* Si se pasa de medianoche, el bloque termina al día siguiente. */
  const endDate = endTotal >= 24 * 60 ? addDays(dueOn, 1) : dueOn;
  const endMin = endTotal % (24 * 60);
  const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

  const { error } = await supabase.from('blocks').insert({
    user_id: userId,
    item_id: itemId,
    title,
    context_id: contextId,
    starts_at: zonedIso(dueOn, time, timezone),
    ends_at: zonedIso(endDate, endTime, timezone),
    status: done ? 'done' : 'pending',
    source: 'manual',
    reminder_min: remindBeforeMin && remindBeforeMin > 0 ? remindBeforeMin : null,
  });
  if (error) throw new Error(error.message);
}

export async function createTask(input: TaskInput): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const title = cleanTitle(input.title);
  const dueOn = cleanDate(input.dueOn);
  const time = dueOn ? cleanTime(input.time) : null;

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      title,
      /* Con fecha ya está planificada. Sin fecha, pero creada a propósito
         (desde un reminder), ya está clasificada: no va al clasificador. */
      status: dueOn ? 'planned' : 'someday',
      due_on: dueOn,
      reminder_id: input.reminderId || null,
      notes: cleanNotes(input.notes),
    })
    .select('id, context_id')
    .single();
  if (error) throw new Error(error.message);

  if (time) {
    await syncTaskBlock(
      supabase, user.id, data.id, title, data.context_id, dueOn, time,
      input.durationMin, input.remindBeforeMin, false
    );
  }

  revalidateAll();
  return { id: data.id };
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: current, error: readErr } = await supabase
    .from('items')
    .select('status, context_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!current) throw new Error('Esa tarea ya no existe.');

  const title = cleanTitle(input.title);
  const dueOn = cleanDate(input.dueOn);
  const time = dueOn ? cleanTime(input.time) : null;
  const done = current.status === 'done';

  let status: ItemStatus = current.status as ItemStatus;
  if (!done && status !== 'dropped') status = dueOn ? 'planned' : 'someday';

  const patch: Update<'items'> = {
    title,
    due_on: dueOn,
    reminder_id: input.reminderId || null,
    notes: cleanNotes(input.notes),
    status,
  };

  const { error } = await supabase.from('items').update(patch).eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);

  await syncTaskBlock(
    supabase, user.id, id, title, current.context_id, dueOn, time,
    input.durationMin, input.remindBeforeMin, done
  );

  revalidateAll();
}

/** Soltar: no se hará, pero queda en el historial. No es borrar. */
export async function dropTask(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('items')
    .update({ status: 'dropped', dropped_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  await supabase.from('blocks').delete().eq('item_id', id).eq('user_id', user.id).eq('source', 'manual');
  revalidateAll();
}

/** Borrar de verdad. Los bloques caen solos (`on delete cascade`). */
export async function deleteTask(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('items').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidateAll();
}

/** Colgar (o descolgar) una tarea que ya existe de un reminder. */
export async function linkTaskToReminder(taskId: string, reminderId: string | null): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('items')
    .update({ reminder_id: reminderId })
    .eq('id', taskId)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidateAll();
}

/** Carga los datos completos de una tarea para la hoja modal sin cambiar de URL. */
export async function getTaskForSheet(id: string): Promise<TaskDetail | null> {
  const { supabase, user } = await requireUser();
  const timezone = await getProfileTimezone(supabase, user.id);
  return getTaskDetail(supabase, user.id, id, timezone);
}

/** Carga los datos completos de un recordatorio para la hoja modal sin cambiar de URL. */
export async function getReminderForSheet(id: string): Promise<ReminderDetail | null> {
  const { supabase, user } = await requireUser();
  const timezone = await getProfileTimezone(supabase, user.id);
  return getReminderDetail(supabase, user.id, id, timezone);
}

/**
 * Marca un reminder como entregado/listo antes de tiempo (Decisión #61).
 * Completa todas sus tareas hijas (o inserta una completada si no había).
 * Esto hace que se trate como 'todo preparado' y silencia las alertas push previas
 * sin borrar el evento del historial.
 */
export async function markReminderCompletedAction(reminderId: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: childItems, error: itemsErr } = await supabase
    .from('items')
    .select('id, status')
    .eq('reminder_id', reminderId)
    .eq('user_id', user.id);

  if (itemsErr) throw new Error(itemsErr.message);

  const nowIso = new Date().toISOString();

  if (childItems && childItems.length > 0) {
    await supabase
      .from('items')
      .update({ status: 'done', completed_at: nowIso })
      .eq('reminder_id', reminderId)
      .eq('user_id', user.id);
  } else {
    await supabase
      .from('items')
      .insert({
        user_id: user.id,
        reminder_id: reminderId,
        title: 'Entregado',
        status: 'done',
        completed_at: nowIso,
      });
  }

  await supabase
    .from('blocks')
    .update({ status: 'done' })
    .eq('reminder_id', reminderId)
    .eq('user_id', user.id);

  revalidateAll();
}

export async function getScheduleSubjectsAction(): Promise<ScheduleSubject[]> {
  const { supabase, user } = await requireUser();
  return getScheduleSubjects(supabase, user.id);
}
