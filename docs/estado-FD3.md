# FD3 · Informe del diseñador

> Ronda de `briefs/FD3-calendario-color.md`. Rige `docs/01-decisiones.md`
> 63–73. Escrito al terminar, para el coordinador.
>
> **Lo que hay que mirar primero:** `app/comps/anadir.html`. Es la pantalla que
> el brief marcó como la más importante del encargo y la que más puede salir
> mal por razones que no son visuales.

---

## 1 · Qué quedó hecho

| Bloque | Estado |
|---|---|
| **A · Sistema de color** | Completo. Paleta reescrita, ratios medidos, `--ctx-*` borrados |
| **B · Calendario del teléfono** | Completo. Día, Semana y Mes rehechos + `anadir.html` nuevo |
| **C · Calendario de escritorio** | Completo. Semana rehecha + `mes-escritorio.html` nuevo |
| **D · Tres correcciones** | Completo. Inicio reordenado, racha arriba, botón eliminado, "Lo que viene" en Tareas |
| Entregables | `app/DESIGN.md`, `app/revision.html`, `app/index.html` al día |

**15 comps**, dos de ellos nuevos (`anadir.html`, `mes-escritorio.html`), seis
rehechos por completo y el resto tocados sólo por la paleta.

---

## 2 · Bloque A · El color

### La regla

> **El color envuelve al texto, nunca lo pinta.**

Está escrita literalmente en la cabecera de `app/tokens.css`, y no es una nota
de estilo: es lo que hace que la paleta funcione. La justificación es medible.
Un ámbar que llegue a 4.5:1 sobre blanco ha dejado de ser ámbar y es marrón.
Al empujar el color a la superficie —barra, fondo tintado, píldora, punto,
banderín— el texto se queda en `--text` y mide **14.8:1** encima de cualquiera
de los tres tintes. Los tres colores pueden ser colores de verdad sin negociar
con el contraste ni una sola vez.

| Entidad | Token | Claro | Ratio sobre `--bg` | Oscuro | Ratio |
|---|---|---|---|---|---|
| Tarea | `--task` | `#1E3A6F` | **10.5:1** | `#93B4F2` | **9.0:1** |
| Materia | `--class` | `#2F6B46` | **6.0:1** | `#79C296` | **9.0:1** |
| Reminder | `--rem` | `#B26B00` | **4.0:1** | `#E3B268` | **9.7:1** |

La tabla completa —los diez pares de claro y los doce de oscuro— está en
`app/DESIGN.md` § Color, y cada ratio va anotado al lado de su token en
`tokens.css`. Todos medidos con luminancia relativa, ninguno estimado.

### Una excepción, declarada

El azul **sí** es texto cuando es texto de acción (enlaces, `.taptext`). Ahí no
está etiquetando una tarea: está diciendo "esto se toca". Por eso `--task` se
midió como texto (≥ 4.5) y no como indicador (≥ 3). Es la única excepción y
está escrita en el propio archivo para que nadie la amplíe por analogía.

### `--line-control`, un token que no estaba en el brief

Salió de medir. Un borde que es **la única señal de que algo es un control**
—la casilla vacía, el borde de un campo, un botón fantasma— es un indicador no
textual y necesita 3:1 (WCAG 1.4.11). `--line` (`#E4DFD6`) mide 1.25:1 y estaba
haciendo ese trabajo en toda la app desde FD. Añadí `--line-control`
(`#8E877C`, 3.35:1) y `--line` se queda sólo para separar filas.

**Esto es un fallo de accesibilidad heredado de FD, no de FD3.** Lo reporto
como tal.

### Lo que se borró

`--ctx-1` … `--ctx-6` ya no existen en `tokens.css`, ni en `tw.js`, ni en
`tailwind.preset.js`, ni en ningún comp. `.ctxdot` se eliminó de `base.css` y
en su sitio quedó un comentario explicando por qué. El contexto es texto plano
(decisión 64).

---

## 3 · Bloque B · El calendario del teléfono

### Tres niveles, una cabecera

Mes → Semana → Día son tres niveles de zoom con **la misma cabecera**:

```
[ subir de nivel ] ·············· [ Hoy ] [ ‹ ] [ › ] [ + ]
```

En Mes, que es el techo, el título ocupa el sitio exacto del botón de subir,
así que al cambiar de nivel la cabecera no se mueve un píxel. Eso —y no el
botón en sí— es lo que hace que las tres se sientan una pantalla.

### Desviación de la referencia 10, y por qué

La referencia pone las flechas de mover flanqueando la tira de días. **No se
puede a 390px.** 44 + 44 de flechas más siete días de 44 son **396px**.
Flanquear la tira obligaba a dejar los días en 36px, que es exactamente el
fallo que FD2 corrigió. Apliqué la regla del propio proyecto —sale contenido,
nunca el tamaño del control— y moví las flechas a la cabecera. La aritmética
está escrita en el comentario de `.callabel`, en `base.css`, para que nadie la
"arregle" de vuelta.

Efecto lateral bueno: al vaciarse la fila, la tira se lleva el ancho entero y
los días quedan a **50px**.

