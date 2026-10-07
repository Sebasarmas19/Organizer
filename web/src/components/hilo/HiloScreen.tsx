'use client';

/* ============================================================================
   Organizer · <HiloScreen>  ·  Inicio como el hilo de hoy

   Inicio es la conversacion que la app tuvo contigo hoy. Cada aviso que
   llego al iPhone es una burbuja gris, en su hora; lo que respondiste (lo
   que anotaste, lo que cerraste, lo que dejaste para despues) va a la
   derecha, en azul. Abajo del todo, bajo el pulgar, "Lo siguiente" con dos
   respuestas: Hecho y Después. Debajo, el campo para anotar.

   QUE ES DE QUIEN
     El servidor manda: page.tsx trae los eventos del dia (lib/thread-data)
     y lib/thread los ordena. Lo que tocas aqui se adelanta con
     useOptimistic y el servidor lo confirma al revalidar. Las claves son
     las mismas a los dos lados (`hecho:<id>`), asi que la burbuja no se
     vuelve a montar cuando llega la version buena.

     "Después" no va al servidor (laterQueue.ts): saltar no es decidir.

   LA FIRMA
     Lo que respondes vuela desde donde lo tocaste hasta su burbuja (FLIP
     con muelle, components/ios/spring) y lo siguiente llega cuando tu
     respuesta ya aterrizo, con un rebote leve. Con movimiento reducido,
     nada viaja: la respuesta y lo siguiente aparecen con un fundido.
   ========================================================================= */

import Link from 'next/link';
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { captureTask, moveTaskToDate, toggleTask, unscheduleTask } from '@/lib/fd4-actions';
import type { HomeReminder, HomeTask, OverdueTask } from '@/lib/home';
import type { ClassNote } from '@/components/fd4/homeSchedule';
import {
  ayerText,
  buildTimeline,
  capSubtitle,
  digestRows,
  doneKey,
  doneText,
  laterDays,
  laterText,
  nextLines,
  type DigestDay,
  type ThreadEvent,
} from '@/lib/thread';
import { TabBar } from '@/components/fd4/TabBar';
import { CreateSheet } from '@/components/ios/CreateSheet';
import { Glyph } from '@/components/ios/Glyph';
import { flyFrom, type Motion } from '@/components/ios/spring';
import { DigestBody, WeekBody, type DigestTaskRow } from './Bubbles';
import { DecideSheet, type Decision } from '@/components/inicio/DecideSheet';
import { useLaterQueue } from '@/components/inicio/laterQueue';

export type HiloProps = {
  todayStr: string;
  timezone: string;
  /** "lunes 5 de octubre" */
  dateLabel: string;
  streakDays: number;
  /** Lo que explica la racha al pasar el raton. Vacio si no hay racha. */
  streakTitle: string;
  /** Minutos desde medianoche en la zona del usuario. */
  nowMin: number;
  tasks: HomeTask[];
  classDays: DigestDay[];
  note: ClassNote;
  semana: HomeReminder[];
  ayer: OverdueTask[];
  /** Lo que paso hoy, de `dayEvents`. El ritual y lo de ayer ya vienen decididos. */
  events: ThreadEvent[];
};

/* Lo que esta sesion adelanta mientras el servidor confirma. */
type Local = {
  done: Record<string, { done: boolean; at: number }>;
  captures: { key: string; text: string; at: number }[];
  resolved: string[];
};

type Patch =
  | { type: 'done'; id: string; done: boolean; at: number }
  | { type: 'capture'; key: string; text: string; at: number }
  | { type: 'resolve'; id: string };

const NONE: Local = { done: {}, captures: [], resolved: [] };

function applyPatch(state: Local, patch: Patch): Local {
  if (patch.type === 'done') {
    return { ...state, done: { ...state.done, [patch.id]: { done: patch.done, at: patch.at } } };
  }
  if (patch.type === 'capture') {
    return { ...state, captures: [...state.captures, { key: patch.key, text: patch.text, at: patch.at }] };
  }
  return { ...state, resolved: [...state.resolved, patch.id] };
}

/** La ultima respuesta, la unica que se puede deshacer. */
type Last = { kind: 'done' | 'later'; id: string } | null;

/** Donde nace lo que vuela. `start`: alineado a la izquierda del texto. */
type Fly = { key: string; from: DOMRect; align?: 'start' };

const SAVE_ERROR = 'No se pudo guardar. Revisa la conexión y vuelve a intentarlo.';

const laterKey = (id: string) => `despues:${id}`;

