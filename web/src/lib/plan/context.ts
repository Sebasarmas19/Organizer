/* ============================================================================
   Organizer · Lo que el asistente sabe de ti

   Junta en una sola estructura las próximas dos semanas: clases, tareas con
   y sin hora, reminders (los de 45 días, porque un parcial lejano también
   cuenta), lo que hay en Pendientes, lo atrasado, lo que ya hiciste en las
   dos semanas anteriores (para seguir el ritmo y no proponer lo ya hecho) y
   los huecos libres ya calculados.

   Cada tarea abierta sin hora lleva un id corto ("T3"): si el asistente
   propone hacer justo esa tarea, la nombra por su id y al aceptarla se le
   da hora a ella, no se crea otra igual.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { materializeScheduleTemplates } from '@/lib/calendar';
import { getCurrentTimeMinutes, getTodayString } from '@/lib/date-utils';
import { dayRangeUtc, localDateOf, localTimeOf, timeToMinutes } from '@/lib/tz';
import { addDays, computeFreeSlots, toClock, type Busy, type FreeSlot } from './slots';
import type { TaskRef } from './validate';

export const HORIZON_DAYS = 14;
/* Cuanto hacia atras se mira lo hecho. */
export const DONE_LOOKBACK_DAYS = 14;
const DONE_MAX = 40;
const BACKLOG_MAX = 40;
const OVERDUE_MAX = 20;
const REMINDER_LOOKAHEAD = 45;
/* Un reminder con hora (un parcial a las 10) ocupa al menos esto. */
const REMINDER_BUSY_MIN = 90;

export type PlanDay = {
  date: string;
  agenda: string[];
  looseTasks: string[];
};

export type PlanContext = {
  today: string;
  nowMinutes: number;
  timezone: string;
  days: PlanDay[];
  slots: FreeSlot[];
  upcoming: { date: string; time: string | null; title: string }[];
  backlog: string[];
  /** Tareas con fecha pasada que siguen abiertas: "T9: Leer cap. 2 (era para lun 2026-10-05)". */
  overdue: string[];
  /** Las tareas que el modelo puede nombrar por id, sin hora y abiertas. */
  tasks: TaskRef[];
  /** "lun 2026-09-28: Leer Atomic Habits (40 min)", lo mas reciente primero. */
  done: string[];
  /** "Base de datos: mar 12:00–13:50, jue 12:00–13:50" — para entender apodos. */
  subjects: string[];
};

