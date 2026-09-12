# Estado vivo de la orquestación

> **Para una sesión nueva.** Este archivo dice qué hay corriendo *ahora mismo*.
> Es lo único del proyecto que no se puede reconstruir leyendo el resto de `docs/`.
> Actualízalo cuando lances o cierres un worker, y bórralo cuando no haya ninguno.

Última actualización: 2026-09-12

## Worker activo

| Campo | Valor |
|---|---|
| Ronda | **FD3** — calendario, color por entidad y hoja de añadir |
| Encargo | `briefs/FD3-calendario-color.md` |
| Run | `run_93b5e4d5ebc5` |
| Task | `task_7f8ac28e1142` |
| Dispatch | `ctx_d715c5d7938d` |
| Terminal | `term_d3c8de1f-60ea-4d2d-a3f4-6bb3e0c26e8c` (ya pasó el diálogo de bypass, reutilizable) |
| Informe esperado | `docs/estado-FD3.md` |

### Cómo retomar sin nada de contexto

```bash
orca orchestration worker-list --include-remote --json
orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 590000 --json
```

`worker-list` devuelve el estado real. **Ausencia de señal no autoriza nada**:
ni `worker-stop`, ni `worker-abandon`, ni `worker-release`. Solo prueba positiva
de salida. Un `check` que se agota es un punto de control, no un fallo.

### Avance observado (por archivos en disco)

- ✔ Bloque A · paleta — `tokens.css`, `base.css`, `tw.js`, `tailwind.preset.js`, `icons.js`
- ✔ Bloque B · teléfono — `dia.html`, `semana.html`, `mes.html`, **`anadir.html`** (nuevo)
- ✔ Bloque C · escritorio — `semana-escritorio.html`, **`mes-escritorio.html`** (nuevo)
- ✔ Bloque D · correcciones — `inicio.html`, `inicio-vacio.html`, `tareas.html`
- ✔ Entregables — `DESIGN.md`, `revision.html`, `docs/estado-FD3.md`. **Entregado y verificado.** Pendiente la puerta 2: el usuario.

Creó además `app/_audit.html`, que no estaba en el encargo. Revisar qué es al validar.

## Workers cerrados

| Ronda | Dispatch | Resultado |
|---|---|---|
| FD · diseño inicial | `ctx_e5444b5673cc` | `succeeded`, liberado |
| FD2 · correcciones y tres entidades | `ctx_61c35d758686` | `succeeded`, liberado |

## Lo siguiente, cuando FD3 entregue

1. Puerta 1 — el coordinador verifica contra las 73 decisiones.
2. Publicar los comps y pasarle el enlace al usuario.
3. Puerta 2 — **el usuario valida desde su iPhone. Su puerta manda** (decisión 45).
4. No se lanza nada nuevo hasta que él apruebe.
