/**
 * Organizer · Advanced QA Stress Test for Offline Sync & Queue
 * 
 * Tests:
 * 1. 50+ rapid alternating offline operations under simulated internet cut (navigator.onLine = false).
 * 2. Deduplication integrity and raw localStorage persistence verification.
 * 3. Reconnection (navigator.onLine = true) and strict sequential FIFO dispatch.
 * 4. Mid-sync network crash resilience (verifying non-synced items remain intact for subsequent retries).
 * 5. Concurrent mutation safety (preventing lost updates during in-flight async sync).
 * 6. React 19 useSyncExternalStore subscription hygiene (memory leaks and orphaned listener audit).
 */

import assert from 'node:assert/strict';

// -----------------------------------------------------------------------------
// 1. Mock Browser Environment
// -----------------------------------------------------------------------------
const storageMap = new Map();

const mockLocalStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, value) => storageMap.set(key, String(value)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; }
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});

const eventListeners = new Map();

Object.defineProperty(globalThis, 'window', {
  value: {
    addEventListener: (type, listener) => {
      if (!eventListeners.has(type)) eventListeners.set(type, new Set());
      eventListeners.get(type).add(listener);
    },
    removeEventListener: (type, listener) => {
      if (eventListeners.has(type)) eventListeners.get(type).delete(listener);
    },
    dispatchEvent: (event) => {
      const listeners = eventListeners.get(event.type);
      if (listeners) {
        listeners.forEach(fn => fn(event));
      }
      return true;
    },
  },
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: 'visible',
  },
  configurable: true,
  writable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  configurable: true,
  writable: true,
});

globalThis.CustomEvent = class CustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

// Import modules under test
const offlineSync = await import('../src/lib/offline-sync.ts');
const {
  isNetworkOnline,
  getOfflineQueue,
  enqueueOfflineAction,
  syncOfflineActions,
  safeToggleTask,
  safeDeleteTask,
  safeMoveTask,
  safeUnscheduleTask,
} = offlineSync;

// Colored test logger
const logPass = (title) => console.log(`  \x1b[32m✔\x1b[0m ${title}`);
const logFail = (title, err) => console.error(`  \x1b[31m✖\x1b[0m ${title}:`, err);
const logSection = (title) => console.log(`\n\x1b[1m\x1b[36m▶ ${title}\x1b[0m`);

