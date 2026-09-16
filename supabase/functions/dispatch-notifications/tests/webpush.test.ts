/* ============================================================================
   Organizer · El cifrado de Web Push, contra el RFC

   POR QUE ESTA PRUEBA ES LA MAS IMPORTANTE DEL REPOSITORIO
   --------------------------------------------------------
   Un cifrado de Web Push mal hecho NO DA ERROR. El servicio de push acepta el
   POST y devuelve 201; el iPhone recibe un mensaje que no puede descifrar y no
   muestra absolutamente nada. No hay log, no hay aviso, no hay sintoma: solo
   una notificacion que no llega. Y "una notificacion que no llega y nadie
   nota" es, con esas palabras, el peor fallo posible de este proyecto
   (`docs/02-arquitectura.md`).

   Asi que el cifrado no se prueba mandando algo y mirando: se prueba
   reproduciendo el ejemplo completo del RFC 8291 §5 con sus mismas claves y
   su misma sal, y comparando el cuerpo cifrado byte a byte con el valor
   publicado en el Apendice A. Si esos 145 bytes coinciden, coinciden el ECDH,
   los dos HKDF, el delimitador, la cabecera y el AES-GCM.

   Se ejecuta con Node, que implementa las mismas APIs web que Deno:

       node --test supabase/functions/dispatch-notifications/tests/

   Vectores: RFC 8291 §5 y Apendice A (rfc-editor.org/rfc/rfc8291.txt).
   ========================================================================= */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  base64UrlFromBytes,
  bytesFromBase64Url,
  concatBytes,
  uint32BE,
  utf8,
} from '../bytes.ts';
import { encryptPayload, isGone, vapidAuthorization } from '../webpush.ts';

/* ───────────────────────────────────────── vectores del RFC 8291 §5 ── */

const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  authSecret: 'BTBZMqHH6r4Tts7J_aSIgg',
  userAgentPublic:
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  senderPublic:
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  senderPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  /* §5, sin los saltos de linea que el RFC mete para que quepa en la pagina */
  expectedBody:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
    'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
    'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
  /* Apendice A, el cifrado solo (sin la cabecera de 86 bytes) */
  expectedCiphertext:
    '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEs' +
    'bI_0LpXMuGvnzQ',
  /* Apendice A: "el salt, el tamano de registro de 4096 y la clave publica
     del servidor producen una cabecera de 86 octetos" */
  expectedHeaderLength: 86,
};

/**
 * Importa el par efimero fijo del ejemplo. Web Crypto no acepta el escalar
 * privado a secas: hace falta el JWK completo, y `x` e `y` salen de partir la
 * clave publica del propio ejemplo.
 */
async function rfcSenderKeys() {
  const publicKeyRaw = bytesFromBase64Url(RFC.senderPublic);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlFromBytes(publicKeyRaw.subarray(1, 33)),
      y: base64UrlFromBytes(publicKeyRaw.subarray(33, 65)),
      d: RFC.senderPrivate,
      ext: true,
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );
  return { privateKey, publicKeyRaw };
}

/* ────────────────────────────────────────────────────────── base64url ── */

test('base64url va y vuelve, y no confunde el alfabeto de URL', () => {
  /* `-` y `_` en la posicion donde base64 normal pondria `+` y `/`: si el
     conversor se equivoca aqui, la clave publica de la suscripcion se importa
     como un punto invalido y el error habla de curvas, no de codificacion. */
  const bytes = bytesFromBase64Url(RFC.userAgentPublic);
  assert.equal(bytes.length, 65, 'un punto P-256 sin comprimir mide 65 bytes');
  assert.equal(bytes[0], 4, 'y empieza por 0x04');
  assert.equal(base64UrlFromBytes(bytes), RFC.userAgentPublic);
  assert.equal(bytesFromBase64Url(RFC.authSecret).length, 16);
});

test('base64url no lleva relleno', () => {
  assert.equal(base64UrlFromBytes(utf8('a')), 'YQ');
  assert.equal(base64UrlFromBytes(utf8('ab')), 'YWI');
  assert.equal(base64UrlFromBytes(utf8('abc')), 'YWJj');
});

test('base64url aguanta un cuerpo grande sin desbordar la pila', () => {
  const big = crypto.getRandomValues(new Uint8Array(5000));
  assert.ok(bytesFromBase64Url(base64UrlFromBytes(big)).every((v, i) => v === big[i]));
});

test('uint32BE escribe 4096 como lo escribe RFC 8188', () => {
  assert.deepEqual(Array.from(uint32BE(4096)), [0, 0, 0x10, 0x00]);
});

