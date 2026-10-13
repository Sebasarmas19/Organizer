import test from 'node:test';
import assert from 'node:assert/strict';

/* Mock global window, navigator, localStorage and CustomEvent for Node test environment */
const storage = new Map<string, string>();

const mockStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  configurable: true,
  writable: true,
});

(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = class CustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, options?: { detail?: unknown }) {
    this.type = type;
    this.detail = options?.detail;
  }
};

import {
  isNetworkOnline,
  isNetworkFailure,
  getOfflineQueue,
  enqueueOfflineAction,
  type OfflineAction,
} from './offline-sync.ts';

test('isNetworkOnline reporta el estado de navigator.onLine', () => {
  (globalThis.navigator as { onLine: boolean }).onLine = true;
  assert.equal(isNetworkOnline(), true);

  (globalThis.navigator as { onLine: boolean }).onLine = false;
  assert.equal(isNetworkOnline(), false);
  (globalThis.navigator as { onLine: boolean }).onLine = true;
});

test('isNetworkFailure detecta errores de red y fetch', () => {
  assert.equal(isNetworkFailure(new TypeError('Failed to fetch')), true);
  assert.equal(isNetworkFailure(new Error('NetworkError when attempting to fetch resource')), true);
  assert.equal(isNetworkFailure(new Error('SyntaxError in json')), false);
});

test('enqueueOfflineAction guarda y deduplica toggles de la misma tarea', () => {
  storage.clear();
  assert.equal(getOfflineQueue().length, 0);

  const action1: OfflineAction = {
    id: '1',
    type: 'toggle_task',
    taskId: 'task-abc',
    done: true,
    timestamp: 100,
  };
  enqueueOfflineAction(action1);
  const q1 = getOfflineQueue();
  assert.equal(q1.length, 1);
  assert.equal(q1[0].type, 'toggle_task');
  if (q1[0].type === 'toggle_task') {
    assert.equal(q1[0].done, true);
  }

  // Mismo taskId, se cambia a done = false: debe sustituir la acción previa
  const action2: OfflineAction = {
    id: '2',
    type: 'toggle_task',
    taskId: 'task-abc',
    done: false,
    timestamp: 200,
  };
  enqueueOfflineAction(action2);
  const queue = getOfflineQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].id, '2');
  if (queue[0].type === 'toggle_task') {
    assert.equal(queue[0].done, false);
  }
});

test('enqueueOfflineAction elimina toggles pendientes si se borra la tarea', () => {
  storage.clear();
  enqueueOfflineAction({
    id: '1',
    type: 'toggle_task',
    taskId: 'task-xyz',
    done: true,
    timestamp: 100,
  });
  assert.equal(getOfflineQueue().length, 1);

  // Borrar la tarea debe limpiar el toggle y dejar solo el borrado
  enqueueOfflineAction({
    id: '2',
    type: 'delete_task',
    taskId: 'task-xyz',
    timestamp: 200,
  });
  const queue = getOfflineQueue();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'delete_task');
  assert.equal(queue[0].taskId, 'task-xyz');

  // Acciones posteriores sobre una tarea ya borrada deben ignorarse
  enqueueOfflineAction({
    id: '3',
    type: 'toggle_task',
    taskId: 'task-xyz',
    done: true,
    timestamp: 300,
  });
  const queueAfter = getOfflineQueue();
  assert.equal(queueAfter.length, 1);
  assert.equal(queueAfter[0].type, 'delete_task');
});

