'use client';

/* ============================================================================
   Organizer · Formulario de reminder

   Un reminder es una fecha que no depende de ti: un parcial, una entrega,
   una defensa. Solo el título y la fecha son obligatorios. La hora y el aviso
   se ponen si se saben; si no, el aviso es de un día (decisión 60).
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Glyph } from '@/components/ios/Glyph';
import { createReminder, updateReminder } from '@/lib/planner-actions';
import type { ReminderRecurrence } from '@/lib/supabase/database.types';
import type { ScheduleSubject } from '@/lib/planner-data';
import { getUpcomingClasses } from '@/lib/planner-data';
import { addDays, getDayOfWeek } from '@/lib/date-utils';

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

export type ReminderFormValues = {
  title: string;
  occursOn: string;
  occursAt: string;
  noticeDays: string;
  recurrence: string;
  reminderMin: string;
  notes: string;
};

export function ReminderForm({
  mode,
  reminderId,
  initial,
  todayStr: _todayStr,
  subjects = [],
  onDone,
}: {
  mode: 'create' | 'edit';
  reminderId?: string;
  initial: ReminderFormValues;
  todayStr?: string;
  subjects?: ScheduleSubject[];
  /** Solo en edición: cerrar el formulario. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const today = _todayStr || new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const dow = getDayOfWeek(today);
  const daysToNextMonday = ((1 - dow + 7) % 7) || 7;
  const nextMonday = addDays(today, daysToNextMonday);
  const upcomingClasses = getUpcomingClasses(subjects, today);

  const set = (k: keyof ReminderFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const input = {
      title: values.title,
      occursOn: values.occursOn,
      occursAt: values.occursAt || null,
      noticeDays: values.noticeDays ? Number(values.noticeDays) : null,
      recurrence: (values.recurrence as ReminderRecurrence) || null,
      reminderMin: values.occursAt && values.reminderMin !== '' ? Number(values.reminderMin) : null,
      notes: values.notes,
    };
    startTransition(async () => {
      try {
        if (mode === 'create') {
          const { id } = await createReminder(input);
          /* Directo a su detalle: lo siguiente natural es partirlo en tareas. */
          router.replace(`/reminders/${id}?nuevo=1`);
        } else if (reminderId) {
          await updateReminder(reminderId, input);
          router.refresh();
          onDone?.();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      }
    });
  };

  return (
    <form className="io-form" onSubmit={submit} style={{ maxWidth: 540, margin: '0 auto', width: '100%' }}>
      {error ? <p className="io-form__err" role="alert">{error}</p> : null}

      {/* GRUPO 1: Identidad */}
      <div className="io-group">
        <label className="io-field">
          <span className="io-sr">Qué es</span>
          <input
            id="rem-title"
            value={values.title}
            onChange={set('title')}
            placeholder="Entrega del proyecto, Parcial 2…"
            autoFocus={mode === 'create'}
            autoCapitalize="sentences"
            enterKeyHint="next"
            required
          />
        </label>
        <label className="io-field">
          <span className="io-sr">Notas</span>
          <textarea
            id="rem-notes"
            rows={2}
            value={values.notes}
            onChange={set('notes')}
            placeholder="Temas que entran, formato de entrega, aula…"
          />
        </label>
      </div>

      {/* GRUPO 2: Fecha y Hora */}
      <div style={{ margin: '18px 20px 8px' }}>
        <span className="io-form__label" style={{ margin: 0, display: 'block', marginBottom: 8 }}>Cuándo</span>

        {/* Píldoras de fecha rápida */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {[
            { label: 'Hoy', date: today },
            { label: 'Mañana', date: tomorrow },
            { label: 'Próximo lunes', date: nextMonday },
          ].map((chip) => {
            const isSel = values.occursOn === chip.date;
            return (
              <button
                key={chip.label}
                type="button"
                className="io-chip io-press"
                onClick={() => setValues((v) => ({ ...v, occursOn: chip.date }))}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {upcomingClasses.map((cls) => {
              const isSel = values.occursOn === cls.nextDate;
              return (
                <button
                  key={cls.title}
                  type="button"
                  className="io-chip io-press"
                  onClick={() => setValues((v) => ({ ...v, occursOn: cls.nextDate, occursAt: cls.time || v.occursAt }))}
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
          <label className="io-field__label" htmlFor="rem-date">Fecha</label>
          <input
            id="rem-date"
            type="date"
            value={values.occursOn}
            onChange={set('occursOn')}
            required
          />
        </div>
        <div className="io-field io-field--row">
          <label className="io-field__label" htmlFor="rem-time">Hora (opcional)</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', minHeight: 48 }}>
            {!values.occursAt ? (
              <span style={{ color: 'var(--io-label-3)', fontSize: 17, pointerEvents: 'none' }}>
                Sin hora
              </span>
            ) : null}
            <input
              id="rem-time"
              type="time"
              value={values.occursAt}
              onChange={set('occursAt')}
              style={!values.occursAt ? { position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' } : undefined}
            />
            {values.occursAt ? (
              <button
                type="button"
                aria-label="Quitar hora"
                onClick={() => setValues((v) => ({ ...v, occursAt: '', reminderMin: '' }))}
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
          <label className="io-field__label" htmlFor="rem-recurrence">Repetir</label>
          <select id="rem-recurrence" value={values.recurrence} onChange={set('recurrence')}>
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* GRUPO 3: Notificación */}
      {values.occursAt ? (
        <>
          <span className="io-form__label">Aviso previo al teléfono</span>
          <div className="io-group">
            <div className="io-field io-field--row">
              <label className="io-field__label" htmlFor="rem-min">Avisar</label>
              <select id="rem-min" value={values.reminderMin} onChange={set('reminderMin')}>
                {TIME_ALERT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : null}

      <span className="io-form__label">Resumen matutino</span>
      <div className="io-group">
        <div className="io-field io-field--row">
          <label className="io-field__label" htmlFor="rem-notice">Encabezar</label>
          <select id="rem-notice" value={values.noticeDays} onChange={set('noticeDays')}>
            {NOTICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="io-field__hint">
        Además, si no tiene tareas, te aviso una semana, tres días y un día antes.
      </p>

      <button
        type="submit"
        className="in-btn in-btn--pri io-form__save io-press"
        disabled={pending || !values.title.trim()}
      >
        {pending ? 'Guardando…' : mode === 'create' ? 'Guardar y planificar tareas' : 'Guardar cambios'}
      </button>
      {mode === 'edit' ? (
        <button
          type="button"
          className="io-btn io-press"
          style={{ margin: '10px 14px 0', background: 'transparent', color: 'var(--io-label-2)' }}
          onClick={onDone}
        >
          Cancelar
        </button>
      ) : null}
    </form>
  );
}
