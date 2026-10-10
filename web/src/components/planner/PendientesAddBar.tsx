'use client';

/* ============================================================================
   Organizer · <PendientesAddBar>  ·  Barra de añadir en Pendientes

   Abre CreateTaskSheet o CreateReminderSheet como hojas modales de iOS,
   evitando la navegación de página y los estados de carga en blanco.
   ========================================================================= */

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { CreateTaskSheet } from './CreateTaskSheet';
import { CreateReminderSheet } from './CreateReminderSheet';
import type { ReminderOption } from '@/lib/planner-data';

export function PendientesAddBar({
  view,
  todayStr,
  reminders,
}: {
  view: 'tareas' | 'recordatorios';
  todayStr: string;
  reminders: ReminderOption[];
}) {
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);

  return (
    <>
      <div className="pl-addbar" style={{ marginBottom: 18 }}>
        {view === 'tareas' ? (
          <button
            type="button"
            className="fd-btn io-press"
            onClick={() => setTaskSheetOpen(true)}
          >
            <Icon name="plus" size="sm" />
            Tarea con fecha u hora
          </button>
        ) : (
          <button
            type="button"
            className="fd-btn io-press"
            onClick={() => setReminderSheetOpen(true)}
          >
            <Icon name="plus" size="sm" />
            Nuevo reminder
          </button>
        )}
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
