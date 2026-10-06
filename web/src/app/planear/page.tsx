/* ============================================================================
   Organizer · Planear · "¿Dónde lo pongo?"

   El asistente con IA (decisión #80): le dices qué quieres hacer, mira tus
   clases, tareas, reminders y huecos libres, y propone sesiones. Nada se
   guarda sin tu toque. Ver src/lib/plan/.
   ========================================================================= */

import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { DEFAULT_TIMEZONE } from '@/lib/profile';
import { getTodayString } from '@/lib/date-utils';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/fd4/TabBar';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { Setup } from '../Setup';
import { PlanClient } from './PlanClient';

export const metadata: Metadata = { title: 'Planear · Organizer' };
export const dynamic = 'force-dynamic';
/* Gemini puede tardar: margen para un intento y un respaldo. */
export const maxDuration = 60;

export default async function PlanearPage() {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

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
              <h1 className="fd-h1 fd-h1--cal">¿Dónde lo pongo?</h1>
              <span className="fd-sub">Mira tu agenda y te propone. Nada se guarda sin tu toque.</span>
            </div>
          </div>
        </div>

        <PlanClient />
      </main>

      <TabBar />
    </div>
  );
}
