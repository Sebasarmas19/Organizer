/* ============================================================================
   Organizer · F4 · Lo que necesita el ritual del domingo

   Una sola llamada con todo lo que se ve en los cuatro pasos:

     1. Lo que quedo     -> tareas con dia ya pasado y sin cerrar
     2. La semana        -> parciales y entregas (solo de lectura, #62) y
                            cuanto pesa cada dia: clases y tareas
     3. Lo anotado       -> DOS capturas sin planificar, nunca la lista
                            entera (#24): la que mas lleva esperando sin
                            clasificar y la mas vieja de "algun dia" (#7)
     4. Listo            -> la racha con comodines y la hora de la manana

   La semana que se arma la decide `reviewWeekStart`: en fin de semana, la
   que viene; entre semana, la que esta en curso. Es la misma funcion que
   usa el despachador para no mandar el aviso si ya esta armada.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ItemStatus } from '@/lib/supabase/database.types';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import {
  MONTH_NAMES_ES,
  WEEKDAY_FULL_ES,
  WEEKDAY_SHORT_ES,
  addDays,
  getDayOfWeek,
  getTodayString,
  parseDateString,
} from '@/lib/date-utils';
import { formatTimeOfDay, localDateOf, localTimeOf } from '@/lib/tz';
import { daysBetween, formatDistance, summarizeReminders, type HomeReminder } from '@/lib/home';
import { computeStreak, type Streak } from '@/lib/streak';
import { reviewWeekStart } from '@/lib/push/server/schedule';

/** Como estaba una tarea antes de decidir: lo que restaura "Deshacer". */
export type TaskBefore = { due_on: string | null; status: Extract<ItemStatus, 'inbox' | 'someday' | 'planned'> };

export type ReviewTask = {
  id: string;
  title: string;
  /** "jueves 8 · Proyecto IA" · "Capturado hace 12 días" · "Algún día · hace un mes". */
  meta: string;
  before: TaskBefore;
};

export type ReviewDay = {
  dateStr: string;
  /** "lun 12" */
  short: string;
  /** "Lunes 12" */
  label: string;
  classes: number;
  tasks: number;
  /** "3 clases · 1 tarea" o "Libre". */
  load: string;
  /** Titulos de los parciales y entregas de ese dia. */
  reminders: string[];
  /** Ya paso: no se le puede poner una tarea. */
  past: boolean;
  isToday: boolean;
};

