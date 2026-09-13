# Plan de fases y delegación

> **Reescrito el 2026-09-13**, después de cerrar F0. La versión anterior
> describía el modelo de dos entidades (`items` + `blocks`) y mencionaba
> pantallas que ya no existen. Este documento manda sobre cualquier copia
> anterior que un agente recuerde.

## Principio de ordenamiento

El semestre empezó el **2026-09-15**. El usuario fue explícito en que eso no
recorta la calidad. Entonces **no se recorta alcance, se ordena el trabajo**:
lo que resuelve el problema real sale primero, y lo demás se construye encima
sin rehacer nada.

El orden sale del diagnóstico de `00-problema.md`: primero lo que le
**devuelve** información (notificaciones), después lo que le permite
capturarla, y al final lo que la organiza bonito.

```
F0 ✔ ──┬─► F1 Captura y Tareas ──┐
       │                          ├─► F4 Ritual semanal ──► F5 Pulido
       ├─► F2 Calendario ─────────┤
       │                          │
       └─► F3 Notificaciones ─────┘

       └─► F6 Recursos (fuera del camino crítico)
```

## Lo que ya existe

`docs/estado-F0.md` tiene el detalle. En corto:

| | Dónde |
|---|---|
| Sistema de diseño, 15 comps aprobados por el usuario | `app/` — **congelado, solo lectura** |
| Proyecto Next.js 16 + TS + Tailwind 4 | `web/` |
| Tokens, `base.css`, 34 iconos, componentes base | `web/src/styles/`, `web/src/components/` |
| Supabase: cliente, servidor, admin, tipos | `web/src/lib/supabase/` |
| Entrada con Google; correo como salida de emergencia | `web/src/app/entrar/` |
| Las 10 tablas con RLS, en línea | `docs/schema.sql`, ya aplicado |

**Componentes que ya existen y se reutilizan, no se rehacen:** `Check`,
`CalBlock`, `ReminderFlag`, `Row`, `TabBar`, `Icon`, `ThemeSwitch`.

---

## F0 · Fundaciones — **TERMINADA**

Verificado el 2026-09-13: sesión iniciada, fila en `profiles` con
`America/Caracas`, `npm run verify` en limpio, y los tipos coinciden con las
102 columnas de la base en línea.

---

## F1 · Captura y módulo Tareas
*Depende de F0. Paralelizable con F2, F3 y F6.* · **Antigravity**

Resuelve la mitad del problema: que lo que anota **llegue a un solo sitio**.

- `POST /api/capture` con `Bearer CAPTURE_TOKEN` → inserta una **tarea**
  (decisión 48: lo que entra por Siri es tarea, siempre)
- Pantalla con las instrucciones del Atajo de Siri y el token para copiar
- Módulo **Tareas** (`comps/tareas.html`): las tareas, los reminders **de solo
  lectura**, y la vista de la relación entre ambos
- **"Lo que viene"** vive aquí (decisión 73), no en el calendario
- Marcar cumplida, editar, asociar a un reminder (opcional, decisión 50)
- CRUD de `contexts`. Sin color: son texto (decisión 66)

**Hecho cuando:** dices *"Oye Siri, anota comprar cuadernos"* y aparece en
Tareas sin tocar el teléfono.

**Ojo:** el endpoint tiene que responder en menos de ~1 segundo o el Atajo se
siente roto.

---

## F2 · Calendario
*Depende de F0. Paralelizable con F1, F3 y F6.* · **Antigravity**

La fase más grande. Todo está dibujado y aprobado; esto es portar comps a React.

| Vista | La pregunta | Comp |
|---|---|---|
| **Día** | ¿Qué hago ahora? | `comps/dia.html` — tira de 7 días + riel de horas |
| **Semana** | ¿Cómo reparto el trabajo? | `comps/semana.html` — riel de días, las tres entidades |
| **Mes** | ¿Qué se me viene encima? | `comps/mes.html` — **solo reminders**, puntos ámbar |
| **Añadir** | — | `comps/anadir.html` — tarea o reminder |
| Escritorio | Planificar | `semana-escritorio.html`, `mes-escritorio.html` |

Más `comps/horario.html`: el formulario que carga las materias de una semana y
las replica cinco meses (decisión 54). Es el mayor trabajo manual del proyecto
y la única barrera real de entrada.

**Hecho cuando:** abres la app y ves tu día sin hacer scroll ni tocar nada, y
puedes planificar una tarea desde el calendario en dos toques.

**Riesgo alto:** el arrastre en el escritorio. Si se complica, el respaldo es
tocar la tarea y elegir el día — que además hace falta igual por accesibilidad
(`docs/estado-FD3.md` §9.1).

---

## F3 · Notificaciones
*Depende de F0. El contenido se enriquece con F1 y F2, pero el transporte se
construye y se prueba antes.* · **Claude Opus**

**Esta fase es el producto.** Leer `docs/02-arquitectura.md` entero antes de
empezar.

