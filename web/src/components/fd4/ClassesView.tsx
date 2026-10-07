/* ============================================================================
   Organizer · FD5 · Horario (/clases)

   El horario del semestre, una tarjeta por día con clase. Es lo único que
   enseña los nombres de las materias: Mes, Semana y Día no las llevan
   (#53), y Día solo marca el rato como "En clase".

   Cada clase: inicio y fin apilados en una columna estrecha (como el
   Calendario de iOS), la barra de clase, materia y aula, y una etiqueta
   "Ahora" o "Siguiente". Antes la hora iba en una sola linea de 104px y
   con la letra de iOS se montaba sobre la materia. Las clases de hoy que
   ya pasaron se apagan.

   Solo se lee. Editar es en /horario, que es donde se carga el horario.
   ========================================================================= */

import Link from 'next/link';
import type { Fd4ClassesData } from '@/lib/fd4-calendar';
import { clockToMin } from './homeSchedule';

export function ClassesView({ data, nowMin }: { data: Fd4ClassesData; nowMin: number }) {
  if (data.days.length === 0) {
    return (
      <div className="fd5-days">
        <p className="fd5-empty">Todavía no has cargado tu horario.</p>
        <Link href="/horario" className="fd5-btn fd5-btn--primary">
          Cargar horario
        </Link>
      </div>
    );
  }

  return (
    <div className="fd5-days">
      {data.days.map((d) => (
        <section key={d.weekday} className="fd5-dcard" data-today={d.isToday ? 'true' : 'false'}>
          <h2 className="fd5-dcard__head">
            {d.label}
            {d.isToday ? <small>hoy</small> : null}
          </h2>

          {d.slots.map((c) => {
            const [start = c.hours, stop = ''] = c.hours.split('–').map((h) => h.trim());
            const end = clockToMin(stop);
            const past = d.isToday && !c.status && !Number.isNaN(end) && end <= nowMin;
            return (
              <div className="fd5-cls" key={c.id} data-past={past ? 'true' : undefined}>
                <span className="fd5-cls__hours">
                  <b>{start}</b>
                  {stop ? <small>{stop}</small> : null}
                </span>
                <i className="fd5-cls__bar" aria-hidden />
                <span className="fd5-cls__text">
                  <b>{c.title}</b>
                  {c.location ? <small>{c.location}</small> : null}
                </span>
                {c.status ? (
                  <span className={`fd5-tag fd5-tag--${c.status}`}>
                    {c.status === 'now' ? 'Ahora' : 'Siguiente'}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