test('enqueueOfflineAction deduplica movimientos de fecha y desplanificaciones', () => {
  storage.clear();

  enqueueOfflineAction({
    id: 'm1',
    type: 'move_task',
    taskId: 'task-move-1',
    dateStr: '2026-10-15',
    timestamp: 100,
  });
  assert.equal(getOfflineQueue().length, 1);

  enqueueOfflineAction({
    id: 'm2',
    type: 'move_task',
    taskId: 'task-move-1',
    dateStr: '2026-10-16',
    timestamp: 200,
  });
  const q1 = getOfflineQueue();
  assert.equal(q1.length, 1);
  if (q1[0].type === 'move_task') {
    assert.equal(q1[0].dateStr, '2026-10-16');
  }

  // Desplanificar la misma tarea reemplaza el movimiento previo
  enqueueOfflineAction({
    id: 'u1',
    type: 'unschedule_task',
    taskId: 'task-move-1',
    timestamp: 300,
  });
  const q2 = getOfflineQueue();
  assert.equal(q2.length, 1);
  assert.equal(q2[0].type, 'unschedule_task');
});

test('syncOfflineActions sincroniza en orden FIFO y vacía la cola', async () => {
  storage.clear();
  const executed: string[] = [];

  const mockExecutor = {
    toggleTask: async (id: string, done: boolean) => {
      executed.push(`toggle:${id}:${done}`);
    },
    deleteTask: async (id: string) => {
      executed.push(`delete:${id}`);
    },
    moveTaskToDate: async (id: string, dateStr: string | null) => {
      executed.push(`move:${id}:${dateStr}`);
    },
    unscheduleTask: async (id: string) => {
      executed.push(`unschedule:${id}`);
    },
  };

  enqueueOfflineAction({
    id: 'act-1',
    type: 'toggle_task',
    taskId: 't1',
    done: true,
    timestamp: 1,
  });
  enqueueOfflineAction({
    id: 'act-2',
    type: 'move_task',
    taskId: 't2',
    dateStr: '2026-10-20',
    timestamp: 2,
  });
  enqueueOfflineAction({
    id: 'act-3',
    type: 'delete_task',
    taskId: 't3',
    timestamp: 3,
  });

  (globalThis.navigator as { onLine: boolean }).onLine = true;
  const result = await (await import('./offline-sync.ts')).syncOfflineActions(mockExecutor);

  assert.equal(result.synced, 3);
  assert.equal(result.remaining, 0);
  assert.deepEqual(executed, ['toggle:t1:true', 'move:t2:2026-10-20', 'delete:t3']);
  assert.equal(getOfflineQueue().length, 0);
});

test('syncOfflineActions detiene la sincronización ante fallo de red y preserva la cola restante intacta', async () => {
  storage.clear();
  const executed: string[] = [];

  const mockExecutor = {
    toggleTask: async (id: string) => {
      executed.push(`toggle:${id}`);
    },
    deleteTask: async () => {},
    moveTaskToDate: async (id: string) => {
      if (id === 't2') {
        // Simular corte de red a mitad de sincronización
        (globalThis.navigator as { onLine: boolean }).onLine = false;
        throw new TypeError('Failed to fetch');
      }
      executed.push(`move:${id}`);
    },
  };

  enqueueOfflineAction({
    id: 'act-1',
    type: 'toggle_task',
    taskId: 't1',
    done: true,
    timestamp: 1,
  });
  enqueueOfflineAction({
    id: 'act-2',
    type: 'move_task',
    taskId: 't2',
    dateStr: '2026-10-20',
    timestamp: 2,
  });
  enqueueOfflineAction({
    id: 'act-3',
    type: 'toggle_task',
    taskId: 't3',
    done: false,
    timestamp: 3,
  });

  (globalThis.navigator as { onLine: boolean }).onLine = true;
  const result = await (await import('./offline-sync.ts')).syncOfflineActions(mockExecutor);

  assert.equal(result.synced, 1);
  assert.equal(result.remaining, 2);
  assert.deepEqual(executed, ['toggle:t1']);

  // t2 y t3 deben seguir en la cola en el mismo orden
  const remainingQueue = getOfflineQueue();
  assert.equal(remainingQueue.length, 2);
  assert.equal(remainingQueue[0].id, 'act-2');
  assert.equal(remainingQueue[1].id, 'act-3');
});
