# Sistema visual de Organizer

> Escrito por la sesión de diseño (fase FD). Deriva de `briefs/FD-diseno.md`,
> `docs/00-problema.md` y las 46 decisiones de `docs/01-decisiones.md`.
>
> Los comps de `app/comps/` son la referencia visual. Esto es el contrato:
> si un comp y este documento se contradicen, gana el comp y hay que corregir
> aquí.

---

## Lo que el diseño tiene que conseguir

El usuario no tiene un problema de captura, tiene un problema de **relectura**
(`docs/00-problema.md`). De ahí salen tres consecuencias visuales, y no son
preferencias estéticas:

1. **Abrir la app tiene que bajar la ansiedad.** Si la primera sensación en
   `Inicio` es "cuánto debo", el diseño falló aunque sea bonito. Su patrón de
   fracaso documentado es dejar de abrir lo que le genera culpa.
2. **`Inicio` cabe en una pantalla sin scroll.** Con TDAH, una lista de 12
   elementos equivale a una vacía.
3. **La notificación es el producto**, no una feature. Su texto se escribe con
   presupuesto de caracteres, no con lo que quepa.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `tokens.css` | **Fuente de verdad.** Color, tipografía, espacio, radios, motion. Light y dark autorizados, ninguno derivado |
| `base.css` | Componentes construidos solo con tokens. En la app real esto es `@layer components` |
| `tailwind.preset.js` | Expone los tokens como clases de Tailwind. Portar un comp es copiar el marcado |
| `icons.js` | Set de iconos (Reicon Outline, 1.5px) resuelto desde el MCP de reicon |
| `chrome.js` | Barra de pestañas, barra de estado y barra de inicio |
| `theme.js` | Los tres estados de tema: sistema, claro, oscuro |
| `index.html` | Índice de revisión. Se abre desde el iPhone (decisión 46) |
| `comps/` | Las ocho pantallas |

---

## Color

**Neutros cálidos, un solo acento: petróleo.**

El acento se usa en exactamente tres sitios y en ninguno más:

1. La acción primaria de la pantalla.
2. El bloque / la tarea **en curso**.
3. La racha.

Todo lo demás es neutro. En particular:

- **No existe un rojo en la paleta.** Una tarea no cumplida se muestra en tono
  neutro con la pregunta de qué hacer (decisión 22). En el calendario, un
  bloque que pasó sin cerrarse lleva contorno punteado neutro, no color.
- **Cumplido no es acento.** El check se rellena con `--text-faint`. Es un
  cambio de estado tranquilo, no una celebración, y no gasta el acento.
- **Las clases no compiten.** Superficie `--surface-class`, texto en
  `--text-muted`, sin borde de color. En `Inicio` directamente no aparecen.

### Contextos

Seis colores desaturados (`--ctx-1` … `--ctx-6`) en superficie pequeña: un
punto de 7px en una fila, o un borde izquierdo de 2px en un bloque del
calendario. **Nunca un fondo completo.** Ninguno cae en el rango de tono del
acento, para que un contexto no se confunda con "en curso".

### Contraste

Todo par texto/superficie está medido y pasa AA (4.5:1), en los dos temas.
Los contextos, como indicadores no textuales, pasan 3:1. Los valores están
anotados en `tokens.css` junto a cada token.

---

## Tipografía

Una sola familia, la del sistema (SF Pro en iOS, Inter de reserva).
**Cinco tamaños en toda la app**, y no hay un sexto:

| Token | px / peso | Para qué |
|---|---|---|
| `--text-title` | 28 / 700 | Nombre de pantalla o fecha |
| `--text-section` | 20 / 600 | Encabezado de sección |
| `--text-body` | 17 / 400–500 | **Contenido.** Título de tarea |
| `--text-meta` | 15 / 400 | Hora, contexto, subordinados |
| `--text-label` | 13 / 500–600 | Etiquetas, navegación, encabezados de lista |

La jerarquía la hacen el **peso y el color**, no tamaños nuevos. El título de
una tarea es el elemento más importante de su fila; hora y contexto van
siempre subordinados.

17px es el mínimo de cualquier texto de contenido. 15 y 13 se reservan a
metadatos y etiquetas, que es donde iOS también baja.

---

## Espacio, radios, superficie

- Escala de **4px**. No hay valores fuera de la escala.
- **Mínimo 16px de aire lateral** a cualquier ancho. El gutter de móvil es
  20px; el del calendario, 16 a la izquierda y 8+8 a la derecha.
- **Dos radios:** 12px (filas, botones, campos, bloques) y 20px (hoja de
  acción, notificación). El círculo del checkbox es una forma, no un radio.
- **La separación es espacio y línea de 1px, nunca sombra.** Lo único que
  flota de verdad: la hoja de acción y el selector de fecha.
