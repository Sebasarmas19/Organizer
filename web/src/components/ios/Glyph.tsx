/* ============================================================================
   Organizer · <Glyph>  ·  los iconos del mundo iOS

   Dibujados a mano en una rejilla de 24, trazo de 1.75 y puntas redondas,
   con la geometria de los SF Symbols que sustituyen (gearshape, calendar,
   sun.max, tray, bookmark, flag.fill...). Un solo grosor para todos: un
   icono mas grueso que sus vecinos se lee como importante sin serlo.

   `sun` lleva el nucleo aparte (.io-core): la pestana activa lo rellena,
   como hace iOS con la variante `.fill` del simbolo.
   ========================================================================= */

import type { ReactNode } from 'react';

export type GlyphName =
  | 'gear'
  | 'calendar'
  | 'plus'
  | 'sun'
  | 'tray'
  | 'book'
  | 'flag'
  | 'check'
  | 'arrow-up'
  | 'xmark'
  | 'chevron'
  | 'clock'
  | 'flame'
  | 'sparkles';

const PATHS: Record<GlyphName, ReactNode> = {
  gear: (
    <>
      <path d="M9.59 5 L10.09 2.59 L13.91 2.59 L14.41 5 L15.24 5.35 L17.3 3.99 L20.01 6.7 L18.65 8.76 L19 9.59 L21.41 10.09 L21.41 13.91 L19 14.41 L18.65 15.24 L20.01 17.3 L17.3 20.01 L15.24 18.65 L14.41 19 L13.91 21.41 L10.09 21.41 L9.59 19 L8.76 18.65 L6.7 20.01 L3.99 17.3 L5.35 15.24 L5 14.41 L2.59 13.91 L2.59 10.09 L5 9.59 L5.35 8.76 L3.99 6.7 L6.7 3.99 L8.76 5.35 Z" />
      <circle cx="12" cy="12" r="3.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.75" y="5" width="16.5" height="15.25" rx="3.25" />
      <path d="M3.75 9.75h16.5M8.25 3.25v3.5M15.75 3.25v3.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  sun: (
    <>
      <circle className="io-core" cx="12" cy="12" r="4.1" />
      <path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.65 5.35l-1.56 1.56M6.91 17.09l-1.56 1.56M18.65 18.65l-1.56-1.56M6.91 6.91 5.35 5.35" />
    </>
  ),
  tray: (
    <>
      <path d="M3.75 13.25 6.2 6.4a1.75 1.75 0 0 1 1.65-1.15h8.3a1.75 1.75 0 0 1 1.65 1.15l2.45 6.85v4.5a1.75 1.75 0 0 1-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75Z" />
      <path d="M3.75 13.25h4.5l1.25 2.25h5l1.25-2.25h4.5" />
    </>
  ),
  book: <path d="M6.75 4.75a1.5 1.5 0 0 1 1.5-1.5h7.5a1.5 1.5 0 0 1 1.5 1.5v15.5L12 16.6l-5.25 3.65Z" />,
  flag: (
    <>
      <path d="M5.5 2.75a1 1 0 0 1 1 1V21a1 1 0 1 1-2 0V3.75a1 1 0 0 1 1-1Z" />
      <path d="M7.25 4h11.1a.6.6 0 0 1 .5.92L16.4 8.75l2.45 3.83a.6.6 0 0 1-.5.92H7.25Z" />
    </>
  ),
  check: <path d="M6.5 12.5l3.6 3.6 7.4-8.2" />,
  'arrow-up': <path d="M12 19V5.5M5.75 11.25 12 5l6.25 6.25" />,
  xmark: <path d="M7 7l10 10M17 7 7 17" />,
  chevron: <path d="M1.6 1.6 7.4 7.5l-5.8 5.9" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  /* sparkles: una estrella de cuatro puntas grande y una pequena. */
  sparkles: (
    <>
      <path d="M10 3.5c.6 3.6 2.4 5.4 6 6-3.6.6-5.4 2.4-6 6-.6-3.6-2.4-5.4-6-6 3.6-.6 5.4-2.4 6-6z" />
      <path d="M17.5 14.5c.3 1.6 1.1 2.4 2.75 2.75-1.65.35-2.45 1.15-2.75 2.75-.3-1.6-1.1-2.4-2.75-2.75 1.65-.35 2.45-1.15 2.75-2.75z" />
    </>
  ),
  flame: <path d="M12 2.5c1.2 3.8 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.4 1.3-4 2.7-5 .3 1.7 1.3 2.8 2.7 2.8-1.1-3-.6-6 .1-8.8z" />,
};

/** Los que son silueta rellena y no trazo. */
const FILLED = new Set<GlyphName>(['flag', 'flame']);

export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const cls = ['io-glyph', FILLED.has(name) ? 'io-glyph--fill' : '', className ?? ''].filter(Boolean).join(' ');
  /* Tamano por defecto en atributos: donde ningun CSS lo fija, el SVG no
     se estira a 300x150. Cualquier regla de CSS manda sobre ellos. */
  const chevron = name === 'chevron';
  return (
    <svg
      className={cls}
      width={chevron ? 9 : 24}
      height={chevron ? 15 : 24}
      viewBox={chevron ? '0 0 9 15' : '0 0 24 24'}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
