'use client';

/* ============================================================================
   Organizer · <TaskDetailSheet>
   
   Hoja modal de iOS (Sheet) para ver, editar y decidir sobre una tarea:
   - Permite marcarla hecha / pendiente de un toque
   - Reprogramación rápida: "Hoy", "Mañana", "Sin fecha", "Otra fecha"
   - Edición de hora, notas y recordatorio asociado
   - Opciones para soltar o borrar
   - Mantiene al usuario en su vista actual (Calendario, Hoy) sin redirecciones
   ========================================================================= */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ios/Sheet';
import { Glyph } from '@/components/ios/Glyph';
import {
  getTaskForSheet,
  updateTask,
  deleteTask,
  dropTask,
  type TaskInput,
} from '@/lib/planner-actions';
import { toggleTask } from '@/lib/fd4-actions';
import type { ReminderOption, TaskDetail } from '@/lib/planner-data';

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

export function TaskDetailSheet({
  open,
  onClose,
  taskId,
  initialTitle = '',
  initialDone = false,
  initialDueOn = '',
  initialTime = '',
  todayStr: _todayStr,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  taskId: string | null;
  initialTitle?: string;
  initialDone?: boolean;
  initialDueOn?: string;
  initialTime?: string;
  todayStr: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [done, setDone] = useState(initialDone);
  const [notes, setNotes] = useState('');
  const [dueOn, setDueOn] = useState(initialDueOn);
  const [time, setTime] = useState(initialTime);
  const [durationMin, setDurationMin] = useState(60);
  const [remindBeforeMin, setRemindBeforeMin] = useState('');
  const [reminderId, setReminderId] = useState('');
  const [status, setStatus] = useState<string>('planned');
  const [reminders, setReminders] = useState<ReminderOption[]>([]);

  const [isLoading, setIsLoading] = useState(Boolean(open && taskId));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Al abrir la hoja con un taskId, cargar datos completos
  useEffect(() => {
    if (!open || !taskId) return;

    let active = true;

    getTaskForSheet(taskId)
      .then((data: TaskDetail | null) => {
        if (!active || !data) return;
        setTitle(data.title);
        setNotes(data.notes ?? '');
        setDone(data.status === 'done');
        setStatus(data.status);
        setDueOn(data.dueOn ?? '');
        setTime(data.time ?? '');
        setDurationMin(data.durationMin ?? 60);
        setRemindBeforeMin(data.remindBeforeMin ? String(data.remindBeforeMin) : '');
        setReminderId(data.reminderId ?? '');
        setReminders(data.reminders ?? []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar tarea.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, taskId]);

  const handleToggleDone = () => {
    if (!taskId) return;
    const nextDone = !done;
    setDone(nextDone);
    startTransition(async () => {
      try {
        await toggleTask(taskId, nextDone);
        router.refresh();
        if (onUpdated) onUpdated();
      } catch (err) {
        setDone(!nextDone);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar estado.');
      }
    });
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskId || !title.trim() || isPending) return;

    setError('');
    startTransition(async () => {
      try {
        const input: TaskInput = {
          title: title.trim(),
          dueOn: dueOn || null,
          time: dueOn && time ? time : null,
          durationMin,
          remindBeforeMin: remindBeforeMin ? Number(remindBeforeMin) : null,
          reminderId: reminderId || null,
          notes: notes.trim() || null,
        };
        await updateTask(taskId, input);
        router.refresh();
        if (onUpdated) onUpdated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      }
    });
  };

  const handleDrop = () => {
    if (!taskId || isPending) return;
    startTransition(async () => {
      try {
        await dropTask(taskId);
        router.refresh();
        if (onUpdated) onUpdated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo soltar la tarea.');
      }
    });
  };

  const handleDelete = () => {
    if (!taskId || isPending) return;
    startTransition(async () => {
      try {
        await deleteTask(taskId);
        router.refresh();
        if (onDeleted) onDeleted();
        else if (onUpdated) onUpdated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo borrar la tarea.');
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tarea"
      subtitle={status === 'dropped' ? 'Tarea soltada' : done ? 'Tarea completada' : undefined}
    >
      <form onSubmit={handleSave} className="io-form" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        {error ? (
          <p className="io-form__err" role="alert">
            {error}
          </p>
        ) : null}

        {/* 1. Botón de decisión rápida: Estado de la tarea */}
        <div style={{ margin: '0 16px 14px' }}>
          <button
            type="button"
            className="io-btn io-press"
            onClick={handleToggleDone}
            disabled={isPending}
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
              boxShadow: 'var(--io-shadow-card, 0 1px 3px rgba(0,0,0,0.06))',
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

        {/* 2. Título y notas */}
        <div className="io-group">
          <label className="io-field">
            <span className="io-sr">Título de la tarea</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué vas a hacer?"
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
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional): pasos, enlaces…"
            />
          </label>
        </div>

        {/* 3. Cuándo y Fecha */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 20px 8px' }}>
          <span className="io-form__label" style={{ margin: 0 }}>Cuándo</span>
          <button
            type="button"
            className="io-chip io-press"
            onClick={() => {
              setDueOn('');
              setTime('');
            }}
            style={{
              height: 28,
              padding: '0 12px',
              fontSize: 13,
              fontWeight: 600,
              background: !dueOn ? 'var(--io-tint-fill)' : 'var(--io-cell-up)',
              color: !dueOn ? 'var(--io-on-tint)' : 'var(--io-label-2)',
            }}
          >
            Sin fecha
          </button>
        </div>

        <div className="io-group">
          <div className="io-field io-field--row">
            <label htmlFor="task-detail-date" className="io-field__label">
              Fecha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 48 }}>
              {!dueOn ? (
                <span style={{ color: 'var(--io-label-3)', fontSize: 17, pointerEvents: 'none' }}>
                  Elegir fecha…
                </span>
              ) : null}
              <input
                id="task-detail-date"
                type="date"
                value={dueOn}
                onChange={(e) => {
                  setDueOn(e.target.value);
                  if (!e.target.value) setTime('');
                }}
                style={!dueOn ? { position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' } : undefined}
              />
              {dueOn ? (
                <button
                  type="button"
                  aria-label="Quitar fecha"
                  onClick={() => {
                    setDueOn('');
                    setTime('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 0,
                    padding: 4,
                    color: 'var(--io-label-3)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Glyph name="xmark" style={{ width: 14, height: 14 }} />
                </button>
              ) : null}
            </div>
          </div>

          {dueOn ? (
            <div className="io-field io-field--row">
              <label className="io-field__label" htmlFor="task-time-input">
                Hora (opcional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="task-time-input"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                {time ? (
                  <button
                    type="button"
                    onClick={() => setTime('')}
                    aria-label="Quitar hora"
                    style={{
                      background: 'none',
                      border: 0,
                      padding: 4,
                      color: 'var(--io-label-3)',
                      cursor: 'pointer',
                    }}
                  >
                    <Glyph name="xmark" style={{ width: 14, height: 14 }} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {dueOn && time ? (
            <>
              <div className="io-field io-field--row">
                <label className="io-field__label" htmlFor="task-dur-input">
                  Duración
                </label>
                <select
                  id="task-dur-input"
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="io-field io-field--row">
                <label className="io-field__label" htmlFor="task-remind-input">
                  Aviso al teléfono
                </label>
                <select
                  id="task-remind-input"
                  value={remindBeforeMin}
                  onChange={(e) => setRemindBeforeMin(e.target.value)}
                >
                  {REMIND_BEFORE.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
        </div>

        {/* 5. Asociar a Reminder */}
        {reminders.length > 0 ? (
          <>
            <span className="io-form__label">Asociar</span>
            <div className="io-group">
              <div className="io-field io-field--row">
                <label className="io-field__label" htmlFor="task-reminder-select">
                  Es para
                </label>
                <select
                  id="task-reminder-select"
                  value={reminderId}
                  onChange={(e) => setReminderId(e.target.value)}
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

        {/* 6. Botón principal: Guardar cambios */}
        <button
          type="submit"
          className="in-btn in-btn--pri io-form__save io-press"
          disabled={isPending || !title.trim() || isLoading}
          style={{ margin: '20px 16px 12px' }}
        >
          {isPending ? 'Guardando…' : 'Listo'}
        </button>

        {/* 7. Acciones secundarias / destructivas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 16px 0' }}>
          {status !== 'dropped' ? (
            <button
              type="button"
              className="io-btn io-press"
              disabled={isPending}
              onClick={handleDrop}
              style={{
                background: 'var(--io-cell)',
                color: 'var(--io-label-2)',
                border: '1px solid var(--io-sep)',
                minHeight: 44,
              }}
            >
              Soltar tarea
            </button>
          ) : null}

          {confirmDelete ? (
            <button
              type="button"
              className="io-btn io-press"
              disabled={isPending}
              onClick={handleDelete}
              style={{
                background: '#FF3B30',
                color: '#fff',
                fontWeight: 600,
                minHeight: 44,
              }}
            >
              Sí, borrar definitivamente
            </button>
          ) : (
            <button
              type="button"
              className="io-btn io-press"
              onClick={() => setConfirmDelete(true)}
              style={{
                background: 'transparent',
                color: '#FF3B30',
                fontSize: 15,
                minHeight: 40,
              }}
            >
              Borrar tarea
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
