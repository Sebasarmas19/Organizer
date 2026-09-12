# Sistema visual de Organizer

> Escrito por la sesión de diseño. **Actualizado en FD3** con el sistema de
> color por entidad y el calendario de tres niveles. Deriva de
> `briefs/FD-diseno.md`, `briefs/FD2-correcciones.md`,
> `briefs/FD3-calendario-color.md`, `docs/00-problema.md`,
> `docs/08-modelo-tareas-reminders.md` y las 73 decisiones de
> `docs/01-decisiones.md`.
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

## Las tres entidades

`docs/08-modelo-tareas-reminders.md` las define; esto es cómo se ven.

| | Qué es | Forma visual | Color (FD3) | ¿Se completa? |
|---|---|---|---|---|
| **Materia** | El horario fijo del semestre | Superficie de fondo | **Verde** | No |
| **Reminder** | Parcial, entrega, defensa | **Banderín**, sin casilla | **Ámbar** | **No.** Pasa la fecha y queda listo |
| **Tarea** | Lo que haces | **Círculo de check** | **Azul marino** | Sí |

**La diferencia se ve sin color, y además con color.** Una tarea lleva casilla;
un reminder lleva banderín y no tiene nada que marcar; una materia es una
superficie que no se toca. El color de FD3 es una segunda codificación que
reafirma la forma —nunca la sustituye—, así que la app se sigue leyendo en
escala de grises y para alguien que no distinga el verde del ámbar.

### Las tres reglas que el diseño tiene que sostener

1. **Ninguna pantalla pregunta "¿esto es tarea o reminder?"** (decisión 48).
   El lugar donde entras lo determina: Siri y el módulo Tareas hacen tareas,
   tocar un día del calendario hace un reminder, el formulario de horario hace
   materias. Por eso la pestaña de Reminders **no tiene botón de añadir**: esa
   ausencia es la decisión hecha interfaz.
2. **Las tareas sin reminder no son de segunda clase** (decisión 51). El módulo
   Tareas abre en la pestaña de Tareas, y una tarea con banderín y una sin él
   se dibujan con el mismo peso, una debajo de la otra. El banderín informa; no
   crea una segunda división.
3. **Un reminder pasado no es deuda** (decisión 49). Baja al histórico solo:
   se apaga (`.rem--past`), no se tacha, no lleva insignia y no se persigue.
   Es tiempo que pasó, no una falta del usuario.

### La relación es el producto

Guardar una fecha lo hace cualquier app. Lo que ninguna da:

```
Parcial de Cálculo — viernes 18
  ✓ Resolver la guía del capítulo 3
  ✓ Resumen de derivadas
  □ Repaso final                         falta 1
```

y su contrario:

```
Defensa del proyecto — en 6 días
  Sin tareas todavía                     [Planificar]
```

Eso responde *"¿me estoy preparando, o solo lo sé?"*, que es la distancia
entre anotar y cumplir — el problema que origina el proyecto.

**Cómo se dibuja la alerta sin alarmar.** El caso "sin tareas todavía" tiene
que notarse y **no puede llevar rojo**: no es una falta del usuario, todavía
está a tiempo. La solución del sistema:

- la señal la da el **peso tipográfico** (`.prep--none` sube a color de texto
  pleno y peso medio, frente al gris del resto),
- el icono de aviso va en `--text-muted`, nunca en un color de alarma,
- y **el acento aparece como acción** — el botón "Planificar" — no como
  advertencia.

La preparación se cuenta con tres puntos y una frase (`.prep`), nunca con un
porcentaje ni una barra de progreso.

### Materias = ausencia de tiempo disponible

En palabras del usuario: *"no es que por tener Sistemas Operativos a las 8
cambiemos la planificación; nos importa más el tiempo que tenemos disponible"*.

Por eso una materia no es contenido: es un hueco ocupado. Gris, plana, texto
subordinado, sin borde de color, y **apagable**. Al apagar la capa Materias en
`Semana`, el sábado deja de ser "sin clases" y pasa a leerse como "día entero
libre", que es lo que estabas buscando al planificar.

