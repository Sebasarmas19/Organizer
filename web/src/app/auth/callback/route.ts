/* ============================================================================
   Organizer · Retorno de autenticación (Google OAuth y Enlace Mágico)

   Supabase manda al usuario aquí con un `code` en la URL.
   Aquí se intercambia ese código por una sesión y se garantiza su fila
   en `profiles` de forma segura e idempotente.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/profile';
import { isAllowedEmail } from '@/lib/allowlist';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error') || searchParams.get('error_description');

  /* `next` permite volver a donde estaba el usuario. Solo se aceptan rutas internas
     relativas para evitar vulnerabilidades de Open Redirect. */
  const requested = searchParams.get('next') ?? '/';
  let next = '/';
  if (requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')) {
    try {
      const parsed = new URL(requested, origin);
      if (parsed.origin === origin) {
        next = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {
      next = '/';
    }
  }

  if (oauthError) {
    console.error('Error reportado por el proveedor OAuth:', oauthError);
    return NextResponse.redirect(`${origin}/auth/error?motivo=oauth-cancelado`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?motivo=sin-codigo`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('Error al intercambiar código por sesión:', error);
    return NextResponse.redirect(`${origin}/auth/error?motivo=enlace-invalido`);
  }

  if (!isAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/error?motivo=no-autorizado`);
  }

  // Garantizar que la fila en profiles existe para este usuario (zona horaria, etc.)
  const profile = await ensureProfile(supabase, data.user.id);
  if (profile.error) {
    console.error('No se pudo crear o verificar la fila en profiles:', profile.error);
    return NextResponse.redirect(`${origin}/auth/error?motivo=sin-perfil`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
