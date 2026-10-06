/* ============================================================================
   Organizer · Lo que el asistente sabe de ti

   Junta en una sola estructura las próximas dos semanas: clases, tareas con
   y sin hora, reminders (los de 45 días, porque un parcial lejano también
   cuenta), lo que hay en Pendientes y los huecos libres ya calculados.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { materializeScheduleTemplates } from '@/lib/calendar';
import { getCurrentTimeMinutes, getTodayString } from '@/lib/date-utils';
import { dayRangeUtc, localDateOf, localTimeOf, timeToMinutes } from '@/lib/tz';
import { addDays, computeFreeSlots, toClock, type Busy, type FreeSlot } from './slots';

export const HORIZON_DAYS = 14;
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

  const [blocksRes, itemsRes, remindersRes] = await Promise.all([
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
      .select('id, title, status, due_on')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned'])
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('reminders')
      .select('title, occurs_on, occurs_at')
      .eq('user_id', userId)
      .gte('occurs_on', today)
      .lte('occurs_on', addDays(today, REMINDER_LOOKAHEAD))
      .order('occurs_on', { ascending: true }),
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

  const blockedItems = new Set(blocks.map((b) => b.item_id).filter(Boolean));
  const days: PlanDay[] = Array.from({ length: HORIZON_DAYS }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      agenda: (agendaByDay.get(date) ?? []).sort((a, b) => a.at - b.at).map((x) => x.text),
      looseTasks: items
        .filter((t) => t.due_on === date && !blockedItems.has(t.id))
        .map((t) => t.title),
    };
  });

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
    backlog: items
      .filter((t) => !t.due_on)
      .slice(0, 40)
      .map((t) => (t.status === 'someday' ? `${t.title} (algún día)` : t.title)),
  };
}
