import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/Spinner';
import { TabBar } from '@/components/fd4/TabBar';

export default function ClasesLoading() {
  return (
    <div className="fd-app">
      <main className="fd-screen">
        <div className="fd5-clases">
          <div className="fd5-pagetop">
            <span className="fd5-back opacity-50 flex items-center gap-1">
              <Icon name="chevron-left" size="md" />
              Hoy
            </span>
            <span className="fd5-smallbtn opacity-50">Editar</span>
          </div>
          <div className="fd5-ptitle">
            <h1>Horario</h1>
            <p>Cargando clases…</p>
          </div>
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
      </main>
      <TabBar />
    </div>
  );
}
