/* ============================================================================
   Organizer · FD4 · las marcas de entidad

   Tres formas, tres significados, cero texto de color:

     punto      ·  tarea (azul) o materia (verde)
     banderin   ·  reminder, siempre ambar, nunca otra cosa
     casilla    ·  tarea, y solo tarea: un reminder no se completa

   Que el ambar no pueda ser texto no es una opinion: un ambar que llegue a
   4.5:1 sobre blanco ha dejado de ser ambar y es marron. Ver la cabecera de
   `tokens.css`.
   ========================================================================= */

type Entity = 'task' | 'subject' | 'reminder';

/** El punto de la rejilla de mes, de la tira de semana y de la etiqueta de
    seccion. `size` sigue los tres tamanos que usa el diseno. */
export function Dot({
  entity,
  size = 'md',
}: {
  entity: Entity | 'none';
  size?: 'md' | 'sm' | 'xs';
}) {
  const cls = [
    'fd-dot',
    `fd-dot--${entity}`,
    size === 'sm' ? 'fd-dot--sm' : '',
    size === 'xs' ? 'fd-dot--xs' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={cls} aria-hidden />;
}

/** El banderin. Cuatro tamanos, una sola forma. */
export function Flag({ size = 'md' }: { size?: 'md' | 'sm' | 'xs' | 'tiny' }) {
  return <span className={`fd-flag${size === 'md' ? '' : ` fd-flag--${size}`}`} aria-hidden />;
}

/** La casilla. `interactive` a false la deja como indicador (la version
    chica de la tarjeta de dia), que no se puede marcar desde ahi. */
export function Check({
  on,
  variant = 'full',
}: {
  on?: boolean;
  variant?: 'full' | 'mini' | 'chip';
}) {
  return (
    <span
      className={`fd-check${variant === 'full' ? '' : ` fd-check--${variant}`}`}
      data-on={on ? 'true' : 'false'}
      aria-hidden
    />
  );
}
