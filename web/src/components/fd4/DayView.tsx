'use client';

/* ============================================================================
   Organizer · FD4 · Calendario · Día
   El riel de horas interactivo: responde a "¿qué hago ahora?".
   Permite marcar tareas cumplidas tanto en chips "Sin hora" como en el riel.
   ========================================================================= */

import { useOptimistic, useTransition } from 'react';
import type { Fd4DayData, DayBlockView, DayNoHourTask } from '@/lib/fd4-calendar';
import { DAY_HOURS } from '@/lib/fd4-calendar';
import { Check, Flag } from './Marks';
import { toggleBlockTask, toggleTask } from '@/lib/fd4-actions';

export function DayView({ data }: { data: Fd4DayData }) {
  const [, startTransition] = useTransition();

  const [doneBlockIds, toggleDoneBlock] = useOptimistic<
    Record<string, boolean>,
    { id: string; done: boolean }
  >(
    Object.fromEntries(data.blocks.map((b) => [b.id, Boolean(b.done)])),
    (prev, { id, done }) => ({ ...prev, [id]: done })
  );

  const [doneNoHourIds, toggleDoneNoHour] = useOptimistic<
    Record<string, boolean>,
    { id: string; done: boolean }
  >(
    Object.fromEntries(data.noHour.map((t) => [t.id, Boolean(t.done)])),
    (prev, { id, done }) => ({ ...prev, [id]: done })
  );

  const handleToggleNoHour = (t: DayNoHourTask) => {
    const next = !doneNoHourIds[t.id];
    startTransition(async () => {
      toggleDoneNoHour({ id: t.id, done: next });
      await toggleTask(t.id, next);
    });
  };

  const handleToggleBlock = (b: DayBlockView) => {
    if (b.kind !== 'task') return;
    const next = !doneBlockIds[b.id];
    startTransition(async () => {
      toggleDoneBlock({ id: b.id, done: next });
      await toggleBlockTask(b.id, b.itemId ?? null, next);
    });
  };

  return (
    <>
      {data.band || data.noHour.length > 0 ? (
        <div className="fd-dayhead">
          {data.band ? (
            <div className="fd-band">
              <Flag />
              <span className="fd-band__text">
                <span className="fd-band__title">{data.band.title}</span>
                <span className="fd-meta">{data.band.meta}</span>
              </span>
            </div>
          ) : null}

          {data.noHour.length > 0 ? (
            <div className="fd-nohour">
              <span className="fd-nohour__label">Sin hora</span>
              {data.noHour.map((t) => {
                const isDone = Boolean(doneNoHourIds[t.id]);
                return (
                  <button
                    type="button"
                    className="fd-chip"
                    key={t.id}
                    onClick={() => handleToggleNoHour(t)}
                    aria-pressed={isDone}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid var(--line)',
                      background: isDone ? 'var(--surface-sunken)' : 'var(--surface)',
                      opacity: isDone ? 0.65 : 1,
                    }}
                  >
                    <Check on={isDone} variant="chip" />
                    <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                      {t.title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="fd-scroll">
        <div className="fd-grid">
          {/* Columna de horas */}
          <div className="fd-grid__hours">
            {DAY_HOURS.map((h) => (
              <div className="fd-grid__hour" key={h}>
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="fd-grid__col">
            {DAY_HOURS.map((h) => (
              <div className="fd-grid__line" key={h} />
            ))}

            <div className="fd-grid__blocks">
              {data.blocks.map((b) => {
                const isTask = b.kind === 'task';
                const isDone = isTask && Boolean(doneBlockIds[b.id]);

                return (
                  <div
                    key={b.id}
                    className={`fd-block fd-block--${b.kind}${b.overlap ? ' fd-block--overlap' : ''}`}
                    style={{
                      top: b.top,
                      height: b.height,
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    {b.kind === 'reminder' ? <Flag size="sm" /> : null}

                    {isTask ? (
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(b)}
                        aria-label={isDone ? 'Marcar tarea pendiente' : 'Marcar tarea hecha'}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '6px',
                          margin: '-6px 2px -6px -4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <Check on={isDone} variant="mini" />
                      </button>
                    ) : null}

                    <span
                      className="fd-block__text"
                      onClick={isTask ? () => handleToggleBlock(b) : undefined}
                      style={{ cursor: isTask ? 'pointer' : 'default' }}
                    >
                      <span
                        className="fd-block__title"
                        style={{ textDecoration: isDone ? 'line-through' : 'none' }}
                      >
                        {b.title}
                      </span>
                      {b.showMeta && b.meta ? (
                        <span className="fd-block__meta">{b.meta}</span>
                      ) : null}
                    </span>
                  </div>
                );
              })}

              {data.nowTop !== null ? (
                <div className="fd-now" style={{ top: data.nowTop }}>
                  <span className="fd-now__label">{data.nowLabel}</span>
                  <span className="fd-now__line" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

