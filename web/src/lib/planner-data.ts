/**
 * Organizer · Lecturas de las pantallas de detalle: un reminder con sus
 * tareas, y una tarea con su hora.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ReminderRecurrence } from '@/lib/supabase/database.types';
import { formatDistance, formatWhen } from './home';
import { addDays, getDayOfWeek, getTodayString, parseDateString } from './date-utils';
import { dayRangeUtc, formatTimeOfDay, localDateOf, localTimeOf } from './tz';
import { getMonthView, type MonthCell, type MonthPreviewItem } from './fd4-calendar';

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

/* El calendario de la pantalla de preparación. Es el mismo mes del módulo
   Calendario, con dos añadidos: qué días se pueden elegir (de hoy al día
   del reminder) y las horas de clase, en gris y sin nombre como en Día
   (#79). NO opina sobre si un día está libre u ocupado: eso lo decide el
   usuario mirando lo que de verdad tiene. */
export type PlanCalCell = MonthCell & {
  /** Entre hoy y el día del reminder, ambos incluidos. */
  selectable: boolean;
  /** El día del propio reminder. */
  isEvent: boolean;
};

export type PlanCalMonth = {
  key: string;
  /** "Octubre 2026" */
  title: string;
  cells: PlanCalCell[];
};

export type PlanCalDay = {
  /** "Sábado 24 de octubre" */
  label: string;
  /** "Hoy", "Mañana" o vacío */
  hint: string;
  events: MonthPreviewItem[];
  /** Franjas de clase ya fusionadas: "7:00 – 10:15" */
  classes: string[];
};

export type PlanCalendar = {
  months: PlanCalMonth[];
  days: Record<string, PlanCalDay>;
};

