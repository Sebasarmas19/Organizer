/**
 * Comprueba que `src/styles/tokens.css` sigue siendo una copia EXACTA de
 * `../app/tokens.css`.
 *
 * Por que existe: `app/` es el sistema de diseno aprobado y es la fuente de
 * verdad, pero la app real necesita el archivo dentro de `web/` para poder
 * desplegarse sola. Dos copias del mismo archivo divergen siempre; la
 * pregunta es solo cuando te enteras. Esto lo convierte en un fallo ruidoso.
 *
 * Solo vigila `tokens.css`, y a proposito:
 *   - `base.css` diverge de forma declarada (se le quito el marco de iPhone
 *     de los comps; esta explicado dentro del archivo).
 *   - `tailwind.preset.js` diverge de forma declarada (FD3 §9.2: `text-rem`
 *     y `text-klassc` no se generan).
 *   - `tokens.css` NO tiene por que divergir nunca. Lleva los ratios de
 *     contraste medidos: si uno de los dos cambia y el otro no, la app y su
 *     documentacion dejan de decir la verdad.
 *
 * Si `app/` no esta (por ejemplo en un despliegue que solo clona `web/`), no
 * falla: no hay nada contra que comparar.
 *
 * Uso:  npm run check:design
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, '..', '..', 'app', 'tokens.css');
const COPY = path.resolve(here, '..', 'src', 'styles', 'tokens.css');

if (!fs.existsSync(SOURCE)) {
  console.log('check:design — no encuentro app/tokens.css. Nada que comparar.');
  process.exit(0);
}

const source = fs.readFileSync(SOURCE, 'utf8');
const copy = fs.readFileSync(COPY, 'utf8');

if (source === copy) {
  console.log('check:design — tokens.css identico a app/tokens.css.');
  process.exit(0);
}

const sourceLines = source.split('\n');
const copyLines = copy.split('\n');
const first = sourceLines.findIndex((line, i) => line !== copyLines[i]);

console.error(
  'check:design — tokens.css SE SEPARO de app/tokens.css.\n' +
    '\n' +
    '  primera diferencia: linea ' + (first + 1) + '\n' +
    '    app/  ' + JSON.stringify(sourceLines[first] ?? '(no existe)') + '\n' +
    '    web/  ' + JSON.stringify(copyLines[first] ?? '(no existe)') + '\n' +
    '\n' +
    '  La fuente de verdad es app/tokens.css. Si el cambio bueno esta alli:\n' +
    '    cp ../app/tokens.css src/styles/tokens.css\n' +
    '  Si el cambio bueno esta aqui, llevalo a app/ primero y vuelve a copiar.\n'
);
process.exit(1);
