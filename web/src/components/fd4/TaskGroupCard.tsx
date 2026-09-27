'use client';

/* ============================================================================
   Organizer · <TaskGroupCard>  ·  un grupo de Pendientes con techo

   Con TDAH una lista de 12 equivale a una vacia (DESIGN.md). Cada grupo
   enseña cinco y pliega el resto detras de "Ver el resto". Sin numero: un
   numero ahi seria un contador de deuda (prohibicion 2 de DESIGN.md). Nada
   se esconde en silencio: el enlace dice que hay mas.
   ========================================================================= */

import { useState } from 'react';
import type { TaskRowData } from './TaskRow';
import { TaskRow } from './TaskRow';
import { Dot } from './Marks';
import { Icon } from '@/components/Icon';

const VISIBLE = 5;

export function TaskGroupCard({ label, items }: { label: string; items: TaskRowData[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;

  return (
    <section>
      <div className="fd-seclabel">
        <Dot entity="task" />
        <h2>{label}</h2>
      </div>

      <div className="fd-card">
        <span className="fd-card__rail fd-card__rail--task" aria-hidden />
        <div className="fd-card__body">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} roomy />
          ))}
          {hidden > 0 ? (
            <button type="button" className="fd-more" onClick={() => setOpen(true)}>
              <span>Ver el resto</span>
              <Icon name="chevron-right" size="sm" className="fd-more__chev" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
