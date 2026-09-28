/* ============================================================================
   Organizer · Materias → bloques del calendario

   `schedule_templates` guarda UNA semana. Esta función la reparte en `blocks`
   dentro de un rango de fechas, de forma idempotente: el índice único
   `blocks_template_per_day` impide dos bloques de la misma plantilla el mismo
   día, y aquí además se salta lo que ya existe.

   La llaman tres sitios:
     · el calendario, para el rango que se está viendo
     · guardar el horario, para el semestre entero
     · el cron de notificaciones, para las próximas dos semanas — así la
       notificación de la mañana trae las clases aunque nadie abra la app
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Insert } from '@/lib/supabase/database.types';
import { addDays, getDayOfWeek } from './date-utils';
import { dayRangeUtc, localDateOf, zonedIso } from './tz';

export async function materializeScheduleTemplates(
  supabase: SupabaseClient<Database>,
  userId: string,
  startDate: string,
  endDate: string,
  timezone = 'America/Caracas'
): Promise<void> {
  const { data: templates, error: tmplErr } = await supabase
    .from('schedule_templates')
    .select('id, title, weekday, start_time, end_time, context_id, reminder_min, active_from, active_until')
    .eq('user_id', userId)
    .lte('active_from', endDate);

  if (tmplErr || !templates) return;
  const valid = templates.filter((t) => !t.active_until || t.active_until >= startDate);
  if (valid.length === 0) return;

  const { data: existing } = await supabase
    .from('blocks')
    .select('template_id, starts_at')
    .eq('user_id', userId)
    .eq('source', 'template')
    .gte('starts_at', dayRangeUtc(startDate, timezone).start)
    .lt('starts_at', dayRangeUtc(endDate, timezone).end);

  const seen = new Set(
    (existing ?? [])
      .filter((b) => b.template_id)
      .map((b) => `${b.template_id}:${localDateOf(b.starts_at, timezone)}`)
  );

  const rows: Insert<'blocks'>[] = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    const dow = getDayOfWeek(day);
    for (const t of valid) {
      if (t.weekday !== dow || day < t.active_from) continue;
      if (t.active_until && day > t.active_until) continue;
      const key = `${t.id}:${day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        user_id: userId,
        template_id: t.id,
        title: t.title,
        context_id: t.context_id,
        starts_at: zonedIso(day, t.start_time, timezone),
        ends_at: zonedIso(day, t.end_time, timezone),
        status: 'pending',
        source: 'template',
        reminder_min: t.reminder_min,
      });
    }
  }

  /* Por tandas. Si dos pestañas materializan a la vez, la segunda choca con
     el índice único y Postgres rechaza la tanda ENTERA por una sola fila
     repetida. En ese caso se reintenta fila a fila: las repetidas fallan
     solas y el resto entra. (No se puede usar `upsert`: el índice es de
     expresión y PostgREST no lo acepta como destino de ON CONFLICT.) */
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const { error } = await supabase.from('blocks').insert(batch);
    if (error?.code === '23505') {
      for (const row of batch) await supabase.from('blocks').insert(row);
    }
  }
}
