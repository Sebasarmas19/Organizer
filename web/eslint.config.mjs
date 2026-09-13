import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    /* `tailwind.config.js` lo carga Tailwind por la directiva `@config`, que
       espera un modulo CommonJS. El `require()` no es pereza: es el formato
       que pide quien lee el archivo. Lo mismo para el preset que importa. */
    files: ["tailwind.config.js", "tailwind.preset.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    /* Los iconos son un archivo GENERADO (npm run gen:icons) de 34 trazados
       SVG en una sola constante. Revisarlo con reglas de estilo no aporta
       nada: si algo esta mal, se arregla en app/icons.js y se regenera. */
    files: ["src/lib/icons.ts"],
    rules: {},
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
