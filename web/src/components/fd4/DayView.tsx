/* ============================================================================
   Organizer · FD4 · Calendario · Dia

   EL RIEL DE HORAS. Es la unica vista del telefono que dibuja el tiempo a
   escala, y es donde se contesta "¿que hago ahora?".

   Tres cosas viven FUERA del riel, arriba, y cada una por su motivo:

   1. LA BANDA DEL REMINDER. Un parcial a las 10:00 no ocupa una hora: define
      el dia entero. Ponerlo solo como bloque de 10 a 11 diria que a las 11
      ya paso, que es justo lo contrario de lo que pasa por tu cabeza ese
      dia. Va arriba, en ambar, y ADEMAS entra al riel si tiene hora — porque
      a las 10 tampoco hay hueco.

   2. LAS TAREAS SIN HORA. No tienen donde caer en un riel y no pueden
      desaparecer: siguen siendo de hoy. Van en chips arriba, con su casilla
      chica, y no ocupan altura de calendario.

   3. LA LINEA DE AHORA. Cruza tambien la columna de horas (por eso el -46px
      en CSS): la hora actual es informacion de la regla, no del contenido.
      Solo se dibuja si hoy es hoy Y la hora cae dentro del riel: a las 6 de
      la manana no hay donde ponerla, y empujarla al borde de arriba seria
      decir que son las 7.

   Dentro del riel, la entidad se lee por el canto izquierdo y por el fondo:
     materia   hundida, sin borde, texto apagado  -> "este rato no es tuyo"
     reminder  ambar, con borde                   -> "esto pasa, tu no lo mueves"
     tarea     blanca, con sombra, encima         -> "esto lo haces tu"
   El texto de los tres se queda en --text o --text-muted. Nunca de color.
   ========================================================================= */

import type { Fd4DayData } from '@/lib/fd4-calendar';
import { DAY_HOURS } from '@/lib/fd4-calendar';
import { Check, Flag } from './Marks';

export function DayView({ data }: { data: Fd4DayData }) {
  return (
    <>
      {data.band || data.noHour.length > 0 ? (
        <div className="fd-dayhead">
          {data.band ? (
            <div className="fd-band">
              <Flag />
              <span className="fd-band__text">
                <span className="fd-band__title">{data.band.title}</span>
                <span className="fd-meta">{data.band.meta}</span>
              </span>
            </div>
          ) : null}

          {data.noHour.length > 0 ? (
            <div className="fd-nohour">
              <span className="fd-nohour__label">Sin hora</span>
              {data.noHour.map((t) => (
                <span className="fd-chip" key={t.id}>
                  <Check variant="chip" />
                  <span>{t.title}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="fd-scroll">
        <div className="fd-grid">
          {/* Columna de horas. Las etiquetas van subidas 6px (en CSS) para
              que el numero quede a caballo de su linea y no debajo de ella. */}
          <div className="fd-grid__hours">
            {DAY_HOURS.map((h) => (
              <div className="fd-grid__hour" key={h}>
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="fd-grid__col">
            {DAY_HOURS.map((h) => (
              <div className="fd-grid__line" key={h} />
            ))}

            <div className="fd-grid__blocks">
              {data.blocks.map((b) => (
                <div
                  key={b.id}
                  className={`fd-block fd-block--${b.kind}${b.overlap ? ' fd-block--overlap' : ''}`}
                  style={{ top: b.top, height: b.height }}
                >
                  {b.kind === 'reminder' ? <Flag size="sm" /> : null}
                  <span className="fd-block__text">
                    <span className="fd-block__title">{b.title}</span>
                    {b.showMeta && b.meta ? (
                      <span className="fd-block__meta">{b.meta}</span>
                    ) : null}
                  </span>
                </div>
              ))}

              {data.nowTop !== null ? (
                <div className="fd-now" style={{ top: data.nowTop }}>
                  <span className="fd-now__label">{data.nowLabel}</span>
                  <span className="fd-now__line" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
