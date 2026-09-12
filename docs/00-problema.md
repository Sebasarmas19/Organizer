# El problema

## Lo que el usuario dijo al principio

> "Hay muchas veces que en el día a día me acuerdo de cosas que tengo que hacer
> y las recuerdo ahí pero después se me olvidan y no lo hago. Quiero crear una PWA
> que tenga como hábito siempre crear una planificación de lo que tengo que hacer
> en la semana y siempre meterme en la PWA desde mi teléfono y ver todo lo que
> tengo pendiente."

Leído literal, esto suena a "necesito una app de tareas". **No lo es.**

## El diagnóstico real

Al preguntarle qué usa hoy y por qué falló, respondió:

> "Cuando me acuerdo de cosas las anoto, como por ejemplo en notas en Notion,
> en mi mismo chat de WhatsApp, **y cuando estoy en el día no me meto ahí,
> solo cuando voy a anotar algo nuevo.**"

Eso reencuadra el proyecto entero:

| | Estado |
|---|---|
| Capturar | ✅ **Ya funciona.** WhatsApp consigo mismo es captura instantánea. |
| Recuperar | ❌ **Roto.** Nunca vuelve a leer lo que escribió. |

**El cuello de botella no es la escritura. Es la lectura.**

Construir otra app donde anotar no arregla nada — sería el tercer vertedero
después de Notion y WhatsApp. Lo que falta es algo que le **devuelva** la
información sin que él tenga que acordarse de ir a buscarla.

## Consecuencia de diseño

**La notificación no es una feature secundaria. Es el producto.**

De ahí salen tres reglas no negociables:

1. **Push, no pull.** El sistema va hacia él. Cualquier flujo que empiece con
   "el usuario abre la app" tiene que asumirse como que no va a pasar.
2. **La notificación contiene el contenido.** No un badge, no un contador, no
   "tienes pendientes". El texto de la notificación ES la lista. Si puede leerla
   desde la pantalla de bloqueo sin abrir nada, el sistema ya ganó.
3. **Un solo destino.** Hoy está fragmentado entre Notion, WhatsApp y la cabeza.
   Si la app no absorbe los tres, se convierte en el cuarto fragmento.

## El problema secundario: la fricción de captura en iOS

El usuario captura hoy por WhatsApp porque es lo más rápido que tiene a mano.
Una PWA en iOS **no puede competir con eso**: no tiene widget, no tiene Siri,
no tiene share sheet decente. Abrir la PWA son ~15 segundos, no 3.

Si capturar en la app es más lento que WhatsApp, va a seguir usando WhatsApp.

**Solución acordada:** Atajo de iOS (Shortcuts) que hace `POST` a la app.
Invocable por "Oye Siri, anota…", desde la pantalla de bloqueo y desde el
Centro de Control. Detalle en `docs/02-arquitectura.md`.

## Motivación declarada

- Empieza el semestre el **2026-09-15**.
- Además quiere sostener proyectos personales y cursos en paralelo.
- Quiere generar el **hábito de planificarse**, con la teoría —correcta— de que
  lo que se escribe y se planifica se cumple más.
- Tiene ADHD (declarado vía configuración del entorno). Eso hace que:
  - las listas largas sean invisibles,
  - la estimación de tiempo sea poco confiable,
  - romper una racha sea motivo de abandono total,
  - y que empezar sea más caro que ejecutar.

## Criterio de éxito

La app funciona si, **un mes después del lanzamiento**:

1. Existe al menos una captura al día que NO pasó por WhatsApp ni Notion.
2. Hizo la revisión semanal al menos 3 de 4 domingos.
3. Puede decir qué tiene que hacer hoy sin abrir nada, solo por la notificación.

Si a los 30 días dejó de abrirla, el problema fue push vs pull — no features.
