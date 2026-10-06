'use client';

/* ============================================================================
   Organizer · <PlanClient> · "¿Dónde lo pongo?"

   Una conversación corta: escribes qué quieres hacer, el asistente mira tu
   agenda y propone; puedes ajustar ("mejor en las mañanas") y recuerda lo
   anterior. Nada se guarda hasta que tocas "Ponerlo así".
   ========================================================================= */

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { acceptPlan, proposePlan } from '@/lib/plan/actions';
import type { ChatTurn, PlanAnswer, PlanOption } from '@/lib/plan/llm';

const EXAMPLES = [
  'Quiero leer Atomic Habits',
  'Estudiar para el próximo parcial',
  'Ir al gym 3 veces por semana',
  '¿Qué tengo mañana?',
];

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

export function PlanClient() {
  const [text, setText] = useState('');
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [past, setPast] = useState<Shown[]>([]);
  const [answer, setAnswer] = useState<PlanAnswer | null>(null);
  const [lastAsk, setLastAsk] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const reset = () => {
    setHistory([]);
    setPast([]);
    setAnswer(null);
    setLastAsk('');
    setError('');
    setText('');
    inputRef.current?.focus();
  };

  const ask = (value: string) => {
    const v = value.trim();
    if (!v || thinking) return;
    setError('');
    setSaved(null);
    startThinking(async () => {
      try {
        const res = await proposePlan(v, history);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        /* La respuesta anterior pasa al historial visible, compacta. */
        if (answer) setPast((p) => [...p, { you: lastAsk, reply: answer.reply }]);
        setHistory((h) => [...h, { role: 'user' as const, text: v }, { role: 'model' as const, text: res.memory }].slice(-8));
        setAnswer(res.answer);
        setLastAsk(v);
        setText('');
      } catch {
        setError('No se pudo preguntar. Revisa la conexión y prueba otra vez.');
      }
    });
  };

  const accept = (opt: PlanOption, idx: number) => {
    setError('');
    setSavingIdx(idx);
    startSaving(async () => {
      try {
        const res = await acceptPlan(opt.sessions);
        if (res.ok) {
          setSaved(res.count);
          setHistory([]);
          setPast([]);
          setAnswer(null);
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
    <div className="fd-scroll">
      <div className="fd-plan">
        {past.map((t, i) => (
          <div className="fd-plan__past" key={i}>
            <span className="fd-plan__you">{t.you}</span>
            <span className="fd-meta">{t.reply}</span>
          </div>
        ))}

        {answer ? (
          <>
            <span className="fd-plan__you">{lastAsk}</span>
            <p className="fd-plan__reply">{answer.reply}</p>

            {answer.intent === 'edit' ? (
              <Link href="/pendientes" className="fd-secbtn" style={{ alignSelf: 'flex-start' }}>
                Abrir Pendientes
              </Link>
            ) : null}

            {answer.options.map((opt, i) => (
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
                      </span>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="fd-btn fd-btn--primary"
                    onClick={() => accept(opt, i)}
                    disabled={saving || thinking}
                  >
                    {saving && savingIdx === i ? 'Guardando…' : 'Ponerlo así'}
                  </button>
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
              inConversation
                ? 'Ajusta: "mejor en las mañanas", "solo 20 minutos"…'
                : '¿Qué quieres hacer? Ej.: leer un libro, estudiar para Física, ir al gym…'
            }
            aria-label="Qué quieres hacer"
            rows={inConversation ? 2 : 3}
            maxLength={1000}
            autoCapitalize="sentences"
          />
          <div className="fd-plan__actions">
            <button type="submit" className="fd-btn fd-btn--primary" disabled={!text.trim() || thinking}>
              {thinking ? 'Mirando tu agenda…' : inConversation ? 'Enviar' : '¿Dónde lo pongo?'}
            </button>
            {inConversation ? (
              <button type="button" className="fd-btn" onClick={reset} disabled={thinking}>
                Nueva consulta
              </button>
            ) : null}
          </div>
        </form>

        {!inConversation && !thinking && saved === null ? (
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
