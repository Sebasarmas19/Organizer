'use client';

/* ============================================================================
   Organizer · FD4 · <TaskRow>  ·  la fila que se marca y se abre

   DOS ZONAS, como en Recordatorios de iOS: la casilla (una columna de 52px
   de ancho y toda la altura de la fila) marca; el texto abre la tarea para
   ponerle fecha, hora o a qué reminder prepara. Antes toda la fila marcaba y
   no había forma de editar nada.

   EL MARCADO ES OPTIMISTA. `useOptimistic` pinta la palomita en el mismo
   frame del toque y deja que el viaje al servidor pase por detrás. Si falla,
   React revierte solo: nada se pierde en silencio (regla 5).
   ========================================================================= */

import { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { toggleTask } from '@/lib/fd4-actions';
import { Check, Flag } from './Marks';

export type TaskRowData = {
  id: string;
  title: string;
  meta?: string;
  /** Titulo del reminder del que cuelga esta tarea, si cuelga de alguno. */
  rem?: string;
  done: boolean;
  isOverdue?: boolean;
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
    <div className="pl-task fd-task--split" data-done={done ? 'true' : 'false'}>
      <button
        type="button"
        className="pl-task__check"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${task.title}` : `Marcar ${task.title}`}
      >
        <Check on={done} />
      </button>
      <Link href={`/tareas/${task.id}`} className="pl-task__body">
        <span className={`fd-task__text${roomy ? ' fd-task__text--roomy' : ''}`}>
          <span
            className="fd-task__title"
            style={done ? { color: 'var(--text-faint)', textDecoration: 'line-through' } : undefined}
          >
            {task.isOverdue && !done ? <span className="fd-task__overdue-tag">Atrasada</span> : null}
            {task.title}
          </span>
          {task.meta ? <span className="fd-meta">{task.meta}</span> : null}
          {task.rem ? (
            <span className="fd-task__rem">
              <Flag size="tiny" />
              {task.rem}
            </span>
          ) : null}
        </span>
      </Link>
    </div>
  );
}
