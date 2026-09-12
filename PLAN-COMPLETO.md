# Organizer — Plan completo

> **Léelo y dime si lo apruebas.** Nada se ejecuta hasta que digas que sí.
> Fecha: 2026-09-12 · 41 decisiones cerradas en 4 rondas de entrevista.
> El detalle de cada punto está en `docs/`; aquí está el plan entero de corrido.

---

# 1. Qué estamos construyendo

Una PWA personal que te dice qué tienes que hacer, **sin que tengas que
acordarte de entrar a mirarla**.

## El problema real

Dijiste que se te olvidan las cosas que anotas. Pero al preguntarte qué usas
hoy, respondiste algo que cambió el proyecto entero:

> *"Cuando me acuerdo de cosas las anoto, en Notion, en mi mismo chat de
> WhatsApp, y cuando estoy en el día no me meto ahí, solo cuando voy a anotar
> algo nuevo."*

| | Estado |
|---|---|
| Capturar | ✅ Ya funciona. WhatsApp contigo mismo es instantáneo |
| Volver a leer | ❌ Roto. Nunca vuelves |

**El cuello de botella es recuperar, no guardar.** Otra app donde anotar sería
el tercer vertedero después de Notion y WhatsApp.

## La consecuencia

**La notificación no es una feature. Es el producto.**

1. **Push, no pull.** El sistema va hacia ti. Cualquier flujo que empiece con
   "el usuario abre la app" se asume que no ocurre.
2. **La notificación lleva el contenido dentro.** Nunca "tienes 3 pendientes".
   Siempre *"Hoy: Cálculo 8:00 · Informe 11:00 · Gym 18:00"*, legible desde la
   pantalla de bloqueo.
3. **Un solo destino.** Si no absorbe Notion y WhatsApp, es el cuarto fragmento.

---

# 2. La app

Cuatro módulos. Los dos primeros son el planificador; `Recursos` es un módulo
hermano que no se mete con la planificación.

```
┌─────────┬─────────┬─────────┬───────────┐
│  Inicio │ Semana  │ Tareas  │ Recursos  │
└─────────┴─────────┴─────────┴───────────┘
```

### Inicio

Abre aquí. **Cabe en una pantalla, sin scroll.**

```
┌──────────────────────────────┐
│ Entrega Redes — en 3 días    │ ← solo si hay algo cerca
├──────────────────────────────┤
│ Ayer quedó: Setup Supabase   │ ← hoy / otro día / borrar
├──────────────────────────────┤
│ □ Terminar informe           │
│ □ Curso Anthropic módulo 2   │ ← tus tareas, sin clases
│ □ Gym                        │
├──────────────────────────────┤
│ 🔥 12 días seguidos          │
└──────────────────────────────┘
```

Las clases no ocupan espacio aquí: viven en `Semana`.

### Semana

Calendario con bloques horarios. Tu horario de clases se carga **una vez** como
plantilla y se rellena solo cada semana. Flechas para ver semanas futuras, así
puedes planificar algo con fecha tope a dos semanas.

Botón **"se me corrió el día"**: empuja todos los bloques pendientes de una vez.
Re-agendar arrastrando, sin formularios.

### Tareas

Lo que anotaste y todavía no planificaste. Organizable en **carpetas**, como
quieras personalizarlo. De aquí sale la sugerencia del domingo.

### Recursos

Skills, herramientas, artículos. **Módulo aparte**, no toca la planificación.
Abre con el cursor en el buscador, no con una lista. Guardas desde Safari con
Compartir → Organizer, dos toques.

---

# 3. El ciclo de uso

1. Se te ocurre algo → **"Oye Siri, anota X"** → cae en el inbox. 3 segundos.
2. Ves un artículo → **Compartir → Organizer**. Sin salir de Safari.
3. Cada mañana llega **una** notificación con tu día escrito dentro.
4. En la noche, otra: qué cumpliste.
5. El domingo, el ritual guiado. **Si lo saltas**, la semana se arma sola con
   tus clases y lo pendiente, y te avisa el lunes. Nunca una semana vacía.

## Lo que la app NO hace

Tan importante como lo que hace:

- **No te categoriza las tareas.** Pones la fecha tope donde quieras.
- **No manda una notificación por tarea.** Una al día. La excepción son las
  tareas donde tú actives aviso anticipado.
- **Las clases no suenan.** ~20 alertas semanales convierten todo en ruido.
- **Recursos no te persigue.** Espera callada.
- **No hay sistema de hábitos.** Gym va como bloque fijo si tú quieres.
- **Nunca te regaña.** Si fallas, pregunta qué hacer; no acumula deuda sola.

---

# 4. Stack y restricciones

| Capa | Elección |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Hosting | Vercel — HTTPS gratis, requisito de Web Push |
| Datos | Supabase Postgres con RLS |
| Auth | Magic link (un solo usuario, sin registro) |
| Notificaciones | Web Push con VAPID, disparadas por `pg_cron` |
| Zona horaria | `America/Caracas` (UTC−4, **sin** horario de verano) |
| Costo | **$0/mes** en los planes gratuitos |

## Las tres restricciones de iOS que mandan sobre todo

1. **No existe API para programar notificaciones locales.** Todas salen del
   servidor. No es una preferencia de arquitectura, es la plataforma.
2. **Solo llega push a una PWA instalada en la pantalla de inicio** (iOS 16.4+).
   En una pestaña de Safari no llega nada.
3. **Una PWA no tiene widget ni Siri propios.** Por eso la captura rápida va por
   Atajos de iOS contra un endpoint, no por la app.

---

# 5. Fases

```
F0 Fundaciones ──┬─► F1 Captura ───┐
                 ├─► F2 Inicio/Semana ├─► F4 Ritual ──► F5 Pulido
                 ├─► F3 Push ────────┘
                 └─► F6 Recursos (independiente)
```

