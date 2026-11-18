'use strict';
const __fzRoot = require('path').join(__dirname, '..');
/**
 * tests/auth-cross-request-regression-test.js — Regresi login Google + akun FIEZEL (m025-804).
 *
 * Dua akar penyebab nyata di produksi:
 *   1. Cross-request Promise poison di Worker Cloudflare (`compatibility_date = "2026-06-01"`,
 *      `handle_cross_request_promise_resolution`): cache `WeakMap` menyimpan `Promise` dari
 *      permintaan pertama di `auth-schema.js` / `social-schema.js` / `legacy-schema.js`. Begitu
 *      permintaan pertama berakhir, permintaan login berikutnya (`POST /api/account/login`,
 *      `POST /api/auth/google`, `GET /api/auth/session`) di isolate hangat melempar 500
 *      "This promise was created by a request that has since ended, so it can never settle".
 *   2. Overlay tombol Google (`.fz-auth-google-overlay`) memasang `pointer-events: auto` di atas
 *      `.fz-btn-google-native` (menelan ketukan sebelum iframe GSI selesai atau di tepi tombol),
 *      CSS `.fz-auth-google` memakai `display: flex !important` yang menimpa `[hidden]`, dan
 *      muat ulang tidak memanaskan `gsi/client` dari layar Selamat datang.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (typeof globalThis.atob !== 'function') {
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}

const ROOT = __fzRoot;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const modUrl = (p) => require('url').pathToFileURL(path.join(ROOT, p)).href;

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlJson = (o) => b64url(Buffer.from(JSON.stringify(o), 'utf8'));

/** Simulasikan pembungkus Promise yang mati lintas permintaan Cloudflare Workers. */
function makeCrossRequestDbHarness() {
  let currentReqId = 0;
  const completedReqIds = new Set();
  const batchCalls = [];
  const runCalls = [];
  const accounts = new Map();
  const credentials = new Map();
  const handles = new Map();
  const oauth = new Map();
  const emails = new Map();
  const identities = new Map();
  let failDdl = false;

  function tagPromise(p) {
    const ownerReq = currentReqId;
    const origThen = p.then.bind(p);
    return new Proxy(p, {
      get(target, prop) {
        if (prop === 'then') {
          return function (onFulfilled, onRejected) {
            if (currentReqId !== ownerReq && completedReqIds.has(ownerReq)) {
              return Promise.reject(new Error(
                'This promise was created by a request that has since ended, so it can never settle.'
              ));
            }
            return origThen(onFulfilled, onRejected);
          };
        }
        const v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      }
    });
  }

  function execSql(text, args) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (/^CREATE /i.test(t)) {
      if (failDdl) throw new Error('simulated_d1_error');
      return { rows: [], meta: { changes: 0 } };
    }
    if (/^INSERT INTO identity/i.test(t)) {
      identities.set(args[0], { sub: args[0], created_at: args[1] });
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^SELECT sub FROM auth_account WHERE sub = \?1/.test(t)) {
      return { rows: accounts.has(args[0]) ? [{ sub: args[0] }] : [] };
    }
    if (/^SELECT sub, role, login_handle, status, institution_id FROM auth_account WHERE login_handle = \?1/.test(t)) {
      for (const acc of accounts.values()) {
        if (acc.login_handle === args[0]) return { rows: [acc] };
      }
      return { rows: [] };
    }
    if (/^SELECT sub, role, login_handle, status, institution_id FROM auth_account WHERE sub = \?1/.test(t)) {
      return { rows: accounts.has(args[0]) ? [accounts.get(args[0])] : [] };
    }
    if (/^INSERT INTO auth_login_handle/i.test(t)) {
      if (handles.has(args[0])) throw new Error('UNIQUE constraint failed: auth_login_handle.handle');
      handles.set(args[0], args[1]);
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^INSERT INTO auth_account/i.test(t)) {
      accounts.set(args[0], { sub: args[0], role: args[1], login_handle: args[2], status: args[3], created_at: args[4], institution_id: null });
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^INSERT INTO auth_credential/i.test(t)) {
      credentials.set(args[0], { sub: args[0], pass_hash: args[1], updated_at: args[2], failed_count: 0, locked_until: null });
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^SELECT pass_hash, failed_count, locked_until FROM auth_credential WHERE sub = \?1/.test(t)) {
      return { rows: credentials.has(args[0]) ? [credentials.get(args[0])] : [] };
    }
    if (/^UPDATE auth_credential/i.test(t) || /^UPDATE auth_account/i.test(t)) {
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^SELECT sub FROM auth_oauth_identity WHERE provider = \?1 AND provider_sub = \?2/.test(t)) {
      const hit = oauth.get(args[0] + '|' + args[1]);
      return { rows: hit ? [{ sub: hit.sub }] : [] };
    }
    if (/^SELECT provider_sub FROM auth_oauth_identity WHERE sub = \?1 AND provider = \?2/.test(t)) {
      for (const row of oauth.values()) {
        if (row.sub === args[0] && row.provider === args[1]) return { rows: [{ provider_sub: row.provider_sub }] };
      }
      return { rows: [] };
    }
    if (/^INSERT INTO auth_oauth_identity/i.test(t)) {
      const key = args[0] + '|' + args[1];
      if (!oauth.has(key)) oauth.set(key, { provider: args[0], provider_sub: args[1], sub: args[2], linked_at: args[3] });
      return { rows: [], meta: { changes: 1 } };
    }
    if (/^INSERT INTO auth_email/i.test(t)) {
      emails.set(args[0], { sub: args[0], email: args[1] });
      return { rows: [], meta: { changes: 1 } };
    }
    throw new Error('Unhandled SQL in regression harness: ' + t.slice(0, 120));
  }

  const db = {
    _batchCalls: batchCalls,
    _runCalls: runCalls,
    _setFailDdl(v) { failDdl = !!v; },
    async batch(stmts) {
      batchCalls.push(stmts.length);
      return tagPromise((async () => {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        return out;
      })());
    },
    prepare(text) {
      let bound = [];
      const stmt = {
        bind(...a) { bound = a; return stmt; },
        first() { return tagPromise(Promise.resolve().then(() => execSql(text, bound).rows[0] || null)); },
        run() {
          runCalls.push(text.slice(0, 60));
          return tagPromise(Promise.resolve().then(() => execSql(text, bound)));
        },
        all() { return tagPromise(Promise.resolve().then(() => ({ results: execSql(text, bound).rows }))); }
      };
      return stmt;
    }
  };

  async function runRequest(fn) {
    currentReqId += 1;
    const reqId = currentReqId;
    try {
      return await fn();
    } finally {
      completedReqIds.add(reqId);
    }
  }

  return { db, runRequest };
}

