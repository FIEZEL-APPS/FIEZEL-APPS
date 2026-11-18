#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const pw = require(require.resolve('playwright', { paths: [ROOT, path.resolve(ROOT, '..', 'fiezel-apps'), process.cwd()] }));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

function createSqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  const migDir = path.join(ROOT, 'workers', 'api', 'migrations');
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    try {
      sqlite.exec(sql);
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${e.message}`);
    }
  }
  const normalizeArg = (v) => (v === undefined ? null : v);
  function makeStmt(sql) {
    let bound = [];
    const stmt = {
      bind(...args) {
        bound = args.map(normalizeArg);
        return stmt;
      },
      async first() {
        const s = sqlite.prepare(sql);
        const row = s.get(...bound);
        return row === undefined ? null : row;
      },
      async all() {
        const s = sqlite.prepare(sql);
        const results = s.all(...bound);
        return { results: results || [], success: true };
      },
      async run() {
        const s = sqlite.prepare(sql);
        const info = s.run(...bound);
        return { success: true, meta: { changes: Number(info?.changes) || 0 } };
      }
    };
    return stmt;
  }
  return {
    sqlite,
    prepare(sql) {
      return makeStmt(sql);
    },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    }
  };
}

function createStaticServer() {
  return http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || '/').split('?')[0]);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
      res.end(buf);
    });
  });
}

function parseSetCookiePair(setCookieStr) {
  const firstPart = String(setCookieStr || '').split(';')[0];
  const eq = firstPart.indexOf('=');
  if (eq < 1) return null;
  const name = firstPart.slice(0, eq).trim();
  const value = firstPart.slice(eq + 1).trim();
  const expired = /max-age=0/i.test(setCookieStr) || value === '';
  return { name, value, expired };
}

async function attachApiBridge(context, worker, env, appOrigin) {
  const jar = new Map();
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    if (url.startsWith(appOrigin) || url.startsWith('data:') || url.startsWith('blob:')) {
      await route.continue();
      return;
    }
    if (!url.startsWith('https://api.fiezel.my.id/')) {
      await route.abort().catch(() => {});
      return;
    }
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': appOrigin,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization, x-requested-with, accept'
        }
      });
      return;
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers())) {
      if (k.toLowerCase() !== 'cookie') headers.set(k, v);
    }
    headers.set('Origin', appOrigin);
    if (jar.size > 0) {
      headers.set('Cookie', [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
    }
    const postData = req.postData();
    const workerReq = new Request(url, {
      method: req.method(),
      headers,
      body: ['GET', 'HEAD'].includes(req.method()) ? undefined : postData
    });
    const workerRes = await worker.fetch(workerReq, env, { waitUntil() {} });
    const resHeaders = {};
    workerRes.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'set-cookie') resHeaders[k] = v;
    });
    const setCookies = typeof workerRes.headers.getSetCookie === 'function'
      ? workerRes.headers.getSetCookie()
      : (workerRes.headers.get('set-cookie') ? [workerRes.headers.get('set-cookie')] : []);
    for (const sc of setCookies) {
      const parsed = parseSetCookiePair(sc);
      if (!parsed) continue;
      if (parsed.expired) jar.delete(parsed.name);
      else jar.set(parsed.name, parsed.value);
    }
    const bodyBuf = Buffer.from(await workerRes.arrayBuffer());
    const pathname = new URL(url).pathname;
    if (pathname.startsWith('/api/brain/') || pathname.startsWith('/api/account/') || pathname.startsWith('/api/auth/')) {
      console.log(`  [API ${req.method()} ${pathname}] -> ${workerRes.status} (cookies=${jar.size})`);
    }
    await route.fulfill({
      status: workerRes.status,
      headers: {
        ...resHeaders,
        'access-control-allow-origin': appOrigin,
        'access-control-allow-credentials': 'true'
      },
      body: bodyBuf
    });
  });
  return jar;
}

async function waitForSplashAndAuthGate(page) {
  try {
    await page.waitForFunction(() => {
      const cont = document.querySelector('[data-testid="auth-continue"]');
      const go = document.querySelector('[data-testid="auth-submit"]');
      const splash = document.getElementById('fiezelBootSplash');
      const splashGone = !splash || splash.style.display === 'none' || splash.classList.contains('hidden') || parseFloat(getComputedStyle(splash).opacity) === 0;
      return Boolean(splashGone && (cont || go));
    }, { timeout: 20000 });
    for (let step = 0; step < 3; step++) {
      const handleVis = await page.locator('input[name="handle"]').first().isVisible().catch(() => false);
      const goVis = await page.locator('[data-testid="auth-submit"]').first().isVisible().catch(() => false);
      if (handleVis && goVis) break;
      const cont = page.locator('[data-testid="auth-continue"]').first();
      if (await cont.count() > 0 && await cont.isVisible().catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(250);
      } else {
        await page.waitForTimeout(200);
      }
    }
    await page.waitForFunction(() => {
      const inp = document.querySelector('input[name="handle"]');
      const go = document.querySelector('[data-testid="auth-submit"]');
      return Boolean(inp && go);
    }, { timeout: 15000 });
  } catch (e) {
    const diag = await page.evaluate(() => ({
      url: location.href,
      splashDisplay: document.getElementById('fiezelBootSplash')?.style?.display,
      splashClass: document.getElementById('fiezelBootSplash')?.className,
      authGo: Boolean(document.querySelector('[data-testid="auth-submit"]')),
      authScreen: Boolean(window.FiezelAuthScreen),
      hasLiveState: Boolean(window.__getFiezelState?.()),
      bodyText: document.body?.innerText?.slice(0, 300)
    })).catch(() => ({}));
    console.error('waitForSplashAndAuthGate DIAG:', diag);
    throw e;
  }
}

async function submitAuthForm(page, { mode, handle, password }) {
  try {
    const roleBtn = page.locator('[data-testid="auth-role-murid"]').first();
    if (await roleBtn.count() > 0 && await roleBtn.isVisible().catch(() => false)) {
      const cls = (await roleBtn.getAttribute('class').catch(() => '')) || '';
      if (!cls.includes('is-on')) await roleBtn.click();
    }
    const submitBtn = page.locator('[data-testid="auth-submit"]').first();
    const curSubmitText = ((await submitBtn.innerText().catch(() => '')) || '').trim().toLowerCase();
    const needSwitch = (mode === 'masuk' && !curSubmitText.includes('masuk')) || (mode === 'daftar' && !curSubmitText.includes('daftar'));
    if (needSwitch) {
      await page.locator('[data-testid="auth-switch"]').first().click();
    }
    await page.locator('input[name="handle"]').first().fill(handle);
    await page.locator('input[name="password"]').first().fill(password);
    const pw2 = page.locator('input[name="password2"]').first();
    if (await pw2.count() > 0 && await pw2.isVisible().catch(() => false)) {
      await pw2.fill(password);
    }
    await submitBtn.click();
  } catch (e) {
    const domInfo = await page.evaluate(() => ({
      testIds: [...document.querySelectorAll('[data-testid]')].map((el) => ({ id: el.getAttribute('data-testid'), tag: el.tagName, cls: el.className, text: el.textContent?.trim().slice(0, 40) })),
      inputs: [...document.querySelectorAll('input')].map((el) => ({ name: el.name, type: el.type, visible: el.offsetParent !== null }))
    })).catch(() => ({}));
    console.error('submitAuthForm DIAG:', JSON.stringify(domInfo, null, 2));
    throw e;
  }
}

async function run() {
  const workerMod = await import(pathToFileURL(path.join(ROOT, 'workers/api/index.js')).href);
  const worker = workerMod.default;
  const db = createSqliteD1();
  const staticServer = createStaticServer();
  await new Promise((r) => staticServer.listen(0, '127.0.0.1', r));
  const port = staticServer.address().port;
  const appOrigin = `http://127.0.0.1:${port}`;
  const env = {
    CORE_DB: db,
    SESSION_HMAC_KEY_CURRENT: 'e2e-playwright-cloud-sync-hmac-secret-key-min-32b!!',
    ALLOWED_ORIGINS: `${appOrigin},https://fiezel.my.id`,
    ENVIRONMENT: 'test'
  };

  let browser = null;
  try {
    browser = await pw.chromium.launch({ headless: true });

    // ==================== DEVICE A: Register & Build Progress ====================
    const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await attachApiBridge(ctxA, worker, env, appOrigin);
    const pageA = await ctxA.newPage();
    pageA.on('pageerror', (err) => console.error('[pageA error]', err.message));
    pageA.on('requestfailed', (req) => console.error('[pageA reqfailed]', req.url(), req.failure()?.errorText));

    await pageA.goto(`${appOrigin}/?fz_real_auth=1`, { waitUntil: 'domcontentloaded' });
    await waitForSplashAndAuthGate(pageA);

    // Pastikan tab Daftar aktif & Daftar akun `alice_pro`
    await submitAuthForm(pageA, { mode: 'daftar', handle: 'alice_pro', password: 'rahasia123' });

    // Tunggu sampai gerbang masuk tutup & aplikasi atau onboarding tampil
    await pageA.waitForFunction(() => !document.querySelector('[data-testid="auth-submit"]'), { timeout: 15000 });
    await pageA.waitForTimeout(400);

    // Apabila onboarding baru muncul, lewati/tandai selesai dengan nama 'Alice Nusantara' -> masuk ke Home
    await pageA.evaluate(async () => {
      if (window.FiezelOnboarding?.markCompleted) {
        window.FiezelOnboarding.markCompleted(window, {
          at: Date.now(), via: 'onboarding', name: 'Alice Nusantara', locale: 'id', role: 'murid', course: 'en'
        });
      }
      document.querySelectorAll('.fiezel-ob,.fz-tour,#fzRitual,#modal').forEach((n) => n.remove());
      const s = window.__getFiezelState();
      s.userName = 'Alice Nusantara';
      s.level = 3;
      s.placementDone = true;
      s.gems = window.FiezelGems.gemsEarn(s.gems, 140, 'study_milestone', Date.now(), 'e2e-gem-1', 'B1');
      s.gems = window.FiezelGems.gemsSpend(s.gems, 20, 'ai_explain', Date.now() + 10, 'e2e-gem-2').gems;
      s.grammar.present_perfect = { correct: 6, total: 6, mastery: 95, lastSeen: Date.now(), nextReview: Date.now() + 86400000, stability: 4 };
      for (let d = 0; d < 2; d++) {
        for (let i = 0; i < 6; i++) {
          s.history.push({ attemptId: `pw-en-${d}-${i}`, at: Date.now() - d * 86400000 - i * 1000, ok: true, type: 'grammar', skill: 'present_perfect', target: 'have been' });
        }
      }
      s.totalAnswered = s.history.length;
      s.totalCorrect = s.history.length;
      window.checkDailyGemRewards?.(true);
      window.bktRecord({ skill: 'present_perfect' }, true, 1);
      window.__fiezelAudit.setGoalProfile('general');
      window.__fiezelAudit.saveFlushWrite();

      // Belajar Jepang juga
      window.switchTargetLangStorage('ja');
      const sJa = window.__getFiezelState();
      sJa.level = 2;
      sJa.placementDone = true;
      sJa.vocab.sakura = { correct: 5, total: 5, mastery: 93, lastSeen: Date.now(), nextReview: Date.now() + 86400000, stability: 3 };
      sJa.history.push({ attemptId: 'pw-ja-1', at: Date.now(), ok: true, type: 'vocab', skill: 'sakura', target: 'sakura' });
      sJa.totalAnswered = 1;
      sJa.totalCorrect = 1;
      window.bktRecord({ skill: 'ja-vocab-sakura' }, true, 1);
      window.__fiezelAudit.saveFlushWrite();
      window.switchTargetLangStorage('en');

      await window.__fiezelAudit.awaitAccountCloudSyncReady(2000);
      await window.__fiezelAudit.accountCloudStateSync({ pullFirst: false });
    });

    const deviceASnap = await pageA.evaluate(() => {
      const s = window.__getFiezelState();
      return {
        userName: s.userName,
        gemBalance: s.gems?.balance,
        level: s.level,
        streak: s.streak,
        grammarMastery: s.grammar?.present_perfect?.mastery
      };
    });
    assert.strictEqual(deviceASnap.userName, 'Alice Nusantara');
    assert.ok(deviceASnap.gemBalance >= 120, `HP A harus punya >= 120 GEM (dapat ${deviceASnap.gemBalance})`);
    assert.strictEqual(deviceASnap.level, 3);
    assert.strictEqual(deviceASnap.grammarMastery, 95);
    console.log('E2E PASS [Device A]: state tersimpan ke SQLite D1:', deviceASnap);

    // Reload Device A (?fz_real_auth=1) -> wajib tetap login & data tetap utuh
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await pageA.waitForTimeout(800);
    const deviceAAfterReload = await pageA.evaluate(() => {
      const s = window.__getFiezelState();
      return {
        hasAuthGate: Boolean(document.querySelector('[data-testid="auth-submit"]')),
        userName: s.userName,
        gemBalance: s.gems?.balance,
        level: s.level
      };
    });
    assert.strictEqual(deviceAAfterReload.hasAuthGate, false, 'Device A reload tidak boleh memunculkan layar masuk');
    assert.strictEqual(deviceAAfterReload.gemBalance, deviceASnap.gemBalance);
    assert.strictEqual(deviceAAfterReload.level, 3);
    console.log('E2E PASS [Device A reload]: state tetap utuh pasca-reload.');
    await ctxA.close();

    // ==================== DEVICE B: Brand-new Chromium Context (0 localStorage) ====================
    const ctxB = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await attachApiBridge(ctxB, worker, env, appOrigin);
    const pageB = await ctxB.newPage();

    await pageB.goto(`${appOrigin}/?fz_real_auth=1`, { waitUntil: 'domcontentloaded' });
    await waitForSplashAndAuthGate(pageB);

    // Masuk sebagai alice_pro (bukan daftar baru!)
    await submitAuthForm(pageB, { mode: 'masuk', handle: 'alice_pro', password: 'rahasia123' });

    // Tunggu auth gate hilang & UI beranda / topbar tampil (TANPA terblokir onboarding 6 langkah!)
    await pageB.waitForFunction(() => !document.querySelector('[data-testid="auth-submit"]') && Boolean(window.__getFiezelState?.()), { timeout: 15000 });
    await pageB.waitForTimeout(700);

    const deviceBState = await pageB.evaluate(() => {
      const s = window.__getFiezelState();
      const topGems = document.getElementById('topbarXpVal')?.textContent || '';
      const hasOb = Boolean(document.querySelector('.fiezel-ob'));
      window.switchTargetLangStorage('ja');
      const sJa = window.__getFiezelState();
      const jaBkt = window.__fiezelAudit.bktRead();
      window.switchTargetLangStorage('en');
      return {
        hasOb,
        topGems,
        userName: s.userName,
        gemBalance: s.gems?.balance,
        spentTotal: s.gems?.spentTotal,
        level: s.level,
        streak: s.streak,
        grammarMastery: s.grammar?.present_perfect?.mastery,
        jaLevel: sJa.level,
        jaSakura: sJa.vocab?.sakura?.mastery,
        hasJaBkt: Boolean(jaBkt?.lessons?.['ja-vocab-sakura'])
      };
    });

    assert.strictEqual(deviceBState.hasOb, false, 'Murid lama login di HP B tidak boleh dipaksa onboarding ulang');
    assert.strictEqual(deviceBState.userName, 'Alice Nusantara');
    assert.strictEqual(deviceBState.gemBalance, deviceASnap.gemBalance, 'GEM HP B harus persis sama dengan HP A (tanpa bonus duplikat atau reset 120)');
    assert.strictEqual(deviceBState.spentTotal, 20);
    assert.strictEqual(deviceBState.level, 3);
    assert.ok(deviceBState.streak >= 1, 'Streak HP B harus pulih');
    assert.strictEqual(deviceBState.grammarMastery, 95);
    assert.strictEqual(deviceBState.jaLevel, 2);
    assert.strictEqual(deviceBState.jaSakura, 93);
    assert.strictEqual(deviceBState.hasJaBkt, true);
    console.log('E2E PASS [Device B]: seluruh progres, GEM, multi-bahasa, dan BKT langsung pulih sesudah login!', deviceBState);

    // Reload Device B -> verifikasi tidak hilang pasca refresh
    await pageB.reload({ waitUntil: 'domcontentloaded' });
    await pageB.waitForTimeout(700);
    const deviceBReloaded = await pageB.evaluate(() => {
      const s = window.__getFiezelState();
      return { userName: s.userName, gemBalance: s.gems?.balance, level: s.level };
    });
    assert.strictEqual(deviceBReloaded.userName, 'Alice Nusantara');
    assert.strictEqual(deviceBReloaded.gemBalance, deviceASnap.gemBalance);
    assert.strictEqual(deviceBReloaded.level, 3);
    console.log('E2E PASS [Device B reload]: progres tetap bertahan setelah refresh!');

    // ==================== DEVICE B Shared Switch: Logout -> Bob Login ====================
    await pageB.evaluate(async () => {
      window.__fiezelAudit.deactivateAccountState();
      await window.FiezelAccount.logout();
      window.FiezelAuthScreen.clearSession(window);
    });
    const afterLogout = await pageB.evaluate(() => ({
      fzLast: localStorage.getItem('fz_last_account'),
      safety: localStorage.getItem('fiezel-safety-snapshot-v1'),
      safetyJa: localStorage.getItem('fiezel-safety-snapshot-v1@ja'),
      aliceKeyPreserved: Boolean(localStorage.getItem('fiezel-v5-state:alice_pro'))
    }));
    assert.strictEqual(afterLogout.fzLast, null);
    assert.strictEqual(afterLogout.safety, null);
    assert.strictEqual(afterLogout.safetyJa, null);
    assert.strictEqual(afterLogout.aliceKeyPreserved, true);

    await pageB.goto(`${appOrigin}/?fz_real_auth=1`, { waitUntil: 'domcontentloaded' });
    await waitForSplashAndAuthGate(pageB);
    await submitAuthForm(pageB, { mode: 'daftar', handle: 'bob_baru', password: 'rahasia456' });
    await pageB.waitForFunction(() => !document.querySelector('[data-testid="auth-submit"]') && Boolean(window.__getFiezelState?.()), { timeout: 15000 });
    await pageB.waitForTimeout(500);

    const bobState = await pageB.evaluate(() => {
      const s = window.__getFiezelState();
      return {
        userName: s.userName,
        totalAnswered: s.totalAnswered,
        grammarMastery: s.grammar?.present_perfect?.mastery || 0,
        gemBalance: s.gems?.balance || 0
      };
    });
    assert.notStrictEqual(bobState.userName, 'Alice Nusantara', 'Bob tidak boleh mewarisi nama Alice');
    assert.strictEqual(bobState.totalAnswered, 0, 'Bob tidak boleh mewarisi soal Alice');
    assert.strictEqual(bobState.grammarMastery, 0, 'Bob tidak boleh mewarisi penguasaan Alice');
    assert.ok(bobState.gemBalance < 20, `Bob tidak boleh mewarisi 120+ GEM Alice (dapat ${bobState.gemBalance})`);
    console.log('E2E PASS [Shared Device Account Switch]: Bob steril dari data Alice!', bobState);

    await ctxB.close();
    console.log('\nALL PLAYWRIGHT E2E PROBE ASSERTIONS PASSED!');
  } finally {
    if (browser) await browser.close().catch(() => {});
    staticServer.close();
  }
}

run().catch((err) => {
  console.error('E2E PROBE FAILED:', err);
  process.exit(1);
});
