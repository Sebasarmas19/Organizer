---
name: Organizer · FD5 «Calma»
description: PWA de planificación personal, iPhone primero. Un solo elemento saturado por pantalla.
colors:
  # ---------- claro
  bg: "#F6F7F9"
  surface: "#FFFFFF"
  sunken: "#EEF0F3"
  line: "#E2E5EA"
  ink: "#0E1116"
  muted: "#596070"
  faint: "#666D7C"
  navy: "#1E3A6F"
  on-navy: "#FFFFFF"
  navy-sub: "#CAD6EE"
  navy-soft: "#E7EDF7"
  accent-text: "#1E3A6F"
  amber: "#B26B00"
  amber-soft: "#FBEFD9"
  amber-track: "#EED9B4"
  on-amber-soft: "#3A2A08"
  green: "#2F6B46"
  # ---------- oscuro
  bg-dark: "#0C111D"
  surface-dark: "#151C2C"
  sunken-dark: "#121927"
  line-dark: "#232D44"
  ink-dark: "#ECEFF5"
  muted-dark: "#A3ABBC"
  faint-dark: "#8E97AA"
  navy-dark: "#2C5299"
  navy-sub-dark: "#D5DFF3"
  navy-soft-dark: "#1B2945"
  accent-text-dark: "#9DB7F0"
  amber-dark: "#E8A53A"
  amber-soft-dark: "#3A2B10"
  amber-track-dark: "#4A3A1E"
  on-amber-soft-dark: "#F7E9CF"
  green-dark: "#54B485"
typography:
  day-number:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.045em"
  page-title:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.022em"
  lead-title:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.022em"
  weekday:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  body:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  secondary:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  time:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.4
  section-label:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.01em"
  tab-label:
    fontFamily: "IBM Plex Sans, -apple-system, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  pill: "999px"
  sm: "10px"
  md: "12px"
  control: "14px"
  strip: "16px"
  card: "18px"
  lead: "22px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  gutter: "20px"
  "6": "24px"
  section: "28px"
  tap: "44px"
components:
  lead-block:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    typography: "{typography.lead-title}"
    rounded: "{rounded.lead}"
    padding: "18px"
  button-done:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    height: "48px"
  button-later:
    backgroundColor: "transparent"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.control}"
    height: "48px"
  button-outline-small:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "11px"
    height: "36px"
    padding: "0 14px"
  tab-add:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "15px"
    width: "52px"
    height: "46px"
  reminder-chip:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.on-amber-soft}"
    rounded: "{rounded.pill}"
    padding: "5px 10px 5px 8px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  yesterday-strip:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.muted}"
    rounded: "{rounded.strip}"
    padding: "4px 4px 4px 16px"
  busy-band:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
---

# Design System: Organizer · FD5 «Calma»

> Aprobado por Sebastián el 2026-10-06 tras cuatro rondas de maquetas.
> Sustituye a FD3/FD4 como contrato visual de `web/`. La versión anterior de
> este archivo (FD3) sigue en el historial de git; el resto de `app/comps/` queda como
> historia: no describe lo que se construye a partir de ahora.
> La funcionalidad no cambia con FD5: solo cómo se ve.
> Referencia visual aprobada: `app/comps/fd5/index.html` (ábrelo en el navegador).
>
> Los valores viven en `app/tokens.css` (copia exacta en
> `web/src/styles/tokens.css`, vigilada por `npm run check:design`). La tabla
> de abajo dice qué nombre CSS lleva cada token.

## Overview

Organizer se abre desde una notificación, casi siempre de pie o caminando, por
alguien con TDAH. Abrir la app tiene que bajar la ansiedad. FD5 lo resuelve con
una sola idea: **cada pantalla tiene un único elemento que grita** (el bloque
azul marino de la tarea siguiente en Inicio) y todo lo demás es calma: listas con
filetes finos, títulos de sección pequeños y grises, mucho aire entre secciones.

Base clara, esquinas redondeadas, azul marino como color principal. IBM Plex
Sans e iconos Reicon Outline (grosor 1.5) son fijos. Hay modo claro y modo
oscuro, ambos completos.

