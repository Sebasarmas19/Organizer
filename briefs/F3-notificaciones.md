# F3 · Notificaciones

> **Esta fase es el producto.** Todo lo demás es soporte.
>
> El usuario no tiene un problema de captura: captura bien. Tiene un problema
> de **relectura**. Sus palabras exactas, en `docs/00-problema.md`:
>
> > "Cuando me acuerdo de cosas las anoto, como por ejemplo en notas en Notion,
> > en mi mismo chat de WhatsApp, **y cuando estoy en el día no me meto ahí,
> > solo cuando voy a anotar algo nuevo.**"
>
> Si la notificación no llega, o llega vacía, el proyecto entero no resuelve
> nada. Una app de tareas preciosa que él no abre es exactamente lo que ya
> tiene.

---

## Antes de escribir una línea

| Lee | Por qué |
|---|---|
| `docs/00-problema.md` | **Completo.** Es el porqué de todo |
| `docs/02-arquitectura.md` | **Completo.** Las trampas de iOS están ahí |
| `docs/01-decisiones.md` | 78 decisiones. Las 33, 57, 60, 61 y 62 son tuyas |
| `docs/schema.sql` | `push_subscriptions` y `notification_log` ya existen |
| `docs/estado-F0.md` | Qué existe ya |
| `app/comps/notificacion.html` | **Seis textos reales con su largo real** |
| `web/AGENTS.md` | Next.js 16 no es el que recuerdas |

---

## A · Las tres reglas del contenido

**1. La notificación lleva el contenido dentro.** Nunca *"tienes 3 pendientes,
abre la app"*. Siempre:

```
Hoy: Cálculo 8am · Supabase 11am · Gym 6pm
```

Si con leer la pantalla de bloqueo ya sabe su día y no hace falta abrir nada,
funcionó. **Eso es el criterio, no que la notificación llegue.**

**2. Una diaria, no una por tarea** (decisión 33). Diez notificaciones al día
se silencian, y una app silenciada es una app muerta.

**3. El presupuesto real en iOS son 38 caracteres de título y 88 de cuerpo.**
Medido en FD, está en `docs/estado-FD.md` §3.2. Pasarse no da error: iOS
recorta, y lo que se pierde es justo el final.

### Cuando hay un reminder cerca, manda el reminder

```
⚠ Parcial de Cálculo mañana · Hoy: 15:00 Migrar schema
```

Las tareas se recortan para que quepa el reminder, nunca al revés
(decisión 57).

**Pero si el reminder ya tiene todas sus tareas hechas, no encabeza nada**
(decisión 61). Estar preparado es justamente la señal de que no hace falta
avisar. Cuesta cero en código y es la diferencia entre un aviso útil y una
alarma repetida.

Anticipación: **1 día por defecto**, editable por reminder (decisión 60). Con
seis días, el mismo parcial encabeza seis notificaciones seguidas y a partir de
la tercera es ruido.

### Los cuatro tipos

| Tipo | Cuándo | Qué lleva |
|---|---|---|
| `morning` | 08:00 por defecto | Las tareas del día, con sus horas |
| `evening` | 21:00 | Qué quedó sin hacer, para cerrar el día |
| `weekly_review` | Domingo 19:00 | La invitación al ritual |
| `advance_notice` | Según `notice_days` | Un reminder que se acerca |

Las horas viven en `profiles` y el usuario las edita (decisión 25). **No las
codifiques a mano.**

---

## B · iOS: lo que no se puede negociar

Todo esto está verificado y escrito en `docs/02-arquitectura.md`. Repetido aquí
porque cada punto, si falla, deja la fase en cero:

1. **iOS 16.4 o superior.** Por debajo no hay Web Push y no hay vuelta.
2. **La PWA tiene que estar instalada en la pantalla de inicio.** En Safari
   normal no hay push. Ninguno.
3. **`display: standalone` en el manifest** es requisito duro, no estética.
4. **El permiso se pide después de un toque real del usuario.** Pedirlo al
   cargar la página lo deniega el navegador, y una vez denegado no se puede
   volver a pedir sin que el usuario entre a los ajustes.