---

## El calendario: tres vistas, tres preguntas

No es el mismo contenido en letra más chica.

Y desde FD3 tampoco son tres pantallas sueltas: son **tres niveles de zoom de
la misma escalera**, Mes → Semana → Día, que se suben con un botón de nivel en
la esquina superior izquierda (`.uplevel`), al estilo del Calendar de iOS.

| Nivel | Pregunta | Muestra | No muestra | Comp |
|---|---|---|---|---|
| **Día** | ¿Qué hago ahora? | Tira de 7 días arriba + carril de horas a la izquierda + banda ámbar de reminders | — | `dia.html` |
| **Semana** | ¿Cómo reparto el trabajo? | Carril de días a la izquierda con el plan completo: tareas, reminders y materias juntos (decisión 69) | Horas | `semana.html` |
| **Mes** | ¿Qué se me viene encima? | **Solo reminders**, en puntos ámbar | Tareas y materias | `mes.html` |

**La cabecera es idéntica en los tres niveles**, y ahí está lo que hace que se
sientan una sola pantalla y no tres:

```
[ subir de nivel ] ·············· [ Hoy ] [ ‹ ] [ › ] [ + ]
```

En Mes, que es el techo de la escalera, el título ocupa el sitio exacto del
botón de subir, así que al cambiar de nivel la cabecera no se mueve un píxel.

**Las flechas viven en la cabecera y no flanqueando la tira de días**, aunque
la referencia las pusiera ahí. La razón es aritmética y manda sobre la
referencia: 44 + 44 de flechas más siete días de 44 son 396px en una pantalla
de 390. Flanquear la tira obligaba a dejar los días en 36px, que es
exactamente el fallo que FD2 corrigió. Sale la colocación, no el control.

**Un solo sitio para crear:** el `+` de la cabecera y el botón flotante abren
`anadir.html`.

### El escritorio

| Vista | Qué añade | Comp |
|---|---|---|
| **Semana** | Rejilla horas × días con un panel de **tareas sin planificar** que se arrastran a la rejilla | `semana-escritorio.html` |
| **Mes** | Panel flotante al seleccionar un día —anclado **al lado** del día, nunca encima— con formulario de añadir | `mes-escritorio.html` |

El panel de "Sin planificar" va a la **izquierda** de la rejilla: es el origen
del gesto, y en lectura de izquierda a derecha el origen va antes que el
destino. Un panel a la derecha obliga a arrastrar hacia atrás.

**La vista Semana en el teléfono no es una rejilla**, y eso resuelve la
pregunta que quedó abierta en `docs/estado-FD.md` §3.1: siete columnas por
horas a 390px son ilegibles, pero es que además "¿cómo reparto el trabajo?" no
necesita horas. Siete filas responden mejor y se arrastran con el pulgar. La
rejilla completa sigue existiendo en escritorio, donde sí cabe.

**En Mes no hay control de capas**: ahí siempre son reminders. Meterle tareas
o materias arruinaría la única pregunta que responde.

### Las capas

Un solo control hace de filtro y de interruptor de materias: tres pastillas
que se encienden por separado (`Tareas · Reminders · Materias`). Da
"solo tareas", "solo reminders", "ambos" y, sobre todo, apagar las materias.
Un control, no dos vocabularios.

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
| `index.html` | Galería de comps, con su marco de dispositivo |
| `revision.html` | Índice de revisión. Se abre desde el iPhone (decisión 46) |
| `_audit.html` | **Arnés de verificación.** No es app. Ver abajo |
| `comps/` | Las pantallas. Un archivo puede contener **dos dispositivos** cuando el sentido está en comparar dos estados (`tareas`, `reminder-detalle`, `anadir`, `mes-escritorio`) |

### `_audit.html`

Carga los 15 comps en iframes, les fuerza el tema y **mide cada elemento
interactivo**: reporta todo lo que baje de 43.5px, todo desbordamiento
horizontal y todo `.screen--fixed` que desborde de alto. Se corre sin ojo
humano:

