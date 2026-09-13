/* ============================================================================
   Organizer · Entrar

   La unica pantalla publica de la app. Un solo usuario, un solo campo, ningun
   registro: se escribe el correo y llega un enlace.

   Va en espanol porque el usuario la lee, incluida la ruta (`/entrar`): esta
   app vive en su pantalla de inicio y el es quien ve la URL.
   ========================================================================= */

import { SignInForm } from './SignInForm';

export const metadata = {
  title: 'Entrar · Organizer',
};

export default function SignInPage() {
  return (
    <main className="screen">
      <div className="gutter" style={{ maxWidth: 420, margin: '0 auto', paddingBlock: 'var(--space-16)' }}>
        <h1 className="t-title">Organizer</h1>
        <p className="t-body c-muted" style={{ marginTop: 'var(--space-2)' }}>
          Un toque y estas dentro. No hay contrasena que recordar.
        </p>

        <SignInForm />
      </div>
    </main>
  );
}
