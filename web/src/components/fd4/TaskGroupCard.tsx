'use client';

/* ============================================================================
   Organizer · <TaskGroupCard>  ·  un grupo de Pendientes con techo

   Con TDAH una lista de 12 equivale a una vacia (DESIGN.md). Cada grupo
   enseña cinco y pliega el resto detras de "Ver el resto". Sin numero: un
   numero ahi seria un contador de deuda (prohibicion 2 de DESIGN.md). Nada
   se esconde en silencio: el enlace dice que hay mas.
   ========================================================================= */

import { useState, useSyncExternalStore } from 'react';
import type { TaskRowData } from './TaskRow';
import { TaskRow } from './TaskRow';
import { Icon } from '@/components/Icon';

const VISIBLE = 5;

const noopSubscribe = () => () => {};

export function TaskGroupCard({ label, items }: { label: string; items: TaskRowData[] }) {
  const storageKey = `organizer:group:${label}`;
  const isStoredOpen = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return sessionStorage.getItem(storageKey) === 'true';
      } catch {
        return false;
      }
    },
    () => false
  );

  const [overrideOpen, setOverrideOpen] = useState<boolean | null>(null);
  const open = overrideOpen ?? isStoredOpen;

  const handleOpen = () => {
    setOverrideOpen(true);
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch {}
  };

  const handleClose = () => {
    setOverrideOpen(false);
    try {
      sessionStorage.setItem(storageKey, 'false');
    } catch {}
  };

  const shown = open ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;

  return (
    <section className="fd5-group">
      <div className="fd5-sec__head">
        <h2>{label}</h2>
      </div>

      <div className="fd-card fd5-card">
        <div className="fd-card__body">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} roomy />
          ))}
          {hidden > 0 ? (
            <button type="button" className="fd-more" onClick={handleOpen}>
              <span>Ver el resto</span>
              <Icon name="chevron-right" size="sm" className="fd-more__chev" />
            </button>
          ) : open && items.length > VISIBLE ? (
            <button type="button" className="fd-more" onClick={handleClose}>
              <span>Ver menos</span>
              <Icon name="chevron-left" size="sm" className="fd-more__chev" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
