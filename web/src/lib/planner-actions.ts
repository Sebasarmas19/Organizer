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
import type { ItemStatus, Update } from '@/lib/supabase/database.types';
import { getProfileTimezone } from './profile';
import { timeToMinutes, zonedIso } from './tz';
import { addDays } from './date-utils';

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
  notes?: string | null;
};

function reminderRow(input: ReminderInput) {
  const occursOn = cleanDate(input.occursOn);
  if (!occursOn) throw new Error('Un reminder necesita fecha.');
  const notice = input.noticeDays ?? null;
  if (notice !== null && (!Number.isInteger(notice) || notice < 1 || notice > 60)) {
    throw new Error('El aviso tiene que ser entre 1 y 60 días.');
  }
  const time = cleanTime(input.occursAt);
  return {
    title: cleanTitle(input.title),
    occurs_on: occursOn,
    occurs_at: time ? `${time}:00` : null,
    notice_days: notice,
    notes: cleanNotes(input.notes),
  };
}

export async function createReminder(input: ReminderInput): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from('reminders')
    .insert({ user_id: user.id, ...reminderRow(input) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  revalidateAll();
  return { id: data.id };
}

export async function updateReminder(id: string, input: ReminderInput): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('reminders')
    .update(reminderRow(input))
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw new Error(error.message);
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
