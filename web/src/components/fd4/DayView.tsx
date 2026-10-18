'use client';

/* ============================================================================
   Organizer · FD4 · Calendario · Día
   El riel de horas: responde a "¿qué hago ahora?" y es donde se planifica.

   · La casilla de una tarea la marca; su texto la abre para editarla.
   · Tocar una hora vacía crea una tarea a esa hora.
   · La banda y los bloques de reminder abren el reminder.
   · Las clases son una franja gris "En clase", sin nombre ni toque (#53).
   ========================================================================= */

import { useState, useOptimistic, useTransition } from 'react';
import type { Fd4DayData, DayBlockView, DayNoHourTask } from '@/lib/fd4-calendar';
import { DAY_HOURS, HOUR_PX } from '@/lib/fd4-calendar';
import { Check, Flag } from './Marks';
import { Icon } from '@/components/Icon';
import { toggleBlockTask, toggleTask } from '@/lib/fd4-actions';
import { CreateTaskSheet } from '@/components/planner/CreateTaskSheet';
import { CreateReminderSheet } from '@/components/planner/CreateReminderSheet';
import { TaskDetailSheet } from '@/components/planner/TaskDetailSheet';
import { ReminderDetailSheet } from '@/components/planner/ReminderDetailSheet';

/* El servidor coloca todo a HOUR_PX por hora, pero la hora mide lo que diga
   --hour-row: 56px en el telefono y menos en escritorio. Se pasa a horas y
   el CSS pone la medida, así bloques y rejilla no se separan nunca. */
