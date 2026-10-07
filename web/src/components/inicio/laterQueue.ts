/* ============================================================================
   Organizer · Hilo · La cola de "Después"

   "Después" no escribe nada en el servidor a proposito: cambiar la fecha es
   decidir; saltar es solo "ahora no". La cola vive en localStorage, por dia
   (`fd-skip-<fecha>`): al dia siguiente no queda rastro. Si el navegador no
   deja guardar, el salto no se guarda y la tarea sigue delante.

   Cada entrada guarda tambien CUANDO se salto, para que el hilo ponga la
   respuesta "Después: …" en su hora. Las entradas viejas (solo el id, como
   las escribia FocusToday) se leen igual y no pintan burbuja: sin hora, el
   hilo no se la inventa.

   Es un sistema externo, asi que se lee con useSyncExternalStore. En el
   servidor no hay saltos ('[]'): el primer pintado coincide y el cliente
   corrige despues.
   ========================================================================= */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const EVENT = 'fd-skip-change';

export type LaterEntry = { id: string; at: number | null };

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '[]';
  } catch {
    return '[]';
  }
}

export function parseLater(raw: string): LaterEntry[] {
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];

  const out: LaterEntry[] = [];
  for (const entry of list) {
    if (typeof entry === 'string') {
      out.push({ id: entry, at: null });
    } else if (entry && typeof entry === 'object' && typeof (entry as LaterEntry).id === 'string') {
      const at = (entry as LaterEntry).at;
      out.push({ id: (entry as LaterEntry).id, at: typeof at === 'number' ? at : null });
    }
  }
  return out;
}

/** La cola de hoy y la funcion para reescribirla entera. */
export function useLaterQueue(todayStr: string) {
  const key = `fd-skip-${todayStr}`;
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => '[]');
  const entries = useMemo(() => parseLater(raw), [raw]);

  const save = useCallback(
    (next: LaterEntry[]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* Sin almacenamiento el salto no se guarda. */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key]
  );

  return [entries, save] as const;
}
