/**
 * Organizer · Lecturas de las pantallas de detalle: un reminder con sus
 * tareas, y una tarea con su hora.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { formatDistance, formatWhen } from './home';
import { addDays, getTodayString } from './date-utils';
import { localDateOf, localTimeOf } from './tz';

type Client = SupabaseClient<Database>;

export type ReminderOption = { id: string; title: string; when: string };

export type PlannedTask = {
  id: string;
  title: string;
  dueOn: string | null;
  /** "mar 13 · 15:00", "sin fecha" */
  meta: string;
  done: boolean;
  overdue: boolean;
};

export type ReminderDetail = {
  id: string;
  title: string;
  occursOn: string;
  occursAt: string | null;
  noticeDays: number | null;
  notes: string | null;
  /** "viernes 15 · 10:00" */
  when: string;
  /** "en 6 días", "hoy", "hace 2 días" */
  distance: string;
  past: boolean;
  todayStr: string;
  tasks: PlannedTask[];
  /** Tareas vivas sin reminder: se pueden colgar de este. */
  candidates: { id: string; title: string; meta: string }[];
};

export type TaskDetail = {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  dueOn: string | null;
  time: string | null;
  durationMin: number | null;
  remindBeforeMin: number | null;
  reminderId: string | null;
  todayStr: string;
  reminders: ReminderOption[];
};

const SHORT_DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return `${SHORT_DOW[d.getUTCDay()]} ${d.getUTCDate()}`;
}

/** Hora de inicio de la tarea (su bloque manual), por id de tarea. */
async function taskTimes(
  supabase: Client,
  userId: string,
  itemIds: string[],
  timezone: string
): Promise<Map<string, { time: string; durationMin: number; remindBeforeMin: number | null }>> {
  const out = new Map<string, { time: string; durationMin: number; remindBeforeMin: number | null }>();
  if (itemIds.length === 0) return out;
  const { data } = await supabase
    .from('blocks')
    .select('item_id, starts_at, ends_at, reminder_min')
    .eq('user_id', userId)
    .eq('source', 'manual')
    .in('item_id', itemIds)
    .order('starts_at', { ascending: true });
  for (const b of data ?? []) {
    if (!b.item_id || out.has(b.item_id)) continue;
    out.set(b.item_id, {
      time: localTimeOf(b.starts_at, timezone),
      durationMin: Math.round((Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000),
      remindBeforeMin: b.reminder_min,
    });
  }
  return out;
}

export async function getReminderDetail(
  supabase: Client,
  userId: string,
  id: string,
  timezone: string
): Promise<ReminderDetail | null> {
  const todayStr = getTodayString(timezone);

  const [remRes, tasksRes, candRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days, notes')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('items')
      .select('id, title, due_on, status')
      .eq('user_id', userId)
      .eq('reminder_id', id)
      .neq('status', 'dropped')
      .order('due_on', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('items')
      .select('id, title, due_on, created_at')
      .eq('user_id', userId)
      .is('reminder_id', null)
      .in('status', ['inbox', 'someday', 'planned'])
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  const r = remRes.data;
  if (!r) return null;

  const tasks = tasksRes.data ?? [];
  const times = await taskTimes(supabase, userId, tasks.map((t) => t.id), timezone);

  return {
    id: r.id,
    title: r.title,
    occursOn: r.occurs_on,
    occursAt: r.occurs_at,
    noticeDays: r.notice_days,
    notes: r.notes,
    when: formatWhen(r.occurs_on, r.occurs_at, timezone),
    distance: formatDistance(todayStr, r.occurs_on),
    past: r.occurs_on < todayStr,
    todayStr,
    tasks: tasks.map((t) => {
      const time = times.get(t.id)?.time;
      const done = t.status === 'done';
      return {
        id: t.id,
        title: t.title,
        dueOn: t.due_on,
        meta: t.due_on
          ? [shortDate(t.due_on), time ? time.replace(/^0/, '') : ''].filter(Boolean).join(' · ')
          : 'sin fecha',
        done,
        overdue: !done && Boolean(t.due_on && t.due_on < todayStr),
      };
    }),
    candidates: (candRes.data ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.due_on ? shortDate(t.due_on) : 'sin fecha',
    })),
  };
}

/** Reminders que tiene sentido elegir: los de hoy en adelante. */
export async function getReminderOptions(
  supabase: Client,
  userId: string,
  timezone: string,
  includeId?: string | null
): Promise<ReminderOption[]> {
  const todayStr = getTodayString(timezone);
  const { data } = await supabase
    .from('reminders')
    .select('id, title, occurs_on, occurs_at')
    .eq('user_id', userId)
    .gte('occurs_on', addDays(todayStr, -1))
    .order('occurs_on', { ascending: true })
    .limit(50);
  const list = (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    when: formatWhen(r.occurs_on, r.occurs_at, timezone),
  }));

  if (includeId && !list.some((r) => r.id === includeId)) {
    const { data: one } = await supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at')
      .eq('id', includeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (one) {
      list.unshift({ id: one.id, title: one.title, when: formatWhen(one.occurs_on, one.occurs_at, timezone) });
    }
  }
  return list;
}

export async function getTaskDetail(
  supabase: Client,
  userId: string,
  id: string,
  timezone: string
): Promise<TaskDetail | null> {
  const { data: t } = await supabase
    .from('items')
    .select('id, title, notes, status, due_on, reminder_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!t) return null;

  const [times, reminders] = await Promise.all([
    taskTimes(supabase, userId, [t.id], timezone),
    getReminderOptions(supabase, userId, timezone, t.reminder_id),
  ]);
  const block = times.get(t.id);

  /* Si el bloque cayó en otro día que `due_on` (datos viejos), la hora no
     se ofrece: editarla movería la tarea sin que nadie lo pidiera. */
  let time = block?.time ?? null;
  if (block && t.due_on) {
    const { data: b } = await supabase
      .from('blocks')
      .select('starts_at')
      .eq('item_id', t.id)
      .eq('source', 'manual')
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (b && localDateOf(b.starts_at, timezone) !== t.due_on) time = null;
  }

  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    dueOn: t.due_on,
    time,
    durationMin: block?.durationMin ?? null,
    remindBeforeMin: block?.remindBeforeMin ?? null,
    reminderId: t.reminder_id,
    todayStr: getTodayString(timezone),
    reminders,
  };
}
