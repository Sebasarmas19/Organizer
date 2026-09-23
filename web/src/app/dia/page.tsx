/* ============================================================================
   Organizer · Redirección de compatibilidad (`/dia` -> `/calendario?v=dia`)
   ========================================================================= */

import { redirect } from 'next/navigation';

export default async function DiaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const d = params.date ? `&d=${encodeURIComponent(params.date)}` : '';
  redirect(`/calendario?v=dia${d}`);
}
