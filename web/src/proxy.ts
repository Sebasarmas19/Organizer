/**
 * Organizer · Proxy de peticiones (Next.js 16)
 * 1. Refresca la sesión de Supabase Auth en cookies en cada petición.
 * 2. Protege rutas privadas redirigiendo a /entrar y bloquea APIs no autorizadas con 401.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAllowedEmail } from '@/lib/allowlist';

/** La unica ruta que se ve sin sesion. En espanol porque el usuario la lee. */
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

/** Rutas que no exigen sesion por cookie: la entrada, el retorno del auth y los endpoints de captura / cron. */
function isPublic(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === '/auth/callback' ||
    pathname === '/auth/error' ||
    pathname === '/api/capture' ||
    pathname === '/api/capture/resource' ||
    pathname === '/api/push/cron'
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  /* Sin variables no hay sesion que refrescar ni a donde mandar a nadie.
     Dejar pasar es correcto: la pantalla de entrada ya explica que falta
     configurar, y bloquear aqui daria una redireccion infinita a /entrar. */
  if (!url || !key) return response;

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
        /* Una respuesta que escribe cookies de sesion no se puede cachear:
           un CDN podria servirle el token de uno a otro. */
        for (const [header, headerValue] of Object.entries(headers)) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;

  /* Una sesión con un correo que no es el del dueño se cierra en el acto. */
  if (data?.claims && !isAllowedEmail(data.claims.email as string | undefined)) {
    await supabase.auth.signOut();
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 403 }));
    }
    if (pathname !== '/auth/error') {
      const target = request.nextUrl.clone();
      target.pathname = '/auth/error';
      target.search = '?motivo=no-autorizado';
      const redirect = NextResponse.redirect(target);
      for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
      return applySecurityHeaders(redirect);
    }
    return applySecurityHeaders(response);
  }

  const signedIn = Boolean(data?.claims);

  if (!signedIn && !isPublic(pathname)) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 401 }));
    }
    const target = request.nextUrl.clone();
    target.pathname = SIGN_IN_PATH;
    target.search = '';
    return applySecurityHeaders(NextResponse.redirect(target));
  }

  /* Ya dentro, la pantalla de entrada no tiene sentido. */
  if (signedIn && pathname === SIGN_IN_PATH) {
    const target = request.nextUrl.clone();
    target.pathname = '/';
    target.search = '';
    return applySecurityHeaders(NextResponse.redirect(target));
  }

  return applySecurityHeaders(response);
}

export const config = {
  /* Todo menos los archivos estaticos y los iconos. El negativo se escribe
     asi —y no como una lista de rutas protegidas— para que una pantalla
     nueva quede protegida por omision y no por acordarse. */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
