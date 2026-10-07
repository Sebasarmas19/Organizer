'use client';

/* ============================================================================
   Organizer · <TabBar>  ·  la barra de pestañas de iOS

   CUATRO DESTINOS Y UNA ACCION, SEPARADOS.

   `Hoy · Calendario · Pendientes · Recursos` van en una capsula de vidrio
   que flota sobre el contenido; el + va aparte, en su propio circulo a la
   derecha, como el boton de buscar de las apps de iOS 26. Un sitio donde
   estar y una cosa que hacer no son lo mismo: por eso no comparten capsula.

   Las cuatro llevan icono Y etiqueta, siempre (DESIGN.md § Iconos): la app
   se usa de reojo y un icono solo obliga a recordar que significa.

   La pestaña que se esta cargando enseña un spinner en lugar del icono: en
   una PWA la navegacion puede tardar, y un toque sin respuesta se repite.

   EL + SEGUN DONDE ESTES. En Inicio, anotar ya es el campo de abajo, asi
   que el + abre "Crear" (planear, tarea con fecha, reminder): quien pinta
   Inicio pasa `onCreate`. En las demas pantallas lleva a /anadir.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TabIcon, type TabIconName } from './TabIcon';
import { Glyph } from '@/components/ios/Glyph';
import { Spinner } from '@/components/Spinner';

type Tab = {
  id: TabIconName;
  label: string;
  href: string;
  /** Rutas que tambien encienden esta pestana. */
  match: string[];
};

export const TABS: Tab[] = [
  { id: 'inicio', label: 'Hoy', href: '/', match: ['/', '/clases', '/planear'] },
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

export function TabBar({ onCreate }: { onCreate?: () => void }) {
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
    <>
      <nav className="io-glass io-tabbar" aria-label="Secciones">
        {TABS.map((tab) => {
          const current = isCurrent(tab);
          const pending = pendingId === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch={true}
              className="io-tab"
              aria-current={current || pending ? 'page' : undefined}
              onClick={() => {
                if (!current) setPendingId(tab.id);
              }}
            >
              {pending ? (
                <span className="io-tab__spin">
                  <Spinner size={16} />
                </span>
              ) : (
                <TabIcon name={tab.id} />
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {onCreate ? (
        <button
          type="button"
          className="io-glass io-fab io-press"
          aria-label="Crear"
          aria-haspopup="dialog"
          onClick={onCreate}
        >
          <Glyph name="plus" />
        </button>
      ) : (
        <Link href="/anadir" prefetch={true} className="io-glass io-fab io-press" aria-label="Anotar">
          <Glyph name="plus" />
        </Link>
      )}
    </>
  );
}
