/* ============================================================================
   Organizer · Un reminder con sus tareas (/reminders/[id])
   ========================================================================= */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileTimezone } from '@/lib/profile';
import { getReminderDetail } from '@/lib/planner-data';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { ReminderDetailView } from '@/components/planner/ReminderDetailView';

export const dynamic = 'force-dynamic';

export default async function ReminderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const timezone = await getProfileTimezone(supabase, user.id);
  const detail = await getReminderDetail(supabase, user.id, id, timezone);
  if (!detail) notFound();

  return (
    <div className="fd-app">
      <DeskSidebar active="pendientes" todayStr={detail.todayStr} />
      <main className="fd-screen">
        <ReminderDetailView detail={detail} isNew={sp.nuevo === '1'} />
      </main>
      <TabBar />
    </div>
  );
}
