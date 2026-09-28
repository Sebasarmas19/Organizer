'use client';

/* ============================================================================
   Organizer · Un reminder y su preparación

   La pregunta que responde: "¿me estoy preparando, o solo lo sé?"
   (docs/08-modelo-tareas-reminders.md). Por eso lo primero es el progreso,
   y lo segundo, un campo para partirlo en tareas con fecha sin salir de aquí.
   ========================================================================= */

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReminderDetail } from '@/lib/planner-data';
import { createTask, linkTaskToReminder } from '@/lib/planner-actions';
import { deleteReminder, toggleTask } from '@/lib/fd4-actions';
import { addDays } from '@/lib/date-utils';
import { Check, Flag } from '@/components/fd4/Marks';
import { Icon } from '@/components/Icon';
import { BackButton } from './BackButton';
import { ReminderForm } from './ReminderForm';

type DateChoice = { label: string; value: string };

export function ReminderDetailView({ detail, isNew }: { detail: ReminderDetail; isNew: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [doneMap, setDone] = useOptimistic<Record<string, boolean>, { id: string; done: boolean }>(
    Object.fromEntries(detail.tasks.map((t) => [t.id, t.done])),
    (prev, { id, done }) => ({ ...prev, [id]: done })
  );

  const total = detail.tasks.length;
  const doneCount = detail.tasks.filter((t) => doneMap[t.id]).length;
  const daysAway = Math.round(
    (Date.parse(`${detail.occursOn}T12:00:00Z`) - Date.parse(`${detail.todayStr}T12:00:00Z`)) / 86400000
  );

  /* Fechas rápidas para las tareas, contadas hacia atrás desde el reminder:
     así se piensa una entrega ("dos días antes tengo que tener el borrador"). */
  const choices = useMemo<DateChoice[]>(() => {
    const out: DateChoice[] = [{ label: 'Sin fecha', value: '' }];
    const today = detail.todayStr;
    const add = (label: string, value: string) => {
      if (value >= today && value <= detail.occursOn && !out.some((c) => c.value === value)) {
        out.push({ label, value });
      }
    };
    add('Hoy', today);
    add('Mañana', addDays(today, 1));
    add('3 días antes', addDays(detail.occursOn, -3));
    add('El día antes', addDays(detail.occursOn, -1));
    return out;
  }, [detail.todayStr, detail.occursOn]);

  const onToggle = (id: string) => {
    const next = !doneMap[id];
    startTransition(async () => {
      setDone({ id, done: next });
      await toggleTask(id, next);
    });
  };

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title || pending) return;
    setDraft('');
    setError('');
    startTransition(async () => {
      try {
        await createTask({ title, dueOn: draftDate || null, reminderId: detail.id });
        router.refresh();
      } catch (err) {
        setDraft(title);
        setError(err instanceof Error ? err.message : 'No se pudo añadir.');
      }
      inputRef.current?.focus();
    });
  };

  const onLink = (taskId: string) => {
    startTransition(async () => {
      await linkTaskToReminder(taskId, detail.id);
      router.refresh();
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      await deleteReminder(detail.id);
      router.replace('/pendientes?v=recordatorios');
      router.refresh();
    });
  };

  if (editing) {
    return (
      <>
        <div className="pl-top">
          <button type="button" className="pl-back" onClick={() => setEditing(false)}>
            <Icon name="chevron-left" size="sm" />
            Cancelar
          </button>
        </div>
        <header className="pl-head">
          <span className="pl-head__kind"><Flag size="xs" /> Editar reminder</span>
        </header>
        <ReminderForm
          mode="edit"
          reminderId={detail.id}
          initial={{
            title: detail.title,
            occursOn: detail.occursOn,
            occursAt: detail.occursAt?.slice(0, 5) ?? '',
            noticeDays: detail.noticeDays ? String(detail.noticeDays) : '',
            notes: detail.notes ?? '',
          }}
          onDone={() => setEditing(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="pl-top">
        <BackButton fallback="/pendientes?v=recordatorios" />
        <button type="button" className="pl-back" onClick={() => setEditing(true)}>
          Editar
        </button>
      </div>

      <header className="pl-head">
        <span className="pl-head__kind">
          <Flag size="xs" /> Reminder · {detail.past ? 'ya pasó' : detail.distance}
        </span>
        <h1 className="pl-head__title">{detail.title}</h1>
        <span className="pl-head__when">{detail.when}</span>
        {detail.notes ? <p className="pl-head__notes">{detail.notes}</p> : null}
      </header>

      <div className="pl-sections">
        {total > 0 ? (
          <div className="pl-progress" aria-live="polite">
            <div className="pl-progress__row">
              <span>
                <b>{doneCount} de {total}</b> {total === 1 ? 'tarea hecha' : 'tareas hechas'}
              </span>
              {doneCount === total ? <span>Listo para esto</span> : null}
            </div>
            <div className="pl-progress__bar">
              <div className="pl-progress__fill" style={{ width: `${(doneCount / total) * 100}%` }} />
            </div>
          </div>
        ) : !detail.past ? (
          <div className="pl-alert">
            <Flag size="sm" />
            <span>
              {isNew ? 'Guardado. ' : ''}
              {daysAway <= 7
                ? `Faltan ${daysAway <= 0 ? '0' : daysAway} días y todavía no hay nada planificado.`
                : 'Todavía no hay nada planificado.'}{' '}
              Pártelo en 3 o 4 pasos pequeños con fecha.
            </span>
          </div>
        ) : null}

        {total > 0 ? (
          <section>
            <div className="fd-seclabel"><h2>Para prepararlo</h2></div>
            <div className="fd-card">
              <span className="fd-card__rail fd-card__rail--task" aria-hidden />
              <div className="fd-card__body">
                {detail.tasks.map((t) => {
                  const done = Boolean(doneMap[t.id]);
                  return (
                    <div className="pl-task" key={t.id} data-done={done}>
                      <button
                        type="button"
                        className="pl-task__check"
                        aria-pressed={done}
                        aria-label={done ? `Desmarcar ${t.title}` : `Marcar ${t.title}`}
                        onClick={() => onToggle(t.id)}
                      >
                        <Check on={done} />
                      </button>
                      <Link href={`/tareas/${t.id}`} className="pl-task__body">
                        <span className="pl-task__text">
                          <span
                            className="fd-task__title"
                            style={done ? { color: 'var(--text-faint)', textDecoration: 'line-through' } : undefined}
                          >
                            {t.overdue ? <span className="fd-task__overdue-tag">Atrasada</span> : null}
                            {t.title}
                          </span>
                          <span className="fd-meta">{t.meta}</span>
                        </span>
                        <span className="pl-task__chev" aria-hidden>›</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {!detail.past ? (
          <form className="pl-quickadd" onSubmit={onAdd}>
            {error ? <p className="pl-error" role="alert">{error}</p> : null}
            <div className="pl-quickadd__row">
              <input
                ref={inputRef}
                className="pl-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={total === 0 ? 'Primer paso: p. ej. Leer el enunciado' : 'Otro paso'}
                aria-label="Nueva tarea para este reminder"
                autoCapitalize="sentences"
                enterKeyHint="done"
                autoFocus={isNew}
              />
              <button type="submit" className="fd-btn fd-btn--primary" disabled={!draft.trim() || pending}>
                Añadir
              </button>
            </div>
            <div className="pl-chips" role="group" aria-label="Fecha de la tarea">
              {choices.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="pl-chip"
                  aria-pressed={draftDate === c.value}
                  onClick={() => setDraftDate(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="pl-input"
              aria-label="Otra fecha para la tarea"
              value={draftDate}
              max={detail.occursOn}
              onChange={(e) => setDraftDate(e.target.value)}
            />
            <span className="pl-hint">
              Cada tarea con fecha entra en la notificación de ese día. Tócala después para ponerle hora.
            </span>
          </form>
        ) : null}

        {detail.candidates.length > 0 && !detail.past ? (
          <section>
            <button
              type="button"
              className="fd-more"
              style={{ width: '100%', borderTop: 0, padding: '8px 4px' }}
              onClick={() => setShowCandidates((s) => !s)}
              aria-expanded={showCandidates}
            >
              <span>Colgar una tarea que ya tienes ({detail.candidates.length})</span>
              <Icon name={showCandidates ? 'chevron-down' : 'chevron-right'} size="sm" className="fd-more__chev" />
            </button>
            {showCandidates ? (
              <div className="fd-card">
                <div className="fd-card__body">
                  {detail.candidates.map((c) => (
                    <button key={c.id} type="button" className="pl-pick" onClick={() => onLink(c.id)} disabled={pending}>
                      <span className="pl-pick__plus" aria-hidden>+</span>
                      <span className="pl-task__text">
                        <span className="fd-task__title">{c.title}</span>
                        <span className="fd-meta">{c.meta}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="pl-dangerzone">
          <Link href={`/calendario?v=dia&d=${detail.occursOn}`} className="fd-btn">
            Ver el día
          </Link>
          {confirmDelete ? (
            <button type="button" className="fd-btn" onClick={onDelete} disabled={pending} style={{ fontWeight: 600 }}>
              Sí, quitar
            </button>
          ) : (
            <button type="button" className="fd-btn fd-btn--quiet" onClick={() => setConfirmDelete(true)}>
              Quitar reminder
            </button>
          )}
        </div>
        {confirmDelete ? (
          <span className="pl-hint">Sus tareas no se borran: se quedan en Pendientes, sueltas.</span>
        ) : null}
      </div>
    </>
  );
}
