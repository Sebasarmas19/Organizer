/* ============================================================================
   Organizer · FD4 · los datos de Inicio

   Inicio es la unica pantalla que el usuario ve sin haber decidido verla: es
   donde cae al abrir la app desde la notificacion. Asi que responde tres
   preguntas y ni una mas:

     1. ¿Que hay hoy?              -> `hoy`
     2. ¿Que se viene?             -> `semana` (reminders, con su preparacion)
     3. ¿Que se me quedo colgando? -> `ayer`

   Lo de "y ni una mas" es literal. Cualquier cosa que se anada aqui compite
   con las tres, y la pantalla tiene que caber sin scroll en un iPhone.

   Todo se resuelve en el servidor y en una sola tanda de consultas. Nada de
   esto es reactivo: Inicio se pinta con lo que hay y se revalida cuando una
   accion la cambia (ver `fd4-actions.ts`).
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Reminder, Task } from '@/lib/supabase/database.types';
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
  return `${base} · ${formatClock(timeStr, timezone)}`;
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
  timezone = 'America/Caracas'
): Promise<HomeData> {
  const todayStr = getTodayString(timezone);
  const horizonStr = addDays(todayStr, 45);

  /* El dia local en UTC. La app fija Caracas (UTC-4, sin horario de verano)
     igual que hace `calendar.ts`; cuando `profiles.timezone` deje de ser
     siempre Caracas, este offset sale de ahi y no de una constante. */
  const dayStartUTC = new Date(`${todayStr}T00:00:00-04:00`).toISOString();
  const dayEndUTC = new Date(`${todayStr}T23:59:59-04:00`).toISOString();

  const [blocksRes, itemsRes, remindersRes, contextsRes, doneRes] = await Promise.all([
    /* Bloques de hoy que son de una tarea (no de una materia): son los que
       le ponen hora a lo que se ve en "Hoy". */
    supabase
      .from('blocks')
      .select('id, item_id, title, starts_at, ends_at, context_id, source')
      .eq('user_id', userId)
      .eq('source', 'manual')
      .gte('starts_at', dayStartUTC)
      .lte('starts_at', dayEndUTC)
      .order('starts_at', { ascending: true }),

    /* Todo lo que sigue vivo y tiene fecha hasta hoy: lo de hoy y lo que se
       quedo atras. Una sola consulta para las dos secciones. */
    supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['inbox', 'someday', 'planned', 'done'])
      .not('due_on', 'is', null)
      .lte('due_on', todayStr)
      .order('due_on', { ascending: false }),

    supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('occurs_on', todayStr)
      .lte('occurs_on', horizonStr)
      .order('occurs_on', { ascending: true })
      .limit(3),

    supabase.from('contexts').select('id, name').eq('user_id', userId),

    /* Para la racha. 90 dias es el techo: mas alla el numero deja de
       significar nada y la consulta empieza a costar. */
    supabase
      .from('items')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
      .order('completed_at', { ascending: false }),
  ]);

  const blocks = blocksRes.data ?? [];
  const items = (itemsRes.data ?? []) as Task[];
  const reminders = (remindersRes.data ?? []) as Reminder[];

  const contextName = new Map((contextsRes.data ?? []).map((c) => [c.id, c.name]));

  /* Hora de cada tarea que tiene bloque hoy. Si una tarea tiene dos bloques,
     manda el primero: es el que dice cuando empieza el dia de esa tarea. */
  const blockByItem = new Map<string, (typeof blocks)[number]>();
  for (const b of blocks) {
    if (b.item_id && !blockByItem.has(b.item_id)) blockByItem.set(b.item_id, b);
  }

  /* --------------------------------------------------------------- hoy -- */
  const hoy: HomeTask[] = items
    .filter((t) => t.due_on === todayStr)
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

  const semana: HomeReminder[] = reminders.map((r) => {
    const prep = prepByReminder.get(r.id) ?? [];
    return {
      id: r.id,
      title: r.title,
      when: formatWhen(r.occurs_on, r.occurs_at, timezone),
      dateStr: r.occurs_on,
      prep,
      emptyLabel: prep.length ? '' : `${formatDistance(todayStr, r.occurs_on)} · nada planificado`,
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
    dayTitle: formatDayHeading(todayStr),
    monthLabel: MONTH_NAMES_CAP_ES[month - 1],
    streakDays,
    hoy,
    semana,
    ayer,
  };
}