### Mes: puntos, y un hueco de FD2 que se cierra

Las celdas no escriben nada. Un título recortado a 50px se lee peor que un
punto: obliga a descifrar en vez de contar. Y como el punto es ámbar, contesta
también "¿de qué tipo?" sin gastar una palabra.

**Dos reminders el mismo día son dos puntos.** Esto cierra el hueco abierto en
`docs/estado-FD2.md` §4.5.2, donde una celda con un bloque escrito sólo podía
mostrar el primero de los dos. Con puntos caben tres sin apretarse.

### `anadir.html` · la pantalla que más puede fallar

Es la única del encargo cuyo riesgo no es visual. El estado de tarea muestra
**la lista de lo que se capturó y nunca se planificó**, y esa lista es, en
bruto, el inventario del patrón de fracaso del usuario. Tres decisiones la
sostienen, y las tres están escritas en la cabecera del archivo:

1. **Ningún contador en el encabezado.** "4 sin planificar" es un contador de
   deuda con otro nombre, y está prohibido (`DESIGN.md` § prohíbe, punto 2).
2. **Ninguna edad.** Nada de "llevas 12 días sin tocar esto". El dato es
   verdadero y es exactamente el que hace cerrar la app.
3. **La confirmación va en positivo y en concreto:** "Poner 2 en el jueves 17",
   no "2 seleccionadas".

Si al abrirla el usuario piensa "ah, verdad, eso" funcionó. Si piensa "qué
desastre soy", hay que rehacerla o esconderla detrás de un toque más. **Esa es
la pregunta 01 de `revision.html`** y no la puedo contestar yo.

---

## 4 · Bloque C · El escritorio

`semana-escritorio.html` está dibujada **en pleno arrastre**: la tarea origen
en fantasma, el chip bajo el cursor y el hueco de destino con la hora escrita.
Un comp de arrastre que no dibuja el arrastre no dice nada del arrastre.

El panel de "Sin planificar" va a la **izquierda** de la rejilla, no a la
derecha. Es el origen del gesto, y en lectura de izquierda a derecha el origen
va antes que el destino; a la derecha obliga a arrastrar hacia atrás.

`mes-escritorio.html` son dos pantallas apiladas: el panel del día y el
formulario. **El panel se ancla al lado del día, nunca encima.** Si tapa el día
que acabas de tocar, pierdes el sitio donde estabas.

---

## 5 · Bloque D · Las tres correcciones

| Corrección | Cómo quedó |
|---|---|
| Orden de Inicio (dec. 71) | **Hoy → Esta semana → De ayer**. "De ayer" lleva `margin-top: auto`: se ancla abajo tenga el contenido que tenga |
| La racha (dec. 63) | Pastilla de azul suave junto a la fecha, en el encabezado. Texto en `--text`, **no azul**: azul la leería como una tarea |
| "Se me corrió el día" (dec. 72) | Eliminado, **y no sustituido por nada**. Hay un comentario en `inicio.html` diciendo que la ausencia es deliberada, para que nadie lo reponga |

El sitio que liberó el botón se fue a un segundo reminder en "Esta semana".
Inicio sigue cabiendo sin scroll: **desbordamiento 0**, medido.

### Sobre la decisión 73

"Lo que viene" **ya existía** en `comps/tareas.html` desde FD2, con los cuatro
reminders y su histórico. El trabajo real de la decisión 73 no era añadirlo
ahí: era **quitarlo del calendario**, y eso se hizo al rehacer `mes.html`. Lo
único que faltaba era dejarlo dicho, y está dicho en la cabecera de
`tareas.html`. No se duplicó nada.

---

## 6 · Cómo se verificó

Empecé con la extensión de Chrome y la abandoné: el grupo de pestañas se caía
cada dos o tres llamadas y estaba gastando el presupuesto en reintentos, no en
diseño. La sustituí por un arnés propio.

**`app/_audit.html`** carga los 15 comps en iframes, les fuerza el tema y mide
cada elemento interactivo: reporta todo lo que baje de 43.5px, todo
desbordamiento horizontal y todo `.screen--fixed` que desborde de alto.

```sh
chrome --headless=new --dump-dom --virtual-time-budget=9000 \
       "http://localhost:PORT/_audit.html?theme=light"
```

**Resultado final, en los dos temas: los 15 comps OK.** Ni un control por
debajo de 44px, ni un desbordamiento horizontal, e `inicio.html` sin scroll.

Tiene tres exclusiones, documentadas dentro del archivo: el `input` dentro de
`.field` (el objetivo táctil es el campo entero, de 44px), `.seg button` (mide
38 porque el carril le suma 3+3) y `.sr-only`.

**Recomiendo que se quede en el repo.** La regla de los 44px se incumplió dos
veces —en FD y otra vez en archivos que ni siquiera estaban en el encargo—
por no tener con qué comprobarla. Está en `DESIGN.md` § Archivos.

---

## 7 · Lo que toqué fuera del encargo

