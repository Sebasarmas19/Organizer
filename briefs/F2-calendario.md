# F2 · Calendario

> La fase más grande del proyecto, y la que menos decisiones tiene abiertas.
> **Todo está dibujado y aprobado por el usuario desde su iPhone.**
>
> Tu trabajo es portar comps a React con datos reales. No es diseñar. Si un
> comp y tu intuición discrepan, gana el comp.

---

## Antes de escribir una línea

| Lee | Por qué |
|---|---|
| `CLAUDE.md` | Las cinco reglas del producto |
| `docs/00-problema.md` | El diagnóstico. **No es obvio** |
| `docs/08-modelo-tareas-reminders.md` | Materias, reminders y tareas |
| `docs/01-decisiones.md` | 78 decisiones cerradas. **No se reabren** |
| `docs/estado-FD3.md` | Por qué cada vista quedó como quedó |
| `docs/estado-F0.md` | Qué existe ya |
| `app/DESIGN.md` | El sistema visual |
| `web/AGENTS.md` | Next.js 16 no es el que recuerdas |

**Los comps son tu especificación.** Ábrelos todos antes de empezar:

```
app/comps/dia.html                 app/comps/anadir.html
app/comps/semana.html              app/comps/horario.html
app/comps/mes.html                 app/comps/semana-escritorio.html
                                   app/comps/mes-escritorio.html
```

---

## A · Las tres vistas responden tres preguntas distintas

**No es el mismo contenido en letra más chica.** Esto es lo más importante de
toda la fase:

| Vista | La pregunta | Muestra | NO muestra |
|---|---|---|---|
| **Día** | ¿Qué hago ahora? | Riel de horas con tareas y materias. Reminders en banda arriba | — |
| **Semana** | ¿Cómo reparto el trabajo? | Los 7 días con las tres entidades. Sin rejilla de horas | — |
| **Mes** | ¿Qué se me viene encima? | **Solo reminders**, puntos ámbar | Tareas y materias |

Meterle tareas al Mes lo arruina: si los 30 días tienen punto, ninguno destaca.
Un día limpio es un día libre, y esa es toda la información que esa vista da
(decisión 53).

### Navegación: tres niveles de zoom

`Mes → Semana → Día`, con **la misma cabecera en los tres**, cambiando solo la
etiqueta. Botón de subir nivel al estilo iOS (`‹ Septiembre`) y flechas para
moverse dentro del nivel (decisión 67). En Mes, que es el techo, el título
ocupa el sitio exacto del botón de subir, para que la cabecera no se mueva un
píxel al cambiar de nivel.

---

## B · La hoja de añadir — la pantalla más importante

`app/comps/anadir.html`. Dos estados: tarea y reminder.

**Aquí sí se pregunta el tipo** (decisión 70). La regla "el usuario nunca elige
el tipo" protege **la captura** — Siri, caminando, tres segundos. Planificar
sobre el calendario es un momento deliberado: ahí preguntar cuesta un toque y
quita toda la ambigüedad.

### El estado de tarea es el corazón del producto

Lo primero que se ve es **la lista de tareas capturadas y nunca planificadas**:

```
  ── Tarea ────────────────────────────
  Tus tareas sin planificar
    □ Probar Hermes
    □ Curso de Anthropic
    □ Comprar cuadernos
  ─────────────────────────────────────
  + Escribir una nueva
```

> Eso es lo que el usuario anotó por Siri caminando y no volvió a ver. Que
> aparezca justo cuando está decidiendo su semana **es la razón de existir de
> la app**.

Tres reglas que la sostienen:

1. **Ningún contador en el encabezado.** "4 sin planificar" es un contador de
   deuda con otro nombre.
2. **Ninguna edad.** Nada de "llevas 12 días sin tocar esto". Es verdad, y es
   exactamente el dato que hace cerrar la app.
3. **La confirmación va en positivo y en concreto:** *"Poner 2 en el jueves 17"*,
   no *"2 seleccionadas"*.

El estado de reminder pide título, fecha (ya rellenada con el día que tocó),
hora opcional, aviso anticipado (1 día por defecto, decisión 60) y notas.

---

## C · Materias: reservar espacio, no competir

En palabras del usuario:

> "Cuando planificamos no es que por tener Sistemas Operativos a las 8 cambiemos
> la planificación; nos importa más el tiempo que tenemos disponible."

