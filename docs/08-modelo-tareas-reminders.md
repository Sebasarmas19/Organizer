# Materias, reminders y tareas

Reestructuración acordada el 2026-09-12, después de ver los comps de FD.
**Sustituye al modelo de dos entidades** (`items` + `blocks`) descrito en
`docs/03-modelo-datos.md`, que se queda corto.

## Por qué cambia

El modelo anterior metía en la misma lista *"comprar cuadernos"* y *"parcial de
Cálculo el viernes 20"*. Son cosas distintas:

- Un parcial **no lo haces, ocurre**. No se pospone, no se arrastra a mañana, y
  marcarlo como cumplido no significa nada.
- Una tarea **la haces tú**, y decides cuándo.

El usuario ya resolvía esto a mano: a principio de semestre abría los planes de
evaluación de cada materia y registraba en el Calendar del iPhone cada parcial,
defensa y entrega. Esa información vivía separada de sus tareas — en otra app.
Absorberla es parte de "un solo destino".

## Lo valioso no es la separación, es la relación

Cualquier app de tareas puede guardar una fecha. Lo que ninguna da:

```
📌 Parcial de Cálculo — viernes 20
   ├── ✓ Resolver guía capítulo 3
   ├── ✓ Resumen de derivadas
   └── □ Repaso final                    1 de 3 pendiente
```

Y su contrario, que es la alerta que hoy no existe en ningún lado:

```
📌 Defensa del proyecto — en 6 días
   ⚠ Ninguna tarea planificada todavía
```

Eso responde **"¿me estoy preparando, o solo lo sé?"** — que es exactamente la
distancia entre anotar y cumplir, el problema que da origen al proyecto entero.

## Las tres entidades

| | Qué es | Se crea en | Fecha | ¿Se completa? |
|---|---|---|---|---|
| **Materias** | El horario fijo del semestre | Formulario, una vez | Recurrente semanal | No |
| **Reminders** | Parciales, entregas, defensas | **Sobre el calendario** | **Obligatoria** | **No.** Pasa el día y queda listo |
| **Tareas** | Lo que haces | Siri, o el módulo Tareas | Opcional | Sí |

### La regla que protege la captura

**El lugar donde entras determina el tipo. El usuario nunca elige.**

- Capturas por Siri → **tarea**, siempre.
- Tocas un día en el calendario → **reminder**, porque un reminder sin fecha no
  existe.
- Cargas el formulario de horario → **materias**.

Si alguna pantalla llega a preguntar *"¿esto es tarea o reminder?"*, el diseño
falló: esa es exactamente la fricción que mató Notion y que `00-problema.md`
identifica como causa raíz.

La asociación tarea→reminder es **siempre opcional**. La mayoría de lo que se
captura por Siri no tendrá reminder nunca, y esas tareas **no son de segunda
clase** — la vista de tareas sueltas jamás debe verse como un cajón de sobras.

## Reminders: sin estado de completado

Decisión del usuario, y simplifica el modelo:

> "Un reminder no se marca como hecho, simplemente cuando pasa el día quedan
> como reminders ya listos."

Consecuencias:

- No hay campo `done`. El estado se deriva de la fecha: **próximo** o **pasado**.
- Un reminder vencido **no es deuda**. Baja al histórico en silencio, sin rojo,
  sin badge, sin perseguir. Es tiempo que pasó, no una falta del usuario.
- Elimina la pregunta *"¿lo marqué?"*, que es una fricción sin valor.

## Materias: reservar espacio

El nombre correcto de lo que hacen, en palabras del usuario:

> "Cuando planificamos no es que por tener una materia de Sistemas Operativos a
> las 8 cambiemos la planificación; nos importa más el tiempo que tenemos
> disponible."

**Una materia no es contenido, es ausencia de tiempo disponible.** Por eso:

- En día y semana: visibles en gris, como fondo. Nunca compiten con las tareas.
- Interruptor para ocultarlas al planificar — entonces lo que interesa es el
  hueco, no la clase.
