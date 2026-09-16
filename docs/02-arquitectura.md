# Arquitectura

## Vista general

```
  iPhone
  ┌─────────────────────────────┐
  │  Atajo de iOS (Shortcuts)   │──── POST /api/capture ────┐
  │  "Oye Siri, anota…"         │       (Bearer token)      │
  └─────────────────────────────┘                           │
  ┌─────────────────────────────┐                           ▼
  │  PWA instalada en inicio    │◄──── Web Push ────┐   ┌─────────────┐
  │  + Service Worker           │                   │   │  Next.js    │
  └─────────────────────────────┘                   │   │  en Vercel  │
                                                    │   └──────┬──────┘
                                                    │          │
                                      ┌─────────────┴──┐       │
                                      │  Edge Function │       │
                                      │  dispatch-     │       │
                                      │  notifications │       │
                                      └────────┬───────┘       │
                                               │               │
                                   ┌───────────▼───────────────▼──┐
                                   │  Supabase Postgres           │
                                   │  + pg_cron (cada 5 min)      │
                                   │  + RLS por auth.uid()        │
                                   └──────────────────────────────┘
```

## Stack

| Capa | Elección |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Hosting | Vercel (HTTPS automático, requisito para Web Push) |
| Base de datos | Supabase Postgres con RLS |
| Auth | Supabase magic link (un solo usuario) |
| Push | Web Push estándar con VAPID |
| Scheduler | `pg_cron` → Supabase Edge Function (Deno) |

---

## Web Push en iOS — la parte frágil

Esta es la pieza con más probabilidad de fallar. **Léela completa antes de
escribir una línea de código de notificaciones.**

### Requisitos duros

| Requisito | Detalle |
|---|---|
| iOS 16.4 o superior | Antes de esa versión no existe Web Push en Safari. Verificar y avisar |
| PWA instalada en pantalla de inicio | **Obligatorio.** En una pestaña normal de Safari no llega nada |
| `display: standalone` en el manifest | Si no, iOS no la trata como PWA instalada |
| HTTPS | Cubierto por Vercel |
| Permiso pedido tras gesto del usuario | Un `tap` real en un botón. Llamarlo al cargar la página falla en silencio |

### Lo que NO existe en iOS

- ❌ **Notification Triggers API** — no se pueden programar notificaciones locales.
  Por eso *todas* las notificaciones tienen que salir del servidor. Esto no es
  una preferencia de arquitectura, es una restricción de la plataforma.
- ❌ Widgets — requieren una app nativa.
- ❌ `beforeinstallprompt` — no hay prompt automático de instalación.
  Hay que **enseñarle a mano**: Compartir → Añadir a pantalla de inicio.

### Flujo de alta (onboarding de notificaciones)

```
1. Detectar si corre instalada
   window.matchMedia('(display-mode: standalone)').matches
   || navigator.standalone

2. Si NO está instalada
   → pantalla con instrucciones ilustradas de "Añadir a pantalla de inicio"
   → no ofrecer el botón de notificaciones todavía (fallaría)

3. Si SÍ está instalada
   → botón "Activar notificaciones"
   → Notification.requestPermission() dentro del handler del tap
   → registration.pushManager.subscribe({ userVisibleOnly: true,
                                          applicationServerKey: VAPID_PUBLIC })
   → guardar endpoint + p256dh + auth en push_subscriptions

4. Mandar una notificación de prueba inmediata
   Sin esto no hay forma de saber si funcionó.
```

### Mantenimiento de suscripciones

- iOS **invalida la suscripción** si se desinstala y reinstala la PWA.
- Si el envío devuelve **404 o 410**, la suscripción está muerta → borrarla de
  la tabla y marcar que hay que re-registrar.
- **Apple no usa 404 ni 410.** Verificado contra los servidores reales en F3
  (`docs/estado-F3.md` §5.2): Google devuelve `410`, Mozilla `404`, y **Apple
  devuelve `400` con `{"reason":"BadWebPushToken"}`**. Como el iPhone es el
  único entorno que importa, mirar solo 404/410 significaría **no detectar
  nunca** una suscripción muerta de iOS. Hay que mirar dentro del 400, y solo
  para las razones de APNs que significan que el destino ya no existe
  (`BadWebPushToken`, `BadDeviceToken`, `Unregistered`, `ExpiredToken`). Un 400
  por otro motivo no marca nada: borrar una suscripción buena por un error
  pasajero deja al usuario sin notificaciones sin que nadie se entere.
- Guardar `last_seen_at` y re-suscribir en cada arranque si pasó mucho tiempo.
- La app debe detectar "no tienes suscripción activa" y mostrarlo de forma
  visible. Una notificación que no llega y nadie nota es el peor fallo posible
  en este proyecto.

### Contenido de la notificación

Regla del proyecto: **el texto ES la lista.**

```
✅ "Hoy: Cálculo 8:00 · Setup Supabase 11:00 · Gym 18:00"
❌ "Tienes 3 tareas pendientes"
```

