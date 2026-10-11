import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/Spinner';
import { TabBar } from '@/components/fd4/TabBar';

export default function ReminderDetailLoading() {
  return (
    <div className="fd-app">
      <main className="fd-screen">
        <div className="fd5-pagetop">
          <span className="fd5-back opacity-50 flex items-center gap-1">
            <Icon name="chevron-left" size="md" />
            Volver
          </span>
          <span className="fd5-smallbtn opacity-50">Editar</span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 12,
          }}
        >
          <Spinner size={32} />
        </div>
      </main>
      <TabBar />
    </div>
  );
}
