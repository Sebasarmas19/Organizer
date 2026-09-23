/* ============================================================================
   Organizer · Redirección de compatibilidad (`/tareas` -> `/pendientes`)
   ========================================================================= */

import { redirect } from 'next/navigation';

export default function TareasPage() {
  redirect('/pendientes');
}
