'use client';

/* ============================================================================
   Organizer · FD4 · <CompletedSection>
   Histórico de tareas completadas recientemente.
   Plegado por defecto para no saturar la vista activa. Permite consultar
   lo terminado y desmarcar si fue un error.
   ========================================================================= */

import { useState } from 'react';
import type { TaskRowData } from './TaskRow';
import { TaskRow } from './TaskRow';
import { Icon } from '@/components/Icon';

export function CompletedSection({ items }: { items: TaskRowData[] }) {
  const [open, setOpen] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <section className="fd-completed-section" style={{ marginTop: '24px' }}>
      <button
        type="button"
        className="fd-completed__toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          padding: '12px 0',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          color: 'var(--text-muted)',
          fontSize: 'var(--fd-sub)',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size="sm" />
        <span>Completadas recientemente ({items.length})</span>
      </button>

      {open ? (
        <div className="fd-card" style={{ marginTop: '6px' }}>
          <div className="fd-card__body">
            {items.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