export type ReminderDetail = {
  id: string;
  title: string;
  occursOn: string;
  occursAt: string | null;
  noticeDays: number | null;
  recurrence: ReminderRecurrence | null;
  reminderMin: number | null;
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
  /** El calendario de hoy al día del reminder. Solo en la pantalla completa. */
  planCal: PlanCalendar | null;
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

/** Une franjas de clase que se tocan (≤15 min de pasillo): "7:00 – 10:15". */
function mergeClassBands(blocks: { starts_at: string; ends_at: string }[], timezone: string): string[] {
  const sorted = [...blocks].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const merged: { start: number; end: number; s: string; e: string }[] = [];
  for (const b of sorted) {
    const start = Date.parse(b.starts_at);
    const end = Date.parse(b.ends_at);
    const last = merged[merged.length - 1];
    if (last && start - last.end <= 15 * 60000) {
      if (end > last.end) {
        last.end = end;
        last.e = b.ends_at;
      }
    } else {
      merged.push({ start, end, s: b.starts_at, e: b.ends_at });
    }
  }
  return merged.map(
    (m) => `${formatTimeOfDay(localTimeOf(m.s, timezone))} – ${formatTimeOfDay(localTimeOf(m.e, timezone))}`
  );
}

/**
 * Los meses que van de hoy al día del reminder (máximo 4), con lo que hay en
 * cada día. Reutiliza `getMonthView` para que sea literalmente el mismo
 * calendario que el del módulo Calendario.
 */
async function buildPlanCalendar(
  supabase: Client,
  userId: string,
  todayStr: string,
  eventStr: string,
  timezone: string
): Promise<PlanCalendar> {
  const months: { year: number; month: number }[] = [];
  let { year, month } = parseDateString(todayStr);
  const end = parseDateString(eventStr);
  while ((year < end.year || (year === end.year && month <= end.month)) && months.length < 4) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  const views = await Promise.all(
    months.map((m) => getMonthView(supabase, userId, m.year, m.month, todayStr, timezone))
  );

  const firstStr = views[0].cells[0].dateStr;
  const lastView = views[views.length - 1];
  const lastStr = lastView.cells[lastView.cells.length - 1].dateStr;

  /* getMonthView ya materializó las plantillas de esos rangos. */
  const { data: classBlocks } = await supabase
    .from('blocks')
    .select('starts_at, ends_at')
    .eq('user_id', userId)
    .eq('source', 'template')
    .gte('starts_at', dayRangeUtc(firstStr, timezone).start)
    .lt('starts_at', dayRangeUtc(lastStr, timezone).end);

  const classesByDay = new Map<string, { starts_at: string; ends_at: string }[]>();
  for (const b of classBlocks ?? []) {
    const d = localDateOf(b.starts_at, timezone);
    const list = classesByDay.get(d) ?? [];
    list.push(b);
    classesByDay.set(d, list);
  }

  const days: Record<string, PlanCalDay> = {};
  const planMonths: PlanCalMonth[] = views.map((v) => ({
    key: `${v.year}-${v.month}`,
    title: v.title,
    cells: v.cells.map((c) => {
      const selectable = c.dateStr >= todayStr && c.dateStr <= eventStr;
      if (selectable && !days[c.dateStr]) {
        const p = v.previews[c.dateStr];
        days[c.dateStr] = {
          label: p?.label ?? c.dateStr,
          hint: p?.hint ?? '',
          events: p?.events ?? [],
          classes: mergeClassBands(classesByDay.get(c.dateStr) ?? [], timezone),
        };
      }
      return { ...c, isSelected: false, selectable, isEvent: c.dateStr === eventStr };
    }),
  }));

  return { months: planMonths, days };
}

export async function getReminderDetail(
  supabase: Client,
  userId: string,
  id: string,
  timezone: string,
  opts: { withCalendar?: boolean } = {}
): Promise<ReminderDetail | null> {
  const todayStr = getTodayString(timezone);

  const [remRes, tasksRes, candRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days, recurrence, reminder_min, notes')
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
  const [times, planCal] = await Promise.all([
    taskTimes(supabase, userId, tasks.map((t) => t.id), timezone),
    opts.withCalendar && r.occurs_on >= todayStr
      ? buildPlanCalendar(supabase, userId, todayStr, r.occurs_on, timezone).catch(() => null)
      : Promise.resolve(null),
  ]);

  return {
    id: r.id,
    title: r.title,
    occursOn: r.occurs_on,
    occursAt: r.occurs_at,
    noticeDays: r.notice_days,
    recurrence: r.recurrence as ReminderRecurrence | null,
    reminderMin: r.reminder_min,
    notes: r.notes,
    when: formatWhen(r.occurs_on, r.occurs_at, timezone),
    distance: formatDistance(todayStr, r.occurs_on),
    past: r.occurs_on < todayStr,
    todayStr,
    planCal,
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
export type ScheduleSubject = {
  title: string;
  weekday: number;
  startTime: string;
  location?: string | null;
};

export type NextClassInfo = {
  title: string;
  nextDate: string;
  dayLabel: string;
  time: string;
};

export function getUpcomingClasses(
  subjects: ScheduleSubject[],
  todayStr: string,
  nowMinutes?: number
): NextClassInfo[] {
  if (!subjects || subjects.length === 0) return [];
  const currentDow = getDayOfWeek(todayStr);

  const byTitle = new Map<string, ScheduleSubject[]>();
  for (const s of subjects) {
    const list = byTitle.get(s.title) ?? [];
    list.push(s);
    byTitle.set(s.title, list);
  }

  const result: NextClassInfo[] = [];

  for (const [title, slots] of byTitle.entries()) {
    let bestDate = '';
    let bestSlot: ScheduleSubject | null = null;
    let minDiff = 999;

    for (const slot of slots) {
      let diff = (slot.weekday - currentDow + 7) % 7;
      if (diff === 0 && nowMinutes != null) {
        const [hh, mm] = slot.startTime.split(':').map(Number);
        const classMin = hh * 60 + mm;
        if (nowMinutes >= classMin) {
          diff = 7;
        }
      }

      if (diff < minDiff) {
        minDiff = diff;
        bestSlot = slot;
        bestDate = addDays(todayStr, diff);
      }
    }

    if (bestSlot && bestDate) {
      let dayLabel = '';
      if (minDiff === 0) dayLabel = 'Hoy';
      else if (minDiff === 1) dayLabel = 'Mañana';
      else {
        const dow = getDayOfWeek(bestDate);
        const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        dayLabel = names[dow] || 'Próxima clase';
      }

      result.push({
        title,
        nextDate: bestDate,
        dayLabel,
        time: bestSlot.startTime,
      });
    }
  }

  return result;
}

export async function getScheduleSubjects(
  supabase: Client,
  userId: string
): Promise<ScheduleSubject[]> {
  const { data } = await supabase
    .from('schedule_templates')
    .select('title, weekday, start_time, location')
    .eq('user_id', userId)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });
  return (data ?? []).map((t) => ({
    title: t.title,
    weekday: t.weekday,
    startTime: (t.start_time || '08:00').slice(0, 5),
    location: t.location,
  }));
}

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
      .eq('user_id', userId)
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
