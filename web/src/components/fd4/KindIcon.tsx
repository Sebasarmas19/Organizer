/* ============================================================================
   Organizer · <KindIcon> · el icono de cada tipo de recurso
   Set oficial Reicon (Outline, grosor 1.5).
   ========================================================================= */

import { Icon, type IconSize } from '@/components/Icon';
import type { IconName } from '@/lib/icons';
import type { ResourceKind } from '@/lib/fd4-resources';

const KIND_ICONS: Record<ResourceKind, IconName> = {
  tool: 'pen-tool',
  skill: 'stars',
  article: 'file',
  repo: 'code',
  video: 'video',
  other: 'bookmark',
};

export function KindIcon({ kind, size = 'md' }: { kind: ResourceKind; size?: IconSize }) {
  const iconName = KIND_ICONS[kind] ?? 'bookmark';
  return <Icon name={iconName} size={size} />;
}

