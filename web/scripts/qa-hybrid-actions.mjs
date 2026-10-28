/**
 * ============================================================================
 * Organizer · QA Automation Suite: Hybrid Planning & Interactive Push Actions
 * 
 * Verifies 4 core subsystems:
 * 1. Hybrid 0ms Planning (computeFreeSlots in slots.ts -> acceptPlan in actions.ts without LLM).
 * 2. POST /api/push/action endpoint (actions 'done' and 'tomorrow' with HMAC pushActionToken).
 * 3. markReminderCompletedAction in planner-actions.ts (child task completion vs fallback item,
 *    alert silencing, and delivery history preservation per Decision #61).
 * 4. moveTaskToDate in fd4-actions.ts (preservation of estimate_min duration from previous manual blocks).
 * ============================================================================
 */

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

// -----------------------------------------------------------------------------
// 1. Environment & ESM Loader Registration
// -----------------------------------------------------------------------------
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptsDir, '..');
const rootDir = path.resolve(webDir, '..');

// Load environment variables from .env.local
const envPath = fs.existsSync(path.join(rootDir, '.env.local'))
  ? path.join(rootDir, '.env.local')
  : path.join(webDir, '.env.local');

if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

// Register custom ESM loader for Next.js server actions, path aliases and modules
const loaderPath = path.join(scriptsDir, 'qa-hybrid-loader.mjs');
register(pathToFileURL(loaderPath).href);

// -----------------------------------------------------------------------------
// 2. Module Imports (Dynamic post-loader registration)
// -----------------------------------------------------------------------------
const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
const { createServerClient } = await import('@supabase/ssr');
const { setTestCookie, clearTestCookies } = await import('next/headers');
const { NextRequest } = await import('next/server');

// Target business logic modules
const slotsModule = await import('@/lib/plan/slots');
const { computeFreeSlots, fitsInSlots, toClock, fromClock, canBookBoth } = slotsModule;

const planActions = await import('@/lib/plan/actions');
const { acceptPlan } = planActions;

const planContextModule = await import('@/lib/plan/context');
const { loadPlanContext } = planContextModule;

const pushActionRoute = await import('@/app/api/push/action/route');
const { POST: pushActionPost } = pushActionRoute;

const securityModule = await import('@/lib/security');
const { signPushActionToken, verifyPushActionToken } = securityModule;

const plannerActions = await import('@/lib/planner-actions');
const { markReminderCompletedAction } = plannerActions;

const fd4Actions = await import('@/lib/fd4-actions');
const { moveTaskToDate } = fd4Actions;

const dateUtils = await import('@/lib/date-utils');
const { getTodayString, addDays } = dateUtils;

const profileModule = await import('@/lib/profile');
const { getProfileTimezone } = profileModule;

const { createClient: createUserClient } = await import('@/lib/supabase/server');

// -----------------------------------------------------------------------------
// 3. Test Harness & Reporting Setup
// -----------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const logPass = (msg) => {
  totalTests++;
  passedTests++;
  console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
};

const logFail = (msg, err) => {
  totalTests++;
  failedTests++;
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  if (err) console.error('   ', err);
};

const logSection = (title) => {
  console.log(`\n\x1b[1m\x1b[36m▶ [SUITE] ${title}\x1b[0m`);
};

// Admin database client for setup & verification
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Resolve test user & authenticated session
const TEST_EMAIL = 'sebastian19armas@gmail.com';
const { data: usersData, error: userListErr } = await supabaseAdmin.auth.admin.listUsers();
if (userListErr) throw new Error('Error listing users: ' + userListErr.message);

const testUser = usersData.users.find((u) => u.email === TEST_EMAIL) || usersData.users[0];
if (!testUser) throw new Error(`No user found for email ${TEST_EMAIL}`);
const TEST_USER_ID = testUser.id;

// Setup server session cookies for createUserClient()
const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: testUser.email,
});
if (linkErr) throw new Error('Magic link generation error: ' + linkErr.message);

const magicLinkRes = await fetch(linkData.properties.action_link, { redirect: 'manual' });
const redirectLoc = magicLinkRes.headers.get('location') || '';
const hashParams = new URLSearchParams(redirectLoc.split('#')[1] || '');
const accessToken = hashParams.get('access_token');
const refreshToken = hashParams.get('refresh_token');

clearTestCookies();
const dummySsr = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [],
    setAll: (cookies) => {
      for (const c of cookies) setTestCookie(c.name, c.value);
    },
  },
});
await dummySsr.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

