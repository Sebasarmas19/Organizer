/* ============================================================================
   Organizer · FD4 · Calendario · Semana

   UNA TIRA ARRIBA PARA SALTAR, UNA TARJETA POR DIA DEBAJO.

   No hay rejilla de siete columnas de hora, y no es porque falte tiempo: en
   390px de ancho, siete columnas dan 47px por dia. Ahi no cabe "Sistemas
   Operativos" ni recortado, asi que la rejilla mentiria dos veces — una por
   lo que esconde y otra por parecer precisa cuando no lo es. La rejilla de
   horas vive en el modulo Dia y en escritorio, que es donde hay ancho para
   que sea verdad.

   Lo que si cabe, y es lo que se usa la semana de verdad, es leer los
   titulos: "el miercoles tengo Cálculo y dos tareas" se contesta con letras,
   no con rectangulos.

   Dentro de cada tarjeta el orden es fijo y significa algo:
     1. el reminder, en banda ambar    -> lo que no depende de ti
     2. las tareas, con su casilla     -> lo que si
     3. las materias, como etiquetas   -> el rato que ya no esta libre
   ========================================================================= */

import Link from 'next/link';
import { DAY_HOURS, type Fd4WeekData } from '@/lib/fd4-calendar';
import { Check, Dot, Flag } from './Marks';

export function WeekView({ data }: { data: Fd4WeekData }) {
  return (
    <>
      <div className="fd-strip">
        {data.strip.map((d) => (
          <Link
            key={d.dateStr}
            href={`/calendario?v=dia&d=${d.dateStr}`}
            className="fd-strip__day"
            data-today={d.isToday ? 'true' : 'false'}
            scroll={false}
          >
            <span className="fd-strip__dow">{d.dow}</span>
            <span className="fd-strip__num">{d.dayNum}</span>
            <Dot entity={d.dot} size="sm" />
          </Link>
        ))}
      </div>

      <div className="fd-scroll fd-scroll--week">
        <div className="fd-daylist">
          {data.days.map((d) => (
            <Link
              key={d.dateStr}
              href={`/calendario?v=dia&d=${d.dateStr}`}
              className="fd-daycard"
              data-today={d.isToday ? 'true' : 'false'}
              scroll={false}
            >
              <span className="fd-daycard__head">
                <span className="fd-daycard__label">{d.label}</span>
                {d.hint ? <span className="fd-daycard__hint">{d.hint}</span> : null}
                <span style={{ flex: 1 }} />
                <span className="fd-daycard__chev" aria-hidden>
                  ›
                </span>
              </span>

              <span className="fd-daycard__body">
                {d.reminder ? (
                  <span className="fd-daycard__rem">
                    <Flag size="sm" />
                    <span>{d.reminder.title}</span>
                    {d.reminder.hora ? (
                      <span className="fd-remrow__when">{d.reminder.hora}</span>
                    ) : null}
                  </span>
                ) : null}

                {d.tasks.map((t, i) => (
                  <span className="fd-daycard__task" key={`${d.dateStr}-t${i}`}>
                    {/* Casilla en version indicador: desde la vista Semana no
                        se marca nada. Marcar se hace en Inicio, en Pendientes
                        y en Dia, donde estas mirando UNA cosa. */}
                    <Check variant="mini" />
                    <span>{t.title}</span>
                    {t.hora ? <span className="fd-remrow__when">{t.hora}</span> : null}
                  </span>
                ))}

                {d.subjects.length > 0 ? (
                  <span className="fd-daycard__subs">
                    {d.subjects.map((m, i) => (
                      <span className="fd-subchip" key={`${d.dateStr}-m${i}`}>
                        {m}
                      </span>
                    ))}
                  </span>
                ) : null}

                {d.free ? <span className="fd-empty">Sin nada planificado</span> : null}
              </span>
            </Link>
          ))}
        </div>

        {/* ------------------------------------------ la semana de escritorio

            A partir de 900px esto sustituye a las tarjetas de arriba. Sale de
            la MISMA consulta: `getWeekView` ya traia los bloques con hora de
            inicio y fin, y `grid` solo los coloca en pixeles. Se manda en el
            mismo HTML porque el servidor no sabe el ancho de la ventana, y
            dos listas de texto pesan mucho menos que dos viajes a la base.  */}
        <div className="fd-weekgrid">
          <div className="fd-weekgrid__sticky">
            <div className="fd-weekgrid__head">
              <span className="fd-weekgrid__corner" />
              {data.grid.map((d) => (
                <Link
                  key={d.dateStr}
                  href={`/calendario?v=dia&d=${d.dateStr}`}
                  className="fd-weekgrid__day"
                  data-today={d.isToday ? 'true' : 'false'}
                  scroll={false}
                >
                  <span className="fd-weekgrid__dow">{d.dow}</span>
                  <span className="fd-weekgrid__num">{d.dayNum}</span>
                </Link>
              ))}
            </div>

            {/* Lo que tiene fecha pero no hora vive fuera del riel. Colocarlo a
                una hora inventada seria afirmar algo que nadie dijo. */}
            <div className="fd-weekgrid__allday">
              <span className="fd-weekgrid__corner">sin hora</span>
              {data.grid.map((d) => (
                <div className="fd-weekgrid__cell" key={`ad-${d.dateStr}`}>
                  {d.reminder ? (
                    <span className="fd-weekgrid__rem">
                      <Flag size="tiny" />
                      <span>{d.reminder.title}</span>
                    </span>
                  ) : null}

                  {d.loose.map((t) => (
                    <span className="fd-weekgrid__loose" key={t.id}>
                      <Check variant="mini" />
                      <span>{t.title}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="fd-weekgrid__body">
            <div className="fd-weekgrid__hours">
              {DAY_HOURS.map((h) => (
                <div className="fd-weekgrid__hour" key={h}>
                  {h}
                </div>
              ))}
            </div>

            {data.grid.map((d) => (
              <div
                className="fd-weekgrid__col"
                key={`col-${d.dateStr}`}
                data-today={d.isToday ? 'true' : 'false'}
              >
                {DAY_HOURS.map((h) => (
                  <div className="fd-weekgrid__line" key={`${d.dateStr}-${h}`} />
                ))}

                <div className="fd-weekgrid__blocks">
                  {d.blocks.map((b) => (
                    <span
                      key={b.id}
                      className={`fd-weekblock fd-weekblock--${b.kind}`}
                      style={{ top: b.top, height: b.height }}
                    >
                      <span className="fd-weekblock__title">{b.title}</span>
                      {/* La hora solo cabe a partir de 36px de alto. Por
                          debajo se calla en vez de recortarse a medias. */}
                      {b.height >= 36 ? (
                        <span className="fd-weekblock__meta">{b.meta}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {data.nowTop !== null ? (
              <span className="fd-weeknow" style={{ top: data.nowTop }}>
                <span className="fd-weeknow__label">{data.nowLabel}</span>
                <span className="fd-weeknow__line" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
