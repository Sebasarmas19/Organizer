'use client';

/* ============================================================================
   Organizer · El formulario de entrada

   Cliente porque tiene estado y llama a Supabase desde el navegador. Es el
   unico formulario de toda la app que pide algo antes de dejarte pasar.

   Tres cosas que no son cosmeticas:

   - El campo mide 44px (`.field`) y el boton tambien (`.btn`). El minimo
     tactil del sistema no tiene excepciones, ni siquiera en la pantalla que
     se ve una vez cada seis meses.
   - `type="email"` e `inputMode="email"` para que iOS abra el teclado con la
     arroba. Y `autoComplete="email"` para que el gestor de contrasenas pueda
     rellenarlo.
   - El mensaje de "revisa tu correo" es `aria-live`: si no, un lector de
     pantalla no se entera de que paso algo.
   ========================================================================= */

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'sending') return;

    setState({ kind: 'sending' });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }
      setState({ kind: 'sent', email });
    } catch (error) {
      /* Tipicamente: faltan las variables de entorno. Se dice tal cual en
         vez de dejar un "Failed to fetch" que no orienta a nadie. */
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con Supabase.',
      });
    }
  }

  if (state.kind === 'sent') {
    return (
      <div role="status" style={{ marginTop: 'var(--space-8)' }}>
        <p className="t-body">Listo. Te mandamos un enlace a {state.email}.</p>
        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-2)' }}>
          Abrelo desde este mismo telefono. El enlace caduca en una hora.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-8)' }}>
      <label className="t-label c-muted" htmlFor="email" style={{ fontWeight: 600 }}>
        Tu correo
      </label>

      <div className="field" style={{ marginTop: 'var(--space-2)' }}>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--full"
        style={{ marginTop: 'var(--space-4)' }}
        disabled={state.kind === 'sending'}
      >
        {state.kind === 'sending' ? 'Enviando…' : 'Mandarme el enlace'}
      </button>

      <p aria-live="polite" className="t-meta" style={{ marginTop: 'var(--space-3)', minHeight: 20 }}>
        {state.kind === 'error' ? (
          <span className="c-muted">No se pudo mandar el enlace: {state.message}</span>
        ) : null}
      </p>
    </form>
  );
}
