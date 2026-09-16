/* ============================================================================
   Organizer · Página Horario (`/horario`) (F2 · app/comps/horario.html)
   ========================================================================= */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { HorarioView } from '@/components/HorarioView';
import { Setup } from '../Setup';

export const dynamic = 'force-dynamic';

export default async function HorarioPage() {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  const { data: templates } = await supabase
    .from('schedule_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('weekday', { ascending: true })
    .order('start_time', { ascending: true });

  const firstTemplate = templates?.[0];
  const activeFrom = firstTemplate?.active_from || '2026-09-15';
  const activeUntil = firstTemplate?.active_until || '2027-02-20';

  return (
    <div className="applayout">
      <HorarioView
        initialTemplates={templates ?? []}
        initialActiveFrom={activeFrom}
        initialActiveUntil={activeUntil}
      />
    </div>
  );
}
