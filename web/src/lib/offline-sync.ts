'use client';

/* ============================================================================
   Organizer · Sincronización y cola offline
   
   Permite que la PWA funcione sin conexión (sin Wi-Fi ni datos):
   1. Detecta estado de red (online / offline).
   2. Si no hay conexión o una acción de red falla por falta de señal, la acción
      se almacena en una cola local persistente (localStorage).
   3. Mantiene la UI optimista activa sin revertir los cambios del usuario.
   4. Al recuperar conexión (evento 'online' o al volver a primer plano),
      reproduce las acciones pendientes contra las Server Actions en orden
      cronológico y notifica a la interfaz.
   ========================================================================= */

// Dynamic import in syncOfflineActions keeps client bundle light and testable
export type OfflineActionType = 'toggle_task' | 'delete_task' | 'move_task' | 'unschedule_task';

export type OfflineAction =
  | { id: string; type: 'toggle_task'; taskId: string; done: boolean; timestamp: number }
  | { id: string; type: 'delete_task'; taskId: string; timestamp: number }
  | { id: string; type: 'move_task'; taskId: string; dateStr: string | null; timestamp: number }
  | { id: string; type: 'unschedule_task'; taskId: string; timestamp: number };

const QUEUE_STORAGE_KEY = 'organizer:offline-actions-v1';

export type SyncExecutor = {
  toggleTask: (id: string, done: boolean) => Promise<unknown>;
  deleteTask: (id: string) => Promise<unknown>;
  moveTaskToDate: (id: string, dateStr: string | null) => Promise<unknown>;
  unscheduleTask?: (id: string) => Promise<unknown>;
};

let customSyncExecutor: SyncExecutor | null = null;

export function setSyncExecutorForTesting(executor: SyncExecutor | null): void {
  customSyncExecutor = executor;
}

export type SyncStatusDetail = {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: number | null;
  error?: string | null;
};

/** Comprueba si el entorno actual reporta conexión a internet. */
export function isNetworkOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/** Detecta si un error lanzado es producto de falta de conectividad. */
export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch');
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('connection') ||
      msg.includes('offline')
    );
  }
  return false;
}

/** Lee las acciones pendientes del almacenamiento local. */
export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Guarda la cola de acciones en el almacenamiento local. */
function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifySyncStatus({
      isOnline: isNetworkOnline(),
      pendingCount: queue.length,
      syncing: isSyncInProgress,
      lastSyncAt,
    });
  } catch (err) {
    console.error('[OfflineSync] Error al guardar cola offline:', err);
  }
}

/** Remueve una acción completada de la cola sin borrar acciones agregadas concurrentemente. */
function removeActionFromQueue(actionId: string): void {
  const current = getOfflineQueue();
  const next = current.filter((a) => a.id !== actionId);
  saveOfflineQueue(next);
}

/** Encola una nueva acción offline con deduplicación inteligente. */
export function enqueueOfflineAction(action: OfflineAction): void {
  const current = getOfflineQueue();

  // Deduplicación inteligente:
  // 1. Si se va a borrar una tarea, elimina cualquier acción previa de esa tarea (toggles, movimientos, borrados) y encola el borrado.
  if (action.type === 'delete_task') {
    const filtered = current.filter((a) => a.taskId !== action.taskId);
    saveOfflineQueue([...filtered, action]);
    return;
  }

  // Si la tarea ya tiene un delete_task pendiente en la cola, no tiene sentido hacer toggle, move o unschedule
  const isAlreadyDeleted = current.some((a) => a.taskId === action.taskId && a.type === 'delete_task');
  if (isAlreadyDeleted) {
    return;
  }

  // 2. Si se cambia el estado de una tarea repetidamente (on/off), actualiza la última acción de toggle.
  if (action.type === 'toggle_task') {
    const existingIndex = current.findIndex(
      (a) => a.taskId === action.taskId && a.type === 'toggle_task'
    );
    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = action;
      saveOfflineQueue(updated);
      return;
    }
  }

  // 3. Si se mueve la misma tarea de fecha múltiples veces, reemplaza el movimiento previo.
  if (action.type === 'move_task') {
    const existingIndex = current.findIndex(
      (a) => a.taskId === action.taskId && (a.type === 'move_task' || a.type === 'unschedule_task')
    );
    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = action;
      saveOfflineQueue(updated);
      return;
    }
  }

  // 4. Si se desplanifica una tarea, reemplaza movimiento o desplanificación previa.
  if (action.type === 'unschedule_task') {
    const existingIndex = current.findIndex(
      (a) => a.taskId === action.taskId && (a.type === 'move_task' || a.type === 'unschedule_task')
    );
    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = action;
      saveOfflineQueue(updated);
      return;
    }
  }

  saveOfflineQueue([...current, action]);
}

let isSyncInProgress = false;
let lastSyncAt: number | null = null;

export function isSyncInProgressSnapshot(): boolean {
  return isSyncInProgress;
}

function notifySyncStatus(detail: SyncStatusDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('organizer:offline-sync', { detail }));
}

// Auto-sincronizar al detectar reconexión o al volver la app a primer plano
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineActions();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isNetworkOnline() && getOfflineQueue().length > 0) {
      syncOfflineActions();
    }
  });
}