/** La hora de una respuesta. Solo se llama desde los manejadores de toque:
    fuera del render, donde leer el reloj no rompe la pureza. */
function clock(): number {
  return Date.now();
}

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

export function HiloScreen({
  todayStr,
  timezone,
  dateLabel,
  streakDays,
  streakTitle,
  nowMin,
  tasks,
  classDays,
  note,
  semana,
  ayer,
  events,
}: HiloProps) {
  const [local, patch] = useOptimistic(NONE, applyPatch);
  const [later, saveLater] = useLaterQueue(todayStr);
  const [, startTransition] = useTransition();

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Last>(null);
  /* Hasta la primera respuesta nada "llega": abrir Inicio no es un mensaje. */
  const [animate, setAnimate] = useState(false);
  const [popped, setPopped] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [decideOpen, setDecideOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const flyRef = useRef<Fly | null>(null);
  const motionRef = useRef<Motion | null>(null);

  /* --------------------------------------------- lo que se ve ahora ---- */

  const view = tasks.map((t) => {
    const o = local.done[t.id];
    return o ? { ...t, done: o.done } : t;
  });

  /* La cola de hoy en el orden del servidor (lo que tiene hora primero), con
     lo saltado al final en el orden en que se salto. */
  const pending = view.filter((t) => !t.done);
  const skipped = later.map((e) => e.id);
  const queue = [
    ...pending.filter((t) => !skipped.includes(t.id)),
    ...skipped.map((id) => pending.find((t) => t.id === id)).filter((t): t is HomeTask => Boolean(t)),
  ];
  const next = queue[0] ?? null;

  const openAyer = ayer.filter((t) => !local.resolved.includes(t.id));
  const digest = digestRows(view, classDays, nowMin);

  const titleOf = new Map(tasks.map((t) => [t.id, t.title]));
  const merged: ThreadEvent[] = events.filter((e) => {
    if (e.key === 'ayer') return openAyer.length > 0;
    if (e.item.type === 'mine' && e.item.mark === 'done' && e.item.taskId) {
      return local.done[e.item.taskId]?.done !== false;
    }
    return true;
  });
  for (const [id, o] of Object.entries(local.done)) {
    const title = titleOf.get(id);
    if (!o.done || !title || merged.some((e) => e.key === doneKey(id))) continue;
    merged.push({
      key: doneKey(id),
      at: o.at,
      item: { type: 'mine', mark: 'done', text: doneText(title), receipt: '', taskId: id },
    });
  }
  for (const c of local.captures) {
    merged.push({ key: c.key, at: c.at, item: { type: 'mine', mark: 'created', text: c.text, receipt: 'Guardando…' } });
  }
  for (const e of later) {
    const title = titleOf.get(e.id);
    if (e.at === null || !title) continue;
    merged.push({
      key: laterKey(e.id),
      at: e.at,
      item: { type: 'mine', mark: 'later', text: laterText(title), receipt: '', taskId: e.id },
    });
  }
  const rows = buildTimeline(merged, timezone);

  /* ------------------------------------------------ la firma: volar ---- */

  useLayoutEffect(() => {
    const fly = flyRef.current;
    if (!fly) return;
    const el = logRef.current?.querySelector<HTMLElement>(`[data-key="${fly.key}"]`);
    if (!el) return;
    flyRef.current = null;

    /* Lo tuyo cae abajo del todo. `scrollHeight` lleva al fondo tanto si el
       navegador cuenta el scroll de column-reverse en negativo como si no. */
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    const from =
      fly.align === 'start'
        ? new DOMRect(fly.from.left - 13, fly.from.top, el.getBoundingClientRect().width, fly.from.height)
        : fly.from;
    motionRef.current?.stop();
    motionRef.current = flyFrom(el, from);
  });

  useEffect(() => () => motionRef.current?.stop(), []);

  /* ---------------------------------------------------- respuestas ----- */

  const run = (optimistic: () => void, action: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      optimistic();
      try {
        await action();
      } catch {
        setError(SAVE_ERROR);
      }
    });
  };

  const markDone = (task: { id: string }, from: HTMLElement) => {
    const at = clock();
    flyRef.current = { key: doneKey(task.id), from: from.getBoundingClientRect() };
    setLast({ kind: 'done', id: task.id });
    setPopped((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]));
    setAnimate(true);
    run(
      () => patch({ type: 'done', id: task.id, done: true, at }),
      () => toggleTask(task.id, true)
    );
  };

  const unmark = (id: string) => {
    const at = clock();
    if (last?.id === id) setLast(null);
    setAnimate(true);
    run(
      () => patch({ type: 'done', id, done: false, at }),
      () => toggleTask(id, false)
    );
  };

  const onToggle = (row: DigestTaskRow, from: HTMLElement) => {
    if (row.done) unmark(row.id);
    else markDone(row, from);
  };

  const onDone = (e: MouseEvent<HTMLButtonElement>) => {
    if (next) markDone(next, e.currentTarget);
  };

  const onLater = (e: MouseEvent<HTMLButtonElement>) => {
    if (!next || queue.length < 2) return;
    flyRef.current = { key: laterKey(next.id), from: e.currentTarget.getBoundingClientRect() };
    saveLater([...later.filter((x) => x.id !== next.id), { id: next.id, at: clock() }]);
    setLast({ kind: 'later', id: next.id });
    setAnimate(true);
    setError(null);
  };

  const onUndo = () => {
    if (!last) return;
    setLast(null);
    setAnimate(true);
    if (last.kind === 'later') saveLater(later.filter((x) => x.id !== last.id));
    else unmark(last.id);
  };

  const decide = (id: string, decision: Decision) => {
    const day = decision.kind === 'today' ? todayStr : decision.kind === 'day' ? decision.dateStr : null;
    const action = day ? () => moveTaskToDate(id, day) : () => unscheduleTask(id);
    if (openAyer.length <= 1) setDecideOpen(false);
    setAnimate(true);
    run(() => patch({ type: 'resolve', id }), action);
  };

  /* Anotar: sin campos, sin fecha, sin categoria (regla 3). Si el servidor
     falla, el texto vuelve al campo: nada se pierde en silencio. */
  const onSend = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const at = clock();
    const key = `pend:${at}`;
    if (inputRef.current) {
      flyRef.current = { key, from: inputRef.current.getBoundingClientRect(), align: 'start' };
    }
    setDraft('');
    setLast(null);
    setAnimate(true);
    setError(null);
    startTransition(async () => {
      patch({ type: 'capture', key, text, at });
      try {
        await captureTask(text);
      } catch {
        setError('No se guardó. Lo que escribiste sigue en el campo.');
        setDraft((d) => d || text);
      }
    });
  };

  /* ------------------------------------------------------- pintar ------ */

  const renderEvent = (event: ThreadEvent, tail: boolean) => {
    const { key, item } = event;
    switch (item.type) {
      case 'digest':
        return (
          <div className={cx('hl-msg hl-in hl-rich', tail && 'hl-tail')} data-key={key}>
            <DigestBody rows={digest} note={note} popped={popped} onToggle={onToggle} />
          </div>
        );

      case 'week':
        return (
          <>
            <div className={cx('hl-msg hl-in hl-rich', (tail || semana.length === 0) && 'hl-tail')} data-key={key}>
              <WeekBody semana={semana} />
            </div>
            {semana.length === 0 ? (
              <div className="hl-qr">
                <Link href="/reminders/nuevo" className="hl-chip io-press">
                  Nuevo reminder
                </Link>
              </div>
            ) : null}
          </>
        );

      case 'ayer':
        return (
          <>
            <div className="hl-msg hl-in hl-tail" data-key={key}>
              {ayerText(openAyer, todayStr)}
            </div>
            <div className="hl-qr">
              <button
                type="button"
                className="hl-chip io-press"
                aria-haspopup="dialog"
                onClick={() => setDecideOpen(true)}
              >
                Decidir
              </button>
            </div>
          </>
        );

      case 'review':
        return (
          <>
            <div className="hl-msg hl-in hl-tail" data-key={key}>
              Toca armar la semana. Son unos 10 minutos.
            </div>
            <div className="hl-qr">
              <Link href="/domingo" className="hl-chip io-press">
                Empezar
              </Link>
            </div>
          </>
        );

      case 'notice':
        return (
          <div className={cx('hl-msg hl-in', tail && 'hl-tail')} data-key={key}>
            {item.title ? <span className="hl-msg__t">{item.title}</span> : null}
            {item.body ? <span className="hl-msg__b">{item.body}</span> : null}
          </div>
        );

      case 'mine': {
        const undo =
          last !== null &&
          ((last.kind === 'done' && key === doneKey(last.id)) || (last.kind === 'later' && key === laterKey(last.id)));
        return (
          <>
            <div className={cx('hl-msg hl-out', (tail || undo || item.receipt) && 'hl-tail')} data-key={key}>
              {item.taskId ? <Link href={`/tareas/${item.taskId}`}>{item.text}</Link> : item.text}
            </div>
            {undo ? (
              <p className="hl-receipt">
                <button type="button" onClick={onUndo}>
                  Deshacer
                </button>
              </p>
            ) : item.receipt ? (
              <p className="hl-receipt">{item.receipt}</p>
            ) : null}
          </>
        );
      }
    }
  };

  const nextMeta = next ? nextLines(next.meta) : null;
  const arrive = animate ? 'hl-arrive hl-arrive--late' : null;

  return (
    <>
      <main className="hl-screen">
        <div className="hl-scroll" ref={scrollRef}>
          <div className="hl-log" ref={logRef} role="log" aria-label="Lo que pasó hoy">
            {rows.map((row) =>
              row.kind === 'stamp' ? (
                <p key={row.key} className="hl-stamp">
                  {row.day ? <b>Hoy</b> : null}
                  {row.day && row.clock ? ' ' : null}
                  {row.clock}
                </p>
              ) : (
                <Fragment key={row.key}>{renderEvent(row.event, row.tail)}</Fragment>
              )
            )}

            {/* Lo siguiente: siempre al final, bajo el pulgar. */}
            {next && nextMeta ? (
              <>
                <p className="hl-stamp">
                  <b>Ahora</b>
                </p>
                <div key={`next:${next.id}`} className={cx('hl-msg hl-in hl-rich hl-tail', arrive)}>
                  {nextMeta.cap ? <span className="hl-next__cap">{nextMeta.cap}</span> : null}
                  <Link href={`/tareas/${next.id}`} className="hl-next__t">
                    {next.title}
                  </Link>
                  {nextMeta.ctx ? <span className="hl-next__m">{nextMeta.ctx}</span> : null}
                  {next.rem ? (
                    <span className="hl-next__m">
                      <Glyph name="flag" className="hl-flag" />
                      {next.rem}
                    </span>
                  ) : null}
                </div>
                <div key={`qr:${next.id}`} className={cx('hl-qr', arrive)}>
                  <button type="button" className="hl-chip hl-chip--pri io-press" onClick={onDone}>
                    Hecho
                  </button>
                  {queue.length > 1 ? (
                    <button
                      type="button"
                      className="hl-chip io-press"
                      onClick={onLater}
                      title="Mandarla al final de hoy"
                    >
                      Después
                    </button>
                  ) : null}
                </div>
              </>
            ) : view.length > 0 ? (
              <>
                <p className="hl-stamp">
                  <b>Ahora</b>
                </p>
                <div key="cerrado" className={cx('hl-msg hl-in hl-tail', arrive)}>
                  Hoy está cerrado.
                </div>
                <div key="cerrado-qr" className={cx('hl-qr', arrive)}>
                  <Link href="/pendientes" className="hl-chip io-press">
                    Ir a Pendientes
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="hl-edge-t" aria-hidden="true" />
        <header className="hl-head">
          <Link href="/ajustes" prefetch={true} className="io-glass io-circ io-press" aria-label="Ajustes">
            <Glyph name="gear" />
          </Link>
          <div className="io-glass hl-cap" title={streakTitle || undefined}>
            <h1>Hoy</h1>
            <span>{capSubtitle(dateLabel, streakDays)}</span>
          </div>
          <Link
            href={`/calendario?v=dia&d=${todayStr}`}
            prefetch={true}
            className="io-glass io-circ io-press"
            aria-label="Ver el día"
          >
            <Glyph name="calendar" />
          </Link>
        </header>
        <div className="hl-edge-b" aria-hidden="true" />

        <form className="hl-compose" onSubmit={onSend}>
          <button
            type="button"
            className="io-glass io-circ io-press hl-plus"
            aria-label="Crear"
            aria-haspopup="dialog"
            onClick={() => setCreateOpen(true)}
          >
            <Glyph name="plus" />
          </button>
          <div className="io-glass hl-field">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Anota algo"
              aria-label="Anota algo"
              autoComplete="off"
              enterKeyHint="send"
            />
            <button
              type="submit"
              className="hl-send"
              data-on={draft.trim() !== ''}
              disabled={draft.trim() === ''}
              aria-label="Guardar"
            >
              <Glyph name="arrow-up" />
            </button>
          </div>
          {error ? (
            <p className="io-glass hl-err" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </main>

      <TabBar onCreate={() => setCreateOpen(true)} />
      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <DecideSheet
        open={decideOpen && openAyer.length > 0}
        onClose={() => setDecideOpen(false)}
        tasks={openAyer}
        days={laterDays(todayStr)}
        onDecide={decide}
      />
    </>
  );
}