const userSupabase = await createUserClient();
const userTimezone = await getProfileTimezone(userSupabase, TEST_USER_ID);

console.log('\x1b[1m====================================================================\x1b[0m');
console.log('\x1b[1m  ORGANIZER · QA TEST SUITE: HYBRID PLANNING & INTERACTIVE ACTIONS  \x1b[0m');
console.log(`  User: ${testUser.email} (${TEST_USER_ID}) | TZ: ${userTimezone}`);
console.log('\x1b[1m====================================================================\x1b[0m');

// -----------------------------------------------------------------------------
// SUITE 1: Planificación Híbrida en 0ms (computeFreeSlots + acceptPlan sin LLM)
// -----------------------------------------------------------------------------
logSection('1. Planificación Híbrida en 0ms (computeFreeSlots + acceptPlan sin LLM)');
try {
  const H = (h, m = 0) => h * 60 + m;
  const today = getTodayString(userTimezone);

  // 1.1 Benchmark de velocidad: 1,000 ejecuciones deben correr en < 1ms por cálculo
  const busySchedule = [
    { date: today, from: H(8), to: H(9, 30) },      // Clase Química
    { date: today, from: H(11), to: H(13) },        // Clase Cálculo
    { date: today, from: H(15), to: H(16, 45) },    // Lab Física
    { date: addDays(today, 1), from: H(9), to: H(12) },
    { date: addDays(today, 2), from: H(14), to: H(17) },
  ];

  const benchStart = performance.now();
  const iterations = 1000;
  for (let i = 0; i < iterations; i++) {
    computeFreeSlots({
      today,
      nowMinutes: H(7),
      days: 3,
      busy: busySchedule,
      dayStart: H(7),
      dayEnd: H(22, 30),
      buffer: 10,
      minMinutes: 30,
    });
  }
  const benchElapsedMs = performance.now() - benchStart;
  const avgPerRun = benchElapsedMs / iterations;

  assert.ok(avgPerRun < 1.0, `computeFreeSlots promedio (${avgPerRun.toFixed(3)}ms) debe ser < 1ms (0ms nominal)`);
  logPass(`Benchmark 0ms verificado: 1000 iteraciones calculadas en ${benchElapsedMs.toFixed(1)}ms (${avgPerRun.toFixed(3)}ms/run)`);

  // 1.2 Invariantes de negocio y límites de los huecos libres
  const freeSlots = computeFreeSlots({
    today,
    nowMinutes: H(7),
    days: 3,
    busy: busySchedule,
    dayStart: H(7),
    dayEnd: H(22, 30),
    buffer: 10,
    minMinutes: 30,
  });

  assert.ok(freeSlots.length > 0, 'Debe encontrar huecos libres');
  for (const slot of freeSlots) {
    // Límites de día
    assert.ok(slot.from >= H(7), `Slot ${slot.id} no puede iniciar antes de las 07:00 (from=${slot.from})`);
    assert.ok(slot.to <= H(22, 30), `Slot ${slot.id} no puede exceder las 22:30 (to=${slot.to})`);
    // Duración mínima
    assert.ok(slot.to - slot.from >= 30, `Slot ${slot.id} debe ser de al menos 30 min (dur=${slot.to - slot.from})`);
    // Múltiplo exacto de 15 minutos (step)
    assert.equal(slot.from % 15, 0, `Slot ${slot.id} from debe ser múltiplo de 15 min`);
    assert.equal(slot.to % 15, 0, `Slot ${slot.id} to debe ser múltiplo de 15 min`);
  }
  logPass('Invariantes de slots verificadas: límites 07:00-22:30, múltiplo de 15m y mínimo 30m');

  // 1.3 Buffer de 10 min y redondeo: clase termina 09:30 -> buffer hasta 09:40 -> ceilTo a 09:45
  const todaySlots = freeSlots.filter((s) => s.date === today);
  const slotAfterChem = todaySlots.find((s) => s.from >= H(9, 30));
  assert.ok(slotAfterChem, 'Debe existir un slot posterior a la clase de Química');
  assert.equal(slotAfterChem.from, H(9, 45), 'El slot posterior debe comenzar exactamente a las 09:45 (09:30 + 10m buffer = 09:40 -> 09:45)');
  logPass('Buffer de 10m verificado: clase a las 09:30 produce inicio de slot a las 09:45');

  // Invariante canBookBoth: dos sesiones deben tener al menos 10m buffer + redondeo a 15 min
  assert.equal(canBookBoth({ date: today, from: H(10), to: H(11) }, { date: today, from: H(11, 15), to: H(12) }), true);
  assert.equal(canBookBoth({ date: today, from: H(10), to: H(11) }, { date: today, from: H(11, 5), to: H(12) }), false);
  logPass('canBookBoth validado: 15 min de separación permitidos, 5 min colisionan');

  // 1.4 Conversión instantánea de FreeSlot a PlanSession (UI 1-tap booking de PlanClient)
  const chosenSlot = freeSlots[0];
  const startClock = toClock(chosenSlot.from);
  const sessionMinutes = Math.min(chosenSlot.to - chosenSlot.from, 60);
  const candidateSession = {
    date: chosenSlot.date,
    start: startClock,
    minutes: sessionMinutes,
    title: '[QA-HYBRID-TEST] Sesión 0ms sin LLM',
  };

  assert.ok(
    fitsInSlots(freeSlots, candidateSession.date, fromClock(candidateSession.start), candidateSession.minutes),
    'La sesión derivada del slot debe validar fitsInSlots == true'
  );
  logPass('Conversión de FreeSlot a PlanSession validada exitosamente con fitsInSlots()');

  // 1.5 Ejecución de acceptPlan sin llamar al LLM
  // Cargar contexto real de la agenda para obtener un slot genuino de la DB
  const planCtx = await loadPlanContext(userSupabase, TEST_USER_ID, userTimezone);
  assert.ok(planCtx.slots.length > 0, 'El contexto del usuario debe tener slots libres');

  const realSlot = planCtx.slots[0];
  const realDuration = Math.min(realSlot.to - realSlot.from, 45);
  const hybridSession = {
    date: realSlot.date,
    start: toClock(realSlot.from),
    minutes: realDuration,
    title: `[QA-HYBRID-VERIFY] 0ms Enfoque ${Date.now().toString().slice(-4)}`,
  };

  const acceptResult = await acceptPlan([hybridSession]);
  assert.equal(acceptResult.ok, true, `acceptPlan debe retornar ok: true (error=${acceptResult.error})`);
  assert.equal(acceptResult.count, 1, 'acceptPlan debe guardar exactamente 1 sesión');

  // Verificar en base de datos: se creó el item y el bloque con aviso de 15 min
  const { data: createdItems } = await supabaseAdmin
    .from('items')
    .select('id, title, status, due_on, estimate_min')
    .eq('user_id', TEST_USER_ID)
    .eq('title', hybridSession.title);

  assert.ok(createdItems && createdItems.length === 1, 'Item debe existir en base de datos');
  const createdItem = createdItems[0];
  assert.equal(createdItem.status, 'planned', 'El item debe estar en status "planned"');
  assert.equal(createdItem.due_on, hybridSession.date, 'El due_on debe coincidir con la fecha del slot');
  assert.equal(createdItem.estimate_min, hybridSession.minutes, 'El estimate_min debe coincidir con la duración');

  const { data: createdBlocks } = await supabaseAdmin
    .from('blocks')
    .select('id, item_id, title, status, source, reminder_min, starts_at, ends_at')
    .eq('user_id', TEST_USER_ID)
    .eq('item_id', createdItem.id);

  assert.ok(createdBlocks && createdBlocks.length === 1, 'Bloque manual debe existir en base de datos');
  const createdBlock = createdBlocks[0];
  assert.equal(createdBlock.status, 'pending', 'El bloque debe estar en status "pending"');
  assert.equal(createdBlock.source, 'manual', 'El bloque debe ser de origen "manual"');
  assert.equal(createdBlock.reminder_min, 15, 'El bloque debe tener aviso 15 min antes');

  // Limpieza
  await supabaseAdmin.from('blocks').delete().eq('id', createdBlock.id);
  await supabaseAdmin.from('items').delete().eq('id', createdItem.id);
  logPass('acceptPlan guardó la sesión 0ms sin LLM: item "planned", bloque "manual" con reminder_min: 15');

  // 1.6 Validación negativa: sesión que choca con horario ocupado debe ser rechazada
  const clashingSession = {
    date: today,
    start: '03:00', // Fuera de horario (antes de 07:00)
    minutes: 60,
    title: '[QA] Sesión Invalida',
  };
  const rejectResult = await acceptPlan([clashingSession]);
  assert.equal(rejectResult.ok, false, 'acceptPlan debe rechazar sesiones fuera de huecos libres');
  assert.ok(
    rejectResult.error?.includes('ya no está libre'),
    `Mensaje de error debe avisar que la hora no está libre: "${rejectResult.error}"`
  );
  logPass('acceptPlan rechazó correctamente sesión no coincidente con slots libres');

  // 1.7 Validaciones de payload en acceptPlan
  const emptyRes = await acceptPlan([]);
  assert.equal(emptyRes.ok, false, 'acceptPlan([]) debe fallar');
  assert.equal(emptyRes.error, 'No hay sesiones que guardar.');

  const oversizedRes = await acceptPlan(Array(15).fill(hybridSession));
  assert.equal(oversizedRes.ok, false, 'acceptPlan con >14 sesiones debe fallar');
  logPass('Validaciones de límite de sesiones (0 y >14) verificadas');
} catch (err) {
  logFail('Error en Suite 1 (Planificación híbrida 0ms)', err);
}

