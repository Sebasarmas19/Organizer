# F0 · Fundaciones

> Primera fase de código. **Bloquea todo lo demás.**
> Contexto obligatorio: `CLAUDE.md` · `docs/00-problema.md` ·
> `docs/08-modelo-tareas-reminders.md` · `docs/02-arquitectura.md` ·
> las 73 decisiones de `docs/01-decisiones.md`.
>
> El diseño **ya está hecho y aprobado por el usuario**. No lo rediseñes.
> Vive en `app/` y su documentación en `app/DESIGN.md`.

---

## Dónde va el código

| Carpeta | Qué es |
|---|---|
| `app/` | **El sistema de diseño y los comps.** Ya existe, aprobado. No se mueve |
| `web/` | **La PWA.** El proyecto Next.js. Lo creas tú en esta fase |

Se separan porque el App Router de Next.js usa `web/app/` para sus rutas y
chocaría de nombre con los comps. Los comps se quedan como referencia viva:
cuando dudes de cómo se ve algo, ábrelos.

---

## Alcance de esta fase

Esta fase **no construye ninguna pantalla del producto**. Construye el suelo.

### 1 · El proyecto

- Next.js con **App Router**, TypeScript **estricto**, Tailwind, en `web/`
- `pnpm` si está disponible; si no, `npm`. Deja dicho cuál usaste
- ESLint y Prettier con la configuración que traiga el `create-next-app`

### 2 · El sistema de diseño, portado

Esto es el corazón de la fase y donde se gana o se pierde el proyecto entero.

- `app/tokens.css` pasa a ser la fuente de verdad de `web/`. **Cópialo, no lo
  reinventes**, y consérvale los comentarios: llevan los ratios de contraste
  medidos y la razón de cada decisión
- `app/tailwind.preset.js` se usa tal cual en la configuración de Tailwind
- Los tres colores de entidad (`--task`, `--class`, `--rem`) llegan intactos
- **`--rem` no se expone como color de texto.** Mide 4.0:1: pasa como indicador,
  no como texto. Está en `docs/estado-FD3.md` §9.2 y es un requisito, no un
  consejo. Si `tailwind.preset.js` genera `text-rem`, quítalo del preset
- Los tres temas funcionan: claro, oscuro y **sin preferencia declarada**

Convierte a componentes de React solo lo que se repita de verdad: la fila, la
casilla, el banderín, el bloque de calendario, la barra de navegación. **No
conviertas los 15 comps.** Las pantallas llegan en F1 y F2.

### 3 · Supabase

- Cliente de Supabase para navegador y para servidor, separados
- **Auth por magic link.** Al entrar por primera vez se crea su fila en `profiles`
  con `timezone = 'America/Caracas'` (decisión 14: sin horario de verano)
- Tipos de TypeScript generados desde el esquema
- Middleware que protege todo salvo la pantalla de entrada

**El esquema lo ejecuta el usuario**, copiando `docs/schema.sql` en el SQL Editor
del panel de Supabase. Tú no tienes credenciales para hacerlo. Si necesitas que
lo corra, pídelo por el canal de pregunta.

### 4 · Variables de entorno

Crea `web/.env.local.example` con las seis variables de
`docs/02-arquitectura.md` §Variables de entorno, **vacías**, cada una con un
comentario de para qué sirve.

- El `.gitignore` ya excluye `.env*`. **Verifica que sigue así antes de terminar**
- `SUPABASE_SERVICE_ROLE_KEY` **nunca** se importa desde un componente de cliente
- El usuario pega sus claves en `web/.env.local` él mismo. No las pidas por chat

### 5 · Que se pueda desplegar

- Que `build` pase en limpio
- `README.md` corto en `web/`: cómo correrlo en local y qué falta para el deploy

---

## Fuera de alcance

- Cualquier pantalla del producto — eso es F1 y F2
- Push, service worker, manifest — eso es F3
- El endpoint de captura — F1
- Tocar `app/` — es el diseño aprobado, solo se lee
- Tocar `docs/` salvo tu informe
- Tocar `docs/schema.sql` sin preguntar

---

## Hecho cuando

El usuario entra con magic link desde su iPhone, ve una página vacía con la
tipografía y los colores correctos en los tres temas, y su fila existe en
`profiles`.

---

## Entregable

`docs/estado-F0.md`: qué quedó hecho, qué dejaste fuera, qué encontraste que
cambie el plan, y **exactamente qué tiene que hacer el usuario a mano** para
que esto quede en verde.

Textos en español, código e identificadores en inglés.
