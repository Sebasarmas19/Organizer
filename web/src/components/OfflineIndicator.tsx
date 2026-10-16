'use client';

/* ============================================================================
   Organizer · Indicador y supervisor de estado offline / online
   
   Proporciona retroalimentación no invasiva al usuario:
   - Al perder conexión, avisa arriba a la derecha durante unos segundos y luego
     se contrae discretamente a un circulito rojo fijo en la esquina.
   - El usuario puede tocar el circulito rojo en cualquier momento para alternar
     y ver los detalles (modo lectura, cambios pendientes en cola).
   - Informa si hay sincronización activa o si se ha recuperado la conexión.
   - Sincroniza automáticamente la cola en cuanto se recupera el Wi-Fi/datos.
   - Utiliza useSyncExternalStore para seguir navigator.onLine sin cascading renders.
   ========================================================================= */

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOfflineQueue,
  isSyncInProgressSnapshot,
  isNetworkOnline,
} from '@/lib/offline-sync';
import { Icon } from '@/components/Icon';

function subscribeOnline(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot(): boolean {
  return isNetworkOnline();
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

function subscribeSync(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('organizer:offline-sync', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('organizer:offline-sync', callback);
    window.removeEventListener('storage', callback);
  };
}

function getQueueLengthSnapshot(): number {
  return getOfflineQueue().length;
}

function getServerQueueSnapshot(): number {
  return 0;
}

const AUTO_COLLAPSE_MS = 3800;

export function OfflineIndicator() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const pendingCount = useSyncExternalStore(subscribeSync, getQueueLengthSnapshot, getServerQueueSnapshot);
  const isSyncing = useSyncExternalStore(subscribeSync, isSyncInProgressSnapshot, () => false);

  const [justReconnected, setJustReconnected] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Programar colapso automático tras unos segundos
  const scheduleCollapse = () => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = setTimeout(() => {
      setCollapsed(true);
    }, AUTO_COLLAPSE_MS);
  };

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const onOnline = () => {
      setJustReconnected(true);
      setCollapsed(false);
      startTransition(() => {
        router.refresh();
      });
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
    };

    const onOffline = () => {
      setCollapsed(false);
      scheduleCollapse();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Si al montar ya está offline, mostrar unos segundos y colapsar a circulito rojo
    if (!isOnline) {
      scheduleCollapse();
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [router, isOnline]);

  const toggleCollapsed = () => {
    if (collapsed) {
      setCollapsed(false);
      scheduleCollapse();
    } else {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      setCollapsed(true);
    }
  };

  // Si estamos online, no hay pendientes y no acabamos de reconectar, no pintamos nada
  if (isOnline && pendingCount === 0 && !justReconnected && !isSyncing) {
    return null;
  }

  const isOffline = !isOnline;
  const isCurrentlyCollapsed = collapsed && !justReconnected && !isSyncing;

  return (
    <aside
      className="pl-offline-banner"
      data-state={isOffline ? 'offline' : isSyncing ? 'syncing' : 'reconnected'}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="pl-offline-pill"
        data-collapsed={isCurrentlyCollapsed ? 'true' : 'false'}
        onClick={toggleCollapsed}
        aria-label={
          isOffline
            ? isCurrentlyCollapsed
              ? 'Sin conexión. Toca para ver detalles.'
              : 'Sin conexión · Modo lectura. Toca para minimizar.'
            : isSyncing
            ? 'Sincronizando cambios pendientes'
            : 'Conexión restablecida'
        }
      >
        {isOffline ? (
          <>
            <span className="pl-offline-dot pl-offline-dot--red" aria-hidden="true" />
            {!isCurrentlyCollapsed && (
              <span className="pl-offline-text">
                Sin conexión
                {pendingCount > 0
                  ? ` · ${pendingCount} cambio${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}`
                  : ' · Modo lectura'}
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <span className="pl-offline-dot pl-offline-dot--blue" aria-hidden="true" />
            {!isCurrentlyCollapsed && (
              <span className="pl-offline-text">Sincronizando cambios pendientes…</span>
            )}
          </>
        ) : (
          <>
            <span className="pl-offline-dot pl-offline-dot--green" aria-hidden="true" />
            <span className="pl-offline-text">Conexión restablecida · Datos sincronizados</span>
            <Icon name="check" size="sm" />
          </>
        )}
      </button>
    </aside>
  );
}
