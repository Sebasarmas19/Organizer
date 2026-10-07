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

   NUNCA SE QUEDA CALLADO (2026-10-07). El asistente tarda de 10 a 40 s y en
   el iPhone eso basta para que iOS cierre la app si te vas a otra. Por eso:
   · Tu pregunta aparece al instante y debajo un indicador que gira, con un
     texto que cambia si tarda, para que se vea que sigue trabajando.
   · Toda pregunta acaba en una respuesta o en un aviso con Reintentar: si
     falla, si pasan 70 s sin nada o si la app se actualizó mientras tanto.
   · La conversación se guarda en este aparato: si iOS cierra la app a
     mitad, al volver está ahí, y la pregunta que no llegó ofrece Reintentar.
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

/* Lo que se lee mientras espera; avanza cada WAIT_STEP_MS. */
const WAIT_TEXT = [
  'Mirando tu agenda…',
  'Buscando huecos que te sirvan…',
  'Sigue pensando: casi está…',
  'Está tardando más de lo normal. Sigue esperando…',
];
const WAIT_STEP_MS = 12000;
/* El servidor corta a los 60 s; si a los 70 no hay nada, no va a llegar. */
const CLIENT_TIMEOUT_MS = 70000;
/* La conversación guardada vale media hora: después, se empieza de cero. */
const STORE_KEY = 'organizer:plan';
const STORE_TTL_MS = 30 * 60 * 1000;

/** Una pregunta que no tuvo respuesta. `reload`: la app cambió de versión. */
type Failed = { ask: string; shown: string; error: string; reload?: boolean };

type Stored = {
  at: number;
  history: ChatTurn[];
  past: Shown[];
  answer: PlanAnswer | null;
  options: PlanOption[];
  carried: boolean;
  lastAsk: string;
  pending: string | null;
};

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Stored;
    if (!data || typeof data.at !== 'number' || Date.now() - data.at > STORE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeStored(data: Stored | null) {
  try {
    if (data) localStorage.setItem(STORE_KEY, JSON.stringify(data));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* Navegación privada o sin espacio: la conversación solo vive en pantalla. */
  }
}

/** La promesa, o un error 'timeout' si tarda más de `ms`. */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([promise, limit]);
  } finally {
    clearTimeout(timer);
  }
}

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
  /* La pregunta en camino (lo que se ve en tu burbuja) y la que falló. */
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState<Failed | null>(null);
  const [waitLevel, setWaitLevel] = useState(0);
  const [saved, setSaved] = useState<number | null>(null);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  /* Solo en el ritual: lo aceptado de cada sugerencia, por indice. */
  const [accepted, setAccepted] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoAsked = useRef(false);
  /* Cada pregunta lleva un número: una respuesta tardía de otra se ignora. */
  const askId = useRef(0);
  const restored = useRef(false);
  const liveRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setFailed(null);
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
    const id = ++askId.current;
    setError('');
    setFailed(null);
    setSaved(null);
    setPending(shown.trim());
    setWaitLevel(0);
    /* En el iPhone el teclado tapa media pantalla: se baja para ver la espera. */
    inputRef.current?.blur();
    startThinking(async () => {
      const fail = (error: string, reload = false) => {
        if (id !== askId.current) return;
        setPending(null);
        setFailed({ ask: v, shown: shown.trim(), error, reload });
      };
      try {
        const res = await withTimeout(proposePlan(v, history, mode), CLIENT_TIMEOUT_MS);
        if (id !== askId.current) return;
        if (!res || typeof res !== 'object') {
          fail('No llegó respuesta del asistente.');
          return;
        }
        if (!res.ok) {
          fail(res.error);
          return;
        }
        setPending(null);
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
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        const message = err instanceof Error ? err.message : '';
        if (message === 'timeout') fail('El asistente tardó demasiado y no respondió.');
        /* Se publicó una versión nueva mientras tenías la app abierta. */
        else if (name === 'UnrecognizedActionError' || /Server Action/i.test(message))
          fail('La app se actualizó mientras preguntabas.', true);
        else fail('No se pudo preguntar. Revisa la conexión.');
      }
    });
  };

  const snapshot = (): Stored => ({
    at: Date.now(),
    history,
    past,
    answer,
    options,
    carried,
    lastAsk,
    pending,
  });

  const restore = () => {
    const data = readStored();
    if (!data) return;
    setHistory(data.history ?? []);
    setPast(data.past ?? []);
    setAnswer(data.answer ?? null);
    setOptions(data.options ?? []);
    setCarried(Boolean(data.carried));
    setLastAsk(data.lastAsk ?? '');
    /* Se fue sin respuesta: iOS cerró la app o se recargó. Un toque y sigue. */
    if (data.pending) {
      setFailed({
        ask: data.pending,
        shown: data.pending,
        error: 'La app se cerró antes de que llegara la respuesta.',
      });
    }
  };

  const retry = () => {
    if (!failed) return;
    /* Tras una actualización hay que recargar; la conversación está guardada. */
    if (failed.reload) {
      writeStored({ ...snapshot(), pending: failed.shown });
      window.location.reload();
      return;
    }
    ask(failed.ask, failed.shown);
  };

  /* Si tarda, el texto avanza: un indicador que gira 40 s con la misma frase
     parece colgado. */
  useEffect(() => {
    if (pending === null) return;
    const timer = window.setInterval(() => setWaitLevel((l) => Math.min(l + 1, WAIT_TEXT.length - 1)), WAIT_STEP_MS);
    return () => window.clearInterval(timer);
  }, [pending]);

  /* Lo nuevo (la espera, la respuesta o el aviso) siempre a la vista. */
  useEffect(() => {
    if (pending === null && answer === null && failed === null) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    liveRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [pending, answer, failed]);

  /* Solo /planear guarda la conversación: el ritual vuelve a preguntar solo. */
  useEffect(() => {
    if (week) return;
    if (!restored.current) {
      restored.current = true;
      restore();
      return;
    }
    const empty = !answer && past.length === 0 && pending === null;
    writeStored(empty ? null : snapshot());
  });

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

        {/* Lo que está pasando ahora: tu pregunta y la espera, o el fallo. */}
        <div ref={liveRef} className="fd-plan__live" aria-live="polite">
          {pending !== null ? (
            <>
              {pending ? <span className="fd-plan__you">{pending}</span> : null}
              <p className="fd-plan__wait" role="status">
                <span className="io-spinner" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                {week && !pending ? 'Mirando tu semana, lo que hiciste y lo que viene…' : WAIT_TEXT[waitLevel]}
              </p>
            </>
          ) : null}

          {failed ? (
            <>
              {failed.shown ? <span className="fd-plan__you">{failed.shown}</span> : null}
              <div className="fd-plan__failed" role="alert">
                <p>{failed.error}</p>
                <button type="button" className="fd-btn fd-btn--primary" onClick={retry} disabled={thinking}>
                  {failed.reload ? 'Recargar y preguntar otra vez' : 'Reintentar'}
                </button>
              </div>
            </>
          ) : null}
        </div>

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
              {thinking ? 'Esperando respuesta…' : week ? 'Preguntar' : inConversation ? 'Enviar' : '¿Dónde lo pongo?'}
            </button>
            {inConversation && !week ? (
              <button type="button" className="fd-btn" onClick={reset} disabled={thinking}>
                Nueva consulta
              </button>
            ) : null}
          </div>
        </form>

        {!week && !inConversation && !thinking && !failed && saved === null ? (
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
