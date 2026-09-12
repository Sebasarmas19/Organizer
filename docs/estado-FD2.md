# FD2 · Correcciones y modelo de tres entidades

> Informe de la segunda ronda de diseño. Fecha: **2026-09-12**.
> Encargo: `briefs/FD2-correcciones.md`. Modelo: `docs/08-modelo-tareas-reminders.md`.
>
> Para revisarlo: **`app/revision.html`**, abierto desde el iPhone (decisión 46).
> Sírvelo por HTTP, no por `file://`:
>
> ```sh
> cd app && python -m http.server 8731
> ```
>
> El sistema (`tokens.css`, `base.css`, `icons.js`) se mantuvo. No se rehízo.

---

## 1 · El fallo de FD, corregido

Tenías razón y era peor de lo que parece: los controles que más se usan eran
los más pequeños de la app, y se usan caminando, con una mano.

| Control | Estaba | Está | Cómo |
|---|---|---|---|
| `.triage .btn` — Hoy / Otro día / Quitar | 40px | **44px** | alto directo |
| "Se me corrió el día" | 32px | **44px** | `.taptext` nuevo |
| `.undo button` — Deshacer | 32px | **44px** | alto + margen negativo |
| "Clasificar" y "Editar" en Tareas | 32px | **44px** | `.taptext` |
| Controles de `semana.html` | 32px | **44px** | `.taptext` |
| `.chip` — filtros | 34px | **44px** | se pinta 34, mide 44 |

**El `.chip` merece una línea.** Subirlo a 44px de alto real habría engordado
cada fila de filtros. En vez de eso lleva un borde transparente de 5px arriba
y abajo con `background-clip: padding-box`: **se pinta de 34 y mide 44**. Usé
borde y no un `::before` absoluto a propósito — con borde la caja de layout es
la real, así que dos filas de pastillas no pueden solapar sus áreas táctiles
por mucho que se apriete el `gap`.

### Qué salió de `Inicio` para que cupiera

Subir los cuatro controles dejó la pantalla **16px por encima** del límite.
Aplicando tu regla al pie de la letra —*sale contenido, no el tamaño del
control*— **salió la cuarta tarea del día**.

Verificado en navegador después del recorte: `Inicio` desborda **0px**, y ni un
solo control interactivo mide menos de 44.

No creo que sea una pérdida: con TDAH tres cosas visibles funcionan mejor que
cuatro apretadas, y la cuarta sigue a un toque en "El resto está en Tareas".

---

## 2 · Qué quedó hecho

### Comps nuevos

| Archivo | Qué resuelve |
|---|---|
| `app/comps/mes.html` | Solo reminders. La vista que sustituye al Calendar del iPhone |
| `app/comps/reminder-detalle.html` | **Dos dispositivos:** un parcial preparado y una defensa sin ninguna tarea |
| `app/comps/otro-dia.html` | El selector del triage. Primero palabras, el calendario después |
| `app/comps/horario.html` | Carga de materias: un nombre, varios días, cinco meses |
| `app/comps/dia.html` | La vista Día (ver §4.1: por qué es un archivo nuevo) |

### Comps actualizados

| Archivo | Qué cambió |
|---|---|
| `inicio.html` | Orden nuevo, controles a 44px, "Esta semana" son reminders con su preparación |
| `inicio-vacio.html` | Mismo orden, y el caso "en 6 días, sin tareas" |
| `semana.html` | **Reescrito**: siete filas en vez de rejilla. Materias apagadas |
| `semana-escritorio.html` | Segmentado, banda de reminders de día completo, capas, enlace a Horario |
| `tareas.html` | **Dos dispositivos:** pestaña Tareas y pestaña Reminders |
| `notificacion.html` | Variante nueva "con un reminder cerca" (decisión 57). Ya son seis textos |
| `domingo.html` | Revisado: los reminders **no entran** en el triage. Ver §4.4 |
| `recursos.html` | **No tocado**, como pediste |

Más `app/DESIGN.md` (sección nueva del modelo de tres entidades y la regla de
los 44px), `app/revision.html` y `app/index.html`.

### Cómo se ve el modelo, sin gastar un color nuevo

