'use client';

/* ============================================================================
   Organizer · FD4 · <RecursosView>

   El problema de Recursos es el mismo que el de toda la app: guardar funciona,
   volver no (docs/06-recursos.md). Por eso la vista abre con UNA cosa:

     "Para retomar"  el recurso sin abrir mas antiguo, con Abrir, Detalles
                     y Archivar. Uno al dia, sin lista de culpa.

   Debajo, la biblioteca como lista densa que se escanea: buscador, tipos con
   su cuenta y "Sin abrir". Elegir una fila abre su detalle — debajo de la
   fila en el telefono, en el panel de la derecha en escritorio.

   Todo el filtrado es en el cliente: la biblioteca es de una persona y cabe
   entera en memoria. Cero viajes al teclear.
   ========================================================================= */

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import type { ResourcesData, ResourceItem, ResourceKind } from '@/lib/fd4-resources';
import { KIND_LABELS } from '@/lib/fd4-resources';
import { useRouter } from 'next/navigation';
import {
  deleteResourceAction,
  restoreResourceAction,
  trackResourceOpenAction,
} from '@/lib/resources-actions';
import { ResourceDetail, ResourceRow, domainOf, savedAgo } from './ResourceCard';
import { CreateResourceModal } from './CreateResourceModal';
import { KindIcon } from './KindIcon';
import { Icon } from '@/components/Icon';

const KINDS: (ResourceKind | 'all')[] = ['all', 'tool', 'skill', 'article', 'repo', 'video', 'other'];