test('W1: ensureAuthSchema / ensureSocialSchema / ensureLegacySchema bebas cross-request Promise & gagal dapat diulang', async () => {
  const authSchema = await import(modUrl('workers/api/auth-schema.js'));
  const socialSchema = await import(modUrl('workers/api/social-schema.js'));
  const legacySchema = await import(modUrl('workers/api/legacy-schema.js'));

  const h = makeCrossRequestDbHarness();

  // Kegagalan DDL di Req #1 tidak boleh meracuni Req #2
  h.db._setFailDdl(true);
  let threw = false;
  await h.runRequest(async () => {
    try { await authSchema.ensureAuthSchema(h.db); } catch (_) { threw = true; }
  });
  assert.strictEqual(threw, true, 'DDL gagal melempar seperti kontrak fail-closed');

  h.db._setFailDdl(false);
  const batchesAfterFail = h.db._batchCalls.length;
  // Req #2 pasang auth schema dalam 1 batch, lalu berakhir
  await h.runRequest(() => authSchema.ensureAuthSchema(h.db));
  assert.strictEqual(h.db._batchCalls.length, batchesAfterFail + 1, 'auth DDL berjalan via 1 db.batch() di isolate dingin');

  // Req #3+ memakai db yang SAMA lintas permintaan selesai — DILARANG melempar cross-request error
  await h.runRequest(() => authSchema.ensureAuthSchema(h.db));
  assert.strictEqual(h.db._batchCalls.length, batchesAfterFail + 1, 'auth DDL panggilan berikutnya = no-op tanpa Promise lintas permintaan');

  // Social + Legacy juga bebas cross-request Promise
  await h.runRequest(() => socialSchema.ensureSocialSchema(h.db));
  await h.runRequest(() => socialSchema.ensureSocialSchema(h.db));
  await h.runRequest(() => legacySchema.ensureLegacySchema(h.db));
  await h.runRequest(() => legacySchema.ensureLegacySchema(h.db));
  assert.strictEqual(h.db._batchCalls.length, batchesAfterFail + 3, 'masing-masing skema cuma 1 batch lintas permintaan');
});

