/* ============================================================================
   Organizer · POST /api/capture/resource
   Endpoint para capturar enlaces desde Safari (Hoja de Compartir) o Atajos.
   Inserta un nuevo recurso en la tabla `resources`.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureToken } from '@/lib/env';
import type { ResourceKind } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

/** Intenta extraer el <title> de una página web con un timeout agresivo de 1.8s */
async function fetchPageTitle(urlStr: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  } catch {
    // Si falla o agota el tiempo, no bloqueamos la captura
  }
  return null;
}

export async function POST(request: NextRequest) {
  /* 1. Validar autorización */
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const providedToken = authHeader.slice(7).trim();
  let expectedToken: string;
  try {
    expectedToken = captureToken();
  } catch {
    return NextResponse.json(
      { error: 'CAPTURE_TOKEN no está configurado en el servidor' },
      { status: 500 }
    );
  }

  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  /* 2. Parsear el cuerpo JSON */
  let body: { url?: string; title?: string; kind?: ResourceKind; notes?: string; tags?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido (se esperaba JSON)' },
      { status: 400 }
    );
  }

  const url = typeof body?.url === 'string' ? body.url.trim() : '';
  let title = typeof body?.title === 'string' ? body.title.trim() : '';
  const kind = (body?.kind ?? 'article') as ResourceKind;
  const notes = typeof body?.notes === 'string' ? body.notes.trim() : null;
  const tags = Array.isArray(body?.tags) ? body.tags.map(String) : [];

  if (!url && !title) {
    return NextResponse.json(
      { error: 'Debes proporcionar al menos una URL o un título' },
      { status: 400 }
    );
  }

  // Si no viene título pero viene URL, intentar obtener el título de la página
  if (!title && url) {
    const fetchedTitle = await fetchPageTitle(url);
    if (fetchedTitle) {
      title = fetchedTitle;
    } else {
      try {
        const u = new URL(url);
        title = u.hostname + (u.pathname.length > 1 ? u.pathname : '');
      } catch {
        title = url;
      }
    }
  }

  /* 3. Obtener el usuario dueño e insertar en resources */
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No se encontró el usuario en profiles' },
      { status: 500 }
    );
  }

  const { data: item, error: insertError } = await admin
    .from('resources')
    .insert({
      user_id: profile.id,
      title,
      url: url || null,
      kind,
      notes,
      tags,
    })
    .select('id, title, url, kind')
    .single();

  if (insertError || !item) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Error al insertar el recurso' },
      { status: 500 }
    );
  }

  return NextResponse.json(item, { status: 201 });
}
