import { captureToken } from '@/lib/env';
import { TabBar } from '@/components/TabBar';
import { AtajoClient } from './AtajoClient';

export const dynamic = 'force-dynamic';

export default function AtajoPage() {
  let token = '';
  try {
    token = captureToken();
  } catch {
    token = 'CAPTURE_TOKEN no configurado en .env.local';
  }

  return (
    <div className="applayout">
      <main className="screen">
        <AtajoClient token={token} />
      </main>
      <TabBar />
    </div>
  );
}
