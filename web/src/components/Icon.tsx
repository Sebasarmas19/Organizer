/* ============================================================================
   Organizer · <Icon>

   Envuelve el set de `src/lib/icons.ts` (generado desde `app/icons.js`).

   El SVG entra por `dangerouslySetInnerHTML`, y aqui eso es seguro: el
   contenido es una constante escrita en este repositorio, nunca entrada de
   usuario. La alternativa era reescribir 34 iconos como JSX a mano, que es
   una forma cara de introducir erratas en trazados.

   ACCESIBILIDAD, la regla del sistema:
     - icono junto a texto visible -> decorativo, fuera del arbol (por defecto)
     - control de solo icono       -> `aria-label` en el BOTON, no en el svg
   ========================================================================= */

import type { CSSProperties } from 'react';
import { ICONS, type IconName } from '@/lib/icons';

export type IconSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<IconSize, string> = {
  sm: 'ico ico--sm',   // 16px
  md: 'ico',           // 20px · el tamano normal
  lg: 'ico ico--lg',   // 24px
};

export function Icon({
  name,
  size = 'md',
  className,
  style,
}: {
  name: IconName;
  size?: IconSize;
  className?: string;
  style?: CSSProperties;
}) {
  const def = ICONS[name];
  const classes = className ? SIZE_CLASS[size] + ' ' + className : SIZE_CLASS[size];

  return (
    <span className={classes} style={style} aria-hidden="true">
      <svg
        viewBox={def.vb}
        fill="none"
        focusable="false"
        dangerouslySetInnerHTML={{ __html: def.d }}
      />
    </span>
  );
}
