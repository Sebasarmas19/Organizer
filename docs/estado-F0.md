# F0 · Informe del worker

> Fase de `briefs/F0-fundaciones.md`. Primera fase de código real.
> Escrito al terminar, para el coordinador y para el usuario.
>
> **Lo primero:** la sección 6 es lo que el usuario tiene que hacer a mano.
> Son cuatro pasos y ninguno lleva más de diez minutos. Hasta que se hagan,
> esto compila pero no tiene con qué hablar.

---

## 1 · Qué quedó hecho

| Del brief | Estado |
|---|---|
| 1 · Proyecto Next.js, App Router, TS estricto, Tailwind, en `web/` | Hecho |
| 2 · Sistema de diseño portado, `--rem` fuera de los colores de texto, tres temas | Hecho y **verificado** |
| 3 · Componentes de React solo de lo que se repite | Hecho: cinco, más `<Icon>` |
| 4 · Supabase: cliente/servidor, magic link, `profiles`, tipos, protección de rutas | Hecho |
| 5 · `.env.local.example` con las seis variables, `.gitignore` comprobado | Hecho, y el `.gitignore` **corregido** |
| 6 · Build limpio y README | Hecho |

`npm run verify` encadena las cuatro comprobaciones —copia del diseño, ESLint,
TypeScript y build— y **pasa en limpio**. Es lo que hay que correr antes de dar
nada por terminado.

Gestor de paquetes: **npm**. `pnpm` no está instalado en esta máquina.

### Versiones que tocaron

| | Versión |
|---|---|
| Next.js | **16.3.5** |
| React | 19.2.8 |
| Tailwind | **4** |
| `@supabase/ssr` | 0.12.7 |
| Node | 24.14.0 |

Las dos en negrita cambian cosas que el plan daba por sabidas. Están en la
sección 7.

---

## 2 · El sistema de diseño

Esto era "el corazón de la fase" según el brief, así que va con detalle.

### Qué se copió y qué no

| Archivo | En `web/` | Diverge de `app/` |
|---|---|---|
| `tokens.css` | `src/styles/tokens.css` | **No. Byte a byte idéntico** |
| `base.css` | `src/styles/base.css` | Sí, en una cosa declarada |
| `tailwind.preset.js` | `tailwind.preset.js` | Sí, en una cosa declarada |
| `icons.js` | `src/lib/icons.ts` | No: se genera desde el original |

**`tokens.css` no diverge, y hay un guardia que lo comprueba.**
`npm run check:design` compara los dos archivos y falla si se separan, con el
número de la primera línea distinta. Existe porque dos copias del mismo
archivo divergen siempre y la única pregunta es cuándo te enteras; `tokens.css`
lleva dentro los ratios de contraste medidos, así que si se separa, la app y su
documentación dejan de decir la verdad a la vez.

**`base.css` diverge en un bloque, y está escrito dentro del archivo:** se le
quitó `body.comp`, `.device` (el marco de 390×844), `.statusbar` y `.homebar`.
Son un iPhone dibujado para poder revisar los comps en un navegador. En la app
real el iPhone lo pone el iPhone. Todo lo demás viaja igual, comentarios
incluidos.

**Los iconos no se copiaron a mano.** `npm run gen:icons` lee `app/icons.js` y
escribe `src/lib/icons.ts` con los 34 trazados literales. Redibujar 34 SVG a
mano era la forma segura de meter una errata en un trazado y no verla nunca.

### El requisito duro: `--rem` no es un color de texto

El brief lo marcaba como requisito y no como consejo. Cumplido, y comprobado
mirando el CSS generado:

| Utilidad | ¿Existe? |
|---|---|
| `text-rem` | **no existe** |
| `text-klassc` | **no existe** |
| `bg-rem` · `border-rem` · `fill-rem` | sí |
| `text-task` | sí |

Cómo: en Tailwind, una entrada de `theme.colors` genera todas las utilidades de
color a la vez, `text-` incluida. Así que `rem`, `rem-soft`, `klassc` y
`klass-soft` **salieron de `colors`** y entraron solo por `backgroundColor`,
`borderColor`, `fill` y `stroke`. La utilidad no existe, así que no se puede
escribir por descuido.