```sh
chrome --headless=new --dump-dom --virtual-time-budget=9000 \
       "http://localhost:PORT/_audit.html?theme=light"
```

Tiene tres exclusiones, las tres documentadas dentro del archivo: el `input`
dentro de `.field` (el objetivo táctil es el campo entero, de 44px), `.seg
button` (mide 38 porque el carril le suma 3+3) y `.sr-only`. **Se queda en el
repo**: la regla de los 44px se incumplió dos veces por no tener con qué
comprobarla.

---

## Color

**Neutros cálidos y tres colores que dicen QUÉ TIPO DE COSA ES** (decisiones
63–66). El color dejó de significar "contexto" y pasó a significar entidad:

| Entidad | Color | Token |
|---|---|---|
| **Tarea** | Azul marino | `--task` |
| **Materia** | Verde | `--class` |
| **Reminder** | Ámbar | `--rem` |

### La regla que manda sobre las tres

> **El color envuelve al texto, nunca lo pinta.**

Barra lateral, fondo tintado, píldora, punto, banderín: todo vale. Texto de
color, no. La razón es medible y no es estética: **un ámbar que llegue a 4.5:1
sobre blanco ha dejado de ser ámbar y es marrón.** Así que el color se va a la
superficie y el texto se queda en `--text`, que mide ~14.8:1 encima de
cualquiera de los tres tintes suaves. El resultado es que los tres colores
pueden ser colores de verdad —reconocibles de un vistazo— sin negociar con el
contraste ni una sola vez.

**Una sola excepción: el azul como texto de acción.** En un enlace o un
`.taptext`, el azul no está etiquetando una tarea: está diciendo "esto se
toca". Por eso `--task` se mide como texto (10.5:1) y no como indicador.

### El acento es el azul de tareas

El acento del sistema era petróleo; ahora **es `--task`** (decisión 65). No es
un cambio de gusto: si las materias son verdes, el verde ya no puede
significar "esto se toca" sin ambigüedad, y añadir un cuarto color sólo para
"acción" rompería la regla de un acento. `--accent` queda como alias de
`--task`.

Sigue usándose en exactamente tres sitios y en ninguno más: la acción primaria
de la pantalla, el bloque **en curso**, y la racha.

Y siguen en pie:

- **No existe un rojo en la paleta.** Una tarea no cumplida se muestra en tono
  neutro con la pregunta de qué hacer (decisión 22). En el calendario, un
  bloque que pasó sin cerrarse lleva contorno punteado neutro, no color.
- **Cumplido no es acento… pero la casilla sí.** La casilla marcada se rellena
  de `--task`, porque **la casilla ES la tarea**: es el único sitio donde el
  azul identifica en vez de celebrar. El título baja a `--text-faint` y se
  tacha con una línea de 1px; no hay insignia, ni confeti, ni cambio de color
  en el resto de la fila.
- **Las materias no compiten.** Verde suave de fondo, título en `--text-muted`
  y a tamaño meta. Identifica; no es contenido (decisión 52).

### Lo que se borró

`--ctx-1` … `--ctx-6` ya no existen. **El contexto pasa a ser texto plano**
(decisión 64). Seis colores desaturados para "Universidad / Personal /
Trabajo…" competían con los tres que sí significan algo, y además ninguno de
los seis resistía la pregunta "¿cuál era el morado?". Un color que hay que
recordar no está comunicando nada.

### Contraste medido

Cada par está medido con luminancia relativa, no estimado. Texto ≥ 4.5:1 (AA);
indicador no textual ≥ 3:1 (WCAG 1.4.11). Los ratios también van anotados al
lado de cada token en `tokens.css`.

**Claro** — `--bg` = `#FAF8F5`