- **En la vista de mes no aparecen nunca.** Llenarían las 30 celdas de ruido
  repetido.

### El formulario de horario

Requisito explícito: cargar **una sola semana** y que se replique **mínimo 5
meses**.

Eso ya lo soporta `schedule_templates` con `weekday` + `start_time` +
`end_time` + `active_from` / `active_until`. El formulario escribe la plantilla
una vez; la materialización a `blocks` ocurre semana a semana, idempotente.

Es el mayor trabajo manual de todo el proyecto y la única barrera real de
entrada. El formulario tiene que ser rápido: repetir una materia en varios días,
duplicar filas, y nunca pedir dos veces el mismo dato.

## Las tres vistas de calendario

**Cada nivel responde una pregunta distinta.** No es el mismo contenido en letra
más chica — eso produce una vista de mes ilegible e inútil.

| Vista | La pregunta | Muestra | No muestra |
|---|---|---|---|
| **Día** | ¿Qué hago ahora? | Bloques por hora: tareas planificadas y materias. Reminders del día como banda superior | — |
| **Semana** | ¿Cómo reparto el trabajo? | Los 7 días con sus reminders visibles y la carga de tareas. Materias en gris | — |
| **Mes** | ¿Qué se me viene encima? | **Solo reminders** | Tareas y materias |

La vista de mes es exactamente para lo que el usuario usaba el Calendar del
iPhone: *"¿cuándo son mis parciales?"*. Meterle tareas la arruinaría.

**Filtros** (solo tareas / solo reminders / ambos): tienen sentido en día y
semana. En mes no — ahí siempre son reminders.

## Cambios en el esquema

```sql
-- NUEVO: reminders. Sin estado de completado a propósito.
create table reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  notes       text,
  context_id  uuid references contexts on delete set null,
  occurs_on   date not null,              -- obligatoria: sin fecha no es reminder
  occurs_at   time,                       -- opcional: hora exacta si se sabe
  notice_days int,                        -- aviso anticipado, lo pone el usuario
  created_at  timestamptz not null default now()
);

-- NUEVO en items: la asociación opcional
alter table items add column reminder_id uuid references reminders on delete set null;
```

`schedule_templates` pasa a llamarse **materias** en la interfaz. La tabla no
cambia: ya modela exactamente lo que hace falta.

`items.due_on` **se mantiene** para tareas con fecha tope propia que no cuelgan
de ningún reminder.

## Orden de Inicio

Corrección del comp de FD, pedida por el usuario:

1. **Hoy** — las tareas del día, para marcarlas. Va primero: lo primero que ves
   debe ser lo que puedes hacer ahora, no la deuda.
2. **De ayer** — el triage de lo no cumplido.
3. **Esta semana** — la banda de reminders próximos.
4. La racha.

### Lógica del triage

| Botón | Qué hace |
|---|---|
| **Hoy** | Sale de "de ayer" y **sube a la lista de hoy**, en el sitio |
| **Otro día** | Abre el selector para elegir cuándo |
| **Quitar** | **Vuelve al módulo Tareas.** Nunca se borra |

"Quitar" que devuelve a Tareas en vez de borrar es lo que sostiene la regla
*"nada se pierde en silencio"*.

## Notificaciones

El reminder manda sobre las tareas. Con 88 caracteres de presupuesto
(`docs/estado-FD.md` §3.2), si hay un reminder cercano es lo más importante del
día:

```
⚠ Parcial de Cálculo mañana · Hoy: 15:00 Migrar schema
```

Las tareas se recortan para que quepa el reminder, nunca al revés.

**Pendiente:** con cuánta anticipación avisa cada reminder. El usuario lo dejó
abierto hasta validar el comportamiento real de las notificaciones en F3.

Dato verificado: **iOS no limita cuántas Web Push se pueden enviar.** El límite
es humano — si se ignoran, iOS las relega al resumen programado. Por eso la
regla de una notificación diaria se sostiene por diseño, no por restricción
técnica. Se confirma empíricamente en F3.
