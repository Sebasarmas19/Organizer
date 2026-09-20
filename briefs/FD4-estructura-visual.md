# FD4 · Estructura visual

> **Esta ronda no cambia contenido, cambia forma.** Ninguna decisión de
> `docs/01-decisiones.md` se reabre. Lo que está mal es cómo se muestra la
> información, no qué información se muestra.

---

## El diagnóstico del usuario, en sus palabras

> "no tiene un orden, todo esta del lado izquierdo y no se entienden las
> secciones"

Tiene razón, y el nombre técnico de lo que ve es:

1. **Todo es una fila a sangre.** Cada elemento ocupa el 100 % del ancho y se
   pega al borde izquierdo. No hay contenedor, no hay margen lateral, no hay
   nada que agrupe.
2. **Los encabezados de sección no separan nada.** `Tu cuenta`, `Tema`, `Las
   tres entidades` son texto gris pequeño flotando entre filas idénticas. Un
   encabezado que no tiene debajo un bloque visible no encabeza nada.
3. **Una sola jerarquía tipográfica.** Casi todo el texto tiene el mismo peso y
   tamaño, así que la vista no sabe dónde caer primero.
4. **Ancho sin límite en escritorio.** A 1900 px una lista de tareas ocupa los
   1900 px. La línea de texto se vuelve ilegible y el ojo pierde el renglón.

---

## Lo que el usuario quiere, sacado de sus referencias

Las 10 referencias son `2*.png` (teléfono) y `3*.png` (escritorio), más
`00-*.png` con el estado anterior. **Viven fuera del repositorio**, en
`../Organizer-ref/briefs-ref/` — son 4,7 MB de capturas que se miran una vez
y no se vuelven a tocar, y el historial de git se queda con ellas para
siempre. Lo que TODAS tienen en común, y la app no:

| Patrón | Qué significa |
|---|---|
| **Tarjeta con fondo propio y esquinas redondeadas** | Cada grupo de información vive dentro de una superficie que se distingue del fondo de la página |
| **Margen lateral real** | El contenido nunca toca el borde. Hay aire a los dos lados |
| **Espacio entre bloques** | Las secciones se separan por hueco, no por una línea de 1 px |
| **Un título grande arriba** | "Dashboard", "My Tasks", "December", "Calendar" — una sola cosa manda en la pantalla |
| **Fila de resumen antes del detalle** | 2×2 de tarjetas, o una tira de días, antes de la lista larga |
| **Ancho contenido en escritorio** | Barra lateral fija + área de trabajo con ancho máximo. Nunca texto de 1900 px |
| **El color vive en la superficie** | Fondo tintado suave, barra lateral de color, píldora — nunca texto de color |

Ese último punto **ya es la decisión 63 del proyecto** y las referencias la
confirman: en las 10, el color envuelve, no pinta.

---

## Lo que NO se toca

- Las 78 decisiones de `docs/01-decisiones.md`. En particular:
  - **Ningún contador de deuda** (decisión 22). Las referencias están llenas de
    "31 % completado", "18 task", "You have 3 tasks". **Eso no se copia.** Es
    exactamente el dato que hace cerrar la app.
  - **Nada de gráficas de productividad ni rachas de barras.** Mismo motivo.
  - **El Mes solo lleva reminders** (decisión 53).
  - **Color por entidad**: tareas azul marino, materias verde, reminders ámbar.
    Las referencias usan otras paletas; se copia la *estructura*, no el color.
- Los tres temas (claro, oscuro, sistema) siguen siendo obligatorios.
- 44 px de área táctil, sin excepción.
- Nada desborda a 390 px.

---

## Entregable

Comps HTML en `app/comps/`, como en FD, FD2 y FD3. El sistema de diseño vive en
`app/tokens.css`, `app/base.css` y `app/DESIGN.md`.
