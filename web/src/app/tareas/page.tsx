/* ============================================================================
   Organizer · Pagina principal del modulo Tareas (/tareas)
   Servidor: Carga tareas, carpetas (contexts) y reminders del usuario autenticado.
   ========================================================================= */

import { createClient } from '@/lib/supabase/server';
import { TabBar } from '@/components/TabBar';
import { TareasClient } from './TareasClient';

export const dynamic = 'force-dynamic';

export default async function TareasPage() {
  const supabase = await createClient();

  const [itemsRes, contextsRes, remindersRes] = await Promise.all([
    supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('contexts')
      .select('*')
      .is('archived_at', null)
      .order('name'),
    supabase
      .from('reminders')
      .select('*')
      .order('occurs_on', { ascending: true }),
  ]);

  const items = itemsRes.data ?? [];
  const contexts = contextsRes.data ?? [];
  const reminders = remindersRes.data ?? [];

  return (
    <div className="applayout">
      <main className="screen">
        <TareasClient
          initialTasks={items}
          initialContexts={contexts}
          initialReminders={reminders}
        />
      </main>
      <TabBar />
    </div>
  );
}
