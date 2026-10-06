/**
 * Organizer · Layout raíz de la PWA
 * Carga estilos globales (Tailwind, tokens, FD4), tipografía IBM Plex Sans y bootstrap de tema.
 */

import { LiveRefresh } from '@/components/LiveRefresh';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { NavigationProgress } from '@/components/NavigationProgress';

/** Configuración de tipografía IBM Plex Sans autohospedada via next/font */
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
  maximumScale: 1,
  userScalable: false,
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
try {
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
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
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* Recarga los datos si cambian por fuera (Siri, cron, otro equipo). */}
        <LiveRefresh />
        {children}
      </body>
    </html>
  );
}
