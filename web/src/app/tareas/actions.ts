'use server';

/* ============================================================================
   Organizer · Server Actions para el modulo Tareas (F1)
   Maneja creacion, estado, asociacion a reminders y CRUD de contextos.
   Todas las mutaciones pasan por el cliente de usuario con RLS.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ContextKind, ItemStatus, Update } from '@/lib/supabase/database.types';

export async function createTaskAction(formData: {
  title: string;
  due_on?: string | null;
  reminder_id?: string | null;
  context_id?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('No autorizado');
  }

  const title = formData.title?.trim();
  if (!title) {
    throw new Error('El titulo de la tarea es obligatorio');
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      title,
      status: 'inbox',
      due_on: formData.due_on || null,
      reminder_id: formData.reminder_id || null,
      context_id: formData.context_id || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/tareas');
  return data;
}

export async function toggleTaskAction(id: string, nextChecked: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('items')
    .update({
      status: nextChecked ? 'done' : 'inbox',
      completed_at: nextChecked ? new Date().toISOString() : null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function updateTaskAction(
  id: string,
  updates: {
    title?: string;
    due_on?: string | null;
    reminder_id?: string | null;
    context_id?: string | null;
    status?: ItemStatus;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const patch: Update<'items'> = {};
  if (updates.title !== undefined) patch.title = updates.title.trim();
  if (updates.due_on !== undefined) patch.due_on = updates.due_on;
  if (updates.reminder_id !== undefined) patch.reminder_id = updates.reminder_id;
  if (updates.context_id !== undefined) patch.context_id = updates.context_id;
  if (updates.status !== undefined) patch.status = updates.status;

  const { error } = await supabase.from('items').update(patch).eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function dropTaskAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('items')
    .update({
      status: 'dropped',
      dropped_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function deleteTaskAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase.from('items').delete().eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function associateTaskToReminderAction(taskId: string, reminderId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('items')
    .update({ reminder_id: reminderId })
    .eq('id', taskId);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

/* ------------------------------------------------------------- CRUD Contextos */

export async function createContextAction(name: string, kind: ContextKind = 'personal') {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const trimmed = name.trim();
  if (!trimmed) throw new Error('El nombre de la carpeta es obligatorio');

  const { data, error } = await supabase
    .from('contexts')
    .insert({
      user_id: user.id,
      name: trimmed,
      kind,
      color: null, // Decision 66: contexts son texto sin color
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
  return data;
}

export async function updateContextAction(
  id: string,
  updates: { name?: string; kind?: ContextKind }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const patch: Update<'contexts'> = {};
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.kind !== undefined) patch.kind = updates.kind;

  const { error } = await supabase.from('contexts').update(patch).eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function archiveContextAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('contexts')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}

export async function deleteContextAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  // Primero desasociamos las tareas de este contexto para no romper nada
  await supabase.from('items').update({ context_id: null }).eq('context_id', id);

  const { error } = await supabase.from('contexts').delete().eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tareas');
}
