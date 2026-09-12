/* ============================================================================
   Organizer · Configuracion de Tailwind para los comps
   Carga DESPUES de cdn.tailwindcss.com.

   Cada nombre de aqui apunta a una variable de tokens.css. Los nombres de
   clase que se usan en los comps (bg-surface, text-muted, border-line...)
   son los mismos que tendra la app real: portar un comp a Next.js es copiar
   el marcado, no rehacerlo. Ver tailwind.preset.js.
   ========================================================================= */

tailwind.config = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        sunken: 'var(--surface-sunken)',
        klass: 'var(--surface-class)',
        /* FD3 · los tres colores de entidad (decisiones 63-66). Se usan en
           fondos, barras y puntos; nunca en utilidades de texto. */
        task: 'var(--task)',
        'task-soft': 'var(--task-soft)',
        klassc: 'var(--class)',
        'klass-soft': 'var(--class-soft)',
        rem: 'var(--rem)',
        'rem-soft': 'var(--rem-soft)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        'line-control': 'var(--line-control)',
        ink: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'on-accent': 'var(--text-on-accent)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        title:   ['var(--text-title)',   { lineHeight: 'var(--lh-title)',   letterSpacing: 'var(--tracking-title)' }],
        section: ['var(--text-section)', { lineHeight: 'var(--lh-section)', letterSpacing: 'var(--tracking-title)' }],
        body:    ['var(--text-body)',    { lineHeight: 'var(--lh-body)',    letterSpacing: 'var(--tracking-body)'  }],
        meta:    ['var(--text-meta)',    { lineHeight: 'var(--lh-meta)',    letterSpacing: 'var(--tracking-body)'  }],
        label:   ['var(--text-label)',   { lineHeight: 'var(--lh-label)',   letterSpacing: 'var(--tracking-label)' }],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
      spacing: {
        gutter: 'var(--gutter)',
        tap: 'var(--tap-min)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '190ms',
      },
    },
  },
};