// -----------------------------------------------------------------------------
// SUITE 2: Endpoint POST /api/push/action (C3: 'done' y 'tomorrow')
// -----------------------------------------------------------------------------
logSection('2. Endpoint POST /api/push/action (C3: "done" y "tomorrow")');
try {
  const secretKey = process.env.VAPID_PRIVATE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.ok(secretKey, 'Secreto de firma debe estar configurado');

  // 2.1 Validación de peticiones y status codes (400 Bad Request)
  const reqInvalidJson = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    body: 'invalid-json{',
  });
  const resInvalidJson = await pushActionPost(reqInvalidJson);
  assert.equal(resInvalidJson.status, 400, 'JSON inválido debe retornar HTTP 400');

  const reqMissingParams = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done' }), // falta itemId
  });
  const resMissingParams = await pushActionPost(reqMissingParams);
  assert.equal(resMissingParams.status, 400, 'Falta de itemId debe retornar HTTP 400');

  const reqUnsupportedAction = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'archive', itemId: 'a0000000-0000-4000-8000-000000000001' }),
  });
  const resUnsupportedAction = await pushActionPost(reqUnsupportedAction);
  assert.equal(resUnsupportedAction.status, 400, 'Acción no soportada debe retornar HTTP 400');

  // Validación de formato UUID
  const reqInvalidUuid = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done', itemId: 'invalid-non-uuid' }),
  });
  const resInvalidUuid = await pushActionPost(reqInvalidUuid);
  assert.equal(resInvalidUuid.status, 400, 'itemId no UUID debe retornar HTTP 400');
  const bodyInvalidUuid = await resInvalidUuid.json();
  assert.equal(bodyInvalidUuid.error, 'Identificador con formato inválido');
  logPass('Validaciones de cuerpo de petición y formato UUID (400 Bad Request) verificadas');

  // 2.2 Seguridad criptográfica HMAC & Anti-IDOR (401 Unauthorized)
  const validUuidTest = 'a0000000-0000-4000-8000-000000000001';
  const reqNoAuth = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done', itemId: validUuidTest }),
  });
  // Limpiar cookies de sesión para simular push service worker sin cookies
  clearTestCookies();
  const resNoAuth = await pushActionPost(reqNoAuth);
  assert.equal(resNoAuth.status, 401, 'Petición sin sesión ni actionToken debe retornar HTTP 401');

  // Token alterado / corrupto
  const fakeToken = signPushActionToken(TEST_USER_ID, validUuidTest, secretKey) + 'tampered';
  const reqTampered = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done', itemId: validUuidTest, actionToken: fakeToken }),
  });
  const resTampered = await pushActionPost(reqTampered);
  assert.equal(resTampered.status, 401, 'Token con firma alterada debe retornar HTTP 401');

  // Token para otro itemId (Anti-IDOR)
  const validUuidOther = 'b0000000-0000-4000-8000-000000000002';
  const tokenItemA = signPushActionToken(TEST_USER_ID, validUuidTest, secretKey);
  const reqIdor = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done', itemId: validUuidOther, actionToken: tokenItemA }),
  });
  const resIdor = await pushActionPost(reqIdor);
  assert.equal(resIdor.status, 401, 'Token generado para otro itemId debe retornar HTTP 401');

  // Token expirado
  const expiredToken = signPushActionToken(TEST_USER_ID, validUuidTest, secretKey, -3600); // 1h atrás
  const reqExpired = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'done', itemId: validUuidTest, actionToken: expiredToken }),
  });
  const resExpired = await pushActionPost(reqExpired);
  assert.equal(resExpired.status, 401, 'Token expirado debe retornar HTTP 401');
  logPass('Seguridad HMAC y prevención Anti-IDOR (401 Unauthorized) verificadas');

  // 2.3 Acción 'done' interactiva desde Push
  // Crear tarea y bloque de prueba
  const { data: testTaskDone } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-PUSH-DONE] Tarea Push ${Date.now()}`,
      status: 'planned',
      due_on: getTodayString(userTimezone),
    })
    .select()
    .single();

  const { data: testBlockDone } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      item_id: testTaskDone.id,
      title: testTaskDone.title,
      status: 'pending',
      source: 'manual',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select()
    .single();

  const validTokenDone = signPushActionToken(TEST_USER_ID, testTaskDone.id, secretKey);
  const verifiedCheck = verifyPushActionToken(validTokenDone, testTaskDone.id, secretKey);
  assert.equal(verifiedCheck.valid, true, 'verifyPushActionToken debe ser válido');
  assert.equal(verifiedCheck.userId, TEST_USER_ID, 'verifyPushActionToken debe resolver al usuario');
  logPass('verifyPushActionToken validó exitosamente la firma criptográfica HMAC y userId');

  const reqDone = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'done',
      itemId: testTaskDone.id,
      blockId: testBlockDone.id,
      actionToken: validTokenDone,
    }),
  });

  const resDone = await pushActionPost(reqDone);
  assert.equal(resDone.status, 200, 'Acción "done" debe responder HTTP 200');
  const bodyDone = await resDone.json();
  assert.equal(bodyDone.ok, true);
  assert.equal(bodyDone.message, 'Tarea completada');

  // Verificar en base de datos
  const { data: updatedTaskDone } = await supabaseAdmin
    .from('items')
    .select('status, completed_at')
    .eq('id', testTaskDone.id)
    .single();
  assert.equal(updatedTaskDone.status, 'done', 'Item debe marcarse como "done"');
  assert.ok(updatedTaskDone.completed_at, 'completed_at debe tener fecha ISO');

  const { data: updatedBlockDone } = await supabaseAdmin
    .from('blocks')
    .select('status')
    .eq('id', testBlockDone.id)
    .single();
  assert.equal(updatedBlockDone.status, 'done', 'Bloque debe marcarse como "done"');

  // Limpieza
  await supabaseAdmin.from('blocks').delete().eq('id', testBlockDone.id);
  await supabaseAdmin.from('items').delete().eq('id', testTaskDone.id);
  logPass('Acción "done" verificada: item y bloque marcados "done" con timestamp');

  // 2.4 Acción 'tomorrow' interactiva desde Push
  const todayStr = getTodayString(userTimezone);
  const expectedTomorrowStr = addDays(todayStr, 1);

  const { data: testTaskTomorrow } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-PUSH-TOMORROW] Tarea Mañana ${Date.now()}`,
      status: 'planned',
      due_on: todayStr,
    })
    .select()
    .single();

  const { data: testBlockTomorrow } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      item_id: testTaskTomorrow.id,
      title: testTaskTomorrow.title,
      status: 'pending',
      source: 'manual',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select()
    .single();

  const validTokenTomorrow = signPushActionToken(TEST_USER_ID, testTaskTomorrow.id, secretKey);

  const reqTomorrow = new NextRequest('http://localhost:3000/api/push/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'tomorrow',
      itemId: testTaskTomorrow.id,
      actionToken: validTokenTomorrow,
    }),
  });

  const resTomorrow = await pushActionPost(reqTomorrow);
  assert.equal(resTomorrow.status, 200, 'Acción "tomorrow" debe responder HTTP 200');
  const bodyTomorrow = await resTomorrow.json();
  assert.equal(bodyTomorrow.ok, true);
  assert.equal(bodyTomorrow.message, 'Tarea postergada para mañana');

  // Verificar en base de datos: due_on se movió a mañana
  const { data: updatedTaskTomorrow } = await supabaseAdmin
    .from('items')
    .select('due_on, status')
    .eq('id', testTaskTomorrow.id)
    .single();
  assert.equal(updatedTaskTomorrow.due_on, expectedTomorrowStr, 'due_on debe ser la fecha de mañana');
  assert.equal(updatedTaskTomorrow.status, 'planned', 'status debe mantenerse "planned"');

  // Verificar en base de datos: el bloque manual pendiente de hoy fue soltado (eliminado)
  const { data: deletedBlockCheck } = await supabaseAdmin
    .from('blocks')
    .select('id')
    .eq('id', testBlockTomorrow.id)
    .maybeSingle();
  assert.equal(deletedBlockCheck, null, 'El bloque manual de hoy debe haber sido eliminado');

  // Limpieza
  await supabaseAdmin.from('items').delete().eq('id', testTaskTomorrow.id);
  logPass('Acción "tomorrow" verificada: due_on movido a mañana y bloque previo soltado');
} catch (err) {
  logFail('Error en Suite 2 (POST /api/push/action)', err);
}

