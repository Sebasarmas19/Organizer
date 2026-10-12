/* ============================================================================
   Organizer · Control de acceso por correo (Multiusuario / SaaS)

   En modo SaaS / multiusuario (por omisión, sin ALLOWED_EMAILS o con '*'),
   cualquier usuario registrado tiene acceso a su propio espacio privado.

   Si se define ALLOWED_EMAILS en el entorno (lista de correos separados por
   comas), actúa como lista restrictiva permitiendo el acceso solo a los
   correos autorizados.
   ========================================================================= */

export function isAllowedEmail(email: string | null | undefined): boolean {
  const raw = process.env.ALLOWED_EMAILS;
  // Sin variable configurada, vacía o con comodín '*', se permite cualquier usuario (SaaS multiusuario)
  if (!raw || raw.trim() === '' || raw.trim() === '*') {
    return true;
  }
  if (!email) return false;

  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(email.trim().toLowerCase());
}
