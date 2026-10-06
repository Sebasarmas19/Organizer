/**
 * Organizer · Pantalla de Inicio (FD5 «Calma»)
 * Un solo elemento saturado: el bloque de lo siguiente. Debajo, "Resto de hoy"
 * (tareas y clases por hora), "Lo de ayer" y "Se viene".
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getHomeData } from '@/lib/home';
import { getClassesView } from '@/lib/fd4-calendar';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getCurrentTimeMinutes, getDayOfWeek, getTodayString } from '@/lib/date-utils';
import { FocusToday } from '@/components/fd4/FocusToday';
import { UpcomingRow } from '@/components/fd4/UpcomingRow';
import { Overdue } from '@/components/fd4/Overdue';
import { restOfTodayClasses } from '@/components/fd4/homeSchedule';
import { Icon } from '@/components/Icon';
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

  /* "Martes 6" -> "Martes" + "6": el numero va grande, el dia a su lado. */
  const [weekday, ...dayRest] = home.dayTitle.split(' ');
  const dayNumber = dayRest.join(' ');
  const nowMin = getCurrentTimeMinutes(timezone);
  const rest = restOfTodayClasses(classes, getDayOfWeek(home.todayStr), nowMin);

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(timezone)} />

      <main className="fd-screen">
        <header className="fd-home__head fd5-hd">
          <Link
            href={`/calendario?v=dia&d=${home.todayStr}`}
            prefetch={true}
            className="fd5-hd__date"
            aria-label={`${home.dayTitle} de ${home.monthLabel.toLowerCase()} · ver el día`}
          >
            <span className="fd5-hd__num" aria-hidden>
              {dayNumber}
            </span>
            <span className="fd5-hd__word" aria-hidden>
              {weekday}
              <small>{home.monthLabel.toLowerCase()}</small>
            </span>
          </Link>

          {/* La racha, junto a la fecha (#74). Discreta: no compite con el bloque azul. */}
          {home.streakDays > 0 ? (
            <span className="fd5-hd__streak" title="Días seguidos cerrando algo">
              {home.streakDays} {home.streakDays === 1 ? 'día' : 'días'}
            </span>
          ) : null}
          <Link
            href="/planear"
            className="fd5-smallbtn"
            title="El asistente mira tu agenda y te propone cuándo"
          >
            Planear
          </Link>
          <Link href="/ajustes" prefetch={true} className="fd5-hd__gear" aria-label="Ajustes" title="Ajustes">
            <Icon name="settings" size="md" />
          </Link>
        </header>

        <div className="fd-home fd5-home">
          {/* 1 · Lo siguiente y el resto de hoy, con las clases dentro. */}
          <div className="fd-home__focus">
            <FocusToday
              tasks={home.hoy}
              todayStr={home.todayStr}
              classes={rest.classes}
              note={rest.note}
              nowMin={nowMin}
            />
          </div>

          {/* 2 · Lo de ayer: una franja hundida que se abre al tocarla. */}
          <div className="fd-home__ayer">
            <Overdue tasks={home.ayer} todayStr={home.todayStr} />
          </div>

          {/* 3 · Se viene: reminders con su preparacion o sin ella. */}
          <section className="fd-home__week fd5-sec" aria-labelledby="fd5-up-label">
            <div className="fd5-sec__head">
              <h2 id="fd5-up-label">Se viene</h2>
              <span className="fd5-sec__links">
                <Link href="/reminders/nuevo">
                  <Icon name="plus" size="sm" />
                  Reminder
                </Link>
              </span>
            </div>

            {home.semana.length > 0 ? (
              <div className="fd5-list">
                {home.semana.map((r) => (
                  <UpcomingRow key={r.id} reminder={r} />
                ))}
              </div>
            ) : (
              <p className="fd5-empty">
                Nada marcado. Añade parciales y entregas para que te avise con tiempo.
              </p>
            )}
          </section>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
