/* ============================================================================
   Organizer · Clases

   El horario del semestre entero, una tarjeta por día con clase. Se llega
   desde "Clases de hoy" en Inicio (#79). Solo se lee: editar es en /horario.
   ========================================================================= */

import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getTodayString } from '@/lib/date-utils';
import { getClassesView } from '@/lib/fd4-calendar';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { ClassesView } from '@/components/fd4/ClassesView';
import { Setup } from '../Setup';

export const metadata: Metadata = { title: 'Clases · Organizer' };
export const dynamic = 'force-dynamic';

export default async function ClasesPage() {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const data = await getClassesView(supabase, user.id, DEFAULT_TIMEZONE);

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={getTodayString(DEFAULT_TIMEZONE)} />

      <main className="fd-screen fd-screen--split">
        <div className="fd-fixedhead">
          <div className="fd-calhead__row">
            <Link href="/" className="pl-back">
              <Icon name="chevron-left" size="sm" />
              Inicio
            </Link>
          </div>
          <div className="fd-calhead__row">
            <div className="fd-calhead__title">
              <h1 className="fd-h1 fd-h1--cal">Clases</h1>
              <span className="fd-sub">{data.range || 'Tu horario del semestre'}</span>
            </div>
            <div className="fd-calhead__nav">
              <Link href="/horario" className="fd-btn">
                Editar
              </Link>
            </div>
          </div>
        </div>

        <ClassesView data={data} />
      </main>

      <TabBar />
    </div>
  );
}
