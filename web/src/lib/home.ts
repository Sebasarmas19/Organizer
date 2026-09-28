/**
 * Organizer · Lógica de datos de Inicio (FD4)
 * Consulta en una sola tanda: tareas del día ('hoy'), próximos recordatorios ('semana') y pendientes ('ayer').
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reminder, Task } from '@/lib/supabase/database.types';
import { DEFAULT_TIMEZONE } from './profile';
import { dayRangeUtc, formatTimeOfDay } from './tz';
import {
  MONTH_NAMES_CAP_ES,
  WEEKDAY_FULL_ES,
  addDays,
  getDayOfWeek,
  getTodayString,
  parseDateString,
} from './date-utils';

export type HomeTask = {
  id: string;
  title: string;
  /** "15:00 – 17:00 · Proyecto IA". Cadena vacia si la tarea no tiene hora. */
  meta: string;
  /** Titulo del reminder que prepara, si prepara alguno. */
  rem?: string;
  done: boolean;
};

export type HomeReminder = {
  id: string;
  title: string;
  /** "viernes 18 · 10:00" */
  when: string;
  dateStr: string;
  /** Titulos de las tareas que cuelgan de este reminder. */
  prep: string[];
  /** "en 4 dias · nada planificado". Solo cuando `prep` esta vacio. */
  emptyLabel: string;
};

export type OverdueTask = {
  id: string;
  title: string;
  /** "ayer · 18:00" o "hace 3 dias · sin hora" */
  meta: string;
};

export type HomeData = {
  todayStr: string;
  timezone: string;
  /** "Jueves 17" */
  dayTitle: string;
  /** "Septiembre" */
  monthLabel: string;
  /** Dias seguidos cerrando al menos una tarea. 0 = no se enseña. */
  streakDays: number;
  hoy: HomeTask[];
  semana: HomeReminder[];
  ayer: OverdueTask[];
};

/* -------------------------------------------------------------- formato ---
   Estas cuatro funciones existen para que las cadenas visibles se decidan en
   UN sitio. Si "viernes 18 · 10:00" se construye en tres componentes, tarde o
   temprano uno de los tres pone la coma.                                  */

