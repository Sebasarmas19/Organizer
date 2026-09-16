# F3 · Informe del worker

> Fase de `briefs/F3-notificaciones.md`. **Esta fase es el producto.**
>
> **Lo primero: la sección 1 son tus pasos.** Son cuatro, en orden, y el
> último es tocar un botón en el iPhone. Hasta que los hagas, esto está
> construido y probado pero no te ha llegado nada.
>
> El código está terminado y verificado hasta donde se puede verificar sin un
> despliegue en HTTPS y sin tu iPhone delante. Lo que queda por comprobar está
> en la sección 6, con el nombre de cada cosa y qué mirar si falla.

---

## 1 · Lo que tienes que hacer tú

Cuatro pasos. Unos 20 minutos en total. El orden importa: el paso 4 no puede
funcionar antes del 3.

### Paso 1 · Las claves VAPID · **ya está hecho**

El par ya está generado y escrito en `web/.env.local` y en `.env.local` de la
raíz. No hace falta que lo repitas. Si alguna vez tienes que regenerarlo:

```sh
node -e "const{generateKeyPairSync}=require('crypto');const{publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});const b=s=>Buffer.from(s,'base64url');const p=publicKey.export({format:'jwk'});console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY='+Buffer.concat([Buffer.from([4]),b(p.x),b(p.y)]).toString('base64url'));console.log('VAPID_PRIVATE_KEY='+privateKey.export({format:'jwk'}).d)"
```

> **Si las regeneras, todas las suscripciones guardadas dejan de servir** y hay
> que volver a activar las notificaciones en cada teléfono. No es reversible
> desde el servidor.

Tu clave pública, que no es secreta y vas a pegar en dos sitios:

```
BJE-QfrPFrBIRvWiYTND6FW4OijknwC0rVprsazd3X5h6AvoG2HnBTVrYZk1TeAPLQx5k5sCzOiB8UwdpNuluQs
```

La privada y el resto están en `web/.env.local`, que git ignora. **No la pegues
en un chat.**

### Paso 2 · Pegar las variables en Vercel

Vercel → tu proyecto → **Settings → Environment Variables**. Solo hace falta
añadir una, las demás ya estaban de F0:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | la clave pública de arriba |

`VAPID_PRIVATE_KEY` **no va en Vercel**: la app nunca envía nada, solo guarda
suscripciones. Quien firma los envíos es la Edge Function, y va en el paso 3.

Después de añadirla, **vuelve a desplegar**: Next incrusta las `NEXT_PUBLIC_*`
en tiempo de compilación, así que un despliegue viejo no la ve.

### Paso 3 · Desplegar la Edge Function y ponerle sus secretos

```sh
npx supabase login
npx supabase link --project-ref ckqonhzywynbdhscdrsf

npx supabase secrets set \
  VAPID_PUBLIC_KEY="<la clave pública de arriba>" \
  VAPID_PRIVATE_KEY="<VAPID_PRIVATE_KEY de web/.env.local>" \
  VAPID_SUBJECT="mailto:saap1219@gmail.com"

npx supabase functions deploy dispatch-notifications
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los pone Supabase sola: no hay que
declararlos.

Luego, el reloj. Abre el **SQL Editor** de Supabase y pega entero
`supabase/cron.sql`, **cambiando antes las dos marcas**:

- `<PROJECT_REF>` → `ckqonhzywynbdhscdrsf`
- `<SERVICE_ROLE_KEY>` → el `service_role` de Project Settings → API

Ese archivo crea `pg_net` (que faltaba, ver §5.1), programa el trabajo cada 5
minutos, y trae abajo las cinco consultas para comprobar que va.

### Paso 4 · Instalar la PWA y activar las notificaciones

Esto se hace **en el iPhone**, sobre la URL de Vercel. Desde `localhost` no
funciona: iOS exige HTTPS de verdad.

1. Abre `https://<tu-app>.vercel.app` **en Safari**. No en Chrome, no dentro de
   otra app.