- `manifest.webmanifest` con `display: standalone` + service worker
- Detección de "instalada en pantalla de inicio" + instrucciones si no lo está
- Suscripción push con VAPID **tras un toque real** del usuario
- Notificación de prueba inmediata al suscribirse
- Edge Function `dispatch-notifications` + `pg_cron` cada 5 minutos
- `notification_log` con `dedupe_key` único — el cron corre cada 5 min
- Los cuatro tipos: `morning`, `evening`, `weekly_review`, `advance_notice`
- Una sola notificación diaria con las tareas dentro (decisión 33)
- El reminder manda sobre las tareas (decisión 57); si ya está preparado, no
  encabeza (decisión 61); avisa con 1 día por defecto (decisión 60)
- Limpieza de suscripciones muertas con 404/410

**Hecho cuando:** a la hora configurada llega al iPhone una notificación que
**contiene la lista del día**, legible desde la pantalla de bloqueo.

**El riesgo más alto del proyecto.** Requiere HTTPS real y la PWA instalada en
la pantalla de inicio: `localhost` no sirve desde el iPhone. Depende de que el
usuario despliegue en Vercel y de que su iOS sea **16.4 o superior**.

---

## F4 · Ritual semanal y racha
*Depende de F1 y F2.*

- Flujo guiado del domingo, paso a paso:
  1. lo que no cumpliste → decidir qué hacer con cada cosa
  2. vaciar lo capturado → semana o se queda en Tareas
  3. **Tareas te ofrece 1–2 sin planificar** para bajar a la semana (dec. 24)
  4. materializar las materias de la plantilla
  5. confirmar la semana
- Los reminders aparecen **solo de lectura** (decisión 62): un parcial no se
  pospone, y con botones de "Otro día / Quitar" el domingo sería una factura
- Registrar en `weekly_reviews`
- Racha con perdón: comodines, `streak_current`, `streak_best` (decisión 8)
- La racha vive en el encabezado de Inicio (decisión 74)

**Hecho cuando:** un domingo terminas la revisión en menos de 5 minutos.

---

## F5 · Pulido
*Depende de todo.*

- Offline real: leer el día sin señal
- Llevar el arnés de medida de FD3 a Playwright (`estado-FD3.md` §9.5)
- Una regla que impida escribir `text-rem` (§9.2)
- Camino alternativo al arrastre, con teclado (§9.1, WCAG 2.2)
- Estados vacíos que no den culpa
- Ajustes: horas de notificación editables (decisión 25)

---

## F6 · Módulo Recursos
*Depende de F0. Paralelizable con todo. **No** está en el camino crítico.*

Módulo independiente del planificador (decisión 20). No aparece en Inicio ni en
Tareas. Detalle en `docs/06-recursos.md`; comp en `app/comps/recursos.html`.

- Tabla `resources` con búsqueda de texto completo en español, ya en la base
- Atajo de iOS en la **hoja de compartir**: Compartir → Organizer desde Safari
- Pantalla que abre con el cursor en el buscador, no con una lista
- Filtros por tipo y tag, más "guardados y nunca abiertos"
- Recuperación del `<title>` de la URL con timeout corto

**Hecho cuando:** guardas un artículo desde Safari en dos toques y lo
encuentras buscando una palabra que estaba en tus notas.

---

## Reparto por agente

Objetivo del usuario: **gastar pocos tokens de Opus**. Regla de la decisión 38:
*Antigravity ejecuta, Claude decide y verifica.*

| Fase | Agente | Por qué |
|---|---|---|
| F1 | **Antigravity** | CRUD y pantallas sobre un diseño cerrado. Ejecución pura |
| F2 | **Antigravity** | Lo mismo, a mayor escala |
| F3 | **Claude Opus** | Es el producto. Si iOS no entrega, nada más importa |
| F4 | Antigravity | Flujo guiado sobre reglas ya escritas |
| F6 | Antigravity | Módulo aislado, sin dependencias |

El coordinador revisa **todos** los informes, venga de quien venga. Ahí se
sostiene la calidad sin gastar Opus escribiendo código.

**Cada worker en su propio worktree.** Tres agentes escribiendo en la misma
carpeta se pisan. El coordinador fusiona al validar.

---

## Contrato de cada fase delegada

1. Leer `CLAUDE.md`, `docs/00-problema.md` y
   `docs/08-modelo-tareas-reminders.md` antes de escribir código.
2. **No reabrir `docs/01-decisiones.md`.** Si algo bloquea, preguntar al
   coordinador citando el número de decisión.
3. **No tocar `app/`**: es el diseño aprobado. Se lee y se copia.
4. **No tocar `docs/schema.sql`** sin avisar: otras fases dependen de él.
5. No tocar lo que otra fase esté construyendo.
6. Al terminar, escribir `docs/estado-F<n>.md` con qué quedó hecho, qué quedó
   fuera y qué encontró que cambie el plan.

---

## Lo que el usuario tiene que hacer a mano

1. **Desplegar en Vercel** con `web` como Root Directory, las seis variables de
   entorno, y añadir la URL a las Redirect URLs de Supabase y de Google.
   **Bloquea la validación de F3.**
2. **Confirmar su versión de iOS.** Menor que 16.4 = no hay Web Push y F3 se
   replantea entero.
3. **Configurar los Atajos** con la pantalla que genera F1.
4. **Instalar la PWA** en la pantalla de inicio y aceptar notificaciones.
5. **Validar** cada fase cuando el coordinador se la enseñe.
