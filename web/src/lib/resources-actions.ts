'use server';

/* ============================================================================
   Organizer · Server Actions para el Módulo de Recursos
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ResourceKind } from './fd4-resources';

export interface CreateResourcePayload {
  title: string;
  url?: string;
  kind?: ResourceKind;
  notes?: string;
  tags?: string[];
}

export async function createResourceAction(payload: CreateResourcePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const title = payload.title.trim();
  if (!title) throw new Error('El título es obligatorio');

  const url = payload.url?.trim() || null;
  const kind = payload.kind ?? 'other';
  const notes = payload.notes?.trim() || null;
  const tags = (payload.tags ?? [])
    .map((t) => t.trim().replace(/^#/, ''))
    .filter(Boolean);

  const { error } = await supabase.from('resources').insert({
    user_id: user.id,
    title,
    url,
    kind,
    notes,
    tags,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/recursos');
}

export async function trackResourceOpenAction(resourceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  // Incrementar open_count y fijar opened_at
  const { data: current } = await supabase
    .from('resources')
    .select('open_count')
    .eq('id', resourceId)
    .eq('user_id', user.id)
    .single();

  const newCount = (current?.open_count ?? 0) + 1;

  await supabase
    .from('resources')
    .update({
      open_count: newCount,
      opened_at: new Date().toISOString(),
    })
    .eq('id', resourceId)
    .eq('user_id', user.id);

  revalidatePath('/recursos');
}

export async function deleteResourceAction(resourceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('resources')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', resourceId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);

  revalidatePath('/recursos');
}

/**
 * El Puente (docs/06-recursos.md):
 * Convierte un recurso en una tarea planificada en `items` ("leer esto el martes").
 */
export async function planResourceAction(resourceId: string, title: string, dueOn: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const taskTitle = `Consultar: ${title.trim()}`;

  const { error } = await supabase.from('items').insert({
    user_id: user.id,
    title: taskTitle,
    status: 'planned',
    due_on: dueOn,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/recursos');
  revalidatePath('/pendientes');
  revalidatePath('/');
}