/* ─────────────────────────────────── el vector completo del RFC 8291 ── */

test('el cuerpo cifrado coincide byte a byte con el RFC 8291 §5', async () => {
  const body = await encryptPayload({
    payload: utf8(RFC.plaintext),
    userAgentPublicKey: bytesFromBase64Url(RFC.userAgentPublic),
    authSecret: bytesFromBase64Url(RFC.authSecret),
    fixedSalt: bytesFromBase64Url(RFC.salt),
    fixedSenderKeys: await rfcSenderKeys(),
  });

  assert.equal(base64UrlFromBytes(body), RFC.expectedBody);
});

test('la cabecera aes128gcm mide 86 bytes y lleva la clave efimera dentro', async () => {
  const body = await encryptPayload({
    payload: utf8(RFC.plaintext),
    userAgentPublicKey: bytesFromBase64Url(RFC.userAgentPublic),
    authSecret: bytesFromBase64Url(RFC.authSecret),
    fixedSalt: bytesFromBase64Url(RFC.salt),
    fixedSenderKeys: await rfcSenderKeys(),
  });

  const header = body.subarray(0, RFC.expectedHeaderLength);
  const ciphertext = body.subarray(RFC.expectedHeaderLength);

  assert.deepEqual(
    Array.from(header.subarray(0, 16)),
    Array.from(bytesFromBase64Url(RFC.salt)),
    'los 16 primeros bytes son la sal'
  );
  assert.deepEqual(
    Array.from(header.subarray(16, 20)),
    [0, 0, 0x10, 0x00],
    'luego el tamano de registro, 4096 en big-endian'
  );
  assert.equal(header[20], 65, 'luego la longitud del keyid');
  assert.deepEqual(
    Array.from(header.subarray(21)),
    Array.from(bytesFromBase64Url(RFC.senderPublic)),
    'y el keyid es la clave publica efimera del servidor'
  );
  assert.equal(base64UrlFromBytes(ciphertext), RFC.expectedCiphertext);
});

/* ───────────────────────────────── que no se repita nada entre envios ── */

test('cada envio usa una sal y un par efimero nuevos', async () => {
  const args = {
    payload: utf8('Hoy, jueves 17'),
    userAgentPublicKey: bytesFromBase64Url(RFC.userAgentPublic),
    authSecret: bytesFromBase64Url(RFC.authSecret),
  };
  const a = await encryptPayload(args);
  const b = await encryptPayload(args);

  /* Reutilizar sal y clave con AES-GCM es el fallo que rompe el cifrado del
     todo, no solo el de un mensaje. */
  assert.notEqual(base64UrlFromBytes(a.subarray(0, 16)), base64UrlFromBytes(b.subarray(0, 16)));
  assert.notEqual(base64UrlFromBytes(a.subarray(21, 86)), base64UrlFromBytes(b.subarray(21, 86)));
});

/* ──────────────────────────── se puede descifrar desde el otro lado ── */

test('lo que ciframos lo descifra el navegador (ida y vuelta con una clave nueva)', async () => {
  /* Complementa al vector del RFC: aquel prueba que seguimos la norma con SUS
     claves; este prueba que seguimos siguiendola con claves generadas al azar,
     que es el caso real de una suscripcion del iPhone. */
  const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ]);
  const uaPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const message = 'Hoy: 8:00 Calculo · 11:00 Algebra · 15:00 Migrar el schema';

  const body = await encryptPayload({
    payload: utf8(message),
    userAgentPublicKey: uaPublicRaw,
    authSecret,
  });

  /* Descifrado tal y como lo hace el navegador: leer la cabecera, repetir el
     HKDF desde el otro lado del ECDH, quitar el delimitador. */
  const salt = body.subarray(0, 16);
  const keyIdLength = body[20];
  const senderPublicRaw = body.subarray(21, 21 + keyIdLength);
  const ciphertext = body.subarray(21 + keyIdLength);

  const senderKey = await crypto.subtle.importKey(
    'raw',
    senderPublicRaw as unknown as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: senderKey }, ua.privateKey, 256)
  );

  const mac = async (key: Uint8Array, data: Uint8Array) => {
    const k = await crypto.subtle.importKey(
      'raw',
      key as unknown as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as unknown as ArrayBuffer));
  };
  const expand = async (salty: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) =>
    (await mac(await mac(salty, ikm), concatBytes(info, Uint8Array.of(1)))).subarray(0, n);

  const ikm = await expand(
    authSecret,
    ecdhSecret,
    concatBytes(utf8('WebPush: info'), Uint8Array.of(0), uaPublicRaw, senderPublicRaw),
    32
  );
  const cek = await expand(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await expand(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    cek as unknown as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const record = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce as unknown as ArrayBuffer, tagLength: 128 },
      aesKey,
      ciphertext as unknown as ArrayBuffer
    )
  );

  assert.equal(record[record.length - 1], 2, 'el ultimo byte es el delimitador 0x02');
  assert.equal(new TextDecoder().decode(record.subarray(0, -1)), message);
});

