# FD3 · Color por entidad y el calendario de verdad

> Tercera ronda. El usuario revisó los comps de FD2 desde su iPhone.
> **Aprobó**: el sistema visual, Inicio, `reminder-detalle.html`, Tareas, Recursos.
> **Rechazó**: las tres vistas de calendario. Aportó ocho referencias.
>
> Lee antes de tocar nada:
> `CLAUDE.md` · `docs/00-problema.md` · `docs/08-modelo-tareas-reminders.md`
> y las decisiones **63–73** de `docs/01-decisiones.md`.
>
> Tu sistema se mantiene: tipografía, espaciado, iconos, 44px.
> **`tokens.css` sí cambia** — la paleta se rehace (§A).

---

## Cómo trabajar esta ronda

**Usa tus skills de diseño, no improvises.** Petición explícita del usuario:

1. **`/impeccable`** — para el trabajo visual completo: dirección, comp, revisión
   de acabado. Es la ronda donde el calendario pasa de "correcto" a "me gusta".
2. **`/ui-ux-pro-max`** — para las decisiones de interacción: la tira de días, el
   cambio de nivel de zoom, la hoja de añadir, el arrastre en escritorio.
3. **El MCP de iconos reicon** — el que ya usaste. No inventes iconos nuevos.
4. **Abre las ocho imágenes de `briefs/ref/`** antes de escribir una línea. El
   usuario las eligió una por una y describió qué le gusta de cada una; están
   citadas en cada sección de este brief.

Las tres rondas anteriores están en `briefs/FD-diseno.md` y
`briefs/FD2-correcciones.md`, y lo que entregaste en `docs/estado-FD.md` y
`docs/estado-FD2.md`. Esta ronda no los contradice: los continúa.

---

## Las referencias

Están en `briefs/ref/`. **Ábrelas.** Son el encargo, no adorno.

| Archivo | Qué mirar |
|---|---|
| `06-escritorio-semana-horas.png` | Escritorio: rejilla horas × días, bloques de color, cabecera Mes/Semana/Día |
| `07-escritorio-semana-sidebar.png` | Escritorio: barra lateral con tareas sin planificar, agrupadas |
| `08-telefono-tira-dias.png` | Teléfono: **la tira de 7 días** de arriba. Esto es lo que más le gustó |
| `09-telefono-riel-lateral.png` | Teléfono: riel a la izquierda + contenido a la derecha, **con barras de color** |
| `10-tira-semana-flechas.png` | Flechas para moverse de semana |
| `11-ios-volver-a-mes.png` | El botón `‹ Septiembre`: **subir un nivel de zoom** |
| `12-telefono-mes-puntos.png` | Teléfono: mes en rejilla con puntos |
| `13-escritorio-mes-formulario.png` | Escritorio: día seleccionado abre panel flotante con formulario |

---

## A · El sistema de color (decisiones 63–66)

Hoy el color solo distingue contextos. A partir de ahora **el color dice qué tipo
de cosa es**, en todas las pantallas donde se muestre una de las tres.

| Entidad | Color | Dónde vive |
|---|---|---|
| **Tareas** | Azul marino | Barra izquierda del bloque · casilla · acento del sistema |
| **Materias** | Verde | Fondo tintado suave + barra verde |
| **Reminders** | Ámbar | Banderín · punto del Mes · fondo de la píldora |

### Las seis reglas

**1 · El color envuelve al texto, no lo pinta.** Palabras del usuario:

> "No necesariamente asignar color significa que el texto sea de ese color;
> puede estar encerrado con un fondo del color que representa, o cualquier otra
> cosa que haga representar el texto."

Tienes todo el repertorio disponible **menos uno**:

| Sí | No |
|---|---|
| Barra vertical de color a la izquierda (referencia 09) | **Texto de color** |
| Bloque con fondo tintado y texto oscuro encima (referencia 06) | |
| Píldora de color con el texto dentro | |
| Punto, banderín, borde, subrayado | |

