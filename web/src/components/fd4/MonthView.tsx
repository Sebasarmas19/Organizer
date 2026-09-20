/* ============================================================================
   Organizer · FD4 · Calendario · Mes

   REJILLA + LEYENDA + LISTA. Las tres piezas hacen falta y ninguna sobra:

     la rejilla  dice QUE DIAS tienen algo (puntos)
     la leyenda  dice QUE SIGNIFICA cada color
     la lista    dice QUE ES lo que hay este mes (reminders, con su fecha)

   Sin la leyenda, tres colores de punto son tres colores de punto. Sin la
   lista, el mes te dice que el 18 pasa algo y te obliga a entrar para saber
   que. La lista solo trae reminders a proposito: son lo unico del mes que no
   depende de ti y que si se te pasa, se te paso de verdad.

   Tocar un dia NO abre una hoja: lleva al modulo Dia en ese dia, igual que
   en escritorio. Volver es el conmutador de arriba. FD4 quito las hojas del
   calendario porque una hoja sobre un calendario tapa justo el contexto que
   estabas usando para decidir.
   ========================================================================= */

import Link from 'next/link';
import type { Fd4MonthData } from '@/lib/fd4-calendar';
import { DOW_INITIALS } from '@/lib/fd4-calendar';
import { Dot, Flag } from './Marks';

export function MonthView({ data }: { data: Fd4MonthData }) {
  return (
    <div className="fd-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="fd-month">
        <div className="fd-month__dow">
          {DOW_INITIALS.map((d, i) => (
            /* Lunes y Martes comparten inicial, y Miercoles tambien es M. El
               indice va en la clave porque la letra no es unica. */
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        <div className="fd-month__grid">
          {data.cells.map((c) => (
            <Link
              key={c.dateStr}
              href={`/calendario?v=dia&d=${c.dateStr}`}
              className="fd-cell"
              data-out={c.inMonth ? 'false' : 'true'}
              data-today={c.isToday ? 'true' : 'false'}
              data-selected={c.isSelected ? 'true' : 'false'}
              scroll={false}
            >
              <span className="fd-cell__num">{c.dayNum}</span>
              <span className="fd-cell__dots">
                {c.dots.map((e) => (
                  <Dot key={e} entity={e} size="sm" />
                ))}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="fd-legend">
        <span className="fd-legend__item">
          <Dot entity="reminder" size="xs" />
          Reminders
        </span>
        <span className="fd-legend__item">
          <Dot entity="task" size="xs" />
          Tareas
        </span>
        <span className="fd-legend__item">
          <Dot entity="subject" size="xs" />
          Materias
        </span>
      </div>

      <div className="fd-monthlist">
        <h2>Reminders del mes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.reminders.length > 0 ? (
            data.reminders.map((r) => (
              <Link
                key={r.id}
                href={`/calendario?v=dia&d=${r.dateStr}`}
                className="fd-remrow"
                scroll={false}
              >
                <Flag size="sm" />
                <span className="fd-remrow__title">{r.title}</span>
                <span className="fd-remrow__when">{r.when}</span>
              </Link>
            ))
          ) : (
            <span className="fd-empty">Nada marcado este mes</span>
          )}
        </div>
      </div>
    </div>
  );
}