// -----------------------------------------------------------------------------
// SUITE 3: Acción markReminderCompletedAction (B10 & Decisión #61)
// -----------------------------------------------------------------------------
logSection('3. markReminderCompletedAction (B10 & Decisión #61: silencio sin borrar historial)');
try {
  // Re-establecer cookies de sesión para que requireUser() funcione en Server Actions
  clearTestCookies();
  await dummySsr.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  // 3.1 Control de acceso y Anti-IDOR
  try {
    await markReminderCompletedAction('00000000-0000-0000-0000-000000000000');
    assert.fail('Debe arrojar error para un recordatorio no existente');
  } catch (err) {
    assert.equal(err.message, 'Recordatorio no encontrado');
    logPass('Anti-IDOR verificado: rechaza recordatorios inexistentes o ajenos');
  }

  // 3.2 Caso A: Recordatorio CON tareas hijas existentes
  const { data: remWithChildren } = await supabaseAdmin
    .from('reminders')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-REMINDER-A] Proyecto Final ${Date.now()}`,
      occurs_on: addDays(getTodayString(userTimezone), 3),
      notice_days: 2,
    })
    .select()
    .single();

  const { data: childTask1 } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      reminder_id: remWithChildren.id,
      title: 'Escribir informe proyecto',
      status: 'planned',
      due_on: addDays(getTodayString(userTimezone), 2),
    })
    .select()
    .single();

  const { data: childTask2 } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      reminder_id: remWithChildren.id,
      title: 'Subir código al repositorio',
      status: 'planned',
      due_on: addDays(getTodayString(userTimezone), 2),
    })
    .select()
    .single();

  const { data: remBlockA } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      reminder_id: remWithChildren.id,
      title: remWithChildren.title,
      status: 'pending',
      source: 'manual',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select()
    .single();

  // Ejecutar acción
  await markReminderCompletedAction(remWithChildren.id);

  // Verificaciones Caso A:
  // 1. Todas las tareas hijas completadas
  const { data: verifyChildren } = await supabaseAdmin
    .from('items')
    .select('id, status, completed_at')
    .eq('reminder_id', remWithChildren.id);

  assert.equal(verifyChildren.length, 2, 'Deben existir exactamente las 2 tareas hijas');
  for (const child of verifyChildren) {
    assert.equal(child.status, 'done', `Tarea hija ${child.id} debe estar "done"`);
    assert.ok(child.completed_at, `Tarea hija ${child.id} debe tener completed_at`);
  }

  // 2. Bloque del recordatorio marcado "done" (silencia avisos push futuros)
  const { data: verifyBlockA } = await supabaseAdmin
    .from('blocks')
    .select('status')
    .eq('id', remBlockA.id)
    .single();
  assert.equal(verifyBlockA.status, 'done', 'El bloque del reminder debe marcarse como "done"');

  // 3. DECISIÓN #61: El recordatorio NO se borra de la tabla reminders (historial intacto)
  const { data: verifyReminderA } = await supabaseAdmin
    .from('reminders')
    .select('id, title, occurs_on')
    .eq('id', remWithChildren.id)
    .maybeSingle();
  assert.ok(verifyReminderA, 'El recordatorio debe seguir existiendo en reminders (Decisión #61)');
  assert.equal(verifyReminderA.id, remWithChildren.id);

  // Limpieza Caso A
  await supabaseAdmin.from('blocks').delete().eq('id', remBlockA.id);
  await supabaseAdmin.from('items').delete().in('id', [childTask1.id, childTask2.id]);
  await supabaseAdmin.from('reminders').delete().eq('id', remWithChildren.id);
  logPass('Caso A verificado: tareas hijas marcadas "done", bloque "done", y reminder intacto (Decisión #61)');

  // 3.3 Caso B: Recordatorio SIN tareas hijas previas
  const { data: remNoChildren } = await supabaseAdmin
    .from('reminders')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-REMINDER-B] Trámite Simple ${Date.now()}`,
      occurs_on: addDays(getTodayString(userTimezone), 5),
    })
    .select()
    .single();

  const { data: remBlockB } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      reminder_id: remNoChildren.id,
      title: remNoChildren.title,
      status: 'pending',
      source: 'manual',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    })
    .select()
    .single();

  // Ejecutar acción
  await markReminderCompletedAction(remNoChildren.id);

  // Verificaciones Caso B:
  // 1. Debe haber insertado una tarea hija con title 'Entregado' y status 'done'
  const { data: verifyCreatedChild } = await supabaseAdmin
    .from('items')
    .select('id, title, status, completed_at, reminder_id')
    .eq('reminder_id', remNoChildren.id);

  assert.equal(verifyCreatedChild.length, 1, 'Debe insertar exactamente 1 item cumplido');
  const insertedChild = verifyCreatedChild[0];
  assert.equal(insertedChild.title, 'Entregado', 'El título de la tarea sintética debe ser "Entregado"');
  assert.equal(insertedChild.status, 'done', 'El status debe ser "done"');
  assert.ok(insertedChild.completed_at, 'completed_at debe estar poblado');

  // 2. Bloque del recordatorio marcado "done"
  const { data: verifyBlockB } = await supabaseAdmin
    .from('blocks')
    .select('status')
    .eq('id', remBlockB.id)
    .single();
  assert.equal(verifyBlockB.status, 'done', 'El bloque debe marcarse como "done"');

  // 3. Recordatorio preservado
  const { data: verifyReminderB } = await supabaseAdmin
    .from('reminders')
    .select('id')
    .eq('id', remNoChildren.id)
    .maybeSingle();
  assert.ok(verifyReminderB, 'El recordatorio debe preservarse en base de datos');

  // Limpieza Caso B
  await supabaseAdmin.from('blocks').delete().eq('id', remBlockB.id);
  await supabaseAdmin.from('items').delete().eq('id', insertedChild.id);
  await supabaseAdmin.from('reminders').delete().eq('id', remNoChildren.id);
  logPass('Caso B verificado: item cumplido "Entregado" insertado, bloque "done" y reminder intacto');
} catch (err) {
  logFail('Error en Suite 3 (markReminderCompletedAction)', err);
}

