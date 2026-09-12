# Plan de fases y delegación

**Estado: PROPUESTO, sin aprobar.** El usuario pidió aprobar antes de ejecutar.

## Principio de ordenamiento

El semestre empieza el **2026-09-15**. El usuario fue explícito en que eso no
debe recortar la calidad de la PWA. Entonces **no se recorta alcance, se ordena
el trabajo**: lo que resuelve el problema real sale primero, y todo lo demás se
construye encima sin rehacer nada.

El orden no es por facilidad. Es por el diagnóstico de `00-problema.md`:
primero lo que le **devuelve** información (notificaciones), después lo que le
permite capturarla, y al final lo que la organiza bonito.

```
F0 Fundaciones ──┬─► F1 Captura ──┐
                 │                 ├─► F4 Ritual semanal ──► F5 Pulido
                 ├─► F2 Hoy/Semana ┤
                 │                 │
                 └─► F3 Push ──────┘
```

---

## F0 · Fundaciones
**Bloquea todo lo demás. Nadie puede avanzar en paralelo hasta que esto exista.**

- Proyecto Next.js (App Router) + TypeScript + Tailwind
- Proyecto Supabase creado; ejecutar `docs/schema.sql`
- Tipos de TypeScript generados desde el esquema
- Auth magic link funcionando, fila en `profiles` creada
- Deploy a Vercel en verde con las variables de entorno cargadas

**Hecho cuando:** puedes entrar con magic link desde el iPhone y ver una página
vacía en el dominio de producción.

**Riesgo:** ninguno técnico. Es puro setup, pero es el camino crítico entero.

---

## F1 · Captura y módulo Tareas
*Depende de F0. Paralelizable con F2 y F3.*

- `POST /api/capture` con `Bearer CAPTURE_TOKEN` → inserta en `items` como `inbox`
- Página con las instrucciones del Atajo de Siri y el token para copiar
- Vista **Inbox**: un campo, sin más. Enter y listo
- Triage de un toque: a la semana / a Tareas / borrar
- CRUD de `contexts` (ramos, proyectos, cursos, lecturas)
- Módulo **Tareas** (`status = 'someday'`): anotadas sin planificar — ideas, libros, cursos, "probar Hermes"

**Hecho cuando:** dices "Oye Siri, anota comprar cuadernos" y aparece en el
inbox sin tocar el teléfono.

**Ojo:** el endpoint tiene que responder en menos de ~1 segundo o el Atajo se
siente roto.

---

## F2 · Vista Hoy y semana
*Depende de F0. Paralelizable con F1 y F3.*