**Una materia no es contenido: es ausencia de tiempo disponible** (decisión 52).
Verde tintado, de fondo, nunca compitiendo. Con un interruptor para ocultarlas
al planificar — entonces interesa el hueco, no la clase. En Mes no aparecen
nunca: llenarían las 30 celdas de ruido repetido.

### El formulario de horario

`app/comps/horario.html`. Carga **una semana** y se replica **cinco meses**
(decisión 54). Ya lo soporta `schedule_templates` con `weekday` + `start_time`
+ `end_time` + `active_from` / `active_until`. El formulario escribe la
plantilla una vez; la materialización a `blocks` ocurre semana a semana y
**tiene que ser idempotente** — hay un índice único que lo exige.

Es el mayor trabajo manual de todo el proyecto y la única barrera real de
entrada. Repetir una materia en varios días, duplicar filas, y **nunca pedir
dos veces el mismo dato**.

---

## D · Escritorio

El escritorio es **solo para planificar** (regla 4 del producto). Ahí hay
espacio y ratón, así que ahí vive la rejilla densa: horas × 7 días, con la
barra lateral de tareas sin planificar que se arrastran a la rejilla.

**Requisito de accesibilidad, no opcional** (`docs/estado-FD3.md` §9.1, WCAG
2.2 *Dragging Movements*): toda acción de arrastre necesita un camino
equivalente con un solo toque. Cada fila del panel tiene que poder abrir el
mismo formulario de "añadir a este día". **El arrastre es el atajo, no el
mecanismo.** Si el arrastre se complica, entrega el camino de un toque y dilo
en el informe: la fase no se bloquea por eso.

---

## Color: lo que significa cada uno

| Entidad | Color | Dónde vive |
|---|---|---|
| Tareas | Azul marino | Barra del bloque · casilla · acento del sistema |
| Materias | Verde | Fondo tintado suave |
| Reminders | Ámbar | Banderín · punto del Mes |

**El color envuelve al texto, nunca lo pinta.** Barra, fondo tintado, píldora,
punto, banderín — todo vale menos texto de color. `--rem` mide 4.0:1: pasa como
indicador, no como texto, y la utilidad `text-rem` no existe. No la crees.

Y **color *y* forma**: la casilla de la tarea y el banderín del reminder se
quedan. El color refuerza, no sustituye.

---

## Reglas técnicas

- **Next.js 16**: `middleware.ts` ya no existe, ahora es `proxy.ts`. La
  documentación de la versión exacta está en `node_modules/next/dist/docs/`.
- **Tailwind 4** con el preset de Tailwind 3 por `@config`. **No lo traduzcas
  a `@theme`** (decisión 76).
- **44px de área táctil, sin excepción**, incluso cuando algo deje de caber.
  Si algo no cabe, **sale contenido, no tamaño de control**. Es regla del
  proyecto, verificada dos veces.
- Nada puede desbordar horizontalmente a **390px**.
- Reutiliza `CalBlock`, `Check`, `ReminderFlag`, `Row`, `TabBar`, `Icon`.
- Zona horaria: **`America/Caracas`, sin horario de verano**. La zona real vive
  en `profiles.timezone`; no la codifiques a mano en cada consulta.
- Textos en español, código e identificadores en inglés.

---

## Fuera de alcance

- `POST /api/capture`, la pantalla del Atajo, el módulo Tareas y los contextos
  — eso es **F1**, y otro agente lo construye a la vez. **No toques nada de
  eso.**
- Notificaciones, service worker, manifest — eso es **F3**.
- El ritual del domingo — eso es F4.
- `app/` se lee, no se toca. `docs/` solo tu informe. `docs/schema.sql` no se
  toca sin preguntar.

---

## Hecho cuando

Abres la app y ves tu día sin hacer scroll ni tocar nada; puedes planificar una
tarea ya capturada en dos toques; y el Mes te dice cuándo son tus parciales de
un vistazo.

## Entregable

`docs/estado-F2.md`: qué quedó hecho, qué dejaste fuera, qué encontraste que
cambie el plan, y qué tiene que hacer el usuario a mano.

Antes de darlo por terminado: `npm run typecheck` y `npm run lint` en limpio.
**No corras `npm run build` ni `npm run verify`** — el usuario tiene el
servidor de desarrollo encendido y comparten la carpeta `.next/`.
