'use client';

/* ============================================================================
   Organizer · Formulario de tarea

   Capturar sigue siendo un solo campo (/anadir). ESTO es el paso siguiente:
   cuando ya sabes cuándo y para qué. Ningún campo es obligatorio salvo el
   título. La fecha se pone con un toque (Hoy, Mañana…) y la hora solo
   aparece cuando hay fecha, porque una hora sin día no significa nada.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTask, deleteTask, dropTask, updateTask } from '@/lib/planner-actions';
import { toggleTask } from '@/lib/fd4-actions';
import type { ReminderOption } from '@/lib/planner-data';
import { addDays } from '@/lib/date-utils';

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 h 30' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
];

const REMIND_BEFORE = [
  { value: '', label: 'Sin aviso' },
  { value: '5', label: '5 min antes' },
  { value: '15', label: '15 min antes' },
  { value: '30', label: '30 min antes' },
  { value: '60', label: '1 hora antes' },
];

export type TaskFormValues = {
  title: string;
  dueOn: string;
  time: string;
  durationMin: number;
  remindBeforeMin: string;
  reminderId: string;
  notes: string;
};

export function TaskForm({
  mode,
  taskId,
  status,
  initial,
  todayStr,
  reminders,
  fallback,
}: {
  mode: 'create' | 'edit';
  taskId?: string;
  status?: string;
  initial: TaskFormValues;
  todayStr: string;
  reminders: ReminderOption[];
  /** A dónde ir si no hay historial al terminar. */
  fallback: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = status === 'done';

  const tomorrow = addDays(todayStr, 1);
  const quick = [
    { label: 'Hoy', value: todayStr },
    { label: 'Mañana', value: tomorrow },
    { label: 'Sin fecha', value: '' },
  ];

  const leave = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
    router.refresh();
  };

  const run = (fn: () => Promise<void>) => {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        leave();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      }
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      title: v.title,
      dueOn: v.dueOn || null,
      time: v.dueOn && v.time ? v.time : null,
      durationMin: v.durationMin,
      remindBeforeMin: v.remindBeforeMin ? Number(v.remindBeforeMin) : null,
      reminderId: v.reminderId || null,
      notes: v.notes,
    };
    run(async () => {
      if (mode === 'create') await createTask(input);
      else if (taskId) await updateTask(taskId, input);
    });
  };

  return (
    <form className="pl-form" onSubmit={submit}>
      {error ? <p className="pl-error" role="alert">{error}</p> : null}

      <div className="pl-field">
        <label className="pl-label" htmlFor="task-title">Tarea</label>
        <input
          id="task-title"
          className="pl-input pl-input--title"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          placeholder="Qué vas a hacer"
          autoFocus={mode === 'create'}
          autoCapitalize="sentences"
          required
        />
      </div>

      <div className="pl-field">
        <span className="pl-label">Cuándo</span>
        <div className="pl-chips" role="group" aria-label="Fecha rápida">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              className="pl-chip"
              aria-pressed={v.dueOn === q.value}
              onClick={() => setV({ ...v, dueOn: q.value, time: q.value ? v.time : '' })}
            >
              {q.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          className="pl-input"
          aria-label="Otra fecha"
          value={v.dueOn}
          onChange={(e) => setV({ ...v, dueOn: e.target.value })}
        />
      </div>

      {v.dueOn ? (
        <>
          <div className="pl-row">
            <div className="pl-field">
              <label className="pl-label" htmlFor="task-time">Hora (opcional)</label>
              <input
                id="task-time"
                type="time"
                className="pl-input"
                value={v.time}
                onChange={(e) => setV({ ...v, time: e.target.value })}
              />
            </div>
            <div className="pl-field">
              <label className="pl-label" htmlFor="task-dur">Duración</label>
              <select
                id="task-dur"
                className="pl-select"
                value={v.durationMin}
                disabled={!v.time}
                onChange={(e) => setV({ ...v, durationMin: Number(e.target.value) })}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {v.time ? (
            <div className="pl-field">
              <label className="pl-label" htmlFor="task-remind">Aviso al teléfono</label>
              <select
                id="task-remind"
                className="pl-select"
                value={v.remindBeforeMin}
                onChange={(e) => setV({ ...v, remindBeforeMin: e.target.value })}
              >
                {REMIND_BEFORE.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className="pl-hint">Con hora, la tarea ocupa su hueco en el calendario y puede avisarte antes.</span>
          )}
        </>
      ) : null}

      <div className="pl-field">
        <label className="pl-label" htmlFor="task-rem">Es para</label>
        <select
          id="task-rem"
          className="pl-select"
          value={v.reminderId}
          onChange={(e) => setV({ ...v, reminderId: e.target.value })}
        >
          <option value="">Nada en concreto</option>
          {reminders.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {r.when}
            </option>
          ))}
        </select>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor="task-notes">Notas (opcional)</label>
        <textarea
          id="task-notes"
          className="pl-textarea"
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
          placeholder="Enlaces, pasos, lo que necesites recordar"
        />
      </div>

      <div className="pl-actions">
        <button type="submit" className="fd-btn fd-btn--primary fd-btn--full" disabled={pending || !v.title.trim()}>
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear tarea' : 'Guardar'}
        </button>
      </div>

      {mode === 'edit' && taskId ? (
        <div className="pl-dangerzone">
          <button
            type="button"
            className="fd-btn"
            disabled={pending}
            onClick={() => run(() => toggleTask(taskId, !done))}
          >
            {done ? 'Marcar pendiente' : 'Marcar hecha'}
          </button>
          {status !== 'dropped' ? (
            <button type="button" className="fd-btn" disabled={pending} onClick={() => run(() => dropTask(taskId))}>
              Soltar
            </button>
          ) : null}
          {confirmDelete ? (
            <button
              type="button"
              className="fd-btn"
              disabled={pending}
              style={{ borderColor: 'var(--text)', fontWeight: 600 }}
              onClick={() => run(() => deleteTask(taskId))}
            >
              Sí, borrar
            </button>
          ) : (
            <button type="button" className="fd-btn fd-btn--quiet" onClick={() => setConfirmDelete(true)}>
              Borrar
            </button>
          )}
        </div>
      ) : null}
      {mode === 'edit' ? (
        <span className="pl-hint">
          Soltar = no la harás, pero queda en el historial. Borrar = desaparece.
        </span>
      ) : null}
    </form>
  );
}
