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
const SCREENSHOT_DIR = 'C:/Users/sebastian/.gemini/antigravity-cli/brain/77da470c-338a-45d5-97a8-abe94f9ef79d/scratch/screenshots';

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

async function run() {
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const mainUser = usersData?.users?.find(u => u.email === 'sebastian19armas@gmail.com');

  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'sebastian19armas@gmail.com'
  });
  const res = await fetch(linkData.properties.action_link, { redirect: 'manual' });
  const hash = res.headers.get('location').split('#')[1];
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

  const todayCaracas = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());

  // Crear tarea y reminder con texto larguísimo y continuo
  const unbrokenWord = 'SupercalifragilisticoespialidosoSinEspaciosParaProbarDesbordamientoHorizontalDeTextoEnContenedoresEstrechosDeIphone1234567890';
  const longTaskTitle = `[QA-LONG] Tarea con palabra continua: ${unbrokenWord}`;
  const longReminderTitle = `[QA-LONG] Reminder continuo: ${unbrokenWord.slice(0, 100)}`;

  const { data: testTask } = await supabaseAdmin.from('items').insert({
    user_id: mainUser.id,
    title: longTaskTitle,
    due_on: todayCaracas,
    status: 'inbox'
  }).select().single();

  const { data: testRem } = await supabaseAdmin.from('reminders').insert({
    user_id: mainUser.id,
    title: longReminderTitle,
    occurs_on: todayCaracas,
    notice_days: 1
  }).select().single();

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  const page = await browser.newPage();
  // Viewport iPhone 14 (390px)
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.setCookie(...Object.entries(cookies).map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' })));

  console.log('=== PRUEBA DE TÍTULOS LARGOS Y OVERFLOW EN MÓVIL (390px) ===');

  // 1. Probar Inicio
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_long_inicio_mobile.png') });
  const homeCheck = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth
    };
  });
  console.log('Inicio (/) móvil overflow:', homeCheck);

  // 2. Probar Pendientes
  await page.goto(`${BASE_URL}/pendientes`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_long_pendientes_mobile.png') });
  const pendCheck = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth
    };
  });
  console.log('Pendientes (/pendientes) móvil overflow:', pendCheck);

  // 3. Probar Pendientes Recordatorios
  await page.goto(`${BASE_URL}/pendientes?v=recordatorios`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_long_rems_mobile.png') });
  const remCheck = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth
    };
  });
  console.log('Pendientes Recordatorios móvil overflow:', remCheck);

  // 4. Probar Calendario Día
  await page.goto(`${BASE_URL}/calendario?v=dia&d=${todayCaracas}`, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'test_long_cal_dia_mobile.png') });
  const calCheck = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth
    };
  });
  console.log('Calendario Día móvil overflow:', calCheck);

  // Limpiar
  if (testTask) await supabaseAdmin.from('items').delete().eq('id', testTask.id);
  if (testRem) await supabaseAdmin.from('reminders').delete().eq('id', testRem.id);

  await browser.close();
}

run().catch(console.error);
