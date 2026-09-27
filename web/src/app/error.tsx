'use client';

/* ============================================================================
   Organizer · Límite de error global para la aplicación
   Regla 5 ("la app nunca regaña") y regla 6 ("nada se pierde en silencio").
   Si Supabase no responde o falla la red, el usuario ve una explicación clara
   y un botón para reintentar, en lugar de una pantalla en blanco o de Next.js.
   ========================================================================= */

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error boundary capturó un fallo no controlado:', error);
  }, [error]);

  return (
    <div className="fd-app">
      <main
        className="fd-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <h1 className="fd-h1" style={{ marginBottom: '0.75rem' }}>
          Algo no fue bien
        </h1>
        <p className="fd-sub" style={{ marginBottom: '1.5rem', maxWidth: '340px' }}>
          No se pudo conectar con el servidor en este momento. Tus datos y tareas están a salvo.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="fd-pill fd-pill--brand"
            style={{ cursor: 'pointer', padding: '0.5rem 1.25rem' }}
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="fd-pill"
            style={{ textDecoration: 'none', padding: '0.5rem 1.25rem' }}
          >
            Volver a Inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
