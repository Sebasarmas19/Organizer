/* ============================================================================
   Organizer · Pagina de detalle de Reminder (/tareas/reminders/[id])
   Servidor: Carga el reminder, su contexto, sus tareas asociadas y las tareas
   sueltas disponibles para asociar.
   ========================================================================= */

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TabBar } from '@/components/TabBar';
import { ReminderDetailClient } from './ReminderDetailClient';

export const dynamic = 'force-dynamic';

export default async function ReminderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !reminder) {
    notFound();
  }

  // Cargar contexto si tiene
  let context = null;
  if (reminder.context_id) {
    const { data: ctxData } = await supabase
      .from('contexts')
      .select('*')
      .eq('id', reminder.context_id)
      .maybeSingle();
    context = ctxData;
  }

  // Cargar tareas asociadas
  const { data: associatedTasks } = await supabase
    .from('items')
    .select('*')
    .eq('reminder_id', id)
    .order('created_at', { ascending: true });

  // Cargar tareas sueltas de inbox para sugerir asociacion
  const { data: unassociatedTasks } = await supabase
    .from('items')
    .select('*')
    .eq('status', 'inbox')
    .is('reminder_id', null)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="applayout">
      <main className="screen">
        <ReminderDetailClient
          reminder={reminder}
          context={context}
          initialAssociatedTasks={associatedTasks ?? []}
          initialUnassociatedTasks={unassociatedTasks ?? []}
        />
      </main>
      <TabBar />
    </div>
  );
}