## Colors

Estrategia **restringida**: neutros fríos + un azul marino que lleva la acción, y
dos colores de entidad (ámbar = reminder, verde = clase) que solo aparecen como
superficie, punto, banderín o segmento.

### Primary
- **Azul marino** `navy` `#1E3A6F` (oscuro `#2C5299`): el bloque de la tarea
  siguiente, el botón **+** de la barra, la línea de «Ahora», el estado activo.
- **Texto de acción** `accent-text` `#1E3A6F` (oscuro `#9DB7F0`): enlaces como
  «Horario», «Ver el día», «Decidir», «Volver». Es la única forma en que un color
  toca el texto.

### Entidades
- **Reminder · ámbar** `amber` `#B26B00` (oscuro `#E8A53A`): banderín, segmentos
  de preparación, línea de estaciones del detalle. La pastilla usa `amber-soft`
  con texto `on-amber-soft`.
- **Clase · verde** `green` `#2F6B46` (oscuro `#54B485`): un punto de 7px junto a
  la clase, la etiqueta «Ahora» del horario. Nunca un bloque verde con nombre.
- **Tarea**: no tiene color propio fuera del azul marino; su marca es la forma
  (círculo de check).

### Neutral
`bg` `#F6F7F9` · `surface` `#FFFFFF` · `sunken` `#EEF0F3` · `line` `#E2E5EA` ·
`ink` `#0E1116` · `muted` `#596070` · `faint` `#666D7C`.
Oscuro: `#0C111D` · `#151C2C` · `#121927` · `#232D44` · `#ECEFF5` · `#A3ABBC` · `#8E97AA`.

### Nombres en `tokens.css`
El YAML de arriba usa nombres cortos; el CSS conserva los de FD4 para no
romper las capas que ya existen.

| FD5 | CSS |
|---|---|
| bg · surface · sunken | `--bg` · `--surface` · `--surface-sunken` |
| line | `--line` (filete) · `--line-control` (borde que identifica un control) |
| ink · muted · faint | `--text` · `--text-muted` · `--text-faint` |
| navy (relleno) | `--task` · alias `--accent` |
| on-navy · navy-sub | `--text-on-accent` · `--text-on-accent-sub` |
| navy-soft | `--task-soft` · alias `--tint-task` |
| accent-text | `--accent-text` (texto, anillos, líneas finas) |
| amber · amber-soft · amber-track · on-amber-soft | `--rem` · `--rem-soft` · `--rem-track` · `--text-on-rem-soft` |
| green | `--class` |

**Dos azules.** `--task` es relleno y siempre lleva texto blanco encima.
`--accent-text` es el azul que se lee sobre el fondo. En claro coinciden; en
oscuro no (`#2C5299` mide 2.5:1 sobre el fondo y no sirve como línea ni texto).

### Contraste medido (AA)
| Par | Claro | Oscuro |
|---|---|---|
| ink / bg | 17.6 | 16.4 |
| muted / bg | 5.9 | 8.2 |
| muted / surface | 6.3 | 7.4 |
| faint / bg | 4.85 | 6.4 |
| muted / sunken | 5.5 | 7.6 |
| accent-text / bg | 10.4 | 9.4 |
| blanco / navy | 11.1 | 7.6 |
| navy-sub / navy | 7.6 | 5.7 |
| on-amber-soft / amber-soft | 12.2 | 11.4 |
| ámbar (icono) / bg · no texto, ≥3:1 | 3.9 | 8.9 |
| verde (punto) / bg · no texto, ≥3:1 | 5.9 | 7.4 |

### Named Rules
- **Un solo elemento saturado por pantalla.** En Inicio es el bloque de la tarea
  siguiente. La única excepción fija es el botón **+** de la barra inferior
  (acción principal de la app, presente en todas las pantallas).
- **El ámbar nunca es color de texto.** Va en superficie (pastilla con texto
  oscuro), banderín, segmento o línea.
- **Sin rojo.** Nada se dibuja como alarma ni deuda; un reminder pasado se apaga.
- **Las clases van en gris con punto verde.** Texto `muted`, punto `green` de 7px
  y el aula detrás («Electricidad y magnetismo · L027»).

