'use client';

/* ============================================================================
   Organizer · <CreateTaskSheet>  ·  Hoja modal iOS para nueva tarea

   Despliegue de abajo hacia arriba (Page Sheet) con físicas de muelle,
   sin saltos de página ni tiempos de carga. Campos agrupados en listas
   estilo iOS (io-group / io-field) y scroll interno inercial.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ios/Sheet';
import { Glyph } from '@/components/ios/Glyph';
import { createTask } from '@/lib/planner-actions';
import type { ReminderOption, ScheduleSubject } from '@/lib/planner-data';
import { getUpcomingClasses } from '@/lib/planner-data';
import { addDays, getDayOfWeek } from '@/lib/date-utils';

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

export function CreateTaskSheet({
  open,
  onClose,
  todayStr: _todayStr,
  reminders = [],
  subjects = [],
  initialDate = '',
  initialTime = '',
  initialReminderId = '',
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  todayStr: string;
  reminders?: ReminderOption[];
  subjects?: ScheduleSubject[];
  initialDate?: string;
  initialTime?: string;
  initialReminderId?: string;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueOn, setDueOn] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [durationMin, setDurationMin] = useState(60);
  const [remindBeforeMin, setRemindBeforeMin] = useState('');
  const [reminderId, setReminderId] = useState(initialReminderId);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const today = _todayStr || new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const dow = getDayOfWeek(today);
  const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
  const nextMonday = addDays(today, daysToNextMonday);
  const upcomingClasses = getUpcomingClasses(subjects, today);

  const reset = () => {
    setTitle('');
    setNotes('');
    setDueOn(initialDate);
    setTime(initialTime);
    setDurationMin(60);
    setRemindBeforeMin('');
    setReminderId(initialReminderId);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isPending) return;

    setError('');
    startTransition(async () => {
      try {
        const { id } = await createTask({
          title: cleanTitle,
          dueOn: dueOn || null,
          time: dueOn && time ? time : null,
          durationMin,
          remindBeforeMin: remindBeforeMin ? Number(remindBeforeMin) : null,
          reminderId: reminderId || null,
          notes,
        });
        reset();
        router.refresh();
        if (onSuccess) onSuccess(id);
        else onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo crear la tarea.');
      }
    });
  };

  return (
    <Sheet open={open} onClose={handleClose} title="Nueva tarea">
      <form onSubmit={handleSubmit} className="io-form">
        {/* GRUPO 1: Identidad (Título y notas agrupados con divisor de 0.5px) */}
        <div className="io-group">
          <label className="io-field">
            <span className="io-sr">Tarea</span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="¿Qué vas a hacer?"
              autoFocus
              autoCapitalize="sentences"
              enterKeyHint="next"
              required
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

        {/* GRUPO 2: Planificación y Fecha */}
        <div style={{ margin: '18px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="io-form__label" style={{ margin: 0 }}>Cuándo</span>
            <button
              type="button"
              className="io-chip io-press"
              aria-pressed={!dueOn}
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

          {/* Píldoras de fecha rápida */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {[
              { label: 'Hoy', date: today },
              { label: 'Mañana', date: tomorrow },
              { label: 'Próximo lunes', date: nextMonday },
            ].map((chip) => {
              const isSel = dueOn === chip.date;
              return (
                <button
                  key={chip.label}
                  type="button"
                  className="io-chip io-press"
                  onClick={() => setDueOn(chip.date)}
                  style={{
                    height: 28,
                    padding: '0 12px',
                    fontSize: 13,
                    fontWeight: isSel ? 600 : 500,
                    background: isSel ? 'var(--io-tint-fill)' : 'var(--io-cell-up)',
                    color: isSel ? 'var(--io-on-tint)' : 'var(--io-label-2)',
                    border: isSel ? '1px solid var(--io-tint)' : '1px solid var(--io-sep)',
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Conexión inteligente con clases del horario */}
          {upcomingClasses.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {upcomingClasses.map((cls) => {
                const isSel = dueOn === cls.nextDate;
                return (
                  <button
                    key={cls.title}
                    type="button"
                    className="io-chip io-press"
                    onClick={() => {
                      setDueOn(cls.nextDate);
                      setTime(cls.time);
                    }}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      fontSize: 12,
                      fontWeight: isSel ? 600 : 500,
                      background: isSel ? 'var(--io-tint-soft)' : 'var(--io-cell-up)',
                      color: isSel ? 'var(--io-tint)' : 'var(--io-label-2)',
                      border: isSel ? '1px solid var(--io-tint)' : '1px solid var(--io-sep)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ opacity: 0.7 }}>Próx. clase:</span>
                    <strong>{cls.title}</strong>
                    <span style={{ opacity: 0.8 }}>({cls.dayLabel})</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="io-group">
          <div className="io-field io-field--row">
            <label htmlFor="task-sheet-date" className="io-field__label">
              Fecha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 52 }}>
              {!dueOn ? (
                <span style={{ color: 'var(--io-label-3)', fontSize: 17, pointerEvents: 'none' }}>
                  Elegir fecha…
                </span>
              ) : null}
              <input
                id="task-sheet-date"
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
                    padding: '4px',
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
            <>
              <div className="io-field io-field--row">
                <label htmlFor="task-sheet-time" className="io-field__label">
                  Hora (opcional)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 48 }}>
                  {!time ? (
                    <span style={{ color: 'var(--io-label-3)', fontSize: 17, pointerEvents: 'none' }}>
                      Sin hora
                    </span>
                  ) : null}
                  <input
                    id="task-sheet-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={!time ? { position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' } : undefined}
                  />
                  {time ? (
                    <button
                      type="button"
                      aria-label="Quitar hora"
                      onClick={() => {
                        setTime('');
                        setRemindBeforeMin('');
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

              {time ? (
                <>
                  <div className="io-field io-field--row">
                    <label htmlFor="task-sheet-dur" className="io-field__label">
                      Duración
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[
                          { value: 30, label: '30m' },
                          { value: 60, label: '1h' },
                          { value: 120, label: '2h' },
                        ].map((chip) => (
                          <button
                            key={chip.value}
                            type="button"
                            className="io-chip io-press"
                            onClick={() => setDurationMin(chip.value)}
                            style={{
                              height: 26,
                              padding: '0 8px',
                              fontSize: 12,
                              fontWeight: durationMin === chip.value ? 600 : 500,
                              background: durationMin === chip.value ? 'var(--io-tint-fill)' : 'var(--io-cell-up)',
                              color: durationMin === chip.value ? 'var(--io-on-tint)' : 'var(--io-label-2)',
                              border: durationMin === chip.value ? '1px solid var(--io-tint)' : '1px solid var(--io-sep)',
                            }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      <select
                        id="task-sheet-dur"
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
                  </div>
                  <div className="io-field io-field--row">
                    <label htmlFor="task-sheet-remind" className="io-field__label">
                      Aviso al teléfono
                    </label>
                    <select
                      id="task-sheet-remind"
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
            </>
          ) : null}
        </div>

        {dueOn && !time ? (
          <p className="io-field__hint">
            Con hora, la tarea ocupa su hueco en el calendario y puede avisarte antes.
          </p>
        ) : null}

        {/* GRUPO 3: Vincular a Reminder */}
        {reminders.length > 0 ? (
          <>
            <span className="io-form__label">Asociar</span>
            <div className="io-group">
              <div className="io-field io-field--row">
                <label htmlFor="task-sheet-reminder" className="io-field__label">
                  Es para
                </label>
                <select
                  id="task-sheet-reminder"
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

        {error ? (
          <p className="io-form__err" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="in-btn in-btn--pri io-form__save io-press"
          disabled={isPending || !title.trim()}
        >
          {isPending ? 'Creando…' : 'Crear tarea'}
        </button>
      </form>
    </Sheet>
  );
}
