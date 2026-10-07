---
name: Organizer
description: La PWA que te devuelve lo que ya capturaste, con el idioma de un iPhone.
colors:
  tint: "#265A44"
  tint-fill: "#2F6B52"
  tint-press: "#255843"
  tint-soft: "#E2ECE5"
  tint-dark: "#86CDA9"
  tint-fill-dark: "#4FA37E"
  tint-soft-dark: "#1F3328"
  on-tint: "#FFFFFF"
  on-tint-dark: "#08110C"
  bg: "#F4F2EC"
  bg-dark: "#0E1210"
  cell: "#FFFFFF"
  cell-dark: "#1A201D"
  cell-up-dark: "#252C28"
  cell-press: "#E7E4DC"
  track: "#E6E3DA"
  fill: "rgb(100 112 104 / 0.12)"
  fill-strong: "rgb(100 112 104 / 0.18)"
  separator: "rgb(50 66 56 / 0.18)"
  label: "#1B1F1C"
  label-dark: "#EEF1EE"
  label-secondary: "#5C635D"
  label-secondary-dark: "#A3ABA5"
  label-tertiary: "#A7AEA8"
  control: "#78807A"
  class-slate: "#4F72A8"
  class-slate-dark: "#86A3D3"
  rem-amber: "#B26B00"
  rem-amber-dark: "#E8A53A"
  rem-soft: "#F7ECDA"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    letterSpacing: "normal"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "normal"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "normal"
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "normal"
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "normal"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "12px"
    letterSpacing: "normal"
rounded:
  sm: "10px"
  md: "12px"
  now: "26px"
  group: "24px"
  tab-bar: "31px"
  sheet: "38px"
  capsule: "999px"
spacing:
  hairline: "3px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  group-inset: "14px"
  gutter: "16px"
  tile-gap: "12px"
components:
  now-tile:
    backgroundColor: "{colors.tint-soft}"
    textColor: "{colors.label}"
    rounded: "{rounded.now}"
    padding: "18px"
  tile:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    rounded: "{rounded.group}"
    padding: "16px"
  button-primary:
    backgroundColor: "{colors.tint-fill}"
    textColor: "{colors.on-tint}"
    rounded: "{rounded.capsule}"
    padding: "0 18px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    padding: "0 18px"
    height: "48px"
  button-soft:
    backgroundColor: "{colors.tint-soft}"
    textColor: "{colors.tint}"
    rounded: "{rounded.capsule}"
    height: "44px"
  day-row:
    textColor: "{colors.label}"
    height: "52px"
  choice-chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    height: "36px"
  choice-chip-open:
    backgroundColor: "{colors.fill-strong}"
  circle-button:
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    size: "44px"
  tab-bar:
    textColor: "{colors.label}"
    typography: "{typography.tab-label}"
    rounded: "{rounded.tab-bar}"
    padding: "4px"
    height: "62px"
  tab-active:
    textColor: "{colors.tint}"
  fab:
    textColor: "{colors.label}"
    rounded: "{rounded.capsule}"
    size: "62px"
  sheet:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.label}"
    rounded: "{rounded.sheet}"
    padding: "6px 0 18px"
  grouped-cell:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    padding: "10px 16px"
    height: "52px"
  grouped-cell-pressed:
    backgroundColor: "{colors.cell-press}"
---

# Design System: Organizer

## Overview

**Creative North Star: "La pantalla de inicio del iPhone"**

Organizer se ve y se mueve como una app que vino con el iPhone. Inicio es un resumen en widgets: lo que toca ahora, el día con hora, la racha, lo que quedó de ayer y lo que se viene, cada cosa en su bloque y en el orden en que se lee. Abrir la app responde de un vistazo a "¿qué tengo?" sin pedir nada. La notificación sigue siendo el producto; esta pantalla es donde todo eso se relee junto.

El sistema no inventa un lenguaje propio: toma el de iOS 26 (fuente del sistema, grupos sobre fondo cálido, cápsulas, vidrio solo en lo que flota, muelles) y lo usa con disciplina. El color de la app es **Bosque**, un verde profundo sobre papel cálido. El usuario puede cambiarlo en Ajustes · Color (Ciruela, Petróleo, Índigo, Grafito), así que todo se escribe con tokens y nada lleva el verde a mano.

