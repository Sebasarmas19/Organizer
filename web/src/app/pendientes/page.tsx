/* ============================================================================
   Organizer · FD4 · Pendientes

   Lo que en F1 se llamaba Tareas. Ahora tiene dos solapas dentro — Tareas y
   Recordatorios — porque las dos contestan la misma pregunta desde lados
   distintos: "¿que tengo encima?".

   La diferencia entre las dos manda sobre el diseno entero de esta pantalla:

     una TAREA se completa  -> lleva casilla, se marca de un toque
     un REMINDER pasa       -> no lleva casilla, en ninguna parte

   Por eso la solapa de Recordatorios no tiene ni una casilla, y por eso al
   final hay una linea que lo dice con todas sus letras. Alguien que llegue
   ahi buscando donde marcar el parcial tiene que encontrar la respuesta, no
   un hueco.

   En Tareas, lo capturado sin dia no va a la lista: va al clasificador
   (<Triage>), de una en una. Cada grupo ensena cinco y pliega el resto.

   Igual que Calendario, la solapa vive en la URL (`?v=recordatorios`): atras
   funciona, y se puede enlazar directo desde una notificacion.
   ========================================================================= */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getPendientesData, type PendView } from '@/lib/fd4-pendientes';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { TaskGroupCard } from '@/components/fd4/TaskGroupCard';
import { Triage } from '@/components/fd4/Triage';
import { ReminderCard } from '@/components/fd4/ReminderCard';
import { CompletedSection } from '@/components/fd4/CompletedSection';
import { Check, Flag } from '@/components/fd4/Marks';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const [params, data] = await Promise.all([
    searchParams,
    getPendientesData(supabase, user.id),
  ]);

  const view: PendView = params.v === 'recordatorios' ? 'recordatorios' : 'tareas';

  return (
    <div className="fd-app">
      <DeskSidebar active="pendientes" todayStr={data.todayStr} />

      <main className="fd-screen fd-screen--split fd-screen--pend">
        <div className="fd-fixedhead">
          <div className="fd-pend__head">
            <h1 className="fd-h1 fd-h1--screen">Pendientes</h1>
            <span className="fd-sub">
              {view === 'tareas'
                ? data.inbox.length > 0
                  ? 'Hay capturas esperando día'
                  : 'Todo lo que capturaste'
                : 'Fechas que no dependen de ti'}
            </span>
          </div>

          {/* El conmutador lleva la marca de cada entidad dentro del propio
              boton: la casilla en Tareas, el banderin en Recordatorios. Asi
              la solapa ya te dice que vas a encontrar antes de tocarla. */}
          <div className="fd-seg" role="tablist" aria-label="Tipo de pendiente">
            <Link href="/pendientes" role="tab" aria-selected={view === 'tareas'} scroll={false}>
              <Check variant="chip" />
              Tareas
            </Link>
            <Link
              href="/pendientes?v=recordatorios"
              role="tab"
              aria-selected={view === 'recordatorios'}
              scroll={false}
            >
              <Flag size="tiny" />
              Recordatorios
            </Link>
          </div>
        </div>

        <div className="fd-scroll">
          <div className={`fd-pend__body${view === 'tareas' ? ' fd-pend__body--tareas' : ''}`}>
            {view === 'tareas' ? (
              data.groups.length > 0 || data.inbox.length > 0 ? (
                <>
                  <div className="fd-pend__triage">
                    <Triage items={data.inbox} days={data.dayOptions} />
                  </div>
                  <div className="fd-pend__groups">
                    {data.groups.map((g) => (
                      <TaskGroupCard key={g.label} label={g.label} items={g.items} />
                    ))}
                  </div>
                  <CompletedSection items={data.recentCompleted} />
                </>
              ) : (
                <>
                  <p className="fd-empty">
                    Nada pendiente. Lo que captures desde el botón ＋ aparece aquí.
                  </p>
                  <CompletedSection items={data.recentCompleted} />
                </>
              )
            ) : data.reminderGroups.length > 0 ? (
              <>
                {data.reminderGroups.map((g) => (
                  <section key={g.label}>
                    <div className="fd-seclabel">
                      <Flag size="xs" />
                      <h2>{g.label}</h2>
                    </div>

                    <div className="fd-remlist">
                      {g.items.map((r) => (
                        <ReminderCard key={r.id} reminder={r} chevron />
                      ))}
                    </div>
                  </section>
                ))}

                <p className="fd-pend__foot">
                  Un reminder no se completa: pasa. Las tareas que cuelgan de él sí.
                </p>
              </>
            ) : (
              <p className="fd-empty">Ninguna fecha marcada por delante.</p>
            )}
          </div>
        </div>
      </main>

      <TabBar />
    </div>
  );
}
