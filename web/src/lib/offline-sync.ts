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
export type OfflineActionType = 'toggle_task' | 'delete_task' | 'move_task' | 'unschedule_task' | 'create_task';

export type CreateTaskPayload = {
  title: string;
  dueOn?: string | null;
  reminderId?: string | null;
  contextId?: string | null;
  estimateMin?: number | null;
};

export type OfflineAction =
  | { id: string; type: 'toggle_task'; taskId: string; done: boolean; timestamp: number }
  | { id: string; type: 'delete_task'; taskId: string; timestamp: number }
  | { id: string; type: 'move_task'; taskId: string; dateStr: string | null; timestamp: number }
  | { id: string; type: 'unschedule_task'; taskId: string; timestamp: number }
  | { id: string; type: 'create_task'; input: CreateTaskPayload; timestamp: number };

const QUEUE_STORAGE_KEY = 'organizer:offline-actions-v1';
const MAX_OFFLINE_QUEUE_SIZE = 100;
const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida estrictamente la forma y contenido de una acción offline proveniente
 * de localStorage antes de procesarla o enviarla a los Server Actions.
 * Previene XSS, prototype pollution y estados corruptos.
 */
export function validateOfflineAction(raw: unknown): OfflineAction | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  // Validar id
  if (typeof o.id !== 'string' || !o.id || o.id.length > 100) return null;

  // Validar timestamp
  if (typeof o.timestamp !== 'number' || !Number.isFinite(o.timestamp) || o.timestamp <= 0) {
    return null;
  }

  // Validar type
  if (typeof o.type !== 'string') return null;

  switch (o.type) {
    case 'toggle_task': {
      if (typeof o.taskId !== 'string' || !o.taskId.trim() || o.taskId.length > 120) return null;
      if (typeof o.done !== 'boolean') return null;
      return {
        id: o.id,
        type: 'toggle_task',
        taskId: o.taskId.trim(),
        done: o.done,
        timestamp: o.timestamp,
      };
    }
    case 'delete_task': {
      if (typeof o.taskId !== 'string' || !o.taskId.trim() || o.taskId.length > 120) return null;
      return {
        id: o.id,
        type: 'delete_task',
        taskId: o.taskId.trim(),
        timestamp: o.timestamp,
      };
    }
    case 'move_task': {
      if (typeof o.taskId !== 'string' || !o.taskId.trim() || o.taskId.length > 120) return null;
      let dateStr: string | null = null;
      if (typeof o.dateStr === 'string') {
        const trimmed = o.dateStr.trim();
        if (!DATE_STR_RE.test(trimmed)) return null;
        dateStr = trimmed;
      } else if (o.dateStr !== null && o.dateStr !== undefined) {
        return null;
      }
      return {
        id: o.id,
        type: 'move_task',
        taskId: o.taskId.trim(),
        dateStr,
        timestamp: o.timestamp,
      };
    }
    case 'unschedule_task': {
      if (typeof o.taskId !== 'string' || !o.taskId.trim() || o.taskId.length > 120) return null;
      return {
        id: o.id,
        type: 'unschedule_task',
        taskId: o.taskId.trim(),
        timestamp: o.timestamp,
      };
    }
    case 'create_task': {
      if (!o.input || typeof o.input !== 'object' || Array.isArray(o.input)) return null;
      const inp = o.input as Record<string, unknown>;
      if (typeof inp.title !== 'string') return null;
      const cleanTitle = inp.title.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (!cleanTitle) return null;

      let dueOn: string | null = null;
      if (typeof inp.dueOn === 'string') {
        const trimmed = inp.dueOn.trim();
        if (DATE_STR_RE.test(trimmed)) dueOn = trimmed;
      }

      const reminderId =
        typeof inp.reminderId === 'string' && inp.reminderId.trim()
          ? inp.reminderId.trim().slice(0, 120)
          : null;

      const contextId =
        typeof inp.contextId === 'string' && inp.contextId.trim()
          ? inp.contextId.trim().slice(0, 120)
          : null;

      let estimateMin: number | null = null;
      if (typeof inp.estimateMin === 'number' && Number.isInteger(inp.estimateMin) && inp.estimateMin > 0 && inp.estimateMin <= 1440) {
        estimateMin = inp.estimateMin;
      }

      return {
        id: o.id,
        type: 'create_task',
        input: {
          title: cleanTitle,
          dueOn,
          reminderId,
          contextId,
          estimateMin,
        },
        timestamp: o.timestamp,
      };
    }
    default:
      return null;
  }
}

