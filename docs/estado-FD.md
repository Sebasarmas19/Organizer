# FD · Estado del diseño visual

> Informe de la sesión de diseño. Fecha: **2026-09-12**.
> Encargo: `briefs/FD-diseno.md`. Entregables en `app/`.
>
> Para revisarlo: abre `app/index.html`. Está pensado para verse **desde el
> iPhone** (decisión 46): a 390px los comps se ven a tamaño real.
>
> Sírvelo por HTTP, no por `file://` — el índice mete cada comp en un iframe y
> algunos navegadores no cargan subframes locales:
>
> ```sh
> cd app && python -m http.server 8731
> ```

---

## 1 · Qué quedó hecho

### Los ocho comps

| # | Archivo | Qué resuelve |
|---|---|---|
| 1 | `app/comps/inicio.html` | Inicio con contenido. Cabe en 844px **sin scroll**, verificado en navegador (desbordamiento = 0px) |
| 2 | `app/comps/inicio-vacio.html` | Inicio vacío. "Nada pendiente hoy" como logro, no como hueco |
| 3 | `app/comps/semana.html` | Semana en móvil: un día por vez + tira de semana con carga. Arrastre dibujado en vivo |
| 4 | `app/comps/semana-escritorio.html` | Semana en escritorio (1280px): rejilla de 7 columnas + carril "sin planificar" |
| 5 | `app/comps/tareas.html` | Entrada (capturas de Siri) + carpetas, con una fila deslizada |
| 6 | `app/comps/recursos.html` | Búsqueda con el cursor dentro y el teclado de iOS dibujado |
| 7 | `app/comps/domingo.html` | Ritual del domingo, paso 1: triage de lo no cumplido |
| 8 | `app/comps/notificacion.html` | Pantalla de bloqueo + **los cinco textos** con su largo real |

### El sistema

| Archivo | Qué es |
|---|---|
| `app/tokens.css` | Color, tipografía, espaciado, radios y motion. **Light y dark autorizados**, ninguno derivado a la carrera |
| `app/base.css` | Componentes construidos solo con tokens |
| `app/tailwind.preset.js` | Los mismos tokens como clases de Tailwind, listo para `tailwind.config.ts` |
| `app/icons.js` | 22 iconos resueltos desde el **MCP de reicon** (Outline, grosor 1.5) |
| `app/chrome.js`, `app/theme.js`, `app/tw.js` | Barra de pestañas / estado / inicio, los tres estados de tema, config de Tailwind |
| `app/index.html` | Índice de revisión + espécimen del sistema (color, tipo, radios) |
| `app/DESIGN.md` | **El contrato para F1.** Reglas, prohibiciones y presupuesto de altura |

### Las tres restricciones duras

1. **Inicio sin scroll** — el contenedor va en `overflow: hidden` a propósito.
   Si algo deja de caber, se rompe a la vista en vez de convertirse en scroll
   silencioso. Medido: 710px disponibles, desbordamiento 0.
2. **Ni rojo ni reproche** — no existe un rojo en la paleta. Lo no cumplido va
   en bandeja neutra con la pregunta; un bloque que pasó sin cerrarse lleva
   contorno punteado gris. El check de "cumplido" tampoco gasta el acento: se
   rellena en gris, porque marcar hecho es un cambio de estado tranquilo.
3. **La notificación** — cinco textos escritos contra el techo real de iOS
   (ver §3.2), cada uno con su número de caracteres a la vista.

### Decisiones visuales que cierro aquí

- **Acento: petróleo** (`#0E6F66` claro / `#55C4B6` oscuro). Es el opuesto del
  rojo en el círculo cromático: "en curso" y "racha" nunca pueden leerse como
  alarma. Se usa en tres sitios y en ninguno más.
- **Neutros cálidos** (no azulados), negro cálido en oscuro: el uso nocturno
  es real.
- **Cinco tamaños de tipo**, una sola familia (la del sistema).
- **Seis colores de contexto** desaturados, ninguno en el tono del acento para
  que un ramo no se confunda con "en curso". Van en `contexts.color`.
- **Contraste medido, no estimado**: todo par texto/superficie pasa AA (4.5:1)
  en los dos temas; los contextos pasan 3:1 como indicador no textual. Los
  valores están anotados en `tokens.css`.

