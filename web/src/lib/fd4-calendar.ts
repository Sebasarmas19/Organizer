/**
 * Organizer · Calendario data access.
 * Queries and computes aggregated data for Day, Week, and Month views.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reminder, Task } from '@/lib/supabase/database.types';
import { materializeScheduleTemplates } from './calendar';
import { formatClock, formatWhen } from './home';
import { dayRangeUtc, formatTimeOfDay, timeToMinutes } from './tz';
import {
  MONTH_NAMES_CAP_ES,
  MONTH_NAMES_ES,
  WEEKDAY_FULL_ES,
  WEEKDAY_SHORT_ES,
  addDays,
  formatDateString,
  getDayOfWeek,
  getDaysInMonth,
  getCurrentTimeMinutes,
  getDaysOfWeek,
  getMondayOfWeek,
  getMonthGrid,
  getTodayString,
  parseDateString,
} from './date-utils';

export type CalView = 'mes' | 'semana' | 'dia' | 'clases';
export type Entity = 'task' | 'subject' | 'reminder';

/** El riel del telefono: 7:00 a 23:00. Una fila de `--hour-row` por hora. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 23;
export const HOUR_PX = 56;

export const DAY_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => `${DAY_START_HOUR + i}:00`
);

/** Los siete encabezados de la rejilla de mes. Lunes primero (decision 44). */
export const DOW_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/* ------------------------------------------------------------- utilidades */

