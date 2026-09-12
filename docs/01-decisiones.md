# Decisiones cerradas

Resultado de 4 rondas de entrevista con el usuario el **2026-09-12**.
**No re-preguntes nada de esta tabla.** Si algo aquí bloquea el trabajo,
discútelo señalando la decisión concreta, no reabras el tema desde cero.

## Producto

| # | Decisión | Valor | Razón / advertencia |
|---|---|---|---|
| 1 | Dispositivo principal | **iPhone** | Obliga a PWA instalada en pantalla de inicio y a push desde servidor |
| 2 | Usuarios | **Solo él** | Auth mínima con magic link. Sin registro ni onboarding multiusuario |
| 3 | Vista del plan semanal | **Calendario con bloques horarios** | Elegido con advertencia explícita (ver Riesgos) |
| 4 | Horario de clases | **Plantilla semanal fija** | Se carga una vez y se materializa cada semana |
| 5 | Tarea no cumplida | **La app pregunta qué hacer** | Evita listas zombie. Opciones: hoy / otro día / borrar |
| 6 | Notificaciones activas | Mañana, noche, domingo, y por tarea con hora | Las 4 |
| 7 | Ideas sin fecha | **Biblioteca "algún día"** que se ofrece el domingo | Libros, cursos, proyectos, "probar Hermes" |
| 8 | Racha | **Con perdón automático** (1–2 comodines/mes) | Racha estricta + ADHD = abandono al primer fallo |
| 9 | Captura rápida | **Atajo de Siri + endpoint API** | Sin esto el problema original no se resuelve |
| 10 | Alcance v1 | Inbox, plan semanal, vista Hoy, notificaciones, contextos, biblioteca | Confirmado completo |

## Técnicas

| # | Decisión | Valor | Razón |
|---|---|---|---|
| 11 | Framework | **Next.js (App Router) + Vercel** | HTTPS gratis (obligatorio para push), deploy simple, Server Actions |
| 12 | Backend | **Supabase** | Postgres + Auth + Edge Functions + `pg_cron` en free tier |
| 13 | Notificaciones | **Web Push (VAPID) disparado por cron del servidor** | iOS no permite programar notificaciones locales |
| 14 | Zona horaria | **`America/Caracas`** (UTC−4, Venezuela) | Confirmado por el usuario. **No usar `America/New_York`**: también es UTC−4 hoy, pero tiene horario de verano y en noviembre correría las notificaciones una hora |
| 15 | Horas de notificación | **Pendiente, se resuelve después** | El usuario lo pospuso. No bloquea: es configuración |
| 16 | Idioma | UI en español, código en inglés | — |

## Restricción de calendario

**El semestre empieza el 2026-09-15 (3 días desde el snapshot).**

Instrucción textual del usuario:

> "Empieza en 3 días, pero que esto no sea una implicación, haz el plan igual
> para que sea una PWA a la altura."

Lectura correcta: **no recortar calidad ni alcance — recortar el orden.**
El núcleo usable sale antes del día 3; el resto se construye encima sin
rehacer nada. Ver `docs/04-plan-fases.md`.

## Decisiones descartadas y por qué

| Opción | Por qué se descartó |
|---|---|
| Solo almacenamiento local (IndexedDB) | Sin backend no hay notificaciones programadas en iOS |
| Firebase | Más acoplado a Google y más verboso que Supabase para este caso |
| Sincronizar con Google Calendar | Suma OAuth, cuotas y un punto de falla. Reevaluable en v2 |
| Vite + React SPA | Habría que resolver hosting y HTTPS por separado |
| Arrastrar tareas no cumplidas automáticamente | Llena la vista Hoy de deuda vieja hasta que dejas de abrirla |
| Widget nativo de iOS | Requiere una app real en Swift, no una PWA |
| Multiusuario desde el día 1 | Días de trabajo para un solo usuario |

## Riesgo aceptado conscientemente

**Calendario con bloques horarios + ADHD.** Un calendario rígido se rompe el
primer día que se atrasa, y ahí se abandona la app. El usuario lo eligió
igual, con la advertencia sobre la mesa. Mitigaciones comprometidas:

1. Botón **"se me corrió el día"** que empuja todos los bloques pendientes N horas de una vez.
2. Re-agendar arrastrando, sin formularios ni diálogos.
3. El modelo de datos permite degradar a "lista por día" sin migración, si
   después resulta que la rigidez no le sirve.

## Ampliaciones (ronda 2 de entrevista, 2026-09-12)

