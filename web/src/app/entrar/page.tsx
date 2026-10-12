/* ============================================================================
   Organizer · Pantalla de inicio de sesión (/entrar)

   Diseño elegante estilo SaaS / Apple:
   - Tarjeta central con bordes suaves y elevación sutil
   - Autenticación segura mediante Google OAuth y enlace mágico
   - Retorno automático a la ruta solicitada mediante parámetro `next`
   - Enlace de retorno al inicio
   ========================================================================= */

import { Suspense } from 'react';
import Link from 'next/link';
import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Iniciar sesión · Organizer',
  description: 'Accede a tu organizador personal para gestionar tus materias, tareas y horario.',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; motivo?: string }>;
}) {
  const params = await searchParams;
  const nextParam = params?.next || '';
  const motivoParam = params?.motivo || '';

  return (
    <main
      className="screen"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6, 24px) var(--space-4, 16px)',
        backgroundColor: 'var(--io-bg, var(--bg, #F4F2EC))',
      }}
    >
      <div
        className="w-full"
        style={{
          maxWidth: 400,
          backgroundColor: 'var(--io-cell, var(--surface, #FFFFFF))',
          borderRadius: 24,
          border: '1px solid var(--io-sep, rgba(0, 0, 0, 0.08))',
          boxShadow:
            '0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 20px 30px -4px rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          padding: 'var(--space-8, 32px) var(--space-6, 24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Isotipo de la app */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: 'var(--io-tint, #265A44)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(38, 90, 68, 0.25)',
            marginBottom: 'var(--space-4, 16px)',
          }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
        </div>

        {/* Título y subtítulo */}
        <h1
          style={{
            fontSize: 22,
            lineHeight: 1.25,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text, #1B1F1C)',
            margin: 0,
          }}
        >
          Organizer
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.45,
            color: 'var(--text-muted, #5C635D)',
            marginTop: 6,
            marginBottom: 0,
            maxWidth: 280,
          }}
        >
          Tu espacio de planificación personal. Un toque y estás dentro.
        </p>

        {/* Formulario de autenticación */}
        <Suspense
          fallback={
            <div
              className="w-full flex items-center justify-center"
              style={{ minHeight: 120, marginTop: 'var(--space-6, 24px)' }}
            >
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--io-tint, #265A44)', borderTopColor: 'transparent' }}
              />
            </div>
          }
        >
          <SignInForm nextParam={nextParam} motivoParam={motivoParam} />
        </Suspense>

        {/* Enlace para volver a la landing / inicio */}
        <div style={{ marginTop: 'var(--space-6, 24px)' }}>
          <Link
            href="/"
            className="text-xs transition-colors hover:underline inline-flex items-center gap-1.5"
            style={{
              color: 'var(--text-muted, #5C635D)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Volver a inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
