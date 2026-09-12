# FD · Brief de diseño visual

> **Encargo para la sesión de diseño.** Escrito por el coordinador.
> Lee `docs/00-problema.md` y `docs/01-decisiones.md` antes de dibujar nada:
> la mitad de las restricciones de abajo no son estéticas, salen del diagnóstico.

---

## Estética

**Familia:** utilitario sereno — tipografía primero, casi sin cromo.

Términos: **sereno · denso pero respirado · tipográfico · alto contraste ·
sin adornos · táctil · silencioso · honesto**

## Referencia

No hay captura de referencia. Iguala **la sensación** de estas, no su contenido
ni su marca:

- **Things 3** — la calma. Espacio en blanco generoso, jerarquía puramente
  tipográfica, cero ansiedad al abrir.
- **Linear** — la precisión. Densidad de información sin ruido, estados claros,
  transiciones cortas que no se notan.
- **Recordatorios de iOS** — la familiaridad táctil en iPhone. Gestos nativos,
  objetivos táctiles generosos.

Lo que hay que **evitar** como referencia: dashboards de productividad tipo SaaS
(gradientes, tarjetas con sombra, gráficos de progreso, insignias, confeti).

## Intención

**Esto debe sentirse como un lugar tranquilo al que volver, no como una lista de
deudas.**

El dueño tiene ADHD y su patrón de fracaso documentado es dejar de abrir las
herramientas que le generan culpa. Abrir la app tiene que bajar la ansiedad, no
subirla. Si la primera sensación al abrir `Inicio` es "cuánto debo", el diseño
falló aunque sea bonito.

Segundo objetivo: **la app se lee de un vistazo, con una mano, caminando.** El
uso real es iPhone, treinta segundos, varias veces al día.

---

## Sistema visual

### Tipografía

- **Una sola familia.** Fuente del sistema (SF Pro en iOS) con fallback a Inter.
  Sin fuentes decorativas, sin segunda familia para títulos.
- **Escala corta**: como máximo 5 tamaños en toda la app. La jerarquía se hace
  con peso y color, no inventando tamaños.
- **Mínimo 16px** para cualquier texto de contenido en móvil.
- El título de una tarea es el elemento más importante de su fila. Metadatos
  (hora, contexto) siempre subordinados.

### Color

- **Base neutra** — grises cálidos, no azulados. Fondo que no compita.
- **Un solo color de acento** en toda la app. Se usa para: la acción primaria,
  el bloque en curso, y la racha. Nada más.
- **Los contextos** (ramos, proyectos, cursos) llevan color propio, pero
  **desaturado** y en superficie pequeña — un punto o un borde izquierdo, nunca
  un fondo completo.
- **Light y dark obligatorios**, ambos de primera clase. El uso nocturno (la
  notificación de cierre del día) es real.
- Contraste mínimo **AA (4.5:1)** en todo texto.

### Bordes y superficies

- Radios moderados y consistentes. Dos valores como mucho en toda la app.
- **Separación por espacio y línea de 1px, no por sombra.** Sin tarjetas
  flotantes apiladas.
- Las superficies elevadas se reservan para lo que de verdad flota: hoja de
  acción, selector de fecha.

### Espaciado

- Escala de **4px**. Sin valores fuera de la escala.
- Generoso en vertical entre grupos, ajustado dentro de un grupo. El ritmo
  vertical es lo que hace legible una lista de un vistazo.
- **Mínimo 16px de aire lateral** en cualquier ancho.

### Iconografía

- **Usa el MCP de reicon** (`.mcp.json` ya lo tiene configurado) para el set
  completo. Un solo estilo, línea, grosor uniforme.
- Los iconos **acompañan** al texto, no lo sustituyen. La navegación inferior
  lleva icono **y** etiqueta.
- Sin iconos decorativos. Si un icono no es accionable ni informativo, sobra.

---

## Restricciones

### Siempre

