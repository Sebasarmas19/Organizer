'use client';

/* ============================================================================
   Organizer · Ajustes · <AccentPicker>  ·  el color de la app

   Cinco colores para la accion y las tareas. Cambia toda la app al
   momento, para probarlos en las pantallas de verdad. Como el tema, es una
   preferencia de este aparato: vive en localStorage y el layout la aplica
   antes de pintar (THEME_BOOTSTRAP), sin parpadeo.
   ========================================================================= */

import { useSyncExternalStore } from 'react';
import { ACCENTS, ACCENT_KEY, accentOf, type AccentId } from '@/lib/theme-colors';

const listeners = new Set<() => void>();

function read(): AccentId {
  try {
    return accentOf(localStorage.getItem(ACCENT_KEY)).id;
  } catch {
    return ACCENTS[0].id;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACCENT_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function apply(id: AccentId) {
  try {
    if (id === ACCENTS[0].id) localStorage.removeItem(ACCENT_KEY);
    else localStorage.setItem(ACCENT_KEY, id);
  } catch {
    /* Navegacion privada: cambia igual, solo que no se recuerda. */
  }

  /* Ciruela es la base de ios.css: es el unico sin atributo. */
  const root = document.documentElement;
  if (id === 'ciruela') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', id);

  /* La franja de la barra de estado sigue al fondo del color nuevo. */
  const bg = accentOf(id).bg;
  const theme = root.getAttribute('data-theme');
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    const own = (meta.getAttribute('media') ?? '').includes('dark') ? bg.dark : bg.light;
    meta.setAttribute('content', theme === 'light' || theme === 'dark' ? bg[theme] : own);
  });

  listeners.forEach((listener) => listener());
}

export function AccentPicker() {
  /* En el servidor no se sabe: nada marcado hasta montar, sin desajuste. */
  const current = useSyncExternalStore(subscribe, read, () => null);

  return (
    <div className="io-accents" role="radiogroup" aria-label="Color">
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={current === a.id}
          className="io-accent io-press"
          onClick={() => apply(a.id)}
        >
          <span className="io-accent__dot" style={{ background: a.swatch }} aria-hidden="true" />
          {a.label}
        </button>
      ))}
    </div>
  );
}
