'use client';

/* ============================================================================
   Organizer · Formulario de inicio de sesión (Google OAuth & Magic Link)

   Estilo SaaS / Apple moderno:
   - Botón principal de "Continuar con Google" con estado de carga interactivo
   - Soporte para redirección inteligente mediante parámetro `next`
   - Opción secundaria discreta para enlace mágico por correo
   - Manejo de estados de carga, confirmación y errores accesibles (aria-live)
   ========================================================================= */

import { useState, useTransition, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type State =
  | { kind: 'idle' }
  | { kind: 'google' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

interface SignInFormProps {
  nextParam?: string;
  motivoParam?: string;
}

export function SignInForm({ nextParam = '', motivoParam = '' }: SignInFormProps) {
  const [state, setState] = useState<State>(() => {
    if (motivoParam === 'no-autorizado') {
      return { kind: 'error', message: 'Esta cuenta no está autorizada para acceder a esta instalación.' };
    }
    if (motivoParam === 'oauth-cancelado') {
      return { kind: 'error', message: 'Se canceló el inicio de sesión con Google o la sesión expiró.' };
    }
    if (motivoParam === 'sin-codigo' || motivoParam === 'enlace-invalido') {
      return { kind: 'error', message: 'El enlace de acceso no es válido o ya caducó. Solicita uno nuevo.' };
    }
    return { kind: 'idle' };
  });

  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [, startTransition] = useTransition();

  function getEffectiveNext(): string {
    if (nextParam) return nextParam;
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('next') || '';
    }
    return '';
  }

  async function signInWithGoogle() {
    if (state.kind === 'google') return;
    setState({ kind: 'google' });

    try {
      const supabase = createClient();
      const effectiveNext = getEffectiveNext();

      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (effectiveNext) {
        callbackUrl.searchParams.set('next', effectiveNext);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setState({ kind: 'error', message: error.message });
      }
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servicio de autenticación.',
      });
    }
  }

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === 'sending') return;
    if (!email.trim()) return;

    setState({ kind: 'sending' });

    try {
      const supabase = createClient();
      const effectiveNext = getEffectiveNext();

      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (effectiveNext) {
        callbackUrl.searchParams.set('next', effectiveNext);
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true,
        },
      });

      if (error) {
        setState({
          kind: 'error',
          message: error.message,
        });
        return;
      }

      startTransition(() => {
        setState({ kind: 'sent', email: email.trim() });
      });
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo conectar con el servidor.',
      });
    }
  }

  return (
    <div className="w-full" style={{ marginTop: 'var(--space-6, 24px)' }}>
      {/* Botón principal: Continuar con Google */}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={state.kind === 'google'}
        className="w-full relative flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-150 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed select-none active:scale-[0.99]"
        style={{
          minHeight: 48,
          backgroundColor: '#FFFFFF',
          color: '#1B1F1C',
          border: '1px solid rgba(0, 0, 0, 0.12)',
        }}
        aria-label="Continuar con Google"
      >
        {state.kind === 'google' ? (
          <>
            <svg
              className="animate-spin"
              style={{ width: 18, height: 18, color: '#265A44' }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span style={{ fontWeight: 500 }}>Conectando con Google...</span>
          </>
        ) : (
          <>
            <span
              style={{
                width: 20,
                height: 20,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" focusable="false">
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
            <span style={{ fontWeight: 500 }}>Continuar con Google</span>
          </>
        )}
      </button>

      {/* Alerta de error accesible */}
      {state.kind === 'error' && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed"
          style={{
            marginTop: 'var(--space-4, 16px)',
            backgroundColor: 'rgba(234, 67, 53, 0.08)',
            border: '1px solid rgba(234, 67, 53, 0.2)',
            color: '#A02015',
          }}
        >
          <svg
            style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{state.message}</span>
        </div>
      )}

      {/* Confirmación de enlace enviado por correo */}
      {state.kind === 'sent' && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl text-center"
          style={{
            marginTop: 'var(--space-5, 20px)',
            backgroundColor: 'rgba(38, 90, 68, 0.08)',
            border: '1px solid rgba(38, 90, 68, 0.2)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-2"
            style={{ backgroundColor: '#265A44', color: '#FFFFFF' }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: '#1B1F1C' }}>
            Enlace enviado a {state.email}
          </p>
          <p className="text-xs text-muted mt-1" style={{ color: 'var(--text-muted, #5C635D)' }}>
            Ábrelo en este mismo navegador para ingresar automáticamente.
          </p>
        </div>
      )}

      {/* Separador sutil */}
      <div
        className="flex items-center gap-3"
        style={{ marginBlock: 'var(--space-6, 24px)' }}
        aria-hidden="true"
      >
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--io-sep, rgba(0, 0, 0, 0.08))' }} />
        <span
          className="text-xs font-normal"
          style={{ color: 'var(--text-muted, #5C635D)', letterSpacing: '0.02em' }}
        >
          o con correo electrónico
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--io-sep, rgba(0, 0, 0, 0.08))' }} />
      </div>

      {/* Salida secundaria discreta: Magic link por correo */}
      {emailOpen ? (
        <form onSubmit={sendLink} className="space-y-3">
          <label
            htmlFor="email-input"
            className="block text-xs font-medium"
            style={{ color: 'var(--text-muted, #5C635D)' }}
          >
            Correo electrónico
          </label>
          <div className="relative">
            <input
              id="email-input"
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
              onChange={(e) => setEmail(e.target.value)}
              disabled={state.kind === 'sending'}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl transition-colors outline-none"
              style={{
                backgroundColor: 'var(--surface-sunken, #F4F2EC)',
                border: '1px solid var(--io-sep, rgba(0, 0, 0, 0.12))',
                color: 'var(--text, #1B1F1C)',
                minHeight: 44,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={state.kind === 'sending' || !email.trim()}
            className="btn btn--primary btn--full rounded-xl"
            style={{
              minHeight: 44,
              marginTop: 'var(--space-3, 12px)',
            }}
          >
            {state.kind === 'sending' ? 'Enviando enlace...' : 'Enviar enlace de acceso'}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className="text-xs transition-colors hover:underline"
            style={{ color: 'var(--text-muted, #5C635D)' }}
          >
            Entrar con un enlace al correo
          </button>
        </div>
      )}
    </div>
  );
}
