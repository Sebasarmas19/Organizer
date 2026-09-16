'use client';

/* ============================================================================
   Organizer · Detalle de Reminder (FD2 · decisiones 49, 50, 51)
   Portado directamente de `app/comps/reminder-detalle.html`.

   Responde: "¿me estoy preparando, o solo lo se?".
   Muestra:
     - Tareas asociadas a este reminder, con casillas para marcarlas.
     - Estado de preparacion con barra de puntos.
     - Si no tiene tareas: aviso sin alarma y seccion "Ya tenias anotado"
       con boton "Asociar" de 1 toque.
   ========================================================================= */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Check } from '@/components/Check';
import {
  formatReminderDetailDate,
  formatRelativeDays,
  getDayDifference,
} from '@/lib/dates';
import type { Task, Reminder, Row } from '@/lib/supabase/database.types';
import {
  createTaskAction,
  toggleTaskAction,
  associateTaskToReminderAction,
} from '../../actions';

type ContextRow = Row<'contexts'>;

export function ReminderDetailClient({
  reminder,
  context,
  initialAssociatedTasks,
  initialUnassociatedTasks,
}: {
  reminder: Reminder;
  context: ContextRow | null;
  initialAssociatedTasks: Task[];
  initialUnassociatedTasks: Task[];
}) {
  const [associatedTasks, setAssociatedTasks] = useState<Task[]>(initialAssociatedTasks);
  const [unassociatedTasks, setUnassociatedTasks] = useState<Task[]>(initialUnassociatedTasks);

  const [showAddTaskInput, setShowAddTaskInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [, startTransition] = useTransition();

  const totalCount = associatedTasks.length;
  const doneCount = associatedTasks.filter((t) => t.status === 'done').length;
  const pendingCount = totalCount - doneCount;

  // Calculo de dias restantes
  const diffDays = getDayDifference(reminder.occurs_on);

  function handleToggleTask(task: Task) {
    const nextCompleted = task.status !== 'done';
    setAssociatedTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: nextCompleted ? 'done' : 'inbox',
              completed_at: nextCompleted ? new Date().toISOString() : null,
            }
          : t
      )
    );

    startTransition(async () => {
      try {
        await toggleTaskAction(task.id, nextCompleted);
      } catch {
        // Revertir en caso de fallo
        setAssociatedTasks((prev) =>
          prev.map((t) => (t.id === task.id ? task : t))
        );
      }
    });
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    const tempId = 'temp-' + Date.now();
    const newTask: Task = {
      id: tempId,
      user_id: '',
      title,
      notes: null,
      status: 'inbox',
      context_id: reminder.context_id,
      due_on: reminder.occurs_on,
      reminder_id: reminder.id,
      estimate_min: null,
      advance_notice_days: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      dropped_at: null,
    };

    setAssociatedTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    setShowAddTaskInput(false);

    startTransition(async () => {
      try {
        const created = await createTaskAction({
          title,
          reminder_id: reminder.id,
          context_id: reminder.context_id,
          due_on: reminder.occurs_on,
        });
        setAssociatedTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      } catch {
        setAssociatedTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    });
  }

  function handleAssociateTask(task: Task) {
    // Optimista: mover de sueltas a asociadas
    setUnassociatedTasks((prev) => prev.filter((t) => t.id !== task.id));
    setAssociatedTasks((prev) => [...prev, { ...task, reminder_id: reminder.id }]);

    startTransition(async () => {
      try {
        await associateTaskToReminderAction(task.id, reminder.id);
      } catch {
        // Revertir si falla
        setAssociatedTasks((prev) => prev.filter((t) => t.id !== task.id));
        setUnassociatedTasks((prev) => [...prev, task]);
      }
    });
  }

  return (
    <div className="flex flex-col flex-1 pb-16">
      {/* Barra superior de volver */}
      <div
        className="flex items-center justify-between gutter"
        style={{ paddingBlock: 'var(--space-1)' }}
      >
        <Link href="/tareas" className="taptext taptext--quiet t-meta" aria-label="Volver a Tareas">
          <Icon name="chevron-left" size="sm" />
          <span>Tareas</span>
        </Link>
      </div>

      {/* Cabecera del reminder */}
      <header className="remhead">
        <p className="remhead__when">
          <Icon name="flag" size="sm" className="rem__flag" />
          <span>{formatReminderDetailDate(reminder.occurs_on, reminder.occurs_at)}</span>
        </p>

        <h1 className="t-title mt-1">{reminder.title}</h1>

        <p className="t-meta c-muted mt-1 flex items-center gap-2">
          {context ? <span>{context.name}</span> : null}
          {context ? <span className="sep">·</span> : null}
          <span>{formatRelativeDays(reminder.occurs_on)}</span>
        </p>
      </header>

      {/* ==================================================================
          ESTADO CON TAREAS ASOCIADAS
          ================================================================== */}
      {totalCount > 0 ? (
        <section aria-labelledby="h-tareas">
          <div className="sectionhead">
            <h2 id="h-tareas">Para prepararlo</h2>
            <span className="prep" style={{ margin: 0 }}>
              <span className="prep__bar">
                <i className={doneCount >= 1 ? 'on' : ''} />
                <i className={doneCount >= 2 ? 'on' : ''} />
                <i className={doneCount >= totalCount && totalCount > 0 ? 'on' : ''} />
              </span>
              <span>
                {pendingCount === 0
                  ? 'todo listo'
                  : pendingCount === 1
                  ? 'falta 1'
                  : `faltan ${pendingCount}`}
              </span>
            </span>
          </div>

          <ul className="list-none m-0 p-0">
            {associatedTasks.map((task) => {
              const isDone = task.status === 'done';
              return (
                <li key={task.id} className={`row ${isDone ? 'row--done' : ''}`}>
                  <Check
                    checked={isDone}
                    label={`${task.title}, marcar cumplido`}
                    onChange={() => handleToggleTask(task)}
                  />
                  <div className="row__body">
                    <p className="row__title">{task.title}</p>
                    {task.due_on ? (
                      <p className="row__meta num">{task.due_on}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Anadir tarea asociada */}
          {showAddTaskInput ? (
            <form onSubmit={handleCreateTask} className="gutter py-2 flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nombre de la tarea para este reminder..."
                className="field flex-1"
                autoFocus
              />
              <button type="submit" className="btn btn--primary">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowAddTaskInput(false)}
                className="btn btn--quiet"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="row w-full text-left"
              style={{ color: 'var(--accent)' }}
              onClick={() => setShowAddTaskInput(true)}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 'var(--tap-min)',
                  height: 'var(--tap-min)',
                  margin: '-10px 0 -10px calc(var(--space-2) * -1.5)',
                }}
              >
                <Icon name="plus" size="sm" />
              </span>
              <span className="row__body">
                <span className="row__title" style={{ color: 'var(--accent)' }}>
                  Anadir una tarea
                </span>
              </span>
            </button>
          )}
        </section>
      ) : (
        /* ==================================================================
           ESTADO SIN NINGUNA TAREA (Comp 2: "Sin preparar")
           ================================================================== */
        <>
          <section className="gutter" aria-labelledby="h-vacio">
            <div className="rounded bg-sunken p-4">
              <p className="prep prep--none" style={{ margin: 0, fontSize: 'var(--text-body)' }}>
                <Icon name="alert-triangle" size="sm" />
                <span>Ninguna tarea planificada todavia</span>
              </p>
              <p className="t-meta c-muted mt-2">
                Lo tienes anotado, pero no te has puesto.{' '}
                {diffDays > 0 ? `${diffDays} dias dan para preparar varias sesiones cortas.` : ''}
              </p>

              {showAddTaskInput ? (
                <form onSubmit={handleCreateTask} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Escribe la primera tarea..."
                    className="field flex-1"
                    autoFocus
                  />
                  <button type="submit" className="btn btn--primary">
                    Guardar
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddTaskInput(true)}
                  className="btn btn--primary btn--full mt-4"
                >
                  <Icon name="plus" size="sm" />
                  <span>Planificar una tarea</span>
                </button>
              )}
            </div>
          </section>

          {/* Ya tenias anotado (para asociar en 1 toque) */}
          {unassociatedTasks.length > 0 && (
            <section className="mt-5" aria-labelledby="h-suelto">
              <div className="sectionhead">
                <h2 id="h-suelto">Ya tenias anotado</h2>
              </div>
              <div className="divide-y divide-line">
                {unassociatedTasks.map((task) => (
                  <div key={task.id} className="row">
                    <div className="row__body">
                      <p className="row__title">{task.title}</p>
                      <p className="row__meta">
                        <span>en Tareas</span>
                        <span className="sep">·</span>
                        <span>sin fecha</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAssociateTask(task)}
                      className="btn"
                      style={{ alignSelf: 'center', paddingInline: 'var(--space-3)' }}
                    >
                      Asociar
                    </button>
                  </div>
                ))}
              </div>
              <p className="gutter t-label c-faint pt-2">
                Asociar es opcional. Una tarea sin reminder vale exactamente igual.
              </p>
            </section>
          )}
        </>
      )}

      {/* Notas del reminder */}
      {reminder.notes && (
        <section className="gutter mt-5" aria-labelledby="h-notas">
          <h2 id="h-notas" className="t-label c-muted font-semibold mb-1">
            Notas
          </h2>
          <p className="t-meta c-muted">{reminder.notes}</p>
        </section>
      )}

      <div className="flex-1" />

      <p className="gutter t-label c-faint" style={{ paddingBlock: 'var(--space-4)' }}>
        Cuando pase la fecha, esto baja al historico solo. No hay nada que marcar.
      </p>
    </div>
  );
}