La razón es medible: texto ámbar sobre blanco no llega a 2:1, y el ámbar es
innegociable para reminders. Así que el color pasa a la superficie y el texto
se queda legible. Mira la referencia 09: **barras de color, texto negro.**

**2 · Color Y forma.** La casilla de la tarea y el banderín del reminder se
quedan. El color refuerza, no sustituye. Daltonismo, y lectura de reojo.

**3 · Las materias no compiten.** Tinte suave, nunca saturado. Una materia es
*ausencia de tiempo disponible*, no contenido (decisión 52). El color la
identifica; la intensidad dice cuánta atención merece, y merece poca.

**4 · El acento pasa a ser el azul marino.** `--accent: #0E6F66` (petróleo)
desaparece del sistema: botón primario, "en curso", racha y foco pasan al azul
marino. Si las materias son verdes, el verde ya no puede significar "acción".

**5 · Los contextos pierden el punto de color.** `--ctx-1` … `--ctx-6` se
eliminan; el contexto queda como texto (`Cursos`, `Personal`). Un solo sistema
de color por pantalla, o ninguno significa nada.

**6 · Mide el contraste otra vez**, como hiciste en FD: par por par, claro y
oscuro, AA (4.5:1 texto, 3:1 indicadores no textuales). El ámbar es el que más
fácil se te rompe en claro; resuélvelo con la superficie, no oscureciendo el
texto hasta que deje de ser ámbar.

Documenta los hex elegidos y sus ratios en `app/DESIGN.md`.

---

## B · Calendario en el teléfono

**Tres niveles de zoom: Mes → Semana → Día.** Se sube de nivel con un botón tipo
iOS (`‹ Septiembre`) y se navega dentro del nivel con flechas. Referencias 10 y 11.

La cabecera es **la misma en los tres niveles**; solo cambia la etiqueta:

```
‹ Septiembre                          +
```

### B1 · Día — `comps/dia.html` (rehacer)

Referencias 08 y 09. Responde *"¿qué hago ahora?"*.

- **Tira de 7 días arriba**: número grande y abreviatura debajo, el día activo
  marcado. Se toca para cambiar de día sin salir de la vista.
- **Riel de horas a la izquierda**, bloques a la derecha. Exactamente la
  estructura de la referencia 09, pero donde ella pone días tú pones horas.
- **Línea de "ahora"** cruzando la hora actual.
- **Los reminders del día no van en la rejilla**: no tienen duración. Banda fija
  arriba, bajo la tira.
- Materias como bloques verdes tintados, de fondo.
- **Botón + flotante** (referencia 09) → abre B4.

### B2 · Semana — `comps/semana.html` (rehacer)

Referencia 09, esta vez con su estructura literal: **riel de días a la izquierda,
contenido a la derecha, barra de color por elemento**.

Responde *"¿cómo reparto el trabajo?"*, y por eso muestra **el plan semanal
completo: tareas, reminders y materias juntos** (decisión 69). Sin rejilla de
horas: esa pregunta la contesta Día.

- Interruptor para ocultar materias — al planificar interesa el hueco, no la clase.
- El día de hoy, destacado.
- Se desplaza con el pulgar; los siete días caben aunque haya que rodar.

### B3 · Mes — `comps/mes.html` (rehacer)

Referencia 12. **Solo reminders, puntos ámbar** (decisión 53, confirmada hoy).

- Ni tareas ni materias. Un día sin punto es un día limpio, y esa es toda la
  información que esta vista tiene que dar.
- Tocar un día baja a **Día**.
- Es lo que el usuario hacía en el Calendar del iPhone: *"¿cuándo son mis parciales?"*.

### B4 · Añadir — `comps/anadir.html` (nuevo)

La hoja que abre el `+`. **Aquí sí se pregunta el tipo** (decisión 70): la regla
"el lugar determina el tipo" protege la *captura*, y esto no es capturar — el
usuario ya se sentó a planificar.

