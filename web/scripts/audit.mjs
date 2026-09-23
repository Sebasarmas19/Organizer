import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const SCREENSHOT_DIR = 'C:\\Users\\sebastian\\.gemini\\antigravity-cli\\brain\\c5ce81b4-f22a-4aed-bf85-8567dc7b45fb\\scratch\\screenshots';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3111';

// Read env
const envText = fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf8');
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};

const issues = [];
const consoleErrors = [];

async function getAuthCookies() {
  console.log('Generando sesión con Supabase SSR para sebastian19armas@gmail.com...');
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'sebastian19armas@gmail.com'
  });

  if (linkErr || !linkData?.properties?.action_link) {
    throw new Error('Error generando magic link: ' + linkErr?.message);
  }

  const res = await fetch(linkData.properties.action_link, { redirect: 'manual' });
  const loc = res.headers.get('location');
  if (!loc || !loc.includes('#')) {
    throw new Error('No se recibió hash de autenticación en la redirección: ' + loc);
  }

  const hash = loc.split('#')[1];
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) {
    throw new Error('No se encontraron tokens en el hash: ' + hash);
  }

  const cookies = {};
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      setAll: (c) => c.forEach(x => { cookies[x.name] = x.value; })
    }
  });

  await ssr.auth.setSession({ access_token, refresh_token });
  console.log('Cookies generadas correctamente:', Object.keys(cookies));
  return cookies;
}

async function auditPageLayout(page, name) {
  const auditResult = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const overflowingElements = [];
    const smallTapTargets = [];

    const all = document.querySelectorAll('*');
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1 && rect.width > 0) {
        overflowingElements.push({
          tag: el.tagName,
          className: el.className,
          right: Math.round(rect.right),
          docWidth
        });
      }

      // Check interactive tap targets
      if (['BUTTON', 'A', 'INPUT'].includes(el.tagName) || el.getAttribute('role') === 'button' || el.classList.contains('btn') || el.classList.contains('tapicon')) {
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 43 || rect.height < 43) {
            smallTapTargets.push({
              tag: el.tagName,
              text: el.innerText?.slice(0, 30)?.trim() || el.getAttribute('aria-label') || el.className,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              className: el.className
            });
          }
        }
      }
    }

    return {
      title: document.title,
      heading: document.querySelector('h1')?.innerText?.trim() || 'Sin H1',
      overflowCount: overflowingElements.length,
      overflowingElements: overflowingElements.slice(0, 5),
      smallTapCount: smallTapTargets.length,
      smallTapTargets: smallTapTargets.slice(0, 10)
    };
  });

  if (auditResult.overflowCount > 0) {
    issues.push(`[${name}] ${auditResult.overflowCount} elementos desbordan horizontalmente: ` + JSON.stringify(auditResult.overflowingElements));
  }
  return auditResult;
}

async function run() {
  console.log('--- Iniciando Auditoría Visual y E2E de Organizer ---');
  
  const authCookies = await getAuthCookies();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`[Page Error] ${err.toString()}`);
  });

  try {
    // 1. Pantalla /entrar (Sin sesión)
    console.log('\n--- 1. Auditando pantalla /entrar ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-entrar-mobile.png') });
    await auditPageLayout(page, 'entrar-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-entrar-desktop.png') });
    await auditPageLayout(page, 'entrar-desktop');
    console.log('Capturas de /entrar guardadas.');

    // 2. Inyectar cookies de sesión
    console.log('\n--- 2. Inyectando cookies de sesión en el navegador ---');
    const cookieList = Object.entries(authCookies).map(([name, value]) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false
    }));
    await page.setCookie(...cookieList);

    // 3. Pantalla de Inicio (/)
    console.log('\n--- 3. Auditando pantalla de Inicio (/) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    console.log('URL de inicio móvil:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-inicio-mobile.png'), fullPage: true });
    const inicioMobAudit = await auditPageLayout(page, 'inicio-mobile');
    console.log(`Inicio móvil auditado: "${inicioMobAudit.heading}". Tap targets pequeños: ${inicioMobAudit.smallTapCount}`);

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-inicio-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'inicio-desktop');
    console.log('Capturas de Inicio guardadas.');

    // 4. Calendario - Día
    console.log('\n--- 4. Auditando Calendario (Día) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/calendario?v=dia`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-calendario-dia-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-dia-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/calendario?v=dia`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-calendario-dia-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-dia-desktop');

    // 5. Calendario - Semana
    console.log('\n--- 5. Auditando Calendario (Semana) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/calendario?v=semana`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-calendario-semana-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-semana-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/calendario?v=semana`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-calendario-semana-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-semana-desktop');

    // 6. Calendario - Mes
    console.log('\n--- 6. Auditando Calendario (Mes) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/calendario?v=mes`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-calendario-mes-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-mes-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/calendario?v=mes`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-calendario-mes-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'calendario-mes-desktop');

    // 7. Pendientes (/pendientes)
    console.log('\n--- 7. Auditando Pendientes (/pendientes) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/pendientes`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-pendientes-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'pendientes-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/pendientes`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-pendientes-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'pendientes-desktop');

    // 8. Añadir (/anadir)
    console.log('\n--- 8. Auditando Añadir (/anadir) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/anadir`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-anadir-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'anadir-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/anadir`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-anadir-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'anadir-desktop');

    // 9. Recursos (/recursos)
    console.log('\n--- 9. Auditando Recursos (/recursos) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/recursos`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-recursos-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'recursos-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/recursos`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-recursos-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'recursos-desktop');

    // 10. Horario (/horario)
    console.log('\n--- 10. Auditando Horario (/horario) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/horario`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-horario-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'horario-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/horario`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-horario-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'horario-desktop');

    // 11. Ajustes Notificaciones (/ajustes/notificaciones)
    console.log('\n--- 11. Auditando Notificaciones (/ajustes/notificaciones) ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/ajustes/notificaciones`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-notificaciones-mobile.png'), fullPage: true });
    await auditPageLayout(page, 'notificaciones-mobile');

    await page.setViewport(VIEWPORTS.desktop);
    await page.goto(`${BASE_URL}/ajustes/notificaciones`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-notificaciones-desktop.png'), fullPage: true });
    await auditPageLayout(page, 'notificaciones-desktop');

    // 12. Prueba de interacción en Pendientes: crear tarea
    console.log('\n--- 12. Probando interacción: Añadir tarea desde /anadir ---');
    await page.setViewport(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/anadir`, { waitUntil: 'networkidle2' });
    const testTitle = 'Tarea de prueba audit ' + Date.now();
    await page.type('input[name="title"]', testTitle);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
    ]);
    await new Promise(r => setTimeout(r, 1000));
    console.log('Ruta tras guardar tarea:', page.url());
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-post-crear-tarea.png'), fullPage: true });

  } finally {
    await browser.close();
  }

  console.log('\n================ RESUMEN DE AUDITORÍA ================');
  console.log(`Errores de consola: ${consoleErrors.length}`);
  consoleErrors.forEach(err => console.log('  ' + err));
  console.log(`Posibles incidencias de diseño detectadas: ${issues.length}`);
  issues.forEach(iss => console.log('  ' + iss));
  console.log('Capturas generadas con éxito en: ' + SCREENSHOT_DIR);
}

run().catch(err => {
  console.error('Error fatal durante la auditoría:', err);
  process.exit(1);
});
