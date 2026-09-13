/**
 * Organizer · preset de Tailwind para la app real (Next.js).
 *
 * Copia de `app/tailwind.preset.js` con UNA divergencia deliberada, marcada
 * abajo como FD3 §9.2. Todo lo demas es identico.
 *
 * Uso en tailwind.config.js:
 *
 *   const preset = require('./tailwind.preset.js')
 *   module.exports = { presets: [preset], content: [...] }
 *
 * Y en el CSS raiz:  @import './styles/tokens.css'
 *
 * La fuente de verdad sigue siendo tokens.css. Esto solo expone esos tokens
 * como nombres de clase, de modo que el marcado de los comps de `app/comps/`
 * se porta a componentes de React sin tocar una sola clase.
 *
 * Las clases estan pensadas para leerse como el sistema, no como pixeles:
 *   bg-surface   text-muted   border-line   text-body   rounded   px-gutter
 */

/*
 * ── FD3 §9.2 · POR QUE `rem` Y `klassc` NO ESTAN EN `colors` ────────────────
 *
 * En Tailwind, una entrada de `theme.colors` genera TODAS las utilidades de
 * color a la vez: `bg-`, `border-`, `fill-`, `stroke-` y tambien `text-`.
 *
 * `--rem` (ambar) mide 4.0:1 sobre el fondo. Pasa como indicador no textual
 * (>= 3:1) y NO pasa como texto (>= 4.5:1). Mientras los comps se escribieron
 * a mano nadie escribio `color: var(--rem)` sobre un titulo; en cuanto haya
 * componentes, el primer `text-rem` que alguien teclee rompe AA sin que nada
 * avise. Esta es la barrera: la utilidad no existe, asi que no se puede usar.
 *
 * `--class` (verde) SI llega a 4.5:1, pero `DESIGN.md` prohibe el texto verde
 * igual que el ambar: el color de entidad va a la superficie, nunca a la letra
 * ("el color envuelve al texto, nunca lo pinta"). Se aplica la misma barrera
 * por la misma razon, aunque esta sea de sistema y no de contraste.
 *
 * Siguen disponibles, y son las que de verdad se usan en los comps:
 *   bg-rem  bg-rem-soft  border-rem  fill-rem  stroke-rem
 *   bg-klassc  bg-klass-soft  border-klassc  fill-klassc  stroke-klassc
 *
 * Para el banderin, que es un icono y hereda `currentColor`, existe
 * `.rem__flag` en base.css, que ya lo pinta con el token correcto.
 *
 * El azul `task` SI esta en `colors` con su `text-task`: es la unica
 * excepcion declarada del sistema, porque el azul como texto de accion no
 * etiqueta una tarea, dice "esto se toca". Mide 10.5:1.
 * ───────────────────────────────────────────────────────────────────────────
 */

const entityNonText = {
  rem: 'var(--rem)',
  'rem-soft': 'var(--rem-soft)',
  klassc: 'var(--class)',
  'klass-soft': 'var(--class-soft)',
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        sunken: 'var(--surface-sunken)',
        klass: 'var(--surface-class)',      // fondo de las clases en Semana
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-press': 'var(--accent-press)',
        'accent-soft': 'var(--accent-soft)',
        'on-accent': 'var(--text-on-accent)',
        'line-control': 'var(--line-control)',

        // FD3 · el color dice que TIPO de cosa es (decisiones 63-66).
        // Se usan en fondos, barras y puntos; nunca como color de texto.
        // El acento del sistema ES `task`: accent y task apuntan al mismo
        // valor a proposito (decision 65).
        task: 'var(--task)',
        'task-press': 'var(--task-press)',
        'task-soft': 'var(--task-soft)',
      },

      // Ambar y verde entran solo por las escalas que no pintan letra.
      backgroundColor: entityNonText,
      borderColor: entityNonText,
      fill: entityNonText,
      stroke: entityNonText,

      fontFamily: {
        sans: ['var(--font-sans)'],
      },

      // Cinco tamanos. No anadir un sexto: la jerarquia se hace con peso.
      fontSize: {
        title:   ['var(--text-title)',   { lineHeight: 'var(--lh-title)',   letterSpacing: 'var(--tracking-title)' }],
        section: ['var(--text-section)', { lineHeight: 'var(--lh-section)', letterSpacing: 'var(--tracking-title)' }],
        body:    ['var(--text-body)',    { lineHeight: 'var(--lh-body)',    letterSpacing: 'var(--tracking-body)'  }],
        meta:    ['var(--text-meta)',    { lineHeight: 'var(--lh-meta)',    letterSpacing: 'var(--tracking-body)'  }],
        label:   ['var(--text-label)',   { lineHeight: 'var(--lh-label)',   letterSpacing: 'var(--tracking-label)' }],
      },

      // Dos radios en toda la app.
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },

      spacing: {
        gutter: 'var(--gutter)',
        'gutter-wide': 'var(--gutter-wide)',
        tap: 'var(--tap-min)',
      },

      boxShadow: {
        sheet: 'var(--shadow-sheet)',
        float: 'var(--shadow-float)',
        // La separacion por defecto: una linea de 1px, nunca una sombra.
        hairline: 'inset 0 -1px 0 var(--line)',
        'hairline-top': 'inset 0 1px 0 var(--line)',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },

      transitionDuration: {
        instant: '90ms',
        fast: '150ms',
        DEFAULT: '190ms',
      },
    },
  },
};
