# FD2 · Correcciones y modelo de tres entidades

> Segunda ronda. El usuario revisó los comps y el modelo cambió.
> **Lee `docs/08-modelo-tareas-reminders.md` completo antes de tocar nada.**
> Tu sistema (`tokens.css`, `base.css`, iconos) se mantiene: no lo rehagas.

---

## A · Un fallo que tienes que corregir

`tokens.css` define `--tap-min: 44px` y luego lo incumples justo en los tres
controles que más se usan:

| Control | Está | Debe |
|---|---|---|
| `.triage .btn` — Hoy / Otro día / Quitar | 40px (`base.css:258`) | 44px |
| "Se me corrió el día" | 32px (`inicio.html:74`) | 44px |
| `.undo button` | 32px (`base.css:313`) | 44px |
| Controles a 32px en `semana.html:65`, `tareas.html:85` y `:126` | 32px | 44px |

Son el triage (decisión #5), la mitigación del riesgo del calendario
(decisión #3) y el deshacer que el brief exige. **Los controles críticos son los
más pequeños, exactamente al revés de lo que la app necesita.** Se usa
caminando, con una mano.

Si al subirlos algo deja de caber en `Inicio`, el que sale es contenido, no el
tamaño del control.

---

## B · El modelo cambió: tres entidades

Antes había tareas con fecha. Ahora hay **materias, reminders y tareas**.
`docs/08-modelo-tareas-reminders.md` lo explica entero; el resumen operativo:

| | Qué es | Se crea en | ¿Se completa? |
|---|---|---|---|
| **Materias** | El horario fijo del semestre | Formulario, una vez | No |
| **Reminders** | Parciales, entregas, defensas | **Tocando un día del calendario** | **No.** Pasa la fecha y queda listo |
| **Tareas** | Lo que haces | Siri, o el módulo Tareas | Sí |

### Las dos reglas que no puedes romper

1. **Ninguna pantalla pregunta "¿esto es tarea o reminder?".** El lugar donde
   entras lo determina. Preguntarlo sería la fricción que mató Notion.
2. **Las tareas sin reminder no son de segunda clase.** La mayoría de capturas
   por Siri no tendrán reminder nunca. Su vista **jamás** debe verse como un
   cajón de sobras.

### Lo que hay que mostrar: la relación

Es donde está el valor, y no existe en ninguna app de tareas:

```
📌 Parcial de Cálculo — viernes 20
   ├── ✓ Resolver guía capítulo 3
   ├── ✓ Resumen de derivadas
   └── □ Repaso final                    1 de 3 pendiente
```

Y su contrario, que es la alerta que hoy no tiene en ningún lado:

```
📌 Defensa del proyecto — en 6 días
   ⚠ Ninguna tarea planificada todavía
```

Un reminder vencido **nunca es deuda**: baja al histórico en silencio. Sin rojo,
sin insignia, sin perseguir. Es tiempo que pasó, no una falta del usuario.

---

## C · `Inicio`: cambia el orden

```
1. Hoy            ← PRIMERO. Las tareas del día, para marcarlas
2. De ayer        ← el triage
3. Esta semana    ← reminders próximos
4. La racha
```

Lo primero que se ve debe ser **lo que puedes hacer ahora**, no la deuda.

### Lógica del triage, ahora definida

| Botón | Qué ocurre |
|---|---|
| **Hoy** | Sale de "de ayer" y **sube a la lista de Hoy**, en el sitio, sin navegar |
| **Otro día** | Abre un selector para elegir cuándo |
| **Quitar** | **Vuelve al módulo Tareas.** Nunca se borra |

Dibuja el estado intermedio de "Otro día": ese selector no existe todavía.

---

## D · El calendario: tres vistas, tres preguntas

**No es el mismo contenido en letra más chica.** Cada nivel responde otra cosa:

| Vista | La pregunta | Muestra | NO muestra |
|---|---|---|---|
| **Día** | ¿Qué hago ahora? | Bloques por hora: tareas y materias. Reminders del día como banda arriba | — |
| **Semana** | ¿Cómo reparto el trabajo? | Los 7 días con sus reminders visibles y la carga de tareas. Materias en gris | — |
| **Mes** | ¿Qué se me viene encima? | **Solo reminders** | Tareas y materias |

La vista de **mes es nueva** y es para lo que el usuario usaba el Calendar del
iPhone: *"¿cuándo son mis parciales?"*. Meterle tareas la arruinaría.

**Filtros** (solo tareas / solo reminders / ambos): en día y semana. En mes no
hacen falta.

### Materias = reservar espacio

En palabras del usuario:

> "Cuando planificamos no es que por tener Sistemas Operativos a las 8 cambiemos
> la planificación; nos importa más el tiempo que tenemos disponible."

Una materia **no es contenido, es ausencia de tiempo disponible**. Gris, de
fondo, nunca compitiendo. Con un **interruptor para ocultarlas** al planificar:
entonces interesa el hueco, no la clase.

---

## E · Módulo Tareas

Ahora muestra dos cosas:

1. **Tareas** — con su botón de añadir. Capturar aquí sigue costando cero.
2. **Reminders** — **solo de lectura**. No se crean aquí: se crean sobre el
   calendario, porque un reminder sin fecha no existe.
3. **Una vista de la relación**: reminders con sus tareas hechas y pendientes.

Al crear una tarea, opción **opcional** de asociarla a un reminder. Opcional de
verdad: un paso que se puede ignorar sin fricción, nunca un campo obligatorio.

**Carpetas = contextos** (ya lo dibujaste así, se confirma).

---

## F · Fuera de alcance en esta ronda

- **Recursos no se toca.** Al usuario le sirve como está.
- El formulario de carga del horario: **solo el comp**, es el mayor trabajo
  manual del proyecto y tiene que verse rápido (repetir materia en varios días,
  duplicar filas, nunca pedir dos veces el mismo dato).
- La anticipación de aviso de cada reminder queda abierta hasta F3.

---

## Entregables

Actualiza los comps existentes y añade los nuevos:

| Archivo | Estado |
|---|---|
| `comps/inicio.html` | Reordenar + touch targets |
| `comps/inicio-vacio.html` | Reordenar |
| `comps/semana.html` | Reminders visibles + interruptor de materias |
| `comps/semana-escritorio.html` | Íd. |
| `comps/mes.html` | **Nuevo.** Solo reminders |
| `comps/tareas.html` | Reminders de lectura + vista de la relación |
| `comps/reminder-detalle.html` | **Nuevo.** Un reminder con sus tareas asociadas |
| `comps/otro-dia.html` | **Nuevo.** El selector del triage |
| `comps/horario.html` | **Nuevo.** Formulario de carga de materias |
| `comps/recursos.html` | **No tocar** |
| `comps/domingo.html`, `notificacion.html` | Revisar que sigan siendo ciertos |

Actualiza `app/DESIGN.md` y `app/revision.html` (el índice de revisión) con lo
nuevo. Escribe tu informe en `docs/estado-FD2.md`.

Mismas reglas de siempre: escribe solo en `app/` y en tu informe, no reabras
decisiones, textos en español y código en inglés. Si algo aquí choca con
`docs/01-decisiones.md`, pregunta citando el número.
