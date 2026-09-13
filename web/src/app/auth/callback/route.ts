/* ============================================================================
   Organizer · Retorno del enlace magico

   Supabase manda al usuario aqui con un `code` en la URL. Aqui se cambia ese
   codigo por una sesion y se garantiza su fila en `profiles`.

   Este es el unico sitio donde se crea el perfil, a proposito: es el primer
   instante en que existe una sesion, y no depende de que el usuario llegue a
   ninguna pantalla concreta.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profile';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  /* `next` permite volver a donde estabas. Solo se aceptan rutas internas:
     una URL absoluta aqui seria un redirector abierto de manual. */
  const requested = searchParams.get('next') ?? '/';
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  if (!code) {
    return NextResponse.redirect(origin + '/auth/error?motivo=sin-codigo');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(origin + '/auth/error?motivo=enlace-invalido');
  }

  const profile = await ensureProfile(supabase, data.user.id);
  if (profile.error) {
    /* La sesion SI existe: no se echa al usuario por esto. Pero conviene
       saberlo, porque sin perfil no hay zona horaria y sin zona horaria no
       hay notificaciones — que es el producto. */
    console.error('No se pudo crear la fila en profiles:', profile.error);
    return NextResponse.redirect(origin + '/auth/error?motivo=sin-perfil');
  }

  return NextResponse.redirect(origin + next);
}
