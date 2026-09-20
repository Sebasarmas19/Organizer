/* ============================================================================
   Organizer · Layout raiz

   Aqui entran, en este orden, las tres piezas del sistema de diseno:
   Tailwind, `tokens.css` y `base.css` (ver `globals.css`).

   `lang="es"`: la interfaz esta en espanol y eso cambia como lee un lector de
   pantalla y como corta palabras el navegador.

   `viewport-fit=cover` + las variables de area segura: la PWA corre a
   pantalla completa en el iPhone, asi que la barra de pestanas tiene que
   respetar los 34px del indicador de inicio por si sola.

   `maximumScale` NO se toca. Impedir el zoom es un fallo de accesibilidad, y
   iOS ademas lo ignora desde hace versiones.
   ========================================================================= */

import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

/* IBM Plex Sans es la tipografia de FD4. Se sirve desde el propio dominio
   (eso hace `next/font`), no desde Google: una PWA que arranca sin red tiene
   que poder pintarse igual, y una peticion a fonts.gstatic.com en el primer
   render es exactamente el parpadeo que no queremos de noche.

   Los cinco pesos son los que usa el diseno: 400 regular, 450 para la letra
   chica que no grita, 500 para titulos de fila, 600 para cabeceras, 700 sin
   uso todavia pero declarado porque `base.css` lo nombra.

   `variable` y no `className`: el token `--font-sans` de `tokens.css` la
   consume por variable, asi que la fuente entra por el mismo sitio que el
   color y no hay dos fuentes de verdad. */
const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Organizer',
  description: 'Tu planificacion, devuelta a tiempo.',
  appleWebApp: {
    capable: true,
    title: 'Organizer',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /* El color de la barra del navegador sigue al tema, con los mismos valores
     que `--bg` en tokens.css. Si uno cambia, el otro tambien. FD4 los movio
     de los grises calidos a los frios. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EDF0F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1116' },
  ],
};

/* Los tres estados del tema, igual que en los comps:
     sin data-theme  -> manda prefers-color-scheme
     data-theme=light / dark -> eleccion explicita

   Este script corre ANTES de pintar, en el head. Si se hiciera desde React,
   el usuario veria un parpadeo blanco al abrir la app de noche — que es
   justo cuando llega la notificacion de cierre del dia. */
const THEME_BOOTSTRAP = `
try {
  var t = localStorage.getItem('organizer:theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {/* No pinta nada: mantiene vivo el service worker que recibe las
            notificaciones. Ver el propio componente. */}
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
