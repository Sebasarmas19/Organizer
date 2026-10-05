/* ============================================================================
   Organizer · Quién puede entrar

   La app es de una sola persona. La barrera de verdad está en la base de
   datos: el trigger `enforce_allowed_signup` sobre `auth.users` rechaza crear
   cualquier cuenta cuyo correo no esté en `public.allowed_emails`.

   Esto es la segunda capa, por si algún día existiera una sesión con otro
   correo: el proxy la cierra. `ALLOWED_EMAILS` va separado por comas; sin la
   variable no se comprueba aquí (la base de datos sigue bloqueando).
   ========================================================================= */

export function isAllowedEmail(email: string | null | undefined): boolean {
  const raw = process.env.ALLOWED_EMAILS;
  if (!raw) return true;
  if (!email) return false;
  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
