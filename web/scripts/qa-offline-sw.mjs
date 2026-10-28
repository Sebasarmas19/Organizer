/**
 * QA Automation Script: Service Worker, Cache Storage & Offline Capabilities
 * Tests web/public/sw.js and web/src/components/ServiceWorkerRegistrar.tsx
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const swPath = path.join(webDir, 'public', 'sw.js');
const registrarPath = path.join(webDir, 'src', 'components', 'ServiceWorkerRegistrar.tsx');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTest(suiteName, fn) {
  console.log(`\n--- [TEST SUITE] ${suiteName} ---`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ✗ Suite Error:`, err);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// Suite 1: File Existence & Syntax Analysis
// -----------------------------------------------------------------------------
await runTest('1. File Integrity & Syntax Check', async () => {
  assert(fs.existsSync(swPath), 'public/sw.js exists');
  assert(fs.existsSync(registrarPath), 'ServiceWorkerRegistrar.tsx exists');

  const swCode = fs.readFileSync(swPath, 'utf8');
  assert(swCode.length > 500, 'public/sw.js has substantive content');

  // Validate pure JS syntax using Node vm
  let syntaxOk = false;
  try {
    new vm.Script(swCode, { filename: 'sw.js' });
    syntaxOk = true;
  } catch (err) {
    console.error('Syntax error in sw.js:', err);
  }
  assert(syntaxOk, 'public/sw.js has valid, clean JavaScript syntax (no parse errors)');

  // Validate ServiceWorkerRegistrar registers /sw.js with scope /
  const regCode = fs.readFileSync(registrarPath, 'utf8');
  assert(regCode.includes("navigator.serviceWorker.register('/sw.js'"), 'Registrar targets /sw.js');
  assert(regCode.includes("scope: '/'"), 'Registrar sets scope to /');
  assert(regCode.includes("document.readyState === 'complete'"), 'Registrar defers after load/ready');
});

// -----------------------------------------------------------------------------
// Suite 2: Constants & Precache Assets Verification
// -----------------------------------------------------------------------------
await runTest('2. Cache Keys & Precache Verification', async () => {
  const swCode = fs.readFileSync(swPath, 'utf8');

  // Check cache versions and naming
  const staticCacheMatch = swCode.match(/const\s+STATIC_CACHE\s*=\s*['"]([^'"]+)['"]/);
  const pagesCacheMatch = swCode.match(/const\s+PAGES_CACHE\s*=\s*['"]([^'"]+)['"]/);

  assert(Boolean(staticCacheMatch), 'STATIC_CACHE constant is declared');
  assert(Boolean(pagesCacheMatch), 'PAGES_CACHE constant is declared');

  const staticCacheName = staticCacheMatch ? staticCacheMatch[1] : '';
  const pagesCacheName = pagesCacheMatch ? pagesCacheMatch[1] : '';

  assert(staticCacheName.startsWith('organizer-static-'), `Static cache versioned: ${staticCacheName}`);
  assert(pagesCacheName.startsWith('organizer-pages-'), `Pages cache versioned: ${pagesCacheName}`);

  assert(swCode.includes('ALLOWED_CACHES = [STATIC_CACHE, PAGES_CACHE]'), 'ALLOWED_CACHES encapsulates both caches');

  // Verify precache assets list
  const precacheBlock = swCode.match(/const\s+PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  assert(Boolean(precacheBlock), 'PRECACHE_ASSETS array is declared');

  const precacheUrls = precacheBlock[1]
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(Boolean);

  console.log('    Precache assets configured:', precacheUrls);
  assert(precacheUrls.includes('/manifest.webmanifest'), 'Manifest is in PRECACHE_ASSETS');
  assert(precacheUrls.includes('/icon-192.png'), 'icon-192.png is in PRECACHE_ASSETS');
  assert(precacheUrls.includes('/icon-512.png'), 'icon-512.png is in PRECACHE_ASSETS');
  assert(precacheUrls.includes('/icon-maskable-512.png'), 'icon-maskable-512.png is in PRECACHE_ASSETS');

  // Verify that physical icon files exist on disk
  assert(fs.existsSync(path.join(webDir, 'public', 'icon-192.png')), 'Physical icon-192.png exists in public/');
  assert(fs.existsSync(path.join(webDir, 'public', 'icon-512.png')), 'Physical icon-512.png exists in public/');
  assert(fs.existsSync(path.join(webDir, 'public', 'icon-maskable-512.png')), 'Physical icon-maskable-512.png exists in public/');
  assert(fs.existsSync(path.join(webDir, 'src', 'app', 'manifest.ts')), 'manifest.ts metadata route exists in app/');
  assert(fs.existsSync(path.join(webDir, 'src', 'app', 'icon.png')), 'icon.png metadata route exists in app/');
  assert(fs.existsSync(path.join(webDir, 'src', 'app', 'apple-icon.png')), 'apple-icon.png metadata route exists in app/');
});

// -----------------------------------------------------------------------------
// Mock Environment Factory for Service Worker Sandbox
// -----------------------------------------------------------------------------
class MockResponse {
  constructor(body = '', options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Map(Object.entries(options.headers || {}));
  }
  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers.entries()),
    });
  }
  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}

class MockCache {
  constructor(name) {
    this.name = name;
    this.entries = new Map();
  }
  async addAll(urls) {
    for (const url of urls) {
      this.entries.set(url, new MockResponse(`content-of-${url}`, { status: 200 }));
    }
  }
  async put(req, response) {
    const key = typeof req === 'string' ? req : req.url;
    this.entries.set(key, response);
  }
  async match(req, options = {}) {
    const url = typeof req === 'string' ? req : req.url;
    if (this.entries.has(url)) {
      return this.entries.get(url);
    }
    if (options.ignoreSearch) {
      const cleanUrl = url.split('?')[0];
      for (const [key, val] of this.entries.entries()) {
        if (key.split('?')[0] === cleanUrl) return val;
      }
    }
    // Also support relative URL matching
    for (const [key, val] of this.entries.entries()) {
      try {
        const u1 = new URL(key, 'https://organizer.local');
        const u2 = new URL(url, 'https://organizer.local');
        if (options.ignoreSearch ? u1.pathname === u2.pathname : u1.href === u2.href) {
          return val;
        }
      } catch {}
    }
    return undefined;
  }
}

function createSwEnvironment() {
  const eventListeners = new Map();
  const cacheStorage = new Map();

  const mockCaches = {
    async open(name) {
      if (!cacheStorage.has(name)) {
        cacheStorage.set(name, new MockCache(name));
      }
      return cacheStorage.get(name);
    },
    async keys() {
      return Array.from(cacheStorage.keys());
    },
    async delete(name) {
      return cacheStorage.delete(name);
    },
    async match(req, options) {
      for (const cache of cacheStorage.values()) {
        const found = await cache.match(req, options);
        if (found) return found;
      }
      return undefined;
    },
  };

  const notificationCalls = [];
  const clientWindowCalls = [];

  const sandbox = {
    self: {
      location: {
        origin: 'https://organizer.local',
        href: 'https://organizer.local/sw.js',
      },
      skipWaiting: () => {},
      clients: {
        claim: async () => {},
        matchAll: async () => [
          {
            focus: async () => 'focused',
            navigate: async (url) => { clientWindowCalls.push({ action: 'navigate', url }); },
          },
        ],
        openWindow: async (url) => {
          clientWindowCalls.push({ action: 'openWindow', url });
        },
      },
      registration: {
        showNotification: async (title, options) => {
          notificationCalls.push({ title, options });
        },
      },
      addEventListener: (type, handler) => {
        if (!eventListeners.has(type)) eventListeners.set(type, []);
        eventListeners.get(type).push(handler);
      },
    },
    caches: mockCaches,
    Response: MockResponse,
    URL,
    fetch: async () => {
      throw new Error('Default fetch unmocked');
    },
    console,
    setTimeout,
    clearTimeout,
  };

  sandbox.self.addEventListener = sandbox.self.addEventListener.bind(sandbox);

  const swCode = fs.readFileSync(swPath, 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(swCode, sandbox);

  return {
    sandbox,
    eventListeners,
    cacheStorage,
    notificationCalls,
    clientWindowCalls,
    trigger: async (eventType, eventObj) => {
      const handlers = eventListeners.get(eventType) || [];
      for (const handler of handlers) {
        await handler(eventObj);
      }
    },
  };
}

// -----------------------------------------------------------------------------
// Suite 3: Lifecycle Events (install, activate, cache cleanup)
// -----------------------------------------------------------------------------
await runTest('3. SW Lifecycle & Cache Management', async () => {
  const env = createSwEnvironment();

  // 1. Install Event
  let installWaitPromise = null;
  await env.trigger('install', {
    waitUntil: (p) => { installWaitPromise = p; },
  });
  await installWaitPromise;

  const staticCache = env.cacheStorage.get('organizer-static-v2');
  assert(Boolean(staticCache), 'STATIC_CACHE organizer-static-v2 opened on install');
  assert(staticCache.entries.has('/icon-192.png'), 'icon-192.png precached on install');
  assert(staticCache.entries.has('/manifest.webmanifest'), 'manifest.webmanifest precached on install');
  assert(staticCache.entries.has('/icon-512.png'), 'icon-512.png precached on install');

  // 2. Activate Event: verify obsolete caches get purged
  await env.sandbox.caches.open('organizer-legacy-v1');
  await env.sandbox.caches.open('organizer-static-v1');
  assert(env.cacheStorage.has('organizer-legacy-v1'), 'Created obsolete legacy cache');

  let activateWaitPromise = null;
  await env.trigger('activate', {
    waitUntil: (p) => { activateWaitPromise = p; },
  });
  await activateWaitPromise;

  assert(!env.cacheStorage.has('organizer-legacy-v1'), 'Obsolete organizer-legacy-v1 deleted');
  assert(!env.cacheStorage.has('organizer-static-v1'), 'Obsolete organizer-static-v1 deleted');
  assert(env.cacheStorage.has('organizer-static-v2'), 'Current organizer-static-v2 preserved');
});

// -----------------------------------------------------------------------------
// Suite 4: Interception Rules (Exclusions & Bypass)
// -----------------------------------------------------------------------------
await runTest('4. Fetch Interception Rules & Exclusions', async () => {
  const env = createSwEnvironment();

  function testRequest(options) {
    let responded = false;
    let responsePromise = null;

    const event = {
      request: {
        method: options.method || 'GET',
        url: options.url,
        mode: options.mode || 'cors',
        headers: new Map(Object.entries(options.headers || {})),
      },
      respondWith: (p) => {
        responded = true;
        responsePromise = p;
      },
    };

    // Helper method get on headers
    event.request.headers.get = (name) => {
      for (const [k, v] of event.request.headers.entries()) {
        if (k.toLowerCase() === name.toLowerCase()) return v;
      }
      return null;
    };

    const handlers = env.eventListeners.get('fetch') || [];
    for (const h of handlers) h(event);

    return { responded, responsePromise };
  }

  // 1. POST mutations pass straight through
  const postReq = testRequest({ method: 'POST', url: 'https://organizer.local/api/capture' });
  assert(!postReq.responded, 'POST /api/capture is NOT intercepted (passes to network directly)');

  const postActionReq = testRequest({ method: 'POST', url: 'https://organizer.local/tareas' });
  assert(!postActionReq.responded, 'POST /tareas (Server Action) is NOT intercepted');

  // 2. External origins (Supabase, CDNs) pass straight through
  const supabaseReq = testRequest({
    method: 'GET',
    url: 'https://xwhdfrtgplmn.supabase.co/rest/v1/tasks?select=*',
  });
  assert(!supabaseReq.responded, 'Supabase REST calls are NOT intercepted (no cache pollution)');

  const externalCdnReq = testRequest({
    method: 'GET',
    url: 'https://fonts.googleapis.com/css2?family=Inter',
  });
  assert(!externalCdnReq.responded, 'External CDN URLs are NOT intercepted');

  // 3. /api/ routes on same origin pass straight through
  const apiCronReq = testRequest({
    method: 'GET',
    url: 'https://organizer.local/api/push/cron',
  });
  assert(!apiCronReq.responded, 'Internal /api/push/cron is NOT intercepted');

  const apiCaptureReq = testRequest({
    method: 'GET',
    url: 'https://organizer.local/api/capture/token',
  });
  assert(!apiCaptureReq.responded, 'Internal /api/capture is NOT intercepted');
});

// -----------------------------------------------------------------------------
// Suite 5: Static Assets (Cache-First)
// -----------------------------------------------------------------------------
await runTest('5. Static Assets (Cache-First Strategy)', async () => {
  const env = createSwEnvironment();
  const staticCache = await env.sandbox.caches.open('organizer-static-v2');

  // Seed cache with a chunk
  await staticCache.put(
    'https://organizer.local/_next/static/chunks/app-bundle.js',
    new MockResponse('console.log("cached chunk")', { status: 200 })
  );

  let networkFetched = false;
  env.sandbox.fetch = async () => {
    networkFetched = true;
    return new MockResponse('console.log("network chunk")', { status: 200 });
  };

  function simulateFetch(url) {
    let responsePromise = null;
    const event = {
      request: {
        method: 'GET',
        url,
        mode: 'no-cors',
        headers: { get: () => null },
      },
      respondWith: (p) => { responsePromise = p; },
    };
    const handlers = env.eventListeners.get('fetch') || [];
    for (const h of handlers) h(event);
    return responsePromise;
  }

  // 1. Cache HIT on static chunk
  networkFetched = false;
  const resHit = await simulateFetch('https://organizer.local/_next/static/chunks/app-bundle.js');
  assert(Boolean(resHit), 'Static chunk intercepted');
  assert(!networkFetched, 'Static chunk served from CACHE without hitting network');
  assert((await resHit.text()).includes('cached chunk'), 'Returned cached content');

  // 2. Cache MISS on new static chunk -> fetches and populates cache
  networkFetched = false;
  const resMiss = await simulateFetch('https://organizer.local/_next/static/chunks/new-bundle.js');
  assert(networkFetched, 'Uncached static chunk fetched from network');
  assert((await resMiss.text()).includes('network chunk'), 'Returned fresh network response');
  assert(staticCache.entries.has('https://organizer.local/_next/static/chunks/new-bundle.js'), 'Fresh static chunk saved into STATIC_CACHE');

  // 3. Offline failure on uncached static chunk -> graceful 408 response
  env.sandbox.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const resFail = await simulateFetch('https://organizer.local/_next/static/chunks/missing.js');
  assert(resFail.status === 408, 'Offline static asset failure returns graceful 408 instead of crash');
});

// -----------------------------------------------------------------------------
// Suite 6: Page Navigation & RSC (Network-First with Offline Fallback)
// -----------------------------------------------------------------------------
await runTest('6. Navigation & RSC (Network-First + Offline Cache Fallback)', async () => {
  const env = createSwEnvironment();
  const pagesCache = await env.sandbox.caches.open('organizer-pages-v2');

  function makeNavRequest(url, headers = {}, mode = 'navigate') {
    let responsePromise = null;
    const reqHeaders = new Map(Object.entries(headers));
    const event = {
      request: {
        method: 'GET',
        url,
        mode,
        headers: {
          get: (k) => {
            for (const [key, val] of reqHeaders.entries()) {
              if (key.toLowerCase() === k.toLowerCase()) return val;
            }
            return null;
          },
        },
      },
      respondWith: (p) => { responsePromise = p; },
    };
    const handlers = env.eventListeners.get('fetch') || [];
    for (const h of handlers) h(event);
    return responsePromise;
  }

  // Scenario 1: ONLINE - Visiting / (Home) fetches and stores in PAGES_CACHE
  let onlineHits = 0;
  env.sandbox.fetch = async () => {
    onlineHits++;
    return new MockResponse('<!DOCTYPE html><html><body>Inicio en vivo</body></html>', { status: 200 });
  };

  const navHomeOnline = await makeNavRequest('https://organizer.local/');
  assert(onlineHits === 1, 'Network-First fetches from network when online');
  assert((await navHomeOnline.text()).includes('Inicio en vivo'), 'Online navigation receives fresh network HTML');
  assert(pagesCache.entries.has('https://organizer.local/'), 'HTML stored in PAGES_CACHE for offline reading');

  // Scenario 2: ONLINE - Visiting /tareas stores in PAGES_CACHE
  env.sandbox.fetch = async () => new MockResponse('<!DOCTYPE html><html><body>Tareas en vivo</body></html>', { status: 200 });
  await makeNavRequest('https://organizer.local/tareas');
  assert(pagesCache.entries.has('https://organizer.local/tareas'), 'Visited /tareas stored in PAGES_CACHE');

  // Scenario 3: OFFLINE - User returns to /tareas with NO Wi-Fi / NO cellular
  env.sandbox.fetch = async () => {
    throw new TypeError('Failed to fetch (offline / airplane mode)');
  };

  const navTareasOffline = await makeNavRequest('https://organizer.local/tareas');
  assert(Boolean(navTareasOffline), 'Navigation handled while offline');
  assert((await navTareasOffline.text()).includes('Tareas en vivo'), 'Successfully served cached /tareas while completely offline');

  // Scenario 4: OFFLINE - User navigates to /unknown-page (never visited -> clean offline page without cross-route hydration mismatch)
  const navUnknownOffline = await makeNavRequest('https://organizer.local/ajustes');
  assert(Boolean(navUnknownOffline), 'Unvisited route falls back gracefully');
  assert((await navUnknownOffline.text()).includes('Modo sin conexión'), 'Unvisited route falls back to clean offline page');

  // Scenario 5: OFFLINE - Cold start with empty cache shows offline card
  const emptyEnv = createSwEnvironment();
  emptyEnv.sandbox.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const navColdOffline = await (async () => {
    let p = null;
    const event = {
      request: {
        method: 'GET',
        url: 'https://organizer.local/semana',
        mode: 'navigate',
        headers: { get: (k) => k === 'accept' ? 'text/html' : null },
      },
      respondWith: (resP) => { p = resP; },
    };
    const handlers = emptyEnv.eventListeners.get('fetch') || [];
    for (const h of handlers) h(event);
    return p;
  })();

  const offlineCardHtml = await navColdOffline.text();
  assert(offlineCardHtml.includes('Modo sin conexión'), 'Displays friendly offline card if nothing was cached');
  assert(offlineCardHtml.includes('Ir a Inicio'), 'Includes call to action to return home');

  // Scenario 6: RSC Fetch (Header RSC: 1 and _rsc query param)
  const rscEnv = createSwEnvironment();
  const rscPagesCache = await rscEnv.sandbox.caches.open('organizer-pages-v2');

  // Online RSC fetch
  rscEnv.sandbox.fetch = async () => new MockResponse('0:["$","div",null,{"children":"RSC Payload"}]', {
    status: 200,
    headers: { 'Content-Type': 'text/x-component' },
  });

  const rscOnline = await (async () => {
    let p = null;
    const event = {
      request: {
        method: 'GET',
        url: 'https://organizer.local/tareas?_rsc=abc123',
        mode: 'cors',
        headers: { get: (k) => k.toLowerCase() === 'rsc' ? '1' : null },
      },
      respondWith: (resP) => { p = resP; },
    };
    for (const h of rscEnv.eventListeners.get('fetch') || []) h(event);
    return p;
  })();

  assert(Boolean(rscOnline), 'RSC request intercepted');
  assert(rscPagesCache.entries.has('https://organizer.local/tareas?_rsc=abc123'), 'RSC payload cached in PAGES_CACHE');

  // Offline RSC fetch
  rscEnv.sandbox.fetch = async () => { throw new TypeError('Network error'); };
  const rscOffline = await (async () => {
    let p = null;
    const event = {
      request: {
        method: 'GET',
        url: 'https://organizer.local/tareas?_rsc=abc123',
        mode: 'cors',
        headers: { get: (k) => k.toLowerCase() === 'rsc' ? '1' : null },
      },
      respondWith: (resP) => { p = resP; },
    };
    for (const h of rscEnv.eventListeners.get('fetch') || []) h(event);
    return p;
  })();

  assert((await rscOffline.text()).includes('RSC Payload'), 'Offline RSC served successfully from cache');
});

// -----------------------------------------------------------------------------
// Suite 7: Web Push & Notification Click Handling
// -----------------------------------------------------------------------------
await runTest('7. Web Push & Notification Contracts', async () => {
  const env = createSwEnvironment();

  // Test 1: Web Push event with payload
  let pushWaitPromise = null;
  const pushEvent = {
    data: {
      json: () => ({
        title: 'Hoy: Cálculo 8:00 · Informe 11:00',
        body: '3 compromisos en tu agenda',
        tag: 'organizer-morning',
        url: '/semana',
      }),
    },
    waitUntil: (p) => { pushWaitPromise = p; },
  };

  await env.trigger('push', pushEvent);
  await pushWaitPromise;

  assert(env.notificationCalls.length === 1, 'Push event generated a notification');
  const notification = env.notificationCalls[0];
  assert(notification.title === 'Hoy: Cálculo 8:00 · Informe 11:00', 'Title contains full event details');
  assert(notification.options.body === '3 compromisos en tu agenda', 'Body contains actionable content');
  assert(notification.options.data.url === '/semana', 'URL target is set for navigation');
  assert(notification.options.icon === '/icon-192.png', 'Notification icon set');

  // Test 2: Push event with empty/corrupted payload still shows notification (userVisibleOnly contract)
  env.notificationCalls.length = 0;
  let emptyPushWait = null;
  const emptyPushEvent = {
    data: null,
    waitUntil: (p) => { emptyPushWait = p; },
  };

  await env.trigger('push', emptyPushEvent);
  await emptyPushWait;

  assert(env.notificationCalls.length === 1, 'Empty push payload still displays fallback notification (guarantees userVisibleOnly: true)');

  // Test 3: notificationclick event
  let closed = false;
  let clickWaitPromise = null;
  const clickEvent = {
    notification: {
      close: () => { closed = true; },
      data: { url: '/tareas' },
    },
    waitUntil: (p) => { clickWaitPromise = p; },
  };

  await env.trigger('notificationclick', clickEvent);
  await clickWaitPromise;

  assert(closed, 'Notification was closed on tap');
  assert(env.clientWindowCalls.length > 0, 'Target window navigated or focused on click');
});

// -----------------------------------------------------------------------------
// Final Verdict
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`TOTAL CHECKS: ${passedTests + failedTests}`);
console.log(`PASSED:       ${passedTests}`);
console.log(`FAILED:       ${failedTests}`);
console.log('======================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✨ All Service Worker & Offline QA tests passed successfully!\n');
}
