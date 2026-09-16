/* ============================================================================
   Organizer · Página Semana (`/semana`) (F2 · app/comps/semana.html)
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getWeekData } from '@/lib/calendar';
import { getTodayString, getMondayOfWeek } from '@/lib/date-utils';
import { WeekView } from '@/components/WeekView';
import { TabBar } from '@/components/TabBar';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
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
  const mondayStr = getMondayOfWeek(targetDate);

  const data = await getWeekData(supabase, user.id, mondayStr, timezone);

  return (
    <div className="applayout">
      <WeekView data={data} />
      {/* En escritorio el TabBar móvil se oculta solo con lg:hidden si se añade la clase */}
      <div className="block lg:hidden">
        <TabBar />
      </div>
    </div>
  );
}
