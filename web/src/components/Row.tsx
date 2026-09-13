/* ============================================================================
   Organizer · <Row>  ·  la fila de una TAREA

   La unidad que mas se repite en toda la app: Inicio, Tareas, el triage del
   domingo y la hoja del "+". Por eso es componente y no marcado suelto.

   La jerarquia es fija y no se negocia: el TITULO es lo importante de la
   fila; la hora, el contexto y el reminder van subordinados en `--text-muted`
   y a tamano meta. Si algun dia la hora pesa mas que el titulo, la fila dejo
   de contestar "¿que tengo que hacer?".

   El contexto es TEXTO, sin punto de color (decision 66). Tres colores de
   entidad mas seis de contexto convertian cada fila en un arcoiris.

   Cumplida: el titulo baja a `--text-faint` y se tacha con una linea de 1px.
   El resto de la fila no cambia de color. Nada de rojo, nunca (decision 22).
   ========================================================================= */

import { Fragment, type ReactNode } from 'react';

export function Row({
  title,
  meta,
  done = false,
  now = false,
  lead,
  trailing,
}: {
  title: string;
  /** Hora, contexto, reminder asociado. Se separan solos con un punto medio. */
  meta?: ReactNode[];
  done?: boolean;
  /** El bloque en curso. Fondo de azul suave: es uno de los tres usos del acento. */
  now?: boolean;
  /** Normalmente un <Check>. */
  lead?: ReactNode;
  /** Un `.taptext` o un `.tapicon` al final de la fila. */
  trailing?: ReactNode;
}) {
  const classes = ['row', now && 'row--now', done && 'row--done']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {lead}
      <div className="row__body">
        <p className="row__title">{title}</p>
        {meta && meta.length > 0 ? (
          <p className="row__meta">
            {/* Fragment y no <span>: `.row__meta` es un flex con gap, y cada
                trozo tiene que ser hijo directo para que el separador quede
                a la misma distancia que en los comps. */}
            {meta.map((part, index) => (
              <Fragment key={index}>
                {index > 0 ? <span className="sep">·</span> : null}
                {part}
              </Fragment>
            ))}
          </p>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}