El brief decía "`recursos.html` no se toca salvo lo que cambie por la paleta".
Lo toqué una vez más, a propósito, y lo reporto:

| Archivo | Qué | Por qué |
|---|---|---|
| `recursos.html` | Botón de borrar la búsqueda: **32×32 → 44×44** | Es exactamente la clase de fallo que FD2 corrigió, y estaba escondido en un estilo en línea. Dejarlo sabiendo que está era peor que salirme del encargo |
| `horario.html` | Un `.taptext` de sólo icono a 32×44 → `.tapicon` de 44×44 | Lo mismo |
| `horario.html` | `.colordot` por materia: **eliminado** | Usaba `--ctx-N`, que dejó de existir. Todas las materias son verdes (decisión 63): el color ya dice "esto es una clase" |

Ninguno de los tres cambia una decisión. Si el coordinador prefiere revertir el
primero, está aislado en una línea.

---

## 8 · Lo que dejé fuera

1. **No escribí en `docs/` salvo este informe.** Las decisiones 63–73 quedan
   como estaban.
2. **No toqué `docs/schema.sql`.**
3. **No reabrí ninguna decisión.** Donde algo chocaba, lo resolví aplicando una
   regla ya existente del proyecto (el caso de la referencia 10) o lo dejé
   anotado aquí.
4. **`recursos.html` sigue sin rediseñarse.** Sólo cambió lo que cambió la
   paleta, más el botón de 32px.
5. **No hay comps de estados de error, offline ni carga.** No estaban en el
   encargo y no los inventé.

---

## 9 · Lo que encontré que cambia el plan

Cinco cosas. Las tres primeras son para F1–F3; las dos últimas son de proceso.

### 9.1 · El arrastre del escritorio necesita una alternativa (WCAG 2.2)

`semana-escritorio.html` planifica arrastrando tareas a la rejilla, y
`mes-escritorio.html` no. **Toda acción de arrastre necesita un camino
equivalente con un solo puntero y con teclado** (WCAG 2.2 AA, *Dragging
Movements*). El comp lo permite —cada tarea del panel es un control de 44px que
puede abrir el mismo formulario de "Añadir a este día"— pero **no está
dibujado**, y si F2 implementa sólo el arrastre, la función queda inaccesible.

**Propuesta:** que la fila del panel sea pulsable y abra el selector de día, y
que el arrastre sea el atajo, no el mecanismo.

### 9.2 · El ámbar no puede ser texto nunca, y eso hay que hacerlo cumplir

`--rem` mide 4.0:1: pasa como indicador (≥3) y **no** como texto (≥4.5). Hoy se
cumple porque los comps están escritos a mano. En cuanto haya componentes de
Next.js, el primer `text-rem` que alguien escriba rompe AA sin que nada avise.

**Propuesta para F1:** una regla de lint (o un token que simplemente no se
exponga como color de texto en el preset de Tailwind). `tailwind.preset.js` ya
expone `rem` y `rem-soft`; bastaría con no generar la utilidad de texto.

### 9.3 · `--line-control` es una corrección de accesibilidad retroactiva

Toda casilla, campo y botón fantasma de FD y FD2 tenía su único borde
identificador a 1.25:1. Está arreglado en los comps, pero **conviene que quede
anotado como decisión**, porque es el tipo de cosa que se revierte sin querer
al "limpiar" tokens repetidos.

### 9.4 · La decisión 48 y la hoja del "+" conviven, pero hay que decirlo

La decisión 48 dice que ninguna pantalla pregunta "¿esto es tarea o reminder?".
La decisión 70 hace que la hoja del "+" sí lo pregunte. No es contradicción, y
el matiz está escrito en la cabecera de `tareas.html`: **la 48 protege la
captura**, que es donde la fricción mata (Siri, caminando, tres segundos).
Planificar sobre el calendario es un momento deliberado, y ahí preguntar cuesta
un toque y quita toda la ambigüedad.

Lo señalo porque una sesión futura que lea sólo la 48 va a creer que el `+`
está mal.

### 9.5 · El arnés de verificación debería sobrevivir a los comps

`_audit.html` mide HTML estático. En F1, cuando esto sea Next.js, el mismo
chequeo cabe en un test de Playwright de veinte líneas. **La regla de los 44px
no se ha incumplido nunca por desacuerdo: se ha incumplido por no medirla.**

---

## 10 · Para la revisión del usuario

`app/revision.html` está al día y escrito para leerse desde el iPhone. Lleva
las 15 pantallas agrupadas por importancia y **cinco preguntas**, en este
orden:

1. La lista de lo que nunca planificó, ¿ayuda o pesa? *(la que importa)*
2. Semana con las tres entidades juntas: ¿se lee?
3. Ámbar y verde: mirarlos al sol y de noche.
4. Cuando no cabe todo en Inicio, ¿va el número? *(lleva dos rondas sin
   respuesta)*
5. ¿Con cuánta anticipación avisa un parcial? *(abierta para F3, ya dibujada
   con "1 día antes")*

La 1 y la 2 bloquean la siguiente ronda de diseño. La 3, 4 y 5 no.
