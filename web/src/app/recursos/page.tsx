/* ============================================================================
   Organizer · FD4 · Recursos (docs/06-recursos.md)
   Biblioteca personal de skills, herramientas, artículos y repositorios.
   ========================================================================= */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getTodayString } from '@/lib/date-utils';
import { getResourcesData } from '@/lib/fd4-resources';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { RecursosView } from '@/components/fd4/RecursosView';
import { Setup } from '../Setup';

export const metadata: Metadata = { title: 'Recursos · Organizer' };

export const dynamic = 'force-dynamic';

export default async function RecursosPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; filter?: string; q?: string }>;
}) {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/entrar');

  const params = await searchParams;
  const [profileRes, data] = await Promise.all([
    supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle(),
    getResourcesData(supabase, user.id, params),
  ]);

  const timezone = profileRes.data?.timezone ?? DEFAULT_TIMEZONE;
  const todayStr = getTodayString(timezone);

  return (
    <div className="fd-app">
      <DeskSidebar active="recursos" todayStr={todayStr} />

      <main
        className="fd-screen"
        style={{ paddingBottom: 'calc(var(--tab-bar-h) + var(--space-8))' }}
      >
        <RecursosView data={data} />
      </main>

      <TabBar />
    </div>
  );
}
