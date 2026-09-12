# Organizer — PWA de planificación personal

> **Sesión de lógica.** Este archivo es el punto de entrada. Si eres una sesión nueva,
> lee `docs/00-problema.md` antes de proponer nada. El diagnóstico no es obvio.

## Estado del proyecto

| Campo | Valor |
|---|---|
| Fase actual | Planificación — plan sin aprobar, sin código escrito |
| Código existente | Ninguno (solo `reicon-demo.html`, no relacionado) |
| Fecha de este snapshot | 2026-09-12 |
| Deadline duro | Semestre empieza **2026-09-15** (3 días) |
| Dueño | Sebastián (`saap1219@gmail.com`), usuario único |

## Índice de documentos

| Archivo | Qué contiene |
|---|---|
| `docs/00-problema.md` | El problema real y el diagnóstico. **Léelo primero.** |
| `docs/01-decisiones.md` | Las 46 decisiones ya cerradas con el usuario. No las re-preguntes. |
| `docs/02-arquitectura.md` | Stack, Web Push en iOS, captura por Atajo de Siri |
| `docs/03-modelo-datos.md` | Entidades y por qué están así |
| `docs/schema.sql` | DDL listo para Supabase |
| `docs/04-plan-fases.md` | Fases F0–F6, dependencias y delegación a agentes |
| `docs/05-preguntas-abiertas.md` | Lo que todavía falta decidir |
| `docs/06-recursos.md` | Módulo Recursos: skills, herramientas y artículos |
| `docs/07-metodologia.md` | **Cómo se trabaja**: orquestación con Orca, roles, validación |

## Estructura del repositorio

```
Organizer/
├── CLAUDE.md      ← este archivo · sesiones Claude Code
├── AGENTS.md      ← mismo contexto para Antigravity (`agy`)
├── docs/          ← DECISIONES · solo el coordinador escribe
├── briefs/        ← encargo de cada fase · solo el coordinador escribe
└── app/           ← EL CÓDIGO · los workers escriben, el coordinador revisa
```

| Carpeta | Coordinador | Workers |
|---|---|---|
| `docs/` | escribe | leen · solo escriben `estado-F<n>.md` |
| `briefs/` | escribe | solo leen |
| `app/` | revisa | escriben |
| `docs/schema.sql` | escribe | **no tocan sin preguntar** |

## Reglas del proyecto

1. **Push, no pull.** El usuario no abre apps por iniciativa propia — ese es
   literalmente su patrón de fracaso. Toda feature que dependa de que él
   "se acuerde de entrar" está muerta al nacer.
2. **La notificación lleva el contenido dentro.** Nunca "tienes 3 pendientes,
   abre la app". Siempre "Hoy: Cálculo 8am, Supabase 11am, Gym 6pm".
3. **Capturar cuesta 0 fricción.** Sin campos obligatorios, sin categoría,
   sin fecha. Se clasifica después o nunca.
4. **iOS primero.** iPhone instalado en pantalla de inicio es el único
   entorno que importa. Escritorio es secundario (solo para planificar).
5. **Nada se pierde en silencio.** Si una tarea no se cumple, la app pregunta
   qué hacer — no la arrastra sola ni la borra.

## Convenciones técnicas

- Next.js (App Router) + TypeScript + Tailwind, desplegado en Vercel
- Supabase: Postgres + Auth (magic link) + Edge Functions + `pg_cron`
- Todas las tablas con RLS por `auth.uid()`
- Timestamps en `timestamptz` (UTC); la zona del usuario vive en `profiles.timezone`
- Nombres de tablas y columnas en inglés; UI y copys en español

## Idioma

El usuario escribe en español. Responde en español. El código y los
identificadores van en inglés.
