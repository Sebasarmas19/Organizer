/* ============================================================================
   Organizer · FD5 · Inicio · una fila de "Se viene"

   Un parcial o una entrega en una fila calmada: banderin ambar, titulo y
   fecha corta a la derecha. Debajo, su preparacion resumida:

     con pasos       -> segmentos (si se sabe cuantos van hechos) y
                        "Siguiente: <el primer paso pendiente>"
     sin pasos       -> "Sin preparación" y un boton pequeno "Planificar"
     todo preparado  -> "Todo preparado"

   La fila entera abre el reminder, y "Planificar" lleva al mismo sitio (ahi
   se anaden los pasos): por eso es un span con forma de boton y no un
   enlace dentro de otro enlace.

   `done` y `nextWhen` vienen de `getHomeData`: pasos hechos (la barra es
   done de done + pendientes) y cuando toca el siguiente ("hoy", "jue 8").

   `readOnly` es para el ritual del domingo: ahi los reminders se miran y no
   se tocan (#62), asi que la fila no lleva a ningun sitio.
   ========================================================================= */

import Link from 'next/link';
import type { HomeReminder } from '@/lib/home';
import { Icon } from '@/components/Icon';
import { shortWhen } from './homeSchedule';

export function UpcomingRow({ reminder, readOnly = false }: { reminder: HomeReminder; readOnly?: boolean }) {
  const pending = reminder.prep.length;
  const done = reminder.done;
  const allDone = pending === 0 && done > 0;
  const total = done + pending;

  const body = (
    <>
      <span className="fd5-up__top">
        <Icon name="flag" size="sm" className="fd5-flag" />
        <b>{reminder.title}</b>
        <time>{shortWhen(reminder.when)}</time>
      </span>

      {pending > 0 ? (
        <>
          {total > 0 ? (
            <span className="fd5-seg" aria-hidden style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
              {Array.from({ length: total }, (_, i) => (
                <i key={i} data-on={i < done ? 'true' : 'false'} />
              ))}
            </span>
          ) : null}
          <span className="fd5-up__next">
            Siguiente: <b>{reminder.prep[0]}</b>
            {reminder.nextWhen ? ` · ${reminder.nextWhen}` : null}
          </span>
        </>
      ) : (
        <span className="fd5-up__foot">
          <span>{allDone ? 'Todo preparado' : 'Sin preparación'}</span>
          {allDone || readOnly ? null : <span className="fd5-smallbtn fd5-smallbtn--accent">Planificar</span>}
        </span>
      )}
    </>
  );

  if (readOnly) return <div className="fd5-up">{body}</div>;
  return (
    <Link href={`/reminders/${reminder.id}`} className="fd5-up">
      {body}
    </Link>
  );
}
