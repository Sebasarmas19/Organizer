'use client';

/* ============================================================================
   Organizer · Modulo Tareas (FD3 · decisiones 36, 48, 50, 51, 63, 66, 70, 73)
   Portado directamente de `app/comps/tareas.html`.

   Tiene dos pestanas:
     1. TAREAS: lo que entra por Siri o la web. Con carpetas (contexts) y Entrada.
     2. REMINDERS: solo de lectura. Se crean en el calendario (decision 48).
        "Lo que viene" vive aqui y encabeza la lista (decision 73).
   ========================================================================= */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Check } from '@/components/Check';
import { formatRelativeCreated, formatReminderWhen } from '@/lib/dates';
import type { Task, Reminder, Row } from '@/lib/supabase/database.types';
import {
  createTaskAction,
  toggleTaskAction,
  updateTaskAction,
  dropTaskAction,
  deleteTaskAction,
  createContextAction,
  deleteContextAction,
} from './actions';

type ContextRow = Row<'contexts'>;

export function TareasClient({
  initialTasks,
  initialContexts,
  initialReminders,
}: {
  initialTasks: Task[];
  initialContexts: ContextRow[];
  initialReminders: Reminder[];
}) {
  const [tab, setTab] = useState<'tareas' | 'reminders'>('tareas');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [contexts, setContexts] = useState<ContextRow[]>(initialContexts);
  const reminders = initialReminders;

  // Estado para busqueda
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Estado para crear nueva tarea
  const [newTitle, setNewTitle] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<string>('');
  const [selectedReminderId, setSelectedReminderId] = useState<string>('');
  const [selectedContextId, setSelectedContextId] = useState<string>('');
  const [showDateChip, setShowDateChip] = useState(false);
  const [showReminderChip, setShowReminderChip] = useState(false);

  // Estado de carpetas expandidas (por defecto todas o primera abierta)
  const [expandedContextIds, setExpandedContextIds] = useState<string[]>(() =>
    contexts.length > 0 ? [contexts[0].id] : []
  );

  // Modo edicion de carpetas
  const [editingContexts, setEditingContexts] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Tarea seleccionada para accion en hoja/dialogo
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<Task | null>(null);

  const [, startTransition] = useTransition();

  // Filtrado de busqueda
  const q = searchQuery.toLowerCase().trim();

  const filteredTasks = tasks.filter((t) => {
    if (!q) return true;
    return t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
  });

  const filteredReminders = reminders.filter((r) => {
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q);
  });

  // Tareas en "Entrada": inbox sin contexto y sin reminder
  const entradaTasks = filteredTasks.filter(
    (t) => t.status === 'inbox' && !t.context_id && !t.reminder_id
  );

  // Reminders proximos y pasados
  const todayYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const upcomingReminders = filteredReminders.filter((r) => r.occurs_on >= todayYmd);
  const pastReminders = filteredReminders.filter((r) => r.occurs_on < todayYmd);

  // Acciones optimistas para tareas
  function handleToggleTask(task: Task) {
    const nextCompleted = task.status !== 'done';
    setTasks((prev) =>
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
        // Revertir si hay error
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? task : t))
        );
      }
    });
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    const tempId = 'temp-' + Date.now();
    const newTask: Task = {
      id: tempId,
      user_id: '',
      title,
      notes: null,
      status: 'inbox',
      context_id: selectedContextId || null,
      due_on: selectedDueDate || null,
      reminder_id: selectedReminderId || null,
      estimate_min: null,
      advance_notice_days: null,
      created_at: new Date().toISOString(),
      completed_at: null,
      dropped_at: null,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
    setSelectedDueDate('');
    setSelectedReminderId('');
    setSelectedContextId('');
    setShowDateChip(false);
    setShowReminderChip(false);

    startTransition(async () => {
      try {
        const created = await createTaskAction({
          title,
          due_on: newTask.due_on,
          reminder_id: newTask.reminder_id,
          context_id: newTask.context_id,
        });
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      } catch {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    });
  }

  function handleDropTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSelectedTaskForAction(null);
    startTransition(async () => {
      await dropTaskAction(task.id);
    });
  }

  function handleDeleteTask(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSelectedTaskForAction(null);
    startTransition(async () => {
      await deleteTaskAction(task.id);
    });
  }

  function toggleFolderExpanded(contextId: string) {
    setExpandedContextIds((prev) =>
      prev.includes(contextId) ? prev.filter((id) => id !== contextId) : [...prev, contextId]
    );
  }

  function handleCreateContext(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const tempId = 'ctx-temp-' + Date.now();
    const newCtx: ContextRow = {
      id: tempId,
      user_id: '',
      name,
      kind: 'personal',
      color: null,
      archived_at: null,
      created_at: new Date().toISOString(),
    };

    setContexts((prev) => [...prev, newCtx]);
    setExpandedContextIds((prev) => [...prev, tempId]);
    setNewFolderName('');
    setShowNewFolderInput(false);

    startTransition(async () => {
      try {
        const created = await createContextAction(name, 'personal');
        setContexts((prev) => prev.map((c) => (c.id === tempId ? created : c)));
        setExpandedContextIds((prev) =>
          prev.map((id) => (id === tempId ? created.id : id))
        );
      } catch {
        setContexts((prev) => prev.filter((c) => c.id !== tempId));
      }
    });
  }

  function handleDeleteContext(contextId: string) {
    setContexts((prev) => prev.filter((c) => c.id !== contextId));
    setTasks((prev) =>
      prev.map((t) => (t.context_id === contextId ? { ...t, context_id: null } : t))
    );
    startTransition(async () => {
      await deleteContextAction(contextId);
    });
  }

  return (
    <div className="flex flex-col flex-1 pb-16">
      {/* -------------------------------------------------------- CABECERA */}
      <header className="pagehead" style={{ paddingBottom: 'var(--space-3)' }}>
        <h1 className="t-title">Tareas</h1>
        <div className="flex items-center" style={{ marginRight: 'calc(var(--space-3) * -1)' }}>
          <button
            type="button"
            className="tapicon"
            aria-label="Buscar en tareas"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Icon name="search" size="lg" />
          </button>
          <Link
            href="/atajo"
            className="tapicon"
            aria-label="Configurar Atajo de Siri"
            title="Configurar Atajo de Siri"
          >
            <Icon name="link" size="lg" />
          </Link>
        </div>
      </header>

      {/* Barra de busqueda desplegable */}
      {showSearch && (
        <div className="gutter pb-3">
          <div className="field">
            <Icon name="search" size="sm" />
            <input
              type="search"
              placeholder="Buscar tareas y reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="tapicon"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar busqueda"
                style={{ width: 32, height: 32 }}
              >
                <Icon name="xmark" size="sm" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------- CONTROL SEGMENTADO */}
      <div className="gutter pb-4">
        <div className="seg" role="tablist" aria-label="Que se ve">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tareas'}
            onClick={() => setTab('tareas')}
          >
            Tareas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reminders'}
            onClick={() => setTab('reminders')}
          >
            Reminders
          </button>
        </div>
      </div>

      {/* ==================================================================
          PESTAÑA 1 · TAREAS
          ================================================================== */}
      {tab === 'tareas' && (
        <>
          {/* ESCRIBIENDO UNA TAREA (Comp FD3) */}
          <div className="gutter pb-4">
            <form onSubmit={handleCreateTask}>
              <label className="field field--focus block" htmlFor="nueva-tarea">
                <input
                  id="nueva-tarea"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Escribe una tarea y pulsa intro..."
                  aria-label="Nueva tarea"
                />
              </label>

              {/* Pastillas opcionales de captura sin friccion */}
              <div className="chips" style={{ paddingTop: 'var(--space-3)' }}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={showDateChip}
                  onClick={() => setShowDateChip(!showDateChip)}
                >
                  <Icon name="calendar" size="sm" />
                  <span>{selectedDueDate ? selectedDueDate : 'Fecha'}</span>
                </button>

                <button
                  type="button"
                  className="chip"
                  aria-pressed={showReminderChip}
                  onClick={() => setShowReminderChip(!showReminderChip)}
                >
                  <Icon name="flag" size="sm" />
                  <span>
                    {selectedReminderId
                      ? reminders.find((r) => r.id === selectedReminderId)?.title || 'Reminder'
                      : 'Reminder'}
                  </span>
                </button>

                <span className="t-label c-faint self-center">opcionales</span>
              </div>

              {/* Selectores desplegables al activar pastillas */}
              {showDateChip && (
                <div className="mt-2 p-2 bg-sunken rounded flex items-center gap-2">
                  <span className="t-label c-muted">Fecha tope:</span>
                  <input
                    type="date"
                    value={selectedDueDate}
                    onChange={(e) => setSelectedDueDate(e.target.value)}
                    className="field text-sm"
                    style={{ height: 36 }}
                  />
                  {selectedDueDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDueDate('')}
                      className="taptext text-xs c-muted"
                    >
                      Quitar fecha
                    </button>
                  )}
                </div>
              )}

              {showReminderChip && (
                <div className="mt-2 p-2 bg-sunken rounded flex items-center gap-2">
                  <span className="t-label c-muted">Asociar a:</span>
                  <select
                    value={selectedReminderId}
                    onChange={(e) => setSelectedReminderId(e.target.value)}
                    className="field text-sm flex-1"
                    style={{ height: 36 }}
                  >
                    <option value="">Sin reminder</option>
                    {upcomingReminders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.occurs_on})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>
          </div>

          {/* ------------------------------------------------------ ENTRADA */}
          <section aria-labelledby="h-entrada">
            <div className="sectionhead">
              <h2 id="h-entrada">Entrada</h2>
              <Link href="/atajo" className="taptext t-label">
                Por Siri &rarr;
              </Link>
            </div>

            {entradaTasks.length === 0 ? (
              <div className="gutter py-4 text-center">
                <p className="t-meta c-muted">
                  Bandeja vacia. Captura desde arriba o di <em>&ldquo;Oye Siri, anota…&rdquo;</em>.
                </p>
              </div>
            ) : (
              <ul className="list-none m-0 p-0">
                {entradaTasks.map((task) => (
                  <li
                    key={task.id}
                    className="row"
                    onClick={() => setSelectedTaskForAction(task)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="row__body" style={{ marginLeft: 'var(--space-1)' }}>
                      <p className="row__title">{task.title}</p>
                      <p className="row__meta">
                        <span>por Siri</span>
                        <span className="sep">·</span>
                        <span>{formatRelativeCreated(task.created_at)}</span>
                      </p>
                    </div>
                    <span
                      className="ico ico--sm c-faint"
                      style={{ alignSelf: 'center' }}
                    >
                      <Icon name="chevron-right" size="sm" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --------------------------------------- CARPETAS = CONTEXTOS */}
          <section className="mt-5" aria-labelledby="h-carpetas">
            <div className="sectionhead">
              <h2 id="h-carpetas">Carpetas</h2>
              <button
                type="button"
                className="taptext t-label"
                onClick={() => setEditingContexts(!editingContexts)}
              >
                {editingContexts ? 'Listo' : 'Editar'}
              </button>
            </div>

            <div>
              {contexts.map((ctx) => {
                const isExpanded = expandedContextIds.includes(ctx.id);
                const ctxTasks = filteredTasks.filter((t) => t.context_id === ctx.id);

                return (
                  <div key={ctx.id}>
                    <div className="flex items-center">
                      <button
                        type="button"
                        className="folder flex-1"
                        aria-expanded={isExpanded}
                        onClick={() => toggleFolderExpanded(ctx.id)}
                      >
                        <span className="folder__name">{ctx.name}</span>
                        <span
                          className="ico ico--sm folder__chev"
                          style={{
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform var(--dur-fast) var(--ease-out)',
                          }}
                        >
                          <Icon name="chevron-right" size="sm" />
                        </span>
                      </button>

                      {editingContexts && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContext(ctx.id)}
                          className="tapicon text-muted mr-2"
                          aria-label={`Eliminar carpeta ${ctx.name}`}
                        >
                          <Icon name="trash" size="sm" />
                        </button>
                      )}
                    </div>

                    {/* Subfilas de tareas dentro de la carpeta */}
                    {isExpanded && (
                      <div className="folder__items">
                        {ctxTasks.length === 0 ? (
                          <div className="subrow">
                            <p className="t-meta c-muted">Sin tareas en esta carpeta</p>
                          </div>
                        ) : (
                          ctxTasks.map((task) => {
                            const reminderAssoc = task.reminder_id
                              ? reminders.find((r) => r.id === task.reminder_id)
                              : null;
                            const isDone = task.status === 'done';

                            return (
                              <div
                                key={task.id}
                                className={`subrow ${isDone ? 'row--done' : ''}`}
                              >
                                <div style={{ marginLeft: 'calc(var(--space-6) * -1)' }}>
                                  <Check
                                    checked={isDone}
                                    label={`${task.title}, marcar cumplido`}
                                    onChange={() => handleToggleTask(task)}
                                  />
                                </div>
                                <div className="row__body">
                                  <p className="row__title">{task.title}</p>
                                  <p className="row__meta">
                                    {reminderAssoc ? (
                                      <span className="flex items-center gap-1">
                                        <Icon name="flag" size="sm" className="rem__flag" />
                                        <span>{reminderAssoc.title}</span>
                                      </span>
                                    ) : task.due_on ? (
                                      <span className="num">{task.due_on}</span>
                                    ) : (
                                      <span className="num">sin fecha</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Crear nueva carpeta */}
            {showNewFolderInput ? (
              <form onSubmit={handleCreateContext} className="gutter py-2 flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nombre de la carpeta..."
                  className="field flex-1"
                  autoFocus
                />
                <button type="submit" className="btn btn--primary">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput(false)}
                  className="btn btn--quiet"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="folder c-muted"
                style={{ boxShadow: 'inset 0 1px 0 var(--line)' }}
                onClick={() => setShowNewFolderInput(true)}
              >
                <span className="ico ico--sm" style={{ marginLeft: 2 }}>
                  <Icon name="plus" size="sm" />
                </span>
                <span className="folder__name" style={{ fontWeight: 'var(--weight-regular)' }}>
                  Nueva carpeta
                </span>
              </button>
            )}
          </section>

          <div className="h-4" />
        </>
      )}

      {/* ==================================================================
          PESTAÑA 2 · REMINDERS (Solo de lectura de consulta)
          ================================================================== */}
      {tab === 'reminders' && (
        <>
          {/* LO QUE VIENE (decision 73) */}
          <section aria-labelledby="h-prox">
            <div className="sectionhead">
              <h2 id="h-prox">Lo que viene</h2>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="gutter py-4 text-center">
                <p className="t-meta c-muted">
                  No hay reminders proximos. Se crean tocando un dia en el calendario.
                </p>
              </div>
            ) : (
              upcomingReminders.map((rem) => {
                const assocTasks = tasks.filter((t) => t.reminder_id === rem.id);
                const doneCount = assocTasks.filter((t) => t.status === 'done').length;
                const totalCount = assocTasks.length;
                const pendingCount = totalCount - doneCount;

                return (
                  <Link
                    key={rem.id}
                    href={`/tareas/reminders/${rem.id}`}
                    className="rem no-underline"
                    style={{ color: 'var(--text)' }}
                  >
                    <Icon name="flag" size="sm" className="rem__flag" />
                    <span className="rem__body">
                      <span className="rem__title">{rem.title}</span>
                      <span className="rem__when">
                        {formatReminderWhen(rem.occurs_on, rem.occurs_at)}
                      </span>

                      {/* Estado de preparacion */}
                      {totalCount === 0 ? (
                        <span className="prep prep--none">
                          <Icon name="alert-triangle" size="sm" />
                          <span>Sin tareas todavia</span>
                        </span>
                      ) : (
                        <span className="prep">
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
                      )}
                    </span>

                    {totalCount === 0 ? (
                      <span
                        className="btn"
                        style={{ alignSelf: 'center', paddingInline: 'var(--space-3)' }}
                      >
                        Planificar
                      </span>
                    ) : (
                      <span
                        className="ico ico--sm c-faint self-center"
                        style={{ alignSelf: 'center' }}
                      >
                        <Icon name="chevron-right" size="sm" />
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </section>

          {/* HISTORICO · Bajan solos, sin rojo y sin insignia (decision 49) */}
          <section className="mt-5" aria-labelledby="h-pasados">
            <div className="sectionhead">
              <h2 id="h-pasados">Ya pasaron</h2>
            </div>

            {pastReminders.length === 0 ? (
              <div className="gutter py-2 text-center">
                <p className="t-meta c-muted">No hay reminders pasados en el historico.</p>
              </div>
            ) : (
              pastReminders.map((rem) => (
                <div key={rem.id} className="rem rem--past">
                  <Icon name="flag" size="sm" className="rem__flag" />
                  <div className="rem__body">
                    <p className="rem__title">{rem.title}</p>
                    <p className="rem__when">
                      {formatReminderWhen(rem.occurs_on, rem.occurs_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>

          <div className="flex-1" />

          <p className="gutter t-label c-faint" style={{ paddingBlock: 'var(--space-4)' }}>
            Los reminders se crean tocando un dia en el calendario. Aqui solo se consultan.
          </p>
        </>
      )}

      {/* -------------------------------------------------- HOJA DE ACCIONES */}
      {selectedTaskForAction && (
        <div
          className="overlay"
          onClick={() => setSelectedTaskForAction(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, marginInline: 'auto' }}
          >
            <div className="sheet__grab" />
            <div className="gutter pb-3">
              <h3 className="t-section" style={{ fontSize: 'var(--text-body)' }}>
                {selectedTaskForAction.title}
              </h3>
              <p className="t-label c-muted">
                Capturada {formatRelativeCreated(selectedTaskForAction.created_at)}
              </p>
            </div>

            {/* Mover a carpeta */}
            {contexts.length > 0 && (
              <div className="gutter pb-3">
                <label className="t-label c-muted block mb-1">Mover a carpeta:</label>
                <div className="flex flex-wrap gap-2">
                  {contexts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="chip"
                      aria-pressed={selectedTaskForAction.context_id === c.id}
                      onClick={() => {
                        const targetContextId = c.id;
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === selectedTaskForAction.id
                              ? { ...t, context_id: targetContextId }
                              : t
                          )
                        );
                        setSelectedTaskForAction(null);
                        startTransition(async () => {
                          await updateTaskAction(selectedTaskForAction.id, {
                            context_id: targetContextId,
                          });
                        });
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="opt text-task"
              onClick={() => {
                handleToggleTask(selectedTaskForAction);
                setSelectedTaskForAction(null);
              }}
            >
              <Icon name="check" size="sm" />
              <span>
                {selectedTaskForAction.status === 'done'
                  ? 'Desmarcar cumplida'
                  : 'Marcar como cumplida'}
              </span>
            </button>

            <button
              type="button"
              className="opt"
              onClick={() => handleDropTask(selectedTaskForAction)}
            >
              <Icon name="undo" size="sm" />
              <span>Quitar de Entrada</span>
            </button>

            <button
              type="button"
              className="opt"
              style={{ color: 'var(--text-faint)' }}
              onClick={() => handleDeleteTask(selectedTaskForAction)}
            >
              <Icon name="trash" size="sm" />
              <span>Eliminar definitivamente</span>
            </button>

            <div className="gutter pt-2">
              <button
                type="button"
                className="btn btn--quiet w-full"
                onClick={() => setSelectedTaskForAction(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