## Typography

IBM Plex Sans (cargada con `next/font`, cae al stack del sistema). Cifras
tabulares en toda hora y fecha (`font-variant-numeric: tabular-nums`).

### Hierarchy
| Rol | Tamaño / peso | Dónde |
|---|---|---|
| day-number | 56 / 700, −0.045em | El «5» de Inicio, alineado con «Lunes / octubre» |
| page-title | 30 / 700 | Pendientes, Horario, título del reminder |
| (día) | 26 / 700 | «Lunes 5 de octubre» en la vista Día |
| lead-title | 25 / 700, `text-wrap: balance` | Título del bloque de la tarea siguiente |
| (captura) | 24 / 700 | Título en la tarjeta de clasificar |
| weekday | 20 / 600 | «Lunes» junto al número |
| body | 16 / 500 | Títulos de fila, tareas, terminales |
| secondary | 15 / 400 | Clases (gris), notas, botones de día |
| time | 14 / 600 | Columna de hora, enlaces |
| meta | 13 / 400 | Subtítulos, «Siguiente: …», aula |
| section-label | 13 / 600, `muted` | «Resto de hoy», «Se viene», «Para prepararlo» |
| tab-label | 12 / 500 | Etiquetas de la barra inferior y pastillas |

Ningún texto legible baja de 12px; los nombres de estaciones del detalle van a 16/13px.

## Layout

- Lienzo de diseño: **390px** (iPhone). Escritorio es secundario.
- Margen lateral `gutter` **20px**. Escala de 4px: 4 · 8 · 12 · 16 · 20 · 24 · 28.
- Entre secciones **28px** por encima del título de sección y 4px por debajo: el
  título pertenece a lo que tiene debajo.
- Filas de lista ≥48px de alto con filete de 1px `line` entre ellas.
- Toda zona táctil mide **≥44×44px**. Los botones visualmente pequeños (36px:
  «Planear», «Planificar», «Editar») amplían su área con un pseudo-elemento.
- Barra inferior de 84px con 5 posiciones: Inicio · Calendario · **+** · Pendientes · Recursos.

### Inicio, de arriba abajo
1. Cabecera: «5» + «Lunes / octubre» · botón con borde «Planear» · engranaje (sin caja).
2. Bloque de la tarea siguiente (lo único saturado): título, hora, pastilla del
   reminder, **Hecho** (1.6fr) / **Después** (1fr).
3. «Resto de hoy» con enlaces «Horario» y «Ver el día»: lista con hora a la
   izquierda; una fila discreta «10:40 Ahora» con línea fina azul; clases en gris
   con punto verde y aula. Sin clases: «Sin clases hoy» + «Mañana empieza con…».
4. Franja «Lo de ayer espera que decidas · Decidir» (solo si hay tareas de ayer sin hacer).
5. «Se viene»: una fila por parcial o entrega: banderín + título + fecha; barra
   de 3 segmentos y «Siguiente: … · hoy». Sin preparación: «Sin preparación» +
   «Planificar» pequeño con borde.

### Materias en el sistema
- Las clases de **hoy** solo aparecen en Inicio, dentro de «Resto de hoy».
- El horario **completo** es `/clases`: una tarjeta por día con hora, materia y
  aula; etiquetas «Ahora» y «Siguiente»; «Editar» arriba.
- **El Calendario (Mes, Semana, Día) no muestra materias.** En la vista Día una
  clase es una franja gris neutra (`busy-band`) con el texto «En clase», sin
  nombre ni aula, detrás de las tareas y sin interacción.

## Elevation & Depth

Casi plano. Dos sombras solamente:
- Bloque de la tarea siguiente: `0 12px 28px -16px rgba(30,58,111,.5)` (oscuro: `rgba(0,0,0,.7)`).
- Tarjeta de clasificar: `0 10px 26px -16px rgba(14,17,22,.3)` más el filete.

Tarjetas, franjas y controles se separan con un filete de 1–1.5px `line`, no con sombra.

## Shapes

