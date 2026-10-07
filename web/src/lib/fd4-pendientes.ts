/**
 * Organizer · Pendientes data access.
 * Queries tasks and reminders categorized by temporal relevance (today, this week, unscheduled).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reminder, Task } from '@/lib/supabase/database.types';
import type { TaskRowData } from '@/components/fd4/TaskRow';
import type { ReminderCardData } from '@/components/fd4/ReminderCard';
import { formatDistance, formatWhen } from './home';
import {
  MONTH_NAMES_ES,
  WEEKDAY_FULL_ES,
  WEEKDAY_SHORT_ES,
  addDays,
  getDayOfWeek,
  getTodayString,
  parseDateString,
} from './date-utils';

export type PendView = 'tareas' | 'recordatorios';

export type TaskGroup = { label: string; items: TaskRowData[] };
export type ReminderGroup = { label: string; items: ReminderCardData[] };

/** Una captura sin dia y sin clasificar: lo que entra por Siri o por el +. */
export type InboxItem = { id: string; title: string; meta: string };

/** Un dia elegible en el clasificador: "hoy", "mañana", "mié 30"... */
export type DayOption = { dateStr: string; label: string; short: string };

export type Fd4PendientesData = {
  todayStr: string;
  /** Cola del clasificador, la captura mas vieja primero. */
  inbox: InboxItem[];
  /** Hoy, mañana y los cinco dias siguientes. */
  dayOptions: DayOption[];
  groups: TaskGroup[];
  reminderGroups: ReminderGroup[];
  recentCompleted: TaskRowData[];
};

/** "viernes 18" · la fecha de una tarea, dentro de una frase. A más de una
    semana de hoy lleva el mes ("viernes 6 de noviembre"): "viernes 6" a un
    mes vista se lee como el viernes pasado. */
function taskWhen(dateStr: string, todayStr: string): string {
  const { month, day } = parseDateString(dateStr);
  const near = dateStr >= addDays(todayStr, -6) && dateStr <= addDays(todayStr, 6);
  return `${WEEKDAY_FULL_ES[getDayOfWeek(dateStr)]} ${day}${near ? '' : ` de ${MONTH_NAMES_ES[month - 1]}`}`;
}

