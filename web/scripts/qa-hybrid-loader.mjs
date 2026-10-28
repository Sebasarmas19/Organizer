/* ============================================================================
   Organizer · Loader ESM para pruebas de QA automatizadas
   Permite importar componentes de servidor Next.js, Server Actions y rutas API
   directamente en Node.js sin empaquetador externo.
   ========================================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptsDir, '..');

export async function resolve(specifier, context, nextResolve) {
  // 1. Mock de next/cache
  if (specifier === 'next/cache') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(`
        export function revalidatePath() {}
        export function revalidateTag() {}
      `),
      shortCircuit: true,
    };
  }

  // 2. Mock de server-only
  if (specifier === 'server-only') {
    return {
      url: 'data:text/javascript,export default {}',
      shortCircuit: true,
    };
  }

  // 3. Mock de next/headers con almacén de cookies para pruebas
  if (specifier === 'next/headers') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(`
        const cookieStore = new Map();
        export function setTestCookie(name, value) {
          cookieStore.set(name, value);
        }
        export function clearTestCookies() {
          cookieStore.clear();
        }
        export async function cookies() {
          return {
            getAll() {
              return Array.from(cookieStore.entries()).map(([name, value]) => ({ name, value }));
            },
            set(name, value) {
              cookieStore.set(name, value);
            },
            get(name) {
              const val = cookieStore.get(name);
              return val ? { name, value: val } : undefined;
            }
          };
        }
      `),
      shortCircuit: true,
    };
  }

  // 4. Mock de next/server (NextResponse y NextRequest)
  if (specifier === 'next/server') {
    return {
      url: 'data:text/javascript,' + encodeURIComponent(`
        export class NextResponse extends Response {
          static json(data, init = {}) {
            const body = JSON.stringify(data);
            const headers = new Headers(init.headers);
            headers.set('content-type', 'application/json');
            return new NextResponse(body, { ...init, headers });
          }
        }
        export class NextRequest extends Request {}
      `),
      shortCircuit: true,
    };
  }

  // 5. Resolución de paquetes de node_modules ubicados en web/node_modules
  if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('file:') && !specifier.startsWith('@/')) {
    try {
      return await nextResolve(specifier, context);
    } catch {
      const candidatePkg = path.join(webDir, 'node_modules', specifier);
      if (fs.existsSync(candidatePkg)) {
        const pkgJsonPath = path.join(candidatePkg, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
          const entry = pkg.module || pkg.main || 'index.js';
          const target = path.join(candidatePkg, entry);
          return {
            url: pathToFileURL(target).href,
            shortCircuit: true,
          };
        }
      }
    }
  }

  // 6. Resolución de alias '@/...' hacia 'web/src/...'
  if (specifier.startsWith('@/')) {
    const subpath = specifier.slice(2);
    const candidateBase = path.join(webDir, 'src', subpath);
    const extensions = ['.ts', '.tsx', '.js', '/index.ts', '/index.js', ''];
    for (const ext of extensions) {
      const full = candidateBase + ext;
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return {
          url: pathToFileURL(full).href,
          shortCircuit: true,
        };
      }
    }
  }

  // 6. Resolución de importaciones relativas con extensiones .ts opcionales
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    try {
      return await nextResolve(specifier, context);
    } catch (err) {
      if (context.parentURL && context.parentURL.startsWith('file:')) {
        const parentPath = fileURLToPath(context.parentURL);
        const resolved = path.resolve(path.dirname(parentPath), specifier);
        for (const ext of ['.ts', '.tsx', '.js', '/index.ts', '/index.js']) {
          const full = resolved + ext;
          if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            return {
              url: pathToFileURL(full).href,
              shortCircuit: true,
            };
          }
        }
      }
      throw err;
    }
  }

  return nextResolve(specifier, context);
}
