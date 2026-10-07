'use client';

/* ============================================================================
   Organizer · F4 · <ReviewFlow>  ·  el ritual del domingo

   Cinco pasos cortos, uno por pantalla (comp: `app/comps/domingo.html`):

     1. Lo que quedo   tareas con dia pasado. Tres salidas, ninguna borra:
                       Esta semana · Otro dia · Quitar (a "sin fecha")
     2. Tu semana      como viene: clases, tareas y parciales por dia. Los
                       reminders se miran y no se tocan (#62)
     3. Lo anotado     DOS capturas sin planificar, nunca la lista (#24), y
                       un campo para vaciar la cabeza (una linea, una tarea)
     4. Para tu semana el asistente (Gemini, lib/plan) mira huecos, lo que
                       hiciste y lo que viene, y sugiere hasta tres cosas con
                       hora; cada una se pone con un toque o se ignora. Se
                       le puede pedir otra ("quiero leer este libro")
     5. Listo          la semana queda cerrada en `weekly_reviews`

   Lo que hace que se termine en menos de 5 minutos (criterio de F4):

   - UN TOQUE POR TAREA. "Esta semana" no pregunta que dia: elige el primero
     con hueco (`lib/review/plan.ts`) y lo dice. Si no convence, Deshacer u
     "Otro dia".
   - CERO RECUENTO AL ENTRAR. No dice "quedaron 7". Un numero al abrir es
     una factura; el numero bueno sale al final ("6 tareas repartidas").
   - SALIR NO CUESTA. "Seguir luego" no pierde nada: cada decision se guarda
     al tocarla, y el paso va en la URL para volver justo donde se dejo.

   Lo decidido se pinta desde la foto del principio, no desde lo que manda
   el servidor al revalidar: una tarea que se movio a esta semana ya no
   "quedo", el servidor deja de mandarla, y su fila con Deshacer tiene que
   seguir ahi.
   ========================================================================= */

import Link from 'next/link';
import { useMemo, useRef, useState, useTransition } from 'react';
import { moveTaskToDate, unscheduleTask } from '@/lib/fd4-actions';
import { captureLines, finishReview, restoreTask } from '@/lib/review/actions';
import { dayWeight, suggestDay } from '@/lib/review/plan';
import type { ReviewData, ReviewDay, ReviewTask } from '@/lib/review/data';
import { addDays, getDayOfWeek } from '@/lib/date-utils';
import { Icon } from '@/components/Icon';
import { UpcomingRow } from '@/components/fd4/UpcomingRow';
import { PlanClient } from '@/app/planear/PlanClient';

const STEPS = ['Lo que quedó', 'Tu semana', 'Lo anotado', 'Para tu semana', 'Listo'] as const;
const IDEAS_STEP = 4;
const LAST_STEP = STEPS.length;

