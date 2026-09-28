/* ============================================================================
   Organizer · Nuevo reminder (/reminders/nuevo?d=YYYY-MM-DD)

   Se llega desde el calendario (el día que estabas viendo) o desde
   Pendientes. La fecha viene rellena con ese día.
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileTimezone } from '@/lib/profile';
import { getTodayString } from '@/lib/date-utils';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { BackButton } from '@/components/planner/BackButton';
import { ReminderForm } from '@/components/planner/ReminderForm';
import { Flag } from '@/components/fd4/Marks';

export const dynamic = 'force-dynamic';

export default async function NewReminderPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const todayStr = getTodayString(await getProfileTimezone(supabase, user.id));
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : todayStr;

  return (
    <div className="fd-app">
      <DeskSidebar active="calendario" todayStr={todayStr} />
      <main className="fd-screen">
        <div className="pl-top">
          <BackButton fallback="/calendario?v=mes" />
        </div>
        <header className="pl-head">
          <span className="pl-head__kind">
            <Flag size="xs" /> Nuevo reminder
          </span>
          <h1 className="pl-head__title">Una fecha que no depende de ti</h1>
          <span className="fd-sub">Parcial, entrega, defensa. Después lo partes en tareas.</span>
        </header>
        <ReminderForm
          mode="create"
          initial={{ title: '', occursOn: date, occursAt: '', noticeDays: '', notes: '' }}
        />
      </main>
      <TabBar />
    </div>
  );
}
