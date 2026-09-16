/* ============================================================================
   Organizer · Service Worker

   Vive en `public/`, o sea que se sirve tal cual en `/sw.js`, sin pasar por el
   compilador. Eso es a proposito: el alcance de un service worker es la
   carpeta desde la que se sirve, y solo desde la raiz puede recibir push de
   toda la app. `src/proxy.ts` ya lo deja pasar sin sesion.

   NO TIENE MANEJADOR DE `fetch`. No hay cache offline en esta fase, y anadir
   uno a medias es la forma clasica de servir una version vieja de la app
   durante dias sin enterarse. Aqui el service worker existe por una sola
   razon: en iOS no se puede programar una notificacion local (no existe la
   Notification Triggers API), asi que TODA notificacion llega del servidor y
   necesita un service worker vivo que la reciba.

   REGLA DE iOS QUE NO SE PUEDE SALTAR: la suscripcion se pide con
   `userVisibleOnly: true`, y eso es un contrato — cada push TIENE que acabar
   mostrando una notificacion. Si el manejador de `push` termina sin llamar a
   `showNotification`, el navegador muestra una notificacion generica del
   sistema y, si se repite, revoca el permiso. Por eso el `catch` de abajo
   tambien muestra algo: un texto pobre es malo, silencio es peor.
   ========================================================================= */

/* Que la version nueva del worker mande desde el primer momento. Sin esto, un
   cambio en este archivo no llega hasta que el usuario cierra todas las
   pestanas de la app — que en una PWA instalada puede ser nunca. */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ────────────────────────────────────────────────── llega el mensaje ── */

self.addEventListener('push', (event) => {
  /* El servidor manda JSON: { title, body, tag, url }. Si algo viniera mal
     formado, se muestra igual — ver la regla de `userVisibleOnly` arriba. */
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* Sin enlace al error a proposito: da igual por que vino mal. Lo unico
       que no se puede hacer es terminar sin mostrar nada (userVisibleOnly). */
    payload = {};
  }

  const title = payload.title || 'Organizer';
  const options = {
    body: payload.body || 'Abre la app para ver tu dia.',

    /* `tag` hace que la nueva SUSTITUYA a la anterior del mismo tipo en vez de
       apilarse. Es una notificacion al dia (decision 33): si el telefono
       estuvo apagado, lo que importa es la ultima, no tener tres iguales. */
    tag: payload.tag || 'organizer',
    renotify: true,

    /* En iOS el icono lo pone el sistema desde el de la PWA instalada; estos
       dos los usa el escritorio y Android. */
    icon: '/icon-192.png',
    badge: '/icon-192.png',

    /* Que no desaparezca sola: el usuario mira el telefono cuando lo mira, no
       cuando le llega. Es el problema entero del proyecto. */
    requireInteraction: false,

    data: { url: payload.url || '/' },
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
  const target = (event.notification.data && event.notification.data.url) || '/';

  /* Si la app ya esta abierta se le da el foco en vez de abrir otra ventana:
     abrir una segunda instancia de una PWA en iOS deja la primera colgada. */
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

/* ────────────────────────────────────────── la suscripcion se caduca ── */

/*
  iOS invalida la suscripcion al reinstalar la PWA, y el navegador avisa aqui.
  No se puede re-suscribir desde el service worker sin la clave VAPID, asi que
  lo unico honesto es dejar constancia: la app comprueba en cada arranque si
  sigue habiendo suscripcion y lo dice en pantalla si no
  (`/ajustes/notificaciones`). Una notificacion que no llega y nadie nota es el
  peor fallo posible de este proyecto.
*/
self.addEventListener('pushsubscriptionchange', () => {
  /* Sin `waitUntil`: no hay nada asincrono que esperar. El aviso util se da en
     la app, no aqui. */
});
