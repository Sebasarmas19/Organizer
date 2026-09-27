'use server';

/* ============================================================================
   Organizer · Server Actions para el Módulo de Recursos
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isValidHttpUrl } from '@/lib/security';
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

  const title = payload.title.trim().slice(0, 300);
  if (!title) throw new Error('El título es obligatorio');

  const rawUrl = payload.url?.trim() || null;
  let url: string | null = null;
  if (rawUrl) {
    if (rawUrl.length > 2048) {
      throw new Error('La URL excede el límite de 2048 caracteres');
    }
    if (!isValidHttpUrl(rawUrl)) {
      throw new Error('La URL debe comenzar con http:// o https://');
    }
    url = rawUrl;
  }

  const kind = payload.kind ?? 'other';
  const notes = payload.notes?.trim().slice(0, 2000) || null;
  const tags = (payload.tags ?? [])
    .map((t) => t.trim().replace(/^#/, '').slice(0, 50))
    .filter(Boolean)
    .slice(0, 20);

  const { error } = await supabase.from('resources').insert({
    user_id: user.id,
    title,
    url,
    kind,
    notes,
    tags,
  });

  if (error) {
    throw new Error('Error al registrar el recurso');
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

/** Deshace el archivado: el recurso vuelve a la biblioteca tal cual. */
export async function restoreResourceAction(resourceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { error } = await supabase
    .from('resources')
    .update({ archived_at: null })
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
