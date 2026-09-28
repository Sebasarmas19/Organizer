import { redirect } from 'next/navigation';

/* Ruta vieja. El detalle de un reminder vive en /reminders/[id]. */
export default async function LegacyReminderRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/reminders/${id}`);
}
