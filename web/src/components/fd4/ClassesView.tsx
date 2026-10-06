/* ============================================================================
   Organizer · FD4 · Calendario · Clases

   El horario del semestre, una tarjeta por día con clase. Es lo único que
   enseña los nombres de las materias: Mes, Semana y Día ya no las llevan
   (#53), y Día solo marca el rato como "En clase".

   Solo se lee. Editar es en /horario, que es donde se carga el horario.
   ========================================================================= */

import Link from 'next/link';
import type { Fd4ClassesData } from '@/lib/fd4-calendar';

export function ClassesView({ data }: { data: Fd4ClassesData }) {
  if (data.days.length === 0) {
    return (
      <div className="fd-scroll">
        <div className="fd-daylist">
          <p className="fd-empty">Todavía no has cargado tu horario.</p>
          <Link href="/horario" className="fd-btn">
            Cargar horario
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fd-scroll">
      <div className="fd-daylist">
        {data.days.map((d) => (
          <section
            key={d.weekday}
            className="fd-daycard"
            data-today={d.isToday ? 'true' : 'false'}
          >
            <span className="fd-daycard__head">
              <span className="fd-daycard__label">{d.label}</span>
              {d.isToday ? <span className="fd-daycard__hint">hoy</span> : null}
            </span>

            <span className="fd-daycard__body">
              {d.slots.map((c) => (
                <span className="fd-classrow" key={c.id} data-status={c.status ?? undefined}>
                  <span className="fd-classrow__hours">{c.hours}</span>
                  <span className="fd-classrow__text">
                    <span className="fd-classrow__title">{c.title}</span>
                    {c.location ? <span className="fd-meta">{c.location}</span> : null}
                  </span>
                  {c.status ? (
                    <span className="fd-classrow__tag">
                      {c.status === 'now' ? 'Ahora' : 'Siguiente'}
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          </section>
        ))}
      </div>
    </div>
  );
}