- **Tarea** → círculo de check. Se completa.
- **Reminder** → banderín, y **nada que marcar**. Pasa la fecha y baja al
  histórico apagado, sin rojo, sin insignia (decisión 49).
- **Materia** → superficie gris plana, apagable.

La forma hace todo el trabajo. Ni un color entró en la paleta por esto.

**La alerta sin alarma.** El caso "sin tareas todavía" tenía que notarse y no
podía llevar rojo: no es una falta tuya, todavía estás a tiempo. La señal la da
el **peso de la letra**, el icono de aviso va en gris, y **el acento aparece
como acción** —el botón "Planificar"— nunca como advertencia.

### Las dos reglas duras, hechas interfaz

1. **Ninguna pantalla pregunta "¿tarea o reminder?"** La pestaña de Reminders
   **no tiene botón de añadir**, y en su pie dice dónde se crean. Esa ausencia
   *es* la decisión 48.
2. **Las tareas sin reminder no son de segunda.** El módulo abre en la pestaña
   de Tareas, y en `tareas.html` hay dos tareas seguidas —una con banderín y
   otra sin él— dibujadas con exactamente el mismo peso.

### Dos errores del sistema que encontré al hacer esto

- **`.block` chocaba con la utilidad `block` de Tailwind.** Un
  `<span class="... block">` heredaba `position:absolute` del componente de
  calendario y rompía la banda de reminders. Renombrado a **`.calblock`**. Un
  nombre del sistema no puede colisionar con una utilidad del framework.
- **`repeat(7, 1fr)` reventaba dos rejillas.** Con `1fr` una columna no puede
  encoger por debajo del ancho mínimo de su contenido, y un título de reminder
  con `nowrap` descuadraba el mes entero y las siete columnas del escritorio.
  Corregido a `minmax(0, 1fr)` + `min-width: 0`, verificado: las siete columnas
  miden ahora 128px exactos.

---

## 3 · Qué quedó fuera

- **Crear un reminder.** Está el punto de entrada (tocar un día, el botón
  "+ Reminder" en Día) pero no la hoja que sale después.
- **Pasos 2, 3 y 4 del ritual del domingo.** Sigue dibujado sólo el 1.
- **Ajustes**, incluidas las horas de notificación (decisión 25).
- **Hoja de detalle de una tarea** y selector de hora.
- **Estados de carga, error y offline.** La PWA los va a necesitar.
- **Vista de una carpeta a pantalla completa**, y el histórico completo de
  reminders más allá de las dos filas de ejemplo.
- `semana-escritorio.html` y `horario.html` los revisé a fondo en claro y por
  tokens en oscuro, no pantalla a pantalla en oscuro.
- **Efecto lateral que sí debes saber:** subir `.chip` a 44px es un cambio en
  `base.css`, así que **afecta a `recursos.html` aunque no toqué el archivo**.
  Sus filtros ahora tienen área táctil correcta y la lista de resultados se
  encoge un poco. Me pareció mejor que dejar ahí el mismo fallo que acabábamos
  de corregir, pero es un cambio en una pantalla que dijiste que estaba bien.

---

## 4 · Lo que choca, o falta, en el plan

### 4.1 · Renombré archivos: `dia.html` es nuevo y `semana.html` cambió de significado

El encargo pedía actualizar `semana.html` y crear `mes.html`. Pero el modelo
define **tres** vistas con tres preguntas, y el `semana.html` de FD era en
realidad la vista **Día** (una rejilla de horas de un solo día).

Mapeé archivo ↔ vista, que es lo que hace el sistema legible:

| Archivo | Vista | Pregunta |
|---|---|---|
| `dia.html` | Día | ¿Qué hago ahora? |
| `semana.html` | Semana | ¿Cómo reparto el trabajo? |
| `mes.html` | Mes | ¿Qué se me viene encima? |

Si prefieres otros nombres, es renombrar y cambiar tres enlaces. Lo digo
porque el encargo no lo pedía así.

### 4.2 · La pregunta abierta de FD §3.1 queda resuelta, y no por mí