`text-klassc` se quitó también, y eso **va más allá de lo que pedía el brief**:
el verde sí llega a 4.5:1, o sea que no es un fallo de contraste. Se quitó
porque `DESIGN.md` prohíbe el texto verde por la misma razón que el ámbar —"el
color envuelve al texto, nunca lo pinta"— y dejar la utilidad generada era
dejar el mismo pie forzado. **Si el coordinador no lo comparte, es una línea en
`web/tailwind.preset.js`.**

Para el banderín, que es un icono y hereda `currentColor`, ya existe
`.rem__flag` en `base.css`. No hizo falta ninguna utilidad nueva.

### Los tres temas

Funcionan los tres: claro, oscuro, y **sin preferencia declarada**, que no es
un tercer tema sino no poner el atributo y dejar mandar a
`prefers-color-scheme`.

El tema se aplica con un script en el `<head>` **antes de pintar**. Si se
hiciera desde React habría un parpadeo blanco al abrir la app de noche, que es
justo cuando llega la notificación de cierre del día. El interruptor lee el DOM
con `useSyncExternalStore` en vez de copiar el valor a un estado: el atributo
del `<html>` es la única verdad y así no hay dos.

### Los cinco componentes

Solo lo que se repite de verdad, como pedía el brief. **No se portó ninguna de
las 15 pantallas.**

| Componente | Qué sostiene |
|---|---|
| `<Row>` | La fila de una tarea. El título manda; hora y contexto van subordinados |
| `<Check>` | La casilla. 44px reales aunque se vea de 23. Marcada = azul marino, sin celebración |
| `<ReminderFlag>` | La fila de un reminder. Banderín ámbar, sin casilla. Pasado se apaga, no se tacha |
| `<CalBlock>` | El bloque del calendario. Verde materia, azul tarea, azul de fondo en curso |
| `<TabBar>` | Los cuatro módulos. Icono **y** etiqueta siempre |
| `<Icon>` | Envuelve el set y resuelve la accesibilidad: decorativo por defecto |

---

## 3 · Supabase

- **`client.ts`** — navegador, clave anónima.
- **`server.ts`** — uno nuevo por petición, nunca compartido.
- **`admin.ts`** — service role, y empieza con `import 'server-only'`: si
  alguien lo importa desde un componente de cliente **la compilación falla**.
  Es la barrera que pedía el brief, puesta donde se comprueba sola en vez de
  quedar como una advertencia en un comentario.

**Magic link** en `/entrar` → Supabase → `/auth/callback`, que cambia el código
por sesión y **garantiza la fila en `profiles`** con
`timezone = 'America/Caracas'` (decisión 14, sin horario de verano). Se crea
ahí y no en una pantalla de bienvenida porque es el primer instante en que hay
sesión y no depende de que el usuario llegue a ningún sitio. El insert es
idempotente: volver a entrar no pisa sus horas de notificación ni su racha.

**Protección de rutas**: `src/proxy.ts` deja pasar solo `/entrar` y `/auth/*`;
todo lo demás redirige si no hay sesión. El filtro está escrito **en negativo**
—todo menos los estáticos— para que una pantalla nueva de F1 quede protegida
por omisión y no por acordarse. Verificado: `GET /` sin sesión devuelve `307`
hacia `/entrar`.

---

## 4 · Variables de entorno

`web/.env.local.example` tiene las seis de `docs/02-arquitectura.md`, vacías,
cada una con su comentario. Las tres de push y captura se dejaron declaradas
aunque no se usen hasta F1 y F3: descubrir a mitad de F3 que falta una es peor
que tenerla escrita hoy.

### El `.gitignore` tenía un agujero, y se cerró

El brief pedía verificar que seguía excluyendo `.env*`. **No lo hacía.**

| Archivo | Antes | Ahora |
|---|---|---|
| `.gitignore` (raíz) | `.env`, `.env*.local`, `.env.production` | `.env*` más `!.env*.example` |
| `web/.gitignore` | `.env*` | igual, más `!.env*.example` |

El de la raíz listaba tres casos concretos: un `web/.env.development` se habría
commiteado. El de `web/`, que crea `create-next-app`, tenía el problema
contrario: `.env*` se tragaba también el `.env.local.example`, que **sí** tiene
que viajar. Comprobado creando un `.env.local` con un secreto dentro: git no lo
ve, y sí ve el `.example`.

---

## 5 · Cómo se verificó

Además de `npm run verify`, se midió la página en un navegador de verdad a
390px, con la misma técnica del arnés de FD3: un iframe de 390px y un script
que recorre el DOM.