2. Botón **Compartir** → baja → **Añadir a pantalla de inicio**.
3. Cierra Safari y abre Organizer **desde el icono nuevo**.
4. Toca **Activar las notificaciones**, y luego **Activar notificaciones**.
5. iOS pregunta. Di que sí.
6. **Te llega una notificación al instante.** Si no llega, ve a la sección 6.

En la misma pantalla puedes cambiar las horas (mañana, noche, día y hora de la
revisión). Se guardan en `profiles` y el despachador las lee de ahí: no hay
ninguna hora escrita en el código.

> **Requisito duro:** iOS 16.4 o superior. Por debajo no existe Web Push y no
> hay plan B dentro de la PWA. La pantalla te lo dice con esas palabras si tu
> iPhone no llega.

---

## 2 · Qué quedó hecho

| Del brief | Estado |
|---|---|
| A · Las tres reglas del contenido, con los seis textos del comp | Hecho y **fijado con pruebas** |
| A · Reminder que encabeza (57), no si está preparado (61), 1 día (60) | Hecho y verificado contra la base real |
| B · Instalada, `standalone`, permiso tras toque, pantalla de "no instalada" | Hecho |
| B · Notificación de prueba inmediata | Hecho |
| C · Manifest, service worker, VAPID, `push_subscriptions` | Hecho |
| C · Edge Function + `pg_cron` cada 5 minutos | Hecho · falta desplegarla (paso 3) |
| C · Limpieza de suscripciones muertas | Hecho, **y corregido**: ver §5.2 |
| C · Idempotencia, log antes de enviar | Hecho y **probado contra la base en línea** |
| C · Hora local con `profiles.timezone` | Hecho |
| D · Par VAPID generado, variables documentadas | Hecho |

### Los archivos

```
supabase/
├── config.toml                     proyecto y verify_jwt
├── cron.sql                        pg_net + el trabajo + cómo comprobarlo
├── run-dispatch.mjs                correr el despachador en local
└── functions/
    ├── tsconfig.json               comprobación de tipos sin tener Deno
    └── dispatch-notifications/
        ├── index.ts                el handler · dos modos: cron y test
        ├── dispatch.ts             lee la base y orquesta
        ├── compose.ts              EL PRODUCTO · los seis textos, con presupuesto
        ├── schedule.ts             qué toca y cuándo, en hora local
        ├── webpush.ts              VAPID + RFC 8291, sin librerías
        ├── db.ts                   PostgREST por `fetch`
        ├── bytes.ts                base64url y compañía
        └── tests/                  54 pruebas

web/
├── public/sw.js                    recibe el push y lo muestra
├── public/icon-{192,512,maskable-512}.png
├── scripts/gen-app-icons.mjs       los dibuja desde el color de tokens.css
├── src/app/manifest.ts             display: standalone
├── src/app/icon.png · apple-icon.png
├── src/app/api/push/subscribe/route.ts
├── src/app/ajustes/notificaciones/ page · PushPanel · TimesForm · actions
├── src/components/ServiceWorkerRegistrar.tsx
└── src/lib/push/client.ts          el orden que iOS obliga a seguir
```

### Cómo se verificó

`npm run typecheck` y `npm run lint` pasan **en limpio**. No se corrió `build`
ni `verify`, como pedía el brief. Se añadieron tres scripts a `web/package.json`
y `verify` ahora los encadena:

```sh
npm run typecheck:push    # tipos de la Edge Function, sin Deno instalado
npm run test:push         # las 54 pruebas
npm run gen:app-icons     # redibujar los iconos
```

Más allá de eso, tres comprobaciones que no son de rutina:

