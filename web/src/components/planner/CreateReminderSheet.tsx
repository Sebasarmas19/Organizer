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
import { createReminder } from '@/lib/planner-actions';

const NOTICE_OPTIONS = [
  { value: '', label: '1 día antes (normal)' },
  { value: '2', label: '2 días antes' },
  { value: '3', label: '3 días antes' },
  { value: '5', label: '5 días antes' },
  { value: '7', label: '1 semana antes' },
  { value: '14', label: '2 semanas antes' },
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
  const [noticeDays, setNoticeDays] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setTitle('');
    setOccursOn(initialDate || todayStr);
    setOccursAt('');
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
            <input
              id="rem-sheet-time"
              type="time"
              value={occursAt}
              onChange={(e) => setOccursAt(e.target.value)}
            />
          </div>
        </div>

        {/* GRUPO 3: Notificación */}
        <span className="io-form__label">Notificación matutina</span>
        <div className="io-group">
          <div className="io-field io-field--row">
            <label htmlFor="rem-sheet-notice" className="io-field__label">
              Avisar
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
          className="io-btn io-form__save io-press"
          disabled={isPending || !title.trim()}
        >
          {isPending ? 'Guardando…' : 'Guardar y planificar tareas'}
        </button>
      </form>
    </Sheet>
  );
}
