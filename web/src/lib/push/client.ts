/* ============================================================================
   Organizer · Web Push en el navegador

   Todo lo que iOS obliga a hacer, y en el orden en que obliga a hacerlo. Cada
   punto de aqui, si falla, deja la fase entera en cero — y ninguno da un error
   que se lea: fallan en silencio. Origen: `docs/02-arquitectura.md`.

   1. LA PWA TIENE QUE ESTAR INSTALADA EN LA PANTALLA DE INICIO. En una pestana
      normal de Safari no llega ni una notificacion. Por eso lo primero que
      hace esta pantalla es mirar si corre instalada, y si no, explicar como se
      instala en vez de ofrecer un boton que no va a funcionar.
   2. EL PERMISO SE PIDE DENTRO DEL MANEJADOR DE UN TOQUE REAL. Llamar a
      `Notification.requestPermission()` al cargar la pagina lo deniega el
      navegador — y una vez denegado NO SE PUEDE VOLVER A PEDIR desde codigo:
      hay que entrar a los Ajustes de iOS. O sea que es irreversible.
   3. POR ESO SE PIDE EL PERMISO ANTES QUE NADA. `await` sobre otra cosa antes
      de `requestPermission` puede romper la cadena de activacion del gesto en
      Safari, y entonces la llamada se rechaza sola. Registrar el service
      worker va DESPUES, aunque leyendolo parezca el orden natural.
   4. `userVisibleOnly: true` no es opcional: es un contrato. Cada push tiene
      que acabar mostrando algo. Lo cumple `public/sw.js`.
   5. iOS 16.4 o superior. Por debajo no existe `PushManager` y no hay vuelta.
      Se detecta por capacidad, no por version: leer la version del iPhone en
      la cadena del navegador es poco fiable y ademas miente en el iPad.
   ========================================================================= */

/** Lo que la pantalla necesita saber para decidir que ensenar. */
export type PushEnvironment =
  | { kind: 'ready' }
  | { kind: 'not-installed' }
  | { kind: 'unsupported'; reason: string };

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  /* Los dos, y hacen falta los dos: la media query es el estandar y
     `navigator.standalone` es lo unico que responde en Safari de iOS. */
  const byDisplayMode = window.matchMedia('(display-mode: standalone)').matches;
  const byLegacyIOS = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return byDisplayMode || byLegacyIOS === true;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  /* El iPad moderno se anuncia como Mac; se distingue porque tiene tactil. */
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function readEnvironment(): PushEnvironment {
  if (typeof window === 'undefined') return { kind: 'unsupported', reason: 'servidor' };

  if (!('serviceWorker' in navigator)) {
    return {
      kind: 'unsupported',
      reason: 'Este navegador no tiene service workers, que es lo que recibe las notificaciones.',
    };
  }

  if (!('PushManager' in window) || !('Notification' in window)) {
    /* En iOS esto significa, casi siempre, una version por debajo de 16.4. */
    return {
      kind: 'unsupported',
      reason: isIOS()
        ? 'Tu iPhone necesita iOS 16.4 o superior para recibir notificaciones web. Actualiza desde Ajustes → General → Actualización de software.'
        : 'Este navegador no admite notificaciones push.',
    };
  }

  /* En iOS la comprobacion de instalada va DESPUES de la de capacidad: si el
     telefono es viejo, el mensaje util es "actualiza", no "instálala". */
  if (isIOS() && !isStandalone()) return { kind: 'not-installed' };

  return { kind: 'ready' };
}

/* ──────────────────────────────────────────────────── service worker ── */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  /* `ready` espera a que haya un worker ACTIVO. Sin esperar, el
     `pushManager.subscribe` de la primera vez falla con un error que dice
     "no active Service Worker" y que parece un fallo de permisos. */
  await navigator.serviceWorker.ready;
  return registration;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
}

/* ─────────────────────────────────────────────────────────── suscribir ── */

/** La clave VAPID viaja en base64url y `subscribe` la quiere en bytes. */
export function vapidKeyToBytes(base64Url: string): Uint8Array {
  const padded = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string;
}

export function describeSubscription(subscription: PushSubscription): StoredSubscription {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  if (!keys.p256dh || !keys.auth) {
    throw new Error('La suscripción llegó sin claves. Vuelve a intentarlo.');
  }
  return {
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: navigator.userAgent,
  };
}

export class PermissionDeniedError extends Error {
  constructor() {
    super(
      'iOS no deja volver a preguntarlo desde la app. Actívalas a mano en ' +
        'Ajustes → Notificaciones → Organizer.'
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * El flujo completo, y TIENE QUE LLAMARSE DENTRO DEL MANEJADOR DEL TOQUE.
 *
 * El permiso va primero por lo dicho en la cabecera: cualquier `await` previo
 * puede costar la activacion del gesto en Safari.
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<StoredSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PermissionDeniedError();

  const registration = await registerServiceWorker();

  /* Si ya habia una, se reutiliza: volver a suscribirse genera un endpoint
     nuevo y deja el anterior muerto en la tabla. */
  const existing = await registration.pushManager.getSubscription();
  if (existing) return describeSubscription(existing);

  const subscription = await registration.pushManager.subscribe({
    /* Contrato de iOS. Ver el punto 4 de la cabecera. */
    userVisibleOnly: true,
    applicationServerKey: vapidKeyToBytes(vapidPublicKey) as BufferSource,
  });

  return describeSubscription(subscription);
}
