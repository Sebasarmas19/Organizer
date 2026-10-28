'use client';

/* ============================================================================
   Organizer · Un reminder y su preparación

   La pregunta que responde: "¿me estoy preparando, o solo lo sé?"
   (docs/08-modelo-tareas-reminders.md). Por eso lo primero es el progreso,
   y lo segundo, un campo para partirlo en tareas con fecha sin salir de aquí.

   FD5: la preparación se dibuja como una línea de estaciones que acaba en
   el reminder. Cada estación es el círculo de check de la tarea; la línea
   va en ámbar hasta la última hecha. Solo aquí se ve completa: en Inicio se
   resume en segmentos y una línea "Siguiente".
   ========================================================================= */

import { useOptimistic, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReminderDetail } from '@/lib/planner-data';
import { createTask, linkTaskToReminder } from '@/lib/planner-actions';
import { deleteReminder } from '@/lib/fd4-actions';
import { safeToggleTask } from '@/lib/offline-sync';
import { WEEKDAY_SHORT_ES, formatRecurrenceLabel, getDayOfWeek, parseDateString } from '@/lib/date-utils';
import { Icon } from '@/components/Icon';
import { Glyph } from '@/components/ios/Glyph';
import { BackButton } from './BackButton';
import { ReminderForm } from './ReminderForm';
import { ReminderPlanCalendar } from './ReminderPlanCalendar';

/** "sáb 24" */
function shortDay(dateStr: string): string {
  return `${WEEKDAY_SHORT_ES[getDayOfWeek(dateStr)]} ${parseDateString(dateStr).day}`;
}