**1 · El cifrado, contra el RFC, byte a byte.** Un Web Push mal cifrado *no da
error*: el servicio devuelve 201, el iPhone recibe algo que no puede descifrar
y **no muestra nada**. No hay síntoma. Así que `tests/webpush.test.ts`
reproduce el ejemplo completo del **RFC 8291 §5** —sus claves, su sal— y
compara los 145 bytes del cuerpo con el valor publicado en el Apéndice A.
Coinciden. Eso valida de golpe el ECDH, los dos HKDF, el delimitador `0x02`, la
cabecera de 86 bytes y el AES-GCM. Hay además una ida y vuelta descifrando
desde el lado del navegador con claves nuevas, y una verificación de la firma
ES256 del JWT VAPID.

**2 · ¿Aceptan Apple, Google y Mozilla nuestra cabecera VAPID?** Se mandó un
envío real y bien cifrado a un endpoint inventado de cada servicio
(2026-09-13):

| Servicio | Respuesta | Lectura |
|---|---|---|
| Apple | `400 {"reason":"BadWebPushToken"}` | JWT aceptado; rechaza el destino inventado |
| Google | `410 push subscription has unsubscribed or expired` | JWT aceptado |
| Mozilla | `404` | JWT aceptado |

Ninguno devolvió 401 ni 403, que es lo que devuelven cuando el JWT está mal.
**La autenticación de los envíos funciona contra los servicios de verdad.**
Esta prueba además destapó un fallo real: §5.2.

**3 · El despachador entero, contra la base en línea.** Se sembró el día del
comp en Supabase (dos materias, dos tareas, un parcial mañana, una entrega a
tres días), se compuso, y se borró todo. Salió esto, con su largo:

```
mañana   (26/38) Mañana: Parcial de Cálculo
         (79/88) Hoy: 8:00 Cálculo · 11:00 Álgebra · 15:00 Migrar el schema · 20:00 Repaso final
noche    (14/38) Cierre del día
         (86/88) Quedaron abiertos: Migrar el schema y Repaso final. ¿Los pasas a mañana o los sueltas?
domingo   (7/38) Domingo
         (67/88) Unos 10 minutos para armar la semana. Quedó algo suelto del martes.
aviso    (35/38) Viernes: entrega del proyecto de IA
         (60/88) Faltan 3 días. Tienes 3 horas reservadas mañana a las 15:00.
```

Y la **decisión 61** comprobada en vivo: con la tarea del parcial sin hacer, el
parcial encabeza; al marcarla como hecha, deja de encabezar y el título vuelve
a ser `Hoy, martes 15`. La base quedó en cero filas al terminar.

**4 · La idempotencia, contra la base en línea.** Se corrió el despachador tres
veces con la misma hora simulada, como haría el cron:

```
pasada 1: enviadas=0 saltadas=0 fallidas=1  morning:2026-09-15 (sin suscripciones activas)
pasada 2: enviadas=0 saltadas=1 fallidas=0  morning:2026-09-15 (ya estaba en notification_log)
pasada 3: enviadas=0 saltadas=1 fallidas=0  morning:2026-09-15 (ya estaba en notification_log)

notification_log: 1 fila → UNA sola pese a tres pasadas
```

**5 · La PWA servida de verdad.** Con el servidor de desarrollo en el puerto
3101 —no el 3000, para no tocar el tuyo— y Chrome: `manifest.webmanifest`
responde 200 con `display: standalone`, el service worker se registra y queda
**activo con alcance `/`**, y Next inyecta solo el `<link rel="manifest">` y el
`apple-touch-icon`. Se desregistró el worker y se cerró todo al terminar.

---

## 3 · Las decisiones de contenido, y dónde vive cada una

