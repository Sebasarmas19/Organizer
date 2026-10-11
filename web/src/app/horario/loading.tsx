import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/Spinner';

export default function HorarioLoading() {
  return (
    <div className="applayout">
      <div
        className="flex items-center justify-between gutter"
        style={{ paddingBlock: 'var(--space-2)' }}
      >
        <span className="taptext taptext--quiet t-meta flex items-center gap-1 opacity-50">
          <Icon name="chevron-left" size="sm" />
          Volver
        </span>
        <span className="taptext t-meta font-semibold opacity-50" style={{ color: 'var(--accent-text)' }}>
          Listo
        </span>
      </div>
      <header className="pagehead" style={{ paddingBottom: 'var(--space-2)' }}>
        <div>
          <h1 className="t-title">Tu horario</h1>
          <p className="t-meta c-muted">Cargando horario…</p>
        </div>
      </header>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: 12,
        }}
      >
        <Spinner size={32} />
      </div>
    </div>
  );
}