export async function loadPlanContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone: string
): Promise<PlanContext> {
  const today = getTodayString(timezone);
  const nowMinutes = getCurrentTimeMinutes(timezone);
  const last = addDays(today, HORIZON_DAYS - 1);

  /* Las clases tienen que estar como bloques para contar como ocupadas. */
  await materializeScheduleTemplates(supabase, userId, today, last, timezone);

  const since = addDays(today, -DONE_LOOKBACK_DAYS);

  const [blocksRes, itemsRes, remindersRes, templatesRes, doneRes] = await Promise.all([
    supabase
      .from('blocks')
      .select('title, starts_at, ends_at, source, status, item_id')
      .eq('user_id', userId)
      .neq('status', 'rescheduled')
      .gte('starts_at', dayRangeUtc(today, timezone).start)
      .lt('starts_at', dayRangeUtc(last, timezone).end)
      .order('starts_at', { ascending: true }),
    supabase
      .from('items')
      .select('id, title, status, due_on, reminder_id')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned'])
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at')
      .eq('user_id', userId)
      .gte('occurs_on', today)
      .lte('occurs_on', addDays(today, REMINDER_LOOKAHEAD))
      .order('occurs_on', { ascending: true }),
    supabase
      .from('schedule_templates')
      .select('title, weekday, start_time, end_time')
      .eq('user_id', userId)
      .or(`active_until.is.null,active_until.gte.${today}`)
      .order('weekday', { ascending: true }),
    supabase
      .from('items')
      .select('title, completed_at, estimate_min')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', dayRangeUtc(since, timezone).start)
      .order('completed_at', { ascending: false })
      .limit(DONE_MAX),
  ]);

  const blocks = blocksRes.data ?? [];
  const items = itemsRes.data ?? [];
  const reminders = remindersRes.data ?? [];

  const busy: Busy[] = [];
  const agendaByDay = new Map<string, { at: number; text: string }[]>();
  const add = (date: string, at: number, text: string) => {
    const list = agendaByDay.get(date) ?? [];
    list.push({ at, text });
    agendaByDay.set(date, list);
  };

  for (const b of blocks) {
    const date = localDateOf(b.starts_at, timezone);
    const from = timeToMinutes(localTimeOf(b.starts_at, timezone));
    const endDate = localDateOf(b.ends_at, timezone);
    const to = endDate === date ? timeToMinutes(localTimeOf(b.ends_at, timezone)) : 24 * 60;
    busy.push({ date, from, to });
    const kind = b.source === 'template' ? 'clase' : 'tarea';
    add(date, from, `${toClock(from)}–${toClock(to)} ${kind}: ${b.title}`);
  }

  for (const r of reminders) {
    if (r.occurs_on > last) continue;
    const at = r.occurs_at ? timeToMinutes(r.occurs_at) : -1;
    if (at >= 0) busy.push({ date: r.occurs_on, from: at, to: at + REMINDER_BUSY_MIN });
    add(r.occurs_on, at, `${at >= 0 ? toClock(at) : 'todo el día'} reminder: ${r.title}`);
  }

  const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const blockedItems = new Set(blocks.map((b) => b.item_id).filter(Boolean));
  const reminderDate = new Map(reminders.map((r) => [r.id, r.occurs_on]));

  /* Las tareas sin hora, con su id corto. Las de fecha más lejana que el
     horizonte no se proponen: ya tienen su día. */
  const open = items.filter((t) => !blockedItems.has(t.id) && (!t.due_on || t.due_on <= last));
  const picked = [
    ...open.filter((t) => t.due_on && t.due_on >= today),
    ...open.filter((t) => !t.due_on).slice(0, BACKLOG_MAX),
    ...open.filter((t) => t.due_on && t.due_on < today).slice(0, OVERDUE_MAX),
  ];
  const tasks: TaskRef[] = picked.map((t, i) => ({
    ref: `T${i + 1}`,
    id: t.id,
    title: t.title,
    before: (t.reminder_id && reminderDate.get(t.reminder_id)) || null,
  }));
  const refOf = new Map(tasks.map((t) => [t.id, t.ref]));
  const named = (t: { id: string; title: string }) => `${refOf.get(t.id)}: ${t.title}`;

  const days: PlanDay[] = Array.from({ length: HORIZON_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      agenda: (agendaByDay.get(date) ?? []).sort((a, b) => a.at - b.at).map((x) => x.text),
      looseTasks: picked.filter((t) => t.due_on === date).map(named),
    };
  });

  const bySubject = new Map<string, string[]>();
  for (const t of templatesRes.data ?? []) {
    const list = bySubject.get(t.title) ?? [];
    list.push(`${WD[t.weekday]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`);
    bySubject.set(t.title, list);
  }

  return {
    today,
    nowMinutes,
    timezone,
    days,
    slots: computeFreeSlots({ today, nowMinutes, days: HORIZON_DAYS, busy }),
    upcoming: reminders.map((r) => ({
      date: r.occurs_on,
      time: r.occurs_at ? r.occurs_at.slice(0, 5) : null,
      title: r.title,
    })),
    backlog: picked
      .filter((t) => !t.due_on)
      .map((t) => (t.status === 'someday' ? `${named(t)} (algún día)` : named(t))),
    overdue: picked
      .filter((t) => t.due_on && t.due_on < today)
      .map((t) => {
        const due = t.due_on as string;
        return `${named(t)} (era para ${WD[new Date(due + 'T00:00:00Z').getUTCDay()]} ${due})`;
      }),
    tasks,
    done: (doneRes.data ?? [])
      .filter((t) => t.completed_at)
      .map((t) => {
        const date = localDateOf(t.completed_at as string, timezone);
        const min = t.estimate_min ? ` (${t.estimate_min} min)` : '';
        return `${WD[new Date(date + 'T00:00:00Z').getUTCDay()]} ${date}: ${t.title}${min}`;
      }),
    subjects: [...bySubject].map(([title, times]) => `${title}: ${times.join(', ')}`),
  };
}
