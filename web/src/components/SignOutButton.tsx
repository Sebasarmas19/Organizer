'use client';

/* ============================================================================
   Organizer · Salir

   Existe para poder probar la entrada mas de una vez. En el producto, un
   usuario unico no cierra sesion casi nunca: en F1 esto baja a Ajustes y deja
   de ocupar sitio en la cabecera.

   `router.refresh()` despues de salir vuelve a pedir los Server Components:
   sin eso se queda en pantalla el correo del que acaba de salir.
   ========================================================================= */

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace('/entrar');
    router.refresh();
  }

  return (
    <button type="button" className="taptext taptext--quiet t-meta" onClick={signOut}>
      Salir
    </button>
  );
}
