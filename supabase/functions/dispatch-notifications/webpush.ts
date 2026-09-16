/* ============================================================================
   Organizer · Web Push desde cero (VAPID + RFC 8291)

   POR QUE NO UNA LIBRERIA
   -----------------------
   `web-push` de npm es la opcion obvia y esta escrita para Node: usa `https`,
   `crypto` de Node y streams. En el Deno de las Edge Functions eso entra por
   la capa de compatibilidad, que funciona hasta que no. Aqui el envio ES el
   producto (`docs/00-problema.md`): si el push falla, no falla una feature,
   falla el proyecto. Asi que el camino critico no depende de una capa de
   compatibilidad, sino solo de APIs que Deno y Node implementan nativamente:
   `crypto.subtle`, `fetch`, `TextEncoder`.

   Efecto lateral util: el mismo archivo corre en Node 24, asi que las pruebas
   de `tests/` verifican el codigo que se despliega, no una copia.

   COMO SE VERIFICA QUE EL CIFRADO ES CORRECTO
   -------------------------------------------
   Un cifrado mal hecho no da error: el servicio de push acepta el POST, el
   iPhone recibe un mensaje que no puede descifrar y NO MUESTRA NADA. No hay
   sintoma. Por eso `tests/webpush.test.ts` reproduce el ejemplo completo del
   RFC 8291 §5 —mismas claves, misma sal— y compara el cuerpo cifrado byte a
   byte con el del Apendice A. Para poder hacerlo, `encryptPayload` acepta
   inyectar la sal y el par efimero; en produccion esos dos parametros no se
   pasan nunca y se generan al azar.

   Referencias:
     RFC 8291  Web Push Message Encryption  (ECDH + HKDF, §3.3 y §3.4)
     RFC 8188  Encrypted Content-Encoding   (cabecera aes128gcm, §2.1)
     RFC 8292  VAPID                        (el JWT ES256 y la cabecera)
   ========================================================================= */

import {
  base64UrlFromBytes,
  bytesFromBase64Url,
  concatBytes,
  uint32BE,
  utf8,
} from './bytes.ts';

/* ─────────────────────────────────────────────────────────────── tipos ── */

/** Lo que guarda `push_subscriptions`. Los dos ultimos vienen en base64url. */
export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface VapidKeys {
  /** Clave publica: punto P-256 sin comprimir (65 bytes) en base64url. */
  publicKey: string;
  /** Clave privada: escalar de 32 bytes en base64url. */
  privateKey: string;
  /**
   * `sub` del JWT. RFC 8292 §2.1 lo pide como `mailto:` o `https:`: es el
   * contacto al que el servicio de push escribe si algo va mal con los
   * envios. Apple RECHAZA el JWT si falta o no es una URL valida, y el error
   * que devuelve no dice que el problema es este campo.
   */
  subject: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  /**
   * La suscripcion ya no existe en el servicio de push: hay que marcar
   * `failed_at`, o la tabla se llena de destinos muertos y cada pasada del
   * cron se hace mas lenta. iOS la invalida al reinstalar la PWA.
   *
   * NO es solo 404/410: Apple contesta 400 con `BadWebPushToken`. Ver `isGone`.
   */
  gone: boolean;
  error?: string;
}

/* ──────────────────────────────────────────────────────── primitivas ── */

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as unknown as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, data as unknown as ArrayBuffer);
  return new Uint8Array(mac);
}

/**
 * HKDF en los dos pasos que escribe el RFC 8291 §3.4, a mano.
 *
 * `crypto.subtle.deriveBits` con HKDF haria lo mismo, pero el RFC da los
 * valores intermedios (PRK_key, IKM, PRK, CEK, NONCE) y poder compararlos uno
 * a uno contra el Apendice A es justo lo que convierte esto en verificable.
 * Con una sola llamada opaca, si el resultado no cuadra no hay forma de saber
 * en que paso se rompio.
 */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm);
  const okm = await hmacSha256(prk, concatBytes(info, Uint8Array.of(1)));
  return okm.subarray(0, length);
}

/** El punto P-256 sin comprimir es `0x04 || X(32) || Y(32)`. */
function splitPublicPoint(raw: Uint8Array): { x: Uint8Array; y: Uint8Array } {
  if (raw.length !== 65 || raw[0] !== 4) {
    throw new Error(
      'La clave publica P-256 no esta en forma sin comprimir (65 bytes que ' +
        'empiezan por 0x04). Recibidos ' + raw.length + ' bytes.'
    );
  }
  return { x: raw.subarray(1, 33), y: raw.subarray(33, 65) };
}

/* ───────────────────────────────────────────── cifrado del contenido ── */

