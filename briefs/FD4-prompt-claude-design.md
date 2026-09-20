# FD4 · Paquete para pegar en la app de escritorio de Claude

> **Para qué es este archivo.** Llevar el encargo de estructura visual (FD4) a
> una sesión de Claude fuera de Claude Code. Aquí está el prompt listo para
> copiar, la lista exacta de imágenes que hay que adjuntar y los documentos que
> hay que subir. El prompt es **autocontenido**: aunque no adjuntes ningún
> documento, lleva dentro todo el contexto necesario para diseñar bien.

---

## 0 · Antes de pegar nada — lee estas tres líneas

1. **La app de escritorio no puede abrir rutas de tu disco.** No lee
   `C:\...\briefs\ref\20-...png`. Las imágenes y los documentos hay que
   **arrastrarlos o adjuntarlos** al chat. Las rutas de abajo son para que los
   encuentres en el Explorador, no para pegarlas en el chat.
2. **Adjunta primero, escribe después.** Sube las 13 imágenes y los 4 documentos,
   espera a que terminen de subir, y recién entonces pega el prompt.
3. Todo va en un solo mensaje. No lo partas en dos: si el prompt llega sin las
   imágenes, se va a inventar el diseño.

Abre la carpeta de imágenes de un tirón, pegando esto en el Explorador o en Ejecutar (Win+R):

```
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\briefs\ref
```

---

## 1 · Imágenes a adjuntar (13)

Todas viven en `briefs\ref\`. Selecciónalas con Ctrl y arrástralas juntas.

### El problema — la app como está hoy (3)

| Archivo | Qué muestra |
|---|---|
| `00-actual-inicio-1.png` | Inicio actual, tema claro |
| `00-actual-inicio-2.png` | Inicio actual, más abajo |
| `00-actual-inicio-3.png` | Inicio actual, tema oscuro |

### Referencias de teléfono — cómo quieres que se vea (6)

| Archivo | Qué copiar de ella |
|---|---|
| `20-tel-tarjetas-azul-naranja.png` | Tarjetas blancas sobre fondo tintado, un acento único |
| `21-tel-mes-oscuro-hoja-horas.png` | Mes oscuro + hoja de horas que sube desde abajo |
| `22-tel-timezy-resumen-riel.png` | Rejilla 2×2 de resumen, y debajo el riel del día |
| `23-tel-morado-tareas-riel.png` | Tarjetas apiladas, riel de horas con la hora a la izquierda |
| `24-tel-calido-mes-leyenda.png` | Tarjeta de mes con leyenda de puntos debajo |
| `25-tel-oscuro-tarjetas-apiladas.png` | Tema oscuro donde las tarjetas **sí** se despegan del fondo |

### Referencias de escritorio (4)

| Archivo | Qué copiar de ella |
|---|---|
| `30-esc-untitled-semana-sidebar.png` | Barra lateral + rejilla semanal de horas, ancho contenido |
| `31-esc-slothui-mes-sidebar.png` | Barra lateral con mini-calendario y categorías + mes grande |
| `32-esc-yourtime-semana-tarjetas.png` | Semana con tarjetas ricas dentro de cada franja horaria |
| `33-esc-moru-panel-timeline.png` | Panel con tarjetas de distinto tamaño y una línea de tiempo |

---

## 2 · Documentos a adjuntar (4, en este orden)

Rutas completas. Arrástralos al chat como archivos.

```
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\briefs\FD4-estructura-visual.md
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\docs\00-problema.md
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\docs\01-decisiones.md
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\app\DESIGN.md
```

| Archivo | Tamaño | Por qué va |
|---|---|---|
| `briefs\FD4-estructura-visual.md` | 3 KB | El encargo entero |
| `docs\00-problema.md` | 3 KB | El diagnóstico. Sin esto diseña una app de tareas genérica |
| `docs\01-decisiones.md` | 18 KB | Las 78 decisiones cerradas. Evita que reabra lo ya decidido |
| `app\DESIGN.md` | 24 KB | El sistema visual actual, que se extiende y no se tira |

### Opcionales — solo si quieres que devuelva código pegable

Añádelos únicamente si vas a pedirle HTML que funcione tal cual en el repositorio:

```
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\app\tokens.css
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\app\comps\inicio.html
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\app\comps\dia.html
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\app\comps\tareas.html
C:\Users\sebastian\Desktop\Proyectos\Personales\Organizer\docs\08-modelo-tareas-reminders.md
```

`app\base.css` son 51 KB y se come bastante contexto sin aportar decisiones.
No lo subas salvo que le pidas expresamente código que compile contra él.

---

## 3 · El prompt — copia desde aquí hasta el final del bloque

```text
Eres el diseñador de producto de Organizer, una PWA de planificación personal
con un solo usuario, que la vive desde su iPhone. El escritorio es secundario y
sirve únicamente para planificar sentado.

