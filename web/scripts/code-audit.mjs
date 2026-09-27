import fs from 'node:fs';
import path from 'node:path';

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.css']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.some((ext) => item.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles('src');
console.log('Total source files in web/src:', allSrcFiles.length);

// Normalizar rutas a estilo Unix
const allFilesMap = new Map();
for (const f of allSrcFiles) {
  const norm = f.replace(/\\/g, '/');
  allFilesMap.set(norm, f);
}

const importedFiles = new Set();
const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;

for (const [normPath, fullPath] of allFilesMap.entries()) {
  const content = fs.readFileSync(fullPath, 'utf8');
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const rawTarget = match[1];
    let resolved = null;

    if (rawTarget.startsWith('@/')) {
      resolved = path.join('src', rawTarget.slice(2)).replace(/\\/g, '/');
    } else if (rawTarget.startsWith('./') || rawTarget.startsWith('../')) {
      resolved = path.resolve(path.dirname(fullPath), rawTarget).replace(/\\/g, '/');
      const rel = path.relative(process.cwd(), resolved).replace(/\\/g, '/');
      resolved = rel;
    }

    if (resolved) {
      // Probar variaciones de extensión
      const candidates = [
        resolved,
        resolved + '.ts',
        resolved + '.tsx',
        resolved + '.js',
        resolved + '.jsx',
        resolved + '.css',
        resolved + '/index.ts',
        resolved + '/index.tsx',
      ];
      for (const c of candidates) {
        if (allFilesMap.has(c)) {
          importedFiles.add(c);
        }
      }
    }
  }
}

// Las rutas en `app/` son entrypoints de Next.js
const appRoutes = allSrcFiles
  .map((f) => f.replace(/\\/g, '/'))
  .filter((f) => f.startsWith('src/app/') && (f.endsWith('page.tsx') || f.endsWith('route.ts') || f.endsWith('layout.tsx') || f.endsWith('error.tsx') || f.endsWith('loading.tsx') || f.endsWith('manifest.ts') || f.endsWith('not-found.tsx')));

for (const route of appRoutes) {
  importedFiles.add(route);
}
// Proxy es entrypoint de Next.js
importedFiles.add('src/proxy.ts');
// CSS principal es importado en layout
importedFiles.add('src/app/globals.css');

console.log('\n=== 1. ARCHIVOS HUÉRFANOS (NUNCA IMPORTADOS EN SRC) ===');
const orphaned = [];
for (const [normPath] of allFilesMap.entries()) {
  // Ignorar globals y entrypoints
  if (!importedFiles.has(normPath)) {
    orphaned.push(normPath);
  }
}

if (orphaned.length === 0) {
  console.log('No se encontraron archivos huérfanos.');
} else {
  for (const o of orphaned) {
    console.log(' -', o);
  }
}

console.log('\n=== 2. ANÁLISIS DE COMENTARIOS Y DENSIDAD ===');
const commentStats = [];

for (const [normPath, fullPath] of allFilesMap.entries()) {
  if (normPath.endsWith('.css')) continue;
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Contar líneas de comentario
  let commentLines = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (inBlockComment) {
      commentLines++;
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
    } else if (trimmed.startsWith('/*')) {
      commentLines++;
      if (!trimmed.includes('*/')) {
        inBlockComment = true;
      }
    } else if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
      commentLines++;
    }
  }

  const commentRatio = Math.round((commentLines / (totalLines || 1)) * 100);
  if (commentLines > 30 || commentRatio > 35) {
    commentStats.push({ file: normPath, totalLines, commentLines, commentRatio });
  }
}

commentStats.sort((a, b) => b.commentLines - a.commentLines);
console.log('Archivos con mayor cantidad / porcentaje de comentarios:');
for (const s of commentStats.slice(0, 15)) {
  console.log(` - ${s.file.padEnd(45)}: ${s.commentLines} líneas de comentarios (${s.commentRatio}% de ${s.totalLines} líneas totales)`);
}
