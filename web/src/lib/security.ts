/* ============================================================================
   Organizer · Utilidades de Seguridad (Hardening & AppSec)
   ========================================================================= */

import crypto from 'node:crypto';
import dns from 'node:dns/promises';

/**
 * Comparación de tokens en tiempo constante mediante SHA-256 y timingSafeEqual.
 * Previene ataques de canal lateral / temporización (timing attacks).
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Valida si una URL utiliza exclusivamente el protocolo http: o https:.
 * Bloquea esquemas peligrosos como javascript:, data:, file:, ftp:, etc.
 */
export function isValidHttpUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detecta si una dirección IP o hostname corresponde a loopback, intranets privadas
 * o servicios de metadatos de infraestructura (ej. AWS/GCP 169.254.169.254).
 */
export function isPrivateOrLoopbackIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('fc00:') || ip.startsWith('fe80:')) return true;
  return false;
}

/**
 * Resuelve el hostname de una URL y verifica que no apunte a una IP privada (SSRF).
 */
export async function isSafePublicUrl(urlStr: string): Promise<boolean> {
  if (!isValidHttpUrl(urlStr)) return false;
  try {
    const { hostname } = new URL(urlStr);
    if (isPrivateOrLoopbackIp(hostname)) return false;

    // Resuelve la dirección IP real para evitar bypass por DNS
    const lookup = await dns.lookup(hostname);
    if (isPrivateOrLoopbackIp(lookup.address)) return false;

    return true;
  } catch {
    return false;
  }
}
