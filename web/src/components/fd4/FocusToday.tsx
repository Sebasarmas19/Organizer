'use client';

/* ============================================================================
   Organizer · <FocusToday>  ·  "Lo siguiente" + "Resto de hoy"

   UNA COSA A LA VEZ. Con TDAH una lista de siete tareas de igual peso se lee
   como ninguna. Esta pieza saca UNA — la siguiente — a un bloque grande con
   dos salidas, y deja el resto debajo:

     Hecho    -> la marca, de un toque, y sube la siguiente
     Despues  -> la manda al final de la cola de hoy, sin tocar su fecha

   FD5: el bloque de lo siguiente es lo unico saturado de Inicio. Debajo va
   una lista calmada, con la hora a la izquierda, donde se mezclan las tareas
   que quedan y las clases de hoy (gris, punto verde, aula).

   "Despues" no escribe nada en el servidor a proposito. Cambiar la fecha es
   decidir; saltar es solo "ahora no". La cola saltada vive en localStorage
   por dia: al dia siguiente no queda rastro. Si el navegador no deja guardar,
   el salto no se guarda y la tarea sigue delante.

   El orden de la cola es el del servidor (las que tienen hora primero), asi
   que "lo siguiente" es lo proximo en el reloj y no una prioridad inventada.
   ========================================================================= */

