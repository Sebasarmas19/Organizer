/* ============================================================================
   Organizer · FD4 · Biblioteca de Recursos (docs/06-recursos.md)
   Herramientas, skills, artículos, repositorios y videos.
   ========================================================================= */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ResourceKind } from '@/lib/supabase/database.types';

export type { ResourceKind };

export interface ResourceItem {
  id: string;
  title: string;
  url: string | null;
  kind: ResourceKind;
  notes: string | null;
  tags: string[];
  createdAt: string;
  openedAt: string | null;
  openCount: number;
}

export interface ResourcesData {
  items: ResourceItem[];
  totalCount: number;
  unopenedCount: number;
  countsByKind: Record<ResourceKind | 'all', number>;
  activeKind: ResourceKind | 'all';
  activeFilter: 'all' | 'unopened';
  searchQuery: string;
}

export const KIND_LABELS: Record<ResourceKind | 'all', { label: string; icon: string }> = {
  all: { label: 'Todos', icon: '📚' },
  tool: { label: 'Herramientas', icon: '🛠️' },
  skill: { label: 'Skills', icon: '🧠' },
  article: { label: 'Artículos', icon: '📄' },
  repo: { label: 'Repos', icon: '💻' },
  video: { label: 'Videos', icon: '🎬' },
  other: { label: 'Otros', icon: '📌' },
};

export async function getResourcesData(
  supabase: SupabaseClient<Database>,
  userId: string,
  params?: {
    kind?: string;
    filter?: string;
    q?: string;
  }
): Promise<ResourcesData> {
  const activeKind = (params?.kind && params.kind in KIND_LABELS ? params.kind : 'all') as ResourceKind | 'all';
  const activeFilter = params?.filter === 'unopened' ? 'unopened' : 'all';
  const searchQuery = (params?.q ?? '').trim().toLowerCase();

  // 1. Consultar todos los recursos activos del usuario
  let query = supabase
    .from('resources')
    .select('id, title, url, kind, notes, tags, created_at, opened_at, open_count')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  if (activeKind !== 'all') {
    query = query.eq('kind', activeKind);
  }

  if (activeFilter === 'unopened') {
    query = query.eq('open_count', 0);
  }

  const { data: rawItems } = await query;
  const allRows = rawItems ?? [];

  // 2. Conteo global sin filtros secundarios
  const { data: statsRows } = await supabase
    .from('resources')
    .select('kind, open_count')
    .eq('user_id', userId)
    .is('archived_at', null);

  const stats = statsRows ?? [];
  const unopenedCount = stats.filter((s) => s.open_count === 0).length;
  const countsByKind: Record<ResourceKind | 'all', number> = {
    all: stats.length,
    tool: stats.filter((s) => s.kind === 'tool').length,
    skill: stats.filter((s) => s.kind === 'skill').length,
    article: stats.filter((s) => s.kind === 'article').length,
    repo: stats.filter((s) => s.kind === 'repo').length,
    video: stats.filter((s) => s.kind === 'video').length,
    other: stats.filter((s) => s.kind === 'other').length,
  };

  // 3. Filtrar por búsqueda de texto (título, notas o tags)
  let filtered = allRows;
  if (searchQuery) {
    filtered = allRows.filter((r) => {
      const inTitle = r.title.toLowerCase().includes(searchQuery);
      const inNotes = r.notes?.toLowerCase().includes(searchQuery) ?? false;
      const inTags = r.tags.some((t) => t.toLowerCase().includes(searchQuery));
      return inTitle || inNotes || inTags;
    });
  }

  const items: ResourceItem[] = filtered.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    kind: r.kind,
    notes: r.notes,
    tags: r.tags ?? [],
    createdAt: r.created_at,
    openedAt: r.opened_at,
    openCount: r.open_count ?? 0,
  }));

  return {
    items,
    totalCount: stats.length,
    unopenedCount,
    countsByKind,
    activeKind,
    activeFilter,
    searchQuery,
  };
}
