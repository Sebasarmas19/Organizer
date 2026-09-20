'use client';

/* ============================================================================
   Organizer · FD4 · <TaskRow>  ·  la fila que se marca

   TODA LA FILA ES EL BOTON, no la casilla. La casilla mide 22px; la fila
   mide 44 de alto y el ancho de la tarjeta. Marcar una tarea con el pulgar
   mientras caminas tiene que funcionar a la primera.

   EL MARCADO ES OPTIMISTA. `useOptimistic` pinta la palomita en el mismo
   frame del toque y deja que el viaje al servidor pase por detras. La
   alternativa — esperar a Supabase y despues revalidar — mete entre 200 y
   600ms de nada entre el dedo y el feedback, y en ese hueco el usuario toca
   otra vez. No es un lujo: es lo que evita el doble toque.

   Si la accion falla, React revierte el estado optimista solo y la tarea
   vuelve a aparecer sin marcar. No se pierde nada en silencio (regla 5).
   ========================================================================= */

import { useOptimistic, useTransition } from 'react';
import { toggleTask } from '@/lib/fd4-actions';
import { Check, Flag } from './Marks';

export type TaskRowData = {
  id: string;
  title: string;
  meta?: string;
  /** Titulo del reminder del que cuelga esta tarea, si cuelga de alguno. */
  rem?: string;
  done: boolean;
};

export function TaskRow({ task, roomy = false }: { task: TaskRowData; roomy?: boolean }) {
  const [done, setDone] = useOptimistic(task.done);
  const [, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      setDone(!done);
      await toggleTask(task.id, !done);
    });
  };

  return (
    <button
      type="button"
      className="fd-task"
      data-done={done ? 'true' : 'false'}
      onClick={onToggle}
      /* El boton ES la casilla para quien usa lector de pantalla: por eso
         `aria-pressed` y no una casilla anidada que habria que anunciar
         aparte. El nombre accesible es el titulo de la tarea. */
      aria-pressed={done}
    >
      <Check on={done} />
      <span className={`fd-task__text${roomy ? ' fd-task__text--roomy' : ''}`}>
        <span className="fd-task__title">{task.title}</span>
        {task.meta ? <span className="fd-meta">{task.meta}</span> : null}
        {task.rem ? (
          <span className="fd-task__rem">
            <Flag size="tiny" />
            {task.rem}
          </span>
        ) : null}
      </span>
    </button>
  );
}
