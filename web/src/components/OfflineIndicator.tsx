'use client';

/* ============================================================================
   Organizer · Indicador y supervisor de estado offline / online
   
   Proporciona retroalimentación no invasiva al usuario:
   - Avisa si se ha perdido la conexión (modo offline).
   - Informa si hay acciones pendientes en cola esperando conexión.
   - Sincroniza automáticamente la cola en cuanto se recupera el Wi-Fi/datos.
   - Utiliza useSyncExternalStore para seguir navigator.onLine sin cascading renders.
   ========================================================================= */

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
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

export function OfflineIndicator() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const pendingCount = useSyncExternalStore(subscribeSync, getQueueLengthSnapshot, getServerQueueSnapshot);
  const isSyncing = useSyncExternalStore(subscribeSync, isSyncInProgressSnapshot, () => false);

  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onOnline = () => {
      setJustReconnected(true);
      startTransition(() => {
        router.refresh();
      });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3000);
    };

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  // Si estamos online, no hay pendientes y no acabamos de reconectar, no pintamos nada
  if (isOnline && pendingCount === 0 && !justReconnected && !isSyncing) {
    return null;
  }

  return (
    <aside
      className="pl-offline-banner"
      data-state={!isOnline ? 'offline' : isSyncing ? 'syncing' : 'reconnected'}
      role="status"
      aria-live="polite"
    >
      <div className="pl-offline-pill">
        {!isOnline ? (
          <>
            <span className="pl-offline-dot pl-offline-dot--amber" aria-hidden="true" />
            <span className="pl-offline-text">
              Sin conexión
              {pendingCount > 0
                ? ` · ${pendingCount} cambio${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}`
                : ' · Modo lectura'}
            </span>
          </>
        ) : isSyncing ? (
          <>
            <span className="pl-offline-dot pl-offline-dot--blue" aria-hidden="true" />
            <span className="pl-offline-text">Sincronizando cambios pendientes…</span>
          </>
        ) : (
          <>
            <span className="pl-offline-dot pl-offline-dot--green" aria-hidden="true" />
            <span className="pl-offline-text">Conexión restablecida · Datos sincronizados</span>
            <Icon name="check" size="sm" />
          </>
        )}
      </div>
    </aside>
  );
}
