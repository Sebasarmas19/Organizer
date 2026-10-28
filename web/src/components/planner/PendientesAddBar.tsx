'use client';

/* ============================================================================
   Organizer · <PendientesAddBar>  ·  Barra de añadir en Pendientes

   Abre CreateTaskSheet o CreateReminderSheet como hojas modales de iOS,
   evitando la navegación de página y los estados de carga en blanco.
   ========================================================================= */

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { CreateTaskSheet } from './CreateTaskSheet';
import { CreateReminderSheet } from './CreateReminderSheet';
import type { ReminderOption } from '@/lib/planner-data';
import { parseCapture } from '@/lib/capture/parse';
import { safeCreateTask } from '@/lib/offline-sync';

export function PendientesAddBar({
  view,
  todayStr,
  reminders,
}: {
  view: 'tareas' | 'recordatorios';
  todayStr: string;
  reminders: ReminderOption[];
}) {
  const router = useRouter();
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [dismiss, setDismiss] = useState(false);
  const [isPending, startTransition] = useTransition();

  const now = useMemo(() => {
    const d = new Date();
    return { date: todayStr, minutes: d.getHours() * 60 + d.getMinutes() };
  }, [todayStr]);

  const parsed = useMemo(() => {
    if (!draft.trim() || dismiss) return null;
    const p = parseCapture(draft, now);
    return p.date || p.time ? p : null;
  }, [draft, now, dismiss]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isPending) return;

    startTransition(async () => {
      const p = parseCapture(text, now);
      await safeCreateTask({
        title: p.title || text,
        dueOn: dismiss ? null : p.date,
      });
      setDraft('');
      setDismiss(false);
      router.refresh();
    });
  };

  return (
    <>
      <div className="pl-addbar" style={{ marginBottom: 18 }}>
        <form onSubmit={handleQuickSubmit} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDismiss(false);
              }}
              placeholder={
                view === 'tareas'
                  ? 'Anotar tarea rápida (ej. Llamar mañana a las 3)...'
                  : 'Anotar recordatorio...'
              }
              className="fd-search__input"
              style={{ flex: 1, minHeight: 40, fontSize: 14 }}
            />
            {draft.trim() ? (
              <button
                type="submit"
                className="fd-btn fd-btn--primary"
                disabled={isPending}
                style={{ minHeight: 40, whiteSpace: 'nowrap' }}
              >
                Guardar
              </button>
            ) : (
              <button
                type="button"
                className="fd-btn io-press"
                onClick={() =>
                  view === 'tareas' ? setTaskSheetOpen(true) : setReminderSheetOpen(true)
                }
                style={{ minHeight: 40, whiteSpace: 'nowrap' }}
              >
                <Icon name="plus" size="sm" />
                {view === 'tareas' ? 'Detalle' : 'Reminder'}
              </button>
            )}
          </div>
          {parsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12 }}>
              <span
                className="io-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--io-tint-soft)',
                  color: 'var(--io-tint)',
                  fontWeight: 600,
                }}
              >
                {parsed.date ? `📅 ${parsed.date}` : null}
                {parsed.date && parsed.time ? ' · ' : null}
                {parsed.time ? `⏰ ${parsed.time}` : null}
                <button
                  type="button"
                  onClick={() => setDismiss(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontWeight: 'bold',
                  }}
                  aria-label="Descartar fecha detectada"
                >
                  ×
                </button>
              </span>
              <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>Detectado en vivo</span>
            </div>
          ) : null}
        </form>
      </div>

      <CreateTaskSheet
        open={taskSheetOpen}
        onClose={() => setTaskSheetOpen(false)}
        todayStr={todayStr}
        reminders={reminders}
      />

      <CreateReminderSheet
        open={reminderSheetOpen}
        onClose={() => setReminderSheetOpen(false)}
        todayStr={todayStr}
      />
    </>
  );
}
