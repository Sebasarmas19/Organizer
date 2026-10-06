'use client';

/* ============================================================================
   Organizer · FD5 · <RestTaskRow>  ·  una tarea en "Resto de hoy"

   La misma conducta que <TaskRow>, con la forma de FD5: hora a la izquierda
   en una columna de 52px, titulo en el centro (abre la tarea) y el circulo
   de check a la derecha, con 44px de area. Marcar es optimista: si el
   servidor falla, React lo devuelve solo (regla 5).
   ========================================================================= */

import { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { toggleTask } from '@/lib/fd4-actions';
import { Icon } from '@/components/Icon';

export function RestTaskRow({
  id,
  title,
  start,
  ctx,
  rem,
  done: doneProp,
}: {
  id: string;
  title: string;
  start: string;
  ctx: string;
  rem?: string;
  done: boolean;
}) {
  const [done, setDone] = useOptimistic(doneProp);
  const [, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      setDone(!done);
      await toggleTask(id, !done);
    });
  };

  return (
    <div className="fd5-li fd5-li--task" data-done={done ? 'true' : 'false'}>
      <time className="fd5-li__time">{start}</time>
      <Link href={`/tareas/${id}`} className="fd5-li__body">
        <span className="fd5-li__title">{title}</span>
        {ctx ? <span className="fd5-li__sub">{ctx}</span> : null}
        {rem ? (
          <span className="fd5-li__sub fd5-li__rem">
            <Icon name="flag" size="sm" className="fd5-flag" />
            {rem}
          </span>
        ) : null}
      </Link>
      <button
        type="button"
        className="fd5-li__check"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Desmarcar ${title}` : `Marcar ${title}`}
      >
        <span className="fd5-ring" data-on={done ? 'true' : 'false'} aria-hidden>
          {done ? <Icon name="check" size="sm" /> : null}
        </span>
      </button>
    </div>
  );
}
