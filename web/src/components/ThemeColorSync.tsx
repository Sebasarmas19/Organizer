'use client';

/* Organizer · <ThemeColorSync>

   Con un tema elegido a mano (Ajustes · Apariencia), la barra de estado
   tiene que seguir a la app y no al sistema: si no, con el iPhone en claro
   y la app en oscuro queda una franja clara arriba.

   `data-theme` lo pone el script del layout antes de pintar; `theme-color`
   no se puede tocar ahi sin que la hidratacion lo de por desajuste, asi que
   se corrige aqui, ya hidratado. No pinta nada. */

import { useEffect } from 'react';
import { currentBg } from '@/lib/theme-colors';

export function ThemeColorSync() {
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    const BG = currentBg();
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      const own = (meta.getAttribute('media') ?? '').includes('dark') ? BG.dark : BG.light;
      meta.setAttribute('content', theme === 'light' || theme === 'dark' ? BG[theme] : own);
    });
  }, []);
  return null;
}
