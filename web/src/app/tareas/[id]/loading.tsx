import { Spinner } from '@/components/Spinner';
import { TabBar } from '@/components/fd4/TabBar';

export default function TareaLoading() {
  return (
    <div className="fd-app">
      <main className="fd-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
        <Spinner size={32} />
        <span style={{ fontSize: 15, color: 'var(--io-label-2)', fontWeight: 500 }}>
          Cargando tarea…
        </span>
      </main>
      <TabBar />
    </div>
  );
}