El objetivo es que pueda leerla desde la pantalla de bloqueo y saber su día sin
abrir nada. Usar `body` multilínea y añadir `actions` donde el SO lo permita.

---

## Captura por Atajo de Siri

### Por qué existe

Capturar en la PWA son ~15 segundos (desbloquear, buscar ícono, esperar carga,
escribir). Hoy captura en WhatsApp porque son 3. Si la app no iguala esa
velocidad, va a seguir usando WhatsApp y el proyecto no resuelve nada.

### Endpoint

```
POST /api/capture
Authorization: Bearer <CAPTURE_TOKEN>
Content-Type: application/json

{ "text": "probar Hermes" }

→ 201 { "id": "...", "title": "probar Hermes" }
```

- Inserta en `items` con `status = 'inbox'`. Sin fecha, sin contexto, sin nada más.
- El token es un secreto largo y aleatorio guardado en variables de entorno y
  dentro del Atajo. Con un solo usuario es suficiente; conviene igual poner
  rate limiting básico.
- Debe responder rápido. El Atajo se siente lento por encima de ~1 segundo.

### El Atajo (se configura una vez en el iPhone)

```
1. App Atajos → nuevo atajo
2. Acción "Pedir entrada de texto"  → mensaje: "¿Qué anotas?"
3. Acción "Obtener contenido de URL"
     URL:    https://<app>.vercel.app/api/capture
     Método: POST
     Headers: Authorization: Bearer <token>
     Body (JSON): { "text": <Entrada proporcionada> }
4. Nombrar el atajo "Anota"  →  activa "Oye Siri, anota"
5. Añadirlo a la pantalla de bloqueo y al Centro de Control
```

**Entregable del proyecto:** una página dentro de la app con estas
instrucciones y el token listo para copiar. Sin eso, el Atajo no se configura
nunca y la feature no existe.

---

## Notificaciones programadas

### Mecanismo

```
pg_cron  ──cada 5 min──►  Edge Function "dispatch-notifications"
                              │
                              ├─ 1. Lee profiles (timezone, horas configuradas)
                              ├─ 2. Calcula qué toca enviar ahora
                              ├─ 3. Filtra contra notification_log (dedupe_key)
                              ├─ 4. Arma el contenido real (la lista de hoy)
                              ├─ 5. Envía por Web Push a cada subscription
                              └─ 6. Registra en notification_log
```

### Los 4 tipos

| Tipo | Cuándo | Contenido |
|---|---|---|
| `morning` | Hora configurada (~8:00) | Los bloques de hoy, en orden, con hora |
| `evening` | Hora configurada (~21:00) | "¿Cumpliste?" + lo que quedó pendiente |
| `weekly_review` | Domingo, hora configurada | Empujón al ritual + cuántas ideas esperan |
| `advance_notice` | `advance_notice_days` antes del `due_on` | Solo para tareas donde el usuario activó aviso anticipado |

**Regla que manda (decisión #33):** hay **una notificación diaria con las tareas
del día**, no una notificación por tarea. La única excepción es
`advance_notice`, que el usuario activa a mano tarea por tarea — típicamente
para algo de varios días que conviene empezar antes.

Las clases **no notifican** por defecto (decisión #26): aparecen dentro del
resumen de la mañana y en la vista Hoy, nada más. Con ~20 clases semanales, una
alerta por cada una convierte las notificaciones en ruido que se silencia — y
arrastra a las que sí importan.

`blocks.reminder_min` y `schedule_templates.reminder_min` quedan en el esquema
pero **ningún flujo de v1 los usa**. Son el punto de extensión por si más
adelante quiere activar un recordatorio en un bloque concreto.

### Idempotencia

`notification_log.dedupe_key` con índice **único**. Formato sugerido:

```
morning:2026-09-15
evening:2026-09-15
weekly_review:2026-W38
task_reminder:<block_id>
```

El cron corre cada 5 minutos; sin esta clave mandaría la misma notificación
doce veces por hora. **No es opcional.**

### Zona horaria

- Todo se guarda en `timestamptz` (UTC).
- `profiles.timezone` guarda el IANA (`America/New_York` por ahora).
- El cálculo de "¿son las 8:00 para este usuario?" se hace **en SQL**, con
  `now() AT TIME ZONE p.timezone`. No calcular horas en JavaScript del cliente.

---

## Variables de entorno

| Variable | Dónde | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Cliente |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Edge Function | Escrituras de servidor. **Nunca al cliente** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Vercel | Suscripción push en el navegador |
| `VAPID_PRIVATE_KEY` | Edge Function | Firma de los envíos |
| `CAPTURE_TOKEN` | Vercel + Atajo de iOS | Auth del endpoint de captura |

---

## Notas de operación

- El free tier de Supabase **pausa proyectos tras ~7 días sin actividad**. El
  `pg_cron` corriendo cada 5 minutos cuenta como actividad, así que en la
  práctica no se pausa. Verificarlo igual después de la primera semana.
- Vercel free alcanza de sobra para un usuario.
- Costo total esperado: **$0/mes**.
