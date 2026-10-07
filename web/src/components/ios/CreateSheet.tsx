'use client';

/* ============================================================================
   Organizer · <CreateSheet>  ·  el + de Inicio

   En Inicio, anotar algo es el campo de abajo: se escribe y ya. El + es para
   lo que lleva estructura: una tarea con su dia, un reminder (parcial,
   entrega) o pedirle al asistente que proponga cuando. Antes vivian en la
   cabecera ("Planear") y en "Se viene" ("+ Reminder").
   ========================================================================= */

import Link from 'next/link';
import { Glyph } from './Glyph';
import { Sheet } from './Sheet';

export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Crear">
      <div className="io-group io-group--icons">
        <Link href="/planear" className="io-cell" onClick={onClose}>
          <span className="io-ico io-ico--tint">
            <Glyph name="clock" />
          </span>
          <span className="io-cell__txt">
            Planear con el asistente
            <span className="io-cell__sub">Mira tu agenda y propone cuándo</span>
          </span>
          <Glyph name="chevron" className="io-chev" />
        </Link>
        <Link href="/tareas/nueva" className="io-cell" onClick={onClose}>
          <span className="io-ico io-ico--tint">
            <Glyph name="check" />
          </span>
          <span className="io-cell__txt">
            Tarea con fecha
            <span className="io-cell__sub">Con su día y, si quieres, su hora</span>
          </span>
          <Glyph name="chevron" className="io-chev" />
        </Link>
        <Link href="/reminders/nuevo" className="io-cell" onClick={onClose}>
          <span className="io-ico io-ico--rem">
            <Glyph name="flag" />
          </span>
          <span className="io-cell__txt">
            Reminder
            <span className="io-cell__sub">Un parcial, una entrega, una cita</span>
          </span>
          <Glyph name="chevron" className="io-chev" />
        </Link>
      </div>
    </Sheet>
  );
}
