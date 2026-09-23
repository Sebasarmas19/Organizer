/* ============================================================================
   Organizer · Redirección de compatibilidad (`/semana` -> `/calendario?v=semana`)
   ========================================================================= */

import { redirect } from 'next/navigation';

export default async function SemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const d = params.date ? `&d=${encodeURIComponent(params.date)}` : '';
  redirect(`/calendario?v=semana${d}`);
}
