/* ============================================================================
   Organizer · FD4 · <CalHeader>  ·  la cabecera del modulo Calendario

   UN SOLO JUEGO DE FLECHAS PARA LAS TRES VISTAS. Sirven para lo que estes
   viendo: mes anterior, semana anterior o dia anterior. "Hoy" devuelve las
   tres a su sitio de una vez.

   TODO SON ENLACES, NO BOTONES. El estado del calendario (que vista, que
   fecha) vive en la URL — `?v=semana&d=2026-09-17` — y no en un `useState`.
   Tres consecuencias que valen el trabajo:

     · el boton de atras del iPhone funciona como la gente espera
     · una notificacion puede abrir un dia concreto con un enlace y ya
     · la pagina entera se renderiza en el servidor, sin JavaScript de
       navegacion y sin un parpadeo de carga por cada flecha

   El conmutador lleva `role="tablist"` y `aria-selected` porque Mes, Semana
   y Dia son pestanas de verdad: tres vistas del mismo contenido. Eso no es
   decoracion semantica, es lo que hace que VoiceOver las anuncie como
   "pestana 2 de 3" en vez de como tres enlaces sueltos.
   ========================================================================= */

import Link from 'next/link';
import type { CalView } from '@/lib/fd4-calendar';
import { stepDate } from '@/lib/fd4-calendar';

const VIEWS: { id: CalView; label: string }[] = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Día' },
];

export function CalHeader({
  view,
  dateStr,
  todayStr,
  title,
  subtitle,
}: {
  view: CalView;
  dateStr: string;
  todayStr: string;
  title: string;
  subtitle: string;
}) {
  const to = (v: CalView, d: string) => `/calendario?v=${v}&d=${d}`;

  return (
    <div className="fd-fixedhead">
      <div className="fd-calhead__row">
        <div className="fd-calhead__title">
          <h1 className="fd-h1 fd-h1--cal">{title}</h1>
          <span className="fd-sub">{subtitle}</span>
        </div>

        <div className="fd-calhead__nav">
          <Link
            href={to(view, stepDate(view, dateStr, -1))}
            className="fd-btn fd-btn--icon"
            aria-label={`Anterior: ${view}`}
            scroll={false}
          >
            ‹
          </Link>
          <Link
            href={to(view, stepDate(view, dateStr, 1))}
            className="fd-btn fd-btn--icon"
            aria-label={`Siguiente: ${view}`}
            scroll={false}
          >
            ›
          </Link>
        </div>
      </div>

      <div className="fd-calhead__seg">
        <div className="fd-seg" role="tablist" aria-label="Vista del calendario">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={to(v.id, dateStr)}
              role="tab"
              aria-selected={view === v.id}
              scroll={false}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <Link href={to(view, todayStr)} className="fd-btn" scroll={false}>
          Hoy
        </Link>
      </div>
    </div>
  );
}
