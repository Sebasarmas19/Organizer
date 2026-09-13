'use client';

/* ============================================================================
   Organizer · <TabBar>  ·  la barra de pestanas

   Cuatro modulos y ni uno mas (decisiones 30 y 34):
   `Inicio · Semana · Tareas · Recursos`.

   ICONO **Y** ETIQUETA, siempre. Un icono solo obliga a recordar lo que
   significa, y esta es una app que se usa de reojo. La regla esta escrita en
   `DESIGN.md` § Iconos.

   El modulo del calendario abre en DIA ("¿que hago ahora?"). Semana y Mes son
   las otras dos vistas del mismo modulo, no otras pestanas: por eso la
   pestana se llama Semana y lleva a `/dia`.

   Las rutas del producto llegan en F1 y F2. Estan declaradas aqui desde ya
   para que haya un solo sitio donde se decide como se llama cada modulo.
   ========================================================================= */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';
import type { IconName } from '@/lib/icons';

type Tab = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  /** Rutas que tambien encienden esta pestana. Dia, Semana y Mes son un modulo. */
  match: string[];
};

export const TABS: Tab[] = [
  { id: 'inicio', label: 'Inicio', icon: 'house', href: '/', match: ['/'] },
  {
    id: 'semana',
    label: 'Semana',
    icon: 'calendar',
    href: '/dia',
    match: ['/dia', '/semana', '/mes'],
  },
  { id: 'tareas', label: 'Tareas', icon: 'check-circle', href: '/tareas', match: ['/tareas'] },
  { id: 'recursos', label: 'Recursos', icon: 'bookmark', href: '/recursos', match: ['/recursos'] },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((tab) => {
        const current = tab.match.some(
          (route) => pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
        );
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className="tab"
            aria-current={current ? 'page' : undefined}
          >
            <Icon name={tab.icon} size="lg" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