5. **No existe la API de Notification Triggers en iOS.** Toda notificación
   programada sale del servidor. No hay atajo.
6. **HTTPS real.** `localhost` no sirve desde el iPhone: hace falta el
   despliegue en Vercel.

### La pantalla de "todavía no está instalada"

Detecta si corre en modo standalone. Si no, **explica cómo instalarla** con los
pasos de Safari (Compartir → Añadir a pantalla de inicio). Sin esa pantalla el
usuario va a tocar "activar notificaciones", no va a pasar nada, y va a
concluir que la app no funciona.

### Notificación de prueba inmediata

Al suscribirse, manda una al instante. Es la única forma de que el usuario sepa
que funcionó, y la única forma de que tú sepas que el camino completo está vivo.

---

## C · El transporte

- `manifest.webmanifest` + service worker
- Suscripción con VAPID: `pushManager.subscribe({ userVisibleOnly: true })`
- Guardar en `push_subscriptions` (`endpoint`, `p256dh`, `auth`)
- Edge Function `dispatch-notifications` en Supabase
- `pg_cron` **cada 5 minutos**
- **Limpieza de suscripciones muertas**: al recibir 404 o 410, marca
  `failed_at`. Sin eso, la tabla se llena de destinos muertos y cada ejecución
  del cron se hace más lenta.

### Idempotencia: obligatoria, no opcional

`notification_log.dedupe_key` es **UNIQUE**. El cron corre cada 5 minutos: sin
esa clave, la misma notificación sale **doce veces por hora**. La clave se
compone del tipo y el día: `morning:2026-09-15`.

Escribe el log **antes** de enviar, no después. Si el envío falla, el registro
queda y se puede reintentar; si escribes después, un fallo a mitad de camino
manda la misma notificación otra vez.

### El cron sabe la hora local

Las horas del usuario están en su zona (`America/Caracas`, **UTC−4 sin horario
de verano**, decisión 14) y los `timestamptz` en UTC. El cron corre en UTC.
Convierte con `profiles.timezone`, no con una resta fija: la zona vive en la
base a propósito.

---

## D · Variables de entorno

`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `CAPTURE_TOKEN` ya están
declaradas y vacías en `web/.env.local.example`. **Genera el par VAPID** y
escribe en tu informe el comando exacto para que el usuario lo repita, más
dónde pegar cada valor (Vercel, Edge Function, o los dos).

`SUPABASE_SERVICE_ROLE_KEY` **nunca** llega al navegador. Nunca con prefijo
`NEXT_PUBLIC_`, nunca importada desde un componente de cliente.

---

## Fuera de alcance

- `POST /api/capture`, el módulo Tareas, los contextos — eso es **F1**, y otro
  agente lo construye a la vez. **No lo toques.**
- El calendario entero y el formulario de horario — eso es **F2**, también en
  marcha. **No lo toques.**
- El ritual del domingo — F4. Tú mandas la notificación que lo invita; el flujo
  lo construye otro.
- `app/` se lee, no se toca. `docs/` solo tu informe.
- **`docs/schema.sql` sí puede necesitar cambios** en esta fase. Si es así,
  **pregunta al coordinador antes de tocarlo**: otras dos fases dependen de él
  ahora mismo.

---

## Hecho cuando

A la hora configurada llega al iPhone una notificación que **contiene la lista
del día**, y se puede leer desde la pantalla de bloqueo sin abrir la app.

Si no puedes llegar hasta ahí porque falta el despliegue o la versión de iOS,
**deja el camino construido y probado hasta donde se pueda**, y escribe con
precisión qué falta comprobar y cómo.

## Entregable

`docs/estado-F3.md`: qué quedó hecho, qué dejaste fuera, qué encontraste que
cambie el plan, y **la lista exacta de pasos manuales del usuario** — generar
VAPID, pegar variables, instalar la PWA, aceptar el permiso.

Antes de darlo por terminado: `npm run typecheck` y `npm run lint` en limpio.
**No corras `npm run build` ni `npm run verify`** — el usuario tiene el
servidor de desarrollo encendido y comparten la carpeta `.next/`.
