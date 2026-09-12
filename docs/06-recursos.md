# Biblioteca de recursos

Requisito añadido el 2026-09-12, en palabras del usuario:

> "Quiero que haya una opción en la que pueda guardar skills y herramientas
> importantes que siempre voy viendo y anotando en lugares diferentes. Quisiera
> tener una sola app para guardar las skills y herramientas, artículos
> interesantes que pueda meterme y sacar información de ahí."

## Por qué encaja

Es **la misma patología** que describe `00-problema.md`, aplicada a otro tipo de
contenido: encuentra algo valioso, lo anota en un lugar distinto cada vez, y
nunca vuelve. El diagnóstico se sostiene — *el problema es recuperar, no guardar*.

Si la app absorbe tareas pero no recursos, sigue habiendo fragmentación y la
app no es "el único destino".

## La distinción que hay que respetar

| | Tarea / idea | Recurso |
|---|---|---|
| Qué es | Algo que **hacer** | Algo que **consultar** |
| Se completa | Sí | No, vive indefinidamente |
| Ejemplo | "Terminar el curso de Anthropic" | El link al curso |
| Ciclo de vida | inbox → planned → done | guardado → (se consulta N veces) |

**Son entidades distintas y merecen tabla distinta.** Meterlas en `items` con un
estado más parece ahorro, pero contamina el inbox y la vista Hoy con cosas que
nunca se completan — que es exactamente cómo mueren las listas.

Lo que sí hace falta es el **puente**: desde un recurso, crear una tarea
("leer esto el martes"). Un campo `source_resource_id` en `items` basta.

## Modelo propuesto

```sql
create type resource_kind as enum ('tool', 'skill', 'article', 'video', 'repo', 'other');

create table resources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null,
  url         text,
  kind        resource_kind not null default 'other',
  notes       text,                    -- por qué lo guardaste / qué sacaste
  tags        text[] not null default '{}',
  context_id  uuid references contexts on delete set null,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  opened_at   timestamptz,             -- última consulta
  open_count  int not null default 0
);

-- búsqueda de texto completo: "sacar información de ahí" exige buscar bien
alter table resources add column search tsvector
  generated always as (
    to_tsvector('spanish',
      coalesce(title,'') || ' ' || coalesce(notes,'') || ' ' ||
      coalesce(array_to_string(tags,' '),''))
  ) stored;

create index on resources using gin (search);
create index on resources using gin (tags);
create index on resources (user_id, created_at desc) where archived_at is null;
```

`opened_at` y `open_count` no son adorno: permiten responder "qué guardaste y
nunca miraste", que es justamente el fallo que la app existe para corregir.

## Captura

Dos entradas, ninguna obliga a abrir la app:

1. **Atajo de Siri con URL** (`POST /api/capture/resource`). El mismo mecanismo
   del Atajo de texto, con el campo `url`.
2. **Hoja de compartir de iOS** — el que de verdad importa. Un Atajo marcado
   como "Mostrar en hoja de compartir" aceptando URLs aparece al tocar
   Compartir en Safari. Guardar un artículo pasa a ser: Compartir → Organizer.
   Dos toques, sin salir de la página.

Si se puede, el servidor recupera el `<title>` de la URL para no tener que
escribirlo. Con timeout corto y cayendo al dominio si falla — nunca bloquear
la captura por esperar una página lenta.

## Consulta

- **Búsqueda primero.** La pantalla de la biblioteca abre con el cursor en el
  buscador, no con una lista. Con 200 recursos guardados, navegar no escala.
- Filtros por `kind` y por tag.
- Orden por defecto: más recientes. Segundo orden útil: "guardados y nunca
  abiertos".

## El riesgo, dicho claro

Una biblioteca de recursos es, por diseño, un sitio del que **no se espera
salida**. Es decir: es un vertedero con buena conciencia. Puede acumular 300
links que nunca se leen y sentirse productivo igual.

Dos mitigaciones baratas:

1. **"Nunca abiertos"** como filtro visible. Ver el número duele lo justo.
2. En la revisión del domingo, ofrecer **un** recurso viejo sin abrir para
   convertirlo en tarea de la semana — el mismo mecanismo que ya se acordó para
   la biblioteca de ideas (decisión #7). Uno, no una lista.

## Impacto en el plan

Fase nueva, **F6 · Biblioteca de recursos**, dependiente de F0 y paralelizable
con F1. No está en el camino crítico del 2026-09-15: la captura de recursos
puede esperar a la semana 1 del semestre sin costo.

Estimación: 3–4 horas, más 1 hora si se añade la recuperación de títulos.
