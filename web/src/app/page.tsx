/* ============================================================================
   Organizer · FD4 · Inicio

   Esta es la pantalla de verdad. La que habia aqui antes era el suelo de F0:
   una galeria para comprobar que los cinco componentes portados se veian como
   en los comps. Ya cumplio y se reemplazo entera, que es lo que decia su
   propia cabecera que iba a pasar.

   INICIO ES DONDE CAE EL USUARIO AL TOCAR LA NOTIFICACION. No es un panel de
   control ni un resumen: es la respuesta a tres preguntas, en este orden,
   porque es el orden en que se hacen a las 8 de la manana.

     1. ¿Que hay hoy?              Tareas del dia, marcables de un toque.
     2. ¿Que se viene?             Reminders, con su preparacion o sin ella.
     3. ¿Que se me quedo colgando? Lo de ayer, con tres salidas.

   Lo que NO hay aqui, y no por falta de tiempo:
     · ningun contador ("3 de 7 completadas")
     · ningun grafico, ninguna barra de progreso
     · ningun "buenos dias, Sebastian"
   Todo eso ocupa el sitio de una de las tres preguntas y no contesta ninguna.

   La fecha de arriba es un boton: tocarla abre el dia en Calendario. Se
   escribe como titulo porque es un titulo, pero es la forma mas corta de
   llegar al riel de horas desde el sitio donde ya estas mirando.
   ========================================================================= */

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getHomeData } from '@/lib/home';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { TaskRow } from '@/components/fd4/TaskRow';
import { ReminderCard } from '@/components/fd4/ReminderCard';
import { Overdue } from '@/components/fd4/Overdue';
import { Dot, Flag } from '@/components/fd4/Marks';
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
  if (!user) return <Setup />;

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const home = await getHomeData(supabase, user.id, timezone);

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(timezone)} />

      <main className="fd-screen">
        <header className="fd-home__head">
          <Link href={`/calendario?v=dia&d=${home.todayStr}`} className="fd-home__date">
            <h1 className="fd-h1">{home.dayTitle}</h1>
            <span className="fd-sub">{home.monthLabel} · ver el día</span>
          </Link>

          {/* La racha solo aparece cuando existe. Un "0 dias" en la esquina
              de la pantalla de inicio es un reproche diario, y esta app no
              esta para eso. */}
          {home.streakDays > 0 ? (
            <span className="fd-pill fd-pill--line fd-home__streak">
              {home.streakDays} {home.streakDays === 1 ? 'día' : 'días'}
            </span>
          ) : null}
        </header>

        <div className="fd-sections">
          {/* ------------------------------------------------------- hoy -- */}
          <section>
            <div className="fd-seclabel">
              <Dot entity="task" />
              <h2>Hoy</h2>
            </div>

            <div className="fd-card">
              <span className="fd-card__rail fd-card__rail--task" aria-hidden />
              <div className="fd-card__body">
                {home.hoy.length > 0 ? (
                  home.hoy.map((task) => <TaskRow key={task.id} task={task} />)
                ) : (
                  <p className="fd-task">
                    <span className="fd-task__text">
                      <span className="fd-empty">Hoy no hay nada con fecha.</span>
                    </span>
                  </p>
                )}

                {/* Siempre visible, incluso con la lista vacia: es la puerta
                    a lo que se capturo y todavia no tiene dia. */}
                <Link href="/pendientes" className="fd-more">
                  <span>El resto está en Pendientes</span>
                  <span className="fd-more__chev" aria-hidden>
                    ›
                  </span>
                </Link>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------- esta semana -- */}
          {home.semana.length > 0 ? (
            <section>
              <div className="fd-seclabel">
                <Flag size="xs" />
                <h2>Esta semana</h2>
              </div>

              <div className="fd-remlist">
                {home.semana.map((r) => (
                  <ReminderCard key={r.id} reminder={r} />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---------------------------------------------------- ayer --- */}
          <Overdue tasks={home.ayer} todayStr={home.todayStr} />
        </div>
      </main>

      <TabBar />
    </div>
  );
}
