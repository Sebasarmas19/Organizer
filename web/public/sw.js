/* ============================================================================
   Organizer · Service Worker con soporte offline real y Web Push
   
   Vive en `public/`, o sea que se sirve tal cual en `/sw.js`, sin pasar por el
   compilador. Eso es a propósito: el alcance de un service worker es la
   carpeta desde la que se sirve, y solo desde la raíz puede recibir push y
   controlar la caché de toda la app.
   
   DOS RESPONSABILIDADES:
   1. WEB PUSH (iOS / Android / Desktop):
      Recibe la notificación del servidor a las 8:00 AM y la muestra inmediatamente.
      Cumple estrictamente el contrato `userVisibleOnly: true`.
   
   2. OFFLINE REAL (Lectura sin Wi-Fi ni datos):
      - Assets estáticos (_next/static, iconos, manifest): Cache-First con actualización.
      - Navegación y páginas (HTML / RSC): Network-First con fallback a caché.
        Esto garantiza que si hay red, SIEMPRE se ve la última versión en vivo (sin
        riesgo de stale cache trap); y si no hay red, carga la última versión guardada.
      - Peticiones POST y mutaciones pasan directo sin cachear.
   ========================================================================= */

const STATIC_CACHE = 'organizer-static-v2';
const PAGES_CACHE = 'organizer-pages-v2';
const ALLOWED_CACHES = [STATIC_CACHE, PAGES_CACHE];

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/icon.png',
  '/apple-icon.png',
];

const PRECACHE_ROUTES = [
  '/',
  '/calendario',
  '/pendientes',
  '/recursos',
];

/* ────────────────────────────────────────────────── ciclo de vida ── */

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS).catch(() => {})),
      caches.open(PAGES_CACHE).then((cache) => cache.addAll(PRECACHE_ROUTES).catch(() => {})),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!ALLOWED_CACHES.includes(key)) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ────────────────────────────────────────────────── interceptar fetch (Offline) ── */

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo interceptamos peticiones GET. Las mutaciones (POST, PUT, DELETE) pasan directo.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar llamadas a Supabase, APIs externas y extensiones de navegador
  if (url.origin !== self.location.origin) return;

  // Ignorar endpoints de API y captura externa (/api/**)
  if (url.pathname.startsWith('/api/')) return;

  // 1. Assets estáticos inmutables (_next/static/** y precached icons): Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    PRECACHE_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => {
            return new Response('', { status: 408 });
          });
      })
    );
    return;
  }

  // 2. Páginas de la app y datos RSC: Network-First con fallback a caché
  const isNavigationOrPage =
    req.mode === 'navigate' ||
    req.headers.get('accept')?.includes('text/html') ||
    req.headers.get('rsc') === '1' ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/_next/data/');

  if (isNavigationOrPage) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallo de red: intentar servir la copia en caché de esta página
          const cached = await caches.match(req);
          if (cached) return cached;

          // Si navegaba a una página no guardada en caché, mostrar pantalla de cortesía limpia
          // (NUNCA servir '/' cruzado para no romper la hidratación de React/Next.js)
          if (req.mode === 'navigate') {
            return new Response(
              `<!DOCTYPE html>
              <html lang="es">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <title>Organizer · Sin conexión</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; background: #0B130E; color: #FAFAF9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; text-align: center; }
                  .card { background: #152219; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                  h1 { font-size: 20px; font-weight: 600; margin: 0 0 10px; color: #fff; }
                  p { font-size: 14px; color: #8E9B90; margin: 0 0 24px; line-height: 1.5; }
                  a { display: inline-block; background: #22593E; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 9999px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>Modo sin conexión</h1>
                  <p>No tienes conexión a internet y esta pantalla no se había guardado en el teléfono todavía. Abre tu pantalla de Inicio o vuelve a intentarlo cuando recuperes señal.</p>
                  <a href="/">Ir a Inicio</a>
                </div>
              </body>
              </html>`,
              {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
                status: 200,
              }
            );
          }

          throw new Error('Sin conexión y recurso no disponible en caché');
        })
    );
    return;
  }
});

/* ────────────────────────────────────────────────── llega el mensaje push ── */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Organizer';
  const actions = [];
  if (payload.itemId) {
    actions.push(
      { action: 'done', title: '✓ Ya la hice' },
      { action: 'tomorrow', title: 'Pasar a mañana' }
    );
  }

  const options = {
    body: payload.body || 'Abre la app para ver tu día.',
    tag: payload.tag || 'organizer',
    renotify: true,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    requireInteraction: false,
    actions,
    data: {
      url: payload.url || '/',
      itemId: payload.itemId || null,
      blockId: payload.blockId || null,
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch(() =>
      self.registration.showNotification('Organizer', {
        body: 'Tienes algo para hoy.',
        tag: 'organizer',
      })
    )
  );
});

/* ──────────────────────────────────────────────────── la toca el dedo ── */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const action = event.action;

  // Acciones en segundo plano sin abrir ventana si el usuario tocó un botón
  if ((action === 'done' || action === 'tomorrow') && data.itemId) {
    event.waitUntil(
      fetch('/api/push/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          itemId: data.itemId,
          blockId: data.blockId,
        }),
      }).catch(() => {})
    );
    return;
  }

  const target = data.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(target).catch(() => {});
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});

self.addEventListener('pushsubscriptionchange', () => {
  // Notificado en UI cuando abre la app
});