import Link from 'next/link';
import { Fragment, useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react';
import { toggleTask } from '@/lib/fd4-actions';
import type { HomeTask } from '@/lib/home';
import { RestTaskRow } from './RestRow';
import { minToClock, splitTaskMeta, type ClassNote, type RestClass } from './homeSchedule';
import { Icon } from '@/components/Icon';

/* Filas visibles de "Resto de hoy" antes de "Ver el resto de hoy". */
const REST_VISIBLE = 6;

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

type Row =
  | { kind: 'task'; key: string; startMin: number; task: HomeTask }
  | { kind: 'class'; key: string; startMin: number; cls: RestClass };

export function FocusToday({
  tasks,
  todayStr,
  classes,
  note,
  nowMin,
}: {
  tasks: HomeTask[];
  todayStr: string;
  /** Clases de hoy que aun no terminaron. */
  classes: RestClass[];
  /** Frase cuando hoy ya no queda clase. `null` si no hay horario. */
  note: ClassNote;
  /** Minutos desde medianoche en la zona del usuario, para la fila "Ahora". */
  nowMin: number;
}) {
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

  /* Las marcadas desde el bloque se adelantan aqui; el servidor manda en
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

  /* "Resto de hoy": lo que queda de la cola y las clases que quedan, en una
     sola lista por hora. Las tareas sin hora van detras; las hechas, al
     final y tachadas. La fila "Ahora" cae justo despues de lo que ya
     empezo. */
  const pendingRest: Row[] = queue.slice(1).map((t) => ({
    kind: 'task',
    key: t.id,
    startMin: splitTaskMeta(t.meta).startMin,
    task: t,
  }));
  const classRows: Row[] = classes.map((c) => ({
    kind: 'class',
    key: c.id,
    startMin: c.startMin,
    cls: c,
  }));
  const timed = [...pendingRest, ...classRows]
    .filter((r) => !Number.isNaN(r.startMin))
    .sort((a, b) => a.startMin - b.startMin);
  const untimed = pendingRest.filter((r) => Number.isNaN(r.startMin));
  const doneRows: Row[] = tasks
    .filter((t) => isDone(t))
    .map((t) => ({ kind: 'task', key: t.id, startMin: NaN, task: t }));
  const rows = [...timed, ...untimed, ...doneRows];
  const visibleRows = showAll ? rows : rows.slice(0, REST_VISIBLE);
  const hidden = rows.length - visibleRows.length;
  const hasTimedTask = timed.some((r) => r.kind === 'task');

  /* Sin nada con hora ni frase de clases, "Ahora" no ordena nada: no va. */
  const nowIndex =
    timed.length > 0 || note ? timed.filter((r) => r.startMin <= nowMin).length : -1;

  const nowRow = (
    <div className="fd5-li fd5-li--now">
      <time className="fd5-li__time">{minToClock(nowMin)}</time>
      <span className="fd5-li__body">Ahora</span>
    </div>
  );

  const renderRow = (r: Row) => {
    if (r.kind === 'class') {
      const where = r.cls.location ? ` · ${r.cls.location}` : '';
      return (
        <div className="fd5-li fd5-li--cls">
          <time className="fd5-li__time">{r.cls.start}</time>
          <span className="fd5-li__body">
            <i className="fd5-classdot" aria-hidden />
            <span>
              {r.cls.title}
              {where}
              {r.cls.now ? <span className="fd5-sr"> (en curso)</span> : null}
            </span>
          </span>
        </div>
      );
    }
    const meta = splitTaskMeta(r.task.meta);
    return (
      <RestTaskRow
        id={r.task.id}
        title={r.task.title}
        start={meta.start}
        ctx={meta.ctx}
        rem={r.task.rem}
        done={isDone(r.task)}
      />
    );
  };

  return (
    <div className="fd5-focus">
      {now ? (
        <section className="fd5-next fd-lead--enter" key={now.id} aria-label="Lo siguiente">
          <Link href={`/tareas/${now.id}`} className="fd5-next__title">
            {now.title}
          </Link>
          {now.meta || now.rem ? (
            <div className="fd5-next__meta">
              {now.meta ? <span>{now.meta}</span> : null}
              {now.rem ? (
                <span className="fd5-chip">
                  <Icon name="flag" size="sm" className="fd5-flag" />
                  {now.rem}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="fd5-next__acts">
            <button type="button" className="fd5-next__done" onClick={onDone}>
              Hecho
            </button>
            <button
              type="button"
              className="fd5-next__later"
              onClick={onLater}
              disabled={queue.length < 2}
              title={queue.length < 2 ? 'Es la única que queda hoy' : 'Mandarla al final de hoy'}
            >
              Después
            </button>
          </div>
        </section>
      ) : (
        <section className="fd5-rest">
          <h2 className="fd5-rest__title">
            {tasks.length > 0 ? 'Hoy está cerrado' : 'Hoy no hay nada con fecha'}
          </h2>
          <p className="fd5-rest__hint">
            {tasks.length > 0
              ? 'Buen trabajo. Si quieres avanzar más, clasifica pendientes o anota algo nuevo.'
              : 'Día despejado. Si capturaste algo rápido, espera en Pendientes para ponerle día.'}
          </p>
          <div className="fd5-rest__acts">
            <Link href="/pendientes" className="fd5-btn fd5-btn--primary">
              Ir a Pendientes
            </Link>
            <Link href="/anadir" className="fd5-btn">
              <Icon name="plus" size="sm" />
              Anotar para hoy
            </Link>
          </div>
        </section>
      )}

      {lastDone ? (
        <p className="fd-undo fd5-undo" role="status">
          <span>
            Hecho: <b>{lastDone.title}</b>
          </span>
          <button type="button" className="fd-undo__btn" onClick={onUndo}>
            <Icon name="undo" size="sm" />
            Deshacer
          </button>
        </p>
      ) : null}

      <section className="fd5-sec" aria-labelledby="fd5-rest-label">
        <div className="fd5-sec__head">
          <h2 id="fd5-rest-label">Resto de hoy</h2>
          <span className="fd5-sec__links">
            <Link href="/clases" prefetch={true}>
              Horario
            </Link>
            <Link href={`/calendario?v=dia&d=${todayStr}`} prefetch={true}>
              Ver el día
            </Link>
          </span>
        </div>

        <div className="fd5-list">
          {visibleRows.map((r, i) => (
            <Fragment key={r.key}>
              {i === nowIndex ? nowRow : null}
              {renderRow(r)}
            </Fragment>
          ))}
          {nowIndex >= visibleRows.length && hidden === 0 ? nowRow : null}

          {note ? (
            <>
              <div className="fd5-li fd5-li--note">
                <span className="fd5-li__time" />
                <span className="fd5-li__body">
                  {note.line}
                  {hasTimedTask ? '.' : '. Nada más con hora.'}
                </span>
              </div>
              {note.next ? (
                <div className="fd5-li fd5-li--note">
                  <span className="fd5-li__time" />
                  <span className="fd5-li__body">
                    <Icon name="sunrise" size="sm" />
                    {note.next}
                  </span>
                </div>
              ) : null}
            </>
          ) : rows.length === 0 ? (
            <div className="fd5-li fd5-li--note">
              <span className="fd5-li__time" />
              <span className="fd5-li__body">Nada más para hoy.</span>
            </div>
          ) : null}

          {hidden > 0 ? (
            <button type="button" className="fd5-more" onClick={() => setShowAll(true)}>
              Ver el resto de hoy
              <Icon name="chevron-down" size="sm" />
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
