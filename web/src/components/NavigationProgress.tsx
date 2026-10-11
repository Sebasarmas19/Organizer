'use client';

/* ============================================================================
   Organizer · <NavigationProgress>
   
   Gestiona las transiciones nativas estilo iOS (View Transitions API):
   - Push (derecha a izquierda) al navegar hacia vistas hijas o detalles
   - Pop (izquierda a derecha) al volver o presionar Atrás
   - Tab (crossfade suave) al conmutar entre las pestañas principales
   - Barra de progreso ultra delgada superior como indicador sutil si la red es lenta
   ========================================================================= */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const ROOT_TABS = ['/', '/calendario', '/pendientes', '/recursos'];

function getNavDirection(
  targetUrl: URL,
  currentUrl: URL,
  clickTarget?: HTMLElement | null
): 'forward' | 'back' | 'tab' {
  // 1. Detección explícita de retroceso
  if (
    clickTarget?.closest(
      '[data-back="true"], .pl-back, .fd5-back, .uplevel, [aria-label="Volver"], [aria-label="Atrás"], [data-nav="back"]'
    )
  ) {
    return 'back';
  }

  // 2. Detección de pestañas principales (barra de navegación inferior)
  const isTabBarClick = !!clickTarget?.closest('.io-tabbar, .io-tab, .fd-tabbar');
  const isTargetRootTab = ROOT_TABS.includes(targetUrl.pathname);
  const isCurrentRootTab = ROOT_TABS.includes(currentUrl.pathname);

  if (isTabBarClick || (isTargetRootTab && isCurrentRootTab)) {
    return 'tab';
  }

  // 3. Volver al inicio desde una subpágina
  if (targetUrl.pathname === '/' && currentUrl.pathname !== '/') {
    return 'back';
  }

  // 4. Volver a ruta padre (ej. /ajustes/notificaciones -> /ajustes)
  if (
    currentUrl.pathname.startsWith(targetUrl.pathname) &&
    currentUrl.pathname !== targetUrl.pathname
  ) {
    return 'back';
  }

  // 5. Navegación hacia adelante (hacia detalles o subrutas)
  return 'forward';
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isSlowNav, setIsSlowNav] = useState(false);
  const transitionResolverRef = useRef<(() => void) | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al cambiar pathname o searchParams, la nueva ruta ya se montó en el DOM
  const prevUrlRef = useRef({ pathname, search: searchParams?.toString() ?? '' });
  const currentSearch = searchParams?.toString() ?? '';

  useEffect(() => {
    if (
      prevUrlRef.current.pathname !== pathname ||
      prevUrlRef.current.search !== currentSearch
    ) {
      prevUrlRef.current = { pathname, search: currentSearch };

      // Resolver View Transition pendiente si existe
      if (transitionResolverRef.current) {
        transitionResolverRef.current();
        transitionResolverRef.current = null;
      }

      // Limpiar indicador de carga lenta
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setIsSlowNav(false);

      // Limpiar atributo de dirección después de completar la animación
      const timer = setTimeout(() => {
        if (typeof document !== 'undefined') {
          delete document.documentElement.dataset.navDirection;
        }
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [pathname, currentSearch]);

  useEffect(() => {
    // Escuchar popstate (botón atrás del navegador o swipe-back en iOS)
    const handlePopState = (e: PopStateEvent) => {
      document.documentElement.dataset.navDirection = 'back';
      if ('hasUAVisualTransition' in e && e.hasUAVisualTransition) {
        return;
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Ignorar clics secundarios o con modificadores
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;

      // Si es un botón con indicación explícita de volver (ej. router.back())
      const backTrigger = targetEl.closest<HTMLElement>(
        '[data-back="true"], .pl-back, .fd5-back, [aria-label="Volver"], [aria-label="Atrás"]'
      );
      if (backTrigger && !targetEl.closest('a')) {
        document.documentElement.dataset.navDirection = 'back';
        return;
      }

      const anchor = targetEl.closest('a');
      if (!anchor) return;

      // Ignorar controles interactivos internos o banderas para omitir navegación
      if (
        targetEl.closest(
          'button, input, select, textarea, [data-no-nav], [data-no-transition]'
        )
      ) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      if (anchor.getAttribute('target') === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (targetUrl.origin !== currentUrl.origin) return;

        // Si es la misma página exacta, no hacer nada
        if (
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        const direction = getNavDirection(targetUrl, currentUrl, targetEl);
        document.documentElement.dataset.navDirection = direction;

        // Iniciar temporizador para la línea de progreso si tarda más de 220ms
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        slowTimerRef.current = setTimeout(() => {
          setIsSlowNav(true);
        }, 220);

        // Si el navegador soporta View Transitions (iOS 18+ Safari, Chrome, Edge)
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
          e.preventDefault();

          if (transitionResolverRef.current) {
            transitionResolverRef.current();
            transitionResolverRef.current = null;
          }

          const transition = document.startViewTransition(() => {
            return new Promise<void>((resolve) => {
              transitionResolverRef.current = resolve;
              router.push(href);
            });
          });

          // Timeout de seguridad de 500ms
          const safetyTimer = setTimeout(() => {
            if (transitionResolverRef.current) {
              transitionResolverRef.current();
              transitionResolverRef.current = null;
            }
          }, 500);

          transition.finished?.finally(() => {
            clearTimeout(safetyTimer);
            if (slowTimerRef.current) {
              clearTimeout(slowTimerRef.current);
              slowTimerRef.current = null;
            }
            setIsSlowNav(false);
          });
        }
      } catch {
        // En caso de URL inválida
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, { capture: true });
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [router]);

  if (!isSlowNav) return null;

  return <div className="ios-nav-bar" role="progressbar" aria-label="Cargando" />;
}
