/* ============================================================================
   Organizer · manifest.webmanifest

   `display: 'standalone'` NO ES ESTETICA. Es el requisito que hace que iOS
   trate esto como una PWA instalada, y en iOS solo una PWA instalada en la
   pantalla de inicio recibe Web Push (`docs/02-arquitectura.md`). Si esta
   linea cambia a `browser` o a `minimal-ui`, dejan de llegar notificaciones y
   el sintoma es silencio, no un error.

   Este archivo se sirve en `/manifest.webmanifest`, que `src/proxy.ts` ya deja
   pasar sin sesion: iOS lo pide al anadir a la pantalla de inicio y no siempre
   manda las cookies.

   Los colores son los mismos de `app/tokens.css`. Si uno cambia alla, aqui
   tambien — igual que `themeColor` en `layout.tsx`.
   ========================================================================= */

import type { MetadataRoute } from 'next';
import { THEME_BG } from '@/lib/theme-colors';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Organizer',
    /* Lo que cabe debajo del icono en la pantalla de inicio del iPhone. */
    short_name: 'Organizer',
    description: 'Tu planificacion, devuelta a tiempo.',

    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',

    /* El gris agrupado de iOS (`--io-bg`, tema claro). La pantalla de
       arranque usa `background_color`, asi que un blanco puro aqui daria un
       destello que no pega con el resto de la app. */
    background_color: THEME_BG.light,
    theme_color: THEME_BG.light,

    lang: 'es',
    dir: 'ltr',
    categories: ['productivity'],

    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /* Android recorta el icono a la forma del sistema; el `maskable` lleva
         el aro encogido para que el recorte no se lo coma. */
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
