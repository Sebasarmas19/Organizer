'use client';

/* ============================================================================
   Organizer · <ReminderDetailSheet>
   
   Hoja modal de iOS (Sheet) para ver, editar y decidir sobre un reminder:
   - Título, fecha de ocurrencia, hora opcional y días de aviso
   - Lista interactiva de tareas asociadas para prepararlo
   - Acceso directo a ver el día en el calendario o eliminar el reminder
   - No saca al usuario del Calendario ni de Hoy
   ========================================================================= */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ios/Sheet';
import { Glyph } from '@/components/ios/Glyph';
import {
  getReminderForSheet,
  updateReminder,
  createTask,
  type ReminderInput,
} from '@/lib/planner-actions';
import { deleteReminder, toggleTask } from '@/lib/fd4-actions';
import type { ReminderDetail } from '@/lib/planner-data';
import type { ReminderRecurrence } from '@/lib/supabase/database.types';
import Link from 'next/link';

const NOTICE_OPTIONS = [
  { value: '', label: '1 día antes (normal)' },
  { value: '2', label: '2 días antes' },
  { value: '3', label: '3 días antes' },
  { value: '5', label: '5 días antes' },
  { value: '7', label: '1 semana antes' },
  { value: '14', label: '2 semanas antes' },
];

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Nunca (no se repite)' },
  { value: 'daily', label: 'Cada día' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'monthly', label: 'Cada mes' },
  { value: 'yearly', label: 'Cada año' },
];

const TIME_ALERT_OPTIONS = [
  { value: '', label: 'Sin aviso previo' },
  { value: '10', label: '10 min antes' },
  { value: '15', label: '15 min antes' },
  { value: '30', label: '30 min antes' },
  { value: '60', label: '1 hora antes' },
  { value: '120', label: '2 horas antes' },
];