| Token | Valor | Sobre | Ratio | Exigido |
|---|---|---|---|---|
| `--text` | `#1B1917` | `--bg` | **16.5:1** | 4.5 |
| `--text` | `#1B1917` | los tres tintes suaves | **14.8:1** | 4.5 |
| `--text-muted` | `#625B51` | `--bg` | **6.3:1** | 4.5 |
| `--text-faint` | `#6E675E` | `--bg` | **5.3:1** | 4.5 |
| `--text-on-accent` | `#FFFFFF` | `--task` | **11.1:1** | 4.5 |
| `--task` | `#1E3A6F` | `--bg` | **10.5:1** | 4.5 · es texto de acción |
| `--task-press` | `#16294F` | blanco | **14.3:1** | 4.5 |
| `--class` | `#2F6B46` | `--bg` | **6.0:1** | 3 |
| `--rem` | `#B26B00` | `--bg` | **4.0:1** | 3 |
| `--line-control` | `#8E877C` | `--bg` | **3.35:1** | 3 |

**Oscuro** — `--bg` = `#121110`

| Token | Valor | Sobre | Ratio | Exigido |
|---|---|---|---|---|
| `--text` | `#F3F0EA` | `--bg` | **16.6:1** | 4.5 |
| `--text-muted` | `#A79F93` | `--bg` | **7.2:1** | 4.5 |
| `--text-faint` | `#8C8478` | `--bg` | **5.1:1** | 4.5 |
| `--text-on-accent` | `#0B1220` | `--task` | **9.0:1** | 4.5 |
| `--task` | `#93B4F2` | `--bg` | **9.0:1** | 4.5 |
| `--class` | `#79C296` | `--bg` | **9.0:1** | 3 |
| `--rem` | `#E3B268` | `--bg` | **9.7:1** | 3 |
| `--line-control` | `#736C63` | `--bg` | **3.6:1** | 3 |
| `--text` | `#F3F0EA` | `--task-soft` `#18243D` | **13.6:1** | 4.5 |
| `--text` | `#F3F0EA` | `--class-soft` `#15271C` | **13.8:1** | 4.5 |
| `--text` | `#F3F0EA` | `--rem-soft` `#2E2412` | **13.4:1** | 4.5 |

En oscuro los tres colores se aclaran: un azul marino literal sobre negro es
invisible. **No son derivados** del claro — están autorizados uno a uno, y
medidos uno a uno.

### `--line-control`, el tercer gris de línea

Un borde que es **la única señal de que algo es un control** —la casilla
vacía, el borde de un campo, un botón fantasma— no es decoración: es un
indicador no textual y necesita 3:1 (WCAG 1.4.11). `--line` (`#E4DFD6`) no
llega ni de lejos, y estaba haciendo ese trabajo. Por eso existe un tercer
gris, y por eso `--line` se queda sólo para separar filas.

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
- **44×44px de área táctil mínima, sin excepción.** En FD esto estaba escrito
  en `tokens.css` y luego incumplido justo en los controles más usados —el
  triage, "se me corrió el día", el deshacer— que eran los más pequeños de la
  app. Corregido en FD2, y con una regla que lo impide en adelante:

  > **Si al respetar los 44px algo deja de caber, sale contenido, nunca el
  > tamaño del control.**

  El sistema ofrece tres formas de conseguirlos sin engordar la tipografía:

  | Cuando el control es | Usa | Cómo llega a 44 |
  |---|---|---|
  | Un enlace de texto ("Clasificar", "Editar") | `.taptext` | alto 44 con margen negativo, el texto sigue alineado |
  | Solo un icono | `.tapicon` | caja de 44 con el icono de 20 centrado |
  | Una pastilla pequeña (filtros) | `.chip` | borde transparente de 5px + `background-clip: padding-box`: **se pinta 34 y mide 44** |

  El `.chip` usa borde transparente y no un `::before` absoluto a propósito:
  así la caja de layout es la real y dos filas de pastillas no pueden solapar
  sus áreas táctiles por mucho que se apriete el `gap`.

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
| **Orden de `Inicio`: Hoy → De ayer → Esta semana → racha** (decisión 55) | `inicio.html` |
| **Triage:** Hoy sube a la lista en el sitio · Otro día abre el selector · **Quitar devuelve a Tareas, no borra** (decisión 56) | `inicio.html`, `otro-dia.html` |
| Elegir fecha empieza por palabras ("mañana", "el sábado"), no por un calendario | `otro-dia.html` |
| Crear un reminder = tocar un día del calendario. Nunca un desplegable de tipo | `mes.html`, `dia.html` |
| Asociar una tarea a un reminder es una pastilla apagada que se ignora con intro | `tareas.html` |
| El horario se carga una vez: un nombre, varios días, y se repite 5 meses | `horario.html` |

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