export type ReviewData = {
  todayStr: string;
  weekStart: string;
  /** "12 – 18 de octubre" */
  rangeLabel: string;
  /** Se arma la semana que viene (fin de semana) y no la que esta en curso. */
  upcoming: boolean;
  days: ReviewDay[];
  leftovers: ReviewTask[];
  ideas: ReviewTask[];
  /** Capturas sin planificar aparte de las dos que se ofrecen. */
  moreIdeas: number;
  /** Parciales y entregas de hoy a dos semanas, con su preparacion. */
  reminders: HomeReminder[];
  /** "el domingo a las 19:20" si esta semana ya se armo. Vacio si no. */
  doneLabel: string;
  streak: Streak;
  /** Hora de la notificacion de la manana: "8:00". */
  morning: string;
  /** Nunca se cerro una semana: es la revision de la migracion (#21). */
  firstReview: boolean;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "12 – 18 de octubre" · "28 de septiembre – 4 de octubre". */
function rangeLabel(from: string, to: string): string {
  const a = parseDateString(from);
  const b = parseDateString(to);
  if (a.month === b.month) return `${a.day} – ${b.day} de ${MONTH_NAMES_ES[b.month - 1]}`;
  return `${a.day} de ${MONTH_NAMES_ES[a.month - 1]} – ${b.day} de ${MONTH_NAMES_ES[b.month - 1]}`;
}

/** "hoy" · "ayer" · "jueves 8" dentro de la ultima semana · "hace 19 días" si es mas viejo. */
function pastDayLabel(todayStr: string, dateStr: string): string {
  const ago = daysBetween(dateStr, todayStr);
  if (ago >= 2 && ago < 7) {
    return `${WEEKDAY_FULL_ES[getDayOfWeek(dateStr)]} ${parseDateString(dateStr).day}`;
  }
  return formatDistance(todayStr, dateStr);
}

export async function getReviewData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ReviewData> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone, notify_morning')
    .eq('id', userId)
    .maybeSingle();

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const todayStr = getTodayString(timezone);
  const weekStart = reviewWeekStart(todayStr);
  const weekEnd = addDays(weekStart, 6);
  const upcoming = weekStart > todayStr;
  /* El domingo, lo de hoy que no se cerro tambien "quedo": la revision es
     por la tarde. Cualquier otro dia, hoy todavia esta en juego. */
  const leftoverUntil = getDayOfWeek(todayStr) === 0 ? todayStr : addDays(todayStr, -1);

  const [itemsRes, remindersRes, templatesRes, contextsRes, doneRes, reviewRes, closedRes] = await Promise.all([
    supabase
      .from('items')
      .select('id, title, status, due_on, created_at, context_id')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned'])
      .order('created_at', { ascending: true }),

    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at')
      .eq('user_id', userId)
      .gte('occurs_on', todayStr)
      .lte('occurs_on', addDays(weekEnd, 7))
      .order('occurs_on', { ascending: true }),

    supabase
      .from('schedule_templates')
      .select('weekday, active_from, active_until')
      .eq('user_id', userId),

    supabase.from('contexts').select('id, name').eq('user_id', userId),

    supabase
      .from('items')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', new Date(Date.now() - 90 * 86_400_000).toISOString()),

    supabase
      .from('weekly_reviews')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle(),

    supabase
      .from('weekly_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null),
  ]);

  const items = itemsRes.data ?? [];
  const reminders = remindersRes.data ?? [];
  const templates = templatesRes.data ?? [];
  const contextName = new Map((contextsRes.data ?? []).map((c) => [c.id, c.name]));

  const prepRes =
    reminders.length > 0
      ? await supabase
          .from('items')
          .select('title, reminder_id, status, due_on')
          .eq('user_id', userId)
          .in(
            'reminder_id',
            reminders.map((r) => r.id)
          )
          .neq('status', 'dropped')
          .order('due_on', { ascending: true, nullsFirst: false })
      : { data: [] };

  const before = (t: (typeof items)[number]): TaskBefore => ({
    due_on: t.due_on,
    status: t.status as TaskBefore['status'],
  });

  /* ------------------------------------------------------- 1 · quedo ---- */
  const leftovers: ReviewTask[] = items
    .filter((t) => t.due_on !== null && t.due_on <= leftoverUntil)
    /* Lo mas reciente primero: es lo que todavia se recuerda. */
    .sort((a, b) => (b.due_on as string).localeCompare(a.due_on as string))
    .map((t) => ({
      id: t.id,
      title: t.title,
      meta: [pastDayLabel(todayStr, t.due_on as string), t.context_id ? contextName.get(t.context_id) : '']
        .filter(Boolean)
        .join(' · '),
      before: before(t),
    }));

  /* ------------------------------------------------------- 3 · anotado -- */
  const undated = items.filter((t) => t.due_on === null);
  const inbox = undated.filter((t) => t.status === 'inbox');
  const someday = undated.filter((t) => t.status === 'someday');
  /* Una de cada si hay de las dos: lo que nunca se miro y lo que se dejo
     para "algun dia". Si solo hay de una clase, las dos mas viejas. */
  const offered =
    inbox.length > 0 && someday.length > 0 ? [inbox[0], someday[0]] : [...inbox, ...someday].slice(0, 2);
  const ideas: ReviewTask[] = offered.map((t) => {
    const age = formatDistance(todayStr, localDateOf(t.created_at, timezone));
    return {
      id: t.id,
      title: t.title,
      meta: t.status === 'someday' ? `Algún día · anotado ${age}` : `Capturado ${age}`,
      before: before(t),
    };
  });

  /* ------------------------------------------------------- 2 · semana --- */
  const days: ReviewDay[] = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDays(weekStart, i);
    const dow = getDayOfWeek(dateStr);
    const classes = templates.filter(
      (t) =>
        t.weekday === dow &&
        t.active_from <= dateStr &&
        (t.active_until === null || t.active_until >= dateStr)
    ).length;
    const tasks = items.filter((t) => t.due_on === dateStr).length;
    const load = [
      classes ? plural(classes, 'clase', 'clases') : '',
      tasks ? plural(tasks, 'tarea', 'tareas') : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const { day } = parseDateString(dateStr);
    return {
      dateStr,
      short: `${WEEKDAY_SHORT_ES[dow]} ${day}`,
      label: `${cap(WEEKDAY_FULL_ES[dow])} ${day}`,
      classes,
      tasks,
      load: load || 'Libre',
      reminders: reminders.filter((r) => r.occurs_on === dateStr).map((r) => r.title),
      past: dateStr < todayStr,
      isToday: dateStr === todayStr,
    };
  });

  /* ------------------------------------------------------- 4 · listo ---- */
  const doneDays = (doneRes.data ?? [])
    .map((r) => r.completed_at)
    .filter((v): v is string => Boolean(v))
    .map((iso) => localDateOf(iso, timezone));

  const doneAt = reviewRes.data?.completed_at ?? null;
  const doneLabel = doneAt
    ? `el ${WEEKDAY_FULL_ES[getDayOfWeek(localDateOf(doneAt, timezone))]} a las ${formatTimeOfDay(
        localTimeOf(doneAt, timezone)
      )}`
    : '';

  return {
    todayStr,
    weekStart,
    rangeLabel: rangeLabel(weekStart, weekEnd),
    upcoming,
    days,
    leftovers,
    ideas,
    moreIdeas: Math.max(0, undated.length - ideas.length),
    reminders: summarizeReminders(reminders, prepRes.data ?? [], todayStr, timezone),
    doneLabel,
    streak: computeStreak(doneDays, todayStr),
    morning: formatTimeOfDay(profile?.notify_morning ?? '08:00'),
    firstReview: (closedRes.count ?? 0) === 0,
  };
}