- **44×44px** de área táctil mínima, aunque el icono mida 20.

---

## Iconos

Reicon Outline, grosor 1.5, un solo estilo. Vienen del MCP declarado en
`.mcp.json`; `icons.js` los resuelve. Reglas:

- El icono **acompaña** al texto, no lo sustituye. La barra de pestañas lleva
  icono **y** etiqueta.
- Nada de emoji ni glifos Unicode haciendo de icono, ni siquiera en el teclado
  dibujado del comp de Recursos.
- Icono junto a texto visible → `aria-hidden`. Control de solo icono →
  `aria-label` en el botón.

---

## Movimiento

- **150–200 ms**, solo para orientar en un cambio de contexto. Nada que se
  note como animación.
- Marcar cumplido responde **en el sitio**: sin modal, sin navegación.
- `prefers-reduced-motion` está respetado en `base.css` (incluido el caret del
  buscador).

---

## Reglas de comportamiento que el diseño ya fija

| Regla | Dónde se ve |
|---|---|
| Triage en **un toque** por tarea (hoy / otro día / quitar) | `inicio.html`, `domingo.html` |
| Toda acción destructiva es **reversible con deshacer visible**; ningún diálogo que bloquee | `domingo.html` |
| **"Se me corrió el día"** es un control visible, nunca un elemento de menú | `inicio.html`, `semana.html`, `semana-escritorio.html` |
| Arrastrar y redimensionar **sin formulario** | `semana.html` (estado de arrastre dibujado) |
| Ningún gesto es la única vía: deslizar revela acciones, tocar abre las mismas | `tareas.html` |
| **Ningún contador de deuda.** Ni badges, ni "23 pendientes", ni barras de progreso semanal | toda la app |
| Los estados vacíos son un logro | `inicio-vacio.html` |
| Búsqueda primero, cursor dentro al abrir | `recursos.html` |

---

## La notificación: el contrato de copy

iOS muestra la notificación **plegada**: 1 línea de título y 2 de cuerpo. A
15px en una tarjeta de ~334px son unos 44 caracteres por línea.

```
título   <= 38 caracteres
cuerpo   <= 88 caracteres
```

Pasado ese techo iOS corta con puntos suspensivos y la notificación vuelve a
ser "tienes cosas, abre la app", que es justo lo que el proyecto existe para
no hacer.

Por eso el cuerpo se compone en el servidor con presupuesto de caracteres: si
el día no cabe, **se quitan bloques** (los más tardíos), nunca se corta una
frase a la mitad.

Diferencia deliberada con `Inicio`: **la notificación sí incluye las clases.**
`Inicio` es para decidir y las clases no se deciden (decisión 35); la
notificación es para saber qué pasa hoy, y a las 8:00 lo que pasa es Cálculo.

Los cinco textos, con su largo real, están en `comps/notificacion.html`.

---

## Navegación

Cuatro módulos, siempre en este orden: **`Inicio · Semana · Tareas · Recursos`**
(decisiones 30 y 34).

- **< 1024px:** barra de pestañas inferior, 49px + área segura, icono y
  etiqueta, el actual en acento.
- **≥ 1024px:** los mismos cuatro pasan a barra lateral. Mismo orden, mismo
  icono, misma etiqueta.

---

## Presupuesto de altura de `Inicio`

iPhone 390×844:

```
  47 px   barra de estado
 714 px   la pantalla          <- todo tiene que caber aquí
  83 px   pestañas (49) + área segura (34)
```

`inicio.html` lleva el contenedor en `overflow: hidden` a propósito: si algo
deja de caber, se rompe a la vista en vez de convertirse en scroll silencioso.

El comp con contenido ocupa los 710px disponibles con **desbordamiento 0**,
verificado en navegador. Reparto aproximado:

| Bloque | px |
|---|---|
| Encabezado (fecha + racha) | 76 |
| "De ayer" con triage | 150 |
| "Hoy": 4 filas + encabezado | 300 |
| Salida al resto de Tareas | 40 |
| Banda "Esta semana" | 90 |

Si hay más de cuatro o cinco tareas, **no se hace scroll**: se muestra la
salida "El resto está en Tareas". Sin número: un número ahí sería un contador
de deuda.

---

## Lo que este sistema prohíbe

Sale del brief, y cada prohibición tiene una razón, no un gusto:

1. Rojo, alarma o reproche para lo no cumplido.
2. Contadores de deuda acumulada, badges numéricos, barras de progreso semanal.
3. Gamificación: insignias, puntos, confeti, niveles. La racha es una línea de
   texto.
4. Ilustraciones y mascotas.
5. Gradientes y sombras decorativas.
6. Scroll horizontal en el cuerpo (por eso los filtros de Recursos envuelven).
7. Más de un color de acento.
8. Que las clases compitan con las tareas.
