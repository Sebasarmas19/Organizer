/* ============================================================================
   Organizer · Proxy (lo que hasta Next 15 se llamaba middleware)

   Next 16 renombro `middleware.ts` a `proxy.ts`. No es solo el nombre: ahora
   corre en el runtime de Node por defecto y no admite `export const runtime`.
   Si buscas "middleware" en la documentacion de esta version, te manda aqui.

   Hace dos cosas, en este orden y por esta razon:

   1. REFRESCA LA SESION en cada peticion. Es obligatorio con `@supabase/ssr`:
      un Server Component no puede escribir cookies, asi que si nadie refresca
      aqui, el token caduca y el usuario se encuentra deslogueado sin motivo
      aparente. Es el fallo clasico de este stack y es dificil de depurar.

   2. PROTEGE TODO MENOS LA ENTRADA. La app es de un solo usuario y no tiene
      ninguna pantalla publica: si no hay sesion, a /entrar.

   Sobre `getClaims()` en vez de `getUser()`: las dos valen; `getClaims`
   verifica la firma del JWT y evita una llamada de red por peticion. Lo que
   NO vale es `getSession()` aqui, porque lee la cookie sin verificarla.

   OJO al patron de la respuesta: hay que devolver el mismo objeto `response`
   sobre el que la libreria escribio las cookies. Construir uno nuevo despues
   pierde el token refrescado, y el sintoma es un cierre de sesion aleatorio
   cada hora.
   ========================================================================= */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** La unica ruta que se ve sin sesion. En espanol porque el usuario la lee. */
const SIGN_IN_PATH = '/entrar';

/** Rutas que no exigen sesion: la entrada y el retorno del enlace magico. */
function isPublic(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname.startsWith('/auth');
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
  const signedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!signedIn && !isPublic(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = SIGN_IN_PATH;
    target.search = '';
    return NextResponse.redirect(target);
  }

  /* Ya dentro, la pantalla de entrada no tiene sentido. */
  if (signedIn && pathname === SIGN_IN_PATH) {
    const target = request.nextUrl.clone();
    target.pathname = '/';
    target.search = '';
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  /* Todo menos los archivos estaticos y los iconos. El negativo se escribe
     asi —y no como una lista de rutas protegidas— para que una pantalla
     nueva quede protegida por omision y no por acordarse. */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
