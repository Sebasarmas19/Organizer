/**
 * Organizer · Layout raíz de la PWA
 * Carga estilos globales (Tailwind, tokens, capa iOS) y el bootstrap de tema.
 *
 * Sin fuente descargada: la app usa la del sistema (SF Pro en el iPhone),
 * que es lo que la hace parecer nativa y no una web. Ver styles/ios.css.
 */

import { LiveRefresh } from '@/components/LiveRefresh';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { NavigationProgress } from '@/components/NavigationProgress';
import { ThemeColorSync } from '@/components/ThemeColorSync';
import { THEME_BG } from '@/lib/theme-colors';

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
     que `--io-bg` en ios.css (lib/theme-colors.ts). */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_BG.light },
    { media: '(prefers-color-scheme: dark)', color: THEME_BG.dark },
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
var a = 'bosque';
try { a = localStorage.getItem('organizer:accent') || 'bosque'; } catch (e) {}
if (a === 'bosque' || a === 'petroleo' || a === 'indigo' || a === 'grafito') document.documentElement.setAttribute('data-accent', a);
try {
  document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
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
      <body>
        {/* No pinta nada: mantiene vivo el service worker que recibe las
            notificaciones. Ver el propio componente. */}
        <ServiceWorkerRegistrar />
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* Recarga los datos si cambian por fuera (Siri, cron, otro equipo). */}
        <LiveRefresh />
        {/* La barra de estado sigue al tema elegido en Ajustes. */}
        <ThemeColorSync />
        {children}
      </body>
    </html>
  );
}