export interface EncryptOptions {
  /** El JSON que va dentro de la notificacion, ya serializado. */
  payload: Uint8Array;
  /** `p256dh` de la suscripcion, en bytes: 65, sin comprimir. */
  userAgentPublicKey: Uint8Array;
  /** `auth` de la suscripcion, en bytes: 16. */
  authSecret: Uint8Array;
  /**
   * SOLO PARA LAS PRUEBAS DEL RFC 8291 §5. En produccion no se pasan y el
   * cifrado genera sal y par efimero al azar, que es lo que exige el RFC:
   * reutilizar una sal con la misma clave rompe AES-GCM.
   */
  fixedSalt?: Uint8Array;
  fixedSenderKeys?: { privateKey: CryptoKey; publicKeyRaw: Uint8Array };
}

/**
 * Devuelve el cuerpo completo de la peticion: cabecera aes128gcm de 86 bytes
 * mas el registro cifrado.
 *
 *     salt(16) | rs(4, BE) | idlen(1) | keyid = as_public(65) | ciphertext
 */
export async function encryptPayload(options: EncryptOptions): Promise<Uint8Array> {
  const { payload, userAgentPublicKey, authSecret } = options;

  /* Validar la forma del punto antes de tocar nada: un `p256dh` truncado por
     una columna de base de datos mal copiada es el fallo mas plausible aqui y
     asi da un error que se lee. */
  splitPublicPoint(userAgentPublicKey);

  if (authSecret.length !== 16) {
    throw new Error(
      'El secreto `auth` de la suscripcion debe medir 16 bytes (RFC 8291 ' +
        '§3.2). Mide ' + authSecret.length + '.'
    );
  }

  /* 1 · par efimero del servidor. Uno nuevo por mensaje, sin excepcion. */
  const senderKeys = options.fixedSenderKeys ?? (await generateSenderKeys());

  /* 2 · secreto ECDH con la clave publica del navegador. */
  const userAgentKey = await crypto.subtle.importKey(
    'raw',
    userAgentPublicKey as unknown as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: userAgentKey },
      senderKeys.privateKey,
      256
    )
  );

  /* 3 · mezclar el secreto ECDH con el `auth` de la suscripcion.
         RFC 8291 §3.3: sin este paso, el servicio de push podria fabricar
         mensajes que el navegador aceptaria como nuestros. */
  const keyInfo = concatBytes(
    utf8('WebPush: info'),
    Uint8Array.of(0),
    userAgentPublicKey,
    senderKeys.publicKeyRaw
  );
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  /* 4 · clave y nonce del contenido (RFC 8188). */
  const salt = options.fixedSalt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  /* 5 · el registro. `0x02` es el delimitador de ULTIMO registro (RFC 8188
         §2): con `0x01` el receptor espera otro registro detras y descarta el
         mensaje. No se anade relleno: el servicio de push ya ve el tamano de
         todo lo demas, y cada byte de mas es latencia en una red movil. */
  const record = concatBytes(payload, Uint8Array.of(2));

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek as unknown as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce as unknown as ArrayBuffer, tagLength: 128 },
      aesKey,
      record as unknown as ArrayBuffer
    )
  );

  /* `rs` tiene que ser al menos el tamano del registro cifrado. 4096 es el
     valor del ejemplo del RFC y el maximo que aceptan los servicios de push
     como cuerpo, asi que sirve de tope real tambien. */
  const recordSize = 4096;
  if (ciphertext.length > recordSize) {
    throw new Error(
      'El contenido cifrado (' + ciphertext.length + ' bytes) pasa de ' +
        recordSize + '. Una notificacion de esta app deberia medir ~200 bytes: ' +
        'si llega aqui, algo esta metiendo la lista entera en el payload.'
    );
  }

  return concatBytes(
    salt,
    uint32BE(recordSize),
    Uint8Array.of(senderKeys.publicKeyRaw.length),
    senderKeys.publicKeyRaw,
    ciphertext
  );
}

async function generateSenderKeys(): Promise<{
  privateKey: CryptoKey;
  publicKeyRaw: Uint8Array;
}> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { privateKey: pair.privateKey, publicKeyRaw: raw };
}

/* ───────────────────────────────────────────────────────────── VAPID ── */

/**
 * Importa el escalar privado VAPID. Web Crypto no acepta un escalar crudo:
 * exige un JWK completo, con `x` e `y`. Se sacan de la clave PUBLICA, que ya
 * tenemos porque el navegador la necesita para suscribirse. Es la razon por
 * la que esta funcion pide las dos claves y no solo la privada.
 */
