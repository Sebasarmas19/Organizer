# Estado vivo de la orquestación

> **Para una sesión nueva.** Este archivo dice qué hay corriendo *ahora mismo*.
> Es lo único del proyecto que no se puede reconstruir leyendo el resto de `docs/`.
> Actualízalo cuando lances o cierres un worker, y bórralo cuando no haya ninguno.

Última actualización: 2026-09-13

## Tres workers activos, en paralelo

Run: `run_93b5e4d5ebc5`

| Fase | Agente | Worktree | Rama | Task | Dispatch |
|---|---|---|---|---|---|
| **F1** captura y Tareas | Antigravity | `.worktrees/f1-captura` | `f1-captura` | `task_4a4dfc25eef6` | `ctx_b9d6eff8c676` |
| **F2** calendario | Antigravity | `.worktrees/f2-calendario` | `f2-calendario` | `task_ba0fb8654ebd` | `ctx_3d4b9811e275` |
| **F3** notificaciones | Claude Opus 5 | `.worktrees/f3-push` | `f3-push` | `task_cab1f68346b5` | `ctx_57dc755c981b` |

Encargos: `briefs/F1-captura-tareas.md`, `briefs/F2-calendario.md`,
`briefs/F3-notificaciones.md`. Informes esperados: `docs/estado-F<n>.md`.

### Cómo están montados

Cada worker corre en su **propio worktree de git dentro de `Organizer/.worktrees/`**,
sobre su propia rama, con `node_modules` y `.env.local` propios. `.worktrees/`
está en `.gitignore`. Fusionar al validar:

```bash
git merge f1-captura      # desde main, una rama por fase
```

**A los dos de Antigravity no se les pasa el encargo por `--spec`:** el diálogo
de confianza de Antigravity se come el primer texto que llega. El encargo vive
en `ENCARGO.md` en la raíz de cada worktree (excluido por `.git/info/exclude`) y
el spec es una línea que lo manda leer.

### Cómo retomar sin nada de contexto

```bash
orca orchestration worker-list --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 590000 --json
```

`worker-list` devuelve el estado real. **Ausencia de señal no autoriza nada**:
ni `worker-stop`, ni `worker-abandon`, ni `worker-release`. Solo prueba positiva
de salida. Un `check` que se agota es un punto de control, no un fallo.

### Regla que los tres tienen escrita

No corren `npm run build` ni `npm run verify`: el usuario tiene `next dev`
encendido y comparten la carpeta `.next/`. Solo `npm run typecheck` y
`npm run lint`.

## Deuda menor

`C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer-wt\` quedó con dos
carpetas vacías bloqueadas por un proceso. Borrable a mano cuando Orca reinicie.

## Workers cerrados

| Ronda | Dispatch | Resultado |
|---|---|---|
| FD · diseño inicial | `ctx_e5444b5673cc` | `succeeded`, liberado |
| FD2 · correcciones y tres entidades | `ctx_61c35d758686` | `succeeded`, liberado |
| FD3 · calendario y color | `ctx_d715c5d7938d` | `succeeded`, validado por el usuario |
| F0 · fundaciones | `ctx_287cd1cdbd69` | `succeeded`, validado |

## Lo siguiente

1. Los tres entregan `docs/estado-F<n>.md` en su rama.
2. Puerta 1 — el coordinador revisa cada informe contra las 78 decisiones.
3. Fusionar rama por rama a `main`, resolviendo choques.
4. Puerta 2 — **el usuario valida desde su iPhone. Su puerta manda** (decisión 45).

### Bloqueos que dependen del usuario

- **Desplegar en Vercel** con `web` como Root Directory. **Bloquea la validación
  de F3**: `localhost` no sirve para push desde el iPhone.
- **Confirmar su versión de iOS.** Menor que 16.4 = no hay Web Push.