| Fase | Qué entrega | Agente | Tiempo |
|---|---|---|---|
| **FD** | **Diseño visual**: comps de los 4 módulos y tokens | Claude Opus + `/design` | 2–3 h |
| **F0** | Repo, Supabase, deploy en verde | Claude Sonnet | 1–2 h |
| **F1** | Captura por Siri, inbox, módulo Tareas | Antigravity | 3–4 h |
| **F2** | Inicio y Semana, plantilla de clases | Antigravity | 6–10 h |
| **F3** | Notificaciones push en iOS | **Claude Opus** | 4–6 h |
| **F4** | Ritual del domingo, racha con perdón | Antigravity | 3–4 h |
| **F5** | Offline, accesibilidad, estados vacíos | Antigravity | abierto |
| **F6** | Módulo Recursos con búsqueda | Antigravity | 3–4 h |

**FD va primero.** Un diseño aprobado antes de programar hace que Antigravity
gaste una fracción de lo que gastaría inventando la interfaz sobre la marcha.

**F3 es el riesgo más alto del proyecto.** Si iOS no entrega push, la app no
resuelve tu problema. Por eso la ejecuta Opus y se valida cuanto antes.

## El orden respeta tu deadline

El semestre empezó el 2026-09-15. Dijiste que eso **no debe recortar la
calidad**. No recorto alcance: recorto el orden. **F0 + F1 + F3** te dan captura
por Siri y la notificación diaria — que es exactamente el problema original. El
resto se construye encima sin rehacer nada.

---

# 6. Cómo se trabaja

## Roles

- **Esta sesión (Opus)** es el coordinador: decide, descompone, delega, **revisa
  cada informe y lo valida** antes de delegar el siguiente.
- **Los workers** ejecutan un encargo cerrado y devuelven un informe formal.
  No toman decisiones de arquitectura; si algo bloquea, preguntan.

Profundidad anidada = 1: los workers no lanzan workers. Árbol plano.

## Reparto por costo

| Agente | Carga |
|---|---|
| **Antigravity (`agy`)** | El grueso: pantallas, CRUD, endpoints |
| **Claude Sonnet** | Lo sensible: esquema, lógica de notificaciones |
| **Claude Opus** | Solo FD y F3, más las revisiones. Poquísimos Tasks |
| **Haiku** | Renombrar, generar tipos, mover archivos |

**Antigravity ejecuta, Claude decide y verifica.** Como las 41 decisiones ya
están cerradas, casi todo lo que queda es ejecución de un plan fijo — justo lo
que no necesita Opus.

## Ciclo de validación

```
coordinador delega ─► worker ejecuta ─► informe en docs/estado-F<n>.md
                                              │
                                coordinador lee, verifica y decide
                                     │                  │
                               ✔ validado         ✘ rechazado
                                     │                  │
                            siguiente ola      vuelve con correcciones
```

No se lanza la ola siguiente sin validar la anterior.

---

# 7. Lo que tienes que hacer tú

**No tienes que abrir terminales.** Los workers aparecen como pestañas en Orca;
puedes mirarlos, pero no tocarlos.

| # | Tarea | Cuándo |
|---|---|---|
| 1 | Crear proyecto en **Supabase** y pasarme las 3 claves | Antes de F0 |
| 2 | Crear proyecto en **Vercel** | Antes de F0 |
| 3 | **Verificar tu versión de iOS** (Ajustes → General → Información) | Antes de F3 |
| 4 | Configurar los **Atajos en el iPhone** | Después de F1 |
| 5 | **Instalar la PWA** en pantalla de inicio y aceptar notificaciones | Después de F3 |
| 6 | **Validar** lo que te muestre | Continuo |

---

# 8. Riesgos aceptados

| Riesgo | Mitigación |
|---|---|
| **Push en iOS no funciona** | Lo valida Opus temprano. Plan B: bot de Telegram |
| **Calendario rígido + ADHD** | Botón "se me corrió el día" + arrastrar. El esquema permite degradar a lista por día sin migración |
| **Las notificaciones se vuelven ruido** | Si ignoras 3 días seguidos, la app cambia el tono y te ofrece mover la hora |
| **Recursos se vuelve un vertedero** | Filtro "guardados y nunca abiertos" con el número visible |
| **Nunca haces el ritual del domingo** | La semana se arma sola con tus clases y te avisa el lunes |

---

# 9. Qué estás aprobando

Al decir que sí, apruebas:

1. El **diagnóstico**: el problema es recuperar, no capturar.
2. Los **4 módulos** y lo que cada uno hace y no hace.
3. El **stack**: Next.js + Vercel + Supabase, con push desde servidor.
4. El **orden de fases**, con diseño primero y push por Opus.
5. El **reparto de agentes**: Antigravity el grueso, Opus lo crítico.
6. Que yo **coordine y valide** cada entrega antes de seguir.

**Lo primero que ocurre si apruebas:** escribo `docs/08-brief-diseno.md` y lanzo
la sesión de diseño, mientras tú creas las cuentas de Supabase y Vercel.

---

## Detalle por documento

| Archivo | Contenido |
|---|---|
| `docs/00-problema.md` | El diagnóstico completo |
| `docs/01-decisiones.md` | Las 41 decisiones con su razón |
| `docs/02-arquitectura.md` | Web Push en iOS, Atajos, cron |
| `docs/03-modelo-datos.md` + `schema.sql` | Esquema y por qué |
| `docs/04-plan-fases.md` | Cada fase en detalle |
| `docs/05-preguntas-abiertas.md` | Lo que quedó sin cerrar |
| `docs/06-recursos.md` | El módulo Recursos |
| `docs/07-metodologia.md` | Orquestación con Orca |
