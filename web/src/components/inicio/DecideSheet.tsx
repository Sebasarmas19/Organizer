'use client';

/* ============================================================================
   Organizer · Hilo · <DecideSheet>  ·  lo de ayer, una a una

   La regla 5 del proyecto hecha hoja: "nada se pierde en silencio". Cada
   tarea que quedo abierta trae sus tres salidas, del mismo peso y ninguna
   por defecto (decision 56):

     Hoy       -> la trae a hoy, sin la hora vieja: era de otro dia
     Otro día  -> abre el selector: mañana, los cinco siguientes u otra
                  fecha (la rueda de fechas del iPhone)
     Quitar    -> le quita el dia. No borra: queda en Pendientes, Algún día

   Sin recuento en ningun sitio: un numero de lo pendiente se lee como
   deuda (decision 22). Al decidir la ultima, la hoja se cierra sola.
   ========================================================================= */

import { useState } from 'react';
import type { OverdueTask } from '@/lib/home';
import { Sheet } from '@/components/ios/Sheet';

export type Decision = { kind: 'today' } | { kind: 'day'; dateStr: string } | { kind: 'remove' };

export function DecideSheet({
  open,
  onClose,
  tasks,
  days,
  onDecide,
}: {
  open: boolean;
  onClose: () => void;
  tasks: OverdueTask[];
  /** Mañana y los cinco siguientes (`laterDays`). */
  days: { dateStr: string; label: string }[];
  onDecide: (id: string, decision: Decision) => void;
}) {
  /* La fila que tiene abierto el selector de "Otro día". */
  const [picking, setPicking] = useState<string | null>(null);

  const close = () => {
    setPicking(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Lo de ayer">
      <div className="io-group">
        {tasks.map((task) => {
          const isPicking = picking === task.id;
          const daysId = `dias-${task.id}`;
          return (
            <div key={task.id} className="io-decide">
              <span className="io-decide__t">{task.title}</span>
              <span className="io-decide__m">{task.meta}</span>

              <div className="io-decide__acts" role="group" aria-label={`Qué hacer con ${task.title}`}>
                <button
                  type="button"
                  className="io-chip io-press"
                  onClick={() => onDecide(task.id, { kind: 'today' })}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  className="io-chip io-press"
                  aria-expanded={isPicking}
                  aria-controls={isPicking ? daysId : undefined}
                  onClick={() => setPicking(isPicking ? null : task.id)}
                >
                  Otro día
                </button>
                <button
                  type="button"
                  className="io-chip io-press"
                  onClick={() => onDecide(task.id, { kind: 'remove' })}
                >
                  Quitar
                </button>
              </div>

              {isPicking ? (
                <div className="io-decide__days" id={daysId} role="group" aria-label="Elige el día">
                  {days.map((d) => (
                    <button
                      key={d.dateStr}
                      type="button"
                      className="io-chip io-chip--day io-press"
                      onClick={() => onDecide(task.id, { kind: 'day', dateStr: d.dateStr })}
                    >
                      {d.label}
                    </button>
                  ))}
                  {/* La rueda nativa: el campo transparente cubre la capsula,
                      asi el toque cae en el y el iPhone abre su selector. */}
                  <label className="io-chip io-chip--day io-chip--date">
                    Otra fecha
                    <input
                      type="date"
                      min={days[0]?.dateStr}
                      aria-label={`Otra fecha para ${task.title}`}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker();
                        } catch {
                          /* Sin showPicker, el navegador abre el suyo. */
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.value) onDecide(task.id, { kind: 'day', dateStr: e.target.value });
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="io-foot">Quitar no borra: la deja en Pendientes, en Algún día.</p>
    </Sheet>
  );
}
