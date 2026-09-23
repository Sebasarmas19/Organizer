'use client';

/* ============================================================================
   Organizer · <NavigationProgress>
   
   Provee respuesta inmediata (0ms) ante cualquier cambio de pantalla o enlace.
   Combina una barra de progreso superior y un pill flotante con Spinner
   mientras el servidor de Next.js resuelve y transmite la nueva ruta.
   ========================================================================= */

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Spinner } from './Spinner';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Al cambiar la ruta o los searchParams, la navegación ha concluido (patrón oficial de React)
  const [prevUrl, setPrevUrl] = useState({ pathname, search: searchParams?.toString() ?? '' });
  const currentSearch = searchParams?.toString() ?? '';

  if (prevUrl.pathname !== pathname || prevUrl.search !== currentSearch) {
    setPrevUrl({ pathname, search: currentSearch });
    setIsNavigating(false);
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Ignorar clics con modificadores (abrir en nueva pestaña, etc.)
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      if (target.getAttribute('target') === '_blank') return;

      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Solo activar si el destino es dentro de la app y es diferente a la URL actual
        if (
          targetUrl.origin === currentUrl.origin &&
          (targetUrl.pathname !== currentUrl.pathname || targetUrl.search !== currentUrl.search)
        ) {
          setIsNavigating(true);
        }
      } catch {
        // En caso de URL inválida ignoramos
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);

  // Temporizador de seguridad por si una navegación no llega a completarse
  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => setIsNavigating(false), 8000);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <>
      <div className="fd-nav-progress" aria-hidden="true">
        <div className="fd-nav-progress__bar" />
      </div>

      <div className="fd-loading-pill" role="status" aria-live="polite">
        <Spinner size={14} />
        <span>Cargando…</span>
      </div>
    </>
  );
}
