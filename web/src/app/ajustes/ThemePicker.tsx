'use client';

/* ============================================================================
   Organizer · Ajustes · <ThemePicker>  ·  Automatico / Claro / Oscuro

   El layout ya lee `organizer:theme` antes de pintar (THEME_BOOTSTRAP), pero
   no habia ningun sitio donde elegirlo. Es una preferencia de este aparato,
   no de la cuenta: el iPhone de noche puede ir oscuro y el portatil claro.
   Por eso vive en localStorage y no en `profiles`.

   Con una eleccion explicita tambien se reescribe `theme-color`: si no, la
   franja de la barra de estado seguiria al sistema y no a la app.
   ========================================================================= */

import { useSyncExternalStore } from 'react';
import { currentBg } from '@/lib/theme-colors';

type Theme = 'auto' | 'light' | 'dark';

const KEY = 'organizer:theme';
const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function apply(theme: Theme) {
  try {
    if (theme === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    /* Navegacion privada: el tema cambia igual, solo que no se recuerda. */
  }

  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  const BG = currentBg();
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const own = (meta.getAttribute('media') ?? '').includes('dark') ? BG.dark : BG.light;
    meta.setAttribute('content', theme === 'auto' ? own : BG[theme]);
  });

  listeners.forEach((listener) => listener());
}

export function ThemePicker() {
  /* En el servidor no se sabe: nada marcado hasta montar, sin desajuste. */
  const theme = useSyncExternalStore(subscribe, read, () => null);

  return (
    <div className="fd5-theme" role="radiogroup" aria-label="Apariencia">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => apply(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
