'use client';

/* ============================================================================
   Organizer · Formulario de reminder

   Un reminder es una fecha que no depende de ti: un parcial, una entrega,
   una defensa. Solo el título y la fecha son obligatorios. La hora y el aviso
   se ponen si se saben; si no, el aviso es de un día (decisión 60).
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createReminder, updateReminder } from '@/lib/planner-actions';

const NOTICE_OPTIONS = [
  { value: '', label: '1 día antes (normal)' },
  { value: '2', label: '2 días antes' },
  { value: '3', label: '3 días antes' },
  { value: '5', label: '5 días antes' },
  { value: '7', label: '1 semana antes' },
  { value: '14', label: '2 semanas antes' },
];

export type ReminderFormValues = {
  title: string;
  occursOn: string;
  occursAt: string;
  noticeDays: string;
  notes: string;
};

export function ReminderForm({
  mode,
  reminderId,
  initial,
  onDone,
}: {
  mode: 'create' | 'edit';
  reminderId?: string;
  initial: ReminderFormValues;
  /** Solo en edición: cerrar el formulario. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

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
    <form className="pl-form" onSubmit={submit}>
      {error ? <p className="pl-error" role="alert">{error}</p> : null}

      <div className="pl-field">
        <label className="pl-label" htmlFor="rem-title">Qué es</label>
        <input
          id="rem-title"
          className="pl-input pl-input--title"
          value={values.title}
          onChange={set('title')}
          placeholder="Entrega del proyecto, Parcial 2…"
          autoFocus={mode === 'create'}
          autoCapitalize="sentences"
          enterKeyHint="next"
          required
        />
      </div>

      <div className="pl-row">
        <div className="pl-field">
          <label className="pl-label" htmlFor="rem-date">Fecha</label>
          <input
            id="rem-date"
            type="date"
            className="pl-input"
            value={values.occursOn}
            onChange={set('occursOn')}
            required
          />
        </div>
        <div className="pl-field">
          <label className="pl-label" htmlFor="rem-time">Hora (opcional)</label>
          <input
            id="rem-time"
            type="time"
            className="pl-input"
            value={values.occursAt}
            onChange={set('occursAt')}
          />
        </div>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor="rem-notice">Que encabece la notificación de la mañana</label>
        <select id="rem-notice" className="pl-select" value={values.noticeDays} onChange={set('noticeDays')}>
          {NOTICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pl-hint">
          Además, si no tiene tareas, te aviso una semana, tres días y un día antes.
        </span>
      </div>

      <div className="pl-field">
        <label className="pl-label" htmlFor="rem-notes">Notas (opcional)</label>
        <textarea
          id="rem-notes"
          className="pl-textarea"
          value={values.notes}
          onChange={set('notes')}
          placeholder="Temas que entran, formato de entrega, aula…"
        />
      </div>

      <div className="pl-actions">
        <button type="submit" className="fd-btn fd-btn--primary fd-btn--full" disabled={pending || !values.title.trim()}>
          {pending ? 'Guardando…' : mode === 'create' ? 'Guardar y planificar tareas' : 'Guardar cambios'}
        </button>
        {mode === 'edit' ? (
          <button type="button" className="fd-btn fd-btn--quiet fd-btn--full" onClick={onDone}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