type Decision = {
  /** "week" y "day" ponen dia; "drop" lo quita; "later" no toca nada. */
  kind: 'week' | 'day' | 'drop' | 'later';
  dateStr: string | null;
  /** Lo que dice la fila ya resuelta: "Al martes 13 · el día más libre". */
  note: string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "queda 1 comodín" · "quedan 2 comodines". */
const graceText = (n: number) => (n === 1 ? 'queda 1 comodín' : `quedan ${n} comodines`);

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/** "Al martes 13" · "Para hoy". */
function toDayNote(day: ReviewDay): string {
  return day.isToday ? 'Para hoy' : `Al ${lower(day.label)}`;
}

export function ReviewFlow({ data, initialStep }: { data: ReviewData; initialStep: number }) {
  const [snapshot] = useState(() => ({
    days: data.days,
    leftovers: data.leftovers,
    ideas: data.ideas,
  }));
  const [step, setStep] = useState(initialStep);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [openDays, setOpenDays] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [closedNow, setClosedNow] = useState(false);
  const [pending, startTransition] = useTransition();
  const screenRef = useRef<HTMLElement>(null);

  /* Lo que este ritual ya puso en cada dia: cuenta para el peso del dia. */
  const added = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const d of Object.values(decisions)) {
      if (d.dateStr) byDay.set(d.dateStr, (byDay.get(d.dateStr) ?? 0) + 1);
    }
    return byDay;
  }, [decisions]);

  const openWeek = snapshot.days.filter((d) => !d.past);
  const dayOf = (dateStr: string) => snapshot.days.find((d) => d.dateStr === dateStr);
  const isSunday = getDayOfWeek(data.todayStr) === 0;
  const closed = closedNow || data.doneLabel !== '';

  const go = (next: number) => {
    setStep(next);
    setOpenDays(null);
    setError('');
    /* El paso va en la URL: "Seguir luego" y volver deja en el mismo sitio. */
    window.history.replaceState(null, '', next === 1 ? '/domingo' : `/domingo?paso=${next}`);
    /* En el telefono scrollea la pantalla; en escritorio puede ser el
       documento. Las dos arriba: el paso nuevo empieza por su titulo. */
    screenRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  /* ---------------------------------------------------------- decidir --- */

  const decide = (task: ReviewTask, decision: Decision, run: (() => Promise<unknown>) | null) => {
    setOpenDays(null);
    setError('');
    setDecisions((all) => ({ ...all, [task.id]: decision }));
    if (!run) return;
    startTransition(async () => {
      try {
        await run();
      } catch {
        setDecisions((all) => without(all, task.id));
        setError('No se pudo guardar. Prueba otra vez.');
      }
    });
  };

  const toWeek = (task: ReviewTask) => {
    const pick = suggestDay(snapshot.days, added);
    const day = pick ? dayOf(pick.dateStr) : undefined;
    if (!pick || !day) return;
    const why = pick.reason === 'room' ? 'tiene hueco' : 'el día más libre';
    decide(task, { kind: 'week', dateStr: day.dateStr, note: `${toDayNote(day)} · ${why}` }, () =>
      moveTaskToDate(task.id, day.dateStr)
    );
  };

  const toDay = (task: ReviewTask, day: ReviewDay) =>
    decide(task, { kind: 'day', dateStr: day.dateStr, note: toDayNote(day) }, () =>
      moveTaskToDate(task.id, day.dateStr)
    );

  const drop = (task: ReviewTask) =>
    decide(task, { kind: 'drop', dateStr: null, note: 'Sin fecha · sigue en Pendientes' }, () =>
      unscheduleTask(task.id)
    );

  const later = (task: ReviewTask) =>
    decide(task, { kind: 'later', dateStr: null, note: 'Se queda donde estaba' }, null);

  const undo = (task: ReviewTask) => {
    const prev = decisions[task.id];
    if (!prev) return;
    setError('');
    setDecisions((all) => without(all, task.id));
    if (prev.kind === 'later') return;
    startTransition(async () => {
      try {
        await restoreTask(task.id, task.before);
      } catch {
        setDecisions((all) => ({ ...all, [task.id]: prev }));
        setError('No se pudo deshacer. Prueba otra vez.');
      }
    });
  };

  /* ------------------------------------------------------------ cerrar --- */

  const counts = () => {
    let carried = 0;
    let dropped = 0;
    let promoted = 0;
    for (const t of snapshot.leftovers) {
      const d = decisions[t.id];
      if (d?.dateStr) carried += 1;
      if (d?.kind === 'drop') dropped += 1;
    }
    for (const t of snapshot.ideas) if (decisions[t.id]?.dateStr) promoted += 1;
    return { carried, dropped, promoted };
  };

  const finish = () => {
    setError('');
    startTransition(async () => {
      try {
        await finishReview(data.weekStart, counts());
        setClosedNow(true);
        go(LAST_STEP);
      } catch {
        setError('No se pudo cerrar la semana. Lo que decidiste ya está guardado; prueba otra vez.');
      }
    });
  };

  /* ------------------------------------------------------------ piezas --- */

  const renderTask = (task: ReviewTask, mode: 'leftover' | 'idea') => {
    const decision = decisions[task.id];
    if (decision) {
      return (
        <div key={task.id} className="fd5-rv-item fd5-rv-item--done">
          <Icon name="check" size="sm" className="fd5-rv-item__ok" />
          <div className="fd5-rv-item__text">
            <p className="fd5-rv-item__title">{task.title}</p>
            <p className="fd5-rv-item__meta">{decision.note}</p>
          </div>
          <button type="button" className="fd-undo__btn" onClick={() => undo(task)}>
            Deshacer
          </button>
        </div>
      );
    }

    const open = openDays === task.id;
    return (
      <div key={task.id} className="fd5-rv-item">
        <p className="fd5-rv-item__title">{task.title}</p>
        {task.meta ? <p className="fd5-rv-item__meta">{task.meta}</p> : null}

        <div className="fd5-rv-item__acts" role="group" aria-label={`Qué hacer con: ${task.title}`}>
          <button type="button" className="fd5-smallbtn fd5-rv-pick" onClick={() => toWeek(task)}>
            Esta semana
          </button>
          <button
            type="button"
            className="fd5-smallbtn"
            aria-expanded={open}
            onClick={() => setOpenDays(open ? null : task.id)}
          >
            Otro día
          </button>
          {mode === 'leftover' ? (
            <button type="button" className="fd5-smallbtn fd5-rv-quiet" onClick={() => drop(task)}>
              Quitar
            </button>
          ) : (
            <button type="button" className="fd5-smallbtn fd5-rv-quiet" onClick={() => later(task)}>
              Ahora no
            </button>
          )}
        </div>

        {open ? (
          <div className="fd5-chips fd5-rv-item__days" role="group" aria-label="Elegir día">
            {openWeek.map((d) => (
              <button key={d.dateStr} type="button" className="fd5-datechip" onClick={() => toDay(task, d)}>
                {d.reminders.length > 0 ? <Icon name="flag" size="sm" className="fd5-flag" /> : null}
                {d.isToday ? 'hoy' : d.short}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const errorLine = error ? (
    <p className="fd5-rv__error" role="alert">
      {error}
    </p>
  ) : null;

  /* ------------------------------------------------------------- pasos --- */

  const stepOne = (
    <>
      <h2 className="fd5-rv__h2">Esto quedó de la semana</h2>
      {snapshot.leftovers.length > 0 ? (
        <>
          <p className="fd5-rv__lead">Nada se borró solo. Dime qué hacer con cada una y seguimos.</p>
          <div className="fd5-rv-items">{snapshot.leftovers.map((t) => renderTask(t, 'leftover'))}</div>
          <p className="fd5-hint fd5-rv__note">
            «Esta semana» la pone en el primer día con hueco. Quitar no borra: vuelve a Pendientes.
          </p>
        </>
      ) : (
        <div className="fd5-rv-calm">
          <Icon name="check-circle" size="md" />
          <p>
            <b>No quedó nada colgando.</b> Todo lo de días pasados está hecho o decidido.
          </p>
        </div>
      )}

      <ol className="fd5-rv-next" aria-label="Lo que viene después">
        <li>
          <Icon name="calendar" size="sm" />
          Después: {data.upcoming ? 'la semana que viene' : 'lo que queda de semana'}, con clases y parciales
        </li>
        <li>
          <Icon name="bookmark" size="sm" />
          {snapshot.ideas.length > 1
            ? 'Y dos cosas que anotaste y nunca planificaste'
            : 'Y un sitio para vaciar la cabeza'}
        </li>
      </ol>
    </>
  );

  const stepTwo = (
    <>
      <h2 className="fd5-rv__h2">{data.upcoming ? 'Así viene la semana' : 'Lo que queda de semana'}</h2>
      <p className="fd5-rv__lead">Clases y tareas por día. Los parciales y entregas solo se miran: no se mueven.</p>

      <ol className="fd5-rv-week">
        {snapshot.days.map((d) => {
          const extra = added.get(d.dateStr) ?? 0;
          const tasks = d.tasks + extra;
          const load =
            [d.classes ? plural(d.classes, 'clase', 'clases') : '', tasks ? plural(tasks, 'tarea', 'tareas') : '']
              .filter(Boolean)
              .join(' · ') || 'Libre';
          /* La barra satura a las 6 unidades: tres clases y un parcial ya
             es un dia lleno, no hace falta mas escala. */
          const fill = Math.min(100, Math.round((dayWeight(d, extra) / 6) * 100));
          return (
            <li
              key={d.dateStr}
              className="fd5-rv-day"
              data-past={d.past ? 'true' : undefined}
              data-today={d.isToday ? 'true' : undefined}
            >
              <span className="fd5-rv-day__name">{d.isToday ? 'Hoy' : d.short}</span>
              <span className="fd5-rv-day__body">
                <span className="fd5-rv-day__load">{load}</span>
                {d.reminders.map((title) => (
                  <span key={title} className="fd5-chip">
                    <Icon name="flag" size="sm" className="fd5-flag" />
                    {title}
                  </span>
                ))}
              </span>
              <span className="fd5-rv-day__bar" aria-hidden>
                <i style={{ width: `${fill}%` }} />
              </span>
            </li>
          );
        })}
      </ol>

      {data.reminders.length > 0 ? (
        <section className="fd5-rv-sub" aria-labelledby="fd5-rv-up">
          <div className="fd5-sec__head">
            <h2 id="fd5-rv-up">Se viene · cómo va la preparación</h2>
          </div>
          <div className="fd5-list">
            {data.reminders.map((r) => (
              <UpcomingRow key={r.id} reminder={r} readOnly />
            ))}
          </div>
        </section>
      ) : (
        <p className="fd5-hint fd5-rv__note">Sin parciales ni entregas a la vista.</p>
      )}
    </>
  );

  const stepThree = (
    <>
      <h2 className="fd5-rv__h2">Lo anotado</h2>
      {snapshot.ideas.length > 0 ? (
        <>
          <p className="fd5-rv__lead">
            {snapshot.ideas.length > 1
              ? 'Dos cosas que anotaste y nunca planificaste. Si no es su semana, se quedan donde están.'
              : 'Una cosa que anotaste y nunca planificaste. Si no es su semana, se queda donde está.'}
          </p>
          <div className="fd5-rv-items">{snapshot.ideas.map((t) => renderTask(t, 'idea'))}</div>
          {data.moreIdeas > 0 ? (
            <p className="fd5-hint fd5-rv__note">El resto sigue en Pendientes, sin prisa.</p>
          ) : null}
        </>
      ) : (
        <p className="fd5-rv__lead">No hay nada anotado sin planificar.</p>
      )}

      <BrainDump firstReview={data.firstReview} />
    </>
  );

  const tasksThisWeek = openWeek.reduce((n, d) => n + d.tasks + (added.get(d.dateStr) ?? 0), 0);
  const decided = Object.values(decisions).filter((d) => d.kind !== 'later').length;
  const firstDay = openWeek[0];
  /* El aviso de hoy ya salio: si la semana empieza hoy, el siguiente es el de mañana. */
  const firstNotice = !firstDay
    ? ''
    : firstDay.isToday || firstDay.dateStr === addDays(data.todayStr, 1)
      ? 'Mañana'
      : `El ${lower(firstDay.label)}`;

  const stepFour = (
    <div className="fd5-rv-done">
      <span className="fd5-rv-done__mark" aria-hidden>
        <Icon name="check" size="lg" />
      </span>
      <h2 className="fd5-rv__h2">Semana armada</h2>
      <p className="fd5-rv__lead">
        {closedNow ? data.rangeLabel : `${data.rangeLabel} · la cerraste ${data.doneLabel}`}
      </p>

      <ul className="fd5-rv-sum">
        {/* Sin "0 tareas": un cero en negrita al cerrar se lee como suspenso. */}
        {tasksThisWeek > 0 ? (
          <li>
            <b>{plural(tasksThisWeek, 'tarea', 'tareas')}</b> con día{' '}
            {data.upcoming ? 'la semana que viene' : 'de aquí al domingo'}
          </li>
        ) : null}
        {decided > 0 ? (
          <li>
            <b>{plural(decided, 'cosa decidida', 'cosas decididas')}</b>, ninguna borrada
          </li>
        ) : null}
        {firstNotice ? (
          <li>
            {firstNotice} a las <b>{data.morning}</b> te llega el día, con todo dentro
          </li>
        ) : null}
        <li>
          {data.streak.days > 0 ? (
            <>
              Racha: <b>{plural(data.streak.days, 'día', 'días')}</b> cerrando algo.{' '}
              {data.streak.graceLeft > 0
                ? `Te ${graceText(data.streak.graceLeft)} este mes: un día sin cerrar nada no la rompe.`
                : 'Los comodines de este mes ya se usaron; vuelven el día 1.'}
            </>
          ) : (
            `La racha empieza el día que cierres algo, y este mes ${
              data.streak.graceLeft === 1 ? 'trae 1 comodín' : `trae ${data.streak.graceLeft} comodines`
            }: un día sin cerrar nada no la rompe.`
          )}
        </li>
      </ul>
    </div>
  );

  const stepIdeas = (
    <>
      <h2 className="fd5-rv__h2">Para tu semana</h2>
      <p className="fd5-rv__lead">
        Ideas con hora, según tus huecos, lo que ya hiciste y lo que viene. Pon las que te sirvan; las
        demás no cuestan nada.
      </p>
    </>
  );

  const body = [stepOne, stepTwo, stepThree, stepIdeas, stepFour][step - 1];

  /* ------------------------------------------------------------ pantalla -- */

  return (
    <main className="fd-screen fd5-rv" ref={screenRef}>
      <div className="fd5-rv__inner">
        <div className="fd5-pagetop">
          {step > 1 && step < LAST_STEP ? (
            <button type="button" className="fd5-back" onClick={() => go(step - 1)}>
              <Icon name="chevron-left" size="md" />
              Atrás
            </button>
          ) : (
            <Link href="/" className="fd5-back">
              <Icon name="chevron-left" size="md" />
              Hoy
            </Link>
          )}
        </div>

        <header className="fd5-ptitle">
          <h1>{isSunday ? 'Domingo' : 'Armar la semana'}</h1>
          <p>
            {data.rangeLabel}
            {step < LAST_STEP ? ' · unos 10 minutos' : ''}
          </p>
        </header>

        <div className="fd5-rv__steps">
          <span className="fd5-rv__bars" aria-hidden>
            {STEPS.map((label, i) => (
              <i key={label} data-on={i < step ? 'true' : undefined} />
            ))}
          </span>
          <p aria-live="polite">
            Paso {step} de {LAST_STEP} · {STEPS[step - 1]}
          </p>
        </div>

        {step === 1 && closed && !closedNow ? (
          <p className="fd5-rv-calm fd5-rv-calm--top">
            <Icon name="check-circle" size="md" />
            <span>
              Esta semana ya la armaste {data.doneLabel}. Puedes repasarla igual.
            </span>
          </p>
        ) : null}

        <section className="fd5-rv__body fd-lead--enter" key={step}>
          {body}
        </section>

        {/* Fuera de la seccion de arriba para no desmontarse al ir y volver:
            asi pregunta una sola vez por visita y no se pierde lo propuesto. */}
        <div className="fd5-rv-ideas" hidden={step !== IDEAS_STEP}>
          <PlanClient mode="week" active={step === IDEAS_STEP} />
        </div>

        {errorLine}

        <footer className="fd5-rv__foot">
          {step < LAST_STEP - 1 ? (
            <button type="button" className="fd5-btn fd5-btn--primary" onClick={() => go(step + 1)}>
              Siguiente
              <Icon name="arrow-right" size="sm" />
            </button>
          ) : step === LAST_STEP - 1 ? (
            <button type="button" className="fd5-btn fd5-btn--primary" onClick={finish} disabled={pending}>
              {pending ? 'Guardando…' : 'Cerrar la semana'}
            </button>
          ) : (
            <Link href="/" className="fd5-btn fd5-btn--primary">
              Ir a Inicio
            </Link>
          )}
          {step < LAST_STEP ? (
            <Link href="/" className="fd5-btn fd5-btn--quiet">
              Seguir luego
            </Link>
          ) : null}
        </footer>
      </div>
    </main>
  );
}

/* ------------------------------------------------------- vaciar la cabeza --
   La migracion de Notion y WhatsApp que la decision 21 deja para la primera
   revision, y lo que ronde la cabeza cualquier otro domingo. Cada linea es
   una tarea sin dia (regla 3): se clasifican despues, en Pendientes.     */

function BrainDump({ firstReview }: { firstReview: boolean }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text;
    if (!value.trim() || pending) return;
    setError('');
    startTransition(async () => {
      try {
        const rows = await captureLines(value);
        setSaved((prev) => [...prev, ...rows.map((r) => r.title)]);
        setText('');
      } catch {
        setError('No se pudo anotar. Sigue escrito; prueba otra vez.');
      }
    });
  };

  return (
    <form className="fd5-rv-dump" onSubmit={submit}>
      <div className="fd5-sec__head">
        <h2>
          <label htmlFor="fd5-rv-dump">¿Algo más rondando la cabeza?</label>
        </h2>
      </div>
      <textarea
        id="fd5-rv-dump"
        className="fd5-input fd5-rv-dump__field"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Una cosa por línea"
      />
      <p className="fd5-hint">
        {firstReview
          ? 'Si tienes listas en Notion o en WhatsApp, pégalas aquí: cada línea será una tarea sin día.'
          : 'Cada línea será una tarea sin día. Se clasifican cuando quieras, en Pendientes.'}
      </p>
      <button type="submit" className="fd5-btn fd5-rv-dump__btn" disabled={lines === 0 || pending}>
        {pending ? 'Anotando…' : lines > 1 ? `Anotar ${lines}` : 'Anotar'}
      </button>
      {error ? (
        <p className="fd5-rv__error" role="alert">
          {error}
        </p>
      ) : null}
      {saved.length > 0 ? (
        <p className="fd-undo" role="status">
          <span>
            <b>{plural(saved.length, 'anotada', 'anotadas')}</b> · quedan en Pendientes, sin día
          </span>
        </p>
      ) : null}
    </form>
  );
}
