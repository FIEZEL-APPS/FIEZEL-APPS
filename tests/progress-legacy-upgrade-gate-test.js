#!/usr/bin/env node
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
/**
 * tests/progress-legacy-upgrade-gate-test.js
 *
 * Permanent regression gate for existing/installed PWA upgrades & legacy synced English state:
 *   A1  normalizeHistoryRow & dayKey heal legacy restoredFromSync rows (missing `at`/`ok`)
 *       without throwing RangeError, while returning canonical rows untouched (===).
 *   A2  brainSyncApplyRebuild writes canonical `at`/`ok`/`skill`/`reviewKey`/`target` fields
 *       accepted by FiezelAttemptRecord.project().
 *   A3  reconcileStateAfterBankLoad hydrates missing grammar/vocab/reading mastery buckets
 *       from legacy synced history + BKT without overwriting existing local bucket stats.
 *   A4  FiezelOfflineVault stamps FIEZEL_PAGE_BUILD on encrypted banks and invalidates stale
 *       cached banks across PWA build updates.
 *   A5  PWA update & boot-tail cache hygiene contracts (sw.js, fiezel-update-prompt.js,
 *       fiezel-boot-tail.js) purge stale vaults/runtime entries and avoid premature reload
 *       while a new SW is still installing.
 *   B   Headless Chromium E2E (socket-free page.route, SKIP when Playwright unavailable):
 *       boots an upgraded old-PWA profile with legacy restoredFromSync English history +
 *       stale m025-745 IndexedDB vault + @ja sidecar, verifies full 9-card English Progres
 *       dashboard, hydrated Peta Belajar counts, all 4 tabs, and EN <-> JA course isolation.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const promptSrc = fs.readFileSync(path.join(ROOT, 'features/ui/fiezel-update-prompt.js'), 'utf8');
const bootTailSrc = fs.readFileSync(path.join(ROOT, 'features/ui/fiezel-boot-tail.js'), 'utf8');
const AttemptRecord = require(path.join(ROOT, 'features/brain/fiezel-attempt-record.js'));

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    passed++;
    console.log('ok - ' + name);
  } else {
    failed++;
    console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
  }
}

function extractFn(name, src = appSrc) {
  const start = src.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (start < 0) return '';
  let depth = 0;
  for (let j = src.indexOf('{', start); j < src.length; j++) {
    const ch = src[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// A1 & A2 & A3: Hermetic Node VM checks on app.js functions
// ---------------------------------------------------------------------------
async function runNodeChecks() {
  const fnNames = [
    'parseHistoryTimestamp',
    'normalizeHistoryRow',
    'dayKey',
    'brainSyncApplyRebuild',
    'reconcileStateAfterBankLoad'
  ];
  const extracted = fnNames.map(n => extractFn(n));
  check('A1 extract legacy-healing functions from app.js', extracted.every(Boolean),
    fnNames.filter((_, i) => !extracted[i]).join(', '));

  const now = 1762000000000;
  const ctx = vm.createContext({
    Date,
    Number,
    Math,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    JSON,
    console,
    LEVELS: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    MASTERY_THRESHOLD: 85,
    coreBrainCache: null,
    G: {
      present_simple: [['q1']],
      articles_a_an_the: [['q2']]
    },
    V: [
      { id: 'v_apple', word: 'apple', level: 'A1' },
      { id: 'v_journey', word: 'journey', level: 'A2' }
    ],
    R: [
      { id: 'r_morning', title: 'Morning Routine', level: 'A1', qs: [{}] }
    ],
    state: {
      history: [],
      vocab: {},
      grammar: {
        articles_a_an_the: { correct: 5, total: 5, streak: 5, mastery: 100, stability: 30, nextReview: now + 86400000, lastSeen: now }
      },
      reading: {},
      totalAnswered: 0,
      totalCorrect: 0,
      adaptiveReadyByLevel: {},
      adaptiveReady: false
    },
    brainSyncEnabled: () => true,
    bktWrite: () => {},
    bktRead: () => ({
      lessons: {
        present_simple: { pL: 0.78, attempts: 4, updatedAt: now - 3600000 }
      }
    }),
    misconceptionLedgerWrite: () => {},
    brainSyncRead: () => ({}),
    brainSyncWrite: () => {},
    contentLevelFor: (tp, key) => {
      if (tp === 'grammar' && (key === 'present_simple' || key === 'articles_a_an_the')) return 'A1';
      if (tp === 'vocab' && key === 'v_apple') return 'A1';
      if (tp === 'vocab' && key === 'v_journey') return 'A2';
      if (tp === 'reading' && key === 'r_morning') return 'A1';
      return 'A1';
    },
    memoryItemDifficulty: () => 5,
    scheduleNext: (b, ok, ms, conf, meta) => {
      b.lastSeen = meta.now;
      b.stability = ok ? 3 : 1;
      b.nextReview = meta.now + b.stability * 86400000;
    },
    diagnosticReadinessMap: () => ({ A1: true, A2: false, B1: false, B2: false, C1: false, C2: false }),
    getActiveLevel: () => 'A1',
    save: () => { ctx.__saves = (ctx.__saves || 0) + 1; }
  });
  ctx.self = ctx;
  vm.runInContext(extracted.join('\n'), ctx);

  // A1: Canonical row identity & legacy row healing + dayKey safety
  const canonical = { at: now, ok: true, type: 'grammar', skill: 'present_simple', target: 'present_simple', level: 'A1' };
  ctx.__canonIn = canonical;
  const sameRef = vm.runInContext('normalizeHistoryRow(__canonIn) === __canonIn', ctx);
  check('A1a canonical English history row is returned untouched (===)', sameRef === true);

  const legacyRow = {
    attemptId: 'att_legacy_1',
    timestamp: now - 7200000,
    correct: true,
    type: 'practice',
    lesson: 'present_simple',
    restoredFromSync: true
  };
  ctx.__legacyIn = legacyRow;
  const healed = vm.runInContext('normalizeHistoryRow(__legacyIn)', ctx);
  check('A1b legacy restoredFromSync row gains valid numeric `at`, boolean `ok`, `skill`, `reviewKey`, and `target`',
    healed && healed.at === now - 7200000 && healed.ok === true &&
    healed.skill === 'present_simple' && healed.reviewKey === 'present_simple' && healed.target === 'present_simple',
    JSON.stringify(healed));

  const dayKeySafe = vm.runInContext('[dayKey(undefined), dayKey(null), dayKey("bad-date"), dayKey(' + now + ').length]', ctx);
  check('A1c dayKey never throws RangeError on undefined/null/corrupt input and formats valid timestamps',
    dayKeySafe[0] === '' && dayKeySafe[1] === '' && dayKeySafe[2] === '' && dayKeySafe[3] === 10,
    JSON.stringify(dayKeySafe));

  // A2: brainSyncApplyRebuild writes canonical rows accepted by FiezelAttemptRecord.project
  ctx.__hasil = {
    bkt: null,
    ledger: null,
    stream: [
      { schema: 'fiezel-attempt-record-v1', attemptId: 'att_sync_g1', at: now - 50000, ok: true, type: 'grammar', skill: 'present_simple', lesson: 'present_simple' },
      { schema: 'fiezel-attempt-record-v1', attemptId: 'att_sync_v1', at: now - 40000, ok: true, type: 'vocab', item: 'v_apple' },
      { schema: 'fiezel-attempt-record-v1', attemptId: 'att_sync_r1', at: now - 30000, ok: false, type: 'reading', item: 'r_morning', skill: 'reading_detail' }
    ]
  };
  // Also pre-seed a legacy unhealed row already in state.history (simulating an old m025-750 device)
  ctx.state.history = [
    { attemptId: 'att_old_1', timestamp: now - 90000, correct: true, type: 'practice', lesson: 'present_simple', restoredFromSync: true }
  ];
  const applied = vm.runInContext('brainSyncApplyRebuild(__hasil)', ctx);
  check('A2a brainSyncApplyRebuild succeeds and normalizes both existing legacy rows and newly synced rows',
    applied === true && ctx.state.history.length === 4 && ctx.state.history.every(r => Number.isFinite(r.at) && r.at > 0 && typeof r.ok === 'boolean'),
    JSON.stringify(ctx.state.history));

  const projected = ctx.state.history.filter(r => r.attemptId !== 'att_old_1').map(r => AttemptRecord.project(r));
  check('A2b rows written by brainSyncApplyRebuild round-trip cleanly through FiezelAttemptRecord.project()',
    projected.length === 3 && projected.every(Boolean),
    JSON.stringify(projected));

  // A3: reconcileStateAfterBankLoad hydrated missing buckets and preserved existing bucket
  check('A3a reconcileStateAfterBankLoad hydrated missing grammar, vocab, and reading mastery buckets',
    ctx.state.grammar.present_simple?.total === 2 &&
    ctx.state.vocab.v_apple?.total === 1 &&
    ctx.state.reading.r_morning?.total === 1,
    JSON.stringify({ g: ctx.state.grammar.present_simple, v: ctx.state.vocab.v_apple, r: ctx.state.reading.r_morning }));

  check('A3b reconcileStateAfterBankLoad never overwrote pre-existing articles_a_an_the bucket stats',
    ctx.state.grammar.articles_a_an_the?.total === 5 && ctx.state.grammar.articles_a_an_the?.mastery === 100,
    JSON.stringify(ctx.state.grammar.articles_a_an_the));

  // A4: FiezelOfflineVault build-stamped cache invalidation
  const vaultCode = fs.readFileSync(path.join(ROOT, 'features/security/fiezel-offline-vault.js'), 'utf8');
  const vaultSandbox = vm.createContext({
    globalThis: null,
    self: null,
    crypto: globalThis.crypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    Promise,
    Date,
    Math,
    String,
    JSON,
    Buffer,
    require,
    console,
    FIEZEL_PAGE_BUILD: 'm025-750'
  });
  vaultSandbox.globalThis = vaultSandbox;
  vaultSandbox.self = vaultSandbox;
  vm.runInContext(vaultCode, vaultSandbox);
  const Vault = vaultSandbox.FiezelOfflineVault;
  await Vault.saveBank('vocabulary-master.json', [{ id: 'v1', word: 'hello' }]);
  const hitSameBuild = await Vault.getBank('vocabulary-master.json');
  vaultSandbox.FIEZEL_PAGE_BUILD = 'm025-751';
  const missAfterUpgrade = await Vault.getBank('vocabulary-master.json');
  await Vault.saveBank('vocabulary-master.json', [{ id: 'v1', word: 'hello' }, { id: 'v2', word: 'world' }]);
  const hitNewBuild = await Vault.getBank('vocabulary-master.json');
  check('A4 FiezelOfflineVault serves matching build bank, invalidates stale m025-750 bank on upgrade to m025-751, and caches fresh m025-751 bank',
    Array.isArray(hitSameBuild) && hitSameBuild.length === 1 &&
    missAfterUpgrade === null &&
    Array.isArray(hitNewBuild) && hitNewBuild.length === 2,
    JSON.stringify({ hitSameBuild, missAfterUpgrade, hitNewBuild }));

  // A5: Static contracts on sw.js, fiezel-update-prompt.js, fiezel-boot-tail.js
  check('A5a sw.js treats fz_upd, __fz_fresh, and fz_healed as network-first update navigations and stores clean URL keys',
    /searchParams\.has\('fz_upd'\)/.test(swSrc) &&
    /searchParams\.has\('fz_healed'\)/.test(swSrc) &&
    /isSubHtml\|\|isUpdateNav/.test(swSrc));
  check('A5b fiezel-update-prompt.js clears FiezelOfflineVault during purgeStaleCaches and waits for installing worker before skipping waiting',
    /FiezelOfflineVault\.clearVault/.test(promptSrc) &&
    /w\.state === 'installing'/.test(promptSrc) &&
    /armActivationCeiling/.test(promptSrc));
  check('A5c fiezel-boot-tail.js sweeps stale runtime entries + FiezelOfflineVault.purgeStaleBuilds on build change and heals activeNum < pageNum split-brain',
    /fz_boot_clean_build/.test(bootTailSrc) &&
    /FiezelOfflineVault\.purgeStaleBuilds/.test(bootTailSrc) &&
    /activeNum < pageNum/.test(bootTailSrc));
}

// ---------------------------------------------------------------------------
// B: Headless Chromium E2E via socket-free page.route()
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg'
};

async function runBrowserChecks() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (_) {
    console.log('SKIP - Bagian B Chromium (paket playwright tidak tersedia)');
    return;
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (_) {
    console.log('SKIP - Bagian B Chromium (binari Chromium tidak terpasang)');
    return;
  }

  try {
    const ORIGIN = 'https://fiezel.local';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push('PAGEERROR: ' + (err && err.message ? err.message : String(err)));
    });

    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' });
      const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const target = path.resolve(ROOT, rel);
      if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        return route.fulfill({ status: 404, body: '' });
      }
      return route.fulfill({
        status: 200,
        contentType: MIME[path.extname(target)] || 'application/octet-stream',
        body: fs.readFileSync(target)
      });
    });

    // Seed an existing/upgraded PWA profile:
    // - Account UUID `acc_legacy_pwa`
    // - Base English key `fiezel-v5-state:acc_legacy_pwa` has `preferences.targetLang: 'ja'` (desynced!)
    //   while `fz_target_course` is `'en'`, AND English `history` contains legacy `restoredFromSync: true`
    //   rows WITHOUT `at` or `ok`, empty `grammar: {}` / `vocab: {}`, and null entries in `confidenceHistory`!
    // - `@ja` key has separate Japanese progress.
    // - IndexedDB `fiezel-vault-v1` has a stale `m025-745` record for `reading-bank.json`.
    await page.addInitScript(() => {
      try {
        if (sessionStorage.getItem('__seeded_legacy_pwa') === '1') return;
        sessionStorage.setItem('__seeded_legacy_pwa', '1');
        localStorage.clear();
        const now = Date.now();
        const uuid = 'acc_legacy_pwa';
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: now - 86400000 * 20, via: 'finish', locale: 'id', name: 'Fitra' }));
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: now - 86400000 * 20, role: 'murid', via: 'google', accountId: uuid }));
        localStorage.setItem('fz_last_account', JSON.stringify({ uuid }));
        localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
        localStorage.setItem('fiezel-puter-auth-skipped', '1');
        localStorage.setItem('fiezel-tour-v1', '1');
        localStorage.setItem('fiezel-last-seen-build-v1', 'm025-750');
        localStorage.setItem('fz_target_course', 'en');

        const englishBaseState = {
          ownerUuid: uuid,
          userName: 'Fitra',
          level: 1,
          placementDone: true,
          adaptiveReady: true,
          streak: 5,
          totalAnswered: 6,
          totalCorrect: 0,
          gems: { balance: 240 },
          vocab: {},
          grammar: {},
          reading: {},
          confidenceHistory: [null, { level: 'A1', confidence: 2, ok: true }],
          preferences: {
            learnerLocale: 'id',
            targetLang: 'ja', // Deliberate boot desync vs fz_target_course='en'
            activeLevel: 'A1',
            progressSyncConsent: { at: now - 86400000 * 10, by: 'murid-login' }
          },
          history: [
            { attemptId: 'sync_1', timestamp: now - 86400000 * 2, correct: true, type: 'practice', lesson: 'present_simple_basics', restoredFromSync: true },
            { attemptId: 'sync_2', timestamp: now - 86400000 * 2 + 5000, correct: true, type: 'practice', lesson: 'present_simple_basics', restoredFromSync: true },
            { attemptId: 'sync_3', timestamp: now - 86400000 * 1, correct: false, type: 'practice', lesson: 'present_simple_basics', restoredFromSync: true },
            { attemptId: 'sync_4', timestamp: now - 3600000 * 5, correct: true, type: 'grammar', lesson: 'be_subject_agreement', restoredFromSync: true },
            { attemptId: 'sync_5', timestamp: now - 3600000 * 4, correct: true, type: 'grammar', lesson: 'be_subject_agreement', restoredFromSync: true },
            { attemptId: 'sync_6', timestamp: now - 3600000 * 2, correct: true, type: 'grammar', lesson: 'present_simple_basics', restoredFromSync: true }
          ]
        };
        localStorage.setItem('fiezel-v5-state:' + uuid, JSON.stringify(englishBaseState));

        const japaneseSideState = {
          level: 1,
          placementDone: true,
          adaptiveReady: true,
          totalAnswered: 2,
          totalCorrect: 2,
          vocab: {},
          grammar: {
            wa_desu_statement: { correct: 2, total: 2, streak: 2, mastery: 40, stability: 2, nextReview: now + 86400000, lastSeen: now - 3600000 }
          },
          reading: {},
          history: [
            { attemptId: 'ja_1', at: now - 7200000, ok: true, type: 'grammar', skill: 'wa_desu_statement', reviewKey: 'wa_desu_statement', target: 'wa_desu_statement', level: 'A1' },
            { attemptId: 'ja_2', at: now - 3600000, ok: true, type: 'grammar', skill: 'wa_desu_statement', reviewKey: 'wa_desu_statement', target: 'wa_desu_statement', level: 'A1' }
          ]
        };
        localStorage.setItem('fiezel-v5-state:' + uuid + '@ja', JSON.stringify(japaneseSideState));

        // Seed stale m025-745 poison record into IndexedDB fiezel-vault-v1
        const openReq = indexedDB.open('fiezel-vault-v1', 1);
        openReq.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('encrypted_banks')) {
            db.createObjectStore('encrypted_banks', { keyPath: 'bankKey' });
          }
        };
        openReq.onsuccess = function (e) {
          try {
            const db = e.target.result;
            const tx = db.transaction('encrypted_banks', 'readwrite');
            tx.objectStore('encrypted_banks').put({
              bankKey: 'reading-bank.json',
              build: 'm025-745',
              envelope: { _fz_vault: 1, _sig: 'FZV1', iv: 'AAAA', data: 'BBBB' },
              savedAt: now - 86400000 * 10
            });
          } catch (_) {}
        };
      } catch (_) {}
    });

    await page.goto(ORIGIN + '/?fz_upd=1762000000', { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => typeof window.go === 'function' && Array.isArray(window.__getFiezelState?.()?.history) && (document.getElementById('app')?.innerHTML || '').length > 50, null, { timeout: 45000 });
    await page.waitForTimeout(800);

    const enResult = await page.evaluate(async () => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.querySelector('.fiezel-ob')?.remove();
      window.go('progress');
      await new Promise(r => setTimeout(r, 200));

      const countOverviewCards = document.querySelectorAll('#app .card, #app .core-panel').length;
      const hasLevelCard = !!document.querySelector('#app [data-testid="progress-level-card"]');
      const hasWeekCard = !!document.querySelector('#app [data-testid="progress-week-card"]');
      const tabCount = document.querySelectorAll('#app .progress-tab').length;
      const overviewText = document.getElementById('app')?.innerText || '';

      // Switch across all 4 tabs to verify zero sub-tab crashes
      const tabIds = ['readiness', 'analysis', 'adaptive', 'overview'];
      const tabSnapshots = {};
      for (const id of tabIds) {
        if (window.__getFiezelState?.()?.view !== 'progress') window.go('progress');
        window.switchProgressTab(id);
        await new Promise(r => setTimeout(r, 60));
        tabSnapshots[id] = document.querySelectorAll('#progressTabPane .card, #progressTabPane .core-panel').length;
      }

      const st = window.__getFiezelState();
      // Wait briefly if async WebCrypto AES-GCM saveBank is still committing to IndexedDB
      const readVaultBuild = () => new Promise(resolve => {
        try {
          const req = indexedDB.open('fiezel-vault-v1', 1);
          req.onsuccess = e => {
            try {
              const tx = e.target.result.transaction('encrypted_banks', 'readonly');
              const g = tx.objectStore('encrypted_banks').get('reading-bank.json');
              g.onsuccess = ev => resolve(ev.target.result ? ev.target.result.build : 'missing');
              g.onerror = () => resolve('err');
            } catch (_) { resolve('no-store'); }
          };
          req.onerror = () => resolve('open-err');
        } catch (_) { resolve('exc'); }
      });
      let vaultBuild = await readVaultBuild();
      for (let retry = 0; retry < 15 && (vaultBuild === 'missing' || vaultBuild === 'm025-745'); retry++) {
        await new Promise(r => setTimeout(r, 150));
        vaultBuild = await readVaultBuild();
      }

      return {
        cleanSearch: window.location.search,
        activeLang: window.activeTargetLang?.(),
        historyLen: st.history?.length || 0,
        allHaveAt: (st.history || []).every(h => Number.isFinite(h.at) && h.at > 0 && typeof h.ok === 'boolean'),
        hydratedGrammarKeys: Object.keys(st.grammar || {}).filter(k => st.grammar[k]?.total > 0),
        totalCorrect: st.totalCorrect,
        countOverviewCards,
        hasLevelCard,
        hasWeekCard,
        tabCount,
        tabSnapshots,
        vaultBuild,
        pageBuild: window.FIEZEL_PAGE_BUILD,
        hasKemajuanMateri: /Kemajuan materi|Peta Belajar/i.test(overviewText)
      };
    });

    const recoveryLogs = consoleErrors.filter(t => /progress render recovery/i.test(t));
    check('B1 zero [progress render recovery] crash on upgraded English PWA profile',
      recoveryLogs.length === 0, JSON.stringify(consoleErrors));
    check('B2 boot targetCourse alignment loaded true 6-attempt English history (not 2-attempt @ja) and healed `at`/`ok`/`totalCorrect`',
      enResult.activeLang === 'en' && enResult.historyLen === 6 && enResult.allHaveAt && enResult.totalCorrect === 5,
      JSON.stringify(enResult));
    check('B3 English Progres renders full overview dashboard (LEVEL KAMU, Minggu ini, 4 tabs, Kemajuan materi, >=7 cards)',
      enResult.hasLevelCard && enResult.hasWeekCard && enResult.tabCount === 4 && enResult.hasKemajuanMateri && enResult.countOverviewCards >= 7,
      JSON.stringify(enResult));
    check('B4 reconcileStateAfterBankLoad hydrated English grammar mastery buckets from legacy synced history',
      enResult.hydratedGrammarKeys.includes('present_simple_basics') && enResult.hydratedGrammarKeys.includes('be_subject_agreement'),
      JSON.stringify(enResult.hydratedGrammarKeys));
    check('B5 all 4 English Progres tabs (overview, readiness, analysis, adaptive) render cards cleanly',
      enResult.tabSnapshots.overview >= 5 && enResult.tabSnapshots.readiness >= 3 && enResult.tabSnapshots.analysis >= 4 && enResult.tabSnapshots.adaptive >= 3,
      JSON.stringify(enResult.tabSnapshots));
    check('B6 stale m025-745 IndexedDB bank record was invalidated & replaced with current FIEZEL_PAGE_BUILD, and ?fz_upd query was cleaned',
      enResult.vaultBuild === enResult.pageBuild && enResult.cleanSearch === '',
      JSON.stringify({ vaultBuild: enResult.vaultBuild, pageBuild: enResult.pageBuild, cleanSearch: enResult.cleanSearch }));

    // Switch to Japanese and back to English
    const switchResult = await page.evaluate(async () => {
      await window.setTargetLangPreference('ja');
      window.go('progress');
      await new Promise(r => setTimeout(r, 200));
      const jaCards = document.querySelectorAll('#app .card, #app .core-panel').length;
      const jaHist = window.__getFiezelState()?.history?.length || 0;

      await window.setTargetLangPreference('en');
      window.go('progress');
      await new Promise(r => setTimeout(r, 200));
      const enCardsAfter = document.querySelectorAll('#app .card, #app .core-panel').length;
      const enHistAfter = window.__getFiezelState()?.history?.length || 0;
      return { jaCards, jaHist, enCardsAfter, enHistAfter };
    });
    check('B7 switching EN -> JA -> EN preserves both courses independently and renders full Progres cards on both',
      switchResult.jaHist === 2 && switchResult.jaCards >= 7 && switchResult.enHistAfter === 6 && switchResult.enCardsAfter >= 7,
      JSON.stringify(switchResult));

    await page.close();
  } finally {
    await browser.close();
  }
}

(async () => {
  await runNodeChecks();
  await runBrowserChecks();
  console.log(`\nprogress-legacy-upgrade-gate-test: ${passed}/${passed + failed} PASS`);
  if (failed > 0) process.exitCode = 1;
})().catch(err => {
  console.error('FAIL - unhandled error in progress-legacy-upgrade-gate-test:', err);
  process.exitCode = 1;
});
