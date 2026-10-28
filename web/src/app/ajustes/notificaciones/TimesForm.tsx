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
  resources,
}: {
  morning: string;
  evening: string;
  weeklyTime: string;
  weeklyDow: number;
  resources: boolean;
}) {
  const [result, action, pending] = useActionState<SaveResult | null, FormData>(
    saveNotificationTimes,
    null
  );

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="io-group">
        <div className="io-field io-field--row">
          <div>
            <label className="io-field__label" htmlFor="morning" style={{ display: 'block' }}>
              Por la mañana
            </label>
            <span style={{ fontSize: 12, color: 'var(--io-label-3)' }}>
              El día entero con sus horas
            </span>
          </div>
          <input
            id="morning"
            type="time"
            name="morning"
            defaultValue={morning}
            required
            style={{ textAlign: 'right' }}
          />
        </div>

        <div className="io-field io-field--row">
          <div>
            <label className="io-field__label" htmlFor="evening" style={{ display: 'block' }}>
              Por la noche
            </label>
            <span style={{ fontSize: 12, color: 'var(--io-label-3)' }}>
              Qué quedó abierto para cerrar el día
            </span>
          </div>
          <input
            id="evening"
            type="time"
            name="evening"
            defaultValue={evening}
            required
            style={{ textAlign: 'right' }}
          />
        </div>

        <div className="io-field io-field--row" style={{ alignItems: 'flex-start' }}>
          <div>
            <label className="io-field__label" htmlFor="weeklyDow" style={{ display: 'block' }}>
              Revisión semanal
            </label>
            <span style={{ fontSize: 12, color: 'var(--io-label-3)' }}>
              10 minutos para armar la semana
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
            <input
              type="time"
              name="weeklyTime"
              defaultValue={weeklyTime}
              required
              aria-label="Hora de la revisión semanal"
              style={{ textAlign: 'right' }}
            />
          </div>
        </div>

        <label
          htmlFor="resources"
          className="io-field io-field--row"
          style={{ cursor: 'pointer' }}
        >
          <div>
            <span className="io-field__label" style={{ display: 'block' }}>
              Algo para leer
            </span>
            <span style={{ fontSize: 12, color: 'var(--io-label-3)' }}>
              Martes y sábado 19:00, un recurso guardado
            </span>
          </div>
          <input
            id="resources"
            type="checkbox"
            name="resources"
            defaultChecked={resources}
            style={{ width: 22, height: 22, accentColor: 'var(--io-tint)', cursor: 'pointer' }}
          />
        </label>
      </div>

      <button
        type="submit"
        className="in-btn in-btn--pri io-press"
        disabled={pending}
        style={{
          width: '100%',
          minHeight: 46,
          borderRadius: 14,
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        {pending ? 'Guardando…' : 'Guardar las horas'}
      </button>

      {result ? (
        <p
          aria-live="polite"
          style={{
            fontSize: 13,
            textAlign: 'center',
            margin: '0',
            color: result.ok ? 'var(--class)' : 'var(--io-danger, #FF3B30)',
          }}
        >
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
