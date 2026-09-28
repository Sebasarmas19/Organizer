/* ============================================================================
   Organizer · GET /api/resources/[id]/open

   Lo que abre la notificación "Para leer". Cuenta la apertura (así ese
   recurso deja de proponerse) y redirige al enlace guardado. Sin enlace, a
   Recursos. Necesita sesión: el proxy manda a /entrar si no la hay.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidHttpUrl } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/entrar', request.url));

  const { data: resource } = await supabase
    .from('resources')
    .select('id, url, open_count')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!resource) return NextResponse.redirect(new URL('/recursos', request.url));

  await supabase
    .from('resources')
    .update({ open_count: resource.open_count + 1, opened_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  const target =
    resource.url && isValidHttpUrl(resource.url) ? resource.url : new URL('/recursos', request.url);
  return NextResponse.redirect(target);
}