1. **`Inicio` cabe en una pantalla de iPhone sin scroll.** Es la restricción más
   dura del proyecto. Con ADHD, una lista de 12 elementos equivale a una vacía.
2. **Objetivos táctiles de 44×44px mínimo.** Se usa caminando, con una mano.
3. **Una acción destructiva siempre es reversible** con deshacer visible. Nunca
   un diálogo de confirmación que bloquee.
4. **Los estados vacíos son un logro, no un hueco.** "Nada pendiente hoy" se ve
   bien, no se ve roto.
5. **Light y dark completos**, ambos diseñados, ninguno derivado a la carrera.
6. **Respeta `prefers-reduced-motion`.**

### Nunca

1. **Nunca rojo, alarma ni gesto de reproche para lo no cumplido.** Sale de la
   decisión #22: la app no regaña. Una tarea no hecha se muestra en tono neutro,
   con la pregunta de qué hacer con ella.
2. **Nunca contadores de deuda acumulada.** Ni "23 pendientes", ni badges con
   números grandes, ni barras de progreso de la semana.
3. **Nunca gamificación.** Sin insignias, sin puntos, sin confeti, sin niveles.
   La racha es una línea de texto discreta, nada más.
4. **Nunca ilustraciones ni mascotas.**
5. **Nunca gradientes ni sombras decorativas.**
6. **Nunca scroll horizontal** en el cuerpo de la página.
7. **Nunca más de un color de acento.**
8. **Las clases no compiten con las tareas.** En `Inicio` no aparecen; en
   `Semana` son fondo, no protagonista.

---

## Comportamiento

- **Marcar cumplido**: respuesta inmediata en el sitio, sin modal ni navegación.
  Un cambio de estado tranquilo y satisfactorio, no celebratorio.
- **Arrastrar un bloque** en `Semana`: mover y redimensionar directo, sin abrir
  formularios. El calendario rígido es un riesgo asumido (decisión #3) y esto es
  su mitigación principal — si arrastrar no es fluido, la app se abandona.
- **"Se me corrió el día"**: un control visible, no escondido en un menú. Empuja
  todos los bloques pendientes de una vez.
- **Transiciones de 150–200ms**, solo para orientar en un cambio de contexto.
  Nada que se note como animación.
- **Sin hover como canal único de información** — el dispositivo principal es
  táctil. En escritorio el hover puede afinar, nunca revelar.
- **El triage de lo no cumplido** (hoy / otro día / borrar) se resuelve en **un
  toque por tarea**. Si toma dos pasos, no se hace.

---

## Entregables

Comps en **HTML + Tailwind** (no imágenes), a **390px** de ancho como caso
principal, más la variante de escritorio de `Semana`:

1. **`Inicio`** — con contenido y en estado vacío
2. **`Semana`** — móvil y escritorio, con clases de plantilla y tareas propias
3. **`Tareas`** — con carpetas
4. **`Recursos`** — la pantalla de búsqueda, que abre con el cursor en el campo
5. **Ritual del domingo** — al menos el paso de triage de no cumplidos
6. **La notificación** — cómo se ve el texto en pantalla de bloqueo de iOS.
   No es decorativo: es el producto (ver `docs/00-problema.md`)

Más:

7. **`app/tokens.css`** — variables de color, tipografía, espaciado y radios,
   con light y dark resueltos
8. **`docs/estado-FD.md`** — informe: qué quedó hecho, qué quedó fuera, y qué
   encontraste que contradiga el plan

## Cómo trabajar

- Skills a usar: **`/design`**, **`/impeccable`**, **`/ui-ux-pro-max`**.
- Iconos vía el **MCP de reicon**.
- Todo en `app/`. **No toques `docs/` salvo tu informe, ni `briefs/`.**
- Los textos visibles van en **español**; el código, en inglés.
- Si algo de este brief choca con una decisión de `docs/01-decisiones.md`,
  **pregunta al coordinador citando el número**. No lo resuelvas por tu cuenta.
