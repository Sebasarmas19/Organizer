# Preguntas abiertas

Munición para la sesión de `/grill-me`. Ordenadas por cuánto cambian el plan.

---

## Bloqueantes — hay que responderlas antes de construir

### 1. ¿La zona horaria UTC−4 es correcta?

Se detectó "Eastern Standard Time" del sistema Windows, pero el usuario escribe
en español y podría estar en Latinoamérica con el reloj mal configurado.

**Por qué importa:** todo el `pg_cron` de notificaciones depende de esto. Si
está mal, las notificaciones llegan a las 4 de la mañana y el proyecto muere la
primera semana.

### 2. ¿Su iPhone corre iOS 16.4 o superior?

**Por qué importa:** por debajo de esa versión **no existe Web Push en iOS**.
Sin eso, toda la premisa del proyecto (push, no pull) se cae y hay que replantear
desde cero. Verificar en Ajustes → General → Información.

### 3. ¿Está dispuesto a instalar la PWA en la pantalla de inicio y dejarla ahí?

**Por qué importa:** iOS solo entrega push a PWAs instaladas. Si la desinstala,
la suscripción muere en silencio.

---

## Importantes — cambian el diseño, no lo bloquean

### 4. ¿Planifica el domingo desde el iPhone o desde el computador?

Armar una semana entera en una pantalla de teléfono es incómodo. Si planifica
en el PC, la vista Semana necesita layout de escritorio real, no una versión
móvil estirada. Eso cambia bastante F2.

### 5. ¿Cuántas cosas caben en un día antes de que se vuelva ruido?

Con ADHD, ver 12 tareas equivale a ver cero. ¿La vista Hoy debe cortar a 3, a 5,
o mostrar todo? ¿Y qué pasa con lo que queda fuera del corte?

### 6. ¿Qué hace la app si ignora las notificaciones 3 días seguidos?

La notificación de las 8am se vuelve ruido de fondo en dos semanas. Opciones:
cambiar la hora sola, cambiar el tono del mensaje, preguntar si algo no está
funcionando, o no hacer nada. Sin una respuesta, el sistema se degrada solo.

### 7. ¿Las clases necesitan notificación, o solo las tareas?

Si suena una notificación por cada clase del semestre, se vuelven ruido y deja
de mirarlas — incluidas las que sí importan.

### 8. ¿Quiere migrar lo que ya tiene anotado en Notion y WhatsApp?

Si empieza con la app vacía mientras el "backlog real" sigue en otro lado, la
fragmentación continúa y la app es el cuarto vertedero, no el único destino.

---

## Menores — se pueden decidir sobre la marcha

### 9. Horas exactas de notificación

El usuario lo pospuso explícitamente (decisión #15). Los valores por defecto
del esquema son 8:00 / 21:00 / domingo 19:00. Es configuración, no arquitectura.

### 10. ¿Distinguir tareas de hábitos recurrentes?

"Gym 3 veces por semana" no es lo mismo que "entregar informe". Hoy el esquema
no modela recurrencia salvo por `schedule_templates`, que está pensado para
clases. Puede vivir como plantilla, pero es un uso forzado.

### 11. ¿Estimación de tiempo y aprendizaje?

`items.estimate_min` existe en el esquema pero nada lo usa. La estimación con
ADHD es notoriamente optimista. ¿Vale la pena que la app compare lo estimado
con lo real y avise "esto te toma el doble"?

### 12. ¿Qué pasa con las entregas con fecha tope?

`items.due_on` existe pero ninguna fase lo consume. Una entrega el viernes
debería aparecer antes del viernes, no ese día. Falta definir con cuánta
anticipación y dónde se ve.

---

## Contradicciones detectadas que conviene resolver

### A. Calendario rígido versus ADHD

Eligió bloques horarios sabiendo el riesgo (decisión #3). Las mitigaciones están
comprometidas, pero vale preguntar: **¿qué señal usaríamos para admitir que no
funcionó y degradar a lista por día?** Sin un criterio definido antes, lo más
probable es abandonar la app en vez de simplificarla.

### B. "No recortes calidad" versus 3 días de plazo

Ambas cosas son razonables por separado. El plan las concilia ordenando en vez
de recortando (F0+F1+F3 primero). **Falta confirmar que acepta ese orden**, y en
particular que la vista de calendario semanal no esté lista el día 1.

### C. Quiere el hábito de planificar, pero nunca vuelve a sus notas

El ritual del domingo es *pull* — requiere que él entre. Es exactamente el
comportamiento que hoy no tiene. La notificación del domingo ayuda, pero si la
ignora, F4 completa no sirve de nada. **¿Qué pasa si no hace la revisión?**
¿La semana se arma sola con las clases? ¿La app insiste el lunes?
