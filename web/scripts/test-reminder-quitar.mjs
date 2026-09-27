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

  // 1. Crear un reminder específico
  const uniqueId = Date.now().toString().slice(-4);
  const remTitle = `[QA-VERIFY] Recordatorio de Prueba ${uniqueId}`;
  const prepTitle1 = `[QA-VERIFY] Tarea Prep 1 ${uniqueId}`;
  const prepTitle2 = `[QA-VERIFY] Tarea Prep 2 ${uniqueId}`;

  const { data: rem, error: remErr } = await supabaseAdmin.from('reminders').insert({
    user_id: mainUser.id,
    title: remTitle,
    occurs_on: '2026-10-02',
    notice_days: 1
  }).select().single();

  console.log('Created test reminder:', rem.id, rem.title);

  const { data: tasks } = await supabaseAdmin.from('items').insert([
    { user_id: mainUser.id, title: prepTitle1, reminder_id: rem.id, status: 'inbox' },
    { user_id: mainUser.id, title: prepTitle2, reminder_id: rem.id, status: 'inbox' }
  ]).select();

  console.log('Created preparatory tasks count:', tasks.length);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.setCookie(...Object.entries(cookies).map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' })));

  await page.goto(`${BASE_URL}/pendientes?v=recordatorios`, { waitUntil: 'networkidle0' });

  // Buscar la tarjeta exacta por título
  const targetCard = await page.evaluateHandle((expectedTitle) => {
    const cards = Array.from(document.querySelectorAll('.fd-remcard-wrap'));
    return cards.find(c => c.textContent.includes(expectedTitle)) || null;
  }, remTitle);

  if (!targetCard.asElement()) {
    console.error('Target card not found on page!');
  } else {
    console.log('Target card found on page.');
    // Clic en el botón eliminar (.fd-remcard__del)
    const delBtn = await targetCard.$('.fd-remcard__del');
    console.log('delBtn found:', Boolean(delBtn));
    await delBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // Clic en "Quitar"
    const confirmBtn = await targetCard.$('.fd-remcard__confirm button:first-child');
    console.log('confirmBtn found:', Boolean(confirmBtn), 'Text:', await confirmBtn.evaluate(b => b.textContent));
    await confirmBtn.click();
    await new Promise(r => setTimeout(r, 1200));

    // Verificar en BD
    const { data: remInDb } = await supabaseAdmin.from('reminders').select('*').eq('id', rem.id).maybeSingle();
    console.log('Reminder in DB after Quitar:', remInDb ? 'STILL EXISTS (ERROR)' : 'DELETED (SUCCESS)');

    const { data: tasksInDb } = await supabaseAdmin.from('items').select('id, title, reminder_id').in('id', tasks.map(t => t.id));
    console.log('Tasks in DB after reminder Quitar:', tasksInDb);
    const tasksAliveAndUnlinked = tasksInDb.length === 2 && tasksInDb.every(t => t.reminder_id === null);
    console.log('Tasks alive and unlinked:', tasksAliveAndUnlinked ? 'SUCCESS' : 'FAILED');
  }

  // Limpiar
  await supabaseAdmin.from('items').delete().in('id', tasks.map(t => t.id));
  if (rem) await supabaseAdmin.from('reminders').delete().eq('id', rem.id);

  await browser.close();
}

run().catch(console.error);