| Decisión | Dónde está en el código |
|---|---|
| 33 · una al día | `dispatch.ts`: un solo tipo por ventana; `sw.js`: `tag` por tipo, la nueva sustituye |
| 57 · el reminder manda | `compose.ts` → `composeMorning`, el reminder toma el título y la lista cede |
| 60 · un día por defecto | `dispatch.ts` → `DEFAULT_NOTICE_DAYS = 1` |
| 61 · preparado no avisa | `dispatch.ts` → `findLeadReminder`, salta los que tienen todas sus tareas hechas |
| 25 · las horas las pones tú | `/ajustes/notificaciones`; el despachador lee `profiles`, no tiene ninguna hora escrita |
| 14 · `America/Caracas` | `schedule.ts` convierte con la zona IANA, nunca restando 4 horas |
| 52 · las materias no son deuda | la de la noche ignora los bloques `source = 'template'` |

**El recorte cuando el día no cabe en 88.** `docs/estado-FD.md` §3.2 lo dejaba
propuesto y sin cerrar. Se cerró así, en dos pasos separados y fáciles de
revertir:

1. **Se agrupan las materias**: `8:00 Cálculo · 11:00 Álgebra` pasa a
   `2 clases`. Las clases ya las sabe —son fijas, están en el horario—; lo que
   no sabe son las tareas que decidió el domingo.
2. **Si aún no cabe, caen las más tardías.**

Nunca se corta una frase por la mitad. Una lista que acaba en `20:00 Resu…` es
exactamente la notificación que este proyecto existe para no mandar.

---

## 4 · Lo que dejé fuera, y por qué

1. **El texto 6 del comp, «La semana ya está armada».** Está escrito y probado
   (`composeWeekArmed`) pero **nadie lo llama**. La decisión 22 dice que si se
   salta el domingo, la semana se arma sola y se avisa el lunes — pero la parte
   que *arma* la semana no es de esta fase (materializar el horario es F2, el
   ritual es F4). Mandarlo ahora sería decirle que la semana está armada cuando
   no lo está, y esa es la clase de mentira que hace que se deje de creer a una
   notificación. **Encenderlo será una línea en `dispatch.ts`** el día que la
   semana se arme de verdad.
2. **Sin caché offline.** El service worker no tiene manejador de `fetch`. No
   estaba en el encargo, y uno a medias es la forma clásica de servirse una
   versión vieja de la app durante días sin enterarse.
3. **Sin `blocks.reminder_min`.** `docs/02-arquitectura.md` dice que queda en
   el esquema como punto de extensión y que ningún flujo de v1 lo usa.
4. **No toqué `docs/schema.sql`.** Ver §5.1: hace falta un cambio, lo pregunté
   al coordinador, no hubo respuesta en 20 minutos, y lo resolví sin tocar el
   archivo. Ver también §7.
5. **No toqué `app/`.** Solo se leyó.
6. **No hay quinto icono en la barra de pestañas.** Los cuatro módulos son la
   decisión 30 y el diseño está aprobado. Ver §6.4.

---

## 5 · Lo que encontré que cambia el plan

### 5.1 · `docs/schema.sql` programa un cron que no puede funcionar

El bloque comentado del final llama a `net.http_post`, pero el esquema solo
crea `pg_cron`. **`net` lo trae la extensión `pg_net`, que no se crea en ningún
sitio.** Tal y como está, descomentarlo da `schema "net" does not exist` y no
se manda nada.

El brief prohíbe tocar `docs/schema.sql` sin preguntar, porque F1 y F2 dependen
de él ahora mismo. Pregunté al coordinador y no hubo respuesta, así que **no lo
toqué**: la línea que falta está en `supabase/cron.sql`, que es además donde
tiene que estar, porque el cron lleva dentro la clave de servicio y eso no
puede vivir en un archivo que se commitea.

**Para el coordinador:** si quiere cerrarlo en el esquema, es una línea junto a
la de `pg_cron`:

```sql
create extension if not exists pg_net;
```

Es aditiva. No toca ninguna tabla, columna ni política, así que no puede romper
F1 ni F2.

### 5.2 · Apple no devuelve 410 para una suscripción muerta: devuelve **400**

Esto no lo dice `docs/02-arquitectura.md`, que habla de «404 o 410», y lo
encontré mandando a los servicios de verdad (§2, comprobación 2):

