/* ============================================================================
   Organizer · Redirección de compatibilidad (`/mes` -> `/calendario?v=mes`)
   ========================================================================= */

import { redirect } from 'next/navigation';

export default async function MesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const d = params.date ? `&d=${encodeURIComponent(params.date)}` : '';
  redirect(`/calendario?v=mes${d}`);
}
