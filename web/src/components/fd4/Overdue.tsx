'use client';

/* ============================================================================
   Organizer · FD4 · <Overdue>  ·  "De ayer"

   ESTA SECCION ES LA REGLA 5 DEL PROYECTO HECHA PANTALLA.

     "Nada se pierde en silencio. Si una tarea no se cumple, la app pregunta
      que hacer — no la arrastra sola ni la borra."

   De ahi salen las tres decisiones que tiene esta seccion y que parecen
   cosmeticas y no lo son:

   1. FONDO HUNDIDO, no tarjeta blanca. Lo de ayer no compite con lo de hoy.
      Esta ahi, se ve, y no es lo primero que lees.

   2. TRES SALIDAS EXPLICITAS Y NINGUNA POR DEFECTO. "Hoy" la trae, "Otro
      dia" la suelta para que el usuario le ponga fecha desde Pendientes, y
      "Quitar" le quita la fecha. Arrastrar sola una tarea al dia siguiente
      es lo que convierte una lista en una deuda: al tercer dia hay catorce
      cosas "de hoy" y ninguna es de hoy.

   3. "QUITAR" NO BORRA, y lo dice debajo con todas sus letras. La tarea se
      queda en Pendientes · Sin fecha. Si de verdad hay que borrarla, eso se
      hace desde Pendientes, mirandola, no de un toque a las 8 de la manana.

   Las tres acciones son optimistas: la fila sale de la lista en el acto. Si
   el servidor falla, React la devuelve sola.
   ========================================================================= */

import { useOptimistic, useTransition } from 'react';
import { moveTaskToDate, unscheduleTask } from '@/lib/fd4-actions';
import type { OverdueTask } from '@/lib/home';

export function Overdue({ tasks, todayStr }: { tasks: OverdueTask[]; todayStr: string }) {
  /* La lista optimista guarda los ids ya resueltos, no una copia de la
     lista: asi el servidor sigue mandando sobre el contenido y lo unico que
     adelanta el cliente es la desaparicion. */
  const [resolved, resolve] = useOptimistic<string[], string>(
    [],
    (prev, id) => [...prev, id]
  );
  const [, startTransition] = useTransition();

  const visible = tasks.filter((t) => !resolved.includes(t.id));
  if (visible.length === 0) return null;

  const run = (id: string, fn: () => Promise<void>) => {
    startTransition(async () => {
      resolve(id);
      await fn();
    });
  };

  return (
    <section>
      <div className="fd-seclabel fd-seclabel--quiet">
        <h2>De ayer</h2>
      </div>

      <div className="fd-card fd-card--sunken">
        {visible.map((task) => (
          <div className="fd-ayer__item" key={task.id}>
            <div className="fd-ayer__text">
              <span className="fd-ayer__title">{task.title}</span>
              <span className="fd-meta">{task.meta}</span>
            </div>

            <div className="fd-ayer__acts">
              <button
                type="button"
                className="fd-btn"
                onClick={() => run(task.id, () => moveTaskToDate(task.id, todayStr))}
              >
                Hoy
              </button>
              <button
                type="button"
                className="fd-btn fd-btn--ghost"
                onClick={() => run(task.id, () => moveTaskToDate(task.id, null))}
              >
                Otro día
              </button>
              <button
                type="button"
                className="fd-btn fd-btn--quiet"
                onClick={() => run(task.id, () => unscheduleTask(task.id))}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="fd-note">Quitar no borra: vuelve a Pendientes.</p>
    </section>
  );
}
