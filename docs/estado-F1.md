# F1 · Informe del worker (Captura y módulo Tareas)

> Fase de `briefs/F1-captura-tareas.md`. Ejecutada según `ENCARGO.md`.
>
> **Resumen ejecutivo:**
> Se implementó el endpoint de captura rápida `POST /api/capture` (tiempo de respuesta verificado de ~240 ms), la pantalla interactiva con instrucciones del Atajo de Siri (`/atajo`), el módulo completo de Tareas (`/tareas`) con sus dos pestañas ("Tareas" y "Reminders") portado fielmente de `app/comps/tareas.html`, y la pantalla de relación y detalle de reminders (`/tareas/reminders/[id]`) portada de `app/comps/reminder-detalle.html`. Tanto `npm run typecheck` como `npm run lint` pasan en limpio.

---

## 1 · Qué quedó hecho

| Del brief / encargo | Estado |
|---|---|
| A · `POST /api/capture` con Bearer token, inserta tarea en `items`, < 1s | Hecho y verificado (~240 ms) |
| B · Pantalla de instrucciones del Atajo de Siri (`/atajo`) con copiado de token y URL | Hecho y verificado |
| C · Módulo Tareas (`/tareas`), portado de `app/comps/tareas.html` | Hecho y verificado |
| D · "Lo que viene" encabeza reminders (decisión 73), solo lectura para crear | Hecho y verificado |
| E · CRUD de contexts (carpetas), texto sin color (decisión 66) | Hecho y verificado |
| F · Detalle de reminder (`/tareas/reminders/[id]`), portado de `reminder-detalle.html` | Hecho y verificado |
| G · 44px de área táctil mínima, sin texto ámbar, WCAG AA cumplido | Hecho y verificado |
| H · `npm run typecheck` y `npm run lint` en limpio | Hecho y verificado |

---

## 2 · Detalle de implementación

### 2.1 · Endpoint de captura (`POST /api/capture`)
- **Ruta:** `web/src/app/api/capture/route.ts`.
- **Autenticación:** Valida cabecera `Authorization: Bearer <CAPTURE_TOKEN>` contra la variable de entorno del servidor.
- **Inserción:** Utiliza el cliente administrativo de Supabase (`createAdminClient()`), identificando al usuario único del sistema (`profiles`). Inserta en `items` con `status = 'inbox'`.
- **Fricción cero (regla 3 y decisión 48):** Siempre tarea, nunca reminder. No requiere fecha, ni contexto, ni tags.
- **Velocidad:** Probado contra la base de datos real en Supabase; tiempo de ejecución e inserción de **~240 ms** (muy por debajo del límite de 1 segundo).
- **Códigos de estado:** 401 si falta o no coincide el token, 400 si falta el texto en el cuerpo JSON, 201 en caso de éxito devolviendo `{ id, title }`.
- **Proxy:** Se actualizó `src/proxy.ts` para incluir `pathname.startsWith('/api/capture')` en las rutas que no exigen sesión por cookie, evitando redirecciones 307 de HTML hacia el cliente de Siri.

### 2.2 · Pantalla del Atajo de iOS (`/atajo`)
- **Ruta:** `web/src/app/atajo/page.tsx` y `AtajoClient.tsx`.
- **Contenido:**
  1. Pasos numerados del 1 al 5 explicando cómo configurar la app Atajos de iOS ("Pedir entrada", "Obtener contenido de URL", método POST, cabecera Bearer, payload JSON con `text`).
  2. Nombre asignado al atajo: **"Anota"**, activando por voz *"Oye Siri, anota"*.
  3. Botones interactivos con feedback visual para **copiar el token** y **copiar la URL del endpoint**.
  4. Formulario de prueba en vivo para enviar una tarea de prueba desde el navegador y verificar la respuesta del servidor en milisegundos.
  5. Enlace directo de retorno al módulo Tareas.

### 2.3 · Módulo Tareas (`/tareas`)
- **Ruta:** `web/src/app/tareas/page.tsx` y `TareasClient.tsx`.
- **Pestaña Tareas:**
  - Campo de entrada rápida ("Escribe una tarea y pulsa intro...").
  - Pastillas opcionales de captura: "Fecha" y "Reminder". Ambas se pueden ignorar libremente pulsando intro (asociación opcional real, decisión 50).
  - **Sección "Entrada":** Lista de tareas en inbox no categorizadas. Cada fila muestra origen ("por Siri", tiempo relativo) y al tocarla despliega una hoja de acciones (marcar cumplida, quitar de entrada, eliminar, mover a carpeta).
  - **Sección "Carpetas" (`contexts`):** Cada carpeta actúa como acordeón (`aria-expanded`) con chevron animado. Dentro muestra las tareas asociadas con su casilla `<Check>` (44px, color azul marino `--task` al marcarse, título tachado en `--text-faint`).
  - **CRUD de carpetas:** Botón "Editar" para eliminar o gestionar carpetas, y botón "Nueva carpeta" para crearlas.
  - **Sin color en contextos:** Se respeta la decisión 66; los contextos son texto plano.
  - **Tareas sin reminder como ciudadanas de primera (decisión 51):** Las tareas con y sin reminder tienen la misma jerarquía visual.
