'use client';

/* ============================================================================
   Organizer · <InicioScreen>  ·  el resumen de hoy en bloques

   Al entrar, todo de un vistazo y en orden de urgencia:

     Ahora      lo siguiente, con Hecho y Después bajo el pulgar
     Tu día     clases y tareas por hora; las tareas se marcan aqui mismo
     Racha      dias seguidos y comodines   |   Lo de ayer, con Decidir
     Se viene   parciales y entregas con su preparacion

   El dia del ritual, "Armar la semana" ocupa el sitio de lo de ayer (como
   en el aviso del domingo). Sin contadores de lo pendiente (decision 22).

   QUE ES DE QUIEN
     El servidor manda (page.tsx). Lo que tocas se adelanta con
     useOptimistic y el servidor lo confirma al revalidar. "Después" no va
     al servidor (laterQueue.ts): saltar no es decidir.
   ========================================================================= */

import Link from 'next/link';
import { useEffect, useOptimistic, useState, useTransition } from 'react';
import { safeToggleTask, safeMoveTask, safeUnscheduleTask } from '@/lib/offline-sync';
import type { HomeReminder, HomeTask, OverdueTask } from '@/lib/home';
import { shortWhen, type ClassNote } from '@/components/fd4/homeSchedule';
import { digestRows, laterDays, listTitles, nextLines, weekSub, type DigestDay, type DigestRow } from '@/lib/thread';
import { TabBar } from '@/components/fd4/TabBar';
import { Glyph } from '@/components/ios/Glyph';
import { DecideSheet, type Decision } from './DecideSheet';
import { useLaterQueue } from './laterQueue';
import { CreateSheet } from '@/components/ios/CreateSheet';
import { CreateTaskSheet } from '@/components/planner/CreateTaskSheet';
import { CreateReminderSheet } from '@/components/planner/CreateReminderSheet';

export type InicioProps = {
  todayStr: string;
  /** "martes 6 de octubre" */
  dateLabel: string;
  streakDays: number;
  graceLeft: number;
  /** Minutos desde medianoche en la zona del usuario. */
  nowMin: number;
  tasks: HomeTask[];
  classDays: DigestDay[];
  note: ClassNote;
  semana: HomeReminder[];
  ayer: OverdueTask[];
  reviewDue: boolean;
};

type Local = { done: Record<string, boolean>; resolved: string[] };
type Patch = { type: 'done'; id: string; done: boolean } | { type: 'resolve'; id: string };

const NONE: Local = { done: {}, resolved: [] };

function applyPatch(state: Local, patch: Patch): Local {
  if (patch.type === 'done') return { ...state, done: { ...state.done, [patch.id]: patch.done } };
  return { ...state, resolved: [...state.resolved, patch.id] };
}

/** La ultima respuesta, la unica que se puede deshacer. */
type Last = { kind: 'done' | 'later'; id: string; title: string } | null;

const SAVE_ERROR = 'No se pudo guardar. Revisa la conexión y vuelve a intentarlo.';

type TaskRow = Extract<DigestRow, { kind: 'task' }>;

