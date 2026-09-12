# Sistema visual de Organizer

> Escrito por la sesión de diseño. **Actualizado en FD2** con el modelo de tres
> entidades. Deriva de `briefs/FD-diseno.md`, `briefs/FD2-correcciones.md`,
> `docs/00-problema.md`, `docs/08-modelo-tareas-reminders.md` y las 57
> decisiones de `docs/01-decisiones.md`.
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

| | Qué es | Forma visual | ¿Se completa? |
|---|---|---|---|
| **Materia** | El horario fijo del semestre | Superficie gris de fondo | No |
| **Reminder** | Parcial, entrega, defensa | **Banderín**, sin casilla | **No.** Pasa la fecha y queda listo |
| **Tarea** | Lo que haces | **Círculo de check** | Sí |

**La diferencia se ve sin color.** Una tarea lleva casilla; un reminder lleva
banderín y no tiene nada que marcar; una materia es una superficie que no se
toca. Ningún color nuevo entra en la paleta por esto.

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

| Vista | Pregunta | Muestra | No muestra | Comp |
|---|---|---|---|---|
| **Día** | ¿Qué hago ahora? | Bloques por hora + banda de reminders del día | — | `dia.html` |
| **Semana** | ¿Cómo reparto el trabajo? | 7 filas con sus reminders y los títulos de sus tareas | Horas | `semana.html` |
| **Mes** | ¿Qué se me viene encima? | **Solo reminders** | Tareas y materias | `mes.html` |

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
| `index.html` | Índice de revisión. Se abre desde el iPhone (decisión 46) |
| `comps/` | Las pantallas. Un archivo puede contener **dos dispositivos** cuando el sentido está en comparar dos estados (`tareas`, `reminder-detalle`) |

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
verificado en navegador después de subir los cuatro controles a 44px.

Orden (decisión 55) y reparto aproximado:

| Bloque | px |
|---|---|
| Encabezado (solo la fecha) | 66 |
| **1 · "Hoy"**: encabezado + 3 filas + salida a Tareas | 260 |
| **2 · "De ayer"** con el triage a 44px | 190 |
| **3 · "Esta semana"**: un reminder con su preparación | 70 |
| **4 · La racha**: una línea | 34 |

**Qué se recortó y por qué.** Subir el triage de 40 a 44 y "se me corrió el
día" de 32 a 44 dejó la pantalla 16px por encima del límite. Salió la cuarta
tarea del día — contenido, no tamaño de control. Con TDAH tres cosas visibles
son mejores que cuatro apretadas, y la que falta está a un toque.

Si hay más tareas de las que caben, **no se hace scroll**: se muestra la
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
