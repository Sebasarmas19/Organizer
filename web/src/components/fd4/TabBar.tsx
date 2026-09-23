'use client';

/* ============================================================================
   Organizer · FD4 · <TabBar>

   CINCO RANURAS, CUATRO DESTINOS.

   `Inicio · Calendario · (+) · Pendientes · Recursos`

   La del medio no es un destino: es la accion de capturar. Por eso no lleva
   etiqueta, no se enciende nunca y no aparece en `TABS`. Un sitio donde
   estar y una cosa que hacer no son lo mismo, y pintarlos igual haria que el
   usuario buscara "la pantalla de anadir" cuando lo que quiere es escribir
   una linea y salir.

   Los otros cuatro llevan ICONO **Y** ETIQUETA, siempre. Un icono solo
   obliga a recordar que significa, y esta app se usa de reojo. La regla esta
   escrita en `DESIGN.md` § Iconos.

   QUE CAMBIO RESPECTO A FD3
   Semana dejo de ser pestana. Ahora hay un modulo Calendario con Mes, Semana
   y Dia dentro, conmutados arriba: la barra de abajo aguanta cinco ranuras y
   meter tres vistas del mismo calendario gastaria tres. Y Tareas paso a
   llamarse Pendientes, porque ahora tambien contiene los recordatorios.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TabIcon, PlusMark, type TabIconName } from './TabIcon';
import { Spinner } from '@/components/Spinner';

type Tab = {
  id: TabIconName;
  label: string;
  href: string;
  /** Rutas que tambien encienden esta pestana. */
  match: string[];
};

export const TABS: Tab[] = [
  { id: 'inicio', label: 'Inicio', href: '/', match: ['/'] },
  {
    id: 'calendario',
    label: 'Calendario',
    href: '/calendario',
    /* Las rutas de F2 siguen redirigiendo aqui; mientras existan, encienden
       esta pestana igual. */
    match: ['/calendario', '/dia', '/semana', '/mes', '/horario'],
  },
  {
    id: 'pendientes',
    label: 'Pendientes',
    href: '/pendientes',
    match: ['/pendientes', '/tareas', '/reminders'],
  },
  { id: 'recursos', label: 'Recursos', href: '/recursos', match: ['/recursos'] },
];

export function TabBar() {
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<TabIconName | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setPendingId(null);
  }

  const isCurrent = (tab: Tab) =>
    tab.match.some(
      (route) => pathname === route || (route !== '/' && pathname.startsWith(route + '/'))
    );

  return (
    <nav className="fd-tabbar" aria-label="Secciones">
      {TABS.slice(0, 2).map((tab) => (
        <TabLink
          key={tab.id}
          tab={tab}
          current={isCurrent(tab)}
          isPending={pendingId === tab.id}
          onNavigate={() => setPendingId(tab.id)}
        />
      ))}

      {/* Capturar. `aria-label` porque no hay texto visible, y el texto
          visible no se pone porque el boton mide 56 y la etiqueta no cabe
          sin empujar a las otras cuatro. */}
      <Link href="/anadir" className="fd-fab" aria-label="Añadir">
        <span className="fd-fab__mark" style={{ position: 'relative' }}>
          <PlusMark />
        </span>
      </Link>

      {TABS.slice(2).map((tab) => (
        <TabLink
          key={tab.id}
          tab={tab}
          current={isCurrent(tab)}
          isPending={pendingId === tab.id}
          onNavigate={() => setPendingId(tab.id)}
        />
      ))}
    </nav>
  );
}

function TabLink({
  tab,
  current,
  isPending,
  onNavigate,
}: {
  tab: Tab;
  current: boolean;
  isPending: boolean;
  onNavigate: () => void;
}) {
  const active = current || isPending;
  return (
    <Link
      href={tab.href}
      className="fd-tab"
      aria-current={active ? 'page' : undefined}
      onClick={() => {
        if (!current) onNavigate();
      }}
    >
      {isPending ? (
        <span style={{ height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size={16} />
        </span>
      ) : (
        <TabIcon name={tab.id} />
      )}
      <span className="fd-tab__label">{tab.label}</span>
    </Link>
  );
}
