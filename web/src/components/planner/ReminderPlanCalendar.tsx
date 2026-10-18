'use client';

/* ============================================================================
   Organizer · Calendario de la preparación de un reminder

   Es el mismo mes del módulo Calendario (fd-month / fd-cell / fd-dayprev),
   recortado a lo que sirve aquí: solo se pueden tocar los días que van de
   hoy al día del reminder. Al tocar uno se ve lo que de verdad hay ese día
   — reminders, tareas y las horas de clase en gris, sin nombre (#79) — y
   ese día pasa a ser la fecha de la próxima tarea.

   No dice si un día está "libre" u "ocupado". Eso lo decide el usuario.
   ========================================================================= */

import { useState } from 'react';
import Link from 'next/link';
import type { PlanCalendar } from '@/lib/planner-data';
import { DOW_INITIALS } from '@/lib/fd4-calendar';
import { Check, Dot, Flag } from '@/components/fd4/Marks';
import { Icon } from '@/components/Icon';

export function ReminderPlanCalendar({
  cal,
  selected,
  onSelect,
}: {
  cal: PlanCalendar;
  selected: string;
  onSelect: (dateStr: string) => void;
}) {
  const [monthIdx, setMonthIdx] = useState(0);
  const month = cal.months[monthIdx];
  const day = selected ? cal.days[selected] : undefined;

  return (
    <section className="fd5-pcal">
      <div className="fd5-pcal__nav">
        <button
          type="button"
          className="fd5-pcal__arrow"
          onClick={() => setMonthIdx((i) => i - 1)}
          disabled={monthIdx === 0}
          aria-label="Mes anterior"
        >
          <Icon name="chevron-left" size="sm" />
        </button>
        <h2 className="fd5-pcal__title">{month.title}</h2>
        <button
          type="button"
          className="fd5-pcal__arrow"
          onClick={() => setMonthIdx((i) => i + 1)}
          disabled={monthIdx === cal.months.length - 1}
          aria-label="Mes siguiente"
        >
          <Icon name="chevron-right" size="sm" />
        </button>
      </div>

      <div className="fd-month">
        <div className="fd-month__dow">
          {DOW_INITIALS.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="fd-month__grid">
          {month.cells.map((c) => (
            <button
              type="button"
              key={c.dateStr}
              className="fd-cell fd5-pcal__cell"
              disabled={!c.selectable}
              onClick={() => onSelect(selected === c.dateStr ? '' : c.dateStr)}
              data-out={c.inMonth && c.selectable ? 'false' : 'true'}
              data-today={c.isToday ? 'true' : 'false'}
              data-selected={selected === c.dateStr ? 'true' : 'false'}
              data-event={c.isEvent ? 'true' : undefined}
              aria-pressed={selected === c.dateStr}
              aria-label={`${c.dayNum}${c.isEvent ? ', día del reminder' : ''}`}
            >
              <span className="fd-cell__num">{c.dayNum}</span>
              <span className="fd-cell__dots">
                {c.dots.map((e) => (
                  <Dot key={e} entity={e} size="sm" />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      {day ? (
        <div className="fd-dayprev fd5-pcal__day">
          <div className="fd-dayprev__head">
            <div className="fd-dayprev__titlegroup">
              <h3 className="fd-dayprev__title">{day.label}</h3>
              {day.hint ? <span className="fd-dayprev__hint">{day.hint}</span> : null}
            </div>
            <Link href={`/calendario?v=dia&d=${selected}`} className="fd-dayprev__more">
              <span>Ver día</span>
              <span aria-hidden>›</span>
            </Link>
          </div>

          <div className="fd-dayprev__list">
            {day.classes.map((range) => (
              <div key={range} className="fd-monthrow fd5-pcal__class">
                <span className="fd5-pcal__classdot" aria-hidden />
                <span className="fd-monthrow__title">En clase</span>
                <span className="fd-monthrow__when">{range}</span>
              </div>
            ))}
            {day.events.map((ev) => (
              <Link key={ev.id} href={ev.href} className={`fd-monthrow fd-monthrow--${ev.kind}`}>
                {ev.kind === 'reminder' ? <Flag size="sm" /> : <Check variant="mini" />}
                <span className="fd-monthrow__title">{ev.title}</span>
                {ev.hora ? <span className="fd-monthrow__when">{ev.hora}</span> : null}
              </Link>
            ))}
            {day.classes.length === 0 && day.events.length === 0 ? (
              <span className="fd-empty">Nada este día</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