export function ReminderDetailView({ detail, isNew }: { detail: ReminderDetail; isNew: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deliveredSuccess, setDeliveredSuccess] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [draft, setDraft] = useState('');
  /* La fecha de la próxima tarea. Solo la pone el calendario; vacía = sin fecha. */
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

  const onToggle = (id: string) => {
    const next = !doneMap[id];
    startTransition(async () => {
      setDone({ id, done: next });
      await safeToggleTask(id, next);
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

  const onMarkDelivered = () => {
    startTransition(async () => {
      try {
        const { markReminderCompletedAction } = await import('@/lib/planner-actions');
        await markReminderCompletedAction(detail.id);
        setDeliveredSuccess(true);
        router.refresh();
      } catch {
        setError('No se pudo marcar como entregado.');
      }
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
        <div className="fd5-pagetop">
          <button type="button" className="fd5-back" onClick={() => setEditing(false)}>
            <Icon name="chevron-left" size="md" />
            Cancelar
          </button>
        </div>
        <header className="fd5-rhead">
          <span className="fd5-chip">
            <Icon name="flag" size="sm" className="fd5-flag" />
            Editar reminder
          </span>
        </header>
        <ReminderForm
          mode="edit"
          reminderId={detail.id}
          todayStr={detail.todayStr}
          initial={{
            title: detail.title,
            occursOn: detail.occursOn,
            occursAt: detail.occursAt?.slice(0, 5) ?? '',
            noticeDays: detail.noticeDays ? String(detail.noticeDays) : '',
            recurrence: detail.recurrence ?? '',
            reminderMin: detail.reminderMin !== null && detail.reminderMin !== undefined ? String(detail.reminderMin) : '',
            notes: detail.notes ?? '',
          }}
          onDone={() => setEditing(false)}
        />
      </>
    );
  }

  /* La linea de estaciones: llena en ambar hasta la ultima tarea hecha,
     tramo apagado despues. Cada estacion pinta su mitad de arriba y su
     mitad de abajo, asi la linea no depende de que todas midan lo mismo. */
  const lastDone = detail.tasks.reduce((acc, t, i) => (doneMap[t.id] ? i : acc), -1);
  const segOn = (i: number) => (i <= lastDone ? 'on' : 'off');

  return (
    <>
      <div className="fd5-pagetop">
        <BackButton fallback="/pendientes?v=recordatorios" className="fd5-back" />
        <button type="button" className="fd5-smallbtn" onClick={() => setEditing(true)}>
          Editar
        </button>
      </div>

      <header className="fd5-rhead">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="fd5-chip">
            <Icon name="flag" size="sm" className="fd5-flag" />
            Reminder · {detail.past ? 'ya pasó' : detail.distance}
          </span>
          {detail.recurrence ? (
            <span className="fd5-chip" style={{ color: 'var(--io-tint)' }}>
              <Glyph name="repeat" style={{ width: 14, height: 14 }} />
              {formatRecurrenceLabel(detail.recurrence)}
            </span>
          ) : null}
          {detail.reminderMin !== null && detail.reminderMin !== undefined && detail.occursAt ? (
            <span className="fd5-chip">
              <Glyph name="clock" style={{ width: 14, height: 14 }} />
              Aviso {detail.reminderMin} min antes
            </span>
          ) : null}
        </div>
        <h1>{detail.title}</h1>
        <p>{detail.when}</p>
        {detail.notes ? <p className="fd5-rhead__notes">{detail.notes}</p> : null}
      </header>

      {total > 0 ? (
        <div className="fd5-rprog" aria-live="polite">
          <span className="fd5-seg fd5-seg--lg" aria-hidden style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
            {detail.tasks.map((t, i) => (
              <i key={t.id} data-on={i < doneCount ? 'true' : 'false'} />
            ))}
          </span>
          <span className="fd5-rprog__text">
            <span>
              <b>
                {doneCount} de {total}
              </b>{' '}
              {total === 1 ? 'tarea hecha' : 'tareas hechas'}
            </span>
            {doneCount === total ? <span>Listo para esto</span> : null}
          </span>
        </div>
      ) : null}

      {total > 0 ? (
        <section className="fd5-sec fd5-rsec">
          <div className="fd5-sec__head">
            <h2>Para prepararlo</h2>
          </div>
          <div className="fd5-route">
            {detail.tasks.map((t, i) => {
              const done = Boolean(doneMap[t.id]);
              const isToday = t.dueOn === detail.todayStr;
              const metaRest = isToday ? t.meta.split(' · ').slice(1).join(' · ') : t.meta;
              return (
                <div
                  className="fd5-stop"
                  key={t.id}
                  data-done={done ? 'true' : 'false'}
                  data-up={i === 0 ? undefined : segOn(i - 1)}
                  data-down={segOn(i)}
                >
                  <button
                    type="button"
                    className="fd5-stop__check"
                    aria-pressed={done}
                    aria-label={done ? `Desmarcar ${t.title}` : `Marcar ${t.title}`}
                    onClick={() => onToggle(t.id)}
                  >
                    <span className="fd5-stop__ck" aria-hidden>
                      {done ? <Icon name="check" size="sm" /> : null}
                    </span>
                  </button>
                  <Link href={`/tareas/${t.id}`} className="fd5-stop__body">
                    <span className="fd5-stop__text">
                      <b>{t.title}</b>
                      <small>
                        {isToday ? <em>Hoy</em> : null}
                        {isToday && metaRest ? ' · ' : ''}
                        {metaRest}
                        {done ? ' · hecha' : t.overdue ? ' · atrasada' : ''}
                      </small>
                    </span>
                    <Icon name="chevron-right" size="sm" className="fd5-stop__chev" />
                  </Link>
                </div>
              );
            })}
            <div className="fd5-stop fd5-stop--term" data-up={segOn(total - 1)}>
              <span className="fd5-stop__flag" aria-hidden>
                <Icon name="flag" size="sm" />
              </span>
              <span className="fd5-stop__text">
                <b>{detail.title}</b>
                <small>{detail.when}</small>
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {detail.planCal && !detail.past ? (
        <ReminderPlanCalendar cal={detail.planCal} selected={draftDate} onSelect={setDraftDate} />
      ) : null}

      {!detail.past ? (
        <form className="fd5-qadd" onSubmit={onAdd}>
          {error ? <p className="pl-error" role="alert">{error}</p> : null}
          <div className="fd5-qadd__row">
            <input
              ref={inputRef}
              className="fd5-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                draftDate
                  ? `Tarea para el ${shortDay(draftDate)}`
                  : 'Nueva tarea (toca un día en el calendario)'
              }
              aria-label="Nueva tarea para este reminder"
              autoCapitalize="sentences"
              enterKeyHint="done"
              autoFocus={isNew}
            />
            <button type="submit" className="fd5-btn fd5-btn--accent" disabled={!draft.trim() || pending}>
              {draftDate ? `Añadir (${shortDay(draftDate)})` : 'Añadir'}
            </button>
          </div>
        </form>
      ) : null}

      {detail.candidates.length > 0 && !detail.past ? (
        <section className="fd5-rcand">
          <button
            type="button"
            className="fd5-rowbtn"
            onClick={() => setShowCandidates((s) => !s)}
            aria-expanded={showCandidates}
          >
            <span>Colgar una tarea que ya tienes ({detail.candidates.length})</span>
            <Icon name={showCandidates ? 'chevron-down' : 'chevron-right'} size="sm" />
          </button>
          {showCandidates ? (
            <div className="fd5-list">
              {detail.candidates.map((c) => (
                <button key={c.id} type="button" className="fd5-pick" onClick={() => onLink(c.id)} disabled={pending}>
                  <Icon name="plus" size="sm" />
                  <span className="fd5-pick__text">
                    <b>{c.title}</b>
                    <small>{c.meta}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="fd5-rfoot" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 36px)' }}>
        {!detail.past && !deliveredSuccess ? (
          <button
            type="button"
            className="fd5-btn fd5-btn--accent"
            onClick={onMarkDelivered}
            disabled={pending}
          >
            ✓ Ya lo entregué
          </button>
        ) : null}
        <Link href={`/calendario?v=dia&d=${detail.occursOn}`} className="fd5-btn">
          Ver el día
        </Link>
        {confirmDelete ? (
          <button type="button" className="fd5-btn" onClick={onDelete} disabled={pending}>
            Sí, quitar
          </button>
        ) : (
          <button type="button" className="fd5-btn fd5-btn--quiet" onClick={() => setConfirmDelete(true)}>
            Quitar recordatorio
          </button>
        )}
      </div>
      {deliveredSuccess ? (
        <p className="fd5-hint" style={{ color: 'var(--class)' }}>
          ✓ Marcado como entregado. Se silenciaron las alertas y quedó registrado.
        </p>
      ) : null}
      {confirmDelete ? (
        <p className="fd5-hint">Sus tareas no se borran: se quedan en Pendientes, sueltas.</p>
      ) : null}
    </>
  );
}
