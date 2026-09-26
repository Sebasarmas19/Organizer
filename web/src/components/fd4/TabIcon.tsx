/* ============================================================================
   Organizer · FD4 · Iconos de pestañas y captura
   Iconos oficiales del sistema extraídos de Reicon (Outline, grosor 1.5).
   ========================================================================= */

import { Icon } from '@/components/Icon';

export type TabIconName = 'inicio' | 'calendario' | 'pendientes' | 'recursos';

export function TabIcon({ name }: { name: TabIconName }) {
  switch (name) {
    case 'inicio':
      return <Icon name="house" size="md" className="fd-ico" />;
    case 'calendario':
      return <Icon name="calendar" size="md" className="fd-ico" />;
    case 'pendientes':
      return <Icon name="check-circle" size="md" className="fd-ico" />;
    case 'recursos':
      return <Icon name="bookmark" size="md" className="fd-ico" />;
  }
}

/** Icono más del botón de capturar. */
export function PlusMark() {
  return <Icon name="plus" size="md" />;
}