/** El dia local de un `timestamptz`, en la zona del usuario. */
function localDay(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** Minutos desde medianoche de un `timestamptz`, en la zona del usuario. */
function localMinutes(iso: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return h * 60 + m;
}

/* La app fija Caracas (UTC-4, sin horario de verano), igual que `calendar.ts`.
   Cuando `profiles.timezone` deje de ser siempre Caracas, este offset sale de
   ahi. Esta escrito en un solo sitio para que ese cambio sea uno. */
const TZ_FOR_RANGES = 'America/Caracas';
const dayStartUTC = (d: string, tz = TZ_FOR_RANGES) => dayRangeUtc(d, tz).start;
/* Fin EXCLUSIVO menos 1 ms: las consultas usan `lte`. */
const dayEndUTC = (d: string, tz = TZ_FOR_RANGES) =>
  new Date(Date.parse(dayRangeUtc(d, tz).end) - 1).toISOString();

/** "Lunes 14" · el titulo de una tarjeta de dia. */
export function dayLabel(dateStr: string): string {
  const { day } = parseDateString(dateStr);
  const name = WEEKDAY_FULL_ES[getDayOfWeek(dateStr)];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${day}`;
}

/** "Jueves 24 de septiembre" · el titulo completo de la vista de dia. */
export function dayFullLabel(dateStr: string): string {
  const { day, month } = parseDateString(dateStr);
  const name = WEEKDAY_FULL_ES[getDayOfWeek(dateStr)];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${day} de ${MONTH_NAMES_ES[month - 1]}`;
}

/* ================================================================== MES === */

export type MonthCell = {
  dateStr: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** Hasta dos, en orden fijo: reminder, tarea. Las materias no salen aquí. */
  dots: Entity[];
};

export type MonthPreviewItem = {
  id: string;
  title: string;
  kind: Entity;
  hora?: string;
  /** A dónde lleva tocarlo: el reminder, la tarea o el día. */
  href: string;
};

export type MonthDayPreview = {
  dateStr: string;
  label: string;
  hint: string;
  events: MonthPreviewItem[];
};

export type Fd4MonthData = {
  year: number;
  month: number;
  /** "Septiembre 2026" */
  title: string;
  selectedStr: string;
  cells: MonthCell[];
  previews: Record<string, MonthDayPreview>;
  reminders: { id: string; title: string; when: string; dateStr: string }[];
};

/**
 * La rejilla del mes con sus puntos y vista previa por dia.
 *
 * EL PUNTO DICE QUE HAY ALGO; LA VISTA PREVIA DICE QUE ES.
 * Al tocar cualquier dia de la cuadricula, la vista previa se actualiza
 * instantaneamente en el cliente sin recargar la pagina.
 */
export async function getMonthView(
  supabase: SupabaseClient<Database>,
  userId: string,
  year: number,
  month: number,
  selectedStr: string,
  timezone = 'America/Caracas'
): Promise<Fd4MonthData> {
  const todayStr = getTodayString(timezone);
  const cellsRaw = getMonthGrid(year, month, todayStr);

  const firstStr = cellsRaw[0].dateStr;
  const lastStr = cellsRaw[cellsRaw.length - 1].dateStr;

  /* La rejilla desborda a los meses vecinos y esos dias tambien llevan punto:
     si ves el 31 de agosto en la rejilla de septiembre, tiene que decirte la
     verdad sobre el 31 de agosto. */
  await materializeScheduleTemplates(supabase, userId, firstStr, lastStr, timezone);

  const [blocksRes, itemsRes, remindersRes] = await Promise.all([
    supabase
      .from('blocks')
      .select('id, item_id, title, starts_at, ends_at, source')
      .eq('user_id', userId)
      .gte('starts_at', dayStartUTC(firstStr))
      .lte('starts_at', dayEndUTC(lastStr))
      .order('starts_at', { ascending: true }),
    supabase
      .from('items')
      .select('id, title, due_on')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned'])
      .gte('due_on', firstStr)
      .lte('due_on', lastStr),
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at')
      .eq('user_id', userId)
      .gte('occurs_on', firstStr)
      .lte('occurs_on', lastStr)
      .order('occurs_on', { ascending: true }),
  ]);

  const hasReminder = new Set((remindersRes.data ?? []).map((r) => r.occurs_on));
  const hasTask = new Set<string>();

  /* Las clases no entran al calendario (#53): tienen su pestaña, Clases. */
  const taskBlocks = (blocksRes.data ?? []).filter((b) => b.source !== 'template');

  for (const b of taskBlocks) {
    hasTask.add(localDay(b.starts_at, timezone));
  }
  for (const t of itemsRes.data ?? []) {
    if (t.due_on) hasTask.add(t.due_on);
  }

  const cells: MonthCell[] = cellsRaw.map((c) => {
    const dots: Entity[] = [];
    if (hasReminder.has(c.dateStr)) dots.push('reminder');
    if (hasTask.has(c.dateStr)) dots.push('task');
    return {
      dateStr: c.dateStr,
      dayNum: c.dayNum,
      inMonth: c.isCurrentMonth,
      isToday: c.isToday,
      isSelected: c.dateStr === selectedStr && !c.isToday,
      dots,
    };
  });

  /* Vistas previas de cada dia para interaccion instantanea sin navegacion */
  const previews: Record<string, MonthDayPreview> = {};

  for (const c of cellsRaw) {
    const dStr = c.dateStr;
    const dayReminders = (remindersRes.data ?? [])
      .filter((r) => r.occurs_on === dStr)
      .map((r) => ({
        id: r.id,
        title: r.title,
        kind: 'reminder' as Entity,
        hora: r.occurs_at ? formatTimeOfDay(r.occurs_at) : undefined,
        href: `/reminders/${r.id}`,
      }));

    const dayBlocks = taskBlocks
      .filter((b) => localDay(b.starts_at, timezone) === dStr)
      .map((b) => {
        const start = formatClock(b.starts_at, timezone);
        const end = b.ends_at ? formatClock(b.ends_at, timezone) : '';
        return {
          id: b.id,
          title: b.title,
          kind: 'task' as Entity,
          hora: end ? `${start} – ${end}` : start,
          href: b.item_id ? `/tareas/${b.item_id}` : `/calendario?v=dia&d=${dStr}`,
        };
      });

    const blockTitles = new Set(dayBlocks.map((b) => b.title));
    const dayTasks = (itemsRes.data ?? [])
      .filter((t) => t.due_on === dStr && !blockTitles.has(t.title))
      .map((t) => ({
        id: t.id,
        title: t.title,
        kind: 'task' as Entity,
        href: `/tareas/${t.id}`,
      }));

    const events: MonthPreviewItem[] = [
      ...dayReminders,
      ...dayTasks,
      ...dayBlocks,
    ];

    const hint =
      dStr === todayStr
        ? 'Hoy'
        : dStr === addDays(todayStr, 1)
          ? 'Mañana'
          : dStr === addDays(todayStr, -1)
            ? 'Ayer'
            : '';

    previews[dStr] = {
      dateStr: dStr,
      label: dayFullLabel(dStr),
      hint,
      events,
    };
  }

  /* La lista de abajo solo trae los reminders DEL MES, no los del desborde:
     es "Reminders del mes" y tiene que poder creerse. */
  const monthFirst = formatDateString(year, month, 1);
  const monthLast = formatDateString(year, month, getDaysInMonth(year, month));

  const reminders = ((remindersRes.data ?? []) as { id: string; title: string; occurs_on: string; occurs_at?: string | null }[])
    .filter((r) => r.occurs_on >= monthFirst && r.occurs_on <= monthLast)
    .map((r) => ({
      id: r.id,
      title: r.title,
      when: formatWhen(r.occurs_on, r.occurs_at ?? null, timezone),
      dateStr: r.occurs_on,
    }));

  return {
    year,
    month,
    title: `${MONTH_NAMES_CAP_ES[month - 1]} ${year}`,
    selectedStr: selectedStr || todayStr,
    cells,
    previews,
    reminders,
  };
}

/* =============================================================== SEMANA === */

export type WeekStripDay = {
  dateStr: string;
  dayNum: number;
  dow: string;
  isToday: boolean;
  /** El punto de la tira: manda el reminder, luego la tarea. */
  dot: Entity | 'none';
};

export type WeekDayCard = {
  dateStr: string;
  /** "Lunes 14" */
  label: string;
  /** "hoy" o vacio */
  hint: string;
  isToday: boolean;
  reminder: { title: string; hora: string } | null;
  tasks: { title: string; hora: string }[];
  free: boolean;
};

/* -------------------------------------------- la semana, version escritorio

   En el telefono la semana es una tarjeta por dia con el contenido escrito
   con letras, porque 390px / 7 = 47px y ahi no cabe el titulo de una clase.
   En escritorio si hay ancho, asi que la semana pasa a ser lo que de verdad
   es: una rejilla de siete columnas con las horas a la izquierda.

   ES EL MISMO VIAJE A LA BASE DE DATOS. `getWeekView` ya traia los bloques
   con `starts_at` y `ends_at`; aqui solo se colocan en pixeles. Servidor y
   cliente no saben el ancho de la ventana, asi que se mandan las dos formas
   y el CSS ensena una. Dos listas de texto no pesan; dos consultas si.

   EL RIEL VA DE 7:00 A 21:00, IGUAL QUE EN DIA. El prototipo dibujaba 8:00
   a 20:00, pero este usuario tiene clases a las 7:00 y un riel que empieza a
   las 8:00 las borraria de la pantalla sin decirlo — que es justo la regla 5
   del proyecto al reves. Se prefiere el rango que no miente.               */

export const DESK_HOUR_PX = 48;

export type WeekGridBlock = {
  id: string;
  kind: Entity;
  title: string;
  meta: string;
  top: number;
  height: number;
};

export type WeekGridDay = {
  dateStr: string;
  dow: string;
  dayNum: number;
  isToday: boolean;
  /** La banda de arriba: lo del dia que no tiene hora. */
  reminder: { title: string; hora: string } | null;
  loose: { id: string; title: string }[];
  blocks: WeekGridBlock[];
};

export type Fd4WeekData = {
  mondayStr: string;
  /** "14 – 20 sep" */
  title: string;
  strip: WeekStripDay[];
  days: WeekDayCard[];
  /** Solo se pinta a partir de 900px. Ver el comentario de arriba. */
  grid: WeekGridDay[];
  /** Posicion de la linea de ahora, y en que columna cae. Null si la semana
      que miras no es la de hoy, o si la hora esta fuera del riel. */
  nowTop: number | null;
  nowCol: number | null;
  nowLabel: string;
};

/**
 * La semana del telefono.
 *
 * NO ES UNA REJILLA DE SIETE COLUMNAS DE HORA. En 390px de ancho, siete
 * columnas dan 47px por dia: no cabe el titulo de una clase, asi que la
 * rejilla mentiria dos veces — una por lo que recorta y otra por parecer
 * precisa. La rejilla de horas existe en el modulo Dia y en escritorio, que
 * es donde hay ancho para que sea verdad.
 *
 * Aqui va una tarjeta por dia con lo que hay dentro escrito con letras.
 */
export async function getWeekView(
  supabase: SupabaseClient<Database>,
  userId: string,
  targetStr: string,
  timezone = 'America/Caracas'
): Promise<Fd4WeekData> {
  const todayStr = getTodayString(timezone);
  const days = getDaysOfWeek(targetStr);
  const mondayStr = days[0];
  const sundayStr = days[6];

  await materializeScheduleTemplates(supabase, userId, mondayStr, sundayStr, timezone);

  const [blocksRes, itemsRes, remindersRes] = await Promise.all([
    supabase
      .from('blocks')
      .select('id, title, starts_at, ends_at, source')
      .eq('user_id', userId)
      .gte('starts_at', dayStartUTC(mondayStr))
      .lte('starts_at', dayEndUTC(sundayStr))
      .order('starts_at', { ascending: true }),
    supabase
      .from('items')
      .select('id, title, due_on')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned'])
      .gte('due_on', mondayStr)
      .lte('due_on', sundayStr),
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days, context_id, notes')
      .eq('user_id', userId)
      .gte('occurs_on', mondayStr)
      .lte('occurs_on', sundayStr)
      .order('occurs_at', { ascending: true, nullsFirst: false }),
  ]);

  /* Las clases no entran al calendario (#53): tienen su pestaña, Clases. */
  const blocks = (blocksRes.data ?? []).filter((b) => b.source !== 'template');
  const items = itemsRes.data ?? [];
  const reminders = (remindersRes.data ?? []) as Reminder[];

  const cards: WeekDayCard[] = days.map((dateStr) => {
    const dayBlocks = blocks.filter((b) => localDay(b.starts_at, timezone) === dateStr);

    /* Una tarea puede llegar por dos caminos: tiene bloque ese dia, o tiene
       `due_on` ese dia y todavia no se planifico. Las dos son tareas del dia
       y las dos se ensenan; la del bloque trae hora. */
    const blockTasks = dayBlocks.map((b) => ({ title: b.title, hora: formatClock(b.starts_at, timezone) }));
    const blockTitles = new Set(blockTasks.map((t) => t.title));
    const looseTasks = items
      .filter((t) => t.due_on === dateStr && !blockTitles.has(t.title))
      .map((t) => ({ title: t.title, hora: '' }));
    const tasks = [...blockTasks, ...looseTasks];

    const rem = reminders.find((r) => r.occurs_on === dateStr);

    return {
      dateStr,
      label: dayLabel(dateStr),
      hint: dateStr === todayStr ? 'hoy' : '',
      isToday: dateStr === todayStr,
      reminder: rem
        ? { title: rem.title, hora: rem.occurs_at ? formatTimeOfDay(rem.occurs_at) : '' }
        : null,
      tasks,
      free: !rem && tasks.length === 0,
    };
  });

  const strip: WeekStripDay[] = cards.map((c) => {
    const { day } = parseDateString(c.dateStr);
    let dot: Entity | 'none' = 'none';
    if (c.reminder) dot = 'reminder';
    else if (c.tasks.length) dot = 'task';
    return {
      dateStr: c.dateStr,
      dayNum: day,
      dow: DOW_INITIALS[(getDayOfWeek(c.dateStr) + 6) % 7],
      isToday: c.isToday,
      dot,
    };
  });

  /* ------------------------------------------------ la rejilla de escritorio
     Mismos `blocks`, `items` y `reminders` de arriba. Cero consultas nuevas. */
  const railStart = DAY_START_HOUR * 60;
  const railEnd = DAY_END_HOUR * 60;

  const grid: WeekGridDay[] = days.map((dateStr) => {
    const { day } = parseDateString(dateStr);
    const rem = reminders.find((r) => r.occurs_on === dateStr);

    const dayBlocks = blocks.filter((b) => localDay(b.starts_at, timezone) === dateStr);

    const positioned: WeekGridBlock[] = dayBlocks.flatMap((b) => {
      const startMin = localMinutes(b.starts_at, timezone);
      const endMin = b.ends_at ? localMinutes(b.ends_at, timezone) : startMin + 60;
      /* Lo que cae entero fuera del riel no se dibuja. Se descarta aqui y no
         despues para no arrastrar un campo de usar y tirar por el tipo. */
      if (endMin <= railStart || startMin >= railEnd) return [];
      /* Lo que asoma por un borde se recorta a ese borde en vez de
         desaparecer: una clase de 6:30 sigue viendose, pegada arriba. */
      const from = Math.max(startMin, railStart);
      const to = Math.min(Math.max(endMin, from + 30), railEnd);

      return [
        {
          id: b.id,
          kind: 'task' as Entity,
          title: b.title,
          meta: formatClock(b.starts_at, timezone),
          top: ((from - railStart) / 60) * DESK_HOUR_PX,
          /* 22px es el minimo con el que el titulo sigue siendo legible. Un
             bloque de 15 minutos se dibuja mas alto de lo que dura, a
             proposito: prefiero que se lea a que sea proporcional. */
          height: Math.max(((to - from) / 60) * DESK_HOUR_PX, 22),
        },
      ];
    });

    const blockTitles = new Set(positioned.map((b) => b.title));
    const loose = items
      .filter((t) => t.due_on === dateStr && !blockTitles.has(t.title))
      .map((t) => ({ id: t.id, title: t.title }));

    return {
      dateStr,
      dow: WEEKDAY_SHORT_ES[getDayOfWeek(dateStr)],
      dayNum: day,
      isToday: dateStr === todayStr,
      reminder: rem
        ? { title: rem.title, hora: rem.occurs_at ? formatTimeOfDay(rem.occurs_at) : '' }
        : null,
      loose,
      blocks: positioned,
    };
  });

  const nowCol = grid.findIndex((d) => d.isToday);
  const nowMin = getCurrentTimeMinutes(timezone);
  const inRail = nowCol >= 0 && nowMin >= railStart && nowMin <= railEnd;

  const m = parseDateString(mondayStr);
  const s = parseDateString(sundayStr);
  const title =
    m.month === s.month
      ? `${m.day} – ${s.day} ${MONTH_NAMES_ES[m.month - 1].slice(0, 3)}`
      : `${m.day} ${MONTH_NAMES_ES[m.month - 1].slice(0, 3)} – ${s.day} ${MONTH_NAMES_ES[
          s.month - 1
        ].slice(0, 3)}`;

  return {
    mondayStr,
    title,
    strip,
    days: cards,
    grid,
    nowTop: inRail ? ((nowMin - railStart) / 60) * DESK_HOUR_PX : null,
    nowCol: inRail ? nowCol : null,
    nowLabel: inRail
      ? `${String(Math.floor(nowMin / 60)).padStart(2, '0')}:${String(nowMin % 60).padStart(2, '0')}`
      : '',
  };
}

/* ================================================================== DIA === */

export type DayBlockView = {
  id: string;
  itemId?: string | null;
  kind: Entity;
  title: string;
  meta: string;
  top: number;
  height: number;
  showMeta: boolean;
  done?: boolean;
};

export type DayNoHourTask = {
  id: string;
  title: string;
  done: boolean;
};

export type Fd4DayData = {
  dateStr: string;
  /** "Jueves 17" */
  title: string;
  /** "Hoy · 8:52" · "Mañana" · "Septiembre 2026" */
  sub: string;
  isToday: boolean;
  /** Posicion en px de la linea de ahora, o null si no es hoy o esta fuera del riel. */
  nowTop: number | null;
  /** "8:52" */
  nowLabel: string;
  band: { id: string; title: string; meta: string } | null;
  /** Tareas del dia sin hora: no caben en el riel y no pueden desaparecer. */
  noHour: DayNoHourTask[];
  blocks: DayBlockView[];
  /** Las horas de clase como franja gris "En clase", sin nombre (#53). Solo
      dicen que ese rato no está libre; el horario vive en la pestaña Clases. */
  classBands: { id: string; top: number; height: number }[];
};

export async function getDayView(
  supabase: SupabaseClient<Database>,
  userId: string,
  dateStr: string,
  timezone = 'America/Caracas'
): Promise<Fd4DayData> {
  const todayStr = getTodayString(timezone);
  const isToday = dateStr === todayStr;

  /* Se materializa la semana entera y no solo el dia: el usuario va a tocar
     las flechas, y hacerlo dia a dia dispara una escritura por navegacion. */
  const week = getDaysOfWeek(dateStr);
  await materializeScheduleTemplates(supabase, userId, week[0], week[6], timezone);

  const [blocksRes, itemsRes, remindersRes, contextsRes] = await Promise.all([
    supabase
      .from('blocks')
      .select('id, item_id, title, starts_at, ends_at, source, context_id, status')
      .eq('user_id', userId)
      .gte('starts_at', dayStartUTC(dateStr))
      .lte('starts_at', dayEndUTC(dateStr))
      .order('starts_at', { ascending: true }),
    supabase
      .from('items')
      .select('id, title, due_on, context_id, status')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned', 'done'])
      .eq('due_on', dateStr),
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days, context_id, notes')
      .eq('user_id', userId)
      .eq('occurs_on', dateStr)
      .order('occurs_at', { ascending: true, nullsFirst: false }),
    supabase.from('contexts').select('id, name').eq('user_id', userId),
  ]);

  const rawBlocks = blocksRes.data ?? [];
  const items = (itemsRes.data ?? []) as Pick<Task, 'id' | 'title' | 'due_on' | 'context_id' | 'status'>[];
  const reminders = (remindersRes.data ?? []) as Reminder[];
  const contextName = new Map((contextsRes.data ?? []).map((c) => [c.id, c.name]));

  const toPx = (minutes: number) => ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_PX;

  /* Las clases solo marcan dónde NO hay hueco: una franja gris sin nombre. */
  const classBands = rawBlocks
    .filter((b) => b.source === 'template')
    .map((b) => {
      const from = localMinutes(b.starts_at, timezone);
      const to = localMinutes(b.ends_at, timezone);
      return { id: b.id, top: toPx(from), height: (Math.max(to - from, 15) / 60) * HOUR_PX };
    });

  const blocks: DayBlockView[] = [];

  for (const b of rawBlocks) {
    if (b.source === 'template') continue;
    const from = localMinutes(b.starts_at, timezone);
    const to = localMinutes(b.ends_at, timezone);
    const mins = Math.max(to - from, 30);

    const start = formatClock(b.starts_at, timezone);
    const end = formatClock(b.ends_at, timezone);
    const ctx = b.context_id ? contextName.get(b.context_id) : undefined;

    blocks.push({
      id: b.id,
      itemId: b.item_id,
      kind: 'task',
      title: b.title,
      meta: [mins >= 60 ? `${start} – ${end}` : start, ctx].filter(Boolean).join(' · '),
      top: toPx(from),
      /* 50px de suelo: por debajo de eso el titulo no cabe y el bloque se
         convierte en una raya de color sin informacion. */
      height: Math.max((mins / 60) * HOUR_PX, 50),
      showMeta: true,
      done: b.status === 'done',
    });
  }

  /* Un reminder CON hora tambien entra al riel, encima de todo: si el parcial
     es a las 10, el riel tiene que enseñar que a las 10 no hay hueco. */
  for (const r of reminders) {
    if (!r.occurs_at) continue;
    const from = timeToMinutes(r.occurs_at);
    blocks.push({
      id: r.id,
      kind: 'reminder',
      title: r.title,
      meta: formatTimeOfDay(r.occurs_at),
      top: toPx(from),
      height: 50,
      showMeta: true,
    });
  }

  /* Y ademas encabeza el dia con una banda. No es duplicar: el bloque dice
     "a las 10 estas ocupado", la banda dice "hoy es el dia del parcial". */
  const band = reminders[0]
    ? {
        id: reminders[0].id,
        title: reminders[0].title,
        meta: `${dayLabel(dateStr).toLowerCase()} · ${
          reminders[0].occurs_at ? formatTimeOfDay(reminders[0].occurs_at) : 'sin hora'
        }`,
      }
    : null;

  const blockItemIds = new Set(rawBlocks.map((b) => b.item_id).filter(Boolean) as string[]);
  const noHour: DayNoHourTask[] = items
    .filter((t) => !blockItemIds.has(t.id))
    .map((t) => ({ id: t.id, title: t.title, done: t.status === 'done' }));

  /* La linea de ahora. Solo hoy, y solo si la hora actual cae dentro del riel:
     a las 6 de la manana no hay donde dibujarla y forzarla al borde de arriba
     seria decir que son las 7. */
  let nowTop: number | null = null;
  let nowLabel = '';
  if (isToday) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const minutes = h * 60 + Number(m);
    if (h >= DAY_START_HOUR && h <= DAY_END_HOUR) {
      nowTop = toPx(minutes);
      nowLabel = `${h}:${m}`;
    }
  }

  const { year } = parseDateString(dateStr);
  const sub = isToday
    ? `Hoy${nowLabel ? ` · ${nowLabel}` : ''}`
    : dateStr === addDays(todayStr, 1)
      ? 'Mañana'
      : dateStr === addDays(todayStr, -1)
        ? 'Ayer'
        : `${year}`;

  return {
    dateStr,
    title: dayFullLabel(dateStr),
    sub,
    isToday,
    nowTop,
    nowLabel,
    band,
    noHour,
    blocks: blocks.sort((a, b) => a.top - b.top),
    classBands,
  };
}

