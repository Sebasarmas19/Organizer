'use client';

/* ============================================================================
   Organizer · <CreateSheet>  ·  el + de Inicio

   En Inicio, anotar algo es el campo de abajo: se escribe y ya. El + es para
   lo que lleva estructura: una tarea con su dia, un reminder (parcial,
   entrega) o pedirle al asistente que proponga cuando. Antes vivian en la
   cabecera ("Planear") y en "Se viene" ("+ Reminder").
   ========================================================================= */

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Glyph } from './Glyph';
import { Sheet } from './Sheet';
import { parseCapture } from '@/lib/capture/parse';
import { getTodayString } from '@/lib/date-utils';
import { safeCreateTask } from '@/lib/offline-sync';

export function CreateSheet({
  open,
  onClose,
  onOpenTask,
  onOpenReminder,
  onOpenResource,
  showResource,
}: {
  open: boolean;
  onClose: () => void;
  onOpenTask?: () => void;
  onOpenReminder?: () => void;
  onOpenResource?: () => void;
  showResource?: boolean;
}) {
  const router = useRouter();
  const [quickText, setQuickText] = useState('');
  const [isSubmitting, startTransition] = useTransition();
  const [dismissParsed, setDismissParsed] = useState(false);

  const todayStr = useMemo(() => getTodayString(), []);
  const now = useMemo(() => {
    const d = new Date();
    return { date: todayStr, minutes: d.getHours() * 60 + d.getMinutes() };
  }, [todayStr]);

  const parsed = useMemo(() => {
    if (!quickText.trim() || dismissParsed) return null;
    const p = parseCapture(quickText, now);
    return p.date || p.time ? p : null;
  }, [quickText, now, dismissParsed]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickText.trim();
    if (!text || isSubmitting) return;

    startTransition(async () => {
      const p = parseCapture(text, now);
      await safeCreateTask({
        title: p.title || text,
        dueOn: dismissParsed ? null : p.date,
      });
      setQuickText('');
      setDismissParsed(false);
      onClose();
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear">
      <form onSubmit={handleQuickSubmit} style={{ margin: '0 16px 16px' }}>
        <div className="io-group" style={{ margin: 0 }}>
          <div className="io-field" style={{ padding: '6px 14px' }}>
            <input
              value={quickText}
              onChange={(e) => {
                setQuickText(e.target.value);
                setDismissParsed(false);
              }}
              placeholder="Captura rápida: ej. Tarea mañana a las 4"
              style={{ minHeight: 40, fontSize: 16 }}
            />
          </div>
        </div>
        {parsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, paddingLeft: 4, fontSize: 12 }}>
            <span
              className="io-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--io-tint-soft)',
                color: 'var(--io-tint)',
                fontWeight: 600,
              }}
            >
              {parsed.date ? `📅 ${parsed.date}` : null}
              {parsed.date && parsed.time ? ' · ' : null}
              {parsed.time ? `⏰ ${parsed.time}` : null}
              <button
                type="button"
                onClick={() => setDismissParsed(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontWeight: 'bold',
                }}
                aria-label="Descartar fecha detectada"
              >
                ×
              </button>
            </span>
            <span style={{ color: 'var(--io-label-3)', fontSize: 11 }}>Detectado en vivo</span>
          </div>
        ) : null}
      </form>

      <div className="io-group io-group--icons">
        <Link href="/planear" className="io-cell" onClick={onClose}>
          <span className="io-ico io-ico--tint">
            <Glyph name="clock" />
          </span>
          <span className="io-cell__txt">
            Planear con el asistente
            <span className="io-cell__sub">Mira tu agenda y propone cuándo</span>
          </span>
          <Glyph name="chevron" className="io-chev" />
        </Link>
        {onOpenTask ? (
          <button
            type="button"
            className="io-cell io-press"
            onClick={() => {
              onClose();
              onOpenTask();
            }}
          >
            <span className="io-ico io-ico--tint">
              <Glyph name="check" />
            </span>
            <span className="io-cell__txt">
              Tarea con fecha
              <span className="io-cell__sub">Con su día y, si quieres, su hora</span>
            </span>
            <Glyph name="chevron" className="io-chev" />
          </button>
        ) : (
          <Link href="/tareas/nueva" className="io-cell" onClick={onClose}>
            <span className="io-ico io-ico--tint">
              <Glyph name="check" />
            </span>
            <span className="io-cell__txt">
              Tarea con fecha
              <span className="io-cell__sub">Con su día y, si quieres, su hora</span>
            </span>
            <Glyph name="chevron" className="io-chev" />
          </Link>
        )}
        {onOpenReminder ? (
          <button
            type="button"
            className="io-cell io-press"
            onClick={() => {
              onClose();
              onOpenReminder();
            }}
          >
            <span className="io-ico io-ico--rem">
              <Glyph name="flag" />
            </span>
            <span className="io-cell__txt">
              Reminder
              <span className="io-cell__sub">Un parcial, una entrega, una cita</span>
            </span>
            <Glyph name="chevron" className="io-chev" />
          </button>
        ) : (
          <Link href="/reminders/nuevo" className="io-cell" onClick={onClose}>
            <span className="io-ico io-ico--rem">
              <Glyph name="flag" />
            </span>
            <span className="io-cell__txt">
              Reminder
              <span className="io-cell__sub">Un parcial, una entrega, una cita</span>
            </span>
            <Glyph name="chevron" className="io-chev" />
          </Link>
        )}

        {showResource || onOpenResource ? (
          onOpenResource ? (
            <button
              type="button"
              className="io-cell io-press"
              onClick={() => {
                onClose();
                onOpenResource();
              }}
            >
              <span className="io-ico io-ico--tint">
                <Glyph name="sparkles" />
              </span>
              <span className="io-cell__txt">
                Nuevo recurso
                <span className="io-cell__sub">Guardar enlace, skill o herramienta</span>
              </span>
              <Glyph name="chevron" className="io-chev" />
            </button>
          ) : (
            <Link href="/recursos" className="io-cell" onClick={onClose}>
              <span className="io-ico io-ico--tint">
                <Glyph name="sparkles" />
              </span>
              <span className="io-cell__txt">
                Nuevo recurso
                <span className="io-cell__sub">Guardar enlace, skill o herramienta</span>
              </span>
              <Glyph name="chevron" className="io-chev" />
            </Link>
          )
        ) : null}
      </div>
    </Sheet>
  );
}
