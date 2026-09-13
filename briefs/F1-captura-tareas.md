# F1 · Captura y módulo Tareas

> Resuelve la mitad del problema del proyecto: que lo que el usuario anota
> **llegue a un solo sitio y vuelva a aparecer**.
>
> Todo está decidido y dibujado. Esto no es diseñar ni inventar: es portar un
> comp aprobado a React y escribir un endpoint.

---

## Antes de escribir una línea

| Lee | Por qué |
|---|---|
| `CLAUDE.md` | Las cinco reglas del producto |
| `docs/00-problema.md` | El diagnóstico. **No es obvio.** Sin esto vas a construir otra app de tareas |
| `docs/08-modelo-tareas-reminders.md` | Materias, reminders y tareas |
| `docs/01-decisiones.md` | 78 decisiones cerradas. **No se reabren** |
| `docs/estado-F0.md` | Qué existe ya y cómo está montado |
| `app/comps/tareas.html` | **El comp aprobado.** Es tu especificación visual |
| `app/DESIGN.md` | El sistema visual |
| `web/AGENTS.md` | Next.js 16 no es el que recuerdas. Léelo |

**Regla de oro de esta fase**, del diagnóstico:

> El usuario captura bien. Lo que está roto es **releer**. Cualquier cosa que
> dependa de que él "se acuerde de entrar" está muerta al nacer.

---

## A · El endpoint de captura

`POST /api/capture`

```
Authorization: Bearer <CAPTURE_TOKEN>
Content-Type: application/json

{ "text": "comprar cuadernos" }
```

- Inserta **una tarea** en `items`. Siempre tarea, nunca reminder
  (decisión 48: *el lugar donde entras determina el tipo; el usuario nunca
  elige*). No preguntes el tipo, no lo infieras del texto.
- Sin campos obligatorios más allá del título. Sin fecha, sin contexto, sin
  categoría (regla 3 del producto: **capturar cuesta 0 fricción**).
- Escribe con el cliente `admin` (`web/src/lib/supabase/admin.ts`), que se
  salta RLS. **Ese cliente jamás se importa desde un componente de cliente.**
- **Responde en menos de 1 segundo.** El Atajo de Siri se siente roto si no.
  Nada de recuperar títulos ni llamadas externas aquí.
- Errores con cuerpo JSON y código correcto: 401 sin token, 400 sin texto.

### El token

`CAPTURE_TOKEN` vive en el entorno. En `profiles` hay `capture_token_hash`
para guardarlo hasheado si haces la variante por usuario; **para un solo
usuario, la variable de entorno basta** y es menos código. Elige, y escribe en
tu informe cuál elegiste y por qué.

### La pantalla de instrucciones

Una ruta que enseñe, en pasos numerados, cómo montar el Atajo de iOS:
el texto dictado, el `POST`, la cabecera, y **el token con un botón de
copiar**. Sin esa pantalla el endpoint no existe para el usuario.

---

## B · El módulo Tareas

El comp `app/comps/tareas.html` está aprobado. **Respétalo.** Si algo no cabe
en React tal cual, dilo en el informe; no lo rediseñes por tu cuenta.

Tiene tres cosas:

1. **Tareas** — lo que el usuario hace. Con su botón de añadir, que aquí
   también cuesta cero: un campo y listo.
2. **Reminders — solo de lectura.** No se crean aquí: se crean tocando un día
   del calendario, porque un reminder sin fecha no existe (decisión 48). Y
   **no se marcan como hechos**: pasa la fecha y quedan listos (decisión 49).
3. **La relación** entre ambos: un reminder con sus tareas hechas y pendientes.
   Ahí está el valor que ninguna app de tareas da.

```
📌 Parcial de Cálculo — viernes 20
   ├── ✓ Resolver guía capítulo 3
   ├── ✓ Resumen de derivadas
   └── □ Repaso final                    1 de 3 pendiente
```

Y su contrario, que es la única alerta de toda la app:

```
📌 Defensa del proyecto — en 6 días
   ⚠ Ninguna tarea planificada todavía
```

### "Lo que viene" vive aquí (decisión 73)

La lista de reminders se encabeza con los próximos. **Salió del calendario a
propósito**: el calendario responde *cuándo*, esta lista responde *qué sigue*.

### Cuatro cosas que no se negocian

1. **Las tareas sin reminder son de primera clase** (decisión 51). La mayoría
   de lo que entra por Siri no tendrá reminder nunca. Su vista **jamás** puede
   verse como un cajón de sobras.
2. **Asociar una tarea a un reminder es opcional de verdad**: un paso que se
   ignora sin fricción, nunca un campo obligatorio.
3. **Ningún contador de deuda.** Nada de "4 pendientes", "llevas 12 días sin
   tocar esto". El dato es verdadero y es justo el que hace cerrar la app.
4. **La app nunca regaña** (decisión 22). Un reminder vencido baja al
   histórico en silencio: sin rojo, sin insignia. Es tiempo que pasó, no una
   falta del usuario.

---

## C · Contextos

CRUD de `contexts` (ramos, proyectos, cursos, lecturas).

**Sin color.** Los seis colores de contexto se eliminaron en FD3: el color
ahora significa *qué tipo de entidad es*, y dos sistemas de color en la misma
pantalla hacen que ninguno signifique nada (decisión 66). El contexto es texto.

---

## Reglas técnicas

- **Next.js 16**: `middleware.ts` ya no existe, ahora es `proxy.ts`, y corre en
  Node por defecto. Las recetas de Supabase que encuentres por ahí apuntan a un
  archivo que esta versión no lee. La documentación de la versión exacta está
  en `node_modules/next/dist/docs/`.
- **Tailwind 4** con el preset de Tailwind 3 cargado por `@config`. **No lo
  traduzcas a `@theme`** (decisión 76).
- **`--rem` (ámbar) nunca como color de texto.** Mide 4.0:1: pasa como
  indicador, no como texto. La utilidad `text-rem` no existe, y no la crees.
- **44px de área táctil, sin excepción.**
- Reutiliza los componentes que ya hay: `Check`, `Row`, `ReminderFlag`,
  `TabBar`, `Icon`. No los reescribas.
- RLS ya filtra por `auth.uid()`: no dupliques ese filtro con lógica propia,
  pero tampoco te saltes RLS usando `admin` donde valga el cliente normal.
- Textos en español, código e identificadores en inglés.

---

## Fuera de alcance

- El calendario entero, y `anadir.html` — eso es **F2**, y otro agente lo está
  construyendo a la vez. **No toques nada de calendario.**
- Notificaciones, service worker, manifest — eso es **F3**.
- El módulo Recursos — eso es F6.
- `app/` — se lee, no se toca.
- `docs/` — no escribes ahí salvo tu informe.
- `docs/schema.sql` — no se toca sin preguntar al coordinador.

---

## Hecho cuando

Dices *"Oye Siri, anota comprar cuadernos"* y aparece en Tareas sin tocar el
teléfono. Y al abrir un reminder ves qué tareas suyas están hechas.

## Entregable

`docs/estado-F1.md`: qué quedó hecho, qué dejaste fuera, qué encontraste que
cambie el plan, y qué tiene que hacer el usuario a mano.

Antes de darlo por terminado: `npm run typecheck` y `npm run lint` en limpio.
**No corras `npm run build` ni `npm run verify`** — el usuario tiene el
servidor de desarrollo encendido y comparten la carpeta `.next/`.
