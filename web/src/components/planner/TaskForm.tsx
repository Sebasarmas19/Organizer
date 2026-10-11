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
import { Glyph } from '@/components/ios/Glyph';
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

  const leave = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.navDirection = 'back';
    }
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
    <form className="io-form" onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', width: '100%', paddingBottom: 'calc(env(safe-area-inset-bottom) + 36px)' }}>
      {error ? <p className="io-form__err" role="alert">{error}</p> : null}

      {/* Botón de decisión rápida superior si estamos editando */}
      {mode === 'edit' && taskId ? (
        <div style={{ margin: '0 14px 14px' }}>
          <button
            type="button"
            className="io-btn io-press"
            disabled={pending}
            onClick={() => run(() => toggleTask(taskId, !done))}
            style={{
              width: '100%',
              minHeight: 48,
              borderRadius: 14,
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: done ? 'var(--io-tint-soft)' : 'var(--io-cell)',
              color: done ? 'var(--io-tint)' : 'var(--io-label)',
              border: done ? '1px solid var(--io-tint)' : '1px solid var(--io-sep)',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? 'var(--io-tint)' : 'transparent',
                border: done ? 'none' : '2px solid var(--io-ctl)',
                color: '#fff',
                fontSize: 12,
              }}
            >
              {done ? <Glyph name="check" style={{ width: 14, height: 14 }} /> : null}
            </span>
            {done ? 'Completada · Tocar para reabrir' : 'Marcar como hecha'}
          </button>
        </div>
      ) : null}

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
            style={{
              textDecoration: done ? 'line-through' : 'none',
              opacity: done ? 0.7 : 1,
            }}
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
      <div
        role="group"
        aria-label="Selección de fecha"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8,
          margin: '0 14px 12px',
        }}
      >
        <button
          type="button"
          className="io-chip io-press"
          onClick={() => setV({ ...v, dueOn: todayStr || '', time: v.time })}
          style={{
            padding: '10px 4px',
            height: 'auto',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: todayStr && v.dueOn === todayStr ? 'var(--io-tint-fill)' : 'var(--io-cell)',
            color: todayStr && v.dueOn === todayStr ? 'var(--io-on-tint)' : 'var(--io-label)',
            border: '1px solid var(--io-sep)',
            textAlign: 'center',
          }}
        >
          Hoy
        </button>
        <button
          type="button"
          className="io-chip io-press"
          onClick={() => {
            const tom = todayStr ? addDays(todayStr, 1) : '';
            setV({ ...v, dueOn: tom, time: v.time });
          }}
          style={{
            padding: '10px 4px',
            height: 'auto',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: todayStr && v.dueOn === addDays(todayStr, 1) ? 'var(--io-tint-fill)' : 'var(--io-cell)',
            color: todayStr && v.dueOn === addDays(todayStr, 1) ? 'var(--io-on-tint)' : 'var(--io-label)',
            border: '1px solid var(--io-sep)',
            textAlign: 'center',
          }}
        >
          Mañana
        </button>
        <button
          type="button"
          className="io-chip io-press"
          onClick={() => setV({ ...v, dueOn: '', time: '' })}
          style={{
            padding: '10px 4px',
            height: 'auto',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: !v.dueOn ? 'var(--io-tint-fill)' : 'var(--io-cell)',
            color: !v.dueOn ? 'var(--io-on-tint)' : 'var(--io-label)',
            border: '1px solid var(--io-sep)',
            textAlign: 'center',
          }}
        >
          Sin fecha
        </button>
        <label
          className="io-chip io-press"
          style={{
            position: 'relative',
            padding: '10px 4px',
            height: 'auto',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background:
              v.dueOn && v.dueOn !== todayStr && v.dueOn !== (todayStr ? addDays(todayStr, 1) : '')
                ? 'var(--io-tint-fill)'
                : 'var(--io-cell)',
            color:
              v.dueOn && v.dueOn !== todayStr && v.dueOn !== (todayStr ? addDays(todayStr, 1) : '')
                ? 'var(--io-on-tint)'
                : 'var(--io-label)',
            border: '1px solid var(--io-sep)',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Otra…
          <input
            type="date"
            value={v.dueOn}
            onChange={(e) => setV({ ...v, dueOn: e.target.value, time: e.target.value ? v.time : '' })}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              cursor: 'pointer',
            }}
          />
        </label>
      </div>

      <div className="io-group">
        <div className="io-field io-field--row">
          <label className="io-field__label" htmlFor="task-date">Fecha asignada</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 48 }}>
            <span style={{ color: v.dueOn ? 'var(--io-label)' : 'var(--io-label-3)', fontSize: 16 }}>
              {v.dueOn ? v.dueOn : 'Sin fecha'}
            </span>
          </div>
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
        className="in-btn in-btn--pri io-form__save io-press"
        disabled={pending || !v.title.trim()}
      >
        {pending ? 'Guardando…' : mode === 'create' ? 'Crear tarea' : 'Guardar'}
      </button>

      {mode === 'edit' && taskId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 14px 0' }}>
          {status !== 'dropped' ? (
            <button
              type="button"
              className="io-btn io-press"
              disabled={pending}
              onClick={() => run(() => dropTask(taskId))}
              style={{ background: 'var(--io-cell)', border: '1px solid var(--io-sep)', color: 'var(--io-label-2)' }}
            >
              Soltar tarea
            </button>
          ) : null}
          {confirmDelete ? (
            <button
              type="button"
              className="io-btn io-press"
              disabled={pending}
              style={{ background: '#FF3B30', color: '#fff', fontWeight: 600 }}
              onClick={() => run(() => deleteTask(taskId))}
            >
              Sí, borrar definitivamente
            </button>
          ) : (
            <button
              type="button"
              className="io-btn io-press"
              style={{ background: 'transparent', color: '#FF3B30', fontSize: 15 }}
              onClick={() => setConfirmDelete(true)}
            >
              Borrar tarea
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
