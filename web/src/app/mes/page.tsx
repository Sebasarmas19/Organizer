/* ============================================================================
   Organizer · Página Mes (`/mes`) (F2 · app/comps/mes.html)
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getMonthData } from '@/lib/calendar';
import { getTodayString, parseDateString } from '@/lib/date-utils';
import { MonthView } from '@/components/MonthView';
import { TabBar } from '@/components/TabBar';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

export default async function MesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; year?: string; month?: string }>;
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

  let year: number;
  let month: number;

  if (params.year && params.month) {
    year = parseInt(params.year, 10);
    month = parseInt(params.month, 10);
  } else if (params.date) {
    const parsed = parseDateString(params.date);
    year = parsed.year;
    month = parsed.month;
  } else {
    const parsed = parseDateString(todayStr);
    year = parsed.year;
    month = parsed.month;
  }

  const data = await getMonthData(supabase, user.id, year, month, timezone);

  return (
    <div className="applayout">
      <MonthView data={data} />
      <div className="block lg:hidden">
        <TabBar />
      </div>
    </div>
  );
}