/* =============================================================== CLASES === */

export type ClassSlot = {
  id: string;
  title: string;
  /** "8:00 – 9:30" */
  hours: string;
  location: string | null;
  /** La clase en curso o la siguiente; las demás, null. */
  status: 'now' | 'next' | null;
};

export type ClassDay = {
  weekday: number;
  /** "Lunes" */
  label: string;
  isToday: boolean;
  slots: ClassSlot[];
};

export type Fd4ClassesData = {
  days: ClassDay[];
  /** "15 sep – 20 feb", o vacío si no hay horario. */
  range: string;
};

/**
 * El horario del semestre, por día de la semana.
 *
 * Sale de `schedule_templates` y no de `blocks`: es el mismo todas las
 * semanas, así que no hay fecha que recorrer. Solo días con clase.
 */
export async function getClassesView(
  supabase: SupabaseClient<Database>,
  userId: string,
  timezone = 'America/Caracas'
): Promise<Fd4ClassesData> {
  const todayStr = getTodayString(timezone);
  const todayDow = getDayOfWeek(todayStr);
  const nowMin = getCurrentTimeMinutes(timezone);

  const { data } = await supabase
    .from('schedule_templates')
    .select('id, title, weekday, start_time, end_time, location, active_from, active_until')
    .eq('user_id', userId)
    .or(`active_until.is.null,active_until.gte.${todayStr}`)
    .order('start_time', { ascending: true });

  const templates = data ?? [];

  /* Lunes primero: la semana del estudiante empieza ahí. */
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days: ClassDay[] = order
    .map((weekday) => ({
      weekday,
      label: WEEKDAY_FULL_ES[weekday].charAt(0).toUpperCase() + WEEKDAY_FULL_ES[weekday].slice(1),
      isToday: weekday === todayDow,
      slots: templates
        .filter((t) => t.weekday === weekday)
        .map((t) => ({
          id: t.id,
          title: t.title,
          hours: `${formatTimeOfDay(t.start_time)} – ${formatTimeOfDay(t.end_time)}`,
          location: t.location,
          status: null as ClassSlot['status'],
        })),
    }))
    .filter((d) => d.slots.length > 0);

  /* En curso, o si no la siguiente: hoy después de ahora, o el próximo día. */
  const semesterOn = templates.some((t) => t.active_from <= todayStr);
  if (semesterOn) {
    const current = templates.find(
      (t) =>
        t.weekday === todayDow &&
        timeToMinutes(t.start_time) <= nowMin &&
        nowMin < timeToMinutes(t.end_time)
    );
    let next = current ? undefined : templates.find((t) => t.weekday === todayDow && timeToMinutes(t.start_time) > nowMin);
    for (let i = 1; !current && !next && i <= 7; i++) {
      next = templates.find((t) => t.weekday === (todayDow + i) % 7);
    }
    const mark = current ?? next;
    for (const d of days) {
      for (const slot of d.slots) {
        if (slot.id === mark?.id) slot.status = current ? 'now' : 'next';
      }
    }
  }

  const from = templates.map((t) => t.active_from).sort()[0];
  const until = templates.map((t) => t.active_until).filter(Boolean).sort().pop();
  const short = (d: string) => {
    const { month, day } = parseDateString(d);
    return `${day} ${MONTH_NAMES_ES[month - 1].slice(0, 3)}`;
  };

  return {
    days,
    range: from ? (until ? `${short(from)} – ${short(until)}` : `desde el ${short(from)}`) : '',
  };
}