export function InicioScreen({
  todayStr,
  dateLabel,
  streakDays,
  graceLeft,
  nowMin,
  tasks,
  classDays,
  note,
  semana,
  ayer,
  reviewDue,
}: InicioProps) {
  const [local, patch] = useOptimistic(NONE, applyPatch);
  const [later, saveLater] = useLaterQueue(todayStr);
  const [, startTransition] = useTransition();
  const [last, setLast] = useState<Last>(null);
  const [error, setError] = useState<string | null>(null);
  /* Hasta la primera respuesta nada "llega": abrir Inicio no es un cambio. */
  const [animate, setAnimate] = useState(false);
  const [popped, setPopped] = useState<string[]>([]);
  const [decideOpen, setDecideOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);

  useEffect(() => {
    if (timerSeconds === null || timerSeconds <= 0 || timerPaused) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 100, 200]);
            } catch {}
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds, timerPaused]);

  /* ---------------------------------------------- lo que se ve ahora --- */

  const view = tasks.map((t) => (t.id in local.done ? { ...t, done: local.done[t.id] } : t));

  /* La cola de hoy en el orden del servidor, con lo saltado al final. */
  const pending = view.filter((t) => !t.done);
  const skipped = later.map((e) => e.id);
  const queue = [
    ...pending.filter((t) => !skipped.includes(t.id)),
    ...skipped.map((id) => pending.find((t) => t.id === id)).filter((t): t is HomeTask => Boolean(t)),
  ];
  const next = queue[0] ?? null;
  const nextMeta = next ? nextLines(next.meta) : null;

  const openAyer = ayer.filter((t) => !local.resolved.includes(t.id));
  const rows = digestRows(view, classDays, nowMin);
  const hasTimedTask = rows.some((r) => r.kind === 'task' && r.time !== '');
  const dayHref = `/calendario?v=dia&d=${todayStr}`;

  /* ------------------------------------------------------ respuestas --- */

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

  const setDone = (id: string, title: string, done: boolean) => {
    setAnimate(true);
    if (done) {
      setLast({ kind: 'done', id, title });
      setPopped((ids) => (ids.includes(id) ? ids : [...ids, id]));
    } else if (last?.id === id) {
      setLast(null);
    }
    run(
      () => patch({ type: 'done', id, done }),
      () => safeToggleTask(id, done)
    );
  };

  const onToggle = (row: TaskRow) => setDone(row.id, row.title, !row.done);

  const onLater = () => {
    if (!next || queue.length < 2) return;
    saveLater([...later.filter((x) => x.id !== next.id), { id: next.id, at: null }]);
    setLast({ kind: 'later', id: next.id, title: next.title });
    setAnimate(true);
    setError(null);
  };

  const onUndo = () => {
    if (!last) return;
    setLast(null);
    if (last.kind === 'later') saveLater(later.filter((x) => x.id !== last.id));
    else setDone(last.id, last.title, false);
  };

  const decide = (id: string, decision: Decision) => {
    const day = decision.kind === 'today' ? todayStr : decision.kind === 'day' ? decision.dateStr : null;
    const action = day ? () => safeMoveTask(id, day) : () => safeUnscheduleTask(id);
    if (openAyer.length <= 1) setDecideOpen(false);
    run(() => patch({ type: 'resolve', id }), action);
  };

  /* --------------------------------------------------------- pintar ---- */

  const undoLine = last ? (
    <p className="in-undo" role="status">
      <span>
        {last.kind === 'done' ? 'Hecho' : 'Para después'}: {last.title}
      </span>
      <button type="button" onClick={onUndo}>
        Deshacer
      </button>
    </p>
  ) : null;

  return (
    <>
      <main className="fd-screen in-screen">
        <header className="in-head">
          <div className="in-head__t">
            <p>{dateLabel}</p>
            <h1>Hoy</h1>
          </div>
          <div className="in-head__acts">
            {/* El asistente, siempre a la vista: antes solo salia con el dia
                vacio. Ver el dia vive ahora al pie de Tu dia. */}
            <Link href="/planear" prefetch={true} className="in-plan io-press">
              <Glyph name="sparkles" />
              Planear
            </Link>
            <Link href="/ajustes" prefetch={true} className="io-circ in-circ io-press" aria-label="Ajustes">
              <Glyph name="gear" />
            </Link>
          </div>
        </header>

        <div className="in-grid">
          {/* ------------------------------------------------ Ahora --- */}
          <section className="in-tile in-wide in-now in-a-now" aria-label="Ahora">
            {next && nextMeta ? (
              <div key={next.id} className={animate ? 'in-arrive' : undefined}>
                <div className="in-now__top">
                  <span className="in-now__k">Ahora</span>
                  {nextMeta.cap ? <span className="in-now__cap">{nextMeta.cap}</span> : null}
                </div>
                <Link href={`/tareas/${next.id}`} className="in-now__t">
                  {next.title}
                </Link>
                {nextMeta.ctx ? <span className="in-now__m">{nextMeta.ctx}</span> : null}
                {next.rem ? (
                  <span className="in-now__m">
                    <Glyph name="flag" className="in-flag" />
                    {next.rem}
                  </span>
                ) : null}
                <div className="in-now__acts">
                  <button
                    type="button"
                    className="in-btn in-btn--pri io-press"
                    onClick={() => {
                      setTimerSeconds(null);
                      setTimerPaused(false);
                      setDone(next.id, next.title, true);
                    }}
                  >
                    <Glyph name="check" />
                    Hecho
                  </button>
                  {queue.length > 1 ? (
                    <button
                      type="button"
                      className="in-btn io-press"
                      onClick={() => {
                        setTimerSeconds(null);
                        setTimerPaused(false);
                        onLater();
                      }}
                      title="Mandarla al final de hoy"
                    >
                      Después
                    </button>
                  ) : null}
                  {timerSeconds === null ? (
                    <button
                      type="button"
                      className="in-btn io-press"
                      onClick={() => {
                        setTimerSeconds(300);
                        setTimerPaused(false);
                      }}
                      title="Micro-arranque de 5 minutos"
                      style={{ fontSize: 13, gap: 4 }}
                    >
                      ⏱ 5 min
                    </button>
                  ) : null}
                </div>

                {timerSeconds !== null ? (
                  <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 12, background: 'var(--io-cell-up)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: timerSeconds === 0 ? 'var(--io-tint)' : 'var(--io-label)' }}>
                        {timerSeconds > 0
                          ? `⏱ Micro-arranque: ${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, '0')}${timerPaused ? ' (Pausado)' : ''}`
                          : '🎉 ¡5 minutos cumplidos!'}
                      </span>
                      {timerSeconds > 0 ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setTimerPaused((p) => !p)}
                            style={{ background: 'none', border: 'none', color: 'var(--io-tint)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                          >
                            {timerPaused ? 'Reanudar' : 'Pausar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTimerSeconds(null);
                              setTimerPaused(false);
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--io-label-3)', cursor: 'pointer', fontSize: 13 }}
                          >
                            Parar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setTimerSeconds(1200);
                            setTimerPaused(false);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--io-tint)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                        >
                          +20 min más
                        </button>
                      )}
                    </div>
                    {timerSeconds > 0 ? (
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--io-fill)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${((300 - timerSeconds) / 300) * 100}%`,
                            background: 'var(--io-tint)',
                            transition: 'width 1s linear',
                          }}
                        />
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--io-label-2)' }}>
                        ¿Terminaste la tarea o seguimos con más ritmo? Cero culpa si paras aquí.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : view.length > 0 ? (
              <div key="cerrado" className={animate ? 'in-arrive' : undefined}>
                <span className="in-now__k">Ahora</span>
                <p className="in-now__t">Hoy está cerrado.</p>
                <span className="in-now__m">No queda nada con fecha para hoy.</span>
                <div className="in-now__acts">
                  <Link href="/pendientes" className="in-btn io-press">
                    Ir a Pendientes
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <span className="in-now__k">Ahora</span>
                <p className="in-now__t">Nada con fecha para hoy.</p>
                <span className="in-now__m">Elige algo de Pendientes o deja que el asistente lo reparta.</span>
                <div className="in-now__acts">
                  <Link href="/planear" className="in-btn in-btn--pri io-press">
                    Planear
                  </Link>
                  <Link href="/pendientes" className="in-btn io-press">
                    Pendientes
                  </Link>
                </div>
              </div>
            )}
            {undoLine}
          </section>

          {/* ----------------------------------------------- Tu día --- */}
          <section className="in-tile in-wide in-a-dia" aria-labelledby="in-dia">
            <div className="in-tile__head">
              <h2 id="in-dia">Tu día</h2>
            </div>
            {rows.length === 0 ? (
              <p className="in-muted">Hoy no hay clases ni nada con fecha.</p>
            ) : (
              <ul className="in-rows">
                {rows.map((r) =>
                  r.kind === 'class' ? (
                    <li key={r.key} className="in-row" data-dim={r.dim}>
                      <span className="in-bar in-bar--class" aria-hidden="true" />
                      <span className="in-row__main">
                        <Link href="/clases" className="in-row__t">
                          {r.title}
                        </Link>
                        <span className="in-row__s">{[r.time, r.place].filter(Boolean).join(' · ')}</span>
                      </span>
                      {r.now ? <span className="in-chip">Ahora</span> : null}
                    </li>
                  ) : (
                    <li key={r.key} className="in-row" data-dim={r.done}>
                      <span className="in-bar" aria-hidden="true" />
                      <span className="in-row__main">
                        <Link href={`/tareas/${r.id}`} className="in-row__t">
                          {r.title}
                        </Link>
                        {r.time || r.sub ? (
                          <span className="in-row__s">{[r.time, r.sub].filter(Boolean).join(' · ')}</span>
                        ) : null}
                        {r.rem ? (
                          <span className="in-row__s">
                            <Glyph name="flag" className="in-flag" />
                            {r.rem}
                          </span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="hl-ringbtn"
                        aria-pressed={r.done}
                        aria-label={r.done ? `Desmarcar ${r.title}` : `Marcar hecha ${r.title}`}
                        onClick={() => onToggle(r)}
                      >
                        <span
                          className="hl-ring"
                          data-on={r.done}
                          data-pop={r.done && popped.includes(r.id) ? 'true' : undefined}
                        >
                          <svg viewBox="0 0 14 14" aria-hidden="true">
                            <path d="M3.2 7.3l2.5 2.5 5.1-5.6" />
                          </svg>
                        </span>
                      </button>
                    </li>
                  )
                )}
              </ul>
            )}
            {note ? (
              <p className="in-foot">
                {note.line}
                {hasTimedTask ? '.' : '. Nada más con hora.'}
                {note.next ? ` ${note.next}.` : null}
              </p>
            ) : null}
            {/* El horario de la semana y la vista del dia, a un toque: antes
                solo se llegaba al horario tocando una materia. */}
            <div className="in-dia__acts">
              <Link href="/clases" className="in-btn in-btn--soft io-press">
                <Glyph name="clock" />
                Mi horario
              </Link>
              <Link href={dayHref} className="in-btn in-btn--soft io-press">
                <Glyph name="calendar" />
                Ver el día
              </Link>
            </div>
          </section>

          {/* ------------------------------------------------ Racha --- */}
          <section className="in-tile in-small in-a-racha" aria-label="Racha">
            <Glyph name="flame" className="in-flame" />
            {streakDays > 0 ? (
              <>
                <span className="in-big">{streakDays}</span>
                <span className="in-small__t">{streakDays === 1 ? 'día seguido' : 'días seguidos'}</span>
                <span className="in-small__m">
                  {graceLeft === 1 ? 'Te queda 1 comodín' : `Te quedan ${graceLeft} comodines`}
                </span>
              </>
            ) : (
              <>
                <span className="in-small__t">Tu racha</span>
                <span className="in-small__m">Cierra una tarea hoy y empieza a contar.</span>
              </>
            )}
          </section>

          {/* ------------------------------ Lo de ayer · o el ritual --- */}
          {reviewDue ? (
            <section className="in-tile in-small in-a-ayer" aria-labelledby="in-semana">
              <h2 id="in-semana" className="in-small__t">
                Armar la semana
              </h2>
              <span className="in-small__m">
                {openAyer.length > 0
                  ? `${openAyer.length} de ayer · 10 min de repaso`
                  : 'Son unos 10 minutos.'}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {openAyer.length > 0 ? (
                  <button
                    type="button"
                    className="in-btn in-btn--soft io-press"
                    aria-haspopup="dialog"
                    onClick={() => setDecideOpen(true)}
                  >
                    Lo de ayer ({openAyer.length})
                  </button>
                ) : null}
                <Link href="/domingo" className="in-btn in-btn--pri io-press">
                  Empezar
                </Link>
              </div>
            </section>
          ) : (
            <section className="in-tile in-small in-a-ayer" aria-labelledby="in-ayer">
              <h2 id="in-ayer" className="in-small__t">
                Lo de ayer
              </h2>
              {openAyer.length > 0 ? (
                <>
                  <span className="in-small__m">{listTitles(openAyer.map((t) => t.title))}</span>
                  <button
                    type="button"
                    className="in-btn in-btn--soft io-press"
                    aria-haspopup="dialog"
                    onClick={() => setDecideOpen(true)}
                  >
                    Decidir
                  </button>
                </>
              ) : (
                <span className="in-small__m">Todo decidido.</span>
              )}
            </section>
          )}

          {/* --------------------------------------------- Se viene --- */}
          <section className="in-tile in-wide in-a-viene" aria-labelledby="in-viene">
            <div className="in-tile__head">
              <h2 id="in-viene">Se viene</h2>
            </div>
            {semana.length === 0 ? (
              <>
                <p className="in-muted">No hay parciales ni entregas a la vista. Añádelos y te aviso con tiempo.</p>
                <button
                  type="button"
                  className="in-btn in-btn--soft in-btn--start io-press"
                  onClick={() => setReminderSheetOpen(true)}
                >
                  Nuevo reminder
                </button>
              </>
            ) : (
              <ul className="in-rows in-rows--up">
                {semana.map((r) => {
                  const sub = weekSub(r);
                  const total = r.done + r.prep.length;
                  const [dow = '', ...day] = shortWhen(r.when).split(' ');
                  return (
                    <li key={r.id}>
                      <Link href={`/reminders/${r.id}`} className="in-up">
                        <span className="in-up__date" aria-hidden="true">
                          <span>{dow}</span>
                          <b>{day.join(' ')}</b>
                        </span>
                        <span className="in-up__main">
                          <span className="in-up__t">{r.title}</span>
                          <span className="io-sr">{shortWhen(r.when)}</span>
                          {total > 0 ? (
                            <span className="in-track" aria-hidden="true">
                              <span style={{ width: `${Math.round((r.done / total) * 100)}%` }} />
                            </span>
                          ) : null}
                          <span className="in-row__s">
                            {sub.text}
                            {sub.plan ? (
                              <>
                                {' · '}
                                <span className="in-up__plan">Planificar</span>
                              </>
                            ) : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {error ? (
          <p className="in-err" role="alert">
            {error}
          </p>
        ) : null}
      </main>

      <TabBar onCreate={() => setCreateOpen(true)} />
      <DecideSheet
        open={decideOpen && openAyer.length > 0}
        onClose={() => setDecideOpen(false)}
        tasks={openAyer}
        days={laterDays(todayStr)}
        onDecide={decide}
      />
      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onOpenTask={() => setTaskSheetOpen(true)}
        onOpenReminder={() => setReminderSheetOpen(true)}
      />
      <CreateTaskSheet
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        todayStr={todayStr}
      />
      <CreateReminderSheet
        open={reminderSheetOpen}
        onClose={() => setReminderSheetOpen(false)}
        todayStr={todayStr}
      />
    </>
  );
}
