import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3111';
const SCREENSHOT_DIR = 'C:\\Users\\sebastian\\.gemini\\antigravity-cli\\brain\\c5ce81b4-f22a-4aed-bf85-8567dc7b45fb\\scratch\\screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Read env from .env.local
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

async function getAuthCookies() {
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

  const cookies = {};
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      setAll: (c) => c.forEach(x => { cookies[x.name] = x.value; })
    }
  });

  await ssr.auth.setSession({ access_token, refresh_token });
  return cookies;
}

async function inspect() {
  const cookiesObj = await getAuthCookies();
  const puppeteerCookies = Object.entries(cookiesObj).map(([name, value]) => ({
    name,
    value,
    domain: 'localhost',
    path: '/'
  }));

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setCookie(...puppeteerCookies);

    const routes = [
      { name: 'inicio', path: '/' },
      { name: 'pendientes', path: '/pendientes' },
      { name: 'recursos', path: '/recursos' }
    ];

    for (const route of routes) {
      // 1. Mobile (iPhone 14)
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0' });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name}_mobile.png`) });

      // 2. Desktop (1280x800)
      await page.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0' });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name}_desktop.png`) });
    }

    console.log('Screenshots saved to:', SCREENSHOT_DIR);
  } finally {
    await browser.close();
  }
}

inspect().catch(console.error);
