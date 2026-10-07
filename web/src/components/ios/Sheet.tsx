'use client';

/* ============================================================================
   Organizer · <Sheet>  ·  la hoja de iOS

   Sube desde abajo con un muelle y se cierra de tres maneras: la X, tocar
   fuera, o arrastrarla hacia abajo por el asa. El arrastre sigue al dedo
   1:1; hacia arriba resiste (no hay nada mas alla); al soltar, se proyecta
   la inercia y se decide con el punto donde ACABARIA el gesto, no con donde
   esta el dedo. Por eso un tiron corto y rapido tambien la cierra.

   Siempre esta montada: asi el cierre se anima. Cerrada es `inert`, no se
   puede tabular dentro ni la lee un lector de pantalla.

   Se dibuja en <body> (portal): si colgara de la pantalla, cualquier
   contexto de apilamiento de un padre la dejaria debajo de la barra de
   pestanas, como paso con el formulario de Recursos.
   ========================================================================= */

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Glyph } from './Glyph';
import { project, rubberband } from './spring';

type Drag = { y: number; t: number; dy: number; v: number };

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  /* Al abrir, el foco entra en la hoja; al cerrar, vuelve a quien la abrio. */
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => sheet.current?.focus({ preventScroll: true }), 50);
    return () => {
      window.clearTimeout(timer);
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sheet.current;
    if (!el || (e.target as HTMLElement).closest('button, a')) return;
    /* En escritorio la hoja va centrada (ios.css §8) y no se arrastra. */
    if (window.matchMedia('(min-width: 900px)').matches) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    el.dataset.drag = 'true';
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = sheet.current;
    if (!d || !el) return;
    const now = performance.now();
    let dy = e.clientY - d.y;
    if (dy < 0) dy = -rubberband(-dy, el.offsetHeight);
    d.v = ((dy - d.dy) / Math.max(1, now - d.t)) * 1000;
    d.dy = dy;
    d.t = now;
    el.style.transform = `translateY(${dy}px)`;
  };

  /* Modal de verdad: con el teclado, Tab da la vuelta dentro de la hoja y
     no se escapa a la pagina de detras. */
  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = sheet.current;
    if (!el) return;
    const nodes = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === el)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onUp = () => {
    const d = drag.current;
    const el = sheet.current;
    drag.current = null;
    if (!d || !el) return;
    /* Quitar el arrastre y el transform en el mismo cuadro: la transicion
       arranca desde donde dejo el dedo, sin salto. */
    delete el.dataset.drag;
    el.style.transform = '';
    if (d.dy + project(d.v) > Math.min(160, el.offsetHeight * 0.35)) onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="io-scrim" data-open={open} onClick={onClose} aria-hidden="true" />
      <div
        ref={sheet}
        className="io-sheet"
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={!open}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') trapTab(e);
        }}
      >
        <div
          className="io-sheet__top"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="io-grab" aria-hidden="true">
            <span />
          </div>
          <div className="io-shead">
            <button type="button" className="io-glass io-circ io-press" aria-label="Cerrar" onClick={onClose}>
              <Glyph name="xmark" />
            </button>
            <div className="io-stitle">
              <b id={titleId}>{title}</b>
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
            <span aria-hidden="true" />
          </div>
        </div>
        <div className="io-sheet__body">{children}</div>
      </div>
    </>,
    document.body
  );
}

function noop() {
  return () => {};
}