/* ======================================================= NAVEGACION ======= */

/**
 * Un solo juego de flechas para las tres vistas.
 *
 * Es la decision de FD4 que mas cambia el uso diario: la flecha izquierda
 * significa "lo anterior de lo que estoy viendo" — mes anterior, semana
 * anterior o dia anterior — y no hay tres juegos de controles compitiendo en
 * una cabecera de 390px de ancho.
 */
export function stepDate(view: CalView, dateStr: string, delta: number): string {
  /* El horario es el mismo todas las semanas: Clases no tiene "anterior". */
  if (view === 'clases') return dateStr;
  if (view === 'dia') return addDays(dateStr, delta);
  if (view === 'semana') return addDays(getMondayOfWeek(dateStr), delta * 7);

  const { year, month, day } = parseDateString(dateStr);
  const target = month - 1 + delta;
  const y = year + Math.floor(target / 12);
  const m = ((target % 12) + 12) % 12;
  /* El 31 de marzo menos un mes no es el 31 de febrero. Se recorta al ultimo
     dia real del mes destino. */
  return formatDateString(y, m + 1, Math.min(day, getDaysInMonth(y, m + 1)));
}

/** El subtitulo bajo el titulo de la cabecera, distinto por vista. */
export function viewSubtitle(view: CalView, data: { sub?: string }): string {
  if (view === 'mes') return 'Toca un día para abrirlo';
  if (view === 'semana') return 'Toca un día para abrirlo';
  return data.sub ?? '';
}

export { WEEKDAY_SHORT_ES };
