'use client';

/* ============================================================================
   Organizer · Registrar el service worker al arrancar

   No pinta nada. Existe porque el service worker es lo que RECIBE las
   notificaciones, y si solo se registrara al entrar en los ajustes, bastaria
   con que iOS lo descartara —cosa que hace con los que llevan semanas sin
   usarse— para que dejaran de llegar sin que nadie se entere.

   Registrar en cada arranque es barato: si ya esta, el navegador no hace nada;
   si el archivo cambio, se actualiza.

   NO pide permisos ni se suscribe. Eso solo puede pasar dentro del manejador
   de un toque real (`src/lib/push/client.ts`), y hacerlo al cargar la pagina
   deja el permiso DENEGADO PARA SIEMPRE en iOS.
   ========================================================================= */

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    /* Tras `load` para no competir por ancho de banda con la primera pintura:
       la app tiene que abrirse rapido, y el service worker no hace falta hasta
       que llega un push. */
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* En desarrollo sobre http:// que no sea localhost esto falla, y no es
           un problema real: en produccion Vercel sirve HTTPS. Se calla a
           proposito para no meter un error rojo en la consola cada recarga. */
      });
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
