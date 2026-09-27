'use client';

/* ============================================================================
   Organizer · <FocusToday>  ·  "Lo siguiente" + "Luego, hoy"

   UNA COSA A LA VEZ. Con TDAH una lista de siete tareas de igual peso se lee
   como ninguna. Esta pieza saca UNA — la siguiente — a una tarjeta grande con
   dos salidas, y pliega el resto debajo:

     Hecho    -> la marca, de un toque, y sube la siguiente
     Despues  -> la manda al final de la cola de hoy, sin tocar su fecha

   "Despues" no escribe nada en el servidor a proposito. Cambiar la fecha es
   decidir; saltar es solo "ahora no". La cola saltada vive en localStorage
   por dia: al dia siguiente no queda rastro. Si el navegador no deja guardar,
   el salto no se guarda y la tarea sigue delante.

   El orden de la cola es el del servidor (las que tienen hora primero), asi
   que "lo siguiente" es lo proximo en el reloj y no una prioridad inventada.
   ========================================================================= */

import Link from 'next/link';
import { useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react';
import { toggleTask } from '@/lib/fd4-actions';
import type { HomeTask } from '@/lib/home';
import { TaskRow } from './TaskRow';
import { Flag } from './Marks';
import { Icon } from '@/components/Icon';

const LATER_VISIBLE = 3;

/* La cola saltada vive en localStorage, que es un sistema externo: se lee
   con useSyncExternalStore. En el servidor no hay saltos ('[]'), asi que el
   primer pintado coincide y el cliente corrige despues. */
const SKIP_EVENT = 'fd-skip-change';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(SKIP_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SKIP_EVENT, onChange);
  };
}

function readRaw(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '[]';
  } catch {
    return '[]';
  }
}

function writeSkipped(key: string, ids: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Sin almacenamiento el salto no se guarda. */
  }
  window.dispatchEvent(new Event(SKIP_EVENT));
}

export function FocusToday({ tasks, todayStr }: { tasks: HomeTask[]; todayStr: string }) {
  const storageKey = `fd-skip-${todayStr}`;
  const skippedRaw = useSyncExternalStore(
    subscribe,
    () => readRaw(storageKey),
    () => '[]'
  );
  const skipped = useMemo<string[]>(() => {
    try {
      return JSON.parse(skippedRaw) as string[];
    } catch {
      return [];
    }
  }, [skippedRaw]);
  const [showAll, setShowAll] = useState(false);
  const [lastDone, setLastDone] = useState<HomeTask | null>(null);
  const [, startTransition] = useTransition();

  /* Las marcadas desde la tarjeta se adelantan aqui; el servidor manda en
     cuanto revalida. */
  const [doneIds, markDone] = useOptimistic<string[], { id: string; done: boolean }>(
    [],
    (prev, { id, done }) => (done ? [...prev, id] : prev.filter((x) => x !== id))
  );

  const isDone = (t: HomeTask) => (doneIds.includes(t.id) ? true : t.done);

  const queue = useMemo(() => {
    const pending = tasks.filter((t) => !isDone(t));
    const fresh = pending.filter((t) => !skipped.includes(t.id));
    const later = skipped
      .map((id) => pending.find((t) => t.id === id))
      .filter((t): t is HomeTask => Boolean(t));
    return [...fresh, ...later];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, skipped, doneIds]);

  const now = queue[0];
  const rest = [...queue.slice(1), ...tasks.filter((t) => isDone(t))];
  const visibleRest = showAll ? rest : rest.slice(0, LATER_VISIBLE);
  const hidden = rest.length - visibleRest.length;

  const onDone = () => {
    if (!now) return;
    const task = now;
    setLastDone(task);
    startTransition(async () => {
      markDone({ id: task.id, done: true });
      await toggleTask(task.id, true);
    });
  };

  const onUndo = () => {
    if (!lastDone) return;
    const task = lastDone;
    setLastDone(null);
    startTransition(async () => {
      markDone({ id: task.id, done: false });
      await toggleTask(task.id, false);
    });
  };

  const onLater = () => {
    if (!now || queue.length < 2) return;
    const next = [...skipped.filter((id) => id !== now.id), now.id];
    writeSkipped(storageKey, next);
    setLastDone(null);
  };

  return (
    <div className="fd-focus">
      {now ? (
        <section aria-labelledby="fd-lead-label">
          <div className="fd-seclabel">
            <h2 id="fd-lead-label">Lo siguiente</h2>
          </div>
          <div className="fd-lead fd-lead--enter" key={now.id}>
          <p className="fd-lead__title">{now.title}</p>
          {now.meta ? <span className="fd-lead__when">{now.meta}</span> : null}
          {now.rem ? (
            <span className="fd-lead__rem">
              <Flag size="xs" />
              {now.rem}
            </span>
          ) : null}
          <div className="fd-lead__acts">
            <button type="button" className="fd-btn fd-btn--primary" onClick={onDone}>
              Hecho
            </button>
            <button
              type="button"
              className="fd-btn fd-btn--ghost"
              onClick={onLater}
              disabled={queue.length < 2}
              title={queue.length < 2 ? 'Es la única que queda hoy' : 'Mandarla al final de hoy'}
            >
              Después
            </button>
          </div>
          </div>
        </section>
      ) : (
        <section className="fd-lead fd-lead--rest">
          <div className="fd-lead__rest-top">
            <span className="fd-lead__rest-badge" aria-hidden>
              <Icon name={tasks.length > 0 ? 'check' : 'calendar'} size="md" />
            </span>
            <div className="fd-lead__rest-copy">
              <h2 className="fd-lead__title">
                {tasks.length > 0 ? 'Hoy está cerrado' : 'Hoy no hay nada con fecha'}
              </h2>
              <p className="fd-lead__hint">
                {tasks.length > 0
                  ? 'Buen trabajo. Si quieres avanzar más, clasifica pendientes o anota algo nuevo.'
                  : 'Día despejado. Si capturaste algo rápido, espera en Pendientes para ponerle día.'}
              </p>
            </div>
          </div>
          <div className="fd-lead__rest-acts">
            <Link href="/pendientes" className="fd-btn fd-btn--primary fd-lead__go">
              Ir a Pendientes
            </Link>
            <Link href="/anadir" className="fd-btn fd-lead__go">
              <Icon name="plus" size="sm" />
              Anotar para hoy
            </Link>
          </div>
        </section>
      )}

      {lastDone ? (
        <p className="fd-undo" role="status">
          <span>
            Hecho: <b>{lastDone.title}</b>
          </span>
          <button type="button" className="fd-undo__btn" onClick={onUndo}>
            <Icon name="undo" size="sm" />
            Deshacer
          </button>
        </p>
      ) : null}

      {rest.length > 0 ? (
        <section className="fd-later">
          <div className="fd-seclabel">
            <h2>Luego, hoy</h2>
          </div>
          <div className="fd-card">
            <div className="fd-card__body">
              {visibleRest.map((t) => (
                <TaskRow key={t.id} task={{ ...t, done: isDone(t) }} />
              ))}
              {hidden > 0 ? (
                <button type="button" className="fd-more" onClick={() => setShowAll(true)}>
                  <span>Ver el resto de hoy</span>
                  <Icon name="chevron-right" size="sm" className="fd-more__chev" />
                </button>
              ) : (
                <Link href="/pendientes" className="fd-more">
                  <span>El resto está en Pendientes</span>
                  <Icon name="chevron-right" size="sm" className="fd-more__chev" />
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
