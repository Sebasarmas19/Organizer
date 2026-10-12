/* ============================================================================
   Organizer · Cuando la autenticación no se completa

   Sin estridencias, informativo y claro. Explica lo ocurrido y permite
   volver a intentar el inicio de sesión.
   ========================================================================= */

const REASONS: Record<string, { title: string; body: string }> = {
  'sin-codigo': {
    title: 'El enlace o código llegó incompleto',
    body: 'Suele ocurrir cuando el navegador corta la URL o el proveedor expira la solicitud. Vuelve a intentarlo.',
  },
  'enlace-invalido': {
    title: 'La solicitud de acceso caducó',
    body: 'Los enlaces y códigos de autenticación son de uso único y tienen tiempo límite. Solicita uno nuevo.',
  },
  'sin-perfil': {
    title: 'Sesión iniciada, pero falta tu perfil',
    body: 'La sesión es válida, pero ocurrió un error al inicializar tus datos de usuario en la base de datos.',
  },
  'no-autorizado': {
    title: 'Acceso no autorizado',
    body: 'Esta instalación tiene una lista restringida de usuarios y tu correo no está en ella.',
  },
  'oauth-cancelado': {
    title: 'Inicio de sesión no completado',
    body: 'Se canceló la autenticación con el proveedor o la sesión expiró. Puedes intentarlo de nuevo en cualquier momento.',
  },
};

const FALLBACK = {
  title: 'No se pudo completar el acceso',
  body: 'Ocurrió un problema durante el inicio de sesión. Vuelve a intentarlo o comprueba tu conexión.',
};

export const metadata = { title: 'No se pudo entrar · Organizer' };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const reason = (motivo && REASONS[motivo]) || FALLBACK;

  return (
    <main className="screen" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="gutter"
        style={{
          maxWidth: 420,
          width: '100%',
          margin: '0 auto',
          padding: 'var(--space-8) var(--space-6)',
          backgroundColor: 'var(--io-cell, var(--surface, #ffffff))',
          borderRadius: 24,
          border: '1px solid var(--io-sep, var(--line, rgba(0,0,0,0.08)))',
          boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        }}
      >
        <h1 className="t-section">{reason.title}</h1>
        <p className="t-body c-muted" style={{ marginTop: 'var(--space-2)' }}>
          {reason.body}
        </p>
        <a
          href="/entrar"
          className="btn btn--primary btn--full"
          style={{ marginTop: 'var(--space-6)', textDecoration: 'none' }}
        >
          Volver a intentar
        </a>
      </div>
    </main>
  );
}
