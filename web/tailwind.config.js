/**
 * Organizer · configuracion de Tailwind.
 *
 * Tailwind 4 configura por CSS, pero admite un archivo de configuracion de
 * los de siempre a traves de la directiva `@config`, que esta en
 * `src/app/globals.css`. Usamos esa via a proposito: el preset ya existia,
 * esta aprobado y se escribio para que el marcado de los comps se porte sin
 * tocar una sola clase. Reescribirlo como `@theme` seria traducir a mano un
 * archivo que ya funciona, y cada traduccion a mano es una ocasion de perder
 * un token por el camino.
 */

const preset = require('./tailwind.preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}'],
};
