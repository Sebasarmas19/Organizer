/* ============================================================================
   Organizer · Lógica y consultas de datos para el Calendario (F2)

   Gestiona las tres entidades:
     - Materias: schedule_templates y su materialización idempotente a blocks
     - Reminders: reminders (con fecha obligatoria, sin completado)
     - Tareas: items y sus bloques en el riel de horas
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Row, Insert, Task, Reminder } from '@/lib/supabase/database.types';
import {
  addDays,
  getDayOfWeek,
  getDaysOfWeek,
  getTodayString,
  parseDateString,
  formatDateString,
} from './date-utils';

export type BlockWithItem = Row<'blocks'>;

export type DayCalendarData = {
  dateStr: string;
  todayStr: string;
  isToday: boolean;
  stripDays: {
    dateStr: string;
    dayNum: number;
    weekdayNameShort: string;
    hasReminder: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[];
  reminders: Reminder[];
  blocks: BlockWithItem[];
  unplannedTasks: Task[];
  contexts: Row<'contexts'>[];
};

export type WeekCalendarData = {
  mondayStr: string;
  todayStr: string;
  days: {
    dateStr: string;
    dayNum: number;
    weekdayNameShort: string;
    isToday: boolean;
    reminders: Reminder[];
    blocks: BlockWithItem[];
  }[];
  unplannedTasks: Task[];
  contexts: Row<'contexts'>[];
};

export type MonthCalendarData = {
  year: number;
  month: number;
  todayStr: string;
  remindersByDate: Record<string, Reminder[]>;
  unplannedTasks: Task[];
  contexts: Row<'contexts'>[];
};

/**
 * Materializa las materias (schedule_templates) a bloques para el rango dado
 * de forma estrictamente IDEMPOTENTE.
 *
 * El índice único `blocks_template_per_day` en (template_id, starts_at::date)
 * exige como máximo un bloque por plantilla por día.
 */
export async function materializeScheduleTemplates(
  supabase: SupabaseClient<Database>,
  userId: string,
  startDate: string,
  endDate: string,
  timezone = 'America/Caracas'
): Promise<void> {
  // 1. Obtener todas las plantillas activas que intersecten con el rango
  const { data: templates, error: tmplErr } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('user_id', userId)
    .lte('active_from', endDate);

  if (tmplErr || !templates || templates.length === 0) return;

  const validTemplates = templates.filter(
    (t) => !t.active_until || t.active_until >= startDate
  );
  if (validTemplates.length === 0) return;

  // 2. Obtener los bloques de plantilla ya existentes en ese rango
  // Para Caracas UTC-4, el rango UTC puede empezar 4 horas antes
  const startUTC = new Date(`${startDate}T00:00:00-04:00`).toISOString();
  const endUTC = new Date(`${endDate}T23:59:59-04:00`).toISOString();

  const { data: existingBlocks } = await supabase
    .from('blocks')
    .select('template_id, starts_at')
    .eq('user_id', userId)
    .eq('source', 'template')
    .gte('starts_at', startUTC)
    .lte('starts_at', endUTC);

  // Mapa de clave `template_id:localDate` ya existentes
  const existingSet = new Set<string>();
  if (existingBlocks) {
    for (const b of existingBlocks) {
      if (b.template_id && b.starts_at) {
        // Obtener fecha local en Caracas
        const localDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(b.starts_at));
        existingSet.add(`${b.template_id}:${localDate}`);
      }
    }
  }

  // 3. Generar bloques faltantes
  const blocksToInsert: Insert<'blocks'>[] = [];
  let curDate = startDate;

  while (curDate <= endDate) {
    const dow = getDayOfWeek(curDate); // 0=dom, 1=lun, etc.

    for (const tmpl of validTemplates) {
      if (tmpl.weekday === dow && curDate >= tmpl.active_from) {
        if (tmpl.active_until && curDate > tmpl.active_until) continue;

        const key = `${tmpl.id}:${curDate}`;
        if (!existingSet.has(key)) {
          existingSet.add(key); // Evitar duplicar en memoria

          const startsAtISO = new Date(`${curDate}T${tmpl.start_time}-04:00`).toISOString();
          const endsAtISO = new Date(`${curDate}T${tmpl.end_time}-04:00`).toISOString();

          blocksToInsert.push({
            user_id: userId,
            template_id: tmpl.id,
            title: tmpl.title,
            context_id: tmpl.context_id,
            starts_at: startsAtISO,
            ends_at: endsAtISO,
            status: 'pending',
            source: 'template',
            reminder_min: tmpl.reminder_min,
          });
        }
      }
    }

    curDate = addDays(curDate, 1);
  }

  if (blocksToInsert.length > 0) {
    await supabase.from('blocks').insert(blocksToInsert);
  }
}

/**
 * Consulta los datos para la vista Día (`/dia?date=YYYY-MM-DD`)
 */
