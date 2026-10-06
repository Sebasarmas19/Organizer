'use client';

/* ============================================================================
   Organizer · <PlanClient> · "¿Dónde lo pongo?"

   Escribes lo que quieres hacer, el asistente mira tu agenda y propone. Nada
   se guarda hasta que tocas "Ponerlo así" en una propuesta.
   ========================================================================= */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { acceptPlan, proposePlan } from '@/lib/plan/actions';
import type { PlanAnswer, PlanOption } from '@/lib/plan/llm';

const EXAMPLES = [
  'Quiero leer Atomic Habits',
  'Estudiar para el próximo parcial',
  'Ir al gym 3 veces por semana',
  '¿Cómo tengo la semana?',
];

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function when(date: string, start: string, minutes: number): string {
  const d = new Date(date + 'T00:00:00Z');
  const [h, m] = start.split(':').map(Number);
  const end = h * 60 + m + minutes;
  const endClock = `${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`;
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} · ${h}:${String(m).padStart(2, '0')}–${endClock}`;
}

export function PlanClient() {
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState<PlanAnswer | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<number | null>(null);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const ask = (value: string) => {
    const v = value.trim();
    if (!v || thinking) return;
    setError('');
    setSaved(null);
    setAnswer(null);
    startThinking(async () => {
      try {
        const res = await proposePlan(v);
        if (res.ok) setAnswer(res.answer);
        else setError(res.error);
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
          setAnswer(null);
          setText('');
        } else setError(res.error);
      } catch {
        setError('No se pudo guardar. Prueba otra vez.');
      }
      setSavingIdx(null);
    });
  };

  return (
    <div className="fd-scroll">
      <div className="fd-plan">
        <form
          className="fd-plan__form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
        >
          <textarea
            className="fd-plan__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué quieres hacer? Ej.: leer un libro, estudiar para Física, ir al gym…"
            aria-label="Qué quieres hacer"
            rows={3}
            maxLength={1000}
            autoCapitalize="sentences"
          />
          <button type="submit" className="fd-btn fd-btn--primary" disabled={!text.trim() || thinking}>
            {thinking ? 'Mirando tu agenda…' : '¿Dónde lo pongo?'}
          </button>
        </form>

        {!answer && !thinking && saved === null ? (
          <div className="fd-plan__examples">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="fd-secbtn"
                onClick={() => {
                  setText(ex);
                  ask(ex);
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="fd-plan__error" role="alert">
            {error}
          </p>
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

        {answer ? (
          <>
            {answer.reply ? <p className="fd-plan__reply">{answer.reply}</p> : null}

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
                    disabled={saving}
                  >
                    {saving && savingIdx === i ? 'Guardando…' : 'Ponerlo así'}
                  </button>
                </span>
              </section>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