Redondeado suave y coherente: 10 (franja «En clase», chips pequeños) · 11
(botones con borde de 36px) · 12 (bloques del calendario, inputs) · 14 (botones
y segmentados de 44–48px) · 16 (franja «Lo de ayer») · 18 (tarjetas) · 22
(bloque de la tarea siguiente) · píldora para pastillas y etiquetas.

Formas por entidad: tarea = círculo de check (2px), reminder = banderín Reicon,
clase = punto de 7px. El terminal de la línea de estaciones es un cuadrado
ámbar de radio 8 con banderín blanco.

## Components

### Buttons
- **Hecho**: blanco sobre el bloque azul, texto azul marino, 48px, radio 14.
- **Después**: transparente con borde blanco al 55%, 48px.
- **Con borde pequeño** («Planear», «Planificar», «Editar»): 36px visibles, borde
  1.5px `line`, texto `ink` (o `accent-text` en «Planificar»), área táctil 44px.
- **+ de la barra**: azul marino relleno, icono blanco, 52×46, radio 15.

### Chips
- Pastilla de reminder: `amber-soft`, banderín ámbar de 13px, texto `on-amber-soft` 13/600.
- Etiqueta de clase «Ahora»: verde al 14% sobre la superficie, borde verde al 50%,
  texto `ink`. «Siguiente»: solo borde `line`, texto `muted`.

### Cards / Containers
- Tarjeta: `surface`, radio 18, filete `line`. La tarjeta de hoy en `/clases`
  lleva el filete en azul marino al 45%.
- Listas de Inicio: sin tarjeta, directamente sobre `bg` con filetes.

### Inputs / Fields
46px, radio 12, borde 1.5px `line`, placeholder `faint`. Chips de fecha de 36px en píldora.

### Navigation
Barra inferior fija de 84px, fondo `bg`, filete superior. Activo: icono y texto
en `accent-text`. Pantallas de detalle: «‹ Volver» a la izquierda, acción con
borde a la derecha.

### Clasificar (Pendientes)
Tarjeta con el título de la captura, «Capturado hace N días», «¿Cuándo lo
haces?» y cuatro botones de día en filas de 52px con la fecha a la derecha:
«Hoy · lun 5», «Mañana · mar 6», «Próximos días · mié – dom», «Algún día · sin
fecha». Debajo, «Dejar sin fecha por ahora» como enlace de 44px. Sin letras de
atajo en móvil (los atajos H/M/P/A siguen en escritorio).

### Línea de estaciones (detalle del reminder)
Línea vertical ámbar de 4px: tramo lleno hasta la última tarea hecha y tramo
`amber-track` el resto. Cada estación es el círculo de check de la tarea (30px;
lleno azul marino con check blanco si está hecha) con título 16px y fecha 13px.
Termina en el cuadrado ámbar del reminder. Encima, la barra segmentada (6px) y
«1 de 3 tareas hechas». Solo aquí se ve la línea completa; en Inicio se resume
en 3 segmentos y una línea «Siguiente».

## Do's and Don'ts

### Do:
- **Do** dejar un solo elemento saturado por pantalla (más el **+** de la barra).
- **Do** poner las clases en texto `muted` con punto verde de 7px y el aula.
- **Do** usar cifras tabulares en horas y fechas.
- **Do** medir 44×44px de zona táctil en todo lo que se toca.
- **Do** separar con filetes de 1px y aire (28px entre secciones) antes que con cajas.
- **Do** mantener el modo oscuro con los tokens `-dark`; la línea y los enlaces
  usan `accent-text-dark` para leerse sobre el azul noche.

### Don't:
- **Don't** usar el ámbar como color de texto.
- **Don't** usar rojo, insignias de deuda ni contadores de «atrasadas».
- **Don't** pintar materias en Mes, Semana ni Día; en Día solo la franja «En clase».
- **Don't** poner un segundo bloque saturado en Inicio (ni la línea de metro, ni
  tarjetas de color, ni el número del día en grande compitiendo).
- **Don't** usar emoji ni glifos unicode como iconos; solo Reicon Outline.
- **Don't** bajar de 12px en texto legible.