```
scrollWidth=390 clientWidth=390
sin controles por debajo de 44px
```

Sin desbordamiento horizontal y sin un solo control por debajo de 44px, con los
componentes portados ya en pantalla. También se revisaron capturas en claro y
en oscuro: el azul en la casilla, el ámbar en el banderín, el verde en el
bloque de materia, y ni un texto de color.

El archivo del arnés **no se quedó en el repo**: vivía en `public/`, que en
producción es público. La recomendación de FD3 §9.5 sigue en pie y ahora tiene
sitio: en F1, esto son veinte líneas de Playwright.

---

## 6 · Lo que tiene que hacer el usuario a mano

Cuatro pasos. Sin ellos la app compila pero no tiene con qué hablar.

### 1 · Crear el proyecto en Supabase y correr el esquema

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto. Región:
   la más cercana a Venezuela (`us-east-1` suele ser la mejor).
2. Abre **SQL Editor** → New query.
3. Pega **entero** el contenido de `docs/schema.sql` y dale a Run.
4. Comprueba en **Table Editor** que están las diez tablas: `profiles`,
   `contexts`, `items`, `blocks`, `schedule_templates`, `weekly_reviews`,
   `push_subscriptions`, `notification_log`, `resources`, `reminders`.

> Si `create extension pg_cron` da error, sáltalo por ahora: solo hace falta en
> F3. Lo demás corre igual.

### 2 · Pegar las claves

```sh
cd web
cp .env.local.example .env.local
```

En el panel de Supabase, **Project Settings → API**, copia:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

Las tres últimas variables se quedan vacías hasta F3.

> La `service_role` se salta RLS: es la llave maestra. No la pegues en un chat
> ni la mandes por correo. `.env.local` ya está fuera de git.

### 3 · Decirle a Supabase a dónde vuelve el enlace

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` mientras pruebas en local.
- **Redirect URLs**: añade `http://localhost:3000/auth/callback` y, cuando
  tengas Vercel, `https://<tu-app>.vercel.app/auth/callback`.

Sin esto el enlace del correo lleva a un sitio equivocado y parece que la app
está rota cuando lo que falta es una línea de configuración.

### 4 · Probarlo

```sh
cd web
npm install
npm run dev
```

Abre `http://localhost:3000`. Tiene que mandarte a **Entrar**. Escribe tu
correo, abre el enlace que llega, y deberías ver:

- tu correo en pantalla,
- **Perfil creado · America/Caracas**,
- el interruptor de tema con sus tres estados,
- las tres entidades con su color.

Si dice *"Falta tu fila en profiles"*, el esquema no se ejecutó o se ejecutó a
medias: vuelve al paso 1.

### Después, cuando quieras desplegar

Importa el repo en Vercel con **`web` como Root Directory**, copia las seis
variables en Settings → Environment Variables, y añade la URL de Vercel a las
Redirect URLs de Supabase (paso 3).

---

## 7 · Lo que encontré que cambia el plan

Seis cosas. Las tres primeras afectan a cómo se escribe el código de F1 en
adelante; las tres últimas son decisiones que alguien tiene que tomar.

### 7.1 · `middleware.ts` ya no existe: ahora es `proxy.ts`

Next.js 16 lo renombró. No es solo el nombre: **corre en el runtime de Node por
defecto** y `export const runtime` ahí es un error, no una opción. Cualquier
receta de middleware anterior a esta versión —y hay muchas en las guías de
Supabase— apunta a un archivo que Next 16 ya no lee.

`web/AGENTS.md` (que escribe el propio `next dev`) lo dice con todas las
letras: *"This is NOT the Next.js you know"*, y manda leer
`node_modules/next/dist/docs/`. **Esa carpeta es la documentación de la versión
exacta instalada** y es la referencia buena para F1 y F2.

### 7.2 · Tailwind 4 configura por CSS, no por `tailwind.config.js`

El preset aprobado está escrito para Tailwind 3. Se sigue usando **tal cual**,
cargado con la directiva `@config` desde `globals.css`, que existe justo para
esto. Funciona y está verificado.

Lo digo porque la alternativa —traducir el preset a bloques `@theme`— parece
"más moderno" y es una mala idea: es traducir a mano un archivo que ya
funciona, y cada traducción a mano es una ocasión de perder un token por el
camino. **Si alguien lo propone en F1, esta es la razón para no hacerlo.**