- **Hoy** es la pantalla de inicio. Los bloques del día, en orden, nada más
- Vista **Semana** con bloques horarios; crear, mover y redimensionar arrastrando
- Botón **"se me corrió el día"**: empuja N horas todos los bloques pendientes
- Marcar `done` / `missed` en un toque
- `schedule_templates`: cargar el horario de clases y materializarlo a `blocks`
- Triage de no cumplidos: la app pregunta hoy / otro día / borrar (decisión #5)

**Hecho cuando:** abres la app en el iPhone y ves tu día sin hacer scroll ni
tocar nada.

**Riesgo alto:** el calendario arrastrable en móvil es la parte de UI más cara
de todo el proyecto. Si se complica, el fallback es lista por día ordenada por
hora — el esquema lo soporta sin migración.

---

## F3 · Notificaciones
*Depende de F0. La lógica de contenido necesita F2, pero el transporte se puede
construir y probar antes.*

**Esta fase es el producto.** Ver `02-arquitectura.md` completo antes de empezar.

- `manifest.json` con `display: standalone` + service worker
- Detección de "instalada en pantalla de inicio" + instrucciones si no lo está
- Suscripción push con VAPID tras un tap real del usuario
- Notificación de prueba inmediata al suscribirse
- Edge Function `dispatch-notifications` + `pg_cron` cada 5 min
- `notification_log` con `dedupe_key` único
- Los 4 tipos: `morning`, `evening`, `weekly_review`, `advance_notice`. Decisión 33: UNA diaria con las tareas del día, no una por tarea
- Limpieza de suscripciones muertas con 404/410

**Hecho cuando:** a la hora configurada llega al iPhone una notificación que
**contiene la lista del día**, y se puede leer desde la pantalla de bloqueo sin
abrir la app.

**El riesgo más alto del proyecto.** Si iOS no entrega push, el proyecto no
resuelve el problema. Validar el camino completo lo antes posible, aunque sea
con datos falsos.

---

## F4 · Ritual semanal y racha
*Depende de F1 y F2.*

- Flujo guiado del domingo, paso a paso:
  1. lo que no cumpliste → decidir qué hacer con cada cosa
  2. vaciar el inbox → semana o módulo Tareas
  3. **Tareas te ofrece 1–2 anotadas sin planificar** para bajar a la semana (decisión 24)
  4. materializar las clases de la plantilla
  5. confirmar la semana
- Registrar en `weekly_reviews`
- Racha con perdón: comodines, `streak_current`, `streak_best` (decisión #8)
- Racha visible en Hoy — es el refuerzo del hábito

**Hecho cuando:** un domingo terminas la revisión en menos de 5 minutos y la
semana queda armada.

---

## F5 · Pulido
*Depende de todo.*

- Offline real: leer el día sin señal
- Diseño y jerarquía visual (vale usar la skill `impeccable` o `ui-ux-pro-max`)
- Accesibilidad y tamaños táctiles
- Estados vacíos que no den culpa
- Página de ajustes: horas de notificación editables (decisión 25)

---

## Delegación a sesiones

El usuario pidió repartir el trabajo en sesiones con agentes y coordinarlas
desde esta sesión de lógica.

| Fase | Sesión sugerida | Notas |
|---|---|---|
| F0 | `organizer_setup` | Debe terminar antes de abrir las demás |
| F1 | `organizer_captura` | Backend ligero + UI simple |
| F2 | `organizer_calendario` | La más pesada en UI |
| F3 | `organizer_push` | La más delicada. Conviene la sesión más capaz |
| F4 | `organizer_ritual` | Necesita F1 y F2 terminadas |
| F5 | `organizer_diseño` | Skills de diseño ya instaladas |
| F6 | `organizer_recursos` | Módulo independiente, fuera del camino crítico |
| F6 | `organizer_recursos` | Módulo independiente. Fuera del camino crítico |

**Contrato para cada sesión delegada:**

1. Leer `CLAUDE.md` y `docs/00-problema.md` antes de escribir código.
2. No reabrir nada de `docs/01-decisiones.md`. Si algo bloquea, reportarlo
   a la sesión de lógica citando el número de decisión.
3. No tocar `docs/schema.sql` sin avisar — otras fases dependen de él.
4. Al terminar, escribir un `docs/estado-F<n>.md` con qué quedó hecho, qué
   quedó fuera y qué encontró que cambie el plan.

---

## Estimaciones

Suponiendo trabajo con agentes, no a mano:

| Fase | Tiempo |
|---|---|
| F0 | 1–2 horas (la mitad es crear cuentas y pegar claves) |
| F1 | 3–4 horas |
| F2 | 6–10 horas (el calendario arrastrable domina) |
| F3 | 4–6 horas, más depuración impredecible en iOS |
| F4 | 3–4 horas |
| F5 | abierto |

**Camino mínimo para tener algo vivo el 2026-09-15:** F0 + F1 + F3.
Eso da captura por Siri y la notificación diaria con el contenido dentro — que
es exactamente el problema original. F2 y F4 llegan en la semana 1 del semestre
sin rehacer nada de lo anterior.

---

## F6 · Módulo Recursos
*Depende de F0. Paralelizable con todo. **No** está en el camino crítico.*

Módulo independiente del planificador (decisión #20). No aparece en Hoy ni en
Tareas. Detalle completo en `docs/06-recursos.md`.

- Tabla `resources` con búsqueda de texto completo en español
- Atajo de iOS en la **hoja de compartir**: Compartir → Organizer desde Safari
- Pantalla que abre con el cursor en el buscador, no con una lista
- Filtros por tipo y tag, más el filtro "guardados y nunca abiertos"
- Recuperación del `<title>` de la URL con timeout corto

**Hecho cuando:** guardas un artículo desde Safari en dos toques y lo encuentras
buscando una palabra que estaba en tus notas.

Estimación: 3–4 horas, más 1 hora por la recuperación de títulos.
