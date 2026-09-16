'use server';

/* ============================================================================
   Organizer · Guardar las horas de notificación

   Decision 25: las horas se editan DENTRO de la app, no se codifican a mano.
   El despachador (`supabase/functions/dispatch-notifications/`) lee estas
   cuatro columnas de `profiles` y no conoce ninguna hora por su cuenta, asi
   que cambiar esto aqui cambia de verdad cuando llega la notificacion.

   Se escribe con el cliente CON SESION: RLS (`own profile`) garantiza que
   nadie pueda escribir el perfil de otro, sin que haga falta comprobarlo a
   mano. La clave de servicio no aparece en este archivo.
   ========================================================================= */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export interface SaveResult {
  ok: boolean;
  message: string;
}

export async function saveNotificationTimes(
  _previous: SaveResult | null,
  formData: FormData
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Tu sesión caducó. Vuelve a entrar.' };

  const morning = String(formData.get('morning') ?? '');
  const evening = String(formData.get('evening') ?? '');
  const weeklyTime = String(formData.get('weeklyTime') ?? '');
  const weeklyDow = Number(formData.get('weeklyDow'));

  /* `<input type="time">` ya obliga al formato en el navegador, pero esto es
     una accion de servidor: puede llegar cualquier cosa y una hora invalida
     dejaria al despachador sin poder comparar nada. */
  if (!TIME.test(morning) || !TIME.test(evening) || !TIME.test(weeklyTime)) {
    return { ok: false, message: 'Alguna hora no tiene el formato HH:MM.' };
  }
  if (!Number.isInteger(weeklyDow) || weeklyDow < 0 || weeklyDow > 6) {
    return { ok: false, message: 'El día de la revisión no es válido.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      notify_morning: morning,
      notify_evening: evening,
      notify_weekly_time: weeklyTime,
      notify_weekly_dow: weeklyDow,
    })
    .eq('id', user.id);

  if (error) return { ok: false, message: error.message };

  revalidatePath('/ajustes/notificaciones');
  return { ok: true, message: 'Guardado. A partir de mañana te hablo a esas horas.' };
}