export function RecursosView({ data }: { data: ResourcesData }) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [unopened, setUnopened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [archivedLast, setArchivedLast] = useState<ResourceItem | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const [archived, setArchived] = useOptimistic<string[], { id: string; add: boolean }>(
    [],
    (prev, { id, add }) => (add ? [...prev, id] : prev.filter((x) => x !== id))
  );

  const live = useMemo(
    () => data.items.filter((r) => !archived.includes(r.id)),
    [data.items, archived]
  );

  const filtering = search.trim() !== '' || kind !== 'all' || unopened;

  /* El que mas tiempo lleva esperando. Solo cuando no se esta buscando:
     con un filtro puesto, la pregunta es otra. */
  const resume = useMemo(() => {
    if (filtering) return null;
    return (
      [...live]
        .filter((r) => r.openCount === 0)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null
    );
  }, [live, filtering]);

  const list = useMemo(() => {
    let result = live;
    if (kind !== 'all') result = result.filter((r) => r.kind === kind);
    if (unopened) result = result.filter((r) => r.openCount === 0);
    const q = search.trim().toLowerCase().replace(/^#/, '');
    if (q) {
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.notes?.toLowerCase().includes(q) ?? false) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          domainOf(r.url).includes(q)
      );
    }
    return result;
  }, [live, kind, unopened, search]);

  const unopenedCount = live.filter((r) => r.openCount === 0).length;

  /* En escritorio el panel nunca esta vacio: sin eleccion, enseña el de
     "Para retomar" o el primero de la lista. */
  const selected =
    live.find((r) => r.id === selectedId) ?? resume ?? list[0] ?? null;

  const archive = (r: ResourceItem) => {
    setArchivedLast(r);
    if (selectedId === r.id) setSelectedId(null);
    startTransition(async () => {
      setArchived({ id: r.id, add: true });
      await deleteResourceAction(r.id);
    });
  };

  const undoArchive = () => {
    const r = archivedLast;
    if (!r) return;
    setArchivedLast(null);
    startTransition(async () => {
      setArchived({ id: r.id, add: false });
      await restoreResourceAction(r.id);
    });
  };

  const openResource = (r: ResourceItem) => {
    startTransition(async () => {
      await trackResourceOpenAction(r.id);
      router.refresh();
    });
    if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
  };

  const pickTag = (tag: string) => {
    setSearch(`#${tag}`);
    setKind('all');
  };

  const clearFilters = () => {
    setSearch('');
    setKind('all');
    setUnopened(false);
  };

  return (
    <div className="fd-recursos">
      <div className="fd-recursos__head">
        <div>
          <h1 className="fd-h1 fd-h1--screen">Recursos</h1>
          <span className="fd-sub">
            {live.length} {live.length === 1 ? 'guardado' : 'guardados'}
            {unopenedCount > 0 ? ` · ${unopenedCount} sin abrir` : ''}
          </span>
        </div>

        <button type="button" onClick={() => setIsModalOpen(true)} className="fd-btn fd-reshead__new">
          <Icon name="plus" size="sm" />
          Nuevo
        </button>
      </div>

      <div className="fd-res">
        <div className="fd-res__main">
          <div className="fd-recursos__searchbox">
            <span className="fd-search__icon" aria-hidden>
              <Icon name="search" size="sm" />
            </span>
            <input
              id="fd-res-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, nota o #etiqueta"
              className="fd-search__input"
              aria-label="Buscar recursos"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="fd-search__clear"
                aria-label="Borrar búsqueda"
              >
                <Icon name="xmark" size="sm" />
              </button>
            ) : null}
          </div>

          <div className="fd-reschips" role="group" aria-label="Filtrar por tipo">
            {KINDS.filter((k) => k === 'all' || data.countsByKind[k] > 0).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className="fd-reschip"
              >
                {k !== 'all' ? <KindIcon kind={k} size="sm" /> : null}
                {KIND_LABELS[k].label}
                <span className="fd-reschip__count">{data.countsByKind[k]}</span>
              </button>
            ))}
            {unopenedCount > 0 ? (
              <button
                type="button"
                aria-pressed={unopened}
                onClick={() => setUnopened(!unopened)}
                className="fd-reschip fd-reschip--unopened"
              >
                <span className="fd-resrow__new" aria-hidden />
                Sin abrir
                <span className="fd-reschip__count">{unopenedCount}</span>
              </button>
            ) : null}
          </div>

          {resume ? (
            <section className="fd-resume" aria-labelledby="fd-resume-label">
              <div className="fd-seclabel">
                <h2 id="fd-resume-label">Para retomar</h2>
              </div>
              <div className="fd-lead">
              <p className="fd-lead__title">{resume.title}</p>
              <span className="fd-lead__when">
                {[domainOf(resume.url), 'sin abrir'].filter(Boolean).join(' · ')} · guardado{' '}
                <span suppressHydrationWarning>{savedAgo(resume.createdAt)}</span>
              </span>
              {resume.notes ? <p className="fd-lead__hint">“{resume.notes}”</p> : null}
              <div className="fd-resume__acts">
                {resume.url ? (
                  <button type="button" className="fd-btn fd-btn--primary" onClick={() => openResource(resume)}>
                    Abrir
                  </button>
                ) : null}
                <button
                  type="button"
                  className="fd-btn"
                  aria-expanded={selectedId === resume.id}
                  onClick={() => setSelectedId(selectedId === resume.id ? null : resume.id)}
                >
                  Detalles
                </button>
                <button type="button" className="fd-btn fd-btn--quiet" onClick={() => archive(resume)}>
                  Archivar
                </button>
              </div>
              {selectedId === resume.id ? (
                <div className="fd-res__inline fd-res__inline--resume">
                  <ResourceDetail resource={resume} onTagClick={pickTag} onArchive={archive} />
                </div>
              ) : null}
              </div>
            </section>
          ) : null}

          {archivedLast ? (
            <p className="fd-undo" role="status">
              <span>
                Archivado: <b>{archivedLast.title}</b>
              </span>
              <button type="button" className="fd-undo__btn" onClick={undoArchive}>
                <Icon name="undo" size="sm" />
                Deshacer
              </button>
            </p>
          ) : null}

          {list.length > 0 ? (
            <section>
              <div className="fd-seclabel">
                <h2>{filtering ? 'Resultados' : 'Biblioteca'}</h2>
                <span className="fd-seclabel__count">
                  {filtering ? `${list.length} de ${live.length}` : list.length}
                </span>
              </div>
              <div className="fd-card fd-card--list">
                <div className="fd-card__body">
                  {list.map((r) => {
                    const isSel = selectedId === r.id;
                    return (
                      <div key={r.id} className="fd-resitem">
                        <ResourceRow
                          resource={r}
                          current={selected?.id === r.id}
                          selected={isSel}
                          onSelect={() => setSelectedId(isSel ? null : r.id)}
                        />
                        {isSel && r.id !== resume?.id ? (
                          <div className="fd-res__inline">
                            <ResourceDetail resource={r} onTagClick={pickTag} onArchive={archive} />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <div className="fd-recursos__empty">
              <span className="fd-recursos__empty-icon" aria-hidden>
                <Icon name="bookmark" size="lg" />
              </span>
              <p className="fd-recursos__emptytitle">
                {search
                  ? `Nada coincide con “${search}”.`
                  : unopened
                    ? 'Ya abriste todo lo que guardaste.'
                    : live.length === 0
                      ? 'Todavía no hay recursos guardados.'
                      : 'No hay recursos de este tipo.'}
              </p>
              <p className="fd-sub">
                {filtering
                  ? 'Prueba otra palabra o quita los filtros.'
                  : 'Guarda herramientas, artículos o skills para consultarlos cuando los necesites.'}
              </p>
              {filtering ? (
                <button type="button" onClick={clearFilters} className="fd-btn">
                  Quitar filtros
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="fd-btn fd-btn--primary"
                >
                  <Icon name="plus" size="sm" />
                  Añadir primer recurso
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="fd-res__pane" aria-label="Detalle del recurso">
          {selected ? (
            <ResourceDetail
              key={selected.id}
              resource={selected}
              onTagClick={pickTag}
              onArchive={archive}
            />
          ) : (
            <div className="fd-res__pane-empty">
              <span className="fd-res__pane-empty-icon" aria-hidden>
                <Icon name="bookmark" size="lg" />
              </span>
              <p className="fd-res__pane-empty-title">Ningún recurso seleccionado</p>
              <p className="fd-sub">Elige un recurso de la biblioteca para consultar sus notas, enlaces y detalles.</p>
            </div>
          )}
        </aside>
      </div>

      <CreateResourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
