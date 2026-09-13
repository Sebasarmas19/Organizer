'use client';

/* ============================================================================
   Organizer · El formulario de entrada

   Cliente porque tiene estado y llama a Supabase desde el navegador. Es el
   unico formulario de toda la app que pide algo antes de dejarte pasar.

   POR QUE UN CODIGO Y NO UN ENLACE
   --------------------------------------------------------------------------
   Verificado contra la base el 2026-09-13: el correo salio a las 01:32:14 y
   la cuenta quedo confirmada a las 01:32:30, dieciseis segundos despues, sin
   que ninguna sesion se creara. Nadie abre un correo en dieciseis segundos:
   fue el escaner de enlaces de Gmail, que visita cada URL antes de ensenarte
   el mensaje. El enlace del magic link es de un solo uso, asi que el escaner
   lo gasta y al usuario le llega `otp_expired`.

   Un codigo de seis digitos no se puede gastar mirandolo. El escaner no lo
   escribe. Ademas resuelve el otro fallo del enlace: pedirlo en un navegador
   y abrirlo en otro rompe el intercambio PKCE, y con el codigo da igual donde
   este abierto el correo.

   El enlace sigue funcionando si la plantilla del correo lo incluye. El
   codigo es el camino principal, no el de repuesto.

   Tres cosas que no son cosmeticas:

   - El campo mide 44px (`.field`) y el boton tambien (`.btn`). El minimo
     tactil del sistema no tiene excepciones, ni siquiera en la pantalla que
     se ve una vez cada seis meses.
   - `inputMode="numeric"` y `autoComplete="one-time-code"` para que iOS
     ofrezca el codigo desde la notificacion del correo, sin teclearlo.
   - Los mensajes son `aria-live`: si no, un lector de pantalla no se entera
     de que paso algo.
   ========================================================================= */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type State =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'verifying' }
  | { kind: 'error'; message: string };

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });

  /* El correo ya se pidio: no se vuelve a la pantalla anterior por error. */
  const asked = state.kind === 'sent' || state.kind === 'verifying';

  async function requestCode(event: FormEvent<HTMLFormElement>) {
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
      setState({ kind: 'sent' });
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

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'verifying') return;

    setState({ kind: 'verifying' });

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      });

      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }

      /* `refresh` ademas de `push`: el servidor tiene que volver a leer la
         cookie de sesion para que `profiles` se cree del lado de alla. Sin
         el refresh, la navegacion de cliente sirve el arbol ya cacheado y la
         pantalla sigue creyendo que no hay sesion. */
      router.push('/');
      router.refresh();
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudo comprobar el codigo.',
      });
    }
  }

  const message =
    state.kind === 'error' ? (
      <span className="c-muted">{state.message}</span>
    ) : null;

  /* ---------------------------------------------------------------- paso 2 */
  if (asked || (state.kind === 'error' && code !== '')) {
    return (
      <form onSubmit={verifyCode} style={{ marginTop: 'var(--space-8)' }}>
        <p className="t-body">Te mandamos un código a {email}.</p>
        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-2)' }}>
          Seis dígitos. Caduca en una hora.
        </p>

        <label
          className="t-label c-muted"
          htmlFor="code"
          style={{ fontWeight: 600, display: 'block', marginTop: 'var(--space-6)' }}
        >
          El código
        </label>

        <div className="field" style={{ marginTop: 'var(--space-2)' }}>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            style={{ letterSpacing: '0.18em', fontVariantNumeric: 'tabular-nums' }}
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          style={{ marginTop: 'var(--space-4)' }}
          disabled={state.kind === 'verifying' || code.length < 6}
        >
          {state.kind === 'verifying' ? 'Comprobando…' : 'Entrar'}
        </button>

        <p
          aria-live="polite"
          className="t-meta"
          style={{ marginTop: 'var(--space-3)', minHeight: 20 }}
        >
          {message}
        </p>

        <button
          type="button"
          className="taptext t-label c-muted"
          onClick={() => {
            setCode('');
            setState({ kind: 'idle' });
          }}
        >
          Usar otro correo
        </button>
      </form>
    );
  }

  /* ---------------------------------------------------------------- paso 1 */
  return (
    <form onSubmit={requestCode} style={{ marginTop: 'var(--space-8)' }}>
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
        {state.kind === 'sending' ? 'Enviando…' : 'Mandarme el código'}
      </button>

      <p
        aria-live="polite"
        className="t-meta"
        style={{ marginTop: 'var(--space-3)', minHeight: 20 }}
      >
        {state.kind === 'error' ? (
          <span className="c-muted">No se pudo mandar el código: {state.message}</span>
        ) : null}
      </p>
    </form>
  );
}
