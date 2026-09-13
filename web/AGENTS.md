<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Organizer · contexto del proyecto

Lo de arriba lo escribe `next dev` solo y habla de Next.js. **El contexto del
proyecto está un nivel más arriba** y hay que leerlo antes de tocar nada:

| Archivo | Qué es |
|---|---|
| `../CLAUDE.md` · `../AGENTS.md` | El punto de entrada |
| `../docs/00-problema.md` | El diagnóstico. **Léelo primero**, no es obvio |
| `../docs/01-decisiones.md` | 73 decisiones cerradas con el usuario. No se reabren |
| `../docs/08-modelo-tareas-reminders.md` | Materias, reminders y tareas |
| `../app/DESIGN.md` | El sistema visual, ya aprobado. `app/` es de solo lectura |
| `./README.md` | Cómo está montada esta carpeta |

Reglas cortas: textos en español, código en inglés; 44px de área táctil sin
excepción; `--rem` nunca como color de texto; la clave `service_role` nunca
llega al navegador.
