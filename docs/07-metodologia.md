# Metodología de trabajo: orquestación con Orca

Acordada el 2026-09-12. Este archivo define **cómo se trabaja**, no qué se
construye.

## Roles

### Sesión de lógica (esta) — Coordinador

`organizer_logica` actúa como **project manager y arquitecto**:

1. Toma las decisiones de lógica, arquitectura y tecnología.
2. Descompone el trabajo en Tasks delegables.
3. Elige qué agente y qué modelo ejecuta cada Task según importancia y costo.
4. Lanza los workers y les manda el encargo.
5. **Revisa el informe de cada Task, lo valida y lo confirma** antes de delegar
   el siguiente.
6. Mantiene `docs/` como fuente de verdad del proyecto.

No escribe código de producción salvo que resulte más barato que delegarlo.

### Workers — Sesiones ejecutoras

Reciben un Task acotado, lo ejecutan y devuelven un informe formal
(`worker_done`). No toman decisiones de arquitectura: si algo bloquea, usan el
canal de pregunta bloqueante (`ask`) contra el coordinador, citando el número de
decisión de `docs/01-decisiones.md`.

**Profundidad anidada = 1** (configurado en Orca): los workers **no** pueden
lanzar sus propios workers. El árbol queda plano — un coordinador, N ejecutores.

## Hechos verificados del entorno (2026-09-12)

| Elemento | Estado |
|---|---|
| Runtime de Orca | `ready`, alcanzable, app corriendo |
| Repo `Organizer` en Orca | Registrado — `6702cc76-b374-4eb9-9204-3cfdf17c0665` |
| Worktree actual | El repo mismo, gestionado por Orca |
| Cuenta Claude en Orca | `saap1219@gmail.com` (activa) |
| CLI `claude` | ✔ `~/.local/bin/claude` |
| CLI `agy` (Antigravity) | ✔ `%LOCALAPPDATA%\agy\bin\agy.exe` v1.2.1 |
| Agentes detectados por Orca | **2: Claude y Antigravity**, ambos activados, ambos con la skill de orquestación |
| Cuenta Codex | Ninguna. Opcional, no bloquea nada |
| El repo es git | ✔ Sí, desde el 2026-09-12, rama `main`. Habilita worktrees de Orca |

### Antigravity SÍ es orquestable

Corrige un error de análisis previo. El binario no se llama `antigravity` sino
**`agy`**, y no está en el `PATH` de la shell, pero Orca lo detecta y lo lanza.
Es un CLI de agente completo: soporta `--print` (no interactivo), `--model`,
`--effort`, `--agent` y `--output-format json`.

Orca lo tiene configurado como `agy --dangerously-skip-permissions`.

## Cómo orquesta el coordinador

Orca tiene una **capa de orquestación estructurada** — no basta con abrir
terminales y leerlas. Registra quién es dueño de qué trabajo, qué intento es el
autoritativo y cuándo el trabajo supervisado quedó resuelto.

Conceptos:

- **Run** — espacio durable y bandeja de entrada del coordinador.
- **Task** — una unidad de trabajo.
- **Dispatch** — un intento autoritativo de un Task.

### El bucle supervisado

```bash
# 1. Confirmar runtime y abrir el Run (una vez por fase)
orca status --json
orca orchestration run-create --objective "Organizer F1: captura y módulo Tareas" --json

# 2. Lanzar la ola completa de trabajo independiente ANTES de esperar
orca orchestration worker-start --spec "<encargo del worker A>" \
  --worktree current --agent claude --model sonnet --json
orca orchestration worker-start --spec "<encargo del worker B>" \
  --worktree current --agent antigravity --json

# 3. Esperar de forma bloqueante a que lleguen resultados o preguntas
orca orchestration check --wait \
  --types "worker_done,escalation,question" --timeout-ms 900000 --json

# 4. Procesar cada mensaje antes de confirmarlo
orca orchestration reply --id <message_id> --body "<respuesta>" --json
orca orchestration worker-release --dispatch <dispatch_id> --json
orca orchestration check --ack <delivery_id> --wait --types "worker_done,escalation,question" --json
```

Para fan-out con dependencias reales: `orca orchestration task-create` y luego
`worker-start --task <task_id> --deps <json_array>`. Se prefieren olas
paralelas antes que cadenas de más de tres o cuatro pasos.

### Reglas duras del protocolo

- **Un timeout o un resultado vacío es un checkpoint, no un fallo.** No parar,
  no reintentar, no liberar ni relanzar sin prueba positiva.
- Tras tres esperas vacías seguidas: `orca orchestration worker-list
  --include-remote --json` y actuar según `projection.nextAction`.
- Ausencia de señal **nunca** autoriza `worker-stop`, `worker-abandon` ni
  `worker-release`. Solo prueba positiva de salida.
- Si `worker-start` falla, **no relanzar**: leer `failedStage` y
  `residualResources`, y cargar `references/recovery-and-cleanup.md`.
- Cada `worker_done` llega con `--outcome succeeded` o `--outcome failed`
  explícito, más un resumen de tres frases. El fallo nunca va solo en prosa.

**El usuario no abre terminales.** Los workers aparecen como pestañas en Orca y
puede mirarlos cuando quiera, pero no tiene que tocarlos.

## Asignación de agentes por costo

Objetivo del usuario: **gastar pocos tokens de Opus**, cargando el grueso del
trabajo en Antigravity.

