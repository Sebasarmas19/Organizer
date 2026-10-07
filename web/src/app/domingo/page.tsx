/* ============================================================================
   Organizer · F4 · El ritual del domingo

   Se llega desde la notificacion del domingo (el despachador la apunta
   aqui) y desde la franja de Inicio mientras la semana no este armada. No
   lleva barra de pestanas: es un flujo con principio y final, y la barra
   invita a irse a mitad.

   `?paso=N` deja volver al mismo paso tras "Seguir luego". Al paso 4
   ("Listo") solo se entra con la semana ya cerrada.
   ========================================================================= */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getReviewData } from '@/lib/review/data';
import { DeskSidebar } from '@/components/fd4/DeskSidebar';
import { ReviewFlow } from '@/components/review/ReviewFlow';
import { Setup } from '../Setup';

export const metadata: Metadata = { title: 'Domingo · Organizer' };
export const dynamic = 'force-dynamic';

export default async function DomingoPage({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string }>;
}) {
  if (!isSupabaseConfigured()) return <Setup />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const [{ paso }, data] = await Promise.all([searchParams, getReviewData(supabase, user.id)]);

  const asked = Number(paso);
  const last = data.doneLabel ? 4 : 3;
  const initialStep = Number.isInteger(asked) && asked >= 1 ? Math.min(asked, last) : 1;

  return (
    <div className="fd-app">
      <DeskSidebar active="inicio" todayStr={data.todayStr} />
      <ReviewFlow data={data} initialStep={initialStep} />
    </div>
  );
}
