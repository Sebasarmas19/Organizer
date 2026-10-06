/* ============================================================================
   Organizer · FD4 · Inicio · Clases de hoy

   Responde "¿adónde tengo que ir?" sin abrir nada (#79). Solo las clases de
   hoy; si hoy no hay, el próximo día con clase. La semana entera está en
   /clases, a un toque.
   ========================================================================= */

import Link from 'next/link';
import type { Fd4ClassesData } from '@/lib/fd4-calendar';

export function TodayClasses({ data }: { data: Fd4ClassesData }) {
  /* Sin horario cargado no se ocupa sitio en Inicio: /horario ya lo pide. */
  if (data.days.length === 0) return null;

  const today = data.days.find((d) => d.isToday);
  const nextDay = today ? null : data.days.find((d) => d.slots.some((s) => s.status === 'next'));
  const shown = today ?? nextDay;

  return (
    <section className="fd-todayclasses">
      <div className="fd-seclabel" style={{ justifyContent: 'space-between' }}>
        <h2>{today ? 'Clases de hoy' : 'Clases'}</h2>
        <Link href="/clases" className="pl-back" style={{ minHeight: 36, paddingRight: 10 }}>
          Ver horario
        </Link>
      </div>

      <div className="fd-daycard">
        <span className="fd-daycard__body">
          {!today ? (
            <span className="fd-meta">
              Hoy no tienes clase{shown ? `. La próxima, el ${shown.label.toLowerCase()}:` : '.'}
            </span>
          ) : null}

          {(shown?.slots ?? []).map((c) => (
            <span className="fd-classrow" key={c.id} data-status={c.status ?? undefined}>
              <span className="fd-classrow__hours">{c.hours}</span>
              <span className="fd-classrow__text">
                <span className="fd-classrow__title">{c.title}</span>
                {c.location ? <span className="fd-meta">{c.location}</span> : null}
              </span>
              {c.status && today ? (
                <span className="fd-classrow__tag">{c.status === 'now' ? 'Ahora' : 'Siguiente'}</span>
              ) : null}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
