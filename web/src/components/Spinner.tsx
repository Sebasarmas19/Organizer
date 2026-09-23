'use client';

/* ============================================================================
   Organizer · <Spinner>
   
   Indicador de carga circular y minimalista. Usa `--accent` y `--line-strong`
   para integrarse naturalmente tanto en modo claro como en modo oscuro.
   ========================================================================= */

import type { CSSProperties } from 'react';

export function Spinner({
  size = 20,
  className,
  style,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={`fd-spin ${className || ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="var(--line-strong)"
        strokeWidth="2.5"
        opacity="0.3"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
