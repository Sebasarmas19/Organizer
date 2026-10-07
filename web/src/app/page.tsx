/**
 * Organizer · Pantalla de Inicio · el resumen de hoy
 *
 * Todo de un vistazo, en orden de urgencia: lo siguiente, el dia, la racha,
 * lo de ayer y lo que se viene. Esta pagina solo consulta; lo que se
 * adelanta al tocar vive en <InicioScreen>.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getHomeData } from '@/lib/home';
import { getClassesView } from '@/lib/fd4-calendar';
import type { DigestDay } from '@/lib/thread';
import { getCurrentTimeMinutes, getDayOfWeek } from '@/lib/date-utils';
import { restOfTodayClasses } from '@/components/fd4/homeSchedule';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { InicioScreen } from '@/components/inicio/InicioScreen';
import { Setup } from './Setup';

/* Nunca estatica: depende de la cookie de sesion y de la fecha de hoy. */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  /* Antes de que existan las claves no hay nada que consultar, y una pantalla
     de error de Next no explica que hay que copiar el .env.local. */
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* El proxy ya manda a /entrar sin sesion; esto es el cinturon por si
     alguna vez esta pagina se renderiza fuera de ese camino. */
  if (!user) redirect('/entrar');

  const home = await getHomeData(supabase, user.id);
  const timezone = home.timezone;
  const classes = await getClassesView(supabase, user.id, timezone);

  const nowMin = getCurrentTimeMinutes(timezone);
  const { note } = restOfTodayClasses(classes, getDayOfWeek(home.todayStr), nowMin);

  /* Del horario solo viaja hoy, y solo lo que pinta el dia. */
  const today = classes.days.find((d) => d.isToday);
  const classDays: DigestDay[] = today
    ? [
        {
          isToday: true,
          slots: today.slots.map(({ id, title, location, hours }) => ({ id, title, location, hours })),
        },
      ]
    : [];

  /* "Lunes 5" + "Octubre" -> "lunes 5 de octubre". */
  const [weekday, ...dayRest] = home.dayTitle.split(' ');
  const dateLabel = `${weekday.toLowerCase()} ${dayRest.join(' ')} de ${home.monthLabel.toLowerCase()}`;

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={home.todayStr} />
      <InicioScreen
        todayStr={home.todayStr}
        dateLabel={dateLabel}
        streakDays={home.streakDays}
        graceLeft={home.streakGraceLeft}
        nowMin={nowMin}
        tasks={home.hoy}
        classDays={classDays}
        note={note}
        semana={home.semana}
        ayer={home.ayer}
        reviewDue={home.weekReviewDue}
      />
    </div>
  );
}
