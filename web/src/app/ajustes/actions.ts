'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Cerrar sesión en este dispositivo. Las notificaciones siguen llegando:
    dependen de la suscripción del teléfono, no de la sesión. */
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/entrar');
}