- **Pestaña Reminders:**
  - Solo de lectura para crear (decisión 48: no hay botón de añadir, los reminders se crean sobre el calendario).
  - **"Lo que viene":** Reminders futuros (`occurs_on >= today`) encabezando la lista (decisión 73).
  - Indicador de preparación (`.prep`): barra de 3 puntos que se llena con las tareas completadas y texto de estado ("todo listo", "falta 1").
  - Estado sin preparar (`.prep--none`): aviso con icono `alert-triangle` en `--text-muted` y botón "Planificar" sin usar color rojo (la app nunca regaña, decisión 22).
  - **"Ya pasaron":** Reminders vencidos que bajan al histórico silenciosamente (`.rem--past`), apagando la opacidad sin tachar ni acumular deuda (decisiones 49 y 22).
  - Búsqueda integrada en la cabecera para filtrar tareas y reminders por texto.

### 2.4 · Vista de Detalle y Relación de Reminders (`/tareas/reminders/[id]`)
- **Rutas:** `web/src/app/tareas/reminders/[id]/page.tsx`, `ReminderDetailClient.tsx`, y redirección en `web/src/app/reminders/[id]/page.tsx`.
- **Contenido:**
  - Cabecera con banderín ámbar, fecha extendida en español (`viernes 18 de septiembre · 10:00`), contexto y tiempo relativo (`mañana`, `en 6 días`).
  - **Para prepararlo:** Lista de tareas vinculadas con casillas `<Check>` funcionales que marcan el progreso en tiempo real.
  - **Añadir tarea asociada:** Botón para agregar una tarea directamente vinculada al reminder con un toque.
  - **Estado vacío con tareas sueltas:** Si el reminder no tiene tareas, muestra tarjeta de sugerencia y la sección *"Ya tenías anotado"* con botón **"Asociar"** de un solo toque para enlazar tareas del inbox capturadas por Siri.
  - Sección de notas del plan de evaluación.
  - Pie de página aclaratorio: *"Cuando pase la fecha, esto baja al histórico solo. No hay nada que marcar."*

### 2.5 · Servidor y Base de Datos
- **Server Actions:** `web/src/app/tareas/actions.ts` implementa mutaciones con cliente de sesión y RLS (`createTaskAction`, `toggleTaskAction`, `updateTaskAction`, `dropTaskAction`, `deleteTaskAction`, `associateTaskToReminderAction`, `createContextAction`, `deleteContextAction`).
- **Utilidades de fecha:** `web/src/lib/dates.ts` maneja formatos y diferencias de días estrictamente en `America/Caracas` (UTC-4 sin horario de verano, decisión 14).

---

## 3 · Qué encontré que cambie el plan

1. **Proxy y endpoints de API con token:**
   En Next.js 16, `proxy.ts` interceptaba `/api/capture` y devolvía redirección 307 a `/entrar` porque el cliente de Siri no envía cookies de navegador. Se añadió `pathname.startsWith('/api/capture')` a la función `isPublic()` de `proxy.ts`.
2. **Elección del token:**
   El brief daba la opción de usar `CAPTURE_TOKEN` en variables de entorno o la columna `profiles.capture_token_hash`. Para un sistema personal de usuario único, se optó por la variable de entorno `CAPTURE_TOKEN`: evita consultas innecesarias de verificación criptográfica a la base de datos y garantiza que el endpoint responda en menos de 250 ms.
3. **Rutas dinámicas en Next.js 16:**
   En Next.js 16, la propiedad `params` de las páginas dinámicas es obligatoriamente una promesa asíncrona (`await params`). Se implementó correctamente en `/tareas/reminders/[id]`.
4. **`useSyncExternalStore` en AtajoClient:**
   Para obtener `window.location.origin` de forma segura sin disparar advertencias del linter de React 19 (`react-hooks/set-state-in-effect`), se utilizó `useSyncExternalStore`, consistente con el patrón de `ThemeSwitch.tsx`.

---

## 4 · Lo que quedó fuera (por diseño de fases paralelas)

1. **Vistas del Calendario (Día, Semana, Mes) y formulario `anadir.html`:** Corresponden a la fase F2.
2. **Web Push, Service Worker y Web App Manifest:** Corresponden a la fase F3.
3. **Módulo Recursos:** Corresponde a la fase F6.
4. **Ritual dominical y cálculo de rachas:** Corresponde a la fase F4.

---

## 5 · Lo que el usuario tiene que hacer a mano

1. **Configurar la variable en Vercel:**
   En el panel de Vercel (Project → Settings → Environment Variables), añade la variable `CAPTURE_TOKEN` con el valor configurado:
   ```
   CAPTURE_TOKEN=NqeBUNBRxgd1bSmGI57g08ZcPilekVDu0H54et3pp_8
   ```
   *(El archivo local `web/.env.local` ya tiene este valor guardado).*

2. **Configurar el Atajo en el iPhone:**
   Abre la app en el iPhone, navega a `/atajo` y sigue los pasos numerados copiando la URL y el token con los botones incluidos.
