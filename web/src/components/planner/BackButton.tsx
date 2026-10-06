'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';

/**
 * Volver a donde estabas. Si se llegó por un enlace directo (una
 * notificación, por ejemplo) no hay historial, y entonces va a `fallback`.
 */
export function BackButton({
  fallback,
  label = 'Volver',
  className = 'pl-back',
}: {
  fallback: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <Icon name="chevron-left" size={className === 'pl-back' ? 'sm' : 'md'} />
      {label}
    </button>
  );
}

/** Tras guardar: vuelve atrás y fuerza datos frescos. */
export function useGoBack(fallback: string) {
  const router = useRouter();
  return () => {
    if (window.history.length > 1) router.back();
    else router.push(fallback);
    router.refresh();
  };
}
