'use client';

/* ============================================================================
   Organizer · <Check>  ·  la casilla de una TAREA

   Es la unica de las tres entidades que se completa (`08-modelo`). El
   banderin de un reminder no tiene casilla porque no hay nada que marcar.

   Dos cosas que parecen detalles y no lo son:

   1. MIDE 44px aunque se vea de 23. La clase `.check` lo consigue con margen
      negativo, asi que el circulo sigue alineado con su columna. Es el
      control mas tocado de la app y se usa caminando, con una mano.

   2. LA CASILLA MARCADA ES AZUL MARINO porque la casilla ES la tarea
      (decision 63). Es el unico sitio donde el color de entidad identifica en
      vez de decorar. Y sigue sin celebrar: cambia de estado y se calla. Nada
      de confeti, nada de insignia.

   `role="checkbox"` sobre un <button>, con `aria-checked`, es lo que usan los
   comps. El <button> nativo ya trae foco y teclado.
   ========================================================================= */

import { Icon } from './Icon';

export function Check({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  /** Que se marca. Va al lector de pantalla: "Comprar cuadernos, casilla". */
  label: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="check"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
    >
      <Icon name="check" size="sm" />
    </button>
  );
}
