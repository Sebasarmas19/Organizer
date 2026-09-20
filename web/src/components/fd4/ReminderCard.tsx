/* ============================================================================
   Organizer · FD4 · <ReminderCard>

   UN REMINDER NO SE COMPLETA: PASA.

   Por eso esta tarjeta no tiene casilla en ninguna parte. Un parcial no se
   "termina" porque tu lo marques; llega el viernes y ocurre. Lo que si se
   completa son las tareas que cuelgan de el, y esas se ven aqui debajo como
   preparacion — con su punto azul, que es lo que las distingue del reminder
   que las contiene.

   Cuando no hay ninguna tarea colgando, en lugar de un hueco va una pildora
   que dice cuanto falta y que no hay nada planificado. Esa pildora es el
   trabajo real de esta tarjeta: un examen dentro de cuatro dias sin una sola
   tarea asociada es exactamente la situacion que la app existe para hacer
   visible.

   Tocarla abre el dia del reminder en Calendario, no una hoja: FD4 quito las
   hojas de detalle del calendario, y volver es el conmutador de arriba.
   ========================================================================= */

import Link from 'next/link';
import { Dot, Flag } from './Marks';

export type ReminderCardData = {
  id: string;
  title: string;
  when: string;
  dateStr: string;
  prep: string[];
  emptyLabel: string;
};

export function ReminderCard({
  reminder,
  chevron = false,
}: {
  reminder: ReminderCardData;
  chevron?: boolean;
}) {
  return (
    <Link href={`/calendario?v=dia&d=${reminder.dateStr}`} className="fd-remcard">
      <span className="fd-card__rail fd-card__rail--reminder" aria-hidden />
      <span className="fd-remcard__body">
        <span className="fd-remcard__head">
          <Flag />
          <span className="fd-remcard__text">
            <span className="fd-remcard__title">{reminder.title}</span>
            <span className="fd-meta">{reminder.when}</span>
          </span>
          {chevron ? (
            <span className="fd-remcard__chev" aria-hidden>
              ›
            </span>
          ) : null}
        </span>

        {reminder.prep.length > 0 ? (
          <span className="fd-prep">
            {reminder.prep.map((title, i) => (
              <span className="fd-prep__item" key={`${reminder.id}-${i}`}>
                <Dot entity="task" size="xs" />
                <span>{title}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="fd-pill fd-remcard__empty">{reminder.emptyLabel}</span>
        )}
      </span>
    </Link>
  );
}