Quiero que me entregues un PROTOTIPO DE ALTA FIDELIDAD, navegable, como un solo
artifact HTML: las pantallas principales de la app, con la barra inferior
funcionando de verdad para saltar entre ellas.

Léelo entero antes de escribir una línea de código. Es largo a propósito: cada
párrafo cierra una decisión que ya se tomó y que no quiero volver a discutir.


────────────────────────────────────────────────────────────────────────────
1. QUIÉN SOY Y POR QUÉ EXISTE ESTA APP
────────────────────────────────────────────────────────────────────────────

Soy estudiante universitario. Empecé el semestre el 15 de septiembre de 2026 y
además llevo proyectos personales y cursos en paralelo. Tengo ADHD.

El diagnóstico del proyecto no es obvio, y es lo único que de verdad importa
para diseñar bien. Lo dije así:

  "Cuando me acuerdo de cosas las anoto, como por ejemplo en notas en Notion,
   en mi mismo chat de WhatsApp, y cuando estoy en el día no me meto ahí,
   solo cuando voy a anotar algo nuevo."

O sea:

  CAPTURAR   → ya me funciona. WhatsApp conmigo mismo es captura instantánea.
  RECUPERAR  → está roto. Nunca vuelvo a leer lo que escribí.

El cuello de botella no es escribir. Es leer. Otra app donde anotar sería el
tercer vertedero después de Notion y WhatsApp.

De ahí sale la consecuencia de diseño que manda sobre todo lo demás:

  LA NOTIFICACIÓN ES EL PRODUCTO. LA APP ES DONDE ATERRIZO, NO DONDE VIVO.

Tres reglas que salen de eso y que no se negocian:

  a) Push, no pull. Cualquier flujo que empiece con "el usuario abre la app"
     hay que asumir que no va a ocurrir.
  b) La notificación lleva el contenido dentro. Nunca "tienes 3 pendientes".
     Siempre "Hoy: Cálculo 8am, Supabase 11am, Gym 6pm".
  c) Un solo destino. Si la app no absorbe Notion + WhatsApp + la cabeza, se
     convierte en el cuarto fragmento.

Y tres cosas que mi ADHD hace con una interfaz, que tienes que diseñar en
contra:

  - Las listas largas son invisibles. Diez filas idénticas equivalen a cero.
  - Romper una racha es motivo de abandono total, no de recuperación.
  - Empezar cuesta más que ejecutar. La primera acción de cada pantalla tiene
    que ser obvia y de un solo toque.


────────────────────────────────────────────────────────────────────────────
2. ESTO NO ES UN REDISEÑO DE CONTENIDO
────────────────────────────────────────────────────────────────────────────

Qué se muestra ya está cerrado en 78 decisiones tomadas y documentadas. Lo que
está roto es CÓMO se muestra. Cambia la FORMA, no el FONDO.

Si al mirarlo te parece que algún contenido sobra o falta, anótalo al final en
una lista aparte titulada "Cosas de contenido que noté". No lo cambies por tu
cuenta, no lo elimines, no lo reordenes.


────────────────────────────────────────────────────────────────────────────
3. EL PROBLEMA VISUAL, EN MIS PROPIAS PALABRAS
────────────────────────────────────────────────────────────────────────────

  "No tiene un orden, todo está del lado izquierdo y no se entienden las
   secciones."

Míralo tú mismo en las tres capturas 00-actual-inicio-1, -2 y -3. Los cuatro
fallos concretos, diagnosticados:

  1. TODO ES UNA FILA A SANGRE. Cada elemento ocupa el 100% del ancho, pegado
     al borde izquierdo, sin contenedor ni margen lateral. No hay ningún objeto
     visual en la pantalla: hay un río de texto alineado a la izquierda.

  2. LOS ENCABEZADOS NO ENCABEZAN NADA. "Tu cuenta", "Tema", "Las tres
     entidades" son texto gris de 13px flotando entre filas idénticas. Un
     encabezado sin un bloque visible debajo es solo una fila más pequeña.

  3. UNA SOLA JERARQUÍA TIPOGRÁFICA. Casi todo pesa lo mismo y mide lo mismo,
     así que el ojo no sabe dónde caer primero. En una pantalla con ocho cosas,
     ninguna es la primera.

  4. EN ESCRITORIO EL ANCHO NO TIENE TECHO. A 1900px una lista de tareas ocupa
     1900px y la línea de texto se vuelve físicamente ilegible.

