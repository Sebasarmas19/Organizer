/* ============================================================================
   Organizer · Clases (FD5: "Horario")

   El horario del semestre entero, una tarjeta por día con clase. Se llega
   desde "Clases de hoy" en Inicio (#79). Solo se lee: editar es en /horario.
   ========================================================================= */

import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getCurrentTimeMinutes, getTodayString } from '@/lib/date-utils';
import { getClassesView } from '@/lib/fd4-calendar';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { ClassesView } from '@/components/fd4/ClassesView';
import { Setup } from '../Setup';

export const metadata: Metadata = { title: 'Horario · Organizer' };
export const dynamic = 'force-dynamic';

export default async function ClasesPage() {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).maybeSingle();
  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const data = await getClassesView(supabase, user.id, timezone);

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(timezone)} />

      <main className="fd-screen">
        <div className="fd5-clases">
          <div className="fd5-pagetop">
            <Link href="/" className="fd5-back">
              <Icon name="chevron-left" size="md" />
              Hoy
            </Link>
            <Link href="/horario" className="fd5-smallbtn">
              Editar
            </Link>
          </div>
          <div className="fd5-ptitle">
            <h1>Horario</h1>
            <p>{data.range ? `Tu semana de clases · ${data.range}` : 'Tu semana de clases'}</p>
          </div>

          <ClassesView data={data} nowMin={getCurrentTimeMinutes(timezone)} />
        </div>
      </main>

      <TabBar />
    </div>
  );
}
