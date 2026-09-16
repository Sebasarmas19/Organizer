'use client';

/* ============================================================================
   Organizer · <AddSheet> (F2 · decisiones 60, 70, 71 · app/comps/anadir.html)

   La pantalla más importante del encargo:
   - Dos estados: Tarea y Reminder (aquí SÍ se pregunta el tipo, decisión 70).
   - Estado Tarea: lo primero que se ve es la lista de tareas ya capturadas y
     nunca planificadas (el puente del producto).
     Regla 1: Ningún contador en el encabezado.
     Regla 2: Ninguna edad ("llevas 12 días sin tocar esto").
     Regla 3: Confirmación en positivo y en concreto ("Poner 2 en el jueves 17").
   - Estado Reminder: título, fecha (pre-rellenada), hora opcional, aviso anticipado
     (1 día por defecto, decisión 60) y notas.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import type { Task } from '@/lib/supabase/database.types';
import { formatDayTitle } from '@/lib/date-utils';
import { createReminderAction, planTasksAction } from '@/lib/calendar-actions';

export function AddSheet({
  isOpen,
  onClose,
  initialDateStr,
  initialTab = 'tarea',
  unplannedTasks = [],
  contexts = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  initialDateStr: string;
  initialTab?: 'tarea' | 'reminder';
  unplannedTasks: Task[];
  contexts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<'tarea' | 'reminder'>(initialTab);

  // Tarea state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showNewTaskInput, setShowNewTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');

  // Reminder state
  const [remTitle, setRemTitle] = useState('');
  const [remDate, setRemDate] = useState(initialDateStr);
  const [remTime, setRemTime] = useState('');
  const [noticeDays, setNoticeDays] = useState(1); // 1 día por defecto (decisión 60)
  const [remNotes, setRemNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const contextMap = new Map(contexts.map((c) => [c.id, c.name]));
  const targetDateTitle = formatDayTitle(initialDateStr);
  const dateParts = targetDateTitle.split(' ');
  const shortDate = `${dateParts[0]} ${dateParts[1] || ''}`.trim(); // ej. "jueves 17"

  const toggleSelectTask = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePlanTasks = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await planTasksAction({
        dateStr: initialDateStr,
        itemIds: selectedIds,
        newTaskTitle: newTaskTitle.trim() || null,
        startTimeStr: taskTime || '09:00',
        durationMin: 60,
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al planificar las tareas');
      }
    });
  };

  const handleSaveReminder = () => {
    if (!remTitle.trim()) {
      setErrorMsg('Escribe un título para el reminder');
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createReminderAction({
        title: remTitle.trim(),
        occurs_on: remDate || initialDateStr,
        occurs_at: remTime || null,
        notice_days: noticeDays,
        notes: remNotes.trim() || null,
      });

      if (res.ok) {
        onClose();
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Error al guardar el reminder');
      }
    });
  };

  const totalCount = selectedIds.length + (newTaskTitle.trim() ? 1 : 0);

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="sheet"
        style={{
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="sheet__grab" aria-hidden="true" />

        <div className="sheethead">
          <div>
            <h2 className="t-section">Añadir al {shortDate}</h2>
          </div>
          <button
            type="button"
            className="tapicon"
            aria-label="Cerrar"
            onClick={onClose}
            style={{ marginRight: 'calc(var(--space-2) * -1)' }}
          >
            <Icon name="xmark" size="lg" />
          </button>
        </div>

        {/* Selector Tarea / Reminder */}
        <div className="gutter" style={{ paddingBottom: 'var(--space-4)' }}>
          <div className="seg" role="tablist" aria-label="Qué estás añadiendo">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'tarea'}
              onClick={() => setTab('tarea')}
            >
              Tarea
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'reminder'}
              onClick={() => setTab('reminder')}
            >
              Reminder
            </button>
          </div>
        </div>

        {errorMsg ? (
          <div className="gutter" style={{ paddingBottom: 'var(--space-2)' }}>
            <p className="t-label" style={{ color: 'var(--rem)' }}>
              {errorMsg}
            </p>
          </div>
        ) : null}

        {/* ESTADO 1: TAREA */}
        {tab === 'tarea' ? (
          <>
            <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
              <div className="sectionhead">
                <h3>Lo que ya tienes anotado</h3>
              </div>

              {unplannedTasks.length === 0 && !showNewTaskInput ? (
                <div className="gutter py-4">
                  <p className="t-meta c-muted">
                    No tienes tareas sin planificar ahora mismo.
                  </p>
                </div>
              ) : null}

              {unplannedTasks.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const ctxName = item.context_id ? contextMap.get(item.context_id) : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pick"
                    aria-pressed={isSelected}
                    onClick={() => toggleSelectTask(item.id)}
                  >
                    <span className="pick__bar" />
                    <span className="pick__body">
                      <span className="pick__title block">{item.title}</span>
                      {ctxName ? <span className="pick__meta">{ctxName}</span> : null}
                    </span>
                    <span className="pick__mark">
                      <Icon name="check" size="sm" style={{ width: 14, height: 14 }} />
                    </span>
                  </button>
                );
              })}

              {/* Nueva tarea inline */}
              {showNewTaskInput ? (
                <div className="gutter py-3" style={{ borderTop: '1px solid var(--line)' }}>
                  <label className="t-label c-muted font-semibold block mb-1">
                    Nueva tarea
                  </label>
                  <div className="field">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="¿Qué vas a hacer?"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1">
                      <label className="t-label c-muted block mb-1">Hora de inicio (opcional)</label>
                      <input
                        type="time"
                        className="field w-full text-sm"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        placeholder="09:00"
                      />
                    </div>
                    <button
                      type="button"
                      className="taptext t-meta c-muted mt-5"
                      onClick={() => {
                        setShowNewTaskInput(false);
                        setNewTaskTitle('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="pick"
                  style={{ color: 'var(--task)' }}
                  onClick={() => setShowNewTaskInput(true)}
                >
                  <span className="pick__bar" style={{ background: 'transparent' }} />
                  <span className="pick__body">
                    <span className="pick__title block" style={{ color: 'var(--task)' }}>
                      Escribir una nueva
                    </span>
                  </span>
                  <Icon name="plus" size="md" />
                </button>
              )}
            </div>

            <div className="gutter" style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                disabled={totalCount === 0 || isPending}
                onClick={handlePlanTasks}
              >
                {totalCount > 0
                  ? `Poner ${totalCount} en el ${shortDate}`
                  : `Selecciona una tarea para el ${shortDate}`}
              </button>
            </div>
          </>
        ) : (
          /* ESTADO 2: REMINDER */
          <>
            <div className="gutter" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
              <label className="t-label c-muted font-semibold block mb-1" htmlFor="rem-titulo">
                Título
              </label>
              <div className="field">
                <input
                  id="rem-titulo"
                  type="text"
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder="Defensa del proyecto, Parcial..."
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <label className="t-label c-muted font-semibold block mb-1 mt-4" htmlFor="rem-fecha">
                Fecha
              </label>
              <div className="field">
                <input
                  id="rem-fecha"
                  type="date"
                  value={remDate}
                  onChange={(e) => setRemDate(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none"
                />
              </div>

              <div className="flex gap-3 mt-4">
                <div className="flex-1 min-w-0">
                  <label className="t-label c-muted font-semibold block mb-1" htmlFor="rem-hora">
                    Hora (opcional)
                  </label>
                  <div className="field">
                    <input
                      id="rem-hora"
                      type="time"
                      value={remTime}
                      onChange={(e) => setRemTime(e.target.value)}
                      className="w-full bg-transparent border-0 outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <label className="t-label c-muted font-semibold block mb-1" htmlFor="rem-aviso">
                    Avisar
                  </label>
                  <div className="field">
                    <select
                      id="rem-aviso"
                      value={noticeDays}
                      onChange={(e) => setNoticeDays(Number(e.target.value))}
                      className="w-full bg-transparent border-0 outline-none text-inherit"
                    >
                      <option value={0}>El mismo día</option>
                      <option value={1}>1 día antes</option>
                      <option value={2}>2 días antes</option>
                      <option value={3}>3 días antes</option>
                      <option value={7}>1 semana antes</option>
                    </select>
                  </div>
                </div>
              </div>

              <label className="t-label c-muted font-semibold block mb-1 mt-4" htmlFor="rem-notas">
                Notas
              </label>
              <div
                className="field"
                style={{
                  height: 'auto',
                  alignItems: 'flex-start',
                  paddingBlock: 'var(--space-3)',
                }}
              >
                <textarea
                  id="rem-notas"
                  rows={2}
                  value={remNotes}
                  onChange={(e) => setRemNotes(e.target.value)}
                  placeholder="Opcional"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    font: 'inherit',
                    fontSize: 'var(--text-body)',
                    color: 'var(--text)',
                    background: 'none',
                    border: 0,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <p className="t-label c-muted mt-3">
                Después podrás asociarle tareas. Es lo que convierte &quot;lo sé&quot; en &quot;me estoy preparando&quot;.
              </p>
            </div>

            <div className="gutter" style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                disabled={isPending || !remTitle.trim()}
                onClick={handleSaveReminder}
              >
                Guardar el reminder
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
