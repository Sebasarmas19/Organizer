# Modelo de datos

DDL ejecutable en `docs/schema.sql`. Este archivo explica **por qué** está así.

## Entidades

| Tabla | Qué es |
|---|---|
| `profiles` | Preferencias del usuario: zona horaria, horas de notificación, racha |
| `contexts` | Agrupadores: ramos, proyectos personales, cursos, lecturas |
| `items` | **Todo lo que se captura.** Inbox, ideas y tareas viven aquí |
| `blocks` | El calendario. Un tramo de tiempo con inicio y fin |
| `schedule_templates` | El horario fijo semanal (clases). Se materializa en `blocks` |
| `weekly_reviews` | Registro del ritual dominical |
| `push_subscriptions` | Endpoints de Web Push del dispositivo |
| `notification_log` | Qué se envió, para no duplicar |

## La decisión central: `items` vs `blocks`

Están **separados a propósito**.

- Un `item` es *qué* quieres hacer. Puede no tener fecha nunca.
- Un `block` es *cuándo* lo haces. Vive en el calendario.

Esto da tres cosas gratis:

1. **Una idea puede existir sin fecha.** "Leer Sapiens" es un `item` con
   `status = 'someday'` y cero bloques. No ensucia el calendario.
2. **Una tarea puede ocupar varias sesiones.** "Curso de Anthropic" es un `item`
   con tres `blocks` en días distintos.
3. **Se puede degradar a lista sin migrar.** Si el calendario por horas resulta
   demasiado rígido (riesgo documentado en `01-decisiones.md`), basta con
   ignorar la hora de `blocks` y agrupar por día. Cero cambios de esquema.

Los bloques que vienen de la plantilla de clases (`source = 'template'`) **no
tienen `item_id`** — una clase no es una tarea que se complete, es un hecho del
calendario.

## El ciclo de vida de un `item`

```
        captura (Siri / app)
                │
                ▼
          status='inbox'        ← sin decidir, sin fecha, sin contexto
                │
      ┌─────────┼─────────┐
      ▼         ▼         ▼
  'someday'  'planned'  'dropped'
  biblioteca   tiene      descartado
  de ideas    bloques
      │         │
      │         ▼
      │      'done'
      │
      └──► el domingo la revisión ofrece subirlo a 'planned'
```

**`inbox` es un estado, no una tabla.** Todo entra por el mismo lugar y se
clasifica después. Esto es lo que hace que capturar cueste 0.

## Estados de `blocks`

| Estado | Significado |
|---|---|
| `pending` | Todavía no pasa, o pasó y no se ha revisado |
| `done` | Cumplido |
| `missed` | Se marcó explícitamente como no cumplido |
| `rescheduled` | Se movió a otro momento |

`missed` existe **en vez de borrar**. Sin eso no hay forma de medir la racha ni
de que la revisión del domingo sepa qué preguntarte.

## Racha con perdón

En `profiles`:

- `streak_current`, `streak_best` — el número visible
- `grace_remaining` — comodines disponibles este mes
- `grace_reset_at` — cuándo se recargan

Cuando un día cierra sin cumplir nada: si `grace_remaining > 0`, se descuenta
un comodín y la racha **sobrevive**; si no, vuelve a cero. Decisión #8 de
`01-decisiones.md` — racha estricta + ADHD = abandono al primer fallo.

## De plantilla a calendario

`schedule_templates` guarda `weekday` (0–6) + `start_time` + `end_time` en hora
**local**, no timestamps. Se materializa a `blocks` reales:

- automáticamente al abrir una semana que todavía no tiene bloques de plantilla,
- y en la revisión del domingo para la semana siguiente.

`active_from` / `active_until` acotan la plantilla al semestre, para que no siga
generando clases en las vacaciones.

Materializar es **idempotente**: la clave `(template_id, fecha)` evita duplicar
si se abre la misma semana dos veces.

## Seguridad

- **RLS activo en todas las tablas**, con política `user_id = auth.uid()`.
- Aunque hoy hay un solo usuario, activarlo ahora cuesta minutos y evita una
  migración incómoda si algún día lo comparte.
- El endpoint `/api/capture` no pasa por RLS de usuario (el Atajo no tiene
  sesión): usa el service role y resuelve el `user_id` desde el `CAPTURE_TOKEN`.