El sistema actual separa secciones con "espacio + una línea de 1px". Eso lee
como plano. A escala de app entera, desaparece.


────────────────────────────────────────────────────────────────────────────
4. LAS REFERENCIAS QUE ELEGÍ YO
────────────────────────────────────────────────────────────────────────────

Te adjunté 6 de teléfono (archivos 20 a 25) y 4 de escritorio (30 a 33). Ábrelas
todas antes de decidir nada. No las elegí por bonitas: las elegí porque en todas
ellas entiendo la pantalla sin leerla.

Lo que TODAS tienen y mi app no tiene:

  - superficie de tarjeta, con fondo propio y esquinas redondeadas
  - margen lateral real: el contenido nunca toca el borde de la pantalla
  - separación entre bloques por HUECO, no por una línea de 1px
  - un título grande que manda en la pantalla y fija dónde empieza a leer el ojo
  - una fila de resumen corta antes del detalle largo
  - en escritorio: barra lateral fija + área de trabajo con ancho máximo

Fíjate especialmente en 25-tel-oscuro-tarjetas-apiladas.png: es el ejemplo de
cómo se resuelve el tema oscuro sin sombras.


────────────────────────────────────────────────────────────────────────────
5. LO QUE NO PUEDES COPIAR DE ESAS REFERENCIAS, Y POR QUÉ
────────────────────────────────────────────────────────────────────────────

Esto es la parte más importante del prompt. Las referencias las elegí yo y aun
así tienen cosas que me harían abandonar la app.

  NINGÚN CONTADOR. NINGÚN PORCENTAJE DE PROGRESO.
  Las referencias están llenas de "31% completado", "18 tasks", "You have 3
  tasks for today", barras de racha con número grande y gráficas de
  productividad. Yo no abro apps que me pasan factura. Ese dato es verdadero y
  es exactamente el que me hace cerrar la app y no volver. Está cerrado en la
  decisión 22 y no se reabre. Si ves un hueco donde "iría" un contador, déjalo
  vacío o pon una frase sin número: "El resto está en Tareas", no "12 más".

  NINGUNA GRÁFICA DE PRODUCTIVIDAD. Ni sparkline, ni anillo, ni barra semanal.

  NINGÚN ROJO DE DEUDA. Lo que no cumplí ayer se muestra, se resuelve de un
  toque y desaparece. No se pinta de rojo, no lleva signo de admiración, no
  lleva badge y no encabeza la pantalla.

  LA PALETA NO SE COPIA. Organizer tiene color POR ENTIDAD, ya aprobado:
     tareas    azul marino  #1E3A6F
     materias  verde        #2F6B46
     reminders ámbar        #B26B00
  Se copia la ESTRUCTURA de las referencias, no su color.


────────────────────────────────────────────────────────────────────────────
6. LA REGLA DE COLOR QUE MANDA (decisión 63)
────────────────────────────────────────────────────────────────────────────

  EL COLOR ENVUELVE AL TEXTO. NUNCA LO PINTA.

Vale: barra lateral del bloque, fondo tintado, píldora, punto, banderín, borde.
No vale: texto de color. El ámbar mide 4.0:1 de contraste — pasa como indicador,
jamás como texto legible.

Compruébalo en las 10 referencias: todas hacen justo esto.

Y segunda mitad de la regla: COLOR *Y* FORMA, nunca color solo. La casilla
cuadrada de la tarea y el banderín del reminder se quedan aunque haya color. El
color refuerza la distinción, no la sustituye. Si alguien ve la pantalla en
blanco y negro, tiene que seguir distinguiendo una tarea de un reminder.


────────────────────────────────────────────────────────────────────────────
7. EL MODELO: TRES ENTIDADES, Y SE VEN DISTINTO
────────────────────────────────────────────────────────────────────────────

  MATERIAS — el horario fijo del semestre. Recurrentes. NO se completan.
    Una materia no es contenido: es AUSENCIA DE TIEMPO DISPONIBLE. Por eso en
    día y semana van en gris, de fondo, y nunca compiten visualmente con las
    tareas. En la vista de mes no aparecen jamás: llenarían las 30 celdas de
    ruido repetido.

  REMINDERS — parciales, entregas, defensas. Fecha obligatoria. NO se completan
    y NO llevan casilla: un parcial no lo haces, ocurre. Pasa el día y queda
    listo, en silencio, sin rojo. Lo que se muestra de un reminder no es cuándo
    es, es SI ME ESTOY PREPARANDO: las tareas que cuelgan de él, y la alerta que
    ninguna app da — "en 6 días y ninguna tarea planificada todavía".

  TAREAS — lo que hago yo. Fecha opcional. Sí se completan, con casilla.
    Una tarea sin reminder asociado NO es de segunda clase. La mayoría de lo que
    capturo por Siri no tendrá reminder nunca. La lista de tareas sueltas jamás
    puede verse como un cajón de sobras.

