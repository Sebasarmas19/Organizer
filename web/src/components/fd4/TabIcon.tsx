/* ============================================================================
   Organizer · Iconos de las pestañas y de capturar
   Los glifos del mundo iOS (components/ios/Glyph): sun, calendar, tray y
   bookmark, un solo grosor. Los usan la barra de abajo y la lateral.
   ========================================================================= */

import { Glyph, type GlyphName } from '@/components/ios/Glyph';

export type TabIconName = 'inicio' | 'calendario' | 'pendientes' | 'recursos';

const GLYPH: Record<TabIconName, GlyphName> = {
  inicio: 'sun',
  calendario: 'calendar',
  pendientes: 'tray',
  recursos: 'book',
};

export function TabIcon({ name }: { name: TabIconName }) {
  return <Glyph name={GLYPH[name]} className="fd-ico" />;
}

/** Icono más del botón de capturar. */
export function PlusMark() {
  return <Glyph name="plus" />;
}
