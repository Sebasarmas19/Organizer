# Organizer — contexto para agentes ejecutores

> Este archivo lo leen Antigravity (`agy`) y cualquier agente que soporte
> `AGENTS.md`. Las sesiones de Claude Code leen `CLAUDE.md`, que dice lo mismo.

## Qué es este proyecto

Una PWA personal de planificación para **iPhone**. Su dueño es Sebastián,
usuario único. Empezó su semestre el 2026-09-15 y necesita cumplir con clases,
proyectos personales y cursos.

**Antes de escribir una línea de código, lee `docs/00-problema.md`.** El
diagnóstico no es obvio y determina decisiones que de otro modo parecen
arbitrarias.

Resumen del diagnóstico: el usuario **ya captura bien** (Notion, WhatsApp
consigo mismo). Lo que nunca hace es **volver a leer**. El cuello de botella es
recuperar, no guardar. Por eso la notificación es el producto, no una feature.

## Estructura del repositorio

```
Organizer/
├── CLAUDE.md      ← contexto para Claude Code
├── AGENTS.md      ← este archivo
├── docs/          ← DECISIONES. Solo lectura para ti
├── briefs/        ← tu encargo. Solo lectura para ti
└── app/           ← EL CÓDIGO. Aquí escribes
```

### Reglas de propiedad — importantes

| Carpeta | Puedes |
|---|---|
| `docs/` | **Leer.** Escribir solo tu informe `docs/estado-F<n>.md` |
| `briefs/` | **Solo leer.** Nunca modificar |
| `app/` | **Escribir.** Es tu zona de trabajo |
| `docs/schema.sql` | **No tocar sin preguntar al coordinador.** Otras fases dependen de él |

## Cómo trabajas aquí

Esta es una **sesión supervisada**. Un coordinador (Claude Opus) reparte el
trabajo, revisa cada entrega y decide si sigue. Tú:

1. **Haces solo el Task actual.** Nada de alcance extra por iniciativa propia.
2. **Si algo bloquea, preguntas** por el canal `ask` del preámbulo, citando el
   número de decisión de `docs/01-decisiones.md` que te frena. No decides tú.
3. **No reabres decisiones.** Las 41 de `docs/01-decisiones.md` están cerradas
   con el usuario. Si una parece equivocada, repórtalo — no la cambies.
4. **Al terminar** escribes `docs/estado-F<n>.md` con: qué quedó hecho, qué
   quedó fuera, y qué encontraste que cambie el plan. Envías `worker_done` una
   sola vez, con `--outcome succeeded` o `--outcome failed` explícito.

Un fallo **nunca** va solo en prosa: va en el `--outcome`.

## Reglas del producto

Estas mandan sobre cualquier preferencia técnica o estética:

1. **Push, no pull.** El usuario no abre apps por iniciativa propia — ese es
   literalmente su patrón de fracaso. Toda feature que dependa de que "se
   acuerde de entrar" está muerta al nacer.
2. **La notificación lleva el contenido dentro.** Nunca *"tienes 3 pendientes"*.
   Siempre *"Hoy: Cálculo 8:00 · Informe 11:00 · Gym 18:00"*, legible desde la
   pantalla de bloqueo sin abrir nada.
3. **Capturar cuesta 0 fricción.** Sin campos obligatorios, sin categoría, sin
   fecha. Se clasifica después o nunca.
4. **Inicio cabe en una pantalla, sin scroll.** El usuario tiene ADHD: una lista
   de 12 elementos equivale a una lista vacía.
5. **La app nunca regaña.** Si algo no se cumplió, pregunta qué hacer. No
   acumula deuda sola ni muestra reproches.
6. **Nada se pierde en silencio.**

## Stack

- **Next.js (App Router) + TypeScript + Tailwind**, desplegado en Vercel
- **Supabase**: Postgres con RLS, auth por magic link, Edge Functions, `pg_cron`
- **Web Push con VAPID**, disparado desde el servidor
- Timestamps en `timestamptz` (UTC); la zona del usuario vive en
  `profiles.timezone` y es `America/Caracas` (UTC−4, **sin** horario de verano)
- Tablas y columnas en **inglés**; UI y textos visibles en **español**

## Restricciones de iOS que no se negocian

Son de la plataforma, no preferencias. Ver `docs/02-arquitectura.md`.

1. **No existe API para programar notificaciones locales.** Todas salen del
   servidor vía `pg_cron` → Edge Function. No propongas alternativas locales.
2. **Solo llega push a una PWA instalada en la pantalla de inicio** (iOS 16.4+,
   `display: standalone` en el manifest). En pestaña de Safari no llega nada.
3. **El permiso se pide tras un tap real del usuario.** Pedirlo al cargar la
   página falla en silencio.
4. **Una PWA en iOS no tiene widget ni Siri propios.** La captura rápida va por
   Atajos de iOS contra `POST /api/capture`.

## Los 4 módulos

| Módulo | Qué es |
|---|---|
| `Inicio` | Pantalla de arranque. Tareas del día **sin las clases**, lo que quedó de ayer, banda de entregas próximas, racha |
| `Semana` | Calendario con bloques horarios, navegable a semanas futuras |
| `Tareas` | Lo anotado sin planificar, organizable en carpetas |
| `Recursos` | **Módulo aparte**: skills, herramientas, artículos. No toca la planificación |

## Lo que la app NO hace

Tan vinculante como lo que sí hace:

- No categoriza tareas: el usuario pone la fecha tope donde quiera
- No manda una notificación por tarea — **una al día**, salvo avisos anticipados
  que el usuario activa a mano
- Las clases no notifican
- `Recursos` no persigue al usuario
- No hay sistema de hábitos

## Idioma

El usuario escribe en español; los informes van en español. El código y los
identificadores, en inglés.
