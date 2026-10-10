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
    <form className="io-form" onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
      {error ? <p className="io-form__err" role="alert">{error}</p> : null}

      {/* GRUPO 1: Identidad */}
      <div className="io-group">
        <label className="io-field">
          <span className="io-sr">Tarea</span>
          <input
            id="task-title"
            value={v.title}
            onChange={(e) => setV({ ...v, title: e.target.value })}
            placeholder="¿Qué vas a hacer?"
            autoFocus={mode === 'create'}
            autoCapitalize="sentences"
            required
          />
        </label>
        <label className="io-field">
          <span className="io-sr">Notas</span>
          <textarea
            id="task-notes"
            rows={2}
            value={v.notes}
            onChange={(e) => setV({ ...v, notes: e.target.value })}
            placeholder="Notas (opcional): pasos, enlaces…"
          />
        </label>
      </div>

      {/* GRUPO 2: Cuándo */}
      <span className="io-form__label">Cuándo</span>
      <div className="io-kinds" role="radiogroup" aria-label="Fecha rápida">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            role="radio"
            className="io-chip io-press"
            aria-checked={v.dueOn === q.value}
            onClick={() => setV({ ...v, dueOn: q.value, time: q.value ? v.time : '' })}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="io-group">
        <div className="io-field io-field--row">
          <label className="io-field__label" htmlFor="task-date">Fecha</label>
          <input
            id="task-date"
            type="date"
            value={v.dueOn}
            onChange={(e) => setV({ ...v, dueOn: e.target.value, time: e.target.value ? v.time : '' })}
          />
        </div>

        {v.dueOn ? (
          <>
            <div className="io-field io-field--row">
              <label className="io-field__label" htmlFor="task-time">Hora (opcional)</label>
              <input
                id="task-time"
                type="time"
                value={v.time}
                onChange={(e) => setV({ ...v, time: e.target.value })}
              />
            </div>
            {v.time ? (
              <>
                <div className="io-field io-field--row">
                  <label className="io-field__label" htmlFor="task-dur">Duración</label>
                  <select
                    id="task-dur"
                    value={v.durationMin}
                    onChange={(e) => setV({ ...v, durationMin: Number(e.target.value) })}
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="io-field io-field--row">
                  <label className="io-field__label" htmlFor="task-remind">Aviso al teléfono</label>
                  <select
                    id="task-remind"
                    value={v.remindBeforeMin}
                    onChange={(e) => setV({ ...v, remindBeforeMin: e.target.value })}
                  >
                    {REMIND_BEFORE.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>

      {v.dueOn && !v.time ? (
        <p className="io-field__hint">Con hora, la tarea ocupa su hueco en el calendario y puede avisarte antes.</p>
      ) : null}

      {/* GRUPO 3: Asociar a Reminder */}
      {reminders.length > 0 ? (
        <>
          <span className="io-form__label">Asociar</span>
          <div className="io-group">
            <div className="io-field io-field--row">
              <label className="io-field__label" htmlFor="task-rem">Es para</label>
              <select
                id="task-rem"
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
          </div>
        </>
      ) : null}

      <button
        type="submit"
        className="io-btn io-form__save io-press"
        disabled={pending || !v.title.trim()}
      >
        {pending ? 'Guardando…' : mode === 'create' ? 'Crear tarea' : 'Guardar'}
      </button>

      {mode === 'edit' && taskId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 14px 0' }}>
          <button
            type="button"
            className="io-btn io-press"
            disabled={pending}
            onClick={() => run(() => toggleTask(taskId, !done))}
          >
            {done ? 'Marcar pendiente' : 'Marcar hecha'}
          </button>
          {status !== 'dropped' ? (
            <button type="button" className="io-btn io-press" disabled={pending} onClick={() => run(() => dropTask(taskId))}>
              Soltar
            </button>
          ) : null}
          {confirmDelete ? (
            <button
              type="button"
              className="io-btn io-press"
              disabled={pending}
              style={{ background: 'var(--io-fill-2)', color: 'var(--io-label)', fontWeight: 600 }}
              onClick={() => run(() => deleteTask(taskId))}
            >
              Sí, borrar
            </button>
          ) : (
            <button type="button" className="io-btn io-press" style={{ background: 'transparent', color: 'var(--io-label-2)' }} onClick={() => setConfirmDelete(true)}>
              Borrar
            </button>
          )}
          <span className="io-field__hint" style={{ margin: '4px 8px 0', textAlign: 'center' }}>
            Soltar = no la harás, pero queda en el historial. Borrar = desaparece.
          </span>
        </div>
      ) : null}
    </form>
  );
}
