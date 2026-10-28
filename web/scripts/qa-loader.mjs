import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const webSrc = path.join(webDir, 'src');

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // 1. Alias @/...
    if (specifier.startsWith('@/')) {
      const rel = path.join(webSrc, specifier.slice(2));
      for (const ext of ['', '.ts', '.tsx', '.js', '/index.ts']) {
        try {
          const url = pathToFileURL(rel + ext).href;
          return await nextResolve(url, context);
        } catch {}
      }
    }

    // 2. Relative paths without extension (e.g. ./date-utils or ./home)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : webSrc;
      const resolvedPath = path.resolve(parentDir, specifier);
      for (const ext of ['.ts', '.tsx', '.js', '/index.ts']) {
        try {
          const url = pathToFileURL(resolvedPath + ext).href;
          return await nextResolve(url, context);
        } catch {}
      }
    }

    throw err;
  }
}
