/* ============================================================================
   Organizer · Página Día (`/dia`) (F2 · app/comps/dia.html)
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getDayData } from '@/lib/calendar';
import { getTodayString } from '@/lib/date-utils';
import { DayView } from '@/components/DayView';
import { TabBar } from '@/components/TabBar';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

export default async function DiaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; anadir?: string; tab?: string }>;
}) {
  if (!isSupabaseConfigured()) return <Setup />;

  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const timezone = profile?.timezone || DEFAULT_TIMEZONE;
  const todayStr = getTodayString(timezone);
  const targetDate = params.date || todayStr;

  const data = await getDayData(supabase, user.id, targetDate, timezone);

  return (
    <div className="applayout">
      <DayView
        data={data}
        initialAddOpen={params.anadir === '1'}
        initialTab={params.tab === 'reminder' ? 'reminder' : 'tarea'}
      />
      <TabBar />
    </div>
  );
}
