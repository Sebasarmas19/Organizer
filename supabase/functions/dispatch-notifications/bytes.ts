/* ============================================================================
   Organizer · Bytes y base64url

   Lo mas aburrido del modulo de push y donde mas se falla. Web Push mezcla
   tres codificaciones —base64url sin relleno, bytes crudos y texto UTF-8— y
   un `atob` donde tocaba base64url devuelve basura silenciosa: la firma sale
   mal, el servicio de push contesta 400 y el mensaje de error no menciona la
   codificacion en ningun momento.

   Por eso esta aqui separado y con pruebas propias.

   `base64url` (RFC 4648 §5) cambia `+` por `-`, `/` por `_` y NO lleva `=`.
   Es lo que usa `pushManager.subscribe` para `p256dh` y `auth`, y lo que
   usan JWS y VAPID.

   Todo el modulo corre igual en Deno (la Edge Function) y en Node 24 (las
   pruebas): solo usa APIs de la plataforma web.
   ========================================================================= */

export function bytesFromBase64Url(value: string): Uint8Array {
  /* Se vuelve a poner el relleno porque `atob` lo exige, y se deshace la
     sustitucion de caracteres del alfabeto seguro para URL. */
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  /* De uno en uno y no con `String.fromCharCode(...bytes)`: el operador de
     propagacion sobre un array grande desborda la pila de argumentos, y aqui
     los cuerpos cifrados pasan de 4KB. */
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Entero de 32 bits, big-endian. Es como RFC 8188 escribe el tamano de registro. */
export function uint32BE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