async function getActions() {
  return await import('./fd4-actions');
}

/**
 * Procesa y sincroniza todas las acciones acumuladas en la cola offline.
 */
export async function syncOfflineActions(executor?: SyncExecutor): Promise<{ synced: number; remaining: number }> {
  if (isSyncInProgress) return { synced: 0, remaining: getOfflineQueue().length };
  if (!isNetworkOnline()) return { synced: 0, remaining: getOfflineQueue().length };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  isSyncInProgress = true;
  notifySyncStatus({
    isOnline: true,
    pendingCount: queue.length,
    syncing: true,
    lastSyncAt,
  });

  let syncedCount = 0;

  try {
    const actions = executor || customSyncExecutor || (await getActions());

    for (const action of queue) {
      try {
        if (action.type === 'toggle_task') {
          await actions.toggleTask(action.taskId, action.done);
        } else if (action.type === 'delete_task') {
          await actions.deleteTask(action.taskId);
        } else if (action.type === 'move_task') {
          await actions.moveTaskToDate(action.taskId, action.dateStr);
        } else if (action.type === 'unschedule_task') {
          if (actions.unscheduleTask) {
            await actions.unscheduleTask(action.taskId);
          } else {
            await actions.moveTaskToDate(action.taskId, null);
          }
        }

        // Acción exitosa: retirar de la cola de forma transaccional
        syncedCount++;
        removeActionFromQueue(action.id);
      } catch (err) {
        console.warn('[OfflineSync] Fallo al sincronizar acción:', action, err);
        if (isNetworkFailure(err)) {
          // Se perdió la conexión durante la sincronización: detenemos y preservamos intacta la cola pendiente
          break;
        }
        // Error no recuperable de servidor (ej. recurso ya no existe): descartamos para no bloquear la cola
        removeActionFromQueue(action.id);
      }
    }
  } catch (loaderErr) {
    console.warn('[OfflineSync] Error al cargar acciones del servidor:', loaderErr);
  }

  isSyncInProgress = false;
  lastSyncAt = Date.now();

  const finalRemaining = getOfflineQueue().length;
  notifySyncStatus({
    isOnline: isNetworkOnline(),
    pendingCount: finalRemaining,
    syncing: false,
    lastSyncAt,
  });

  return { synced: syncedCount, remaining: finalRemaining };
}

/* --------------------------------------------------------------------------
   Wrappers seguros para componentes: tolerantes a fallos offline
   -------------------------------------------------------------------------- */

/**
 * Marca o desmarca una tarea. Si no hay conexión o falla la red,
 * encola la acción sin lanzar error, permitiendo que la UI mantenga el estado optimista.
 */
export async function safeToggleTask(id: string, done: boolean): Promise<boolean> {
  if (!isNetworkOnline()) {
    enqueueOfflineAction({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'toggle_task',
      taskId: id,
      done,
      timestamp: Date.now(),
    });
    return true;
  }

  try {
    const actions = customSyncExecutor || (await getActions());
    await actions.toggleTask(id, done);
    return true;
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueueOfflineAction({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'toggle_task',
        taskId: id,
        done,
        timestamp: Date.now(),
      });
      return true;
    }
    throw err;
  }
}

/**
 * Elimina una tarea definitivamente. Si está offline, la encola y retorna éxito
 * para que la fila desaparezca optimísticamente de la pantalla.
 */
export async function safeDeleteTask(id: string): Promise<boolean> {
  if (!isNetworkOnline()) {
    enqueueOfflineAction({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'delete_task',
      taskId: id,
      timestamp: Date.now(),
    });
    return true;
  }

  try {
    const actions = customSyncExecutor || (await getActions());
    await actions.deleteTask(id);
    return true;
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueueOfflineAction({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'delete_task',
        taskId: id,
        timestamp: Date.now(),
      });
      return true;
    }
    throw err;
  }
}

/**
 * Mueve una tarea a una fecha o la desplanifica ('Algún día').
 */
export async function safeMoveTask(id: string, dateStr: string | null): Promise<boolean> {
  if (!isNetworkOnline()) {
    enqueueOfflineAction({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'move_task',
      taskId: id,
      dateStr,
      timestamp: Date.now(),
    });
    return true;
  }

  try {
    const actions = customSyncExecutor || (await getActions());
    await actions.moveTaskToDate(id, dateStr);
    return true;
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueueOfflineAction({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'move_task',
        taskId: id,
        dateStr,
        timestamp: Date.now(),
      });
      return true;
    }
    throw err;
  }
}

/**
 * Desplanifica una tarea ('Algún día'). Si está offline, la encola y retorna éxito
 * para que la UI mantenga el estado optimista.
 */
export async function safeUnscheduleTask(id: string): Promise<boolean> {
  if (!isNetworkOnline()) {
    enqueueOfflineAction({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'unschedule_task',
      taskId: id,
      timestamp: Date.now(),
    });
    return true;
  }

  try {
    const actions = customSyncExecutor || (await getActions());
    if (actions.unscheduleTask) {
      await actions.unscheduleTask(id);
    } else {
      await actions.moveTaskToDate(id, null);
    }
    return true;
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueueOfflineAction({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'unschedule_task',
        taskId: id,
        timestamp: Date.now(),
      });
      return true;
    }
    throw err;
  }
}
