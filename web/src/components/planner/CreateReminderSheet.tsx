'use client';

/* ============================================================================
   Organizer · <CreateReminderSheet>  ·  Hoja modal iOS para nuevo reminder

   Un reminder es una fecha que no depende de ti: parcial, entrega, cita.
   Se abre como una hoja modal de iOS (Sheet) con campos agrupados
   (io-group / io-field) y scroll interno inercial, sin cambiar de vista.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ios/Sheet';
import { Glyph } from '@/components/ios/Glyph';
import { createReminder } from '@/lib/planner-actions';
import type { ReminderRecurrence } from '@/lib/supabase/database.types';

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

export function CreateReminderSheet({
  open,
  onClose,
  todayStr,
  initialDate,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  todayStr: string;
  initialDate?: string;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [occursOn, setOccursOn] = useState(initialDate || todayStr);
  const [occursAt, setOccursAt] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [reminderMin, setReminderMin] = useState('');
  const [noticeDays, setNoticeDays] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle('');
    setOccursOn(initialDate || todayStr);
    setOccursAt('');
    setRecurrence('');
    setReminderMin('');
    setNoticeDays('');
    setNotes('');
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
        const { id } = await createReminder({
          title: cleanTitle,
          occursOn,
          occursAt: occursAt || null,
          noticeDays: noticeDays ? Number(noticeDays) : null,
          recurrence: (recurrence as ReminderRecurrence) || null,
          reminderMin: occursAt && reminderMin !== '' ? Number(reminderMin) : null,
          notes,
        });
        reset();
        onClose();
        if (onSuccess) {
          onSuccess(id);
        } else {
          router.replace(`/reminders/${id}?nuevo=1`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el recordatorio.');
      }
    });
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Nuevo reminder"
      subtitle="Una fecha que no depende de ti"
    >
      <form onSubmit={handleSubmit} className="io-form">
        {/* GRUPO 1: Identidad (Qué es y notas) */}
        <div className="io-group">
          <label className="io-field">
            <span className="io-sr">Qué es</span>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Entrega del proyecto, Parcial 2…"
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
              placeholder="Notas (opcional): temas que entran, aula, formato…"
            />
          </label>
        </div>

        {/* GRUPO 2: Fecha y Hora */}
        <span className="io-form__label">Cuándo</span>
        <div className="io-group">
          <div className="io-field io-field--row">
            <label htmlFor="rem-sheet-date" className="io-field__label">
              Fecha
            </label>
            <input
              id="rem-sheet-date"
              type="date"
              required
              value={occursOn}
              onChange={(e) => setOccursOn(e.target.value)}
            />
          </div>
          <div className="io-field io-field--row">
            <label htmlFor="rem-sheet-time" className="io-field__label">
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
            <label htmlFor="rem-sheet-recurrence" className="io-field__label">
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

        {/* GRUPO 3: Notificación */}
        {occursAt ? (
          <>
            <span className="io-form__label">Aviso previo al teléfono</span>
            <div className="io-group">
              <div className="io-field io-field--row">
                <label htmlFor="rem-sheet-min" className="io-field__label">
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
            <label htmlFor="rem-sheet-notice" className="io-field__label">
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
        <p className="io-field__hint">
          Además, si no tiene tareas, te aviso una semana, tres días y un día antes.
        </p>

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
          {isPending ? 'Guardando…' : 'Guardar y planificar tareas'}
        </button>
      </form>
    </Sheet>
  );
}
