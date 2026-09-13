/* ============================================================================
   Organizer · Falta configurar

   Lo que se ve al correr la app antes de pegar las claves. No es una pantalla
   del producto: es la alternativa a que Next tire un "Invalid URL" que no
   orienta a nadie.

   Desaparece sola en cuanto existen las dos variables publicas.
   ========================================================================= */

export function Setup() {
  return (
    <main className="screen">
      <div
        className="gutter"
        style={{ maxWidth: 520, margin: '0 auto', paddingBlock: 'var(--space-16)' }}
      >
        <h1 className="t-title">Falta conectar Supabase</h1>
        <p className="t-body c-muted" style={{ marginTop: 'var(--space-2)' }}>
          El proyecto esta montado; lo que falta son las claves. Tres pasos, una
          sola vez.
        </p>

        <ol
          className="t-body"
          style={{ marginTop: 'var(--space-6)', paddingLeft: '1.2em', display: 'grid', gap: 'var(--space-4)' }}
        >
          <li>
            Ejecuta <code>docs/schema.sql</code> en el SQL Editor de tu proyecto
            de Supabase.
          </li>
          <li>
            Copia <code>web/.env.local.example</code> a <code>web/.env.local</code>.
          </li>
          <li>
            Pega ahi la URL y la clave <code>anon</code>, que estan en
            Project Settings → API. Reinicia <code>npm run dev</code>.
          </li>
        </ol>

        <p className="t-meta c-muted" style={{ marginTop: 'var(--space-6)' }}>
          El paso a paso completo esta en <code>docs/estado-F0.md</code>.
        </p>
      </div>
    </main>
  );
}
