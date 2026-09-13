/* ============================================================================
   Organizer · <ReminderFlag>  ·  la fila de un REMINDER

   Un parcial, una entrega, una defensa. NO se completa: pasa la fecha y queda
   listo (decision 49). Por eso no lleva casilla — lleva banderin, y no hay
   nada que marcar.

   EL AMBAR ESTA EN EL BANDERIN, NUNCA EN LA LETRA. `--rem` mide 4.0:1: pasa
   como indicador no textual y no como texto. El titulo se queda en `--text`.
   Esto no es una preferencia: el preset de Tailwind ni siquiera genera
   `text-rem`, para que no se pueda hacer por descuido (ver FD3 §9.2).

   PASADO NO ES DEUDA. `past` apaga la fila: baja a `--text-faint` y el
   banderin pierde opacidad. No se tacha, no lleva insignia, no se persigue.
   Es tiempo que paso, no una falta del usuario.
   ========================================================================= */

import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function ReminderFlag({
  title,
  when,
  past = false,
  prep,
}: {
  title: string;
  /** "miercoles 23 · en 6 dias". Lo arma quien llama: aqui no se calcula. */
  when: string;
  past?: boolean;
  /** El estado de preparacion: cuantas tareas lleva, o que no tiene ninguna. */
  prep?: ReactNode;
}) {
  return (
    <div className={past ? 'rem rem--past' : 'rem'}>
      <Icon name="flag" size="sm" className="rem__flag" />
      <div className="rem__body">
        <p className="rem__title">{title}</p>
        <p className="rem__when">{when}</p>
        {prep}
      </div>
    </div>
  );
}
