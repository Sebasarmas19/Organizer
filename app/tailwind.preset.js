/**
 * Organizer · preset de Tailwind para la app real (Next.js).
 *
 * Uso en tailwind.config.ts:
 *
 *   import preset from './tailwind.preset.js'
 *   export default { presets: [preset], content: [...] }
 *
 * Y en el layout raiz:  import './tokens.css'
 *
 * La fuente de verdad sigue siendo tokens.css. Esto solo expone esos tokens
 * como nombres de clase, de modo que el marcado de los comps de `app/comps/`
 * se porta a componentes de React sin tocar una sola clase.
 *
 * Las clases estan pensadas para leerse como el sistema, no como pixeles:
 *   bg-surface   text-muted   border-line   text-body   rounded   px-gutter
 */

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
        // Contextos: se aplican con la variable --ctx en el elemento, no con
        // una clase por color, para que el color venga de la base de datos.
        ctx: 'var(--ctx, var(--text-faint))',
      },

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
