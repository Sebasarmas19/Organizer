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
        {state.kind === 'google' ? 'Abriendo Google…' : 'Entrar con Google'}
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
