'use client';

/* ============================================================================
   Organizer · FD4 · <ResourceCard>
   Tarjeta de un recurso (herramienta, skill, artículo, repo, etc.)
   ========================================================================= */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ResourceItem } from '@/lib/fd4-resources';
import { KIND_LABELS } from '@/lib/fd4-resources';
import {
  trackResourceOpenAction,
  deleteResourceAction,
  planResourceAction,
} from '@/lib/resources-actions';
import { Icon } from '@/components/Icon';

export function ResourceCard({
  resource,
  onTagClick,
}: {
  resource: ResourceItem;
  onTagClick?: (tag: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planDate, setPlanDate] = useState(() => {
    // Sugerir mañana por defecto
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [plannedSuccess, setPlannedSuccess] = useState(false);

  const kindInfo = KIND_LABELS[resource.kind] ?? KIND_LABELS.other;

  let domain = '';
  if (resource.url) {
    try {
      domain = new URL(resource.url).hostname.replace(/^www\./, '');
    } catch {
      domain = resource.url;
    }
  }

  const handleOpen = () => {
    startTransition(async () => {
      await trackResourceOpenAction(resource.id);
      router.refresh();
    });
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDelete = () => {
    if (confirm(`¿Eliminar el recurso "${resource.title}"?`)) {
      startTransition(async () => {
        await deleteResourceAction(resource.id);
        router.refresh();
      });
    }
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planDate) return;

    startTransition(async () => {
      await planResourceAction(resource.id, resource.title, planDate);
      setPlannedSuccess(true);
      router.refresh();
      setTimeout(() => {
        setShowPlanDialog(false);
        setPlannedSuccess(false);
      }, 1500);
    });
  };

  return (
    <article className="fd-rescard">
      <div className="fd-rescard__top">
        <span className="fd-pill fd-pill--kind">
          <span aria-hidden>{kindInfo.icon}</span>
          <span>{kindInfo.label}</span>
        </span>

        <div className="fd-rescard__meta">
          {resource.openCount === 0 ? (
            <span className="fd-pill fd-pill--unopened" title="Guardado y nunca abierto">
              Sin abrir
            </span>
          ) : (
            <span className="fd-sub" style={{ fontSize: '12px' }}>
              {resource.openCount} {resource.openCount === 1 ? 'consulta' : 'consultas'}
            </span>
          )}
        </div>
      </div>

      <h3 className="fd-rescard__title">{resource.title}</h3>

      {domain ? (
        <div className="fd-rescard__domain">
          <span style={{ opacity: 0.7 }}><Icon name="link" size="sm" /></span>
          <span>{domain}</span>
        </div>
      ) : null}

      {resource.notes ? (
        <p className="fd-rescard__notes">{resource.notes}</p>
      ) : null}

      {resource.tags.length > 0 ? (
        <div className="fd-rescard__tags">
          {resource.tags.map((t) => (
            <button
              key={t}
              type="button"
              className="fd-rescard__tag"
              onClick={() => onTagClick?.(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      ) : null}

      {/* Planificar modal / barra emergente */}
      {showPlanDialog ? (
        <form onSubmit={handlePlanSubmit} className="fd-rescard__planform">
          <span className="fd-sub" style={{ fontSize: '13px', color: 'var(--text)' }}>
            Planificar sesión en Tareas para:
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              className="field"
              style={{ height: '36px', fontSize: '13px', padding: '0 8px' }}
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="btn btn--primary"
              style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: '13px' }}
            >
              {plannedSuccess ? '✓ Agendado' : isPending ? '...' : 'Agendar'}
            </button>
            <button
              type="button"
              onClick={() => setShowPlanDialog(false)}
              className="btn btn--quiet"
              style={{ minHeight: '36px', height: '36px', padding: '0 8px', fontSize: '13px' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="fd-rescard__footer">
        <div style={{ display: 'flex', gap: '8px' }}>
          {resource.url ? (
            <button
              type="button"
              onClick={handleOpen}
              className="fd-resbtn fd-resbtn--open"
              disabled={isPending}
            >
              <span>Abrir enlace</span>
              <Icon name="link" size="sm" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpen}
              className="fd-resbtn"
              disabled={isPending}
            >
              <span>Consultar notas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPlanDialog(!showPlanDialog)}
            className="fd-resbtn"
            title="Convertir en tarea en Pendientes"
          >
            <span>Planificar</span>
            <Icon name="calendar" size="sm" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="fd-resbtn fd-resbtn--del"
          title="Eliminar recurso"
          aria-label="Eliminar recurso"
          disabled={isPending}
        >
          <Icon name="trash" size="sm" />
        </button>
      </div>
    </article>
  );
}
