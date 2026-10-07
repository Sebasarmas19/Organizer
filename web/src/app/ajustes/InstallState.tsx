'use client';

/* Organizer · Ajustes · si la app esta instalada o se abrio en el navegador.

   Antes decia siempre "PWA Standalone (iOS)", tambien en el portatil. Y en
   iOS es justo lo que importa saber: las notificaciones solo llegan con la
   app instalada en la pantalla de inicio. */

import { useSyncExternalStore } from 'react';

const QUERY = '(display-mode: standalone)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function read(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia(QUERY).matches;
}

export function InstallState() {
  const standalone = useSyncExternalStore(subscribe, read, () => null);
  if (standalone === null) return <span aria-hidden>—</span>;
  return <span>{standalone ? 'Instalada en el inicio' : 'En el navegador'}</span>;
}
