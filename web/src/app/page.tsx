/**
 * Organizer · Pantalla de Inicio (FD4)
 * Módulo principal: Tarea en foco ("Lo siguiente"), entregas próximas ("Se viene") y pendientes ("De ayer").
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getHomeData } from '@/lib/home';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { FocusToday } from '@/components/fd4/FocusToday';
import { ReminderCard } from '@/components/fd4/ReminderCard';
import { Overdue } from '@/components/fd4/Overdue';
import { Flag } from '@/components/fd4/Marks';
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

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(timezone)} />

      <main className="fd-screen">
        <header className="fd-home__head">
          <Link href={`/calendario?v=dia&d=${home.todayStr}`} prefetch={true} className="fd-home__date">
            <h1 className="fd-h1">{home.dayTitle}</h1>
            <span className="fd-sub">{home.monthLabel} · ver el día</span>
          </Link>

          <div className="fd-home__actions">
            {home.streakDays > 0 ? (
              <span className="fd-pill fd-pill--line fd-home__streak">
                {home.streakDays} {home.streakDays === 1 ? 'día' : 'días'}
              </span>
            ) : null}

            <Link href="/ajustes" prefetch={true} className="fd-gearbtn" aria-label="Ajustes" title="Ajustes">
              <Icon name="settings" size="md" />
            </Link>
          </div>
        </header>

        <div className="fd-home">
          {/* 1 · Lo siguiente, y el resto de hoy plegado debajo. */}
          <div className="fd-home__focus">
            <FocusToday tasks={home.hoy} todayStr={home.todayStr} />
          </div>

          {/* 2 · Lo de ayer, plegado en el telefono: va antes que lo que se viene. */}
          <div className="fd-home__ayer">
            <Overdue tasks={home.ayer} todayStr={home.todayStr} />
          </div>
          {/* 3 · Lo que se viene: reminders con su preparacion o sin ella. */}
          <section className="fd-home__week">
            <div className="fd-seclabel" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Flag size="xs" />
                <h2>Próximos</h2>
              </span>
              <Link href="/reminders/nuevo" className="pl-back" style={{ minHeight: 36, paddingRight: 10 }}>
                <Icon name="plus" size="sm" />
                Reminder
              </Link>
            </div>

            {home.semana.length > 0 ? (
              <div className="fd-remlist">
                {home.semana.map((r) => (
                  <ReminderCard key={r.id} reminder={r} />
                ))}
              </div>
            ) : (
              <p className="fd-empty" style={{ padding: '0 4px' }}>
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
