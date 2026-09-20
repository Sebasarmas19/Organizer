/* ============================================================================
   Organizer · FD4 · los datos de Pendientes

   Tareas dejo de llamarse Tareas y paso a ser PENDIENTES, con dos solapas
   dentro: Tareas y Recordatorios. No es un cambio de nombre: es que las dos
   cosas se miraban desde sitios distintos y son la misma pregunta — "¿que
   tengo encima?".

   LA DIFERENCIA ENTRE LAS DOS, QUE ES LA DECISION DE FONDO:

     una TAREA se completa    -> lleva casilla
     un REMINDER pasa         -> no lleva casilla, en ninguna parte

   Un parcial no se "termina" porque lo marques; llega el viernes y ocurre.
   Lo que se completa son las tareas que cuelgan de el. Por eso una tarea con
   reminder se ve desde los dos lados: en Tareas con su etiqueta ambar, y en
   Recordatorios como parte de la preparacion de ese reminder.

   LOS GRUPOS SON POR CUANDO, NO POR PROYECTO. Agrupar por materia o por
   contexto obliga a saber en que carpeta metiste algo para encontrarlo, y
   este usuario captura sin clasificar (regla 3). Por fecha no hay que
   recordar nada: o es de hoy, o es de esta semana, o no tiene dia.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reminder, Task } from '@/lib/supabase/database.types';
import type { TaskRowData } from '@/components/fd4/TaskRow';
import type { ReminderCardData } from '@/components/fd4/ReminderCard';
import { formatDistance, formatWhen } from './home';
import { WEEKDAY_FULL_ES, addDays, getDayOfWeek, getTodayString, parseDateString } from './date-utils';

export type PendView = 'tareas' | 'recordatorios';

export type TaskGroup = { label: string; items: TaskRowData[] };
export type ReminderGroup = { label: string; items: ReminderCardData[] };

export type Fd4PendientesData = {
  todayStr: string;
  groups: TaskGroup[];
  reminderGroups: ReminderGroup[];
};

/** "viernes 18" · la fecha de una tarea, dentro de una frase. */
function taskWhen(dateStr: string): string {
  const { day } = parseDateString(dateStr);
  return `${WEEKDAY_FULL_ES[getDayOfWeek(dateStr)]} ${day}`;
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
      .select('*')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned', 'done'])
      .order('due_on', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),

    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('occurs_on', todayStr)
      .order('occurs_on', { ascending: true }),

    supabase.from('contexts').select('id, name').eq('user_id', userId),
  ]);

  const items = (itemsRes.data ?? []) as Task[];
  const reminders = (remindersRes.data ?? []) as Reminder[];
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
      t.due_on ? taskWhen(t.due_on) : '',
      t.context_id ? contextName.get(t.context_id) : '',
    ]
      .filter(Boolean)
      .join(' · '),
    rem: t.reminder_id ? reminderTitle.get(t.reminder_id) : undefined,
    done: t.status === 'done',
  });

  const hoy = alive.filter((t) => t.due_on === todayStr);
  const semana = alive.filter(
    (t) => t.due_on !== null && t.due_on > todayStr && t.due_on <= weekEndStr
  );
  const adelante = alive.filter((t) => t.due_on !== null && t.due_on > weekEndStr);
  /* Lo atrasado se sube a "Hoy": si algo vencio el martes, hoy es el dia de
     decidir. Que no se quede en un grupo "vencido" que nadie abre. */
  const atrasado = alive.filter((t) => t.due_on !== null && t.due_on < todayStr);
  const sinFecha = alive.filter((t) => t.due_on === null);

  const groups: TaskGroup[] = [
    { label: 'Hoy', items: [...atrasado, ...hoy].map(toRow) },
    { label: 'Esta semana', items: semana.map(toRow) },
    { label: 'Más adelante', items: adelante.map(toRow) },
    { label: 'Sin fecha', items: sinFecha.map(toRow) },
  ].filter((g) => g.items.length > 0);

  /* --------------------------------------------------------- reminders -- */
  let prepByReminder = new Map<string, string[]>();
  if (reminders.length > 0) {
    const { data: prepRows } = await supabase
      .from('items')
      .select('title, reminder_id')
      .eq('user_id', userId)
      .in('reminder_id', reminders.map((r) => r.id))
      .neq('status', 'dropped')
      .order('due_on', { ascending: true, nullsFirst: false });

    prepByReminder = (prepRows ?? []).reduce((acc, row) => {
      if (!row.reminder_id) return acc;
      const list = acc.get(row.reminder_id) ?? [];
      list.push(row.title);
      acc.set(row.reminder_id, list);
      return acc;
    }, new Map<string, string[]>());
  }

  const toCard = (r: Reminder): ReminderCardData => {
    const prep = prepByReminder.get(r.id) ?? [];
    return {
      id: r.id,
      title: r.title,
      when: formatWhen(r.occurs_on, r.occurs_at, timezone),
      dateStr: r.occurs_on,
      prep,
      emptyLabel: prep.length ? '' : `${formatDistance(todayStr, r.occurs_on)} · nada planificado`,
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

  return { todayStr, groups, reminderGroups };
}