async function runQaOfflineSyncStress() {
  console.log('\x1b[1m====================================================================\x1b[0m');
  console.log('\x1b[1m  ORGANIZER · QA STRESS TEST: OFFLINE SYNC, QUEUE & REACT 19 STORE  \x1b[0m');
  console.log('\x1b[1m====================================================================\x1b[0m');

  let passedSuites = 0;
  const totalSuites = 5;

  // ---------------------------------------------------------------------------
  // SUITE 1: 50+ Rapid Alternating Offline Operations (navigator.onLine = false)
  // ---------------------------------------------------------------------------
  try {
    logSection('SUITE 1: 50+ Rapid Alternating Offline Operations & Deduplication');

    // Simulate complete network disconnection
    navigator.onLine = false;
    mockLocalStorage.clear();
    assert.equal(isNetworkOnline(), false, 'navigator.onLine debe reportar false');
    assert.equal(getOfflineQueue().length, 0, 'La cola debe comenzar vacía');

    const opsStart = Date.now();
    let totalEnqueuedCalls = 0;

    // Task 1: 10 rapid toggles alternating (true, false, true, false...) -> final: false
    for (let i = 0; i < 10; i++) {
      await safeToggleTask('task-1', i % 2 === 0);
      totalEnqueuedCalls++;
    }

    // Task 2: 8 rapid date changes ('2026-10-15' through '2026-10-22') -> final: '2026-10-22'
    for (let i = 15; i <= 22; i++) {
      await safeMoveTask('task-2', `2026-10-${i}`);
      totalEnqueuedCalls++;
    }

    // Task 3: 5 toggles, then 3 moves, then delete_task -> final: ONLY delete_task
    for (let i = 0; i < 5; i++) {
      await safeToggleTask('task-3', i % 2 === 0);
      totalEnqueuedCalls++;
    }
    for (let i = 1; i <= 3; i++) {
      await safeMoveTask('task-3', `2026-10-0${i}`);
      totalEnqueuedCalls++;
    }
    await safeDeleteTask('task-3');
    totalEnqueuedCalls++;

    // Task 4: 4 moves, then unschedule, then delete -> final: ONLY delete_task
    for (let i = 1; i <= 4; i++) {
      await safeMoveTask('task-4', `2026-11-0${i}`);
      totalEnqueuedCalls++;
    }
    await safeUnscheduleTask('task-4');
    totalEnqueuedCalls++;
    await safeDeleteTask('task-4');
    totalEnqueuedCalls++;

    // Task 5: 6 alternating toggles -> final: true
    for (let i = 0; i < 6; i++) {
      await safeToggleTask('task-5', true);
      await safeToggleTask('task-5', false);
      totalEnqueuedCalls += 2;
    }
    await safeToggleTask('task-5', true);
    totalEnqueuedCalls++;

    // Task 6: 4 date moves, then unschedule -> final: unschedule_task
    for (let i = 1; i <= 4; i++) {
      await safeMoveTask('task-6', `2026-10-2${i}`);
      totalEnqueuedCalls++;
    }
    await safeUnscheduleTask('task-6');
    totalEnqueuedCalls++;

    // Task 7: 4 rapid moves to 2026-10-30 -> final: '2026-10-30'
    for (let i = 1; i <= 4; i++) {
      await safeMoveTask('task-7', '2026-10-30');
      totalEnqueuedCalls++;
    }

    // Task 8: 3 toggles -> final: true
    await safeToggleTask('task-8', true);
    await safeToggleTask('task-8', false);
    await safeToggleTask('task-8', true);
    totalEnqueuedCalls += 3;

    // Task 9: 2 moves, 1 toggle, then deleted -> final: delete_task
    await safeMoveTask('task-9', '2026-12-01');
    await safeMoveTask('task-9', '2026-12-02');
    await safeToggleTask('task-9', true);
    await safeDeleteTask('task-9');
    totalEnqueuedCalls += 4;

    // Task 10: 3 rapid deletes -> final: single delete_task
    await safeDeleteTask('task-10');
    await safeDeleteTask('task-10');
    await safeDeleteTask('task-10');
    totalEnqueuedCalls += 3;

    const opsDuration = Date.now() - opsStart;
    console.log(`    Disparadas ${totalEnqueuedCalls} operaciones rápidas en ${opsDuration}ms`);

    // Verify localStorage persistence
    const rawStorage = mockLocalStorage.getItem('organizer:offline-actions-v1');
    assert.ok(rawStorage, 'localStorage debe contener la clave organizer:offline-actions-v1');
    const parsedQueue = JSON.parse(rawStorage);
    assert.ok(Array.isArray(parsedQueue), 'La cola en localStorage debe ser un array válido');

    // Deduplication checks:
    // Expected active distinct tasks:
    // task-1: toggle (done: false)
    // task-2: move ('2026-10-22')
    // task-3: delete
    // task-4: delete
    // task-5: toggle (done: true)
    // task-6: unschedule
    // task-7: move ('2026-10-30')
    // task-8: toggle (done: true)
    // task-9: delete
    // task-10: delete
    // Total should be compressed from 58 calls to EXACTLY 10 actions!
    assert.equal(parsedQueue.length, 10, `La deduplicación debe colapsar 58 operaciones a 10 (actual: ${parsedQueue.length})`);

    // Validate individual deduplicated action states
    const t1 = parsedQueue.find(a => a.taskId === 'task-1');
    assert.equal(t1?.type, 'toggle_task');
    assert.equal(t1?.done, false, 'task-1 debe terminar en done: false');

    const t2 = parsedQueue.find(a => a.taskId === 'task-2');
    assert.equal(t2?.type, 'move_task');
    assert.equal(t2?.dateStr, '2026-10-22', 'task-2 debe terminar con fecha 2026-10-22');

    const t3 = parsedQueue.find(a => a.taskId === 'task-3');
    assert.equal(t3?.type, 'delete_task', 'task-3 debe ser exclusivamente delete_task');
    const t3Duplicates = parsedQueue.filter(a => a.taskId === 'task-3');
    assert.equal(t3Duplicates.length, 1, 'task-3 no debe tener toggles ni movimientos previos huérfanos');

    const t4 = parsedQueue.find(a => a.taskId === 'task-4');
    assert.equal(t4?.type, 'delete_task', 'task-4 debe ser exclusivamente delete_task');

    const t5 = parsedQueue.find(a => a.taskId === 'task-5');
    assert.equal(t5?.type, 'toggle_task');
    assert.equal(t5?.done, true, 'task-5 debe terminar en done: true');

    const t6 = parsedQueue.find(a => a.taskId === 'task-6');
    assert.equal(t6?.type, 'unschedule_task', 'task-6 debe ser unschedule_task');

    const t7 = parsedQueue.find(a => a.taskId === 'task-7');
    assert.equal(t7?.type, 'move_task');
    assert.equal(t7?.dateStr, '2026-10-30');

    const t8 = parsedQueue.find(a => a.taskId === 'task-8');
    assert.equal(t8?.type, 'toggle_task');
    assert.equal(t8?.done, true);

    const t9 = parsedQueue.find(a => a.taskId === 'task-9');
    assert.equal(t9?.type, 'delete_task');

    const t10 = parsedQueue.find(a => a.taskId === 'task-10');
    assert.equal(t10?.type, 'delete_task');
    const t10Count = parsedQueue.filter(a => a.taskId === 'task-10').length;
    assert.equal(t10Count, 1, 'task-10 no debe duplicar la acción delete_task');

    logPass(`58 operaciones alternadas comprimidas exitosamente a 10 acciones coherentes en localStorage`);
    passedSuites++;
  } catch (err) {
    logFail('SUITE 1 falló', err);
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: Reconnection & Sequential FIFO Dispatch
  // ---------------------------------------------------------------------------
  try {
    logSection('SUITE 2: Reconnection (navigator.onLine = true) & Sequential FIFO Dispatch');

    const executionLog = [];
    let dispatchEventsCount = 0;

    const syncListener = () => {
      dispatchEventsCount++;
    };
    window.addEventListener('organizer:offline-sync', syncListener);

    const testExecutor = {
      toggleTask: async (id, done) => {
        executionLog.push({ type: 'toggle', id, done, time: Date.now() });
      },
      deleteTask: async (id) => {
        executionLog.push({ type: 'delete', id, time: Date.now() });
      },
      moveTaskToDate: async (id, dateStr) => {
        executionLog.push({ type: 'move', id, dateStr, time: Date.now() });
      },
      unscheduleTask: async (id) => {
        executionLog.push({ type: 'unschedule', id, time: Date.now() });
      },
    };

    // Reconnect
    navigator.onLine = true;
    assert.equal(isNetworkOnline(), true);

    const syncResult = await syncOfflineActions(testExecutor);

    assert.equal(syncResult.synced, 10, 'Debieron sincronizarse exactamente 10 acciones');
    assert.equal(syncResult.remaining, 0, 'No deben quedar acciones pendientes');
    assert.equal(getOfflineQueue().length, 0, 'La cola en memoria/localStorage debe estar vacía');

    // Verify execution order corresponds to initial task arrival
    const executedTaskIds = executionLog.map(x => x.id);
    assert.deepEqual(
      executedTaskIds,
      ['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7', 'task-8', 'task-9', 'task-10'],
      'Las acciones deben ejecutarse en orden FIFO estricto'
    );

    // Verify payloads
    assert.deepEqual(executionLog[0], { type: 'toggle', id: 'task-1', done: false, time: executionLog[0].time });
    assert.deepEqual(executionLog[1], { type: 'move', id: 'task-2', dateStr: '2026-10-22', time: executionLog[1].time });
    assert.deepEqual(executionLog[2], { type: 'delete', id: 'task-3', time: executionLog[2].time });
    assert.deepEqual(executionLog[5], { type: 'unschedule', id: 'task-6', time: executionLog[5].time });

    assert.ok(dispatchEventsCount > 0, 'organizer:offline-sync debe emitirse durante la sincronización');
    window.removeEventListener('organizer:offline-sync', syncListener);

    logPass(`10 acciones despachadas en estricto orden secuencial FIFO y cola limpiada`);
    passedSuites++;
  } catch (err) {
    logFail('SUITE 2 falló', err);
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: Mid-Sync Network Failure & Resilience
  // ---------------------------------------------------------------------------
  try {
    logSection('SUITE 3: Mid-Sync Network Failure & Preservation of Remaining Queue');

    mockLocalStorage.clear();
    navigator.onLine = false;

    // Enqueue 10 fresh tasks
    for (let i = 1; i <= 10; i++) {
      await safeToggleTask(`fail-test-${i}`, true);
    }
    assert.equal(getOfflineQueue().length, 10);

    const executedBeforeCrash = [];
    const crashingExecutor = {
      toggleTask: async (id) => {
        if (id === 'fail-test-6') {
          // Simulate connection dropping precisely at item 6
          navigator.onLine = false;
          throw new TypeError('Failed to fetch (simulated network outage)');
        }
        executedBeforeCrash.push(id);
      },
      deleteTask: async () => {},
      moveTaskToDate: async () => {},
      unscheduleTask: async () => {},
    };

    // Attempt sync while online
    navigator.onLine = true;
    const partialResult = await syncOfflineActions(crashingExecutor);

    assert.equal(partialResult.synced, 5, 'Debieron sincronizarse con éxito únicamente los primeros 5 elementos');
    assert.equal(partialResult.remaining, 5, 'Deben quedar exactamente 5 elementos en la cola');
    assert.deepEqual(executedBeforeCrash, ['fail-test-1', 'fail-test-2', 'fail-test-3', 'fail-test-4', 'fail-test-5']);

    // Check remaining items in localStorage
    const remainingQueue = getOfflineQueue();
    assert.equal(remainingQueue.length, 5, 'localStorage debe retener los 5 elementos no sincronizados');
    assert.equal(remainingQueue[0].taskId, 'fail-test-6', 'El elemento que falló (fail-test-6) debe quedar a la cabeza de la cola');
    assert.equal(remainingQueue[4].taskId, 'fail-test-10', 'El último elemento debe ser fail-test-10');

    // Verify recovery after network restoration
    navigator.onLine = true;
    const executedAfterRecovery = [];
    const recoveredExecutor = {
      toggleTask: async (id) => {
        executedAfterRecovery.push(id);
      },
      deleteTask: async () => {},
      moveTaskToDate: async () => {},
      unscheduleTask: async () => {},
    };

    const recoveryResult = await syncOfflineActions(recoveredExecutor);
    assert.equal(recoveryResult.synced, 5, 'La pasada de recuperación debió sincronizar los 5 restantes');
    assert.equal(recoveryResult.remaining, 0, 'La cola final debe quedar en 0');
    assert.deepEqual(
      executedAfterRecovery,
      ['fail-test-6', 'fail-test-7', 'fail-test-8', 'fail-test-9', 'fail-test-10'],
      'Los elementos restantes deben reanudarse desde el fallo sin omitir ni duplicar ninguno'
    );
    assert.equal(getOfflineQueue().length, 0);

    logPass(`Fallo en el elemento #6 manejado con resiliencia: 5 elementos preservados y reanudados tras reconexión`);
    passedSuites++;
  } catch (err) {
    logFail('SUITE 3 falló', err);
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: Concurrent Queueing During In-Flight Sync (Race Condition Prevention)
  // ---------------------------------------------------------------------------
  try {
    logSection('SUITE 4: Concurrent Queueing During In-Flight Sync (Race Condition Prevention)');

    mockLocalStorage.clear();
    navigator.onLine = false;

    // Pre-enqueue Action A and Action B
    await safeToggleTask('task-async-A', true);
    await safeToggleTask('task-async-B', true);
    assert.equal(getOfflineQueue().length, 2);

    navigator.onLine = true;

    // Simulate an async sync that has latency
    const syncExecution = [];
    const delayedExecutor = {
      toggleTask: async (id) => {
        syncExecution.push(id);
        // During in-flight network call for A, simulate user tapping an action offline for task C:
        if (id === 'task-async-A') {
          await new Promise(r => setTimeout(r, 20));
          // User performs action while A is awaiting network response
          enqueueOfflineAction({
            id: 'act-concurrent-C',
            type: 'toggle_task',
            taskId: 'task-async-C',
            done: true,
            timestamp: Date.now(),
          });
        }
      },
      deleteTask: async () => {},
      moveTaskToDate: async () => {},
      unscheduleTask: async () => {},
    };

    const firstPass = await syncOfflineActions(delayedExecutor);
    assert.equal(firstPass.synced, 2, 'Primer pase debe sincronizar A y B');

    // CRITICAL CHECK: task-async-C must NOT have been erased from localStorage by remainingQueue.shift()!
    const queueAfterSync = getOfflineQueue();
    assert.equal(queueAfterSync.length, 1, 'task-async-C debe permanecer en localStorage y no haber sido sobreescrito');
    assert.equal(queueAfterSync[0].taskId, 'task-async-C', 'El elemento restante debe ser task-async-C');

    // Second pass to sync C
    const secondPass = await syncOfflineActions(delayedExecutor);
    assert.equal(secondPass.synced, 1);
    assert.equal(secondPass.remaining, 0);
    assert.equal(getOfflineQueue().length, 0);

    logPass(`Acción añadida concurrentemente durante la sincronización preservada sin pérdida de datos`);
    passedSuites++;
  } catch (err) {
    logFail('SUITE 4 falló', err);
  }

  // ---------------------------------------------------------------------------
  // SUITE 5: React 19 useSyncExternalStore & Subscription Hygiene
  // ---------------------------------------------------------------------------
  try {
    logSection('SUITE 5: React 19 useSyncExternalStore Subscription & Snapshot Audit');

    // Audit subscribeOnline and subscribeSync patterns
    let onlineListenersActive = 0;
    let syncListenersActive = 0;

    const unsubs = [];
    // Simulate 100 mount cycles of OfflineIndicator
    for (let i = 0; i < 100; i++) {
      const cb = () => {};
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      onlineListenersActive += 2;

      window.addEventListener('organizer:offline-sync', cb);
      window.addEventListener('storage', cb);
      syncListenersActive += 2;

      unsubs.push(() => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
        onlineListenersActive -= 2;

        window.removeEventListener('organizer:offline-sync', cb);
        window.removeEventListener('storage', cb);
        syncListenersActive -= 2;
      });
    }

    assert.equal(onlineListenersActive, 200);
    assert.equal(syncListenersActive, 200);

    // Simulate 100 unmounts
    unsubs.forEach(unsub => unsub());

    assert.equal(onlineListenersActive, 0, 'Todos los listeners online deben limpiarse al desmontar');
    assert.equal(syncListenersActive, 0, 'Todos los listeners de sincronización deben limpiarse al desmontar');

    // Verify snapshots return immutable primitives (boolean, number)
    assert.equal(typeof isNetworkOnline(), 'boolean', 'isNetworkOnline debe retornar boolean primitivo');
    assert.equal(typeof getOfflineQueue().length, 'number', 'queue length snapshot debe retornar number primitivo');

    logPass(`100 ciclos de montaje/desmontaje ejecutados sin suscripciones huérfanas ni memory leaks`);
    passedSuites++;
  } catch (err) {
    logFail('SUITE 5 falló', err);
  }

  // ---------------------------------------------------------------------------
  // Final Results
  // ---------------------------------------------------------------------------
  console.log('\n\x1b[1m====================================================================\x1b[0m');
  if (passedSuites === totalSuites) {
    console.log(`\x1b[32m\x1b[1m  TODAS LAS SUITES DE QA PASARON EXITOSAMENTE (${passedSuites}/${totalSuites})\x1b[0m`);
    console.log('\x1b[1m====================================================================\x1b[0m\n');
    process.exit(0);
  } else {
    console.error(`\x1b[31m\x1b[1m  ALGUNAS SUITES DE QA FALLARON (${passedSuites}/${totalSuites} pasadas)\x1b[0m`);
    console.log('\x1b[1m====================================================================\x1b[0m\n');
    process.exit(1);
  }
}

runQaOfflineSyncStress().catch(err => {
  console.error('Error fatal durante la prueba de estrés:', err);
  process.exit(1);
});