export function ReminderDetailSheet({
  open,
  onClose,
  reminderId,
  initialTitle = '',
  initialDate = '',
  todayStr,
  onUpdated,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  reminderId: string | null;
  initialTitle?: string;
  initialDate?: string;
  todayStr: string;
  onUpdated?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [occursOn, setOccursOn] = useState(initialDate || todayStr);
  const [occursAt, setOccursAt] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [reminderMin, setReminderMin] = useState('');
  const [noticeDays, setNoticeDays] = useState('');
  const [notes, setNotes] = useState('');
  const [distance, setDistance] = useState('');
  const [whenLabel, setWhenLabel] = useState('');
  const [tasks, setTasks] = useState<{ id: string; title: string; done: boolean; meta: string }[]>([]);

  const [newStepDraft, setNewStepDraft] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(open && reminderId));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !reminderId) return;

    let active = true;

    getReminderForSheet(reminderId)
      .then((data: ReminderDetail | null) => {
        if (!active || !data) return;
        setTitle(data.title);
        setOccursOn(data.occursOn);
        setOccursAt(data.occursAt?.slice(0, 5) ?? '');
        setRecurrence(data.recurrence ?? '');
        setReminderMin(data.reminderMin !== null && data.reminderMin !== undefined ? String(data.reminderMin) : '');
        setNoticeDays(data.noticeDays ? String(data.noticeDays) : '');
        setNotes(data.notes ?? '');
        setDistance(data.distance);
        setWhenLabel(data.when);
        setTasks(data.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done, meta: t.meta })));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar reminder.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, reminderId]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reminderId || !title.trim() || isPending) return;

    setError('');
    startTransition(async () => {
      try {
        const input: ReminderInput = {
          title: title.trim(),
          occursOn,
          occursAt: occursAt || null,
          noticeDays: noticeDays ? Number(noticeDays) : null,
          recurrence: (recurrence as ReminderRecurrence) || null,
          reminderMin: occursAt && reminderMin !== '' ? Number(reminderMin) : null,
          notes: notes.trim() || null,
        };
        await updateReminder(reminderId, input);
        router.refresh();
        if (onUpdated) onUpdated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el recordatorio.');
      }
    });
  };

  const handleToggleTask = (taskId: string, currentDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !currentDone } : t))
    );
    startTransition(async () => {
      try {
        await toggleTask(taskId, !currentDone);
        router.refresh();
        if (onUpdated) onUpdated();
      } catch (err) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, done: currentDone } : t))
        );
        setError(err instanceof Error ? err.message : 'Error al actualizar tarea.');
      }
    });
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStep = newStepDraft.trim();
    if (!cleanStep || !reminderId || isPending) return;

    setNewStepDraft('');
    startTransition(async () => {
      try {
        const { id } = await createTask({
          title: cleanStep,
          dueOn: occursOn,
          reminderId,
        });
        setTasks((prev) => [
          ...prev,
          { id, title: cleanStep, done: false, meta: 'para este reminder' },
        ]);
        router.refresh();
        if (onUpdated) onUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo añadir paso.');
      }
    });
  };

  const handleDelete = () => {
    if (!reminderId || isPending) return;
    startTransition(async () => {
      try {
        await deleteReminder(reminderId);
        router.refresh();
        if (onDeleted) onDeleted();
        else if (onUpdated) onUpdated();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo borrar el recordatorio.');
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Recordatorio"
      subtitle={distance ? `${distance} · ${whenLabel}` : whenLabel || undefined}
    >
      <form onSubmit={handleSave} className="io-form" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        {error ? (
          <p className="io-form__err" role="alert">
            {error}
          </p>
        ) : null}

        {/* 1. Título y notas */}
        <div className="io-group">
          <label className="io-field">
            <span className="io-sr">Título del recordatorio</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="¿Qué fecha es?"
              autoCapitalize="sentences"
              required
            />
          </label>
          <label className="io-field">
            <span className="io-sr">Notas</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional): detalles, enlace, instrucciones…"
            />
          </label>
        </div>

        {/* 2. Cuándo y aviso */}
        <span className="io-form__label">Cuándo</span>
        <div className="io-group">
          <div className="io-field io-field--row">
            <label className="io-field__label" htmlFor="rem-sheet-date">
              Fecha
            </label>
            <input
              id="rem-sheet-date"
              type="date"
              value={occursOn}
              onChange={(e) => setOccursOn(e.target.value)}
              required
            />
          </div>

          <div className="io-field io-field--row">
            <label className="io-field__label" htmlFor="rem-sheet-time">
              Hora (opcional)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 48 }}>
              {!occursAt ? (
                <span style={{ color: 'var(--io-label-3)', fontSize: 17, pointerEvents: 'none' }}>
                  Sin hora
                </span>
              ) : null}
              <input
                id="rem-sheet-time"
                type="time"
                value={occursAt}
                onChange={(e) => setOccursAt(e.target.value)}
                style={!occursAt ? { position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' } : undefined}
              />
              {occursAt ? (
                <button
                  type="button"
                  aria-label="Quitar hora"
                  onClick={() => {
                    setOccursAt('');
                    setReminderMin('');
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

          <div className="io-field io-field--row">
            <label className="io-field__label" htmlFor="rem-sheet-recurrence">
              Repetir
            </label>
            <select
              id="rem-sheet-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {occursAt ? (
          <>
            <span className="io-form__label">Aviso previo al teléfono</span>
            <div className="io-group">
              <div className="io-field io-field--row">
                <label className="io-field__label" htmlFor="rem-sheet-min">
                  Avisar
                </label>
                <select
                  id="rem-sheet-min"
                  value={reminderMin}
                  onChange={(e) => setReminderMin(e.target.value)}
                >
                  {TIME_ALERT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : null}

        <span className="io-form__label">Resumen matutino</span>
        <div className="io-group">
          <div className="io-field io-field--row">
            <label className="io-field__label" htmlFor="rem-sheet-notice">
              Encabezar
            </label>
            <select
              id="rem-sheet-notice"
              value={noticeDays}
              onChange={(e) => setNoticeDays(e.target.value)}
            >
              {NOTICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Tareas para prepararlo */}
        <span className="io-form__label">Pasos para prepararlo</span>
        <div className="io-group" style={{ padding: '4px 0' }}>
          {tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '1px solid var(--io-sep)',
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleTask(t.id, t.done)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: t.done ? 'var(--io-tint)' : 'transparent',
                  border: t.done ? 'none' : '2px solid var(--io-ctl)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {t.done ? <Glyph name="check" style={{ width: 14, height: 14 }} /> : null}
              </button>
              <span
                style={{
                  fontSize: 16,
                  color: 'var(--io-label)',
                  textDecoration: t.done ? 'line-through' : 'none',
                  opacity: t.done ? 0.6 : 1,
                  flex: 1,
                }}
              >
                {t.title}
              </span>
            </div>
          ))}

          {/* Input rápido para agregar un paso */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
            <input
              value={newStepDraft}
              onChange={(e) => setNewStepDraft(e.target.value)}
              placeholder="Añadir un paso…"
              style={{
                flex: 1,
                border: 0,
                background: 'transparent',
                color: 'var(--io-label)',
                fontSize: 15,
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStep(e);
                }
              }}
            />
            {newStepDraft.trim() ? (
              <button
                type="button"
                className="io-chip io-press"
                onClick={handleAddStep}
                style={{
                  height: 28,
                  padding: '0 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--io-tint-fill)',
                  color: 'var(--io-on-tint)',
                }}
              >
                Añadir
              </button>
            ) : null}
          </div>
        </div>

        {/* 4. Botón principal: Guardar */}
        <button
          type="submit"
          className="in-btn in-btn--pri io-form__save io-press"
          disabled={isPending || !title.trim() || isLoading}
          style={{ margin: '20px 16px 12px' }}
        >
          {isPending ? 'Guardando…' : 'Listo'}
        </button>

        {/* 5. Acciones secundarias */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 16px 0' }}>
          {reminderId ? (
            <Link
              href={`/reminders/${reminderId}`}
              className="io-btn io-press"
              onClick={onClose}
              style={{
                background: 'var(--io-tint)',
                color: '#fff',
                border: 'none',
                minHeight: 46,
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderRadius: 'var(--radius)',
              }}
            >
              <Glyph name="calendar" style={{ width: 16, height: 16 }} />
              Planificar preparación con calendario
            </Link>
          ) : null}

          <Link
            href={`/calendario?v=dia&d=${occursOn}`}
            className="io-btn io-press"
            onClick={onClose}
            style={{
              background: 'var(--io-cell)',
              color: 'var(--io-label)',
              border: '1px solid var(--io-sep)',
              minHeight: 44,
              textDecoration: 'none',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Ver este día en el calendario
          </Link>

          <button
            type="button"
            className="io-btn io-press"
            disabled={isPending}
            onClick={() => {
              if (!reminderId) return;
              startTransition(async () => {
                const { markReminderCompletedAction } = await import('@/lib/planner-actions');
                await markReminderCompletedAction(reminderId);
                onClose();
              });
            }}
            style={{
              background: 'var(--io-tint-fill)',
              color: 'var(--io-on-tint)',
              fontWeight: 600,
              minHeight: 44,
            }}
          >
            ✓ Ya lo entregué / Listo
          </button>

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
              Sí, eliminar recordatorio
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
              Eliminar recordatorio
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}
