# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalada en la pantalla de inicio del iPhone (iOS primero). Escritorio es
secundario, pero se usa para tres cosas: planificar la semana, clasificar
pendientes y trabajar con Recursos.

## Users

Un único usuario: Sebastián, estudiante universitario con TDAH declarado, que
además sostiene proyectos personales y cursos. Lo abre desde el iPhone al tocar
una notificación, casi siempre de pie o caminando, y desde escritorio en la
sesión de planificación del domingo o mientras estudia/programa.

Con TDAH: las listas largas son invisibles, la estimación de tiempo no es
fiable, romper una racha lleva a abandonar, y empezar cuesta más que ejecutar.

## Product Purpose

Devolverle la información que ya capturó sin que tenga que acordarse de ir a
buscarla. El problema no es capturar (WhatsApp y Notion ya lo hacen), es
**releer**. La notificación es el producto; la app es donde cae al tocarla.

Éxito a 30 días (docs/00-problema.md): al menos una captura diaria fuera de
WhatsApp/Notion, revisión semanal 3 de 4 domingos, y saber qué hacer hoy solo
con la notificación.

## Positioning

Relaciona reminders (parcial, entrega) con las tareas que los preparan, y
responde "¿me estoy preparando o solo lo sé?". Un único destino que absorbe
tareas, fechas, horario y recursos (skills, herramientas, artículos).

## Operating Context

- Entrada principal: notificación push con el contenido dentro → Inicio.
- Captura: Atajo de Siri que hace POST a la app; sin campos obligatorios.
- Revisión semanal el domingo, en escritorio o móvil.
- Recursos: se guardan desde Safari/Atajo o el botón Nuevo; se consultan
  mientras estudia o programa.

## Capabilities and Constraints

- Tres entidades: **Materia** (horario fijo, no se completa), **Reminder**
  (fecha que pasa, no se completa), **Tarea** (se completa con check).
- Recursos: tool, skill, article, repo, video, other; notas, etiquetas,
  contador de aperturas, puente "Planificar" que crea una tarea.
- Stack: Next.js App Router + Tailwind en Vercel; Supabase (Postgres, Auth
  magic link, Edge Functions, pg_cron). UI y copys en español.

## Brand Commitments

- El sistema visual FD4 (`app/DESIGN.md`, `web/src/styles/tokens.css`) está
  aprobado y se mantiene: color por entidad (tarea azul marino, materia verde,
  reminder ámbar), "el color envuelve al texto, nunca lo pinta", sin rojo,
  IBM Plex Sans, iconos Reicon Outline, sin emoji como icono, 44px táctiles.
- Tono: directo, en español, sin culpa ni celebración ("Quitar no borra").

## Evidence on Hand

- Comps aprobados en `app/comps/`.
- 78 decisiones cerradas en `docs/01-decisiones.md`.
- No hay datos de uso reales documentados; no inventar métricas.

## Product Principles

1. Push, no pull: nada depende de que el usuario se acuerde de entrar.
2. Abrir la app baja la ansiedad; la primera sensación nunca es "cuánto debo".
3. Capturar cuesta cero fricción; se clasifica después o nunca.
4. Nada se pierde en silencio: lo incumplido pregunta qué hacer.
5. Un reminder pasado no es deuda.

## Accessibility & Inclusion

Diseño para TDAH: poco a la vez, primera acción obvia. Contraste AA medido por
token; la forma distingue entidades sin depender del color; 44×44 táctil
mínimo; respeta prefers-reduced-motion.