export async function getDayData(
  supabase: SupabaseClient<Database>,
  userId: string,
  targetDate: string,
  timezone = 'America/Caracas'
): Promise<DayCalendarData> {
  const todayStr = getTodayString(timezone);
  const weekDays = getDaysOfWeek(targetDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Materializar materias de la semana
  await materializeScheduleTemplates(supabase, userId, weekStart, weekEnd, timezone);

  // Consultar reminders de la semana (para los puntos de la tira de 7 días)
  const { data: weekReminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .gte('occurs_on', weekStart)
    .lte('occurs_on', weekEnd);

  const remindersSet = new Set((weekReminders ?? []).map((r) => r.occurs_on));
  const dayReminders = (weekReminders ?? []).filter((r) => r.occurs_on === targetDate);

  // Consultar bloques del día seleccionado
  const dayStartUTC = new Date(`${targetDate}T00:00:00-04:00`).toISOString();
  const dayEndUTC = new Date(`${targetDate}T23:59:59-04:00`).toISOString();

  const { data: blocks } = await supabase
    .from('blocks')
    .select('*')
    .eq('user_id', userId)
    .gte('starts_at', dayStartUTC)
    .lte('starts_at', dayEndUTC)
    .order('starts_at', { ascending: true });

  // Consultar tareas sin planificar (status = 'inbox' o 'planned' sin bloque)
  // Las tareas sin planificar son el puente de anadir.html
  const { data: unplannedTasks } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['inbox', 'someday'])
    .order('created_at', { ascending: false });

  // Consultar contextos para etiquetas
  const { data: contexts } = await supabase
    .from('contexts')
    .select('*')
    .eq('user_id', userId);

  const weekdayShortNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  const stripDays = weekDays.map((dStr) => {
    const dow = getDayOfWeek(dStr);
    const { day } = parseDateString(dStr);
    return {
      dateStr: dStr,
      dayNum: day,
      weekdayNameShort: weekdayShortNames[dow],
      hasReminder: remindersSet.has(dStr),
      isToday: dStr === todayStr,
      isSelected: dStr === targetDate,
    };
  });

  return {
    dateStr: targetDate,
    todayStr,
    isToday: targetDate === todayStr,
    stripDays,
    reminders: dayReminders,
    blocks: (blocks as BlockWithItem[]) ?? [],
    unplannedTasks: unplannedTasks ?? [],
    contexts: contexts ?? [],
  };
}

/**
 * Consulta los datos para la vista Semana (`/semana?date=YYYY-MM-DD`)
 */
export async function getWeekData(
  supabase: SupabaseClient<Database>,
  userId: string,
  targetDate: string,
  timezone = 'America/Caracas'
): Promise<WeekCalendarData> {
  const todayStr = getTodayString(timezone);
  const weekDays = getDaysOfWeek(targetDate);
  const mondayStr = weekDays[0];
  const sundayStr = weekDays[6];

  // Materializar materias de la semana
  await materializeScheduleTemplates(supabase, userId, mondayStr, sundayStr, timezone);

  const weekStartUTC = new Date(`${mondayStr}T00:00:00-04:00`).toISOString();
  const weekEndUTC = new Date(`${sundayStr}T23:59:59-04:00`).toISOString();

  const [remindersRes, blocksRes, unplannedRes, contextsRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('occurs_on', mondayStr)
      .lte('occurs_on', sundayStr)
      .order('occurs_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('blocks')
      .select('*')
      .eq('user_id', userId)
      .gte('starts_at', weekStartUTC)
      .lte('starts_at', weekEndUTC)
      .order('starts_at', { ascending: true }),
    supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday'])
      .order('created_at', { ascending: false }),
    supabase.from('contexts').select('*').eq('user_id', userId),
  ]);

  const allReminders = remindersRes.data ?? [];
  const allBlocks = (blocksRes.data as BlockWithItem[]) ?? [];
  const weekdayShortNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  const days = weekDays.map((dStr) => {
    const dow = getDayOfWeek(dStr);
    const { day } = parseDateString(dStr);

    const dayReminders = allReminders.filter((r) => r.occurs_on === dStr);
    const dayBlocks = allBlocks.filter((b) => {
      const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(b.starts_at));
      return localDate === dStr;
    });

    return {
      dateStr: dStr,
      dayNum: day,
      weekdayNameShort: weekdayShortNames[dow],
      isToday: dStr === todayStr,
      reminders: dayReminders,
      blocks: dayBlocks,
    };
  });

  return {
    mondayStr,
    todayStr,
    days,
    unplannedTasks: unplannedRes.data ?? [],
    contexts: contextsRes.data ?? [],
  };
}

/**
 * Consulta los datos para la vista Mes (`/mes?date=YYYY-MM-DD`)
 * Solo consulta reminders: no tareas ni materias (decisión 53).
 */
export async function getMonthData(
  supabase: SupabaseClient<Database>,
  userId: string,
  year: number,
  month: number,
  timezone = 'America/Caracas'
): Promise<MonthCalendarData> {
  const todayStr = getTodayString(timezone);

  // Rango para cubrir el mes y desbordes de semanas
  const startDate = formatDateString(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1, 20);
  const endDate = formatDateString(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 10);

  const [remindersRes, unplannedRes, contextsRes] = await Promise.all([
    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('occurs_on', startDate)
      .lte('occurs_on', endDate)
      .order('occurs_at', { ascending: true, nullsFirst: false }),
    supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday'])
      .order('created_at', { ascending: false }),
    supabase.from('contexts').select('*').eq('user_id', userId),
  ]);

  const remindersByDate: Record<string, Reminder[]> = {};
  for (const r of remindersRes.data ?? []) {
    if (!remindersByDate[r.occurs_on]) {
      remindersByDate[r.occurs_on] = [];
    }
    remindersByDate[r.occurs_on].push(r);
  }

  return {
    year,
    month,
    todayStr,
    remindersByDate,
    unplannedTasks: unplannedRes.data ?? [],
    contexts: contextsRes.data ?? [],
  };
}