Regla que protege la captura: EL LUGAR DONDE ENTRO DETERMINA EL TIPO, YO NUNCA
ELIJO. Por Siri → tarea. Tocando un día del calendario → reminder. Formulario de
horario → materia. Si alguna pantalla llega a preguntarme "¿esto es tarea o
reminder?", el diseño falló.


────────────────────────────────────────────────────────────────────────────
8. RESTRICCIONES DURAS
────────────────────────────────────────────────────────────────────────────

  - TRES TEMAS: claro, oscuro y el del sistema. Los tres tienen que verse bien.
    El oscuro NO es el claro invertido: en oscuro la tarjeta se separa del fondo
    SUBIENDO el fondo de la tarjeta, no poniéndole sombra. Las sombras no
    existen sobre fondo oscuro.
  - 44px de área táctil sin excepción. Si algo deja de caber al cumplirlo, SALE
    CONTENIDO, no sale tamaño de control.
  - Nada desborda horizontalmente a 390px de ancho. Ni una tabla, ni un riel.
  - Textos de interfaz en español. Código e identificadores en inglés.
  - Tipografía: una sola familia sans para todo, y cifras tabulares donde haya
    horas en columna. Nada de fuentes decorativas.
  - Mi sistema de diseño ya existe y se EXTIENDE, no se tira. Los tokens que ya
    mandan y que debes reutilizar por nombre:
        --gutter                      margen lateral de la pantalla
        --tap-min                     44px
        --text / --text-muted / --text-faint
        --surface / --surface-sunken
        --line                        borde de 1px
    Si necesitas tokens nuevos de tarjeta, radio, sombra, ancho máximo de
    contenedor o separación entre secciones, invéntalos con nombres coherentes
    con esos y decláralos aparte al final para que yo los copie a mi tokens.css.


────────────────────────────────────────────────────────────────────────────
9. LAS PANTALLAS, CON SU CONTENIDO YA DECIDIDO
────────────────────────────────────────────────────────────────────────────

En este orden de prioridad. Si no te da para las diez, haz las primeras cinco
bien antes que las diez a medias, y dime cuáles quedaron fuera.

 1. INICIO
    Tres secciones, en este orden exacto:
      · "Hoy" — las tareas no fijas del día, con casilla para marcarlas. Va
        PRIMERO: lo primero que veo debe ser lo que puedo hacer ahora, no la
        deuda. Las materias no aparecen aquí; viven en el calendario.
        Al pie, un enlace de desborde sin número: "El resto está en Tareas".
      · "Esta semana" — los reminders próximos. Sin casilla. Cada uno muestra
        si me estoy preparando, no cuándo es.
      · "De ayer" — lo que no cumplí, con tres botones: [Hoy] [Otro día]
        [Quitar]. Va ÚLTIMO y en superficie hundida, porque es algo que se
        resuelve y desaparece, no una sección permanente. Debajo, en letra
        pequeña: "Quitar no borra: vuelve a Tareas."
    En el encabezado, la fecha grande ("Jueves 17") y la racha como píldora
    discreta de texto ("12 días"). Sin llama, sin número gigante, sin barra.

 2. DÍA — "¿qué hago ahora?"
    Riel de horas. Las materias en gris de fondo, las tareas con hora encima.
    Los reminders del día como banda superior. Marca visible de la hora actual.

 3. SEMANA — "¿cómo reparto el trabajo?"
    Los 7 días con sus reminders visibles y la carga de tareas; materias en
    gris. En teléfono, una tira de días; en escritorio, la rejilla de horas de
    las referencias 30 y 32.

 4. TAREAS
    La lista completa, agrupada. Sin contadores. Las tareas sin fecha y sin
    reminder tienen que verse igual de dignas que las demás.

 5. AÑADIR
    Captura de cero fricción: un campo de texto y nada obligatorio. Sin
    categoría, sin fecha, sin prioridad, sin selector de tipo. Se clasifica
    después o nunca. El teclado debe poder abrirse solo al entrar.

 6. MES — "¿qué se me viene encima?"
    Rejilla del mes con SOLO reminders, como puntos por entidad, y leyenda
    debajo (referencia 24). Sin tareas y sin materias.

 7. HORARIO
    El formulario que carga las materias fijas del semestre. Una sola semana que
    se replica cinco meses. Es el mayor trabajo manual del proyecto y la única
    barrera real de entrada: tiene que permitir repetir una materia en varios
    días y duplicar filas, y nunca pedir dos veces el mismo dato.

 8. DETALLE DE REMINDER
    Qué es, cuándo, y las tareas que cuelgan de él. El caso importante de
    diseñar es el vacío: "en 6 días y ninguna tarea planificada todavía".

 9. RECURSOS
    Lista de enlaces y notas guardadas.

