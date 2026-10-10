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
      <span className="io-form__label">Cuándo</span>
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
          <input
            id="rem-time"
            type="time"
            value={values.occursAt}
            onChange={set('occursAt')}
          />
        </div>
      </div>

      {/* GRUPO 3: Notificación */}
      <span className="io-form__label">Notificación matutina</span>
      <div className="io-group">
        <div className="io-field io-field--row">
          <label className="io-field__label" htmlFor="rem-notice">Avisar</label>
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
        className="io-btn io-form__save io-press"
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