Esta capa vive en `web/src/styles/ios.css` y reasigna los tokens de FD4/FD5 (`app/tokens.css`, congelado) a valores de iOS. La base de `:root` es Ciruela; el layout pone `data-accent="bosque"` antes de pintar si no hay otro color guardado, y la sección 2b del CSS trae cada color con su juego claro y oscuro. El mundo rechaza la tarjeta héroe con números de deuda y el aspecto genérico de "web con tarjetas" azules.

**Key Characteristics:**
- Fuente del sistema con el espaciado que ya trae; nunca letter-spacing a mano.
- Widgets de radio 24 sobre fondo cálido, sin sombra; el de Ahora, en el verde suave.
- Un solo color de acción por tema (`tint`), elegible en Ajustes y siempre por token.
- Vidrio solo en lo que flota sobre el contenido; todo lo demás es sólido y plano.
- Muelles con respuesta y amortiguación de Apple en lugar de duraciones fijas.
- Claro y oscuro de primera clase, con contraste AA medido por token.

## Colors

Neutros cálidos con un verde que hace de acción. El azul pizarra y el ámbar existen solo como marcas de entidad.

### Primary (Bosque)
- **Verde que se lee** (`tint`, oscuro `tint-dark`): texto de acción, enlaces ("Planificar", "Deshacer"), pestaña activa, anillo de foco. 8.0:1 sobre la celda y 7.1:1 sobre el fondo; en oscuro, 8.9:1 sobre la celda.
- **Verde relleno** (`tint-fill`, oscuro `tint-fill-dark`): el botón principal ("Hecho"), la cápsula Añadir de la barra lateral, la barra de las tareas en Tu día. Texto encima en `on-tint`: 6.3:1 en claro y en oscuro.
- **Verde suave** (`tint-soft`, oscuro `tint-soft-dark`): el fondo del widget Ahora y de los botones suaves; `tint` encima a 6.6:1 (7.2:1 en oscuro).
- **Verde presionado** (`tint-press`): el estado pulsado de los rellenos.

### Tertiary
- **Azul Pizarra Clase** (`class-slate`, oscuro `class-slate-dark`): la barra de 5px de una clase en Tu día y el punto de clase. En Bosque las clases van en azul porque dos verdes no se distinguirían; con otro color de app, vuelven al verde. 4.9:1 sobre la celda.
- **Ámbar Banderín** (`rem-amber`, oscuro `rem-amber-dark`): el glifo del banderín de un reminder. `rem-soft` es el fondo de la caja de fecha en Se viene. Nunca texto.

### Neutral
- **Papel** (`bg`, oscuro `bg-dark`): el fondo de todas las pantallas y de las hojas. Cálido en claro, casi negro verdoso en oscuro.
- **Celda** (`cell`, oscuro `cell-dark`, `cell-up-dark` dentro de una hoja): los widgets y las celdas agrupadas.
- **Pulsado** (`cell-press`), **pista** (`track`, la barra de avance de un reminder), **relleno de control** (`fill`, `fill-strong` para un chip abierto) y **separador** (`separator`).
- **Etiqueta** (`label`), **secundaria** (`label-secondary`, 6.2:1 sobre la celda y 5.5:1 sobre el fondo) y **terciaria** (`label-tertiary`, solo decoración: asa y chevrón).
- **Control** (`control`): el anillo vacío del círculo de completar (4.1:1 sobre la celda).

### Named Rules
**The Token Rule.** Ningún componente escribe un verde, un ciruela o un hex de acento: todo pasa por `--io-tint*`, porque el color lo elige el usuario.

**The Envelope Rule.** El color envuelve al texto, nunca lo pinta. El ámbar jamás es color de texto; el azul de clase, tampoco.

**The No Red Rule.** No hay rojo en ninguna parte, ni para errores ni para lo vencido. Un reminder pasado no es deuda.

## Typography