En FD pregunté si la vista Semana del teléfono podía ser un día por vez,
porque siete columnas por horas a 390px son ilegibles. **El modelo nuevo la
contesta solo:** la vista Semana no responde "¿qué hago a las 3?", responde
"¿cómo reparto el trabajo?" — y esa pregunta no necesita horas.

Siete filas, una por día, con los reminders de cada uno y los títulos de las
tareas puestas. Legible a 390px, se arrastra con el pulgar, y la rejilla por
horas sigue existiendo donde de verdad hace falta (Día, y escritorio).

Sigue necesitando tu visto bueno, pero ahora la desviación es mucho menor.

### 4.3 · La anticipación del aviso ya no es sólo de F3

El brief la deja abierta hasta F3. **Pero la decisión 57 la necesita ahora**:
si el reminder manda sobre las tareas en la notificación, hay que saber
**desde cuándo** manda.

Con `notice_days = 6`, la notificación de seis días seguidos la encabeza el
mismo parcial, y a partir del tercero deja de ser información y pasa a ser
ruido — que es exactamente cómo se aprende a ignorar una app.

No lo resolví. Propongo, para que lo apruebes o lo cambies:

- por defecto **1 día** (la víspera),
- editable por reminder, como ya permite `reminders.notice_days`,
- y si el reminder ya tiene todas sus tareas hechas, **no encabeza nada**:
  estar preparado es justamente la señal de que no hace falta avisar.

Esa última regla es gratis en código y es la diferencia entre un aviso útil y
una alarma repetida.

### 4.4 · Los reminders no entran en el triage del domingo

Revisado y ajustado. Un parcial no se pospone, no se quita y uno que ya pasó
no es deuda (decisión 49): baja al histórico solo, sin pasar por esa pantalla.

Si un reminder apareciera en el triage con los botones "Otro día / Quitar", el
domingo volvería a ser una factura — que es justo lo que esa pantalla existe
para evitar. En el paso 2 sí aparecen, pero **de lectura**: qué se te viene
encima la semana que viene, para decidir las tareas de ésta.

Lo doy por resuelto, no por preguntar. Lo anoto por si no era tu lectura.

### 4.5 · Tres huecos del modelo que el diseño tuvo que rellenar por su cuenta

Ninguno bloquea, los tres los decidí y los tres son reversibles:

1. **Si un reminder se mueve de fecha, ¿se mueven sus tareas?**
   `docs/08` no lo dice. **Decidí que no.** El reminder es un hecho externo; las
   tareas son tuyas y las mueves tú. Mover tres tareas sin avisar sería la app
   decidiendo por ti, que es lo contrario de la decisión 5.

2. **Un día con varios reminders en la vista de Mes.**
   La celda de 53px no da para dos. **La celda muestra el primero** y la lista
   "Lo que viene", debajo de la rejilla, los lleva todos con su nombre entero.
   La rejilla da la forma del mes; la lista da los datos.

3. **La barra de preparación con muchas tareas.**
   Son tres puntos porque los ejemplos tienen tres tareas. Con ocho, ocho
   puntos no se leen. Falta definir el tope —propongo cinco y luego sólo la
   frase ("faltan 3")— pero no lo implementé.

### 4.6 · Sigue sin responder, de la ronda anterior

**Cuando no cabe todo en `Inicio`, ¿pongo el número?** Sigue diciendo "El resto
está en Tareas", sin cifra, porque "+3 más" es literalmente un contador de
deuda. Quedó de FD §3.6 sin respuesta y sigue igual.

---

## 5 · Qué necesito de ti

1. **Visto bueno a 4.1 y 4.2**: los nombres de archivo, y Semana como siete
   filas en el teléfono.
2. **Cierra 4.3**: con cuánta anticipación manda un reminder en la
   notificación. Ya no puede esperar a F3 sin que F2 se lo invente.
3. **Confirma 4.5**: las tres decisiones que tomé para tapar huecos del modelo.
4. **Responde 4.6**, que lleva dos rondas abierta.
5. **Pásale `app/revision.html` al usuario.** Las cinco preguntas que le hago
   ahí son distintas de éstas: le pregunto por la sensación, no por el modelo.
   La más importante es si "sin tareas todavía" le empuja o le hunde: es la
   única señal de alerta de toda la app, y si le hace cerrarla, la quito.