export type SyncExecutor = {
  toggleTask: (id: string, done: boolean) => Promise<unknown>;
  deleteTask: (id: string) => Promise<unknown>;
  moveTaskToDate: (id: string, dateStr: string | null) => Promise<unknown>;
  unscheduleTask?: (id: string) => Promise<unknown>;
  createTask?: (input: CreateTaskPayload) => Promise<unknown>;
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

/** Lee las acciones pendientes del almacenamiento local con validación estricta de esquema. */
export function getOfflineQueue(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const validated: OfflineAction[] = [];
    for (const item of parsed) {
      const v = validateOfflineAction(item);
      if (v) validated.push(v);
      if (validated.length >= MAX_OFFLINE_QUEUE_SIZE) break;
    }
    return validated;
  } catch {
    return [];
  }
}

/** Guarda la cola de acciones en el almacenamiento local. */
function saveOfflineQueue(queue: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    const safeQueue = queue.slice(0, MAX_OFFLINE_QUEUE_SIZE);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(safeQueue));
    notifySyncStatus({
      isOnline: isNetworkOnline(),
      pendingCount: safeQueue.length,
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

  if (action.type === 'create_task') {
    saveOfflineQueue([...current, action]);
    return;
  }

  // Deduplicación inteligente:
  // 1. Si se va a borrar una tarea, elimina cualquier acción previa de esa tarea (toggles, movimientos, borrados) y encola el borrado.
  if (action.type === 'delete_task') {
    const filtered = current.filter((a) => !('taskId' in a) || a.taskId !== action.taskId);
    saveOfflineQueue([...filtered, action]);
    return;
  }

  // Si la tarea ya tiene un delete_task pendiente en la cola, no tiene sentido hacer toggle, move o unschedule
  const isAlreadyDeleted = current.some((a) => 'taskId' in a && a.taskId === action.taskId && a.type === 'delete_task');
  if (isAlreadyDeleted) {
    return;
  }

  // 2. Si se cambia el estado de una tarea repetidamente (on/off), actualiza la última acción de toggle.
  if (action.type === 'toggle_task') {
    const existingIndex = current.findIndex(
      (a) => 'taskId' in a && a.taskId === action.taskId && a.type === 'toggle_task'
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
      (a) => 'taskId' in a && a.taskId === action.taskId && (a.type === 'move_task' || a.type === 'unschedule_task')
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
      (a) => 'taskId' in a && a.taskId === action.taskId && (a.type === 'move_task' || a.type === 'unschedule_task')
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
        } else if (action.type === 'create_task') {
          if (actions && 'createTask' in actions && typeof (actions as { createTask?: unknown }).createTask === 'function') {
            await (actions as { createTask: (input: CreateTaskPayload) => Promise<unknown> }).createTask(action.input);
          } else {
            const { createTask } = await import('@/lib/planner-actions');
            await createTask(action.input);
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

/**
 * Crea una tarea. Si está offline, la encola y retorna éxito
 * para que la UI mantenga el estado optimista.
 */
export async function safeCreateTask(input: CreateTaskPayload): Promise<boolean> {
  if (!isNetworkOnline()) {
    enqueueOfflineAction({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'create_task',
      input,
      timestamp: Date.now(),
    });
    return true;
  }

  try {
    if (customSyncExecutor?.createTask) {
      await customSyncExecutor.createTask(input);
    } else {
      const { createTask } = await import('@/lib/planner-actions');
      await createTask(input);
    }
    return true;
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueueOfflineAction({
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'create_task',
        input,
        timestamp: Date.now(),
      });
      return true;
    }
    throw err;
  }
}
