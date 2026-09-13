# `web/` — la PWA de Organizer

Next.js 16 (App Router) + TypeScript estricto + Tailwind 4 + Supabase.

El sistema de diseño vive en `../app/` y **es de solo lectura**. Aquí hay
copias de `tokens.css` y `base.css`; la fuente de verdad sigue estando allá.

---

## Correrlo en local

```sh
cd web
npm install
cp .env.local.example .env.local   # y rellena las dos primeras variables
npm run dev                        # http://localhost:3000
```

Sin las claves la app **no falla**: muestra una pantalla que explica qué
copiar. El paso a paso completo está en `../docs/estado-F0.md`.

### Los comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run check:design` | Comprueba que `tokens.css` sigue igual que el de `app/` |
| `npm run gen:icons` | Regenera `src/lib/icons.ts` desde `app/icons.js` |
| `npm run verify` | Los cuatro anteriores, en orden. **Esto es lo que tiene que pasar antes de dar algo por hecho** |

Gestor de paquetes: **npm**. `pnpm` no está instalado en la máquina donde se
montó esto.

---

## Cómo está organizado

```
web/
├── src/
│   ├── app/                  rutas (App Router)
│   │   ├── layout.tsx        <html lang="es">, tema antes de pintar
│   │   ├── page.tsx          Inicio · pantalla provisional de F0
│   │   ├── entrar/           la única pantalla pública
│   │   └── auth/             retorno del enlace mágico y sus errores
│   ├── components/           los cinco componentes portados + Icon
│   ├── lib/
│   │   ├── supabase/         clientes: navegador, servidor, service role
│   │   ├── icons.ts          GENERADO desde app/icons.js
│   │   ├── env.ts            las variables, en un solo sitio
│   │   └── profile.ts        la fila de profiles y la zona horaria
│   ├── styles/
│   │   ├── tokens.css        COPIA EXACTA de app/tokens.css
│   │   ├── base.css          copia de app/base.css, sin el marco de iPhone
│   │   └── web.css           lo poco que solo existe aquí
│   └── proxy.ts              protege las rutas y refresca la sesión
├── tailwind.preset.js        copia del de app/, con la salvedad de FD3 §9.2
└── tailwind.config.js        se carga por @config desde globals.css
```

### Dos cosas que sorprenden si vienes de otra versión de Next

1. **`middleware.ts` ahora se llama `proxy.ts`** (Next 16) y corre en el
   runtime de Node por defecto. La documentación de esta versión exacta está
   en `node_modules/next/dist/docs/`.
2. **Tailwind 4 configura por CSS.** El preset de siempre se sigue usando, a
   través de la directiva `@config` de `src/app/globals.css`.

---

## Reglas que el código da por sentadas

- **`--rem` (ámbar) no puede ser color de texto.** Mide 4.0:1: pasa como
  indicador, no como texto. El preset **no genera `text-rem`** — ni
  `text-klassc` — a propósito. Si algún día hace falta pintar un icono ámbar,
  usa `fill-rem` o la clase `.rem__flag`.
- **`SUPABASE_SERVICE_ROLE_KEY` nunca llega al navegador.** Vive en
  `src/lib/supabase/admin.ts`, que empieza con `import 'server-only'`: si
  alguien lo importa desde un componente de cliente, la compilación falla.
- **44px de área táctil, sin excepción.** Las herramientas están en
  `base.css`: `.tapicon`, `.taptext`, `.chip`, `.btn`.
- **Textos en español, código en inglés.**

---

## Para desplegar

1. Importa el repo en Vercel y pon **`web`** como Root Directory.
2. Copia las seis variables de `.env.local.example` en
   Settings → Environment Variables.
3. En Supabase → Authentication → URL Configuration, añade la URL de Vercel
   como Site URL y `https://<tu-app>.vercel.app/auth/callback` a las Redirect
   URLs. Sin esto, el enlace mágico lleva a `localhost`.

Lo que **todavía no está** y hace falta para que la PWA sea una PWA:
`manifest.webmanifest`, service worker e iconos de instalación. Eso es F3.