| Servicio | Suscripción muerta |
|---|---|
| Google | `410` |
| Mozilla | `404` |
| **Apple** | **`400` con `{"reason":"BadWebPushToken"}`** |

Con la regla del brief —mirar solo 404 y 410— **la suscripción muerta de un
iPhone nunca se marcaría con `failed_at`**. Y el caso normal de suscripción
muerta es precisamente reinstalar la PWA en el iPhone, que es el único entorno
que importa (decisión 1). El cron la reintentaría todos los días para siempre y
la tabla de destinos muertos solo crecería.

Corregido en `webpush.ts` → `isGone`: el 400 se mira **por dentro**, y solo con
las razones de APNs que significan «este destino ya no existe»
(`BadWebPushToken`, `BadDeviceToken`, `Unregistered`, `ExpiredToken`). Un 400
por cualquier otro motivo no marca nada: borrar la suscripción buena por un
error pasajero dejaría al usuario sin notificaciones sin que nadie se entere,
que es el peor fallo posible aquí.

### 5.3 · Tres choques entre documentos, y cómo los resolví

Los pregunté al coordinador (mensaje `msg_4e330cdd326b`) diciendo con qué me
quedaba si no había respuesta. **No hubo respuesta.** Seguí con lo propuesto.
Los tres son de una línea si el coordinador discrepa.

**(a) Qué es `advance_notice`.** El brief dice «según `notice_days` → un
reminder que se acerca». Pero `docs/02-arquitectura.md` dice
«`advance_notice_days` antes del `due_on`, solo para **tareas** donde el usuario
activó aviso anticipado», y el texto 5 del comp dice «la única excepción a una
notificación al día (decisión 33), y **solo si él la activa en esa tarea**».

Si además se mandara un `advance_notice` por reminder, **el mismo parcial
saldría dos veces el mismo día**: una encabezando la de la mañana (decisión 57)
y otra suelta.

Lo implementado:

- `reminders.notice_days` controla **solo** si el reminder encabeza la
  notificación de la mañana, con el corte de la decisión 61.
- `advance_notice` como notificación propia existe **solo** para
  `items.advance_notice_days` + `items.due_on`.

Cero duplicados, cero decisiones reabiertas, y las tres fuentes quedan
satisfechas salvo esa línea de la tabla del brief.

**(b) El glifo de alarma.** El encargo escribía `⚠ Parcial de Cálculo mañana`.
El comp aprobado dice literal: *«no lleva ningún símbolo de alarma. Ni un
triángulo, ni un rojo, ni un ojo. La urgencia la da la frase, no un glifo»*, y
usa `Mañana: Parcial de Cálculo`. **Mandé el texto del comp**, que además es el
que el usuario validó desde su iPhone (decisión 45) y gana dos de los 38
caracteres. Hay una prueba que falla si alguien mete un glifo.

**(c) Tocar `docs/schema.sql`.** Resuelto sin tocarlo. Ver §5.1.

### 5.4 · Detalles que conviene que F1 y F2 sepan

- **`items` no tiene campo de orden ni de prioridad** (ya anotado en
  `estado-FD.md` §3.3). La notificación ordena por hora de bloque, y las tareas
  con `due_on` de hoy y sin bloque van al final, sin hora. Si F1 decide otra
  cosa, el sitio donde cambiarlo es `dispatch.ts` → `buildDaySlots`.
- **La notificación considera «abierto» un bloque con `status = 'pending'`.**
  Si F1 o F2 usan otro estado al completar una tarea, el repaso de la noche
  dejará de acertar. Es una línea en `buildEvening`.
- **`notification_log.kind`** usa `advance_notice`, no `task_reminder`. El
  comentario de `docs/schema.sql` dice `task_reminder`; la columna es `text`
  sin restricción, así que nada falla, pero el comentario y el código no dicen
  lo mismo.

