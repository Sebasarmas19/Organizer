'use client';

/* ============================================================================
   Organizer · Hilo · lo que va dentro de las burbujas ricas

   Solo pintan. Lo marcado, lo saltado y lo que vuela vive en HiloScreen;
   aqui llegan las filas ya decididas por lib/thread.ts.

   EL DIA. Las clases de hoy y las tareas por hora, como el resumen de la
   manana pero entero: las clases que ya terminaron en gris, las tareas con
   su circulo para marcarlas sin salir del hilo. Tocar una clase abre el
   horario (antes era el enlace "Horario"); tocar una tarea, la tarea.

   SE VIENE. Parciales y entregas con su preparacion resumida, sin etiqueta
   encima: el banderin y la fecha ya dicen que es. La fila entera
   abre el reminder, y "Planificar" lleva al mismo sitio (ahi se anaden los
   pasos): por eso es texto y no un enlace dentro de otro enlace.
   ========================================================================= */

import Link from 'next/link';
import type { HomeReminder } from '@/lib/home';
import { shortWhen, type ClassNote } from '@/components/fd4/homeSchedule';
import { weekSub, type DigestRow } from '@/lib/thread';
import { Glyph } from '@/components/ios/Glyph';

export type DigestTaskRow = Extract<DigestRow, { kind: 'task' }>;

export function DigestBody({
  rows,
  note,
  popped,
  onToggle,
}: {
  rows: DigestRow[];
  /** "Sin más clases hoy" y con que empieza manana. `null` sin horario. */
  note: ClassNote;
  /** Tareas marcadas en esta sesion: su circulo rebota al llenarse. */
  popped: string[];
  onToggle: (row: DigestTaskRow, from: HTMLElement) => void;
}) {
  if (rows.length === 0) {
    return (
      <>
        <p>Hoy no hay clases ni nada con fecha.</p>
        {note?.next ? <p className="hl-note">{note.next}.</p> : null}
      </>
    );
  }

  const hasTimedTask = rows.some((r) => r.kind === 'task' && r.time !== '');

  return (
    <>
      {rows.map((r) =>
        r.kind === 'class' ? (
          <Link key={r.key} href="/clases" className="hl-dg" data-dim={r.dim}>
            <span className="hl-dg__tm">{r.time}</span>
            <span className="hl-dg__mk" aria-hidden="true">
              <i className="hl-dot" />
            </span>
            <span className="hl-dg__t">
              {r.title}
              {r.now || r.place ? (
                <span className="hl-dg__sub">{[r.now ? 'Ahora' : '', r.place].filter(Boolean).join(' · ')}</span>
              ) : null}
            </span>
          </Link>
        ) : (
          <div key={r.key} className="hl-dg" data-dim={r.done}>
            <span className="hl-dg__tm">{r.time}</span>
            <span className="hl-dg__mk">
              <button
                type="button"
                className="hl-ringbtn"
                aria-pressed={r.done}
                aria-label={r.done ? `Desmarcar ${r.title}` : `Marcar hecha ${r.title}`}
                onClick={(e) => onToggle(r, e.currentTarget)}
              >
                <span
                  className="hl-ring"
                  data-on={r.done}
                  data-pop={r.done && popped.includes(r.id) ? 'true' : undefined}
                >
                  <svg viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M3.2 7.3l2.5 2.5 5.1-5.6" />
                  </svg>
                </span>
              </button>
            </span>
            <span className="hl-dg__t">
              <Link href={`/tareas/${r.id}`}>{r.title}</Link>
              {r.sub ? <span className="hl-dg__sub">{r.sub}</span> : null}
              {r.rem ? (
                <span className="hl-dg__sub">
                  <Glyph name="flag" />
                  {r.rem}
                </span>
              ) : null}
            </span>
          </div>
        )
      )}

      {note ? (
        <p className="hl-note">
          {note.line}
          {hasTimedTask ? '.' : '. Nada más con hora.'}
          {note.next ? ` ${note.next}.` : null}
        </p>
      ) : null}
    </>
  );
}

export function WeekBody({ semana }: { semana: HomeReminder[] }) {
  return (
    <>
      {semana.length === 0 ? (
        <p>No hay parciales ni entregas a la vista. Añádelos y te aviso con tiempo.</p>
      ) : (
        semana.map((r) => {
          const sub = weekSub(r);
          return (
            <Link key={r.id} href={`/reminders/${r.id}`} className="hl-up">
              <Glyph name="flag" className="hl-flag" />
              <span className="hl-up__t">{r.title}</span>
              <span className="hl-up__when">{shortWhen(r.when)}</span>
              <span className="hl-up__sub">
                {sub.text}
                {sub.plan ? (
                  <>
                    {' · '}
                    <span className="hl-up__plan">Planificar</span>
                  </>
                ) : null}
              </span>
            </Link>
          );
        })
      )}
    </>
  );
}
