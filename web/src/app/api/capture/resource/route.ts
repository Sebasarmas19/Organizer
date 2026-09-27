/* ============================================================================
   Organizer · POST /api/capture/resource
   Endpoint para capturar enlaces desde Safari (Hoja de Compartir) o Atajos.
   Inserta un nuevo recurso en la tabla `resources`.
   Protegido por CAPTURE_TOKEN, validación anti-SSRF y límites de payload.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureToken } from '@/lib/env';
import { timingSafeCompare, isValidHttpUrl, isSafePublicUrl } from '@/lib/security';
import type { ResourceKind } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

const VALID_KINDS = new Set<ResourceKind>(['tool', 'skill', 'article', 'video', 'repo', 'other']);

/**
 * Intenta extraer el <title> de una página web pública.
 * Protecciones:
 * 1. Solo URLs http: o https: públicas (no IPs privadas, loopback ni metadatos cloud).
 * 2. Timeout estricto de 1.8s.
 * 3. No sigue redirecciones automáticas (redirect: 'error') para evitar bypass de SSRF.
 * 4. Lectura de stream truncada a máximo 64 KB para evitar DoS por memoria.
 */
async function fetchPageTitle(urlStr: string): Promise<string | null> {
  try {
    const isSafe = await isSafePublicUrl(urlStr);
    if (!isSafe) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);

    const res = await fetch(urlStr, {
      signal: controller.signal,
      redirect: 'error',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;

    let received = '';
    const decoder = new TextDecoder();
    let totalBytes = 0;

    while (totalBytes < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      received += decoder.decode(value, { stream: true });
      if (received.includes('</title>')) break;
    }
    reader.cancel();

    const match = /<title[^>]*>([^<]+)<\/title>/i.exec(received);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ').slice(0, 300);
    }
  } catch {
    // Si falla, agota el tiempo o es bloqueado, no interrumpimos la captura
  }
  return null;
}

export async function POST(request: NextRequest) {
  /* 1. Limitar tamaño de cabecera Content-Length para prevenir DoS */
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 65536) {
    return NextResponse.json(
      { error: 'Cuerpo de petición excede el límite permitido (64KB)' },
      { status: 413 }
    );
  }

  /* 2. Validar autorización con comparación en tiempo constante */
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

  if (!timingSafeCompare(providedToken, expectedToken)) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  /* 3. Parsear el cuerpo JSON y sanitizar campos */
  let body: { url?: unknown; title?: unknown; kind?: unknown; notes?: unknown; tags?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de petición inválido (se esperaba JSON)' },
      { status: 400 }
    );
  }

  const rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  let title = typeof body?.title === 'string' ? body.title.trim().slice(0, 300) : '';
  const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  const rawKind = typeof body?.kind === 'string' ? (body.kind as ResourceKind) : 'article';
  const kind: ResourceKind = VALID_KINDS.has(rawKind) ? rawKind : 'other';

  // Validar URL: solo http: o https:, máximo 2048 caracteres
  let url: string | null = null;
  if (rawUrl) {
    if (rawUrl.length > 2048) {
      return NextResponse.json({ error: 'La URL excede el límite de 2048 caracteres' }, { status: 400 });
    }
    if (!isValidHttpUrl(rawUrl)) {
      return NextResponse.json({ error: 'La URL debe comenzar con http:// o https://' }, { status: 400 });
    }
    url = rawUrl;
  }

  // Sanitizar etiquetas: máx 20 etiquetas, cada una máx 50 caracteres
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().slice(0, 50))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (!url && !title) {
    return NextResponse.json(
      { error: 'Debes proporcionar al menos una URL o un título' },
      { status: 400 }
    );
  }

  // Si no viene título pero viene URL, intentar obtener el título de la página de forma segura
  if (!title && url) {
    const fetchedTitle = await fetchPageTitle(url);
    if (fetchedTitle) {
      title = fetchedTitle;
    } else {
      try {
        const u = new URL(url);
        title = (u.hostname + (u.pathname.length > 1 ? u.pathname : '')).slice(0, 300);
      } catch {
        title = url.slice(0, 300);
      }
    }
  }

  /* 4. Obtener el usuario dueño e insertar en resources */
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
    console.error('Database insert error in capture/resource:', insertError);
    return NextResponse.json(
      { error: 'Error al insertar el recurso' },
      { status: 500 }
    );
  }

  return NextResponse.json(item, { status: 201 });
}
