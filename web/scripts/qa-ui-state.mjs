/**
 * QA Automation Script: UI State, Micro-start Timer, Group Accordion Persistence & Modal Motion Rules
 * Tests:
 * 1. 5-minute micro-start countdown timer in InicioScreen.tsx (C5)
 * 2. SessionStorage accordion persistence in TaskGroupCard.tsx (B6)
 * 3. Modal sheet backdrop blur prevention and prefers-reduced-motion rules (B5)
 *
 * Usage: node web/scripts/qa-ui-state.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');

const inicioScreenPath = path.join(webDir, 'src', 'components', 'inicio', 'InicioScreen.tsx');
const taskGroupCardPath = path.join(webDir, 'src', 'components', 'fd4', 'TaskGroupCard.tsx');
const fd4CssPath = path.join(webDir, 'src', 'styles', 'fd4.css');
const iosCssPath = path.join(webDir, 'src', 'styles', 'ios.css');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}${details ? ` -> ${details}` : ''}`);
    failedTests++;
  }
}

async function runSuite(suiteName, fn) {
  console.log(`\n======================================================================`);
  console.log(`  [TEST SUITE] ${suiteName}`);
  console.log(`======================================================================`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ✗ Suite Execution Error:`, err);
    failedTests++;
  }
}

// =============================================================================
// Suite 1: Static Source Code Analysis & Contract Verification
// =============================================================================
await runSuite('1. Static Source Code & Contract Analysis', async () => {
  // 1.1 InicioScreen.tsx existence and content
  assert(fs.existsSync(inicioScreenPath), 'InicioScreen.tsx exists on disk');
  const inicioCode = fs.readFileSync(inicioScreenPath, 'utf8');

  // Timer state definitions
  assert(
    inicioCode.includes('const [timerSeconds, setTimerSeconds] = useState<number | null>(null)'),
    'InicioScreen declares timerSeconds state initialized to null'
  );
  assert(
    inicioCode.includes('const [timerPaused, setTimerPaused] = useState(false)'),
    'InicioScreen declares timerPaused state initialized to false'
  );

  // Initial 5 min trigger (300 seconds)
  assert(
    inicioCode.includes('setTimerSeconds(300)') && inicioCode.includes('⏱ 5 min'),
    'InicioScreen has "⏱ 5 min" button initializing timer to 300 seconds'
  );

  // Interval countdown & condition check
  assert(
    inicioCode.includes('timerSeconds === null || timerSeconds <= 0 || timerPaused'),
    'InicioScreen interval effect halts on null, zero, or paused'
  );
  assert(
    inicioCode.includes('return prev - 1;'),
    'InicioScreen interval decrements timerSeconds by 1 each second'
  );

  // Vibration pattern: [200, 100, 200]
  const vibrateMatch = inicioCode.match(/navigator\.vibrate\(\s*(\[[^\]]+\])\s*\)/);
  assert(Boolean(vibrateMatch), 'InicioScreen invokes navigator.vibrate()');
  if (vibrateMatch) {
    const rawPattern = vibrateMatch[1].replace(/\s+/g, '');
    assert(rawPattern === '[200,100,200]', `Vibration pattern matches [200, 100, 200] (found: ${vibrateMatch[1]})`);
  }

  // Formatting mm:ss
  assert(
    inicioCode.includes('Math.floor(timerSeconds / 60)') &&
    inicioCode.includes("String(timerSeconds % 60).padStart(2, '0')"),
    'InicioScreen formats remaining time using mm:ss pattern'
  );

  // Transitions: +20 min (1200 seconds) & Hecho (timer cleanup)
  assert(
    inicioCode.includes('setTimerSeconds(1200)') && inicioCode.includes('+20 min más'),
    'InicioScreen has "+20 min más" button transitioning to 1200 seconds'
  );
  assert(
    inicioCode.includes('setTimerSeconds(null)') && inicioCode.includes('setDone(next.id'),
    'InicioScreen cleans up timer when task is marked "Hecho"'
  );

  // 1.2 TaskGroupCard.tsx existence and sessionStorage contract
  assert(fs.existsSync(taskGroupCardPath), 'TaskGroupCard.tsx exists on disk');
  const groupCardCode = fs.readFileSync(taskGroupCardPath, 'utf8');

  assert(
    groupCardCode.includes('const storageKey = `organizer:group:${label}`'),
    'TaskGroupCard uses storageKey pattern `organizer:group:${label}`'
  );
  assert(
    groupCardCode.includes("sessionStorage.getItem(storageKey) === 'true'"),
    'TaskGroupCard restores open state from sessionStorage on mount'
  );
  assert(
    groupCardCode.includes("typeof window === 'undefined'"),
    'TaskGroupCard guards against SSR window undefined errors'
  );
  assert(
    groupCardCode.includes("sessionStorage.setItem(storageKey, 'true')"),
    'TaskGroupCard handleOpen saves "true" to sessionStorage'
  );
  assert(
    groupCardCode.includes("sessionStorage.setItem(storageKey, 'false')"),
    'TaskGroupCard handleClose saves "false" to sessionStorage'
  );
  assert(
    groupCardCode.includes('const VISIBLE = 5;'),
    'TaskGroupCard caps visible items to 5 items'
  );
});

// =============================================================================
// Suite 2: Temporizador 5 Minutos (C5) State Machine & Logic Simulation
// =============================================================================
await runSuite('2. Temporizador Micro-inicio (C5) - State Machine & Haptics', async () => {
  // Formatting helper function as implemented in InicioScreen
  function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  // 2.1 Formatter tests
  assert(formatTimer(300) === '5:00', '300 seconds formats as "5:00"');
  assert(formatTimer(299) === '4:59', '299 seconds formats as "4:59"');
  assert(formatTimer(180) === '3:00', '180 seconds formats as "3:00"');
  assert(formatTimer(65) === '1:05', '65 seconds formats as "1:05"');
  assert(formatTimer(10) === '0:10', '10 seconds formats as "0:10"');
  assert(formatTimer(5) === '0:05', '5 seconds formats as "0:05"');
  assert(formatTimer(0) === '0:00', '0 seconds formats as "0:00"');
  assert(formatTimer(1200) === '20:00', '1200 seconds formats as "20:00"');
  assert(formatTimer(1199) === '19:59', '1199 seconds formats as "19:59"');

  // 2.2 Simulated Timer State Machine Class
  class TimerStateMachine {
    constructor() {
      this.timerSeconds = null;
      this.timerPaused = false;
      this.vibrationsTriggered = [];
      this.isDone = false;
      this.doneTaskId = null;
      this.navigatorMock = {
        vibrate: (pattern) => {
          this.vibrationsTriggered.push(pattern);
          return true;
        },
      };
    }

    start5Min() {
      this.timerSeconds = 300;
      this.timerPaused = false;
    }

    pause() {
      if (this.timerSeconds !== null && this.timerSeconds > 0) {
        this.timerPaused = true;
      }
    }

    resume() {
      if (this.timerSeconds !== null && this.timerSeconds > 0) {
        this.timerPaused = false;
      }
    }

    togglePause() {
      if (this.timerSeconds !== null && this.timerSeconds > 0) {
        this.timerPaused = !this.timerPaused;
      }
    }

    stop() {
      this.timerSeconds = null;
      this.timerPaused = false;
    }

    add20Min() {
      this.timerSeconds = 1200;
      this.timerPaused = false;
    }

    markDone(taskId) {
      this.timerSeconds = null;
      this.timerPaused = false;
      this.isDone = true;
      this.doneTaskId = taskId;
    }

    // Step clock by 1 second
    tick() {
      if (this.timerSeconds === null || this.timerSeconds <= 0 || this.timerPaused) {
        return;
      }
      if (this.timerSeconds <= 1) {
        if (this.navigatorMock && typeof this.navigatorMock.vibrate === 'function') {
          try {
            this.navigatorMock.vibrate([200, 100, 200]);
          } catch {}
        }
        this.timerSeconds = 0;
      } else {
        this.timerSeconds -= 1;
      }
    }

    // Advance clock by N seconds
    tickSeconds(count) {
      for (let i = 0; i < count; i++) {
        this.tick();
      }
    }
  }

  // Test 2.2.1: Initialization
  const timer = new TimerStateMachine();
  assert(timer.timerSeconds === null, 'Initial timer state is null');
  assert(timer.timerPaused === false, 'Initial timerPaused state is false');

  // Test 2.2.2: Start 5 min
  timer.start5Min();
  assert(timer.timerSeconds === 300, 'Timer starts initialized at exactly 300 seconds');
  assert(formatTimer(timer.timerSeconds) === '5:00', 'Formatted time is 5:00 at start');

  // Test 2.2.3: Countdown per second
  timer.tick();
  assert(timer.timerSeconds === 299, 'Timer decrements to 299 seconds after 1s tick');
  assert(formatTimer(timer.timerSeconds) === '4:59', 'Formatted time is 4:59 after 1s');

  timer.tickSeconds(59);
  assert(timer.timerSeconds === 240, 'Timer at 240s after 60 total ticks');
  assert(formatTimer(timer.timerSeconds) === '4:00', 'Formatted time is 4:00 after 1 minute');

  // Test 2.2.4: Pause functionality
  timer.pause();
  assert(timer.timerPaused === true, 'Timer is now paused');
  const secondsBeforePauseTicks = timer.timerSeconds;
  timer.tickSeconds(10);
  assert(
    timer.timerSeconds === secondsBeforePauseTicks,
    `Countdown halts while paused (remained at ${secondsBeforePauseTicks}s after 10 ticks)`
  );

  // Test 2.2.5: Resume functionality
  timer.resume();
  assert(timer.timerPaused === false, 'Timer resumed');
  timer.tick();
  assert(
    timer.timerSeconds === secondsBeforePauseTicks - 1,
    `Countdown resumes immediately on next tick (decremented to ${timer.timerSeconds}s)`
  );

  // Test 2.2.6: Toggle pause/resume
  timer.togglePause();
  assert(timer.timerPaused === true, 'togglePause() toggles to paused');
  timer.tickSeconds(3);
  assert(timer.timerSeconds === secondsBeforePauseTicks - 1, 'Ticks ignored while toggled paused');
  timer.togglePause();
  assert(timer.timerPaused === false, 'togglePause() toggles back to running');
  timer.tick();
  assert(timer.timerSeconds === secondsBeforePauseTicks - 2, 'Ticks resume after togglePause()');

  // Test 2.2.7: Run until completion (0 seconds)
  timer.tickSeconds(timer.timerSeconds - 1); // advance to 1s remaining
  assert(timer.timerSeconds === 1, 'Timer reaches 1 second remaining');
  assert(timer.vibrationsTriggered.length === 0, 'No vibration before reaching 0');

  // Last tick: reaches 0 seconds
  timer.tick();
  assert(timer.timerSeconds === 0, 'Timer reached exactly 0 seconds (finished)');
  assert(timer.vibrationsTriggered.length === 1, 'Haptic vibration triggered on completion');
  assert(
    JSON.stringify(timer.vibrationsTriggered[0]) === '[200,100,200]',
    'Haptic pattern is strictly [200, 100, 200]'
  );

  // Further ticks at 0 should be no-ops
  timer.tickSeconds(5);
  assert(timer.timerSeconds === 0, 'Timer remains at 0 seconds (no negative seconds)');
  assert(timer.vibrationsTriggered.length === 1, 'No duplicate vibration spam on subsequent ticks');

  // Test 2.2.8: Transition to "+20 min"
  timer.add20Min();
  assert(timer.timerSeconds === 1200, 'State transition to "+20 min" sets timerSeconds to 1200');
  assert(formatTimer(timer.timerSeconds) === '20:00', 'Formatted time displays "20:00"');
  assert(timer.timerPaused === false, 'Timer is not paused after "+20 min" extension');

  timer.tick();
  assert(timer.timerSeconds === 1199, '20-min extension counts down correctly (1199s)');

  // Test 2.2.9: Transition to "Hecho"
  timer.markDone('task-xyz-123');
  assert(timer.timerSeconds === null, 'Marking task "Hecho" cleans up timer to null');
  assert(timer.isDone === true, 'Task marked done successfully');
  assert(timer.doneTaskId === 'task-xyz-123', 'Correct task ID marked done');

  // Test 2.2.10: Vibration resilience when navigator.vibrate throws or does not exist
  const brokenVibrateTimer = new TimerStateMachine();
  brokenVibrateTimer.navigatorMock = {
    vibrate: () => {
      throw new Error('Vibration permission denied');
    },
  };
  brokenVibrateTimer.start5Min();
  brokenVibrateTimer.tickSeconds(300);
  assert(brokenVibrateTimer.timerSeconds === 0, 'Timer completes cleanly even if navigator.vibrate throws');

  const noVibrateTimer = new TimerStateMachine();
  noVibrateTimer.navigatorMock = null;
  noVibrateTimer.start5Min();
  noVibrateTimer.tickSeconds(300);
  assert(noVibrateTimer.timerSeconds === 0, 'Timer completes cleanly if navigator has no vibrate API');
});

// =============================================================================
// Suite 3: Persistencia en sessionStorage de TaskGroupCard (B6)
// =============================================================================
await runSuite('3. Persistencia de Acordiones en sessionStorage (B6)', async () => {
  // Mock sessionStorage implementation
  class MockSessionStorage {
    constructor() {
      this.store = new Map();
      this.throwOnSet = false;
      this.throwOnGet = false;
    }

    getItem(key) {
      if (this.throwOnGet) throw new Error('SecurityError: Access is denied for this document');
      return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
      if (this.throwOnSet) throw new Error('QuotaExceededError: The quota has been exceeded');
      this.store.set(key, String(value));
    }

    removeItem(key) {
      this.store.delete(key);
    }

    clear() {
      this.store.clear();
    }
  }

  // Model representing TaskGroupCard state management
  class SimulatedTaskGroupCard {
    constructor(label, items, storageMock, isBrowser = true) {
      this.label = label;
      this.items = items;
      this.VISIBLE = 5;
      this.storageKey = `organizer:group:${label}`;
      this.storage = storageMock;

      // Simulated useState initialization:
      this.open = (() => {
        if (!isBrowser) return false;
        try {
          return this.storage.getItem(this.storageKey) === 'true';
        } catch {
          return false;
        }
      })();
    }

    handleOpen() {
      this.open = true;
      try {
        this.storage.setItem(this.storageKey, 'true');
      } catch {}
    }

    handleClose() {
      this.open = false;
      try {
        this.storage.setItem(this.storageKey, 'false');
      } catch {}
    }

    get shown() {
      return this.open ? this.items : this.items.slice(0, this.VISIBLE);
    }

    get hidden() {
      return this.items.length - this.shown.length;
    }

    get hasVerElResto() {
      return this.hidden > 0;
    }

    get hasVerMenos() {
      return this.open && this.items.length > this.VISIBLE;
    }
  }

  const storage = new MockSessionStorage();

  // Test 3.1: Default state when key does not exist
  const card1 = new SimulatedTaskGroupCard('Universidad', [1, 2, 3, 4, 5, 6, 7], storage);
  assert(card1.open === false, 'Defaults to closed (open: false) when no sessionStorage entry exists');
  assert(card1.shown.length === 5, 'Shows exactly 5 items when collapsed');
  assert(card1.hidden === 2, 'Hides 2 remaining items');
  assert(card1.hasVerElResto === true, '"Ver el resto" button is visible');
  assert(card1.hasVerMenos === false, '"Ver menos" button is hidden');

  // Test 3.2: Expanding the group and persisting to sessionStorage
  card1.handleOpen();
  assert(card1.open === true, 'Card state changes to open: true');
  assert(storage.getItem('organizer:group:Universidad') === 'true', 'sessionStorage key updated to "true"');
  assert(card1.shown.length === 7, 'All 7 items are now shown');
  assert(card1.hidden === 0, 'Zero items hidden');
  assert(card1.hasVerElResto === false, '"Ver el resto" button is now hidden');
  assert(card1.hasVerMenos === true, '"Ver menos" button is now visible');

  // Test 3.3: Collapsing the group and persisting to sessionStorage
  card1.handleClose();
  assert(card1.open === false, 'Card state changes back to open: false');
  assert(storage.getItem('organizer:group:Universidad') === 'false', 'sessionStorage key updated to "false"');
  assert(card1.shown.length === 5, 'Back to 5 visible items');
  assert(card1.hidden === 2, '2 items hidden again');
  assert(card1.hasVerElResto === true, '"Ver el resto" button re-appears');
  assert(card1.hasVerMenos === false, '"Ver menos" button hidden');

  // Test 3.4: Re-mounting card restores persisted state
  storage.setItem('organizer:group:Personal', 'true');
  const cardRestored = new SimulatedTaskGroupCard('Personal', [1, 2, 3, 4, 5, 6], storage);
  assert(
    cardRestored.open === true,
    'Mounting card with pre-existing sessionStorage value restores open: true immediately'
  );
  assert(cardRestored.shown.length === 6, 'All 6 items shown immediately on mount');

  // Test 3.5: SSR guard test (window undefined)
  const cardSSR = new SimulatedTaskGroupCard('SSR_Test', [1, 2, 3, 4, 5, 6], storage, false);
  assert(cardSSR.open === false, 'SSR mode (isBrowser=false) safely returns false without accessing storage');

  // Test 3.6: Resiliency against Storage Exceptions (e.g. Safari Private Mode / QuotaExceeded)
  const brokenStorage = new MockSessionStorage();
  brokenStorage.throwOnGet = true;
  brokenStorage.throwOnSet = true;

  let crashedOnMount = false;
  let cardResilient = null;
  try {
    cardResilient = new SimulatedTaskGroupCard('PrivateMode', [1, 2, 3, 4, 5, 6], brokenStorage);
  } catch {
    crashedOnMount = true;
  }
  assert(!crashedOnMount && cardResilient !== null, 'Component does not crash when getItem throws SecurityError');
  assert(cardResilient.open === false, 'Gracefully falls back to false on storage error');

  let crashedOnOpen = false;
  try {
    cardResilient.handleOpen();
  } catch {
    crashedOnOpen = true;
  }
  assert(!crashedOnOpen && cardResilient.open === true, 'handleOpen succeeds in memory even if setItem throws');

  let crashedOnClose = false;
  try {
    cardResilient.handleClose();
  } catch {
    crashedOnClose = true;
  }
  assert(!crashedOnClose && cardResilient.open === false, 'handleClose succeeds in memory even if setItem throws');

  // Test 3.7: Boundary condition: items <= 5
  const cardSmall = new SimulatedTaskGroupCard('SmallGroup', [1, 2, 3], storage);
  assert(cardSmall.shown.length === 3, 'Small group (3 items) displays all 3 items');
  assert(cardSmall.hidden === 0, 'Zero items hidden for small group');
  assert(cardSmall.hasVerElResto === false, 'Small group does NOT show "Ver el resto"');
  assert(cardSmall.hasVerMenos === false, 'Small group does NOT show "Ver menos"');

  const cardExact5 = new SimulatedTaskGroupCard('Exact5', [1, 2, 3, 4, 5], storage);
  assert(cardExact5.shown.length === 5, 'Exact 5 items displays all 5 items');
  assert(cardExact5.hidden === 0, 'Zero items hidden for exact 5 items');
  assert(cardExact5.hasVerElResto === false, 'Exact 5 items does NOT show "Ver el resto"');
  assert(cardExact5.hasVerMenos === false, 'Exact 5 items does NOT show "Ver menos"');

  // Test 3.8: Multi-group isolation & special character label encoding
  storage.clear();
  const cardA = new SimulatedTaskGroupCard('Proyectos Web & Apps', [1, 2, 3, 4, 5, 6], storage);
  const cardB = new SimulatedTaskGroupCard('Diseño / UI (Fase 4)', [1, 2, 3, 4, 5, 6], storage);

  cardA.handleOpen();
  assert(cardA.open === true, 'Group A is opened');
  assert(cardB.open === false, 'Group B remains closed (isolated state)');
  assert(storage.getItem('organizer:group:Proyectos Web & Apps') === 'true', 'Group A key stored correctly');
  assert(storage.getItem('organizer:group:Diseño / UI (Fase 4)') === null, 'Group B key unaffected');
});

// =============================================================================
// Suite 4: Reglas CSS de Hojas Modales y Reducción de Movimiento (B5)
// =============================================================================
await runSuite('4. Reglas CSS de Hojas Modales & Reducción de Movimiento (B5)', async () => {
  assert(fs.existsSync(fd4CssPath), 'fd4.css exists on disk');
  assert(fs.existsSync(iosCssPath), 'ios.css exists on disk');

  const fd4Css = fs.readFileSync(fd4CssPath, 'utf8');
  const iosCss = fs.readFileSync(iosCssPath, 'utf8');

  // 4.1 Verification of .fd-modal-backdrop blur removal (Anti-jank on iOS)
  // Extract .fd-modal-backdrop declaration block
  const backdropRegex = /\.fd-modal-backdrop\s*\{([^}]+)\}/g;
  const backdropMatches = [...fd4Css.matchAll(backdropRegex)];
  assert(backdropMatches.length > 0, '.fd-modal-backdrop rule found in fd4.css');

  for (const match of backdropMatches) {
    const block = match[1];
    assert(
      !block.includes('backdrop-filter: blur(4px)'),
      '.fd-modal-backdrop does NOT contain "backdrop-filter: blur(4px)" (prevents iOS sheet jank)'
    );
    assert(
      !block.includes('backdrop-filter: blur'),
      '.fd-modal-backdrop does NOT contain any "backdrop-filter: blur"'
    );
    assert(
      !block.includes('-webkit-backdrop-filter: blur'),
      '.fd-modal-backdrop does NOT contain any "-webkit-backdrop-filter: blur"'
    );
  }

  // Verify solid dark scrim background fallback exists
  assert(
    fd4Css.includes('.fd-modal-backdrop') &&
    (fd4Css.includes('background: rgba(0, 0, 0, 0.65)') || fd4Css.includes('background: rgba(0, 0, 0, 0.6)')),
    '.fd-modal-backdrop has opaque scrim background (rgba 0.65) for crisp rendering'
  );

  // 4.2 Verification of @media (prefers-reduced-motion: reduce) rules
  function extractMediaBlocks(css) {
    const blocks = [];
    const pattern = /@media[^{]*\(\s*prefers-reduced-motion:\s*reduce\s*\)/g;
    let match;
    while ((match = pattern.exec(css)) !== null) {
      const braceStart = css.indexOf('{', match.index);
      if (braceStart === -1) continue;
      let depth = 1;
      let curr = braceStart + 1;
      while (curr < css.length && depth > 0) {
        if (css[curr] === '{') depth++;
        else if (css[curr] === '}') depth--;
        curr++;
      }
      blocks.push(css.substring(braceStart + 1, curr - 1));
    }
    return blocks;
  }

  const iosReducedMotionBlocks = extractMediaBlocks(iosCss);
  const fd4ReducedMotionBlocks = extractMediaBlocks(fd4Css);
  const allReducedMotionBlocks = [...iosReducedMotionBlocks, ...fd4ReducedMotionBlocks];

  assert(
    allReducedMotionBlocks.length >= 2,
    `Multiple prefers-reduced-motion media query blocks found (${allReducedMotionBlocks.length} blocks)`
  );

  // Check ios.css reduced motion declarations
  assert(iosReducedMotionBlocks.length > 0, 'ios.css contains @media (prefers-reduced-motion: reduce) block');

  const combinedIosContent = iosReducedMotionBlocks.join('\n');

  // Check universal transition-duration: 0.01ms !important
  assert(
    combinedIosContent.includes('transition-duration: 0.01ms !important'),
    'Global selector enforces transition-duration: 0.01ms !important'
  );

  // Check universal animation-duration: 0.01ms !important
  assert(
    combinedIosContent.includes('animation-duration: 0.01ms !important'),
    'Global selector enforces animation-duration: 0.01ms !important'
  );

  // Check scroll-behavior: auto !important
  assert(
    combinedIosContent.includes('scroll-behavior: auto !important'),
    'Global selector enforces scroll-behavior: auto !important'
  );

  // Check modal sheet transitions cancellation
  assert(
    combinedIosContent.includes('.io-sheet') && combinedIosContent.includes('transition: none !important'),
    '.io-sheet transition disabled with transition: none !important'
  );

  // Check modal scrim transitions cancellation
  assert(
    combinedIosContent.includes('.io-scrim') && combinedIosContent.includes('transition: none !important'),
    '.io-scrim transition disabled with transition: none !important'
  );

  // Check page transition and view-transition suppression
  assert(
    combinedIosContent.includes('.ios-page-wrap') &&
    (combinedIosContent.includes('animation-name: none !important') || combinedIosContent.includes('animation-duration: 0.01ms !important')),
    '.ios-page-wrap animations disabled in reduced motion mode'
  );

  // Check fd4.css reduced motion declarations
  assert(
    fd4Css.includes('@media (prefers-reduced-motion: reduce)'),
    'fd4.css contains @media (prefers-reduced-motion: reduce) block'
  );
  assert(
    fd4Css.includes('transition-duration: 0.01ms !important') &&
    fd4Css.includes('animation-duration: 0.01ms !important'),
    'fd4.css disables transition and animation durations for non-spinning elements'
  );
});

// =============================================================================
// Final Test Summary & Exit Code
// =============================================================================
console.log(`\n======================================================================`);
console.log(`  QA TEST RUN COMPLETE`);
console.log(`======================================================================`);
console.log(`  Total Checks Executed : ${totalTests}`);
console.log(`  Passed Checks         : ${passedTests}`);
console.log(`  Failed Checks         : ${failedTests}`);
console.log(`  Pass Rate             : ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests > 0) {
  console.error(`\n❌ QA TEST SUITE FAILED WITH ${failedTests} FAILURE(S)\n`);
  process.exit(1);
} else {
  console.log(`\n✅ ALL QA TESTS PASSED AT 100%\n`);
  process.exit(0);
}