async function importVapidSigningKey(keys: VapidKeys): Promise<CryptoKey> {
  const { x, y } = splitPublicPoint(bytesFromBase64Url(keys.publicKey));
  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlFromBytes(x),
      y: base64UrlFromBytes(y),
      d: keys.privateKey,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/** Duracion del JWT. El RFC 8292 §2 permite hasta 24h; 12 deja margen de sobra. */
const VAPID_TTL_SECONDS = 12 * 60 * 60;

/**
 * Cabecera `Authorization` para un envio. El `aud` es el ORIGEN del endpoint,
 * no el endpoint entero: firmar con la ruta completa dentro hace que Apple y
 * Google devuelvan 401 con un mensaje que no lo menciona.
 */
export async function vapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  const audience = new URL(endpoint).origin;

  const header = base64UrlFromBytes(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = base64UrlFromBytes(
    utf8(
      JSON.stringify({
        aud: audience,
        exp: nowSeconds + VAPID_TTL_SECONDS,
        sub: keys.subject,
      })
    )
  );
  const signingInput = header + '.' + claims;

  const signingKey = await importVapidSigningKey(keys);
  /* Web Crypto devuelve la firma ECDSA ya como `r || s` de 64 bytes, que es
     exactamente lo que pide JWS. Node con `crypto.sign` devolveria DER y
     habria que convertirla: otra razon para quedarse en Web Crypto. */
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      signingKey,
      utf8(signingInput) as unknown as ArrayBuffer
    )
  );

  const jwt = signingInput + '.' + base64UrlFromBytes(signature);
  return 'vapid t=' + jwt + ', k=' + keys.publicKey;
}

/* ────────────────────────────────────────────────────────────── envio ── */

/** Cuanto guarda el servicio de push el mensaje si el telefono esta apagado. */
const TTL_SECONDS = 6 * 60 * 60;

export async function sendPush(
  subscription: PushSubscription,
  payload: unknown,
  keys: VapidKeys
): Promise<PushResult> {
  let body: Uint8Array;
  let authorization: string;

  try {
    body = await encryptPayload({
      payload: utf8(JSON.stringify(payload)),
      userAgentPublicKey: bytesFromBase64Url(subscription.p256dh),
      authSecret: bytesFromBase64Url(subscription.auth),
    });
    authorization = await vapidAuthorization(subscription.endpoint, keys);
  } catch (error) {
    /* Un fallo aqui es de configuracion (clave mal pegada, suscripcion
       corrupta), no del servicio de push. Se distingue con status 0 para que
       el informe no diga "Apple rechazo el envio" cuando el problema es una
       variable de entorno. */
    return { ok: false, status: 0, gone: false, error: describe(error) };
  }

  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(TTL_SECONDS),
        /* `high` es lo que hace que iOS la muestre en cuanto llega en vez de
           agruparla con el resto. Es una notificacion al dia (decision 33),
           asi que no hay riesgo de abusar del presupuesto del sistema. */
        Urgency: 'high',
      },
      body: body as unknown as BodyInit,
    });

    if (response.ok) return { ok: true, status: response.status, gone: false };

    const text = await response.text().catch(() => '');
    return {
      ok: false,
      status: response.status,
      gone: isGone(response.status, text),
      error: text.slice(0, 500) || 'HTTP ' + response.status,
    };
  } catch (error) {
    return { ok: false, status: 0, gone: false, error: describe(error) };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * ¿Esta suscripcion esta muerta para siempre?
 *
 * La respuesta estandar es 404 o 410, y es lo que devuelven Google y Mozilla.
 * APPLE NO. Comprobado el 2026-09-13 mandando a un endpoint inventado de
 * `web.push.apple.com`: devuelve **400** con `{"reason":"BadWebPushToken"}`.
 * Google devolvio 410 y Mozilla 404 en la misma prueba.
 *
 * Si solo se mirara el codigo, una suscripcion muerta de iPhone —el caso
 * normal: el usuario reinstala la PWA— nunca se marcaria con `failed_at`, el
 * cron seguiria intentandolo cada dia para siempre, y la tabla de destinos
 * muertos solo crece. Y iOS es el unico entorno que importa (decision 1).
 *
 * Por eso el 400 se mira por dentro, y solo con las razones de APNs que
 * significan "este destino ya no existe". Un 400 por cualquier otro motivo NO
 * marca nada: borrar la suscripcion buena por un error transitorio dejaria al
 * usuario sin notificaciones sin que nadie se entere.
 */
export function isGone(status: number, body: string): boolean {
  if (status === 404 || status === 410) return true;
  if (status !== 400) return false;
  return /BadWebPushToken|BadDeviceToken|Unregistered|ExpiredToken/i.test(body);
}