### 7.3 · Los tipos de la base de datos están derivados a mano

`supabase gen types` necesita el proyecto creado y credenciales, y esta fase se
montó sin ninguna de las dos. `src/lib/supabase/database.types.ts` es una
transcripción fiel de `docs/schema.sql`, con el comando de regeneración escrito
en la cabecera. **En cuanto el esquema esté en línea conviene regenerarlo** y
comparar: es la forma barata de comprobar que la transcripción no se equivocó
en ningún nulo.

Un detalle que costó encontrar y que quedó documentado en el archivo: sin la
clave `Relationships: []` en cada tabla, el tipo no encaja en `GenericTable` y
postgrest-js degrada **toda** la tabla a `never`, con errores del estilo
*"Property 'timezone' does not exist on type 'never'"* que no señalan a la
causa.

### 7.4 · La decisión 55 y lo que se construyó en FD3 no dicen lo mismo

La decisión 55 dice que el orden de Inicio es **Hoy → De ayer → Esta semana →
racha**. Lo que se aprobó y se dibujó en FD3 es **Hoy → Esta semana → De
ayer**, con la racha en el encabezado y sin "Se me corrió el día". Eso está en
`app/comps/inicio.html`, en `app/DESIGN.md` y en `docs/estado-FD3.md`, pero la
tabla de decisiones sigue con el texto viejo.

No lo toco: `docs/` es del coordinador y el brief prohíbe reabrir decisiones.
Pero **F1 construye esa pantalla** y va a leer la 55. Conviene cerrarlo antes.

### 7.5 · Falta todo lo que hace que una PWA sea una PWA

No hay `manifest.webmanifest`, ni service worker, ni iconos de instalación.
Está fuera de alcance a propósito (es F3) y lo dejo escrito porque
**`display: standalone` en el manifest es requisito duro para que Web Push
funcione en iOS** (`docs/02-arquitectura.md`). Hasta F3, la app se puede añadir
a la pantalla de inicio pero no va a recibir una sola notificación — y la
notificación es el producto.

### 7.6 · Un worker lanzado dentro de `web/` no ve el contexto del proyecto

`create-next-app` deja un `AGENTS.md` y un `CLAUDE.md` propios en `web/`. Un
agente que arranque ahí lee la nota de Next.js y **no** las 73 decisiones ni el
diagnóstico. Le añadí al final de `web/AGENTS.md` una tabla que apunta a
`../CLAUDE.md`, `../docs/00-problema.md`, `../docs/01-decisiones.md` y
`../app/DESIGN.md`, más las cuatro reglas cortas. Next solo regenera su propio
bloque, así que el añadido sobrevive.

---

## 8 · Lo que dejé fuera

Todo lo que el brief marcaba como fuera de alcance, y nada más:

1. **Ninguna pantalla del producto.** `src/app/page.tsx` es provisional y lo
   dice en su cabecera: existe para poder comprobar desde el iPhone que la
   sesión, el perfil, la tipografía, el color y los tres temas están bien.
   F1 la reemplaza entera.
2. **Nada de push, service worker ni manifest** (F3).
3. **Nada del endpoint de captura** (F1). `admin.ts` ya existe porque es quien
   lo va a usar, pero la ruta no está escrita.
4. **No toqué `app/`.** Se leyó y se copió; ni un archivo modificado.
5. **No toqué `docs/schema.sql`** ni ningún otro documento salvo este informe.
6. **No reabrí ninguna decisión.** Donde encontré un choque —el 7.4— lo anoté
   aquí en vez de resolverlo por mi cuenta.
7. **No hay tests.** No estaban en el encargo. La recomendación de FD3 §9.5
   (llevar el arnés de medida a Playwright) sigue sin hacerse y ahora tiene
   dónde vivir.

---

## 9 · Estado

**F0 está terminada por el lado del código.** Queda en verde en cuanto el
usuario haga los cuatro pasos de la sección 6.

El criterio del brief era: *"el usuario entra con magic link desde su iPhone,
ve una página vacía con la tipografía y los colores correctos en los tres
temas, y su fila existe en `profiles`"*. Todo lo que depende del código está
hecho y verificado; lo único que falta es el proyecto de Supabase, que necesita
sus credenciales.

Nada commiteado: los cambios están en el árbol de trabajo.
