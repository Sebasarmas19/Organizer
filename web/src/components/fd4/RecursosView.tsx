'use client';

/* ============================================================================
   Organizer · FD4 · <RecursosView>
   Vista interactiva principal del módulo de Recursos.
   ========================================================================= */

import { useState, useMemo } from 'react';
import type { ResourcesData, ResourceKind } from '@/lib/fd4-resources';
import { KIND_LABELS } from '@/lib/fd4-resources';
import { ResourceCard } from './ResourceCard';
import { CreateResourceModal } from './CreateResourceModal';

export function RecursosView({ data }: { data: ResourcesData }) {
  const [search, setSearch] = useState('');
  const [selectedKind, setSelectedKind] = useState<ResourceKind | 'all'>('all');
  const [filterUnopened, setFilterUnopened] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtrado reactivo en cliente (instantáneo, 0 ms)
  const filteredItems = useMemo(() => {
    let result = data.items;

    if (selectedKind !== 'all') {
      result = result.filter((r) => r.kind === selectedKind);
    }

    if (filterUnopened) {
      result = result.filter((r) => r.openCount === 0);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const inTitle = r.title.toLowerCase().includes(q);
        const inNotes = r.notes?.toLowerCase().includes(q) ?? false;
        const inTags = r.tags.some((t) => t.toLowerCase().includes(q));
        return inTitle || inNotes || inTags;
      });
    }

    return result;
  }, [data.items, selectedKind, filterUnopened, search]);

  const handleTagClick = (tag: string) => {
    setSearch(tag);
  };

  const kinds: (ResourceKind | 'all')[] = ['all', 'tool', 'skill', 'article', 'repo', 'video'];

  return (
    <div className="fd-recursos">
      {/* 1. Cabecera con Título y Botón + Nuevo */}
      <div className="fd-recursos__head">
        <div>
          <h1 className="fd-h1 fd-h1--screen">Recursos</h1>
          <span className="fd-sub">
            {data.totalCount} {data.totalCount === 1 ? 'recurso' : 'recursos'} guardados
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fd-reshead__btn"
          aria-label="Añadir nuevo recurso"
        >
          <span style={{ fontSize: '15px', fontWeight: 600 }}>+</span>
          <span>Nuevo</span>
        </button>
      </div>

      {/* 2. Buscador en tiempo real */}
      <div className="fd-recursos__searchbox">
        <span className="fd-search__icon" aria-hidden>🔍</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar herramienta, skill o #etiqueta..."
          className="fd-search__input"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="fd-search__clear"
            aria-label="Borrar búsqueda"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* 3. Filtros por Categoría */}
      <div className="fd-recursos__kinds" role="tablist" aria-label="Filtrar por tipo">
        {kinds.map((k) => {
          const info = KIND_LABELS[k];
          const count = data.countsByKind[k];
          const isActive = selectedKind === k;

          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedKind(k)}
              className="fd-kindpill"
              data-active={isActive ? 'true' : 'false'}
            >
              <span aria-hidden>{info.icon}</span>
              <span>{info.label}</span>
              {count > 0 ? <span className="fd-kindpill__count">{count}</span> : null}
            </button>
          );
        })}
      </div>

      {/* 4. Barra de Higiene ("Sin abrir") */}
      <div className="fd-recursos__sorter">
        <span className="fd-sub" style={{ fontSize: '12px' }}>
          Mostrando {filteredItems.length} de {data.totalCount}
        </span>

        {data.unopenedCount > 0 ? (
          <button
            type="button"
            onClick={() => setFilterUnopened(!filterUnopened)}
            className="fd-unopened-toggle"
            data-active={filterUnopened ? 'true' : 'false'}
          >
            <span>Sin abrir</span>
            <span className="fd-unopened-count">{data.unopenedCount}</span>
          </button>
        ) : null}
      </div>

      {/* 5. Lista de Recursos */}
      <div className="fd-recursos__list">
        {filteredItems.length > 0 ? (
          filteredItems.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onTagClick={handleTagClick}
            />
          ))
        ) : (
          <div className="fd-recursos__empty">
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
              {search ? '🔎' : '📚'}
            </span>
            <p className="t-body font-medium" style={{ color: 'var(--text)' }}>
              {search
                ? `No se encontró nada para "${search}"`
                : filterUnopened
                  ? '¡Genial! Has consultado todos tus recursos guardados.'
                  : 'Aún no tienes recursos en esta categoría.'}
            </p>
            <p className="fd-sub" style={{ marginTop: '4px' }}>
              {search
                ? 'Prueba con otra palabra o borra el filtro de búsqueda.'
                : 'Guarda herramientas, artículos o skills con el botón "+ Nuevo" o desde Safari.'}
            </p>
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="btn btn--quiet mt-3"
                style={{ height: '36px', minHeight: '36px', fontSize: '13px' }}
              >
                Limpiar búsqueda
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* 6. Modal de creación */}
      <CreateResourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
