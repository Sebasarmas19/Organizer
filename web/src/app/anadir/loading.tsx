import { Spinner } from '@/components/Spinner';

export default function AnadirLoading() {
  return (
    <div className="fd-app">
      <main
        className="fd-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 14,
        }}
      >
        <Spinner size={32} />
      </main>
    </div>
  );
}
