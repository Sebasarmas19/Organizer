'use client';

/* ============================================================================
   Organizer · Las horas, editables (decisión 25)

   Cuatro campos y nada mas. El despachador no conoce ninguna hora por su
   cuenta: lee estas columnas de `profiles`, asi que lo que se guarda aqui es
   literalmente cuando suena el telefono.

   Es un `<form>` con accion de servidor y controles nativos a proposito: en
   iOS `<input type="time">` abre el selector del sistema, que es el que el
   usuario ya sabe usar. Cualquier selector propio seria peor y mas fragil.
   ========================================================================= */

import { useActionState } from 'react';
import { saveNotificationTimes, type SaveResult } from './actions';

const DAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export function TimesForm({
  morning,
  evening,
  weeklyTime,
  weeklyDow,
}: {
  morning: string;
  evening: string;
  weeklyTime: string;
  weeklyDow: number;
}) {
  const [result, action, pending] = useActionState<SaveResult | null, FormData>(
    saveNotificationTimes,
    null
  );

  return (
    <form action={action} className="gutter" style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <Field
        id="morning"
        label="Por la mañana"
        hint="El día entero, con sus horas."
        name="morning"
        defaultValue={morning}
      />
      <Field
        id="evening"
        label="Por la noche"
        hint="Qué quedó abierto, para cerrar el día."
        name="evening"
        defaultValue={evening}
      />

      <div>
        <label className="t-label c-muted" htmlFor="weeklyDow" style={{ fontWeight: 600 }}>
          La revisión semanal
        </label>
        <p className="t-meta c-faint" style={{ marginTop: 2 }}>
          Unos diez minutos para armar la semana.
        </p>
        <div className="timepair" style={{ marginTop: 'var(--space-2)' }}>
          <div className="field">
            <select
              id="weeklyDow"
              name="weeklyDow"
              defaultValue={String(weeklyDow)}
              aria-label="Día de la revisión semanal"
            >
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <input
              type="time"
              name="weeklyTime"
              defaultValue={weeklyTime}
              required
              aria-label="Hora de la revisión semanal"
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn--full" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar las horas'}
      </button>

      <p aria-live="polite" className="t-meta c-muted" style={{ minHeight: 20, marginTop: -8 }}>
        {result ? result.message : null}
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  name,
  defaultValue,
}: {
  id: string;
  label: string;
  hint: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="t-label c-muted" htmlFor={id} style={{ fontWeight: 600 }}>
        {label}
      </label>
      <p className="t-meta c-faint" style={{ marginTop: 2 }}>
        {hint}
      </p>
      <div className="field" style={{ marginTop: 'var(--space-2)' }}>
        <input id={id} type="time" name={name} defaultValue={defaultValue} required />
      </div>
    </div>
  );
}
