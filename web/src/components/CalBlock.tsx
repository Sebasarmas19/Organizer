/* ============================================================================
   Organizer · <CalBlock>  ·  un bloque del calendario

   Las tres entidades comparten esta caja y se distinguen por el color de su
   barra izquierda, no por la letra:

     materia  verde   fondo `--class-soft`, titulo en `--text-muted` y a
                      tamano meta. Una materia no es contenido: es ausencia de
                      tiempo disponible (decision 52). Por eso no compite.
     tarea    azul    fondo `--surface` con la barra en `--task`.
     en curso azul    fondo `--task-soft`. Uno de los tres usos del acento.

   La hora del bloque en curso NO va en azul. El estado ya lo dice el fondo, y
   un texto azul ahi seria pintar la letra con el color de la entidad — que es
   exactamente lo que el sistema prohibe.

   La posicion (`top`/`height`) la decide quien lo coloca: este componente no
   sabe de horas ni de rejillas. Eso llega en F2.
   ========================================================================= */

import type { CSSProperties } from 'react';

export type CalBlockKind = 'task' | 'class';

export function CalBlock({
  title,
  time,
  kind,
  now = false,
  done = false,
  style,
}: {
  title: string;
  /** "8:00 – 9:30 · Aula 204". Ya formateado. */
  time?: string;
  kind: CalBlockKind;
  now?: boolean;
  done?: boolean;
  /** `top` y `height` en la rejilla de horas, o lo que necesite el contenedor. */
  style?: CSSProperties;
}) {
  const classes = [
    'calblock',
    kind === 'class' ? 'calblock--class' : 'calblock--task',
    now && 'calblock--now',
  ]
    .filter(Boolean)
    .join(' ');

  /* Cumplido: se apaga y se tacha. Ni rojo ni celebracion, igual que la fila. */
  const doneStyle: CSSProperties = done
    ? { textDecoration: 'line-through', textDecorationThickness: '1px' }
    : {};

  return (
    <div className={classes} style={done ? { ...style, opacity: 0.66 } : style}>
      <p className="calblock__title" style={doneStyle}>
        {title}
      </p>
      {time ? <p className="calblock__time num">{time}</p> : null}
    </div>
  );
}
