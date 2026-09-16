/* ============================================================================
   Organizer · Ruta de conveniencia `/anadir` (F2)

   Redirige a `/dia?date=...&anadir=1` para abrir la hoja de añadir sobre el
   calendario tal como prescribe app/comps/anadir.html.
   ========================================================================= */

import { redirect } from 'next/navigation';
import { getTodayString } from '@/lib/date-utils';
import { DEFAULT_TIMEZONE } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export default async function AnadirPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const targetDate = params.date || getTodayString(DEFAULT_TIMEZONE);
  const tabParam = params.tab ? `&tab=${params.tab}` : '';
  redirect(`/dia?date=${targetDate}&anadir=1${tabParam}`);
}
