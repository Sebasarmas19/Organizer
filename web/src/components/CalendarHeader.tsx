'use client';

/* ============================================================================
   Organizer · <CalendarHeader> (F2 · decisión 67)

   Cabecera idéntica en los tres niveles de zoom (Mes -> Semana -> Día).
   A la izquierda el botón de subir nivel al estilo iOS (`‹ Semana` o `‹ Septiembre`).
   En Mes, que es el techo, el título ocupa el sitio exacto del botón de subir,
   para que la cabecera no se mueva un píxel al cambiar de nivel.
   A la derecha: Hoy, flechas anterior/siguiente y botón añadir (+).
   ========================================================================= */

import Link from 'next/link';
import { Icon } from './Icon';

export function CalendarHeader({
  level,
  upLevelText,
  upLevelHref,
  monthTitle,
  onToday,
  onPrev,
  onNext,
  onAdd,
  prevAriaLabel,
  nextAriaLabel,
}: {
  level: 'dia' | 'semana' | 'mes';
  upLevelText?: string;
  upLevelHref?: string;
  monthTitle?: string;
  onToday?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onAdd?: () => void;
  prevAriaLabel: string;
  nextAriaLabel: string;
}) {
  return (
    <div className="calhead">
      {level === 'mes' ? (
        <h1 className="calhead__title">{monthTitle}</h1>
      ) : upLevelHref ? (
        <Link href={upLevelHref} className="uplevel no-underline">
          <Icon name="chevron-left" size="sm" />
          <span>{upLevelText}</span>
        </Link>
      ) : null}

      <div className="calhead__acts">
        <button
          type="button"
          onClick={onToday}
          className="taptext taptext--quiet t-meta"
          style={{ marginInline: 0 }}
        >
          Hoy
        </button>

        <button
          type="button"
          onClick={onPrev}
          className="tapicon"
          aria-label={prevAriaLabel}
        >
          <Icon name="chevron-left" size="lg" />
        </button>

        <button
          type="button"
          onClick={onNext}
          className="tapicon"
          aria-label={nextAriaLabel}
        >
          <Icon name="chevron-right" size="lg" />
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="tapicon no-underline"
          aria-label="Añadir"
          style={{ color: 'var(--task)' }}
        >
          <Icon name="plus" size="lg" />
        </button>
      </div>
    </div>
  );
}