export async function getPendientesData(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = 'America/Caracas'
): Promise<Fd4PendientesData> {
  const todayStr = getTodayString(timezone);
  const weekEndStr = addDays(todayStr, 7);

  const [itemsRes, remindersRes, contextsRes] = await Promise.all([
    /* Todo lo vivo. `done` entra tambien: una tarea recien marcada tiene que
       quedarse en su sitio, tachada, hasta que recargues — si desapareciera
       al tocarla, el feedback seria "se borro" y no "listo". */
    supabase
      .from('items')
      .select('id, title, status, due_on, reminder_id, context_id, completed_at, created_at')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned', 'done'])
      .order('due_on', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days')
      .eq('user_id', userId)
      .gte('occurs_on', todayStr)
      .order('occurs_on', { ascending: true }),

    supabase.from('contexts').select('id, name').eq('user_id', userId),
  ]);

  const items = (itemsRes.data ?? []) as unknown as Task[];
  const reminders = (remindersRes.data ?? []) as unknown as Reminder[];
  const contextName = new Map((contextsRes.data ?? []).map((c) => [c.id, c.name]));
  const reminderTitle = new Map(reminders.map((r) => [r.id, r.title]));

  /* Una tarea marcada hace tres dias no tiene por que seguir aqui. Se queda
     la de hoy, que es la que acabas de tocar. */
  const alive = items.filter(
    (t) => t.status !== 'done' || (t.completed_at ?? '').slice(0, 10) === todayStr
  );

  const toRow = (t: Task): TaskRowData => ({
    id: t.id,
    title: t.title,
    meta: [
      t.due_on ? taskWhen(t.due_on, todayStr) : '',
      t.context_id ? contextName.get(t.context_id) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    rem: t.reminder_id ? reminderTitle.get(t.reminder_id) : undefined,
    done: t.status === 'done',
    isOverdue: Boolean(t.due_on && t.due_on < todayStr),
  });

  const hoy = alive.filter((t) => t.due_on === todayStr);
  const semana = alive.filter(
    (t) => t.due_on !== null && t.due_on > todayStr && t.due_on <= weekEndStr
  );
  const adelante = alive.filter((t) => t.due_on !== null && t.due_on > weekEndStr);
  /* Lo atrasado se sube a "Hoy": si algo vencio el martes, hoy es el dia de
     decidir. Que no se quede en un grupo "vencido" que nadie abre. */
  const atrasado = alive.filter((t) => t.due_on !== null && t.due_on < todayStr);
  /* Sin dia hay dos cosas distintas. La captura que nadie ha mirado
     (`inbox`) va al clasificador, una a una. La que ya se miro y se dejo
     para "algun dia" (`someday`) se queda en la lista: ya se decidio. */
  const sinFecha = alive.filter((t) => t.due_on === null);
  const porClasificar = sinFecha.filter((t) => t.status === 'inbox');
  const algunDia = sinFecha.filter((t) => t.status !== 'inbox');

  const inbox: InboxItem[] = [...porClasificar]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((t) => ({
      id: t.id,
      title: t.title,
      meta: `Capturado ${formatDistance(todayStr, t.created_at.slice(0, 10))}`,
    }));

  const dayOptions: DayOption[] = Array.from({ length: 7 }, (_, i) => {
    const dateStr = addDays(todayStr, i);
    const { day } = parseDateString(dateStr);
    const short = `${WEEKDAY_SHORT_ES[getDayOfWeek(dateStr)]} ${day}`;
    return { dateStr, short, label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : short };
  });

  const groups: TaskGroup[] = [
    { label: 'Hoy', items: [...atrasado, ...hoy].map(toRow) },
    { label: 'Esta semana', items: semana.map(toRow) },
    { label: 'Más adelante', items: adelante.map(toRow) },
    { label: 'Algún día', items: algunDia.map(toRow) },
  ].filter((g) => g.items.length > 0);

  /* --------------------------------------------------------- reminders -- */
  /* Se construye directamente de `items` que ya vino en la primera consulta:
     ahorra un viaje de red completo a Supabase. */
  const reminderIdSet = new Set(reminders.map((r) => r.id));
  const prepByReminder = new Map<string, string[]>();
  const doneByReminder = new Map<string, number>();
  for (const item of items) {
    if (item.reminder_id && reminderIdSet.has(item.reminder_id)) {
      /* Solo se listan los pasos que faltan. */
      if (item.status === 'done') {
        doneByReminder.set(item.reminder_id, (doneByReminder.get(item.reminder_id) ?? 0) + 1);
        continue;
      }
      if (item.status === 'dropped') continue;
      const list = prepByReminder.get(item.reminder_id) ?? [];
      list.push(item.title);
      prepByReminder.set(item.reminder_id, list);
    }
  }

  const toCard = (r: Reminder): ReminderCardData => {
    const prep = prepByReminder.get(r.id) ?? [];
    return {
      id: r.id,
      title: r.title,
      when: formatWhen(r.occurs_on, r.occurs_at, timezone),
      dateStr: r.occurs_on,
      prep,
      emptyLabel: prep.length
        ? ''
        : (doneByReminder.get(r.id) ?? 0) > 0
          ? `${formatDistance(todayStr, r.occurs_on)} · todo preparado`
          : `${formatDistance(todayStr, r.occurs_on)} · nada planificado`,
    };
  };

  const reminderGroups: ReminderGroup[] = [
    {
      label: 'Esta semana',
      items: reminders.filter((r) => r.occurs_on <= weekEndStr).map(toCard),
    },
    {
      label: 'Más adelante',
      items: reminders.filter((r) => r.occurs_on > weekEndStr).map(toCard),
    },
  ].filter((g) => g.items.length > 0);

  /* Tareas completadas recientemente para consulta y revisión histórica. */
  const recentCompleted: TaskRowData[] = items
    .filter((t) => t.status === 'done')
    .slice(0, 30)
    .map((t) => {
      const row = toRow(t);
      const compDate = (t.completed_at ?? '').slice(0, 10);
      const distance = compDate ? formatDistance(todayStr, compDate) : '';
      return {
        ...row,
        done: true,
        meta: [distance ? `Completada ${distance}` : '', row.meta].filter(Boolean).join(' · '),
      };
    });

  return { todayStr, inbox, dayOptions, groups, reminderGroups, recentCompleted };
}
