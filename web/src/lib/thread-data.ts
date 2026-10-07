/* ============================================================================
   Organizer · Lo que paso hoy, para el hilo de Inicio

   Tres consultas en paralelo, todas acotadas al dia local del usuario:

     notification_log  -> los avisos que LLEGARON (status 'sent'). La politica
                          RLS "own notification log" deja leerlos.
     items creados     -> lo que anotaste (Atajo, campo de Inicio, formulario)
     items cerrados    -> lo que marcaste hecho

   El orden y la forma los decide `lib/thread.ts`, que es puro.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { dayRangeUtc } from './tz';
import type { DayLog } from './thread';

/** Mas que esto en un dia ya no es un hilo, es un historial: Pendientes. */
const MAX_MINE = 8;
const MAX_NOTICES = 24;

function payloadText(payload: unknown): { title: string; body: string } {
  if (!payload || typeof payload !== 'object') return { title: '', body: '' };
  const p = payload as { title?: unknown; body?: unknown };
  return {
    title: typeof p.title === 'string' ? p.title : '',
    body: typeof p.body === 'string' ? p.body : '',
  };
}

export async function getDayLog(
  supabase: SupabaseClient<Database>,
  userId: string,
  todayStr: string,
  timezone: string
): Promise<DayLog> {
  const { start, end } = dayRangeUtc(todayStr, timezone);

  const [logRes, createdRes, doneRes] = await Promise.all([
    supabase
      .from('notification_log')
      .select('id, kind, payload, sent_at')
      .eq('user_id', userId)
      .eq('status', 'sent')
      .gte('sent_at', start)
      .lt('sent_at', end)
      .order('sent_at', { ascending: true })
      .limit(MAX_NOTICES),

    supabase
      .from('items')
      .select('id, title, status, due_on, created_at')
      .eq('user_id', userId)
      .neq('status', 'dropped')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .limit(MAX_MINE),

    supabase
      .from('items')
      .select('id, title, completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', start)
      .lt('completed_at', end)
      .order('completed_at', { ascending: false })
      .limit(MAX_MINE),
  ]);

  const log = logRes.data ?? [];
  const morning = log.find((n) => n.kind === 'morning');
  const review = log.find((n) => n.kind === 'weekly_review');

  return {
    morningAt: morning?.sent_at ?? null,
    reviewAt: review?.sent_at ?? null,
    notices: log
      .map((n) => ({ id: n.id, kind: n.kind, at: n.sent_at, ...payloadText(n.payload) }))
      .filter((n) => n.title || n.body),
    created: (createdRes.data ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      dueOn: c.due_on,
      at: c.created_at,
    })),
    completed: (doneRes.data ?? [])
      .filter((d): d is typeof d & { completed_at: string } => Boolean(d.completed_at))
      .map((d) => ({ id: d.id, title: d.title, at: d.completed_at })),
  };
}