```
        [ Tarea ]   [ Reminder ]

  ── Tarea ────────────────────────────
  Tus tareas sin planificar
    □ Probar Hermes
    □ Curso de Anthropic
    □ Comprar cuadernos
  ─────────────────────────────────────
  + Escribir una nueva

  ── Reminder ─────────────────────────
  Título
  Fecha  [el día que tocaste, ya puesto]
  Hora   (opcional)
  Avisar [1 día antes]
  Notas  (opcional)
```

**Dibuja los dos estados.** El de tarea es el más importante de todo este encargo:

> Esa lista de tareas capturadas y nunca planificadas es el puente que le falta
> al producto. Es lo que anotó por Siri caminando y no volvió a ver. Que
> aparezca justo cuando está decidiendo su semana **es la razón de existir de la
> app**.

Que no parezca un cajón de sobras (decisión 51). Es un menú, no un arrepentimiento.

---

## C · Calendario en escritorio

El escritorio es **solo para planificar** (regla 4 del proyecto). Aquí hay
espacio y ratón, así que aquí vive la rejilla densa.

### C1 · Semana — `comps/semana-escritorio.html` (rehacer)

Referencias 06 y 07.

- Rejilla **horas × 7 días**, bloques de color según entidad.
- Cabecera con `Mes · Semana · Día`, botón `Hoy` y flechas.
- **Barra lateral izquierda** con las tareas capturadas sin planificar,
  agrupadas por contexto (referencia 07). Se arrastran a la rejilla: así se
  planifica la semana. Dibuja el estado de arrastre.

### C2 · Mes — `comps/mes-escritorio.html` (nuevo)

Referencia 13.

- Rejilla del mes con los reminders escritos en cada celda.
- Al seleccionar un día se abre un **panel flotante, no pantalla completa**, con
  lo que hay ese día (estructura de la referencia 09) y un botón de añadir que
  despliega el formulario de la referencia 13.

---

## D · Tres correcciones fuera del calendario

| Dónde | Qué |
|---|---|
| `comps/inicio.html` · `inicio-vacio.html` | **Nuevo orden: Hoy → Esta semana (reminders) → De ayer.** La deuda va al final |
| `comps/inicio.html` | **La racha sube a la cabecera**, junto a la fecha. Ya no vive abajo |
| `comps/inicio.html` | **Elimina "Se me corrió el día"** (decisión 72). No lo sustituyas por nada |
| `comps/tareas.html` | **"Lo que viene" entra aquí** (decisión 73): la lista de reminders se encabeza con los próximos. Sale del calendario |

---

## E · Fuera de alcance

- `comps/recursos.html` — **no se toca**, salvo lo que cambie solo por la paleta.
- `comps/horario.html`, `domingo.html`, `notificacion.html` — solo repasar que el
  color nuevo no los rompa.
- `docs/` — no escribes ahí salvo tu informe.
- No reabras decisiones. Si algo aquí choca con `docs/01-decisiones.md`, pregunta
  citando el número.

---

## Entregables

| Archivo | Estado |
|---|---|
| `app/tokens.css` | Paleta nueva: 3 colores de entidad, acento azul marino, sin `--ctx-*` |
| `comps/dia.html` | **Rehacer** · tira de días + riel de horas |
| `comps/semana.html` | **Rehacer** · riel de días, las tres entidades |
| `comps/mes.html` | **Rehacer** · solo reminders, puntos ámbar |
| `comps/anadir.html` | **Nuevo** · los dos estados, tarea y reminder |
| `comps/semana-escritorio.html` | **Rehacer** · rejilla + barra lateral de sin planificar |
| `comps/mes-escritorio.html` | **Nuevo** · panel flotante del día + formulario |
| `comps/inicio.html`, `inicio-vacio.html` | Reordenar · racha arriba · quitar el botón |
| `comps/tareas.html` | "Lo que viene" |
| Resto de comps | Repasar color |
| `app/DESIGN.md` | Paleta nueva con sus ratios medidos |
| `app/revision.html` | Índice al día |
| `docs/estado-FD3.md` | Tu informe: qué quedó hecho, qué dejaste fuera, qué encontraste que cambie el plan |

Mínimo táctil de 44px, en todo. Textos en español, código en inglés.