/** "Jueves 17" · el titulo de Inicio. Va capitalizado porque es un titulo. */
export function formatDayHeading(dateStr: string): string {
  const { day } = parseDateString(dateStr);
  const name = WEEKDAY_FULL_ES[getDayOfWeek(dateStr)];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${day}`;
}

/** "viernes 18" o "viernes 18 · 10:00". En minuscula: va dentro de una frase. */
export function formatWhen(dateStr: string, timeStr: string | null, timezone: string): string {
  const { day } = parseDateString(dateStr);
  const base = `${WEEKDAY_FULL_ES[getDayOfWeek(dateStr)]} ${day}`;
  if (!timeStr) return base;
  /* `reminders.occurs_at` es una columna `time` ("10:00:00"), no un instante:
     no se convierte de zona. Un `timestamptz` si. */
  const clock = timeStr.includes('T') ? formatClock(timeStr, timezone) : formatTimeOfDay(timeStr);
  return clock ? `${base} · ${clock}` : base;
}

/** Un `timestamptz` a "15:00" en la zona del usuario. Sin cero delante. */
export function formatClock(iso: string, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date(iso));
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/** Dias entre dos fechas YYYY-MM-DD. Positivo si `b` es posterior. */
export function daysBetween(a: string, b: string): number {
  const pa = parseDateString(a);
  const pb = parseDateString(b);
  const ua = Date.UTC(pa.year, pa.month - 1, pa.day);
  const ub = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((ub - ua) / 86_400_000);
}

/** "hoy" · "manana" · "en 4 dias" · "ayer" · "hace 3 dias" */
export function formatDistance(todayStr: string, dateStr: string): string {
  const d = daysBetween(todayStr, dateStr);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 1) return `en ${d} días`;
  return `hace ${Math.abs(d)} días`;
}

/* ------------------------------------------------------------ la consulta */

/**
 * Todo lo que Inicio necesita, en una sola llamada.
 *
 * El rango de reminders llega a +45 dias y no a +7 aunque la seccion se
 * llame "Esta semana": si lo unico que hay es un parcial dentro de tres
 * semanas, ensenar la seccion vacia es peor que ensenar el parcial. La
 * seccion dice cuando es cada cosa, asi que no engana.
 */
export async function getHomeData(
  supabase: SupabaseClient<Database>,
  userId: string,
  userTimezone?: string
): Promise<HomeData> {
  let timezone = userTimezone;
  if (!timezone) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle();
    timezone = prof?.timezone ?? DEFAULT_TIMEZONE;
  }

  const todayStr = getTodayString(timezone);
  const horizonStr = addDays(todayStr, 45);

  /* El dia local en UTC, con la zona del perfil. */
  const range = dayRangeUtc(todayStr, timezone);
  const dayStartUTC = range.start;
  const dayEndUTC = new Date(Date.parse(range.end) - 1).toISOString();

  const [blocksRes, itemsRes, remindersRes, contextsRes, doneRes] = await Promise.all([
    /* Bloques de hoy que son de una tarea manual */
    supabase
      .from('blocks')
      .select('id, item_id, title, starts_at, ends_at, context_id, source')
      .eq('user_id', userId)
      .eq('source', 'manual')
      .gte('starts_at', dayStartUTC)
      .lte('starts_at', dayEndUTC)
      .order('starts_at', { ascending: true }),

    /* Items hasta hoy: solo campos necesarios para renderizar Inicio */
    supabase
      .from('items')
      .select('id, title, status, due_on, reminder_id, context_id')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned', 'done'])
      .not('due_on', 'is', null)
      .lte('due_on', todayStr)
      .order('due_on', { ascending: false }),

    /* Próximos reminders: solo campos necesarios */
    supabase
      .from('reminders')
      .select('id, title, occurs_on, occurs_at, notice_days')
      .eq('user_id', userId)
      .gte('occurs_on', todayStr)
      .lte('occurs_on', horizonStr)
      .order('occurs_on', { ascending: true })
      .limit(3),

    supabase.from('contexts').select('id, name').eq('user_id', userId),

    /* Para la racha (90 días) */
    supabase
      .from('items')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
      .order('completed_at', { ascending: false }),
  ]);

  const blocks = blocksRes.data ?? [];
  const items = (itemsRes.data ?? []) as unknown as Task[];
  const reminders = (remindersRes.data ?? []) as unknown as Reminder[];

  const contextName = new Map((contextsRes.data ?? []).map((c) => [c.id, c.name]));

  /* Hora de cada tarea que tiene bloque hoy. Si una tarea tiene dos bloques,
     manda el primero: es el que dice cuando empieza el dia de esa tarea. */
  const blockByItem = new Map<string, (typeof blocks)[number]>();
  for (const b of blocks) {
    if (b.item_id && !blockByItem.has(b.item_id)) blockByItem.set(b.item_id, b);
  }

  /* --------------------------------------------------------------- hoy -- */
  const todayItems = items.filter((t) => t.due_on === todayStr);

  /* La tarjeta "Lo siguiente" dice para que sirve la tarea ("Parcial de
     Calculo · vie 2"). Los reminders de arriba solo traen los tres
     proximos, asi que los que cuelgan de hoy se piden aparte.
     Se lanzan en paralelo con la preparacion de reminders para no encadenar
     dos viajes de red seguidos. */
  const remIds = [...new Set(todayItems.map((t) => t.reminder_id).filter((v): v is string => Boolean(v)))];

  const [remRowsRes, prepRowsRes] = await Promise.all([
    remIds.length > 0
      ? supabase
          .from('reminders')
          .select('id, title, occurs_on')
          .eq('user_id', userId)
          .in('id', remIds)
      : Promise.resolve({ data: null }),
    reminders.length > 0
      ? supabase
          .from('items')
          .select('title, reminder_id, status')
          .eq('user_id', userId)
          .in(
            'reminder_id',
            reminders.map((r) => r.id)
          )
          .neq('status', 'dropped')
          .order('due_on', { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: null }),
  ]);

  const remTitle = new Map<string, string>();
  for (const r of remRowsRes.data ?? []) {
    remTitle.set(r.id, `${r.title} · ${formatWhen(r.occurs_on, null, timezone)}`);
  }

  const hoy: HomeTask[] = todayItems
    .map((t) => {
      const block = blockByItem.get(t.id);
      const ctx = t.context_id ? contextName.get(t.context_id) : undefined;

      let when = '';
      if (block) {
        const start = formatClock(block.starts_at, timezone);
        const end = formatClock(block.ends_at, timezone);
        const mins = (new Date(block.ends_at).getTime() - new Date(block.starts_at).getTime()) / 60000;
        when = mins >= 60 ? `${start} – ${end}` : start;
      }

      return {
        id: t.id,
        title: t.title,
        meta: [when, ctx].filter(Boolean).join(' · '),
        rem: t.reminder_id ? remTitle.get(t.reminder_id) : undefined,
        done: t.status === 'done',
      };
    })
    /* Las que tienen hora primero y en orden; las sueltas al final. Una tarea
       sin hora no es menos importante, pero tampoco reclama un momento. */
    .sort((a, b) => {
      if (!a.meta && b.meta) return 1;
      if (a.meta && !b.meta) return -1;
      return a.meta.localeCompare(b.meta);
    });

  /* ------------------------------------------------------- esta semana -- */
  /* En la tarjeta solo se listan los pasos que faltan; los hechos cuentan
     para saber si "no hay nada" es porque ya está todo preparado. */
  const prepByReminder = new Map<string, string[]>();
  const doneByReminder = new Map<string, number>();
  for (const row of prepRowsRes.data ?? []) {
    if (!row.reminder_id) continue;
    if (row.status === 'done') {
      doneByReminder.set(row.reminder_id, (doneByReminder.get(row.reminder_id) ?? 0) + 1);
      continue;
    }
    const list = prepByReminder.get(row.reminder_id) ?? [];
    list.push(row.title);
    prepByReminder.set(row.reminder_id, list);
  }

  const semana: HomeReminder[] = reminders.map((r) => {
    const prep = prepByReminder.get(r.id) ?? [];
    const allDone = prep.length === 0 && (doneByReminder.get(r.id) ?? 0) > 0;
    return {
      id: r.id,
      title: r.title,
      when: formatWhen(r.occurs_on, r.occurs_at, timezone),
      dateStr: r.occurs_on,
      prep,
      emptyLabel: prep.length
        ? ''
        : allDone
          ? `${formatDistance(todayStr, r.occurs_on)} · todo preparado`
          : `${formatDistance(todayStr, r.occurs_on)} · nada planificado`,
    };
  });

  /* ------------------------------------------------------------- ayer --- */
  const ayer: OverdueTask[] = items
    .filter((t) => t.due_on !== null && t.due_on < todayStr && t.status !== 'done')
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      title: t.title,
      meta: `${formatDistance(todayStr, t.due_on as string)} · ${
        contextName.get(t.context_id ?? '') ?? 'sin hora'
      }`,
    }));

  /* ------------------------------------------------------------ racha --- */
  const doneDays = new Set(
    (doneRes.data ?? [])
      .map((r) => r.completed_at)
      .filter((v): v is string => Boolean(v))
      .map((iso) =>
        new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(iso))
      )
  );

  /* Se cuenta hacia atras desde hoy. Si hoy todavia no se cerro nada, la
     racha arranca en ayer: el dia no ha terminado y cortarla a las 9 de la
     manana seria castigar por no haber empezado. */
  let streakDays = 0;
  let cursor = doneDays.has(todayStr) ? todayStr : addDays(todayStr, -1);
  while (doneDays.has(cursor) && streakDays < 90) {
    streakDays += 1;
    cursor = addDays(cursor, -1);
  }

  const { month } = parseDateString(todayStr);

  return {
    todayStr,
    timezone,
    dayTitle: formatDayHeading(todayStr),
    monthLabel: MONTH_NAMES_CAP_ES[month - 1],
    streakDays,
    hoy,
    semana,
    ayer,
  };
}