// -----------------------------------------------------------------------------
// SUITE 4: Acción moveTaskToDate (A8 - Preservación de estimate_min)
// -----------------------------------------------------------------------------
logSection('4. moveTaskToDate (A8 - Preservación de duración estimate_min)');
try {
  clearTestCookies();
  await dummySsr.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  const overdueDate = addDays(getTodayString(userTimezone), -3); // 3 días atrás
  const targetDate = getTodayString(userTimezone);

  // 4.1 Caso A: Tarea atrasada con bloque de 90 min y sin estimate_min previo
  const { data: taskA } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-MOVE-A] Tarea Atrasada Sin Est ${Date.now()}`,
      status: 'planned',
      due_on: overdueDate,
      estimate_min: null,
    })
    .select()
    .single();

  const startA = new Date(`${overdueDate}T14:00:00Z`);
  const endA = new Date(`${overdueDate}T15:30:00Z`); // 90 min

  const { data: blockA } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      item_id: taskA.id,
      title: taskA.title,
      source: 'manual',
      status: 'pending',
      starts_at: startA.toISOString(),
      ends_at: endA.toISOString(),
    })
    .select()
    .single();

  // Mover la tarea a hoy
  await moveTaskToDate(taskA.id, targetDate);

  // Verificaciones Caso A:
  // 1. Tarea movida a targetDate
  const { data: updatedTaskA } = await supabaseAdmin
    .from('items')
    .select('due_on, status, estimate_min')
    .eq('id', taskA.id)
    .single();

  assert.equal(updatedTaskA.due_on, targetDate, 'due_on debe actualizarse a targetDate');
  assert.equal(updatedTaskA.status, 'planned', 'status debe ser "planned"');
  assert.equal(updatedTaskA.estimate_min, 90, 'estimate_min debe conservar los 90 min calculados del bloque manual');

  // 2. Bloque manual previo eliminado
  const { data: checkBlockA } = await supabaseAdmin
    .from('blocks')
    .select('id')
    .eq('id', blockA.id)
    .maybeSingle();
  assert.equal(checkBlockA, null, 'El bloque manual de la fecha pasada debe ser eliminado');

  // Limpieza Caso A
  await supabaseAdmin.from('items').delete().eq('id', taskA.id);
  logPass('Caso A verificado: tarea atrasada movida conservando estimate_min=90 min del bloque');

  // 4.2 Caso B: Tarea atrasada que YA tenía un estimate_min explícito (ej. 45 min)
  const { data: taskB } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-MOVE-B] Tarea Con Est Previo ${Date.now()}`,
      status: 'planned',
      due_on: overdueDate,
      estimate_min: 45,
    })
    .select()
    .single();

  const startB = new Date(`${overdueDate}T10:00:00Z`);
  const endB = new Date(`${overdueDate}T12:00:00Z`); // 120 min

  const { data: blockB } = await supabaseAdmin
    .from('blocks')
    .insert({
      user_id: TEST_USER_ID,
      item_id: taskB.id,
      title: taskB.title,
      source: 'manual',
      status: 'pending',
      starts_at: startB.toISOString(),
      ends_at: endB.toISOString(),
    })
    .select()
    .single();

  // Mover la tarea a hoy
  await moveTaskToDate(taskB.id, targetDate);

  // Verificaciones Caso B:
  const { data: updatedTaskB } = await supabaseAdmin
    .from('items')
    .select('due_on, estimate_min')
    .eq('id', taskB.id)
    .single();

  assert.equal(updatedTaskB.due_on, targetDate);
  assert.equal(updatedTaskB.estimate_min, 45, 'estimate_min debe conservar su valor previo de 45 min sin sobreescribirlo');

  const { data: checkBlockB } = await supabaseAdmin
    .from('blocks')
    .select('id')
    .eq('id', blockB.id)
    .maybeSingle();
  assert.equal(checkBlockB, null, 'Bloque manual previo eliminado');

  // Limpieza Caso B
  await supabaseAdmin.from('items').delete().eq('id', taskB.id);
  logPass('Caso B verificado: estimate_min preexistente (45 min) respetado sin sobreescritura');

  // 4.3 Caso C: Tarea atrasada sin bloques
  const { data: taskC } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-MOVE-C] Tarea Sin Bloque ${Date.now()}`,
      status: 'planned',
      due_on: overdueDate,
      estimate_min: null,
    })
    .select()
    .single();

  await moveTaskToDate(taskC.id, targetDate);

  const { data: updatedTaskC } = await supabaseAdmin
    .from('items')
    .select('due_on, estimate_min')
    .eq('id', taskC.id)
    .single();

  assert.equal(updatedTaskC.due_on, targetDate);
  assert.equal(updatedTaskC.estimate_min, null);

  await supabaseAdmin.from('items').delete().eq('id', taskC.id);
  logPass('Caso C verificado: tarea sin bloque movida exitosamente sin errores');

  // 4.4 Caso D: Mover a null (desplanificar a inbox)
  const { data: taskD } = await supabaseAdmin
    .from('items')
    .insert({
      user_id: TEST_USER_ID,
      title: `[QA-MOVE-D] Desplanificar ${Date.now()}`,
      status: 'planned',
      due_on: overdueDate,
    })
    .select()
    .single();

  await moveTaskToDate(taskD.id, null);

  const { data: updatedTaskD } = await supabaseAdmin
    .from('items')
    .select('due_on, status')
    .eq('id', taskD.id)
    .single();

  assert.equal(updatedTaskD.due_on, null, 'due_on debe ser null');
  assert.equal(updatedTaskD.status, 'inbox', 'status debe cambiar a "inbox" al desplanificar');

  await supabaseAdmin.from('items').delete().eq('id', taskD.id);
  logPass('Caso D verificado: mover a null pasa status a "inbox"');
} catch (err) {
  logFail('Error en Suite 4 (moveTaskToDate)', err);
}

// -----------------------------------------------------------------------------
// 4. Resumen Final
// -----------------------------------------------------------------------------
console.log('\n\x1b[1m====================================================================\x1b[0m');
console.log(`TOTAL ASERCIONES: ${totalTests}`);
console.log(`\x1b[32mPASADAS:          ${passedTests}\x1b[0m`);
if (failedTests > 0) {
  console.log(`\x1b[31mFALLADAS:         ${failedTests}\x1b[0m`);
} else {
  console.log(`\x1b[32mFALLADAS:         0\x1b[0m`);
}
console.log('\x1b[1m====================================================================\x1b[0m');

if (failedTests > 0) {
  console.error('\n❌ La suite de pruebas QA falló.');
  process.exit(1);
} else {
  console.log('\n✨ Todas las pruebas automatizadas pasaron al 100% exitosamente.');
  process.exit(0);
}
