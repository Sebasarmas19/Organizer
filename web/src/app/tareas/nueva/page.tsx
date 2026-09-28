/* ============================================================================
   Organizer · Nueva tarea con fecha y hora (/tareas/nueva?d=&t=&r=)

   Para planificar. Capturar rápido sigue siendo el botón + (/anadir).
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileTimezone } from '@/lib/profile';
import { getReminderOptions } from '@/lib/planner-data';
import { getTodayString } from '@/lib/date-utils';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { BackButton } from '@/components/planner/BackButton';
import { TaskForm } from '@/components/planner/TaskForm';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; t?: string; r?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const timezone = await getProfileTimezone(supabase, user.id);
  const todayStr = getTodayString(timezone);
  const date = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : '';
  const time = sp.t && /^\d{2}:\d{2}$/.test(sp.t) ? sp.t : '';
  const reminders = await getReminderOptions(supabase, user.id, timezone, sp.r ?? null);
  const fallback = date ? `/calendario?v=dia&d=${date}` : '/pendientes';

  return (
    <div className="fd-app">
      <DeskSidebar active="calendario" todayStr={todayStr} />
      <main className="fd-screen">
        <div className="pl-top">
          <BackButton fallback={fallback} />
        </div>
        <header className="pl-head" style={{ paddingBottom: 8 }}>
          <span className="pl-head__kind">Nueva tarea</span>
        </header>
        <TaskForm
          mode="create"
          todayStr={todayStr}
          reminders={reminders}
          fallback={fallback}
          initial={{
            title: '',
            dueOn: date,
            time,
            durationMin: 60,
            remindBeforeMin: '',
            reminderId: sp.r ?? '',
            notes: '',
          }}
        />
      </main>
      <TabBar />
    </div>
  );
}
