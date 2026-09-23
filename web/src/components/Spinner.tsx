import type { CSSProperties } from 'react';

/* ============================================================================
   Organizer · <Spinner>
   
   Spinner circular de alta fidelidad estilo iOS / Apple.
   Utiliza <animateTransform> nativo de SVG para garantizar rotación continua,
   fluida (60/120fps) y con aceleración por hardware en cualquier navegador o SO,
   sin riesgo de ser congelado por directivas CSS de prefers-reduced-motion.
   ========================================================================= */

export function Spinner({
  size = 20,
  color = 'var(--accent)',
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Pista circular de fondo */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="var(--line-control)"
        strokeWidth="2.5"
        opacity="0.22"
      />
      {/* Arco giratorio con animación nativa SVG */}
      <g>
        <path
          d="M12 2.5A9.5 9.5 0 0 1 21.5 12"
          stroke={color}
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.75s"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
}
