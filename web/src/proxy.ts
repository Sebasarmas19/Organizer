/**
 * Organizer · Middleware de seguridad y protección de rutas (Next.js 16)
 *
 * 1. Refresca y valida la sesión de Supabase Auth en cookies en cada petición con getUser().
 * 2. Protege todas las rutas privadas de la aplicación redirigiendo a /entrar con parámetro ?next=.
 * 3. Bloquea peticiones no autenticadas a /api/* con HTTP 401.
 * 4. Permite acceso a rutas públicas (/, /landing, /entrar, /auth/*, y endpoints con Bearer token).
 * 5. Redirige a usuarios ya autenticados fuera de /entrar hacia / o a su destino en next.
 * 6. Aplica cabeceras de seguridad HTTP en todas las respuestas.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAllowedEmail } from '@/lib/allowlist';

const SIGN_IN_PATH = '/entrar';

/** Cabeceras de seguridad base para mitigar Clickjacking, MIME sniffing y filtración de referrers */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

function applySecurityHeaders(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

/** Comprueba si una ruta es pública y no exige sesión de usuario */
function isPublic(pathname: string): boolean {
  if (
    pathname === '/' ||
    pathname === '/landing' ||
    pathname === SIGN_IN_PATH ||
    pathname === '/auth/callback' ||
    pathname === '/auth/error'
  ) {
    return true;
  }

  // Endpoints con autenticación propia por Bearer token (Siri Shortcuts / Cron secret)
  if (pathname.startsWith('/api/capture') || pathname.startsWith('/api/push/cron')) {
    return true;
  }

  // Archivos estáticos o PWA
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/i.test(pathname)
  ) {
    return true;
  }

  return false;
}

/** Valida que el parámetro de redirección sea una ruta interna segura para prevenir open redirects */
function getSafeRedirectPath(rawPath: string | null | undefined, fallback = '/'): string {
  if (!rawPath) return fallback;
  if (rawPath.startsWith('/') && !rawPath.startsWith('//') && !rawPath.includes('\\')) {
    return rawPath;
  }
  return fallback;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /* Sin variables de entorno no hay sesión que validar; dejar pasar para que
     la pantalla de configuración inicial pueda mostrarse. */
  if (!url || !key) {
    return applySecurityHeaders(response);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, headerValue] of Object.entries(headers)) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  // Verificación real y segura de la sesión del usuario contra Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Si hay usuario pero su correo no está autorizado en despliegues con lista blanca
  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      );
    }
    const target = new URL('/auth/error?motivo=no-autorizado', request.url);
    const redirectRes = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirectRes.cookies.set(cookie);
    }
    return applySecurityHeaders(redirectRes);
  }

  const signedIn = Boolean(user);

  // Si NO está autenticado y la ruta es protegida
  if (!signedIn && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      );
    }

    const redirectPath = `${pathname}${search}`;
    const target = new URL(SIGN_IN_PATH, request.url);
    target.searchParams.set('next', redirectPath);

    const redirectRes = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirectRes.cookies.set(cookie);
    }
    return applySecurityHeaders(redirectRes);
  }

  // Si YA está autenticado y accede a /entrar, redirigir a / o al destino en next
  if (signedIn && pathname === SIGN_IN_PATH) {
    const nextParam = request.nextUrl.searchParams.get('next');
    const destination = getSafeRedirectPath(nextParam, '/');
    const target = new URL(destination, request.url);

    const redirectRes = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) {
      redirectRes.cookies.set(cookie);
    }
    return applySecurityHeaders(redirectRes);
  }

  return applySecurityHeaders(response);
}

export const config = {
  /* Aplica a todas las rutas excepto archivos estáticos e iconos */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

export default proxy;
