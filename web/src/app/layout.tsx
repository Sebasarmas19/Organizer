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
import './globals.css';

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
     que `--bg` en tokens.css. Si uno cambia, el otro tambien. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#121110' },
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
