'use client';

/* ============================================================================
   Organizer · El formulario de entrada

   POR QUE GOOGLE Y NO CORREO
   --------------------------------------------------------------------------
   El correo fue el camino durante media hora y fallo dos veces, por dos
   razones distintas y las dos estructurales:

   1. Verificado contra la base el 2026-09-13: el correo salio a las 01:32:14
      y la cuenta quedo confirmada a las 01:32:30, dieciseis segundos despues,
      sin que se creara ninguna sesion. Nadie abre un correo en dieciseis
      segundos: fue el escaner de enlaces de Gmail. El enlace es de un solo
      uso, el escaner lo gasta, y al usuario le llega `otp_expired`.
   2. El arreglo natural —mandar un codigo de seis digitos en vez de un
      enlace— exige editar la plantilla del correo, y Supabase solo lo permite
      con un servidor SMTP propio. Montar un servicio de correo entero para
      una app cuyo unico uso del correo es entrar era la cola moviendo al
      perro.

   Google resuelve las dos de golpe y ademas quita el limite de cuatro correos
   por hora del plan gratis. En el iPhone la sesion de Google ya esta abierta,
   asi que entrar es un toque, que es exactamente lo que esta app necesita: el
   usuario no vuelve de una friccion, se queda fuera.

   El correo se queda como salida de emergencia, discreta. Si la configuracion
   de Google se rompe, el usuario no se queda encerrado fuera de sus datos.

   Dos cosas que no son cosmeticas:

   - El boton mide 44px (`.btn`). El minimo tactil del sistema no tiene
     excepciones, ni en la pantalla que se ve una vez cada seis meses.
   - Los mensajes son `aria-live`: si no, un lector de pantalla no se entera
     de que paso algo.
   ========================================================================= */

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type State =
  | { kind: 'idle' }
  | { kind: 'google' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

export function SignInForm() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');

  async function signInWithGoogle() {
    if (state.kind === 'google') return;
    setState({ kind: 'google' });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });
      /* Si sale bien, el navegador ya se fue a Google y esto no se ejecuta. */
      if (error) setState({ kind: 'error', message: error.message });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudo abrir Google.',
      });
    }
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'sending') return;
    setState({ kind: 'sending' });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/auth/callback' },
      });
      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }
      setState({ kind: 'sent', email });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con Supabase.',
      });
    }
  }

  return (
    <div style={{ marginTop: 'var(--space-8)' }}>
      <button
        type="button"
        className="btn btn--primary btn--full"
        onClick={signInWithGoogle}
        disabled={state.kind === 'google'}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 6.02-1.07 8.04-2.91l-3.88-3.05c-1.08.73-2.47 1.16-4.16 1.16-3.19 0-5.9-2.16-6.87-5.06H1.07v3.14C3.12 21.32 7.27 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.13 14.14c-.25-.73-.39-1.51-.39-2.14s.14-1.41.39-2.14V6.72H1.07C.39 8.08 0 9.77 0 12s.39 3.92 1.07 5.28l4.06-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.12 2.68 1.07 6.72l4.06 3.14c.97-2.9 3.68-5.09 6.87-5.09Z"
            />
          </svg>
        </span>
        <span>{state.kind === 'google' ? 'Abriendo Google…' : 'Entrar con Google'}</span>
      </button>

      <p
        aria-live="polite"
        className="t-meta"
        style={{ marginTop: 'var(--space-3)', minHeight: 20 }}
      >
        {state.kind === 'error' ? (
          <span className="c-muted">{state.message}</span>
        ) : null}
      </p>

      {/* ------------------------------------------------ salida de emergencia
          Deliberadamente callada. No es una segunda opcion que haya que
          sopesar cada vez: es lo que se usa el dia que Google falle. */}
      {state.kind === 'sent' ? (
        <div role="status" style={{ marginTop: 'var(--space-6)' }}>
          <p className="t-meta">Te mandamos un enlace a {state.email}.</p>
          <p className="t-label c-muted" style={{ marginTop: 'var(--space-1)' }}>
            Ábrelo en este mismo navegador. Caduca en una hora.
          </p>
        </div>
      ) : emailOpen ? (
        <form onSubmit={sendLink} style={{ marginTop: 'var(--space-6)' }}>
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
              autoFocus
              placeholder="tu@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn--full"
            style={{ marginTop: 'var(--space-3)' }}
            disabled={state.kind === 'sending'}
          >
            {state.kind === 'sending' ? 'Enviando…' : 'Mandarme un enlace'}
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="taptext t-label c-muted"
          style={{ marginTop: 'var(--space-4)' }}
          onClick={() => setEmailOpen(true)}
        >
          Entrar con un enlace al correo
        </button>
      )}
    </div>
  );
}
