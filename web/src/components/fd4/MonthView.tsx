/* ============================================================================
   Organizer · FD4 · Calendario · Mes

   REJILLA + LEYENDA + VISTA PREVIA + LISTA.

   Al tocar cualquier casilla de la rejilla, la tarjeta de «Vista previa del
   día» se actualiza de forma INSTANTÁNEA en el cliente (0 ms), mostrando
   los nombres de los reminders, tareas y materias de ese día con sus colores.
   Si el usuario quiere el riel de horas y la vista detallada, pulsa «Ver día».
   ========================================================================= */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Fd4MonthData } from '@/lib/fd4-calendar';
import { DOW_INITIALS } from '@/lib/fd4-calendar';
import { Check, Dot, Flag } from './Marks';

export function MonthView({ data }: { data: Fd4MonthData }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(data.selectedStr);

  const preview = data.previews[selectedDate] ?? {
    dateStr: selectedDate,
    label: selectedDate,
    hint: '',
    events: [],
  };

  const handleCellClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      router.push(`/calendario?v=dia&d=${dateStr}`);
    } else {
      setSelectedDate(dateStr);
    }
  };

  return (
    <div className="fd-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="fd-month">
        <div className="fd-month__dow">
          {DOW_INITIALS.map((d, i) => (
            /* Lunes y Martes comparten inicial, y Miercoles tambien es M. El
               indice va en la clave porque la letra no es unica. */
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        <div className="fd-month__grid">
          {data.cells.map((c) => {
            const isSelected = c.dateStr === selectedDate;
            return (
              <button
                type="button"
                key={c.dateStr}
                onClick={() => handleCellClick(c.dateStr)}
                className="fd-cell"
                data-out={c.inMonth ? 'false' : 'true'}
                data-today={c.isToday ? 'true' : 'false'}
                data-selected={isSelected ? 'true' : 'false'}
                aria-label={`${c.dayNum}, ${c.dots.length} eventos`}
              >
                <span className="fd-cell__num">{c.dayNum}</span>
                <span className="fd-cell__dots">
                  {c.dots.map((e) => (
                    <Dot key={e} entity={e} size="sm" />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fd-legend">
        <span className="fd-legend__item">
          <Dot entity="reminder" size="xs" />
          Reminders
        </span>
        <span className="fd-legend__item">
          <Dot entity="task" size="xs" />
          Tareas
        </span>
        <span className="fd-legend__item">
          <Dot entity="subject" size="xs" />
          Materias
        </span>
      </div>

      {/* Vista previa interactiva del día seleccionado */}
      <section className="fd-dayprev">
        <div className="fd-dayprev__head">
          <div className="fd-dayprev__titlegroup">
            <h2 className="fd-dayprev__title">{preview.label}</h2>
            {preview.hint ? (
              <span className="fd-dayprev__hint">{preview.hint}</span>
            ) : null}
          </div>
          <Link
            href={`/calendario?v=dia&d=${selectedDate}`}
            className="fd-dayprev__more"
            scroll={false}
          >
            <span>Ver día</span>
            <span aria-hidden>›</span>
          </Link>
        </div>

        <div className="fd-dayprev__list">
          {preview.events.length > 0 ? (
            preview.events.map((ev) => (
              <Link
                key={ev.id}
                href={`/calendario?v=dia&d=${selectedDate}`}
                className={`fd-monthrow fd-monthrow--${ev.kind}`}
                scroll={false}
              >
                {ev.kind === 'reminder' ? (
                  <Flag size="sm" />
                ) : ev.kind === 'task' ? (
                  <Check variant="mini" />
                ) : (
                  <Dot entity="subject" size="sm" />
                )}
                <span className="fd-monthrow__title">{ev.title}</span>
                {ev.hora ? <span className="fd-monthrow__when">{ev.hora}</span> : null}
              </Link>
            ))
          ) : (
            <div className="fd-empty" style={{ padding: '8px 4px' }}>
              Sin nada planificado este día
            </div>
          )}
        </div>
      </section>

      {/* Reminders del mes */}
      <div className="fd-monthlist">
        <h2>Reminders del mes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.reminders.length > 0 ? (
            data.reminders.map((r) => (
              <Link
                key={r.id}
                href={`/calendario?v=dia&d=${r.dateStr}`}
                className="fd-remrow"
                scroll={false}
              >
                <Flag size="sm" />
                <span className="fd-remrow__title">{r.title}</span>
                <span className="fd-remrow__when">{r.when}</span>
              </Link>
            ))
          ) : (
            <span className="fd-empty">Nada marcado este mes</span>
          )}
        </div>
      </div>
    </div>
  );
}