---

## 6 · Lo que falta comprobar, y cómo

Lo que sigue **no se puede verificar desde aquí**: necesita HTTPS real y tu
iPhone. Está en orden y con qué mirar si falla.

### 6.1 · Que el cron se dispara

```sql
select status, start_time, return_message
from cron.job_run_details
where jobname = 'dispatch-notifications'
order by start_time desc limit 10;
```

Tiene que aparecer una fila cada 5 minutos. Si no aparece ninguna, el trabajo
no está programado: vuelve al paso 3.

### 6.2 · Que la Edge Function contesta

```sql
select id, status_code, content from net._http_response order by created desc limit 10;
```

- `401` → la `SERVICE_ROLE_KEY` de `cron.sql` está mal pegada.
- `500` → el motivo viene dentro de `content`. Si dice `Falta el secreto …`,
  faltó un `supabase secrets set`.
- `200` → mira qué compuso, en `notification_log`.

### 6.3 · Que la notificación llega al iPhone

Es lo único que no tiene sustituto. **El criterio no es que llegue: es que con
leerla desde la pantalla de bloqueo sepas tu día sin abrir nada.**

Si no llega:

1. `select * from push_subscriptions;` — si no hay ninguna fila con
   `failed_at is null`, no hay a dónde mandar. Vuelve al paso 4.
2. `select kind, dedupe_key, status, error from notification_log order by sent_at desc;`
   — `status = 'sent'` es el único que significa que salió. Si pone `failed`, el
   motivo está en `error`.
3. Si `status = 'sent'` y aun así no la ves: **es el único caso que apunta al
   cifrado**, y es justo lo que las pruebas del RFC descartan. Mira antes que
   Organizer tenga permiso en Ajustes → Notificaciones, y que no esté puesto un
   Modo de concentración.

Para ver qué texto saldría hoy, sin mandar nada:

```sh
node supabase/run-dispatch.mjs preview
node supabase/run-dispatch.mjs preview --now=2026-09-15T12:00:00Z
```

Imprime los cuatro textos con su largo y avisa si alguno se pasa de 38 o 88.

### 6.4 · Que `/ajustes/notificaciones` sigue teniendo puerta

**Esto es para quien haga F1.** La ruta vive fuera de los cuatro módulos
(decisión 30) porque es un ajuste, no un módulo, y la barra de pestañas está
aprobada y no se toca. Ahora mismo el enlace está en la pantalla provisional de
F0, `web/src/app/page.tsx` — **que F1 va a reemplazar entera**.

Si ese enlace desaparece sin dejar otro camino, el usuario no puede activar las
notificaciones, y sin notificaciones esta app es lo que ya tiene.

---

## 7 · Lo que le pregunté al coordinador y sigue sin respuesta

Mensaje `msg_4e330cdd326b`, sin contestar al cerrar esta fase. Las tres cosas
están resueltas con lo que dije que haría, y las tres se revierten en una línea:

1. Qué es `advance_notice` — §5.3(a).
2. El glifo de alarma en el título — §5.3(b).
3. Permiso para añadir `create extension if not exists pg_net;` a
   `docs/schema.sql` — §5.1, resuelto sin tocarlo.

---

## 8 · Estado

**F3 está terminada por el lado del código.** Todo lo que se puede verificar
sin un despliegue está verificado, y parte de ello contra la base de datos en
línea y contra los servicios de push reales.

El criterio del brief era: *«a la hora configurada llega al iPhone una
notificación que contiene la lista del día, y se puede leer desde la pantalla
de bloqueo sin abrir la app»*. El texto está escrito, medido y probado; el
transporte está verificado contra el RFC y aceptado por Apple, Google y
Mozilla; el reloj está escrito y la idempotencia probada. **Lo que falta son
los cuatro pasos de la sección 1**, y el último es tocar un botón.

Nada commiteado: los cambios están en el árbol de trabajo de `f3-push`.