| # | Decisión | Valor | Razón |
|---|---|---|---|
| 17 | Dispositivo de planificación | **Ambos, pero el teléfono manda** | Responsive real. El móvil es el uso principal; el escritorio es cómodo para la revisión del domingo, no obligatorio |
| 18 | Límite de tareas por día | **Sin límite duro** | El usuario prefiere probarlo con la app en la mano y ajustar. No imponer un tope; sí ordenar por prioridad y que la vista Hoy no obligue a hacer scroll |
| 19 | Biblioteca de recursos | **Sí, en el alcance** | Skills, herramientas y artículos. Cuarta fuente fragmentada que la app debe absorber. Ver `docs/06-recursos.md` |
| 20 | Biblioteca de recursos | **Módulo independiente**, no una parte del planificador | Palabras del usuario: *"es otro módulo aparte que no tiene que ver con lo de la planificación"*. Navegación propia, tabla propia, no aparece en Hoy ni en el inbox de tareas |
| 21 | Backlog de Notion y WhatsApp | **Migración manual** en la primera revisión dominical | ~20 min una sola vez. No se construye importador |
| 22 | Si se salta la revisión dominical | La semana **se arma sola con las tareas fijas** (clases) más lo que quedó pendiente, y se avisa el lunes | Nunca una semana vacía. Nunca un reproche |
| 23 | iOS 16.4+ | **Asumido**, pendiente de verificar | Si resulta menor, plan B: bot de Telegram como canal de entrega |
| 24 | Revisión dominical ofrece pendientes | **Sí, 1–2 tareas anotadas sin planificar**, nunca la lista entera | Es el problema original: cosas anotadas que jamás se convierten en plan. Una lista larga el domingo se cierra sin leer |
| 25 | Horas de notificación | **Editables dentro de la app**, no hardcodeadas | Cierra la decisión #15 |
| 26 | Recordatorio por bloque | Opcional y por bloque, incluidas las clases si el usuario lo activa | Por defecto las clases no notifican, pero puede activarlas una a una |
| 27 | Horizonte de planificación | **Multi-semana.** Se puede planificar con fecha tope a 2+ semanas | La semana actual deja de ser el límite del sistema |
| 28 | Categoría de tarea | Tarea de un día vs tarea larga (varias sesiones) | Determina con cuánta anticipación avisa y si necesita varios bloques |
| 29 | Hábitos | Sin sistema de hábitos. Gym y similares se cargan como **plantilla fija opcional** | El usuario elige si los anota; no hay racha por hábito |
| 30 | Navegación | 4 módulos: **`Hoy · Semana · Tareas · Recursos`** | "Tareas" (no "Pendientes") son las anotadas sin planificar; "Recursos" es el módulo aparte |
| 31 | Categorías de tarea | **No existen.** El usuario pone la fecha tope donde crea conveniente | Palabras del usuario: *"que sea a criterio del usuario, que el sistema no se meta con eso"*. No se infiere duración ni se pide categoría |
| 32 | Horizonte multi-semana | Dentro del módulo **Semana**, navegar hacia semanas futuras | Sin vista mensual: ilegible en teléfono |
| 33 | Modelo de notificaciones | **Una notificación diaria con las tareas del día.** No una por tarea | Única excepción: tareas con `advance_notice_days`, que el usuario activa a mano |
| 34 | Nombre del módulo principal | **`Inicio`** (no "Hoy") | 4 módulos: `Inicio · Semana · Tareas · Recursos` |
| 35 | Contenido de Inicio | Tareas **no fijas** del día (las clases no ocupan espacio) + tareas de semanas futuras en curso | Las clases viven en Semana; Inicio es para lo que decides hacer |
| 36 | Organización de Tareas | El usuario puede crear **carpetas** y personalizar el módulo | No es una lista plana |
| 37 | Orquestación | Vía **Orca**, desde la sesión de lógica, sin trabajo manual del usuario | Ver `docs/07-metodologia.md` |
| 38 | Agentes ejecutores | **Antigravity (`agy`) hace el grueso**, Claude Opus solo lo crítico, Sonnet lo sensible, Haiku lo mecánico | Antigravity SÍ es orquestable: el binario es `agy`, no `antigravity`. Orca lo detecta y lo lanza |
| 39 | Capa de orquestación | **`orca orchestration`** (Run / Task / Dispatch), no terminales sueltas | Registra propiedad del trabajo, intento autoritativo y cierre formal con `worker_done` |
| 40 | Profundidad de workers | **1** — los workers no lanzan workers | Árbol plano: un coordinador, N ejecutores |
| 41 | Contenido de Inicio | Tareas no fijas del día · lo que quedó de ayer (triage 1 toque) · banda de entregas próximas · racha | **Sin** campo de captura: ya se captura por Siri. Debe caber en una pantalla sin scroll |
| 42 | Estructura del repo | **Un solo repo** con `docs/` (decisiones), `briefs/` (encargos) y `app/` (código) | Duplicar contexto en carpetas hermanas garantiza divergencia — y repetiría el problema de fragmentación que la app existe para resolver. La separación la da la propiedad de cada carpeta |
| 43 | Control de versiones | **Git + worktrees de Orca** | Con agentes escribiendo código, sin historial no hay diffs revisables ni rollback. Los worktrees permiten workers en paralelo sin pisarse |
| 44 | Archivo de contexto de Antigravity | **`AGENTS.md`** (no `AGENT.md`), con skills en `.agents/` | Verificado en el binario `agy`: lee `AGENTS.md` y `GEMINI.md`, **no** `CLAUDE.md` |