/* ───────────────────────────────────────────────────────────── VAPID ── */

test('la cabecera VAPID lleva un JWT ES256 que verifica con la clave publica', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey;
  const publicKey = base64UrlFromBytes(
    concatBytes(
      Uint8Array.of(4),
      bytesFromBase64Url(jwk.x as string),
      bytesFromBase64Url(jwk.y as string)
    )
  );

  const now = 1_789_000_000;
  const header = await vapidAuthorization(
    'https://web.push.apple.com/abcdef/0123456789',
    { publicKey, privateKey: jwk.d as string, subject: 'mailto:alguien@ejemplo.com' },
    now
  );

  const match = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  assert.ok(match, 'el formato es `vapid t=<jwt>, k=<clave publica>`');
  assert.equal(match[2], publicKey);

  const [encodedHeader, encodedClaims, encodedSignature] = match[1].split('.');
  const decoded = new TextDecoder().decode(bytesFromBase64Url(encodedHeader));
  assert.deepEqual(JSON.parse(decoded), { typ: 'JWT', alg: 'ES256' });

  const claims = JSON.parse(new TextDecoder().decode(bytesFromBase64Url(encodedClaims)));
  assert.equal(
    claims.aud,
    'https://web.push.apple.com',
    'el `aud` es el ORIGEN del endpoint, no el endpoint entero: con la ruta ' +
      'dentro, Apple contesta 401 sin decir por que'
  );
  assert.equal(claims.sub, 'mailto:alguien@ejemplo.com');
  assert.equal(claims.exp, now + 12 * 60 * 60);

  const signature = bytesFromBase64Url(encodedSignature);
  assert.equal(signature.length, 64, 'JWS quiere `r || s` crudo, no DER');
  assert.ok(
    await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      signature as unknown as ArrayBuffer,
      utf8(encodedHeader + '.' + encodedClaims) as unknown as ArrayBuffer
    ),
    'la firma tiene que verificar con la clave publica que se manda en `k=`'
  );
});

/* ────────────────────────────────────────── errores que se entienden ── */

test('una clave de suscripcion con mala forma falla con un mensaje util', async () => {
  await assert.rejects(
    () =>
      encryptPayload({
        payload: utf8('x'),
        userAgentPublicKey: new Uint8Array(64),
        authSecret: new Uint8Array(16),
      }),
    /sin comprimir/
  );
  await assert.rejects(
    () =>
      encryptPayload({
        payload: utf8('x'),
        userAgentPublicKey: bytesFromBase64Url(RFC.userAgentPublic),
        authSecret: new Uint8Array(8),
      }),
    /16 bytes/
  );
});

/* ─────────────────────────── suscripciones muertas: el caso de Apple ── */

test('Apple contesta 400 a una suscripción muerta, y eso también cuenta', async () => {
  /* Medido el 2026-09-13 contra los servicios reales con un endpoint
     inventado: Google devolvió 410, Mozilla 404 y Apple
     `400 {"reason":"BadWebPushToken"}`. Si solo se mirara el código, la
     suscripción muerta de un iPhone —el caso normal, al reinstalar la PWA—
     no se marcaría nunca y el cron la reintentaría para siempre. */
  assert.equal(isGone(410, 'push subscription has unsubscribed or expired'), true);
  assert.equal(isGone(404, ''), true);
  assert.equal(isGone(400, '{"reason":"BadWebPushToken"}'), true);
  assert.equal(isGone(400, '{"reason":"Unregistered"}'), true);
});

test('un 400 por cualquier otra cosa NO mata la suscripción', () => {
  /* Marcar `failed_at` por un error transitorio dejaría al usuario sin
     notificaciones sin que nadie se entere, que es el peor fallo posible. */
  assert.equal(isGone(400, '{"reason":"PayloadTooLarge"}'), false);
  assert.equal(isGone(400, 'BadRequest'), false);
  assert.equal(isGone(401, '{"reason":"BadJwtToken"}'), false, 'eso es culpa nuestra');
  assert.equal(isGone(429, 'too many requests'), false);
  assert.equal(isGone(500, 'internal'), false);
});
