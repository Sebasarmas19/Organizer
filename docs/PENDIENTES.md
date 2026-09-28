# Organizer · Estado y pendientes

> Actualizado al **2026-09-27**, después de la revisión completa.

## 1. Qué funciona

| Módulo | Estado |
|---|---|
| Auth, RLS y captura por Siri (`/api/capture`) | ✅ |
| **Reminders** | ✅ Crear (`/reminders/nuevo`), detalle con progreso (`/reminders/[id]`), añadir pasos con fecha relativa ("3 días antes", "el día antes"), colgar tareas existentes, editar y quitar |
| **Tareas** | ✅ Crear (`/tareas/nueva`) y editar (`/tareas/[id]`): fecha, hora, duración, aviso al teléfono y reminder al que pertenece. Con hora se crea su bloque en el calendario |
| **Calendario** | ✅ Día, semana y mes. Tocar una hora vacía crea una tarea a esa hora. Todo enlaza a su detalle |
| **Horario** (`/horario`) | ✅ Guardar reparte las clases hasta el fin del semestre; volver a guardar ya no duplica. Guarda el aula |
| **Recursos** | ✅ CRUD, búsqueda, captura por compartir |
| **Ajustes** | ✅ Horas de notificación, interruptor "Algo para leer", cerrar sesión |

### Notificaciones (todas en `web/src/lib/push/server/`)

| Cuál | Cuándo |
|---|---|
| Mañana | A tu hora. Trae el día y el recuento de atrasadas |
| Noche y revisión del domingo | A tu hora |
| Reminder sin preparar | 7, 3 y 1 día antes, si no tiene ninguna tarea |
| Minutos antes | Antes de cada clase o tarea con aviso (`blocks.reminder_min`) |
| Algo para leer | Martes y sábado a las 19:00, el recurso que menos se ha propuesto |

Pruebas: `npm run test:push` (70). Verificación completa: `npm run verify`.

## 2. Despliegue (falta, ~20 min)

1. **Vercel**: importar el repo con `web` como Root Directory. Variables: las de
   `web/.env.local.example`, incluidas `CRON_SECRET` y las VAPID.
2. **Supabase**: pegar `supabase/cron.sql` en el SQL Editor, cambiando
   `<APP_URL>` y `<CRON_SECRET>`.
3. **Supabase Auth**: añadir la URL de Vercel en Redirect URLs.
4. **iPhone**: abrir la URL en Safari → Compartir → Añadir a inicio → abrir
   desde el icono → Ajustes → Notificaciones → *Activar notificaciones*.

## 3. Pendiente de producto

1. **F4 · Ritual del domingo**: hoy la notificación semanal lleva a
   `/pendientes`; falta el flujo guiado de 5 minutos.
2. **Materias sin reminders automáticos**: los parciales se crean a mano como
   reminder.
3. `/anadir` como sheet en vez de pantalla completa.

## Reglas técnicas

1. `app/` es de solo lectura; `app/tokens.css` manda sobre `web/src/styles/tokens.css`.
2. `--rem` (ámbar) nunca como color de texto.
3. 44px de área táctil.
4. Antes de fusionar: `npm run verify`.