---

## 2 · Qué quedó fuera

Nada de esto bloquea F1. Lo listo para que no se dé por hecho.

**Pantallas sin comp**

- Hoja de acción de una tarea (detalle, cambiar hora, mover de carpeta) y
  selector de fecha. Los estilos base existen en `base.css` (`.sheet`), el
  comp no.
- Ajustes: horas de notificación editables (decisión 25).
- Pasos 2, 3 y 4 del ritual del domingo. Sólo se dibuja el 1 (era lo pedido) y
  se deja ver qué viene después.
- El ritual del domingo **en escritorio**. La decisión 17 dice que el
  escritorio es cómodo justo para eso; el brief pedía 390px como caso
  principal y ahí me quedé.
- Primer día, con la app vacía de verdad (nada capturado nunca). El estado
  vacío que sí hice es "hoy ya está cerrado", que es el frecuente.
- Detalle de un recurso, y Recursos vacío.
- Carpeta abierta a pantalla completa en Tareas.

**Estados sin dibujar**

- Carga (skeletons), error de red, offline. La PWA los va a necesitar.
- Foco de teclado en escritorio: hay anillo de foco en `base.css`, no hay
  recorrido dibujado.

**Otros**

- El set de iconos son 22, los justos para estos comps. F1 necesitará más; se
  sacan del mismo MCP con el mismo estilo (Outline, 1.5).
- `semana-escritorio.html` y `tareas.html` los revisé a fondo en claro y por
  tokens en oscuro, no pantalla a pantalla en oscuro.
- **`index.html` está verificado por DOM, no por captura.** El capturador de
  pantalla de la automatización estaba fotografiando otra ventana de Chrome, no
  la pestaña que yo controlaba: el índice sí renderiza (h1 a 62px del borde
  superior, color correcto, `visibility: visible`, los 8 marcos de 390×844
  colocados, sin desbordamiento horizontal). No es un fallo de la página, pero
  como no tengo la foto, ábrelo una vez a mano antes de mandárselo al usuario.

---

## 3 · Lo que encontré que contradice o falta en el plan

Esto es lo importante del informe. Ninguno lo resolví por mi cuenta.

### 3.1 · Semana en móvil no puede ser una rejilla de 7 columnas

**Decisión 3** fija calendario con bloques horarios. A 390px, siete columnas
por horas da ~50px por día: ilegible, y el arrastre —que es la mitigación
comprometida del riesgo— sería imposible con el dedo.

**Lo que hice:** en móvil, **un día por vez** con la tira de la semana arriba;
bajo cada día, puntos que indican cuántos bloques tiene, para no perder la
conciencia de la semana. La rejilla de 7 columnas existe de verdad, en
escritorio.

Sigue siendo un calendario con bloques horarios, así que no creo estar
reabriendo la decisión 3 — pero el dispositivo principal ve un día, no una
semana, y eso merece tu visto bueno explícito.

### 3.2 · El techo real de la notificación son 38 y 88 caracteres

No está escrito en ningún documento y condiciona F2 entera.

iOS muestra la notificación **plegada**: 1 línea de título, 2 de cuerpo. A
15px en una tarjeta de ~334px son unos 44 caracteres por línea:

```
título   <= 38 caracteres
cuerpo   <= 88 caracteres
```

Pasado eso iOS corta con puntos suspensivos y la notificación vuelve a ser
"tienes cosas, abre la app" — exactamente lo que `00-problema.md` dice que no
puede pasar.

**Consecuencia para F2:** el cuerpo se compone en servidor **con presupuesto de
caracteres**. Si el día no cabe, se quitan **bloques enteros** (los más
tardíos), nunca se trunca una frase. Con cuatro bloques ya vamos justos:

> `8:00 Cálculo · 11:00 Álgebra · 15:00 Migrar el schema · 20:00 Resumen` → 69

**Falta decidir:** con 6 o 7 bloques, ¿qué se cae y qué se queda? Propongo:
primero los de hora más tardía, y si aun así no cabe, agrupar las clases
(`"3 clases · 11:00 Migrar el schema"`). No lo di por cerrado.

