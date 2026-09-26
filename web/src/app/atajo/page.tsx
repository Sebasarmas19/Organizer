/* ============================================================================
   Organizer · Pantalla de instrucciones del Atajo de iOS (Siri)
   ========================================================================= */

import { captureToken } from '@/lib/env';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
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
    <div className="fd-app">
      <DeskSidebar active="ajustes" todayStr={getTodayString(DEFAULT_TIMEZONE)} />

      <main
        className="fd-screen"
        style={{ paddingBottom: 'calc(var(--tab-bar-h) + var(--space-6))' }}
      >
        <AtajoClient token={token} />
      </main>

      <TabBar />
    </div>
  );
}
