/* ============================================================================
   Organizer · Cuando el enlace no funciona

   Sin rojo y sin reproche, como el resto del sistema. Dice que paso y que
   hacer, que es lo unico que sirve aqui.
   ========================================================================= */

const REASONS: Record<string, { title: string; body: string }> = {
  'sin-codigo': {
    title: 'Ese enlace llego incompleto',
    body: 'Suele pasar cuando el correo lo reescribe. Pide otro y abrelo tocandolo, sin copiarlo.',
  },
  'enlace-invalido': {
    title: 'El enlace ya se uso o caduco',
    body: 'Duran una hora y valen una sola vez. Pide otro: tarda lo mismo.',
  },
  'sin-perfil': {
    title: 'Entraste, pero falta tu perfil',
    body: 'La sesion esta bien; lo que fallo fue crear tu fila en la base de datos. Casi siempre es que el esquema todavia no se ejecuto en Supabase.',
  },
};

const FALLBACK = {
  title: 'No se pudo completar la entrada',
  body: 'Vuelve a pedir el enlace. Si sigue fallando, revisa las variables de entorno.',
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
    <main className="screen">
      <div className="gutter" style={{ maxWidth: 420, margin: '0 auto', paddingBlock: 'var(--space-16)' }}>
        <h1 className="t-section">{reason.title}</h1>
        <p className="t-body c-muted" style={{ marginTop: 'var(--space-2)' }}>
          {reason.body}
        </p>
        <a href="/entrar" className="btn btn--primary btn--full" style={{ marginTop: 'var(--space-6)', textDecoration: 'none' }}>
          Pedir otro enlace
        </a>
      </div>
    </main>
  );
}
