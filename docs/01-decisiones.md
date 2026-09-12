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
| 45 | Validación del diseño | **Doble puerta: coordinador primero, usuario después** | El coordinador verifica que no viole decisiones; el usuario valida la sensación. Ninguna decisión escrita captura "no me gusta y por eso no la abro" |
| 46 | Cómo revisa el usuario los comps | **Publicados como página web**, abiertos desde su iPhone | Son comps de 390px para una app de iPhone: validarlos en el dispositivo real, no en una pantalla de escritorio |

## Reestructuración a tres entidades (2026-09-12, tras ver los comps de FD)

Detalle completo en `docs/08-modelo-tareas-reminders.md`.

| # | Decisión | Valor | Razón |
|---|---|---|---|
| 47 | Tres entidades | **Materias · Reminders · Tareas** | Un parcial no se "hace", ocurre. Meterlo junto a "comprar cuadernos" era un error de modelo |
| 48 | El tipo lo determina la entrada | Siri → tarea · tocar el calendario → reminder · formulario → materia | **El usuario nunca elige el tipo.** Preguntarlo sería la fricción que mató Notion |
| 49 | Reminders sin completado | **No se marcan como hechos.** Pasa la fecha y quedan listos | Elimina un estado y la pregunta "¿lo marqué?". Un reminder vencido no es deuda: baja al histórico sin rojo |
| 50 | Relación tarea → reminder | Opcional, nunca obligatoria | Es donde está el valor: "este parcial es en 6 días y no tiene ninguna tarea planificada" |
| 51 | Tareas sin reminder | **Ciudadanas de primera** | La mayoría de capturas por Siri no tendrán reminder. Su vista nunca debe verse como cajón de sobras |
| 52 | Materias = reservar espacio | Fondo gris, con interruptor para ocultarlas al planificar | No son contenido: son ausencia de tiempo disponible |
| 53 | Vista de mes | **Solo reminders.** Sin tareas ni materias | Responde "¿qué se me viene encima?", que es para lo que usaba el Calendar del iPhone |
| 54 | Carga del horario | Formulario de **una semana** que se replica **mínimo 5 meses** | Ya soportado por `schedule_templates` con `active_from`/`active_until` |
| 55 | Orden de Inicio | **Hoy primero**, luego De ayer, luego Esta semana, luego racha | Lo primero que ves debe ser lo que puedes hacer ahora, no la deuda |
| 56 | Triage de "de ayer" | Hoy → sube a hoy · Otro día → selector · **Quitar → vuelve a Tareas, no se borra** | Sostiene "nada se pierde en silencio" |
| 57 | Reminder en la notificación | El reminder manda: las tareas se recortan para que quepa, nunca al revés | Con 88 caracteres, un parcial mañana es lo más importante del día |
| 58 | Nombres de las vistas | `dia.html` · `semana.html` · `mes.html`, un archivo por vista | El `semana.html` de FD era en realidad la vista Día. Mapear archivo↔vista hace el sistema legible |
| 59 | Semana en el teléfono | **Siete filas, una por día**, con reminders y títulos de tareas. Sin rejilla de horas | La vista Semana no responde "¿qué hago a las 3?" sino "¿cómo reparto el trabajo?", y eso no necesita horas. La rejilla por horas vive en Día y en escritorio |
| 60 | Anticipación del aviso | **1 día por defecto**, editable por reminder | Con 6 días, el mismo parcial encabeza seis notificaciones seguidas y a partir de la tercera es ruido |
| 61 | Reminder preparado no avisa | Si todas sus tareas están hechas, **no encabeza la notificación** | Estar preparado es la señal de que no hace falta avisar. Gratis en código, y es la diferencia entre un aviso útil y una alarma repetida |
| 62 | Reminders fuera del triage dominical | No se posponen ni se quitan. En el paso 2 aparecen **solo de lectura** | Un parcial no se pospone. Con botones "Otro día / Quitar", el domingo volvería a ser una factura |
