import { Spinner } from '@/components/Spinner';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        gap: 'var(--space-3)',
      }}
      role="status"
      aria-live="polite"
    >
      <Spinner size={30} />
      <span className="t-meta c-muted" style={{ fontWeight: 500 }}>
        Cargando…
      </span>
    </div>
  );
}
