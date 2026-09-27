'use client';

/* ============================================================================
   Organizer · Recursos · <ResourceRow> y <ResourceDetail>

   La tarjeta alta de antes (tipo, dominio, notas, etiquetas y tres botones)
   dejaba ver dos recursos y medio por pantalla. Ahora hay dos piezas:

     <ResourceRow>     una fila de 56px: icono, titulo, dominio y etiqueta.
                       Se escanea, que es lo que se hace en una biblioteca.
     <ResourceDetail>  todo lo demas, al elegir una fila. En el telefono se
                       abre debajo de la fila; en escritorio, en el panel de
                       la derecha.

   Archivar no pregunta con `confirm()` (bloquea y no se puede deshacer):
   archiva en el acto y la vista enseña "Deshacer". Regla del sistema.
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ResourceItem } from '@/lib/fd4-resources';
import { KIND_SINGULAR } from '@/lib/fd4-resources';
import { trackResourceOpenAction, planResourceAction } from '@/lib/resources-actions';
import { Icon } from '@/components/Icon';
import { KindIcon } from './KindIcon';

export function isSafeHttpUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function domainOf(url: string | null): string {
  if (!url || !isSafeHttpUrl(url)) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function savedAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

function tomorrowLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ------------------------------------------------------------------ fila */

export function ResourceRow({
  resource,
  current = false,
  selected,
  onSelect,
}: {
  resource: ResourceItem;
  /** El que enseña el panel de escritorio, aunque nadie lo haya tocado. */
  current?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const domain = domainOf(resource.url);
  const sub = [domain || KIND_SINGULAR[resource.kind], resource.tags[0] ? `#${resource.tags[0]}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      className="fd-resrow"
      aria-expanded={selected}
      data-selected={selected ? 'true' : 'false'}
      data-current={current ? 'true' : 'false'}
      onClick={onSelect}
    >
      <span className="fd-resrow__kind">
        <KindIcon kind={resource.kind} />
      </span>
      <span className="fd-resrow__text">
        <span className="fd-resrow__title">{resource.title}</span>
        <span className="fd-meta">{sub}</span>
      </span>
      {resource.openCount === 0 ? (
        <span className="fd-resrow__new" title="Sin abrir">
          <span className="sr-only">Sin abrir</span>
        </span>
      ) : (
        <span className="fd-resrow__count">{resource.openCount}×</span>
      )}
    </button>
  );
}

/* --------------------------------------------------------------- detalle */

export function ResourceDetail({
  resource,
  onTagClick,
  onArchive,
}: {
  resource: ResourceItem;
  onTagClick: (tag: string) => void;
  onArchive: (resource: ResourceItem) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planning, setPlanning] = useState(false);
  const [planDate, setPlanDate] = useState(tomorrowLocal);
  const [planned, setPlanned] = useState<string | null>(null);

  const domain = domainOf(resource.url);

  const open = () => {
    startTransition(async () => {
      await trackResourceOpenAction(resource.id);
      router.refresh();
    });
    if (resource.url && isSafeHttpUrl(resource.url)) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const plan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planDate) return;
    startTransition(async () => {
      await planResourceAction(resource.id, resource.title, planDate);
      setPlanned(planDate);
      setPlanning(false);
      router.refresh();
    });
  };

  return (
    <article className="fd-resdetail">
      <h2 className="fd-resdetail__title">{resource.title}</h2>

      <span className="fd-resdetail__kicker">
        <KindIcon kind={resource.kind} size="sm" />
        {KIND_SINGULAR[resource.kind]} · guardado{' '}
        <span suppressHydrationWarning>{savedAgo(resource.createdAt)}</span> ·{' '}
        {resource.openCount === 0
          ? 'sin abrir'
          : `${resource.openCount} ${resource.openCount === 1 ? 'consulta' : 'consultas'}`}
      </span>

      {domain ? (
        <a className="fd-resdetail__url" href={resource.url ?? undefined} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); open(); }}>
          <Icon name="link" size="sm" />
          {domain}
        </a>
      ) : null}

      {resource.notes ? (
        <div className="fd-resdetail__notes">
          <span className="fd-resdetail__label">Por qué lo guardaste</span>
          <p>{resource.notes}</p>
        </div>
      ) : null}

      {resource.tags.length > 0 ? (
        <div className="fd-resdetail__tags">
          {resource.tags.map((t) => (
            <button key={t} type="button" className="fd-tagchip" onClick={() => onTagClick(t)}>
              #{t}
            </button>
          ))}
        </div>
      ) : null}

      {planning ? (
        <form className="fd-resdetail__plan" onSubmit={plan}>
          <label htmlFor={`plan-${resource.id}`} className="fd-resdetail__label">
            Crear una tarea para consultarlo el
          </label>
          <div className="fd-resdetail__planrow">
            <input
              id={`plan-${resource.id}`}
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="fd-resdetail__date"
              required
            />
            <button type="submit" className="fd-btn fd-btn--primary" disabled={isPending}>
              {isPending ? 'Agendando…' : 'Agendar'}
            </button>
            <button type="button" className="fd-btn fd-btn--quiet" onClick={() => setPlanning(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {planned ? (
        <p className="fd-note" role="status">
          Tarea creada en Pendientes para el {planned.split('-').reverse().join('/')}.
        </p>
      ) : null}

      <div className="fd-resdetail__acts">
        <button type="button" className="fd-btn fd-btn--primary" onClick={open} disabled={isPending}>
          {resource.url ? 'Abrir enlace' : 'Marcar consultado'}
        </button>
        {!planning ? (
          <button type="button" className="fd-btn" onClick={() => setPlanning(true)}>
            <Icon name="calendar" size="sm" />
            Planificar
          </button>
        ) : null}
        <button type="button" className="fd-btn fd-btn--quiet" onClick={() => onArchive(resource)}>
          Archivar
        </button>
      </div>
    </article>
  );
}
