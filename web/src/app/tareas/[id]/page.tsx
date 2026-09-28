/* ============================================================================
   Organizer · Editar una tarea (/tareas/[id])
   ========================================================================= */

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfileTimezone } from '@/lib/profile';
import { getTaskDetail } from '@/lib/planner-data';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { BackButton } from '@/components/planner/BackButton';
import { TaskForm } from '@/components/planner/TaskForm';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const timezone = await getProfileTimezone(supabase, user.id);
  const task = await getTaskDetail(supabase, user.id, id, timezone);
  if (!task) notFound();

  const statusLabel =
    task.status === 'done' ? 'Tarea hecha' : task.status === 'dropped' ? 'Tarea soltada' : 'Tarea';

  return (
    <div className="fd-app">
      <DeskSidebar active="pendientes" todayStr={task.todayStr} />
      <main className="fd-screen">
        <div className="pl-top">
          <BackButton fallback="/pendientes" />
        </div>
        <header className="pl-head" style={{ paddingBottom: 8 }}>
          <span className="pl-head__kind">{statusLabel}</span>
        </header>
        <TaskForm
          key={task.id}
          mode="edit"
          taskId={task.id}
          status={task.status}
          todayStr={task.todayStr}
          reminders={task.reminders}
          fallback="/pendientes"
          initial={{
            title: task.title,
            dueOn: task.dueOn ?? '',
            time: task.time ?? '',
            durationMin: task.durationMin ?? 60,
            remindBeforeMin: task.remindBeforeMin ? String(task.remindBeforeMin) : '',
            reminderId: task.reminderId ?? '',
            notes: task.notes ?? '',
          }}
        />
      </main>
      <TabBar />
    </div>
  );
}