### 3.3 · No hay campo para ordenar `Inicio`

**Decisión 18** dice "sin límite duro de tareas por día… sí ordenar por
prioridad y que la vista Hoy no obligue a hacer scroll". Pero en
`docs/schema.sql`, `items` **no tiene campo de prioridad ni de orden manual**.

Sin eso, Inicio no puede elegir qué 4 tareas enseña cuando hay 9.

**Propuesta que no necesita tocar el esquema:** ordenar por hora del bloque de
hoy (las que tienen hora, en orden), y después las sin hora por `due_on`
ascendente. Cubre el caso real sin inventar una prioridad que el usuario
tendría que mantener a mano — y la decisión 31 dice justamente que el sistema
no se mete con eso.

Si prefieres prioridad explícita, hace falta una columna y es tu llamada:
`docs/schema.sql` lo escribes tú.

### 3.4 · Las carpetas de la decisión 36 no existen en el esquema

**Decisión 36**: "el usuario puede crear carpetas y personalizar el módulo".
En el esquema hay `contexts`, no `folders`, y `contexts` no tiene campo de
orden.

En el comp dibujé **carpeta = contexto** (punto de color incluido), que me
parece lo correcto: una carpeta más un contexto sería la misma cosa dos veces.
Si lo aceptas, a `contexts` le falta un `sort_order int` para que "personalizar
el módulo" signifique algo. Si querías dos jerarquías distintas, dímelo y
rehago la pantalla.

### 3.5 · La notificación incluye las clases; `Inicio` no

No es contradicción, pero nadie lo había dicho y los dos documentos apuntan a
sitios distintos:

- `CLAUDE.md`, regla 2, da como ejemplo `"Hoy: Cálculo 8am, Supabase 11am…"` —
  con clase dentro.
- **Decisión 35** saca las clases de `Inicio`: "las clases no ocupan espacio".

Lo resolví así, y lo dejo escrito en `app/DESIGN.md`: **Inicio es para decidir,
y las clases no se deciden; la notificación es para saber qué pasa hoy, y a
las 8:00 lo que pasa es Cálculo.** Si no es lo que querías, sólo cambia el
comp 8.

### 3.6 · Tensión real: "El resto está en Tareas", sin número

El brief prohíbe contadores de deuda acumulada. Cuando hay más tareas de las
que caben en Inicio, la salida natural sería "**+3 más**" — informativo, pero
literalmente un contador.

**Opté por no poner el número.** Cumple la prohibición al pie de la letra, y
pierde información real. Si lo prefieres al revés, es cambiar una línea; me
pareció una decisión demasiado central para tomarla yo.

### 3.7 · Dos detalles menores

- **Decisión 41** dice que `Inicio` va sin campo de captura porque ya se
  captura por Siri. Lo respeté. Pero puse un `+` en **Tareas** y en
  **Recursos**: en escritorio no hay Siri, y hasta que el Atajo esté hecho no
  hay otra entrada. Confírmalo.
- **Los comodines de la racha** (decisión 8) sólo se ven en escritorio
  ("2 comodines este mes"). En móvil no cabe y tampoco creo que deba verse
  siempre: propongo que aparezca **sólo el día que se gasta uno**, y con un
  texto que lo cuente sin regañar.

---

## 4 · Qué necesito de ti

En orden de importancia:

1. **Visto bueno a 3.1** (Semana en móvil = un día por vez). Es la desviación
   más visible respecto de cómo se leería la decisión 3.
2. **Cierra 3.2**: la regla de recorte de la notificación cuando el día no cabe
   en 88 caracteres. Sin eso F2 se inventa una.
3. **Decide 3.3 y 3.4**: orden de `Inicio` y si carpeta = contexto. Los dos
   tocan `docs/schema.sql`, que es tuyo.
4. **Confirma 3.5, 3.6 y 3.7.** Son de una línea cada uno.
5. **Publica `app/index.html`** para que el usuario lo abra desde el iPhone
   (decisión 46). Ábrelo tú una vez antes: ver §2, no lo pude capturar.

La segunda puerta —que al usuario le baje la ansiedad al abrir `Inicio`— no la
puede pasar ningún documento. Esa es suya.