**El reminder manda** (decisión 57). Si hay un parcial o una entrega cerca,
ocupa el **título** y las tareas se recortan para que quepa, nunca al revés:
con 88 caracteres, un parcial mañana es lo más importante del día.

```
Mañana: Parcial de Cálculo                                    26
Hoy: 8:00 Cálculo · 15:00 Migrar el schema · 20:00 Repaso     63
```

Y sin ningún símbolo de alarma —ni triángulo, ni "ojo"—: la urgencia la da la
frase, no un glifo.

Los seis textos, con su largo real, están en `comps/notificacion.html`.

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
verificado en navegador con `_audit.html` y no a ojo.

**Orden nuevo en FD3** (decisión 71): Hoy → Esta semana → De ayer.

| Bloque | px |
|---|---|
| Encabezado: fecha **+ la racha a su derecha** | 66 |
| **1 · "Hoy"**: encabezado + 3 filas + salida a Tareas | 260 |
| **2 · "Esta semana"**: dos reminders con su preparación | 140 |
| **3 · "De ayer"** con el triage a 44px, pegado abajo | 190 |

**Por qué cambió el orden.** "De ayer" estaba en segundo lugar, a media
pantalla, y eso lo convertía en lo segundo que se lee al abrir: la deuda antes
que el plan. Ahora cierra la pantalla. Sigue estando —nada se pierde en
silencio— pero se lee después de lo que sí se puede hacer hoy. El bloque lleva
`margin-top: auto`, así que se ancla abajo tenga el contenido que tenga.

**La racha se subió al encabezado** (decisión 63 aplicada): pastilla de azul
suave junto a la fecha, no una línea al final. Abajo era lo último que se leía
—el sitio de una conclusión— y una racha no concluye nada; arriba es un dato
de estado, al lado de otro dato de estado.

**"Se me corrió el día" se eliminó** (decisión 72), y **no se sustituyó por
nada**. Era un botón que pedía declarar el fracaso del día entero antes de
haber hecho nada. El triage de "De ayer" ya hace ese trabajo, tarea a tarea y
sin ceremonia.

**Qué se recortó y por qué.** Subir el triage de 40 a 44 dejó la pantalla por
encima del límite en FD2, y salió la cuarta tarea del día — contenido, no
tamaño de control. En FD3, quitar el botón liberó sitio para un segundo
reminder en "Esta semana".

Si hay más tareas de las que caben, **no se hace scroll**: se muestra la
salida "El resto está en Tareas". Sin número: un número ahí sería un contador
de deuda.

---

## Lo que este sistema prohíbe

Sale del brief, y cada prohibición tiene una razón, no un gusto:

1. Rojo, alarma o reproche para lo no cumplido.
2. Contadores de deuda acumulada, badges numéricos, barras de progreso semanal.
3. Gamificación: insignias, puntos, confeti, niveles. La racha es una pastilla
   de azul suave con el texto en `--text`: informa, no puntúa. **No es texto
   azul** — eso la leería como una tarea (decisión 63).
4. Ilustraciones y mascotas.
5. Gradientes y sombras decorativas.
6. Scroll horizontal en el cuerpo (por eso los filtros de Recursos envuelven).
7. Más de un color de acento. Tarea, materia y reminder **no son tres
   acentos**: son tres etiquetas de tipo. El acento —lo que dice "esto se
   toca"— sigue siendo uno solo.
8. Que las materias compitan con las tareas.
9. **Texto ámbar y texto verde.** El color de entidad va a la superficie.
10. Color como única señal de nada. Casilla, banderín y superficie distinguen
    las tres entidades sin él.