| Nivel | Agente | Para qué |
|---|---|---|
| **Crítico** | `claude --model opus` | Push en iOS (F3), revisión de seguridad, decisiones de arquitectura que surjan. **Pocos Tasks** |
| **Grueso** | `agy` (Antigravity) | Pantallas, CRUD, endpoints, componentes, estilos. **El caballo de batalla** |
| **Medio** | `claude --model sonnet` | Tasks que tocan el esquema o la lógica de notificaciones, donde un error cuesta caro |
| **Mecánico** | `claude --model haiku` | Renombrar, mover archivos, generar tipos, formatear |

Regla de reparto: **Antigravity ejecuta, Claude decide y verifica.** Como todas
las decisiones ya están cerradas en `docs/01-decisiones.md`, la mayor parte del
trabajo restante es ejecución de un plan fijo — justo lo que no necesita Opus.

El coordinador (Opus) revisa **todos** los informes, sin importar qué agente los
produjo. Ahí es donde la calidad se mantiene sin gastar Opus en escribir código.

### Codex, opcional

Si se quiere un tercer proveedor:

```bash
npm install -g @openai/codex
orca account add --agent codex
```

No bloquea nada; hoy no está instalado.

## Contrato de cada Task delegado

El `--spec` que se manda a un worker incluye siempre:

1. **Contexto obligatorio**: leer `CLAUDE.md` y `docs/00-problema.md` antes de
   escribir código.
2. **Alcance cerrado**: qué construir y qué **no** tocar.
3. **Criterio de terminado**: la condición verificable de la fase en
   `docs/04-plan-fases.md`.
4. **Prohibiciones**: no reabrir `docs/01-decisiones.md`; no modificar
   `docs/schema.sql` sin preguntar al coordinador por el canal `ask`.
5. **Entregable**: escribir `docs/estado-F<n>.md` con qué quedó hecho, qué quedó
   fuera y qué encontró que cambie el plan, y pasar su ruta en `--report-path`.

## Ciclo de validación

```
coordinador lanza ola ─► workers ejecutan ─► worker_done + docs/estado-F<n>.md
                                                      │
                                                      ▼
                                   coordinador lee, verifica y decide
                                          │                   │
                                    ✔ validado          ✘ rechazado
                                          │                   │
                              worker-release +          se devuelve con
                              siguiente ola             correcciones
```

**Regla:** no se libera un worker ni se lanza la ola siguiente hasta validar la
anterior. Las fases marcadas como paralelizables en `docs/04-plan-fases.md` sí
corren a la vez, pero cada una se valida por separado.

## Lo que el usuario tiene que hacer a mano

Poco, y nada de ello es abrir terminales:

1. **Crear las cuentas externas**: proyecto en Supabase y proyecto en Vercel.
   Son registros con OAuth; un agente no puede hacerlo por él.
2. **Pegar las claves** como variables de entorno (lista en
   `docs/02-arquitectura.md`).
3. **Configurar los Atajos en el iPhone** con la pantalla de instrucciones que
   genera F1.
4. **Instalar la PWA** en la pantalla de inicio y aceptar notificaciones.
5. **Validar el resultado** cuando el coordinador le muestre algo.

---

## Trampas verificadas al lanzar workers

Descubiertas al lanzar FD el 2026-09-12. **Ocurren con cada worker nuevo.**

### 1. El diálogo de bypass se come el primer encargo

Orca lanza `claude --dangerously-skip-permissions`. La primera vez que Claude
Code corre así en un proyecto, muestra un diálogo de confirmación:

```
WARNING: Claude Code running in Bypass Permissions mode
❯ No, exit
  Yes, I accept
```

**El prompt del dispatch se escribe en ese diálogo y se pierde.** El worker
queda vivo, en el prompt, sin trabajo. `worker-start` devuelve
`turn_start_unobserved` y `worker-list` reporta `unverifiable / missing_status`.

La guía de recuperación lo reconoce: *"a `live` terminal whose agent died at a
trust prompt still reads `live`"*.

**Diagnóstico:** leer la terminal con `terminal read --screen`. El diálogo se ve.

**Solución:**

```bash
orca terminal send --terminal <handle> --text $'\x1b[B' --json   # bajar a "Yes, I accept"
orca terminal send --terminal <handle> --text "" --enter --json  # confirmar
```

Después, el Task original queda `blocked` y **no es recuperable**: `dispatch
--inject` devuelve `task_not_startable` y `--retry-of` devuelve
`task_not_startable ... cannot retry`. La secuencia que sí funciona:

```bash
orca orchestration worker-abandon --dispatch <dispatch_viejo> --json
orca orchestration worker-start --task-title "..." --spec "..." \
  --terminal <handle> --worktree current --json
```

`worker-abandon` marca el intento como no autoritativo **sin tocar el proceso**,
así que la terminal ya inicializada se reutiliza. No uses `worker-stop`: mataría
un agente que está sano.

### 2. Los hooks de estado de Antigravity no están instalados

```
orca agent hooks status
  claude: installed        codex: installed
  antigravity: not_installed
```

Sin ese hook, un worker de Antigravity siempre leerá `missing_status` y no habrá
forma de saber si avanza. **Hay que resolverlo antes de F1**, que es la primera
fase asignada a Antigravity.

### 3. Pasar el spec por archivo, no inline

Un `--spec` largo inline es frágil en la shell. Escribirlo a un archivo y
pasarlo con `--spec "$(cat archivo)"` evita problemas de comillas y acentos.
