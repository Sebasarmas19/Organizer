import { redirect } from 'next/navigation';

export default async function LegacyReminderRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tareas/reminders/${id}`);
}