test('W2: register -> login -> google login -> session sukses beruntun lintas permintaan pada isolate Workers yang sama', async () => {
  const accountRoute = await import(modUrl('workers/api/route-account.js'));
  const googleRoute = await import(modUrl('workers/api/route-auth-google.js'));
  const authSchema = await import(modUrl('workers/api/auth-schema.js'));
  const h = makeCrossRequestDbHarness();
  authSchema.resetSchemaCacheForTest(h.db);

  const CLIENT_ID = '1084250087-hvfdttommi8gnkguc5rlqidpkiptopf0.apps.googleusercontent.com';
  const env = { CORE_DB: h.db, GOOGLE_CLIENT_ID: CLIENT_ID, SESSION_HMAC_KEY_CURRENT: 'kunci-uji-regresi-cukup-panjang-32+' };
  let now = 1_795_000_000_000;

  const mkCtx = (opts) => ({
    env,
    now: (now += 3000),
    corsHeaders: {},
    cookies: [],
    byteLimit: 8192,
    bodyText: opts.body ? JSON.stringify(opts.body) : '',
    identity: opts.sub ? { sub: opts.sub, kid: 'k1', issued: false, verified: true } : { sub: null, kid: null, issued: false, verified: false },
    request: { headers: { get: () => null } }
  });

  // 1. Register murid di Req #1
  const sub1 = '11111111-1111-4111-8111-111111111111';
  const rReg = await h.runRequest(() => accountRoute.routeAccountRegister(mkCtx({
    sub: sub1,
    body: { handle: 'sari_regresi', password: 'SandiKuat99!' }
  })));
  assert.strictEqual(rReg.status, 200, 'register req #1 sukses 200');

  // 2. Login murid yang sama di Req #2 (handle ada!) & handle tak ada di Req #3 — TIDAK BOLEH 500
  const rLoginOk = await h.runRequest(() => accountRoute.routeAccountLogin(mkCtx({
    body: { handle: 'sari_regresi', password: 'SandiKuat99!' }
  })));
  assert.strictEqual(rLoginOk.status, 200, 'login akun valid req #2 sukses 200 (bebas 500)');

  const rLoginBad = await h.runRequest(() => accountRoute.routeAccountLogin(mkCtx({
    body: { handle: 'bukan_siapa', password: 'salah' }
  })));
  assert.strictEqual(rLoginBad.status, 401, 'login handle asing req #3 menjawab 401 konsisten, bukan 500');

  // 3. Google login di Req #4 pada isolate YANG SAMA setelah Req #1-#3 berakhir
  const kp = await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const jwkRaw = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const jwk = { kid: 'reg-1', kty: 'RSA', alg: 'RS256', use: 'sig', n: jwkRaw.n, e: jwkRaw.e };
  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
  try {
    const nowS = Math.floor((now + 3000) / 1000);
    const input = b64urlJson({ alg: 'RS256', kid: 'reg-1', typ: 'JWT' }) + '.' + b64urlJson({
      iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'g-sub-999',
      email: 'murid.google@example.com', email_verified: true, iat: nowS, exp: nowS + 3600
    });
    const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(input));
    const token = input + '.' + b64url(new Uint8Array(sig));

    const gCtx = mkCtx({ sub: '22222222-2222-4222-8222-222222222222', body: { credential: token } });
    const rGoogle = await h.runRequest(() => googleRoute.routeAuthGoogle(gCtx));
    assert.strictEqual(rGoogle.status, 200, 'Google login req #4 di isolate hangat sukses 200 (bebas 500)');

    const rSess = await h.runRequest(() => googleRoute.routeAuthSession(mkCtx({ sub: '22222222-2222-4222-8222-222222222222' })));
    const sessBody = JSON.parse(await rSess.text());
    assert.deepStrictEqual(sessBody, { ok: true, signedIn: true, via: 'google', role: 'murid' }, 'session req #5 sukses');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('F1: CSS & DOM overlay Google tidak mengunci ketukan dan [hidden] menang atas display:flex !important', () => {
  const authJs = read('features/auth/fiezel-auth-screen.js');
  const styleCss = read('style.css');
  const mobileCss = read('features/ui/mobile-edge-fit.css');

  assert.ok(/class="fz-auth-google-overlay"[^>]*pointer-events:none/.test(authJs),
    'div overlay tombol Google wajib pointer-events:none supaya tepi tombol / sebelum iframe jadi tidak menelan klik');
  assert.ok(/\.fz-auth-google-overlay\s*>\s*\*[^}]*pointer-events:\s*auto\s*!important/.test(styleCss),
    'CSS mengaktifkan pointer-events:auto khusus pada child/iframe di dalam overlay');
  assert.ok(/\.fz-auth-google\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(mobileCss),
    'mobile-edge-fit.css wajib memenangkan .fz-auth-google[hidden] atas display:flex !important');
});

test('F2: FiezelGoogle.preload memanaskan gsi/client hanya jika tersedia, dan 0 skrip saat mati', async () => {
  const gSrc = read('features/auth/fiezel-google.js');
  function runWith(avail) {
    const scripts = [];
    const ctx = {
      console, Promise, Math, Uint8Array, Object, String, Array,
      setTimeout: () => 1, clearTimeout: () => {},
      FIEZEL_GOOGLE_AUTH: avail ? { enabled: true, clientId: 'uji.apps.googleusercontent.com' } : { enabled: false, clientId: '' },
      document: {
        head: { appendChild: (s) => scripts.push(s) },
        querySelector: () => null,
        createElement: () => ({ setAttribute() {}, addEventListener() {} })
      }
    };
    ctx.self = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(gSrc, ctx);
    ctx.FiezelGoogle.preload();
    return scripts.length;
  }
  assert.strictEqual(runWith(false), 0, 'preload() tidak menyuntik skrip bila fitur mati');
  assert.strictEqual(runWith(true), 1, 'preload() menyuntik gsi/client saat fitur aktif');
});

test('F3: Playwright Chromium memverifikasi tombol Google tidak tertahan overlay + alur login akun & Google e2e', async () => {
  let pw = null;
  for (const id of ['playwright', 'playwright-core', path.join(ROOT, '..', 'fiezel-apps', 'node_modules', 'playwright')]) {
    try { pw = require(id); break; } catch (_) {}
  }
  if (!pw) { console.log('SKIP F3 - playwright tidak terpasang (bukan kegagalan)'); return; }
  let exe = null;
  try { const p = pw.chromium.executablePath(); if (p && fs.existsSync(p)) exe = p; } catch (_) {}
  if (!exe) { console.log('SKIP F3 - Chromium tidak ditemukan (bukan kegagalan)'); return; }

  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  const ORIGIN = 'https://fiezel.uji';

  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-first-run'] });
  try {
    // Kasus 1: Masuk dengan Google (mock gsi/client + /api/auth/google)
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const apiCalls = [];
      await ctx.route('**/*', (route) => {
        const u = route.request().url();
        if (u.startsWith('https://accounts.google.com/gsi/client')) {
          return route.fulfill({
            status: 200,
            contentType: 'text/javascript',
            body: `window.google = { accounts: { id: {
              _cb: null,
              initialize(cfg) { this._cb = cfg.callback; },
              renderButton(host) {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'width:380px;height:44px;display:flex;align-items:center;justify-content:center;';
                const b = document.createElement('button');
                b.type = 'button';
                b.setAttribute('data-testid', 'mock-gsi-inner');
                b.style.cssText = 'width:100%;height:100%;border:0;';
                b.onclick = () => { if (this._cb) this._cb({ credential: 'mock.jwt.token' }); };
                wrap.appendChild(b);
                host.appendChild(wrap);
              },
              prompt() { if (this._cb) this._cb({ credential: 'mock.jwt.token' }); },
              disableAutoSelect() {}
            } } };`
          });
        }
        if (u.includes('/api/auth/google')) {
          apiCalls.push(u);
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, linked: false, signedIn: true, userId: 'u-google-1', email: 'siswa@fiezel.test' })
          });
        }
        if (u.includes('/api/auth/session')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(apiCalls.length > 0
              ? { authenticated: true, via: 'google', email: 'siswa@fiezel.test' }
              : { authenticated: false })
          });
        }
        if (u.includes('/api/account/me')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(apiCalls.length > 0
              ? { ok: true, account: { handle: 'g_siswa', role: 'learner', shell: '/learner/', navigation: [] } }
              : { ok: true, account: null })
          });
        }
        if (!u.startsWith(ORIGIN + '/') || u.endsWith('.onnx') || u.includes('/vendor/supertonic')) return route.abort();
        let rel = decodeURIComponent(new URL(u).pathname);
        if (rel === '/') rel = '/index.html';
        const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'no' });
        return route.fulfill({ status: 200, contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(file) });
      });

      const page = await ctx.newPage();
      await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2500);
      try { await page.mouse.click(200, 200); } catch (_) {}
      await page.waitForSelector('[data-auth-go="masuk"]', { timeout: 15000 });
      await page.click('[data-auth-go="masuk"]');
      await page.waitForSelector('[data-testid="mock-gsi-inner"]', { timeout: 10000 });

      // Verifikasi overlay CSS tidak menelan klik tepi tombol native, dan klik tombol GSI masuk sukses
      const hitCheck = await page.evaluate(() => {
        const box = document.querySelector('[data-auth-google]');
        const slot = document.querySelector('[data-auth-google-slot]');
        const br = box.getBoundingClientRect();
        const edgeEl = document.elementFromPoint(br.left + 8, br.top + br.height / 2);
        return {
          slotPointerEvents: getComputedStyle(slot).pointerEvents,
          edgeTag: edgeEl ? edgeEl.tagName : null,
          edgeNotSlot: edgeEl !== slot
        };
      });
      assert.strictEqual(hitCheck.slotPointerEvents, 'none', 'overlay wrapper pointer-events: none');
      assert.strictEqual(hitCheck.edgeNotSlot, true, 'tepi tombol Google tidak ditelan div overlay');

      await page.click('[data-testid="mock-gsi-inner"]');
      await page.waitForFunction(() => !document.querySelector('.fz-auth:not(.is-leaving)'), { timeout: 10000 });
      assert.strictEqual(apiCalls.length, 1, 'POST /api/auth/google dipanggil sekali dan layar masuk tertutup');
      const sess = JSON.parse(await page.evaluate(() => localStorage.getItem('fiezel-auth-v1') || 'null'));
      assert.strictEqual(sess.via, 'google', 'sesi lokal menyimpan via:google');
      await ctx.close();
    }

    // Kasus 2: Masuk dengan Akun FIEZEL
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const loginBodies = [];
      await ctx.route('**/*', (route) => {
        const u = route.request().url();
        if (u.includes('/api/auth/anon')) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ userId: 'u-anon-1' }) });
        }
        if (u.includes('/api/account/login')) {
          loginBodies.push(route.request().postData());
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, account: { handle: 'budi_uji', role: 'learner', shell: '/learner/', navigation: [] } })
          });
        }
        if (!u.startsWith(ORIGIN + '/') || u.endsWith('.onnx') || u.includes('/vendor/supertonic')) return route.abort();
        let rel = decodeURIComponent(new URL(u).pathname);
        if (rel === '/') rel = '/index.html';
        const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
        if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'no' });
        return route.fulfill({ status: 200, contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(file) });
      });

      const page = await ctx.newPage();
      await page.goto(ORIGIN + '/index.html', { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(2500);
      try { await page.mouse.click(195, 420); } catch (_) {}
      await page.waitForSelector('[data-auth-go="masuk"]', { timeout: 15000 });
      await page.click('[data-auth-go="masuk"]');
      await page.fill('[name="handle"]', 'budi_uji');
      await page.fill('[name="password"]', 'rahasia123');
      await page.click('[data-testid="auth-submit"]');
      await page.waitForFunction(() => !document.querySelector('.fz-auth:not(.is-leaving)'), { timeout: 10000 });
      assert.strictEqual(loginBodies.length, 1, 'POST /api/account/login dipanggil');
      const sess = JSON.parse(await page.evaluate(() => localStorage.getItem('fiezel-auth-v1') || 'null'));
      assert.strictEqual(sess.via, 'akun', 'sesi lokal menyimpan via:akun');
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
});

(async () => {
  let pass = 0; let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS ' + name); pass++; }
    catch (e) { console.error('FAIL ' + name + ' — ' + (e && e.stack ? e.stack : e)); fail++; }
  }
  console.log('\nauth-cross-request-regression-test: ' + pass + '/' + (pass + fail) + ' PASS');
  process.exit(fail ? 1 : 0);
})();
