'use client';

/* ============================================================================
   Organizer · <PlanClient> · "¿Dónde lo pongo?"

   Una conversación corta: escribes qué quieres hacer, el asistente mira tu
   agenda y propone; puedes ajustar ("mejor en las mañanas") y recuerda lo
   anterior. Nada se guarda hasta que tocas "Ponerlo así".

   mode="week" es el mismo asistente dentro del ritual del domingo: pregunta
   solo al abrirse el paso, cada propuesta es una sugerencia distinta que se
   acepta por separado, y puedes pedirle otra cosa ("quiero leer este libro").

   Las propuestas solo las cambia una respuesta de planificar: si en medio
   preguntas otra cosa ("¿qué tengo el jueves?"), lo propuesto sigue debajo
   y se puede poner sin volver a pedirlo.
   ========================================================================= */

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { acceptPlan, proposePlan } from '@/lib/plan/actions';
import type { ChatTurn, PlanAnswer, PlanMode, PlanOption } from '@/lib/plan/llm';

const EXAMPLES = [
  'Quiero leer Atomic Habits',
  'Estudiar para el próximo parcial',
  'Ir al gym 3 veces por semana',
  '¿Qué tengo mañana?',
];

/* Lo que "pregunta" el ritual al abrir el paso; no se muestra como tuyo. */
const WEEK_REQUEST = 'Estoy armando la semana. ¿Qué me recomiendas hacer y cuándo?';

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function when(date: string, start: string, minutes: number): string {
  const d = new Date(date + 'T00:00:00Z');
  const [h, m] = start.split(':').map(Number);
  const end = h * 60 + m + minutes;
  const endClock = `${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} · ${h}:${String(m).padStart(2, '0')}–${endClock}`;
}

/** Lo que se ve de los turnos anteriores: tu frase y la respuesta corta. */
type Shown = { you: string; reply: string };

