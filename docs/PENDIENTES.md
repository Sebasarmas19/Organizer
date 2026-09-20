# Organizer · Estado de Integración y Tareas Pendientes

> **Documento vivo para colaboradores y agentes.** 
> Actualizado al: **2026-09-20**.
> Este documento detalla qué partes ya están integradas entre el Front y el Back, qué detalles visuales/UX faltan por pulir, y cuál es la hoja de ruta para completar el proyecto.

---

## 📊 1. Resumen del Estado Actual

| Módulo / Fase | Estado | Descripción |
|---|---|---|
| **F0 · Fundaciones** | ✅ **Completado** | Auth (Google + Magic link), Supabase SSR, RLS en 10 tablas, tokens CSS. |
| **F1 · Captura y Tareas** | ✅ **Completado** | `POST /api/capture` (Siri), vista de Tareas/Pendientes, contextos, acciones. |
| **F2 · Calendario** | ✅ **Completado** | Vistas Día, Semana y Mes, riel de horas (7:00 a 21:00), soporte escritorio y móvil. |
| **F3 · Notificaciones Web Push** | 🟡 **Código listo, pendiente despliegue** | Edge Function construida con 54 tests unitarios pasando. Falta desplegar a Vercel (HTTPS) y Supabase para validar en iPhone real. |
| **FD4 · Rediseño Visual** | ✅ **Completado** | Sistema unificado con tarjetas, encabezados, barra lateral en escritorio (>900px) y barra inferior en móvil. |
| **F4 · Ritual Semanal** | ⏳ **Pendiente** | Flujo guiado de 5 minutos del domingo para cerrar la semana y proyectar la siguiente. |
| **F6 · Recursos** | ⏳ **Pendiente** | Vista base lista; falta CRUD completo, búsqueda de texto y atajo de compartir en Safari. |

---

## 🔌 2. Integración Front ↔ Back: Lo que Falta

Aunque la gran mayoría de las pantallas de lectura ya consultan la base de datos a través de Server Components (`web/src/lib/home.ts`, `fd4-calendar.ts`, `fd4-pendientes.ts`), restan las siguientes integraciones operativas:

### A. Materialización del Semestre (`/horario` ↔ `blocks`)
- **Situación actual**: La pantalla `/horario` permite guardar materias y horarios en `schedule_templates`.
- **Qué falta**: 
  - Asegurar la función que replica estas plantillas a lo largo de las semanas del semestre (desde el 2026-09-15 hasta febrero 2027) insertando los registros reales en `blocks` con `source = 'template'`.
  - Sin esta materialización, el calendario del día y la semana no mostrarán las clases fijas de la universidad.

### B. Edición y Detalle de Reminders / Tareas
- **Situación actual**: En Inicio y Calendario se pueden marcar tareas como completadas (`toggleTask`) y gestionar las tareas que quedaron de ayer.
- **Qué falta**:
  - Al tocar un reminder o tarea específica, poder abrir una vista/modal de edición para cambiar fecha tope (`due_on`), contexto o asociar tareas secundarias.

### C. Ajustes de Horarios de Notificación (`/ajustes/notificaciones`)
- **Situación actual**: La suscripción y revocación de Web Push ya funciona con la tabla `push_subscriptions`.
- **Qué falta**:
  - Conectar el formulario de horas (`TimesForm.tsx`) para actualizar las columnas `notify_morning` y `notify_evening` directamente en la fila `profiles` del usuario.

### D. Despliegue y Activación de Web Push en Producción
- **Qué falta hacer en servidor**:
  1. Desplegar en **Vercel** (`web` como Root Directory).
  2. Desplegar la Edge Function en Supabase:
     ```bash
     npx supabase functions deploy dispatch-notifications
     ```
  3. Ejecutar el SQL de [`supabase/cron.sql`](../supabase/cron.sql) en Supabase SQL Editor para programar el cron de 5 minutos.
  4. Abrir la PWA en el iPhone desde Safari, agregar a la pantalla de inicio, y pulsar *"Activar notificaciones"*.

---

## 🎨 3. Detalles Visuales y de UX Pendientes

1. **Bottom Sheet nativo para Añadir (`/anadir`)**:
   - Actualmente `/anadir` es una pantalla completa. En iPhone resulta mucho más ágil presentarlo como un *sheet* deslizante o modal que se cierre tras guardar con 0 fricción.
2. **Estados Vacíos Amorosos (Regla 5: "La app nunca regaña")**:
   - Validar que los días sin tareas ni clases muestren el estado *"Día despejado"* o mensajes neutros/positivos, sin dar sensación de error o vacío roto.
3. **Optimización de Área Táctil (44px) en iPhone**:
   - Revisar en Safari móvil que todos los botones, checks y flechas de navegación cumplan estrictamente con los 44px de área táctil (`.tapicon`, `.btn`), evitando dobles toques accidentales o zooms del sistema.
4. **Transiciones entre vistas de Calendario**:
   - La navegación entre Día, Semana y Mes usa parámetros de URL (`?v=semana&d=...`). Asegurarse de que el cambio entre pestañas se sienta instantáneo y no produzca parpadeos visuales en pantallas pequeñas.

---

## 🗓️ 4. Roadmap de Fases Pendientes

### Fase F4 · Ritual Semanal del Domingo
- **Objetivo**: Un flujo interactivo que guíe al usuario los domingos a las 19:00 (duración < 5 min).
- **Pasos del flujo**:
  1. Revisar lo que no se cumplió de la semana anterior (reprogramar o descartar sin reproches).
  2. Vaciar tareas capturadas sin fecha hacia la nueva semana.
  3. Sugerir 1–2 tareas del backlog para bajar a la semana (decisión 24).
  4. Materializar las materias de la semana entrante.
  5. Registrar la sesión en `weekly_reviews` y actualizar la racha en `profiles`.

### Fase F6 · Módulo Recursos
- **Objetivo**: Biblioteca personal independiente para guardar herramientas, skills y artículos (decisión 20).
- **Pendiente**:
  - Implementar búsqueda full-text en español sobre la tabla `resources`.
  - Crear el Atajo de iOS para *"Compartir en Organizer"* desde Safari.

---

## 🛠️ Reglas Técnicas Innegociables para el Colaborador

1. **No reabrir decisiones:** Las decisiones de [`docs/01-decisiones.md`](01-decisiones.md) están cerradas.
2. **Fuente de verdad de diseño:** `app/tokens.css` manda. Si se modifica un token, debe actualizarse también en `web/src/styles/tokens.css`.
3. **No usar `text-rem`:** El color ámbar solo se usa como indicador de superficie o bandera, no como texto (contraste 4.0:1).
4. **Verificación obligatoria:** Antes de hacer push o merge a `main`, siempre debe pasar:
   ```bash
   npm run verify
   ```
