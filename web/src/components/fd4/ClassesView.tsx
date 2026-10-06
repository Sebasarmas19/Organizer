/* ============================================================================
   Organizer · FD5 · Horario (/clases)

   El horario del semestre, una tarjeta por día con clase. Es lo único que
   enseña los nombres de las materias: Mes, Semana y Día no las llevan
   (#53), y Día solo marca el rato como "En clase".

   FD5: punto verde + horas en una columna de 104px, materia y aula, y una
   etiqueta "Ahora" (verde suave) o "Siguiente" (solo filete). La tarjeta de
   hoy lleva el filete en azul marino; las clases de hoy que ya pasaron se
   apagan.

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
            const end = clockToMin(c.hours.split('–')[1] ?? '');
            const past = d.isToday && !c.status && !Number.isNaN(end) && end <= nowMin;
            return (
              <div className="fd5-cls" key={c.id} data-past={past ? 'true' : undefined}>
                <span className="fd5-cls__hours">
                  <i className="fd5-classdot" aria-hidden />
                  {c.hours}
                </span>
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
