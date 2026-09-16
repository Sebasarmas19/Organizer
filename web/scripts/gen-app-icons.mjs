/* ============================================================================
   Organizer · Los iconos de la PWA instalada

       node scripts/gen-app-icons.mjs

   Escribe cinco archivos en dos sitios, y la diferencia importa:

     src/app/icon.png        · convencion de Next: genera <link rel="icon">
     src/app/apple-icon.png  · convencion de Next: genera <link rel="apple-touch-icon">
     public/icon-192.png     · lo referencia `src/app/manifest.ts`
     public/icon-512.png     ·   idem
     public/icon-maskable-512.png · idem, con zona de seguridad

   Los dos de `src/app/` existen para no escribir a mano las etiquetas <link>
   en el layout: Next las pone solas al ver el archivo con ese nombre. Los de
   `public/` los cita el manifest por ruta, y ahi si hacen falta los tamanos.

   POR QUE UN GENERADOR Y NO CUATRO PNG A MANO
   -------------------------------------------
   El icono NO es decoracion en esta fase: es lo que el usuario toca en la
   pantalla de inicio, y sin PWA instalada en la pantalla de inicio iOS no
   entrega ni una notificacion (`docs/02-arquitectura.md`). Ademas es la marca
   que aparece dentro de la propia notificacion.

   El dibujo es el mismo que `.notif__icon` de `app/base.css`: cuadrado con el
   acento del sistema y un aro blanco dentro. Y el color se lee AQUI de
   `app/tokens.css` en vez de estar escrito a mano, para que no pueda separarse
   del sistema de diseno como se separaria una copia.

   Sin dependencias: `zlib` viene en Node y el PNG se escribe a pelo. Meter
   `sharp` o `canvas` en el proyecto para dibujar un aro seria desproporcionado.
   ========================================================================= */

import { deflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '..');
const publicDir = join(webRoot, 'public');
const tokensPath = join(webRoot, '..', 'app', 'tokens.css');

/* ── el color sale del sistema de diseno, no de este archivo ───────────── */

function readToken(name) {
  const css = readFileSync(tokensPath, 'utf8');
  /* Solo el primer bloque `:root`, que es el tema claro. El icono de la
     pantalla de inicio no cambia con el tema del telefono. */
  const match = new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})').exec(css);
  if (!match) throw new Error('No encuentro --' + name + ' en app/tokens.css');
  return match[1];
}

function rgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const BACKGROUND = rgb(readToken('task')); //  #1E3A6F · el acento (decision 65)
const FOREGROUND = [255, 255, 255]; //        el aro, como en `.notif__icon`

/* ── el dibujo ─────────────────────────────────────────────────────────── */

/**
 * `inset` deja margen alrededor del aro. Para el icono maskable Android e iOS
 * recortan hasta un 20% por cada lado, asi que el dibujo tiene que caber en el
 * circulo interior o se come un trozo del aro.
 */
function drawIcon(size, { ringRadius, ringWidth }) {
  const pixels = new Uint8Array(size * size * 4);
  const center = size / 2;
  const outer = ringRadius * size;
  const inner = outer - ringWidth * size;

  /* Supermuestreo de 3x3: un aro sin suavizar a 192px se ve como una escalera,
     y es el unico icono que el usuario mira todos los dias. */
  const samples = 3;
  const step = 1 / samples;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let covered = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const px = x + (sx + 0.5) * step - center;
          const py = y + (sy + 0.5) * step - center;
          const distance = Math.sqrt(px * px + py * py);
          if (distance <= outer && distance >= inner) covered++;
        }
      }
      const alpha = covered / (samples * samples);
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.round(
          BACKGROUND[channel] * (1 - alpha) + FOREGROUND[channel] * alpha
        );
      }
      /* Opaco en todo el cuadrado: iOS no respeta la transparencia del icono
         de la pantalla de inicio, la rellena de negro. */
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/* ── PNG a pelo ────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; //  8 bits por canal
  header[9] = 6; //  color 6 = RGBA
  header[10] = 0; // deflate
  header[11] = 0; // filtrado adaptativo
  header[12] = 0; // sin entrelazado

  /* Cada linea va precedida por su byte de filtro. 0 = sin filtro: el aro es
     casi todo color plano y deflate ya lo comprime de sobra. */
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── salida ────────────────────────────────────────────────────────────── */

/* `ringRadius` y `ringWidth` van en fraccion del lado, copiando la proporcion
   de `.notif__icon`: aro de 9px con trazo de 1.6 dentro de un cuadrado de 20. */
const NORMAL = { ringRadius: 0.225, ringWidth: 0.04 };
/* Para el maskable, el aro se encoge para caber en el circulo de seguridad. */
const MASKABLE = { ringRadius: 0.17, ringWidth: 0.032 };

const appDir = join(webRoot, 'src', 'app');

const OUTPUTS = [
  [publicDir, 'icon-192.png', 192, NORMAL],
  [publicDir, 'icon-512.png', 512, NORMAL],
  [publicDir, 'icon-maskable-512.png', 512, MASKABLE],
  /* Convencion de archivo de Next: al existir con este nombre en `src/app/`,
     Next escribe el <link> correspondiente en cada pagina y no hay que tocar
     el layout. */
  [appDir, 'icon.png', 192, NORMAL],
  /* 180 es el tamano que pide iOS, y este es el icono que de verdad acaba en
     la pantalla de inicio del usuario — el requisito duro para que haya push. */
  [appDir, 'apple-icon.png', 180, NORMAL],
];

mkdirSync(publicDir, { recursive: true });

for (const [dir, name, size, shape] of OUTPUTS) {
  const png = encodePng(size, drawIcon(size, shape));
  writeFileSync(join(dir, name), png);
  const label = dir === publicDir ? 'public/' : 'src/app/';
  console.log('escrito ' + label + name + '  ' + size + 'x' + size + '  ' + png.length + ' bytes');
}
