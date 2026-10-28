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
import { getProfileTimezone } from '@/lib/profile';
import { getCurrentTimeMinutes, getTodayString } from '@/lib/date-utils';
import { dayRangeUtc, localDateOf, localTimeOf, timeToMinutes } from '@/lib/tz';
import { addDays, computeFreeSlots, type Busy } from '@/lib/plan/slots';
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

  const timezone = await getProfileTimezone(supabase, user.id);
  const today = getTodayString(timezone);
  const nowMinutes = getCurrentTimeMinutes(timezone);
  const last = addDays(today, 3);

  const { data: blocks } = await supabase
    .from('blocks')
    .select('title, starts_at, ends_at, source, status')
    .eq('user_id', user.id)
    .neq('status', 'rescheduled')
    .gte('starts_at', dayRangeUtc(today, timezone).start)
    .lt('starts_at', dayRangeUtc(last, timezone).end)
    .order('starts_at', { ascending: true });

  const busy: Busy[] = (blocks ?? []).map((b) => ({
    date: localDateOf(b.starts_at, timezone),
    from: timeToMinutes(localTimeOf(b.starts_at, timezone)),
    to: timeToMinutes(localTimeOf(b.ends_at, timezone)),
  }));

  const initialSlots = computeFreeSlots({
    today,
    nowMinutes,
    days: 3,
    busy,
    buffer: 10,
    minMinutes: 30,
  }).slice(0, 3);

  return (
    <div className="fd-app">
      <DeskSidebar active="planear" todayStr={today} />

      <main className="fd-screen fd-screen--split">
        <div className="fd-fixedhead">
          <div className="fd-calhead__row">
            <Link href="/" className="pl-back">
              <Icon name="chevron-left" size="sm" />
              Hoy
            </Link>
          </div>
          <div className="fd-calhead__row">
            <div className="fd-calhead__title">
              <h1 className="fd-h1 fd-h1--cal">¿Dónde lo pongo?</h1>
              <span className="fd-sub">Mira tu agenda y te propone. Nada se guarda sin tu toque.</span>
            </div>
          </div>
        </div>

        <PlanClient initialSlots={initialSlots} />
      </main>

      <TabBar />
    </div>
  );
}