**Font:** la del sistema (SF Pro en el iPhone): `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Una sola familia; la jerarquía sale del tamaño y del peso.

### Hierarchy
- **Large Title** (700, 34px): el título de cada pantalla, también "Hoy" en Inicio, con la fecha en 15px secundario encima.
- **Now Title** (700, 22px; 26/32 en escritorio): el título de lo que toca ahora.
- **Headline** (600, 17px, 22px): cabecera de cada widget, título de hoja, texto de los botones de 48px.
- **Body** (400, 17px, 22px): celdas y campos. 17px es el mínimo para que iOS no haga zoom.
- **Row** (400, 16px): título de una fila de Tu día.
- **Subhead** (400 o 600, 15px, 20px): contexto, enlaces de widget, botones suaves, "Deshacer".
- **Footnote** (400, 13px, 18px): hora y lugar bajo una fila, pie de grupo.
- **Tab label** (600, 10px, 12px).

### Named Rules
**The System Spacing Rule.** `letter-spacing` se anula en todo el documento: SF ya espacia por tamaño.

**The Tabular Time Rule.** Toda hora o fecha alineada usa cifras tabulares.

## Layout

En el iPhone, Inicio es una columna con márgenes de 16px. Arriba va la cabecera: fecha y "Hoy" a la izquierda, Ver el día y Ajustes en botones circulares de 44px a la derecha. Debajo, una rejilla de dos columnas con 12px de hueco. El orden de lectura es el orden de prioridad:

1. **Ahora** (ancho completo): la tarea que toca, con Hecho y Después.
2. **Tu día** (ancho completo): clases y tareas con hora, en filas de 52px.
3. **Racha** y **Lo de ayer** (media columna cada uno).
4. **Se viene** (ancho completo): el próximo reminder con su avance.

Listas y hojas: grupos con 14px de margen lateral y celdas de 52px con 16px de relleno; con icono, el separador empieza a 58px. La barra de pestañas flota 14px sobre el indicador de inicio, con el botón flotante de 62px a su derecha. Cada pantalla reserva abajo la altura de la barra más 32px.

Escritorio (desde 900px): manda la barra lateral (cápsula Añadir en verde relleno, filas de radio 12, mini-mes sin borde con hoy en anillo verde). Inicio se abre a tres columnas, con un máximo de 1040px: Ahora (dos columnas) junto a la Racha; Tu día (dos columnas, dos filas) junto a Lo de ayer y Se viene. Los botones de la cabecera se esconden porque ya están en la barra lateral. Con cursor, filas y botones responden al pasar por encima.

### Named Rules
**The Glance Rule.** Lo primero que se ve en Inicio es lo que toca ahora, con su acción a un toque. Nada de totales de lo pendiente.

**The 44 Rule.** Ningún objetivo táctil mide menos de 44×44; cuando el dibujo es menor, un pseudo-elemento extiende el área. Las filas de Tu día son enlaces estirados (`::after`) y su círculo de completar queda encima con `z-index: 1`.

## Elevation & Depth

El contenido es plano: los widgets y las celdas no llevan sombra, son blancos sobre papel (o celda oscura sobre casi negro). El vidrio (`blur(16px) saturate(1.8)`, borde de luz arriba, filete de medio punto y sombra abierta) se reserva para la barra de pestañas, el botón flotante, los botones circulares y las cápsulas de error. Las hojas son opacas, con una sombra amplia y un velo detrás. Con transparencia reducida el vidrio se vuelve sólido; con más contraste lleva un filete de 1px.

### Named Rules
**The Floating Glass Rule.** Vidrio solo en lo que flota. Un widget, una celda o una hoja nunca llevan vidrio.

**The Flat Tile Rule.** Un widget no tiene sombra: su profundidad es el contraste de la celda sobre el papel.

## Shapes

Todo control es una cápsula: botones de 48px (44 los suaves), chips de 36 y botones circulares de 44. Las superficies usan 24px (widgets y grupos), 26px el widget Ahora y 12px (10 en lo más chico) en lo pequeño. Las piezas de sistema llevan su radio de iOS: barra de pestañas 31 (pestaña activa 27), hoja 38, asa 36×5.

Los iconos (`Glyph`) son SVG en línea sobre rejilla de 24 con trazo 1.75 y la geometría de los SF Symbols. El banderín y la llama de la racha son las únicas siluetas rellenas.

### Named Rules
**The One Stroke Rule.** Todos los iconos de línea tienen el mismo grosor (1.75).

## Components

### Widgets de Inicio
- **Ahora:** fondo `tint-soft`, radio 26, relleno 18.
  - Arriba, "Ahora" en 15/600 y la hora en tabular. Debajo, el título en 22/700 y el contexto en 15px secundario, con el banderín si lo prepara un reminder.
  - Botones Hecho (relleno verde) y Después (celda), de 48px.
  - Al cerrar o aplazar aparece una línea "Hecho: …" o "Para después: …" con Deshacer.
  - Vacío: "Hoy está cerrado." o "Nada con fecha para hoy.", con su enlace.
- **Tu día:** filas de 52px.
  - Cada fila lleva una barra de 5px (verde para tarea, azul pizarra para clase), el título en 16px y la hora y el lugar en 13px tabular.
  - La clase en curso lleva el chip "Ahora". Lo pasado y lo hecho van en gris.
  - Las tareas llevan el círculo de completar de 22px.
- **Racha:** llama rellena, número grande y "Te quedan N comodines". Sin racha: "Cierra una tarea hoy y empieza a contar."
- **Lo de ayer:** los títulos de lo que no se cerró y un botón Decidir, que abre la hoja Hoy / Otro día / Quitar.
  - Sin nada pendiente: "Todo decidido."
  - El domingo, este widget pasa a "Armar la semana" con Empezar.
- **Se viene:** caja de fecha en `rem-soft` (día de la semana y número), el título y una pista con el avance de las tareas que lo preparan.

### Buttons
- **Primary:** cápsula `tint-fill` con texto `on-tint` 17/600, de 48px. Una sola por widget.
- **Secondary:** cápsula en celda con texto en etiqueta.
- **Soft:** cápsula `tint-soft` con texto `tint` 15/600, de 44px.
- **Press:** `scale(0.95)` en 80ms y vuelta con el muelle crítico.
- **Focus:** anillo de 2px en `tint` con 2px de separación.

### Chips
Chips de decisión de 36px ("Hoy", "Otro día", "Quitar"), todos con el mismo peso y ninguno por defecto. El abierto pasa a `fill-strong`.

### Navigation
- **Tab bar:** cápsula de vidrio de 62px con cuatro pestañas (Hoy, Calendario, Pendientes, Recursos), glifo de 25px y etiqueta 10/600. La activa va en `tint`. Sin insignias.
- **FAB:** círculo de vidrio de 62px con +, que lleva a `/anadir`.
- **Escritorio:** barra lateral con la misma navegación.

### Sheet
Hoja inferior de iOS: radio 38, máximo 520px, fondo papel, asa y cabecera de tres columnas.
- Entra con el muelle suave y sale con la curva de iOS.
- Se arrastra con resistencia en el borde y proyección de velocidad.
- En escritorio es una hoja de formulario centrada.

### Ajustes · Color
Cinco muestras en un `radiogroup`: Bosque, Ciruela, Petróleo, Índigo y Grafito.
- Cambia toda la app al momento y se guarda en `localStorage` (`organizer:accent`); el layout lo aplica antes de pintar.
- `web/src/lib/theme-colors.ts` repite el fondo de cada color para `theme-color` y el manifiesto: si cambia uno, cambia el otro.

## Do's and Don'ts

### Do:
- **Do** usar la fuente del sistema y dejar el espaciado en `normal`.
- **Do** pintar todo color de acción con `--io-tint*`, nunca con un hex.
- **Do** mantener el orden de Inicio: Ahora, Tu día, Racha y Lo de ayer, Se viene.
- **Do** construir widgets y grupos de radio 24 sin sombra.
- **Do** mover con muelles y degradar a fundidos de 200ms con movimiento reducido.
- **Do** garantizar 44×44 de área táctil.
- **Do** medir el contraste de cada token nuevo en claro y en oscuro, y en cada color de Ajustes.

### Don't:
- **Don't** usar rojo en ningún estado.
- **Don't** usar el ámbar ni el azul de clase como color de texto.
- **Don't** mostrar contadores de deuda: ni insignias ni totales de lo pendiente.
- **Don't** poner vidrio en widgets, celdas u hojas.
- **Don't** poner etiquetas en mayúsculas o kickers sobre un título.
- **Don't** usar emoji como iconos ni una fuente de display distinta de la del sistema.
- **Don't** volver a hacer de Inicio un chat: el usuario lo probó y lo rechazó (2026-10-06).
