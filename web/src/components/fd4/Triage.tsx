'use client';

/* ============================================================================
   Organizer · <Triage>  ·  clasificar lo capturado, de una en una

   Capturar cuesta cero (regla 3): lo que entra por Siri no trae dia. Alguien
   tiene que ponerselo, y una lista de doce capturas sin dia es un muro que
   no se abre. Asi que se enseña UNA, con la pregunta hecha — "¿cuando lo
   haces?" — y cuatro respuestas de un toque:

     Hoy · Mañana · Proximos dias (abre los cinco siguientes) · Algun dia

   "Dejar sin fecha" no decide nada: la pasa al final de la cola. Y cada
   decision se puede deshacer (Z en escritorio, o el enlace de abajo), que es
   la regla del sistema: nada destructivo sin deshacer visible.

   En escritorio se clasifica con el teclado: H, M, P (1–5 elige el dia),
   A, espacio para saltar y Z para deshacer.
   ========================================================================= */

import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { moveTaskToDate, unscheduleTask } from '@/lib/fd4-actions';
import type { DayOption, InboxItem } from '@/lib/fd4-pendientes';
import { Icon } from '@/components/Icon';

type Decision = { id: string; title: string; label: string };

/** "para hoy" · "para mañana" · "para el mié 30" · "para algún día" */
function undoPhrase(label: string): string {
  if (label === 'Hoy' || label === 'Mañana' || label === 'Algún día') return `para ${label.toLowerCase()}`;
  return `para el ${label}`;
}

export function Triage({ items, days }: { items: InboxItem[]; days: DayOption[] }) {
  const [, startTransition] = useTransition();
  const [skipped, setSkipped] = useState<string[]>([]);
  const [showDays, setShowDays] = useState(false);
  const [history, setHistory] = useState<Decision[]>([]);

  /* Los ids ya decididos salen de la cola en el acto; si el servidor falla,
     React los devuelve. Deshacer los vuelve a meter. */
  const [resolved, setResolved] = useOptimistic<string[], { id: string; add: boolean }>(
    [],
    (prev, { id, add }) => (add ? [...prev, id] : prev.filter((x) => x !== id))
  );

  const queue = useMemo(() => {
    const open = items.filter((t) => !resolved.includes(t.id));
    const fresh = open.filter((t) => !skipped.includes(t.id));
    const later = skipped
      .map((id) => open.find((t) => t.id === id))
      .filter((t): t is InboxItem => Boolean(t));
    return [...fresh, ...later];
  }, [items, resolved, skipped]);

  const current = queue[0];
  const later = days.slice(2);
  /* "mié – dom": el tramo que abre "Próximos días". */
  const weekday = (d?: DayOption) => (d ? d.short.split(' ')[0] : '');
  const laterSpan = later.length > 0 ? `${weekday(later[0])} – ${weekday(later[later.length - 1])}` : '';

  const decide = useCallback(
    (label: string, run: (id: string) => Promise<void>) => {
      if (!current) return;
      const item = current;
      setShowDays(false);
      setHistory((h) => [{ id: item.id, title: item.title, label }, ...h].slice(0, 10));
      startTransition(async () => {
        setResolved({ id: item.id, add: true });
        await run(item.id);
      });
    },
    [current, setResolved]
  );

  const toDay = useCallback(
    (d: DayOption) => decide(d.label, (id) => moveTaskToDate(id, d.dateStr)),
    [decide]
  );

  const someday = useCallback(() => decide('Algún día', (id) => unscheduleTask(id)), [decide]);

  const skip = useCallback(() => {
    if (!current || queue.length < 2) return;
    setShowDays(false);
    setSkipped((s) => [...s.filter((id) => id !== current.id), current.id]);
  }, [current, queue.length]);

  const undo = useCallback(() => {
    const last = history[0];
    if (!last) return;
    setHistory((h) => h.slice(1));
    startTransition(async () => {
      setResolved({ id: last.id, add: false });
      /* Vuelve a como entro: sin dia y sin clasificar. */
      await moveTaskToDate(last.id, null);
    });
  }, [history, setResolved]);

  /* Teclado. Solo cuando no se esta escribiendo en un campo. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;

      const k = e.key.toLowerCase();
      if (k === 'z') return void (e.preventDefault(), undo());
      if (!current) return;
      if (k === 'h') return void (e.preventDefault(), toDay(days[0]));
      if (k === 'm') return void (e.preventDefault(), toDay(days[1]));
      if (k === 'p') return void (e.preventDefault(), setShowDays((v) => !v));
      if (k === 'a') return void (e.preventDefault(), someday());
      if (k === ' ') return void (e.preventDefault(), skip());
      if (showDays && /^[1-5]$/.test(k)) {
        const d = later[Number(k) - 1];
        if (d) {
          e.preventDefault();
          toDay(d);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, days, later, showDays, toDay, someday, skip, undo]);

  if (items.length === 0 && history.length === 0) return null;

  const last = history[0];

  return (
    <section className="fd-triage" aria-labelledby="fd-triage-title">
      <div className="fd5-sec__head">
        <h2 id="fd-triage-title">Por clasificar</h2>
      </div>

      {current ? (
        <div className="fd5-cap fd-lead--enter fd-triage__card" key={current.id}>
          <p className="fd5-cap__title">{current.title}</p>
          <span className="fd5-cap__meta">{current.meta}</span>
          <span className="fd5-cap__ask">¿Cuándo lo haces?</span>

          <div className="fd5-cap__days">
            <button type="button" className="fd5-dayopt" onClick={() => toDay(days[0])}>
              <span>
                Hoy <kbd>H</kbd>
              </span>
              <small>{days[0].short}</small>
            </button>
            <button type="button" className="fd5-dayopt" onClick={() => toDay(days[1])}>
              <span>
                Mañana <kbd>M</kbd>
              </span>
              <small>{days[1].short}</small>
            </button>
            <button
              type="button"
              className="fd5-dayopt"
              aria-expanded={showDays}
              onClick={() => setShowDays(!showDays)}
            >
              <span>
                Próximos días <kbd>P</kbd>
              </span>
              <small>{laterSpan}</small>
            </button>
            {showDays ? (
              <div className="fd5-cap__later" role="group" aria-label="Elegir día">
                {later.map((d, i) => (
                  <button key={d.dateStr} type="button" className="fd5-datechip" onClick={() => toDay(d)}>
                    {d.short} <kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" className="fd5-dayopt" onClick={someday}>
              <span>
                Algún día <kbd>A</kbd>
              </span>
              <small>sin fecha</small>
            </button>
          </div>

          <button
            type="button"
            className="fd5-cap__skip"
            onClick={skip}
            disabled={queue.length < 2}
          >
            Dejar sin fecha por ahora <kbd>espacio</kbd>
          </button>
        </div>
      ) : (
        <div className="fd5-cap fd5-cap--rest">
          <p className="fd5-cap__title">Todo clasificado.</p>
          <span className="fd5-cap__meta">Lo nuevo que captures aparecerá aquí.</span>
        </div>
      )}

      {last ? (
        <p className="fd-undo" role="status">
          <span>
            <b>{last.title}</b>: {undoPhrase(last.label)}
          </span>
          <button type="button" className="fd-undo__btn" onClick={undo}>
            <Icon name="undo" size="sm" />
            Deshacer <kbd>Z</kbd>
          </button>
        </p>
      ) : null}

      {queue.length > 1 ? (
        <p className="fd-triage__next">
          <b>Después:</b> {queue.slice(1, 4).map((t) => t.title).join(' · ')}
          {queue.length > 4 ? '…' : ''}
        </p>
      ) : null}
    </section>
  );
}
