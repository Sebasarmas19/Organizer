'use client';

/* ============================================================================
   Organizer · Interruptor de tema

   Tres estados, como en iOS: Sistema · Claro · Oscuro. "Sistema" no es un
   tercer tema: es no declarar ninguno y dejar que mande
   `prefers-color-scheme`. Por eso quita el atributo en vez de ponerlo.

   QUIEN MANDA ES EL DOM, no React. El atributo `data-theme` ya esta puesto
   antes de pintar por el script del layout raiz —si no, al abrir la app de
   noche habria un parpadeo blanco, que es justo cuando llega la notificacion
   de cierre del dia—. Asi que este componente no guarda el tema en su estado:
   lo LEE del DOM con `useSyncExternalStore`, que es la herramienta de React
   para reflejar un sistema externo. Copiarlo a `useState` dentro de un efecto
   crearia dos verdades y un render de mas.

   En F1 esto se va a Ajustes. Aqui vive en la portada porque esta fase tiene
   que poder comprobarse desde el iPhone: el criterio de "hecho" es ver los
   tres temas correctos.
   ========================================================================= */

import { useSyncExternalStore } from 'react';

type Theme = 'system' | 'light' | 'dark';

const KEY = 'organizer:theme';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

/* El "store" es el propio atributo del <html>. Los suscriptores existen solo
   para que React se entere cuando lo cambiamos nosotros. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readTheme(): Theme {
  const value = document.documentElement.getAttribute('data-theme');
  return value === 'light' || value === 'dark' ? value : 'system';
}

/* En el servidor no hay DOM. "Sistema" es la respuesta correcta ademas de la
   unica posible: sin eleccion explicita, manda el sistema operativo. */
function readThemeOnServer(): Theme {
  return 'system';
}

function applyTheme(next: Theme) {
  if (next === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', next);
  }

  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    /* Safari en privado tira al escribir. El tema sigue funcionando en esta
       sesion; solo no se recuerda. No es motivo de error visible. */
  }

  for (const listener of listeners) listener();
}

export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, readTheme, readThemeOnServer);

  return (
    <div className="seg" role="radiogroup" aria-label="Tema">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => applyTheme(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