const rail = (px: number) => `calc(${(px / HOUR_PX).toFixed(4)} * var(--hour-row))`;

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

  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [taskSheetTime, setTaskSheetTime] = useState('');

  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    title: string;
    done: boolean;
    time?: string;
  } | null>(null);

  const [selectedReminder, setSelectedReminder] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const newTaskAt = (hour: string) => {
    const [h] = hour.split(':');
    setTaskSheetTime(`${h.padStart(2, '0')}:00`);
    setTaskSheetOpen(true);
  };

  return (
    <>
      <div className="fd-dayhead">
        <div className="pl-addbar">
          <button
            type="button"
            className="fd-btn io-press"
            onClick={() => {
              setTaskSheetTime('');
              setTaskSheetOpen(true);
            }}
          >
            <Icon name="plus" size="sm" />
            Tarea
          </button>
          <button
            type="button"
            className="fd-btn io-press"
            onClick={() => setReminderSheetOpen(true)}
          >
            <Flag size="xs" />
            Reminder
          </button>
        </div>

        {data.bands && data.bands.length > 0 ? (
          data.bands.map((b) => (
            <button
              key={b.id}
              type="button"
              className="fd-band io-press"
              onClick={() => setSelectedReminder({ id: b.id, title: b.title })}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 0,
                cursor: 'pointer',
                background: 'var(--surface)',
                marginBottom: '6px',
              }}
            >
              <Flag />
              <span className="fd-band__text">
                <span className="fd-band__title">{b.title}</span>
                <span className="fd-meta">{b.meta}</span>
              </span>
            </button>
          ))
        ) : data.band ? (
          <button
            type="button"
            className="fd-band io-press"
            onClick={() => setSelectedReminder({ id: data.band!.id, title: data.band!.title })}
            style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', background: 'var(--surface)' }}
          >
            <Flag />
            <span className="fd-band__text">
              <span className="fd-band__title">{data.band.title}</span>
              <span className="fd-meta">{data.band.meta}</span>
            </span>
          </button>
        ) : null}

        {data.noHour.length > 0 ? (
          <div className="fd-nohour">
            <span className="fd-nohour__label">Sin hora</span>
            {data.noHour.map((t) => {
              const isDone = Boolean(doneNoHourIds[t.id]);
              return (
                <span
                  className="fd-chip"
                  key={t.id}
                  style={{
                    padding: 0,
                    border: '1px solid var(--line)',
                    background: isDone ? 'var(--surface-sunken)' : 'var(--surface)',
                    opacity: isDone ? 0.65 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleNoHour(t)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `Desmarcar ${t.title}` : `Marcar ${t.title}`}
                    style={{
                      background: 'none',
                      border: 0,
                      padding: '8px 4px 8px 12px',
                      display: 'inline-flex',
                      cursor: 'pointer',
                    }}
                  >
                    <Check on={isDone} variant="chip" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTask({
                        id: t.id,
                        title: t.title,
                        done: isDone,
                      })
                    }
                    style={{
                      padding: '8px 14px 8px 4px',
                      color: 'inherit',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      background: 'none',
                      border: 0,
                      font: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {t.title}
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="fd-scroll">
        <div className="fd-grid">
          <div className="fd-grid__hours">
            {DAY_HOURS.map((h) => (
              <div className="fd-grid__hour" key={h}>
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="fd-grid__col">
            {/* Cada hora es un botón: tocar un hueco crea una tarea ahí. */}
            {DAY_HOURS.map((h) => (
              <button
                type="button"
                className="fd-grid__line pl-slot"
                key={h}
                onClick={() => newTaskAt(h)}
                aria-label={`Nueva tarea a las ${h}`}
              />
            ))}

            <div className="fd-grid__blocks pl-blocks">
              {data.classBands.map((c) => (
                <div
                  key={c.id}
                  className="fd-classband"
                  style={{ top: rail(c.top), height: rail(c.height) }}
                  aria-hidden
                >
                  {c.height >= 24 ? <span>En clase</span> : null}
                </div>
              ))}

              {data.blocks.map((b) => {
                const isTask = b.kind === 'task';
                const isDone = isTask && Boolean(doneBlockIds[b.id]);

                const text = (
                  <>
                    <span
                      className="fd-block__title"
                      style={{ textDecoration: isDone ? 'line-through' : 'none' }}
                    >
                      {b.title}
                    </span>
                    {b.showMeta && b.meta ? <span className="fd-block__meta">{b.meta}</span> : null}
                  </>
                );

                return (
                  <div
                    key={b.id}
                    className={`fd-block fd-block--${b.kind}`}
                    style={{ top: rail(b.top), height: rail(b.height), opacity: isDone ? 0.6 : 1 }}
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
                          alignSelf: 'stretch',
                          minWidth: 44,
                          padding: '0 8px 0 12px',
                          margin: '-8px -4px -8px -12px',
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

                    {isTask && b.itemId ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTask({
                            id: b.itemId!,
                            title: b.title,
                            done: isDone,
                            time: b.meta ? b.meta.split(' – ')[0] : undefined,
                          })
                        }
                        className="fd-block__text"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          background: 'none',
                          border: 0,
                          textAlign: 'left',
                          font: 'inherit',
                          cursor: 'pointer',
                          padding: 0,
                          width: '100%',
                        }}
                      >
                        {text}
                      </button>
                    ) : b.kind === 'reminder' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReminder({ id: b.id, title: b.title })}
                        className="fd-block__text"
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          background: 'none',
                          border: 0,
                          textAlign: 'left',
                          font: 'inherit',
                          cursor: 'pointer',
                          padding: 0,
                          width: '100%',
                        }}
                      >
                        {text}
                      </button>
                    ) : (
                      <span className="fd-block__text">{text}</span>
                    )}
                  </div>
                );
              })}

              {data.nowTop !== null ? (
                <div className="fd-now" style={{ top: rail(data.nowTop) }}>
                  <span className="fd-now__label">{data.nowLabel}</span>
                  <span className="fd-now__line" />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <CreateTaskSheet
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        todayStr={data.dateStr}
        initialDate={data.dateStr}
        initialTime={taskSheetTime}
      />

      <CreateReminderSheet
        open={reminderSheetOpen}
        onClose={() => setReminderSheetOpen(false)}
        todayStr={data.dateStr}
        initialDate={data.dateStr}
      />

      <TaskDetailSheet
        key={selectedTask?.id ?? 'task-sheet-none'}
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        taskId={selectedTask?.id ?? null}
        initialTitle={selectedTask?.title}
        initialDone={selectedTask?.done}
        initialTime={selectedTask?.time}
        initialDueOn={data.dateStr}
        todayStr={data.dateStr}
      />

      <ReminderDetailSheet
        key={selectedReminder?.id ?? 'reminder-sheet-none'}
        open={Boolean(selectedReminder)}
        onClose={() => setSelectedReminder(null)}
        reminderId={selectedReminder?.id ?? null}
        initialTitle={selectedReminder?.title}
        initialDate={data.dateStr}
        todayStr={data.dateStr}
      />
    </>
  );
}
