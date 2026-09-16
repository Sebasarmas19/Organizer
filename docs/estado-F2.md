# F2 · Calendario · Informe del worker

> Fase de `briefs/F2-calendario.md` y `ENCARGO.md`. Rige `docs/01-decisiones.md`
> (especialmente 47–73).
> Escrito al terminar la fase, para el coordinador y para el usuario.

---

## 1 · Qué quedó hecho

| Bloque | Estado | Detalle |
|---|---|---|
| **A · Tres vistas del calendario** | Completo | `dia.html`, `semana.html`, `mes.html` portados fielmente con datos reales de Supabase. |
| **Día (`/dia`)** | Completo | Riel de 7:00 a 22:00 (56px/hora) con tareas y materias, banda de reminders superior, tira de 7 días navegable, filtros de capas (Tareas, Reminders, Materias), línea de "ahora". |
| **Semana (`/semana`)** | Completo | Móvil: 7 filas con las tres entidades juntas sin rejilla horaria. Interruptor "Mostrar materias" (encendido por defecto, decisión 69). |
| **Mes (`/mes`)** | Completo | Techo de la navegación: SOLO reminders en puntos ámbar (decisión 53). Dos reminders = dos puntos. Al tocar un día baja a Día. |
| **B · Cabecera unificada** | Completo | `<CalendarHeader>` con la misma geometría en los 3 niveles: botón estilo iOS (`‹ Semana`, `‹ Septiembre`) y en Mes el título ocupa exactamente ese lugar (decisión 67). |
| **C · Hoja de añadir (`/anadir`, `<AddSheet>`)** | Completo | Estado Tarea con la lista de tareas no planificadas ya capturadas (el puente del producto, decisión 71) sin contador ni edad; confirmación en positivo ("Poner 2 en el jueves 17"); estado Reminder con título, fecha, hora opcional, notas y aviso anticipado (1 día por defecto, decisión 60). |
| **D · Carga de horario (`/horario`, `<HorarioView>`)** | Completo | Formulario de una semana que dura todo el semestre (decisión 54). Soporta repetir materia en varios días (L M X J V S D), duplicar, múltiples horarios (teoría vs lab) y materialización idempotente a `blocks`. |
| **E · Escritorio (1280px)** | Completo | `semana-escritorio.html` (3 columnas: nav, barra "Sin planificar" con arrastre + 1 toque, rejilla horaria x 7 días) y `mes-escritorio.html` (celdas con chips de reminders y panel lateral al tocar). |
| **F · Verificación técnica** | Completo | `npm run check:design`, `npm run typecheck` y `npm run lint` en limpio (0 errores, 0 warnings). `build` y `verify` evitados conscientemente. |

---

## 2 · Qué dejé fuera

1. **Módulos asignados a otras fases en paralelo:**
   - `POST /api/capture`, pantalla de Atajo, módulo Tareas y gestión de carpetas / contextos (F1).
   - Notificaciones push, Service Worker, webmanifest y Edge Functions (F3).
   - Ritual semanal dominical y triage guiado (F4).
   - Módulo Recursos (F6).
2. **Archivos protegidos:**
   - `app/` no se tocó (solo lectura).
   - `docs/schema.sql` no se modificó: el esquema ya contiene todo lo necesario para F2 (`schedule_templates`, `blocks`, `reminders`, `items`).
   - Ninguna decisión de `docs/01-decisiones.md` fue alterada ni reabierta.
3. **No se corrió `npm run build` ni `npm run verify`** siguiendo la directriz estricta de no invalidar la carpeta `.next/` compartida con el servidor de desarrollo activo del usuario.

---

## 3 · Qué encontré que cambie el plan (o hallazgos)

1. **Accesibilidad en escritorio cumplida (WCAG 2.2 Dragging Movements):**
   Tal como anticipó `docs/estado-FD3.md` §9.1, el arrastre de tareas en escritorio no puede ser el único camino. En `WeekView.tsx` (escritorio), cada tarea de la columna "Sin planificar" incluye un botón accesible de un toque (`Poner`) que abre un selector directo de día, permitiendo planificar sin arrastrar con ratón ni teclado. El arrastre nativo (`draggable` + `onDrop`) funciona como atajo directo sobre la rejilla.
2. **Materialización de plantillas estrictamente idempotente:**
   La función `materializeScheduleTemplates` en `src/lib/calendar.ts` valida contra los bloques ya existentes en Postgres para ese `template_id` y fecha local en `America/Caracas`, garantizando que jamás colisione con el índice único `blocks_template_per_day` ni genere bloques duplicados.
3. **Select de Supabase sin relaciones foráneas anidadas en TS:**
   Dado que `database.types.ts` tiene `Relationships: []` en `blocks`, postgrest-js no permite `.select('*, item:items(*)')` en el tipado estricto. Dado que la tabla `blocks` tiene denormalizados `title`, `context_id` e `item_id`, el select plano `.select('*')` es más eficiente, directo y 100% tipado.
4. **Estilos de escritorio aislados en `web.css`:**
   En los comps originales, las pantallas de escritorio tenían estilos en etiquetas `<style>` internas. Se trasladaron limpiamente a `web/src/styles/web.css` para que la app responda con la vista móvil en pantallas pequeñas (`< 1024px`) y la vista densa de escritorio en pantallas grandes (`>= 1024px`).

---

## 4 · Qué tiene que hacer el usuario a mano

1. **Iniciar sesión en la app (`/entrar`)**:
   Entrar con Google (o enlace de emergencia) para tener la sesión activa en el navegador del iPhone o escritorio.
2. **Cargar el horario del semestre en `/horario`**:
   Rellenar las materias de la semana (por ejemplo, Cálculo III L-X-V de 8:00 a 9:30, Álgebra Lineal M-J de 11:00 a 12:30). Al pulsar **Listo**, se guardan en `schedule_templates` y se materializan automáticamente en el calendario para las próximas semanas.
3. **Comprobar la navegación de los 3 niveles de zoom**:
   - Abrir `/dia` desde el iPhone: comprobar el riel de horas y la tira superior de 7 días.
   - Subir a `/semana`: ver los 7 días con las materias en verde suave y el interruptor de capas.
   - Subir a `/mes`: comprobar la vista mensual con puntos ámbar en los días con parciales/entregas.
   - Pulsar `+` en cualquier vista: comprobar la hoja de Añadir (tareas anotadas sin planificar o nuevo reminder).