10. AJUSTES DE NOTIFICACIONES
    A qué horas llega y qué lleva dentro. Muestra una vista previa real del
    texto de la notificación, con su límite: 38 caracteres de título y 88 de
    cuerpo.


────────────────────────────────────────────────────────────────────────────
10. TONO DE LOS TEXTOS
────────────────────────────────────────────────────────────────────────────

Español neutro, segunda persona, frases cortas. Nunca reproche, nunca
felicitación exagerada, nunca signos de admiración. La app informa, no evalúa.

  Sí:  "El resto está en Tareas"        No: "¡Te quedan 12 tareas!"
  Sí:  "De ayer"                        No: "Pendientes atrasados ⚠"
  Sí:  "Quitar no borra: vuelve a Tareas"
  Sí:  "en 6 días · nada planificado"   No: "¡Prepárate ya! 0% listo"


────────────────────────────────────────────────────────────────────────────
11. FORMATO DE LA ENTREGA
────────────────────────────────────────────────────────────────────────────

Un solo artifact HTML autocontenido, que yo pueda abrir en el iPhone:

  - las pantallas dentro de marcos de teléfono de 390×844
  - la barra inferior FUNCIONANDO: al tocar una pestaña cambia de pantalla de
    verdad, sin recargar, sin enlaces muertos y sin 404
  - un interruptor arriba para ver Sistema / Claro / Oscuro
  - al menos una vista de escritorio, con barra lateral y ancho máximo de
    contenido
  - datos de ejemplo realistas en español: "Migrar el schema a Supabase",
    "Parcial de Cálculo", "Comprar cuadernos", "Leer el paper de Anthropic",
    "Sistemas Operativos 8:00". Nada de "Lorem ipsum" ni "Task 1"
  - al final, fuera de los marcos, un bloque con los tokens CSS nuevos que
    inventaste, listo para copiar
  - y otro bloque corto explicando en 5 líneas qué cambiaste y por qué


────────────────────────────────────────────────────────────────────────────
12. CRITERIO DE ÉXITO, UNO SOLO
────────────────────────────────────────────────────────────────────────────

Que al abrir una pantalla yo sepa EN MEDIO SEGUNDO dónde termina una sección y
empieza la otra, SIN LEER UNA PALABRA.

Si tienes que elegir entre que quepa más contenido y que se entienda la
estructura, gana la estructura. Siempre.


Empieza por Inicio. Cuando la tengas, enséñamela antes de seguir con las demás.
```

---

## 4 · Qué esperar, y qué no

| | |
|---|---|
| **Sí te va a dar** | Un artifact: una página con link propio, que abres en el iPhone y puedes compartir |
| **Sí puedes hacer** | Dejar comentarios sobre la propia pantalla dentro del artifact, y pedirle cambios por chat |
| **No existe** | Una herramienta llamada "Claude Design" con editor visual donde arrastras cosas. El artifact se edita pidiéndoselo en palabras, no con el ratón |
| **No va a poder** | Escribir en tu repositorio. Lo que devuelva hay que traerlo a mano a `app/comps/` |

Si quieres editar con el ratón de verdad, eso es Figma: la app de escritorio
tiene conector de Figma y le puedes pedir que vuelque ahí el diseño.

---

## 5 · Cuando tengas el resultado

Tráelo a la sesión de lógica de Claude Code de una de estas dos formas:

- **El link del artifact** — se lee directamente y se extrae la estructura.
- **El HTML** — guárdalo en `briefs\ref\fd4-propuesta.html` y avisa.

Lo que llegue no reemplaza `app/comps/` por sí solo: se revisa contra las 78
decisiones antes de que entre al repositorio.
