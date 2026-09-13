/**
 * Genera `src/lib/icons.ts` a partir de `../app/icons.js`.
 *
 * `app/` es el sistema de diseno aprobado y es de solo lectura. Los 34 iconos
 * viven alli como un mapa de SVG en bruto; aqui se convierten en un modulo de
 * TypeScript sin redibujar un solo trazo. Copiarlos a mano era la forma segura
 * de perder uno por el camino.
 *
 * Uso:  npm run gen:icons
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(here, '..', '..', 'app', 'icons.js');
const TARGET = path.resolve(here, '..', 'src', 'lib', 'icons.ts');

if (!fs.existsSync(SOURCE)) {
  console.error(
    'No encuentro ' + SOURCE + '.\n' +
      'Este script solo corre dentro del repositorio, junto a la carpeta app/.'
  );
  process.exit(1);
}

const src = fs.readFileSync(SOURCE, 'utf8');
const marker = 'window.ICONS = ';
const start = src.indexOf(marker) + marker.length;
const end = src.indexOf('\n};', start) + 2;
const icons = JSON.parse(src.slice(start, end));
const names = Object.keys(icons);

const header = [
  '/* ============================================================================',
  '   Organizer · Iconos',
  '   Set unico, un solo estilo (Reicon Outline, grosor 1.5). Vienen del MCP de',
  '   reicon declarado en .mcp.json. Ningun emoji, ningun glifo unicode.',
  '',
  '   ARCHIVO GENERADO. La fuente es `app/icons.js`, que no se toca.',
  '   Regenerar con:  npm run gen:icons',
  '',
  '   Los iconos son decorativos cuando acompanan a texto visible: se ocultan',
  '   del arbol de accesibilidad. Un control de solo icono necesita aria-label',
  '   en el boton, no en el svg. De eso se encarga <Icon>.',
  '   ========================================================================= */',
  '',
  'export type IconName =',
  names.map((n) => '  | ' + JSON.stringify(n)).join('\n') + ';',
  '',
  'export type IconDef = { vb: string; d: string };',
  '',
  'export const ICONS: Record<IconName, IconDef> = ',
].join('\n');

fs.writeFileSync(TARGET, header + JSON.stringify(icons, null, 2) + ';\n', 'utf8');
console.log(names.length + ' iconos -> src/lib/icons.ts');