export function PlanClient({ mode = 'chat', active = true }: { mode?: PlanMode; active?: boolean }) {
  const week = mode === 'week';
  const [text, setText] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [past, setPast] = useState<Shown[]>([]);
  const [answer, setAnswer] = useState<PlanAnswer | null>(null);
  const [options, setOptions] = useState<PlanOption[]>([]);
  /* true: la respuesta actual no propone y lo de abajo viene de antes. */
  const [carried, setCarried] = useState(false);
  const [lastAsk, setLastAsk] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  /* Solo en el ritual: lo aceptado de cada sugerencia, por indice. */
  const [accepted, setAccepted] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoAsked = useRef(false);

  const reset = () => {
    setHistory([]);
    setPast([]);
    setAnswer(null);
    setOptions([]);
    setCarried(false);
    setLastAsk('');
    setError('');
    setText('');
    inputRef.current?.focus();
  };

  const ask = (value: string, shown = value) => {
    const v = value.trim();
    if (!v || thinking) return;
    setError('');
    setSaved(null);
    startThinking(async () => {
      try {
        const res = await proposePlan(v, history, mode);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        /* La respuesta anterior pasa al historial visible, compacta. */
        if (answer) setPast((p) => [...p, { you: lastAsk, reply: answer.reply }]);
        setHistory((h) => [...h, { role: 'user' as const, text: v }, { role: 'model' as const, text: res.memory }].slice(-8));
        setAnswer(res.answer);
        const replans = res.answer.intent === 'plan';
        if (replans) {
          setOptions(res.answer.options);
          setAccepted({});
        }
        setCarried(!replans && options.length > 0);
        setLastAsk(shown.trim());
        setText('');
      } catch {
        setError('No se pudo preguntar. Revisa la conexión y prueba otra vez.');
      }
    });
  };

  /* En el ritual pregunta sola la primera vez que se ve el paso: el paso
     es justo para esto, y una sola llamada por visita cuida el cupo. */
  useEffect(() => {
    if (!week || !active || autoAsked.current) return;
    autoAsked.current = true;
    ask(WEEK_REQUEST, '');
  });

  const accept = (opt: PlanOption, idx: number) => {
    setError('');
    setSavingIdx(idx);
    startSaving(async () => {
      try {
        const res = await acceptPlan(opt.sessions);
        if (res.ok && week) {
          setAccepted((a) => ({ ...a, [idx]: res.count }));
        } else if (res.ok) {
          setSaved(res.count);
          setHistory([]);
          setPast([]);
          setAnswer(null);
          setOptions([]);
          setCarried(false);
          setLastAsk('');
        } else setError(res.error);
      } catch {
        setError('No se pudo guardar. Prueba otra vez.');
      }
      setSavingIdx(null);
    });
  };

  const inConversation = answer !== null;

  return (
    <div className={week ? undefined : 'fd-scroll'}>
      <div className="fd-plan">
        {week && thinking && !answer ? (
          <p className="fd-plan__reply" role="status">
            Mirando tu semana, lo que hiciste y lo que viene…
          </p>
        ) : null}

        {past.map((t, i) => (
          <div className="fd-plan__past" key={i}>
            {t.you ? <span className="fd-plan__you">{t.you}</span> : null}
            <span className="fd-meta">{t.reply}</span>
          </div>
        ))}

        {answer ? (
          <>
            {lastAsk ? <span className="fd-plan__you">{lastAsk}</span> : null}
            <p className="fd-plan__reply">{answer.reply}</p>

            {answer.intent === 'edit' ? (
              <Link href="/pendientes" className="fd-secbtn" style={{ alignSelf: 'flex-start' }}>
                Abrir Pendientes
              </Link>
            ) : null}

            {carried ? <span className="fd-meta">Lo que te propuse antes sigue en pie:</span> : null}

            {options.map((opt, i) => (
              <section className="fd-daycard" key={i}>
                <span className="fd-daycard__head">
                  <span className="fd-daycard__label">{opt.title}</span>
                </span>
                <span className="fd-daycard__body">
                  {opt.why ? <span className="fd-meta">{opt.why}</span> : null}
                  {opt.sessions.map((s, j) => (
                    <span className="fd-classrow" key={j}>
                      <span className="fd-classrow__hours">{when(s.date, s.start, s.minutes)}</span>
                      <span className="fd-classrow__text">
                        <span className="fd-classrow__title">{s.title}</span>
                        {/* Le da hora a una tarea tuya: no aparece otra igual. */}
                        {s.itemId ? <span className="fd-meta">Ya la tenías anotada</span> : null}
                      </span>
                    </span>
                  ))}
                  {accepted[i] !== undefined ? (
                    <span className="fd-meta" role="status">
                      Puesto: {accepted[i]} {accepted[i] === 1 ? 'sesión' : 'sesiones'} con aviso 15 min antes.
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="fd-btn fd-btn--primary"
                      onClick={() => accept(opt, i)}
                      disabled={saving || thinking}
                    >
                      {saving && savingIdx === i ? 'Guardando…' : week ? 'Ponerlo' : 'Ponerlo así'}
                    </button>
                  )}
                </span>
              </section>
            ))}
          </>
        ) : null}

        {saved !== null ? (
          <div className="fd-daycard">
            <span className="fd-daycard__body">
              <span className="fd-classrow__title">
                Listo: {saved} {saved === 1 ? 'sesión' : 'sesiones'} en tu calendario, con aviso 15 min antes.
              </span>
              <Link href="/calendario?v=semana" className="fd-secbtn" style={{ alignSelf: 'flex-start' }}>
                Ver la semana
              </Link>
            </span>
          </div>
        ) : null}

        {error ? (
          <p className="fd-plan__error" role="alert">
            {error}
          </p>
        ) : null}

        <form
          className="fd-plan__form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <textarea
            ref={inputRef}
            className="fd-plan__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              week
                ? 'Pídele otra cosa: "quiero leer este libro", "estudiar Física"…'
                : inConversation
                ? 'Ajusta: "mejor en las mañanas", "solo 20 minutos"…'
                : '¿Qué quieres hacer? Ej.: leer un libro, estudiar para Física, ir al gym…'
            }
            aria-label="Qué quieres hacer"
            rows={inConversation ? 2 : 3}
            maxLength={1000}
            autoCapitalize="sentences"
          />
          <div className="fd-plan__actions">
            {/* En el ritual la accion principal es Cerrar la semana: esta va en segundo plano. */}
            <button
              type="submit"
              className={week ? 'fd-btn' : 'fd-btn fd-btn--primary'}
              disabled={!text.trim() || thinking}
            >
              {thinking ? 'Mirando tu agenda…' : week ? 'Preguntar' : inConversation ? 'Enviar' : '¿Dónde lo pongo?'}
            </button>
            {inConversation && !week ? (
              <button type="button" className="fd-btn" onClick={reset} disabled={thinking}>
                Nueva consulta
              </button>
            ) : null}
          </div>
        </form>

        {!week && !inConversation && !thinking && saved === null ? (
          <div className="fd-plan__examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="fd-secbtn" onClick={() => ask(ex)}>
                {ex}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
