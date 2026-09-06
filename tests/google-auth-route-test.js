'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. */
/**
 * tests/google-auth-route-test.js — GERBANG RUTE `POST /api/auth/google`.
 *
 * Gerbang ini menjalankan HANDLER SUNGGUHAN, bukan tiruannya: token
 * ditandatangani dengan pasangan kunci RSA nyata, D1 diganti mesin kecil yang
 * benar-benar menyimpan baris (termasuk perilaku ON CONFLICT), dan cookie yang
 * terbit diverifikasi ulang dengan verifier produksi.
 *
 * Yang dijaga di sini, satu per satu adalah bug yang pernah bisa terjadi:
 *   1. Login akun tertaut TIDAK menerbitkan `sub` baru — `sub` adalah kunci di
 *      16 tabel; sub baru = murid menjadi orang asing bagi gurunya.
 *   2. Rute TIDAK PERNAH mencari akun lewat email (dibuktikan dari SQL yang
 *      benar-benar dikirim, bukan dari pembacaan kode).
 *   3. Token cacat ditolak SEBELUM satu baris pun ditulis.
 *   4. Lomba dua permintaan: yang kalah IKUT pemenang, tidak mengira menang.
 *   5. Satu akun FIEZEL tidak boleh menumpuk dua akun Google.
 *   6. Rem laju melindungi kuota owner.
 */
const assert = require('assert');
const path = require('path');
const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (typeof globalThis.atob !== 'function') {
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}

const CLIENT_ID = '1084250087-hvfdttommi8gnkguc5rlqidpkiptopf0.apps.googleusercontent.com';
const HMAC_KEY = 'kunci-uji-hmac-yang-cukup-panjang-untuk-produksi-32+';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function b64url(bytes) {
  return Buffer.from(bytes).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlJson = (o) => b64url(Buffer.from(JSON.stringify(o), 'utf8'));

let KEYPAIR = null; let JWK = null; let route = null; let identity = null;

async function setup() {
  KEYPAIR = await webcrypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify']
  );
  const raw = await webcrypto.subtle.exportKey('jwk', KEYPAIR.publicKey);
  JWK = { kid: 'uji-1', kty: 'RSA', alg: 'RS256', use: 'sig', n: raw.n, e: raw.e };
  const url = (p) => require('url').pathToFileURL(path.join(__fzRoot, p)).href;
  route = await import(url('workers/api/route-auth-google.js'));
  identity = await import(url('workers/api/mw-identity.js'));
}

async function signToken(claims, nowS) {
  const header = { alg: 'RS256', kid: 'uji-1', typ: 'JWT' };
  const payload = Object.assign({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '11223344556677889900',
    email: 'murid@sekolah.sch.id',
    email_verified: true,
    iat: nowS,
    exp: nowS + 3600
  }, claims);
  const input = b64urlJson(header) + '.' + b64urlJson(payload);
  const sig = await webcrypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', KEYPAIR.privateKey, new TextEncoder().encode(input)
  );
  return input + '.' + b64url(new Uint8Array(sig));
}

/** D1 mini: menyimpan baris sungguhan supaya ON CONFLICT bisa diuji. */
function makeDb() {
  const oauth = new Map();   // "provider|provider_sub" -> row
  const email = new Map();   // sub -> row
  const ident = new Map();   // sub -> row
  const sql = [];
  const hideOnce = { first: false };
  function run(text, args) {
    sql.push(text);
    const t = text.replace(/\s+/g, ' ').trim();
    if (/^CREATE /i.test(t)) return { rows: [], meta: {} };
    if (/^SELECT sub FROM auth_oauth_identity WHERE provider = \?1 AND provider_sub = \?2/.test(t)) {
      /* Simulasi LOMBA: pembacaan pertama dibuat buta walau barisnya ada, persis
         seperti dua permintaan serentak yang sama-sama melihat "belum tertaut". */
      if (hideOnce.first) { hideOnce.first = false; return { rows: [] }; }
      const hit = oauth.get(args[0] + '|' + args[1]);
      return { rows: hit ? [{ sub: hit.sub }] : [] };
    }
    /* Mesin ini SENGAJA mengerti pencarian lewat email. Gerbang "nol SELECT
       email" hanya bermakna kalau rute yang melanggarnya tetap berjalan dan
       tertangkap oleh pemeriksaan SQL — bukan mati karena mesin uji menyerah. */
    if (/^SELECT sub FROM auth_email WHERE email = \?1/.test(t)) {
      for (const row of email.values()) if (row.email === args[0]) return { rows: [{ sub: row.sub }] };
      return { rows: [] };
    }
    if (/^SELECT provider_sub FROM auth_oauth_identity WHERE sub = \?1 AND provider = \?2/.test(t)) {
      for (const row of oauth.values()) {
        if (row.sub === args[0] && row.provider === args[1]) return { rows: [{ provider_sub: row.provider_sub }] };
      }
      return { rows: [] };
    }
    if (/^INSERT INTO auth_oauth_identity/.test(t)) {
      const key = args[0] + '|' + args[1];
      if (!oauth.has(key)) {
        oauth.set(key, { provider: args[0], provider_sub: args[1], sub: args[2], linked_at: args[3] });
      }
      return { rows: [] };
    }
    if (/^INSERT INTO auth_email/.test(t)) {
      email.set(args[0], { sub: args[0], email: args[1], verified: 1, source: args[2], updated_at: args[3] });
      return { rows: [] };
    }
    if (/^INSERT INTO identity/.test(t)) {
      if (!ident.has(args[0])) ident.set(args[0], { sub: args[0], created_at: args[1] });
      return { rows: [] };
    }
    throw new Error('SQL tak dikenal di gerbang: ' + t.slice(0, 90));
  }
  return {
    _oauth: oauth, _email: email, _ident: ident, _sql: sql, _hideOnce: hideOnce,
    prepare(text) {
      let bound = [];
      const stmt = {
        bind(...a) { bound = a; return stmt; },
        async first() { const r = run(text, bound); return r.rows[0] || null; },
        async run() { return run(text, bound); },
        async all() { return { results: run(text, bound).rows }; }
      };
      return stmt;
    }
  };
}

function makeEnv(db) {
  return { CORE_DB: db, GOOGLE_CLIENT_ID: CLIENT_ID, SESSION_HMAC_KEY_CURRENT: HMAC_KEY };
}

async function makeCtx(env, opts) {
  const o = opts || {};
  const ctx = {
    env,
    now: o.now,
    corsHeaders: {},
    cookies: [],
    byteLimit: 8192,
    bodyText: JSON.stringify(o.body || {}),
    identity: { sub: null, kid: null, issued: false, verified: false },
    request: { headers: { get: () => null } }
  };
  if (o.sub) ctx.identity = { sub: o.sub, kid: 'k1', issued: false, verified: true };
  return ctx;
}

async function readJson(res) { return JSON.parse(await res.text()); }

/** `sub` di dalam cookie yang benar-benar terbit, diverifikasi ulang. */
async function cookieSub(ctx) {
  const raw = ctx.cookies.map((c) => /fz_id=([^;]*)/.exec(c)).filter(Boolean)[0];
  if (!raw) return null;
  const check = await identity.verifyIdentity(ctx.env, raw[1]);
  return check.ok ? check.payload.sub : null;
}

let CLOCK = 1_788_600_000_000;
const tick = () => (CLOCK += 5000);

function stubFetch(ok) {
  globalThis.fetch = async () => ({
    ok: !!ok,
    json: async () => ({ keys: [JWK] })
  });
}

/* ------------------------------------------------------------------ kasus */

test('token sah pada perangkat baru: identitas terbit lalu tertaut', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const now = tick();
  const ctx = await makeCtx(env, { now, body: { credential: await signToken({}, Math.floor(now / 1000)) } });
  const res = await route.routeAuthGoogle(ctx);
  const body = await readJson(res);
  assert.strictEqual(res.status, 200, 'status 200');
  assert.strictEqual(body.signedIn, true, 'signedIn');
  assert.strictEqual(body.linked, true, 'baris tautan baru dibuat');
  assert.strictEqual(db._oauth.size, 1, 'satu baris tautan');
  assert.strictEqual(await cookieSub(ctx), body.userId, 'cookie memuat sub yang dijawab');
  assert.strictEqual(db._email.get(body.userId).email, 'murid@sekolah.sch.id', 'email tersimpan');
  assert.strictEqual(body.email, 'murid@sekolah.sch.id', 'email dipantulkan untuk layar');
});

test('KUNCI: masuk ke akun tertaut MEMAKAI ULANG sub akun, bukan sub perangkat', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const subLama = '11111111-2222-3333-4444-555555555555';
  db._oauth.set('google|11223344556677889900', {
    provider: 'google', provider_sub: '11223344556677889900', sub: subLama, linked_at: 1
  });
  const now = tick();
  const subPerangkat = '99999999-8888-7777-6666-555555555555';
  const ctx = await makeCtx(env, {
    now, sub: subPerangkat, body: { credential: await signToken({}, Math.floor(now / 1000)) }
  });
  const body = await readJson(await route.routeAuthGoogle(ctx));
  assert.strictEqual(body.userId, subLama, 'sub akun dipulihkan');
  assert.strictEqual(await cookieSub(ctx), subLama, 'cookie berpindah ke sub akun');
  assert.strictEqual(db._oauth.size, 1, 'tidak ada tautan kedua yang lahir');
});

test('KUNCI: rute tidak pernah mencari akun lewat email', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const now = tick();
  const ctx = await makeCtx(env, { now, body: { credential: await signToken({}, Math.floor(now / 1000)) } });
  await route.routeAuthGoogle(ctx);
  const pencarian = db._sql.filter((s) => /^\s*SELECT/i.test(s));
  assert.ok(pencarian.length > 0, 'ada SELECT yang dijalankan');
  for (const s of pencarian) {
    assert.ok(!/email/i.test(s), 'nol SELECT yang menyentuh email: ' + s.slice(0, 60));
  }
});

test('tanda tangan salah ditolak 401 dan NOL baris ditulis', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const now = tick();
  const token = await signToken({}, Math.floor(now / 1000));
  const rusak = token.slice(0, -4) + 'AAAA';
  const ctx = await makeCtx(env, { now, body: { credential: rusak } });
  const res = await route.routeAuthGoogle(ctx);
  assert.strictEqual(res.status, 401, 'ditolak');
  assert.strictEqual(db._oauth.size, 0, 'nol tautan');
  assert.strictEqual(db._email.size, 0, 'nol email');
  assert.strictEqual(ctx.cookies.length, 0, 'nol cookie');
});

test('token untuk aplikasi lain (aud beda) ditolak', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const now = tick();
  const ctx = await makeCtx(env, { now, body: { credential: await signToken({ aud: 'aplikasi-lain' }, Math.floor(now / 1000)) } });
  assert.strictEqual((await route.routeAuthGoogle(ctx)).status, 401, 'aud asing ditolak');
  assert.strictEqual(db._oauth.size, 0, 'nol tautan');
});

test('badan tanpa credential ditolak 400 sebelum menyentuh Google', async () => {
  let dipanggil = false;
  globalThis.fetch = async () => { dipanggil = true; return { ok: true, json: async () => ({ keys: [JWK] }) }; };
  const db = makeDb(); const env = makeEnv(db);
  const ctx = await makeCtx(env, { now: tick(), body: {} });
  assert.strictEqual((await route.routeAuthGoogle(ctx)).status, 400, 'skema ditolak');
  assert.strictEqual(dipanggil, false, 'nol subrequest ke Google');
});

test('lomba: permintaan kedua IKUT pemenang, tidak mengira menang', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const subA = 'aaaaaaaa-1111-2222-3333-444444444444';
  const subB = 'bbbbbbbb-1111-2222-3333-444444444444';
  const now = tick();
  const token = await signToken({}, Math.floor(now / 1000));
  const ctxA = await makeCtx(env, { now, sub: subA, body: { credential: token } });
  const bodyA = await readJson(await route.routeAuthGoogle(ctxA));
  assert.strictEqual(bodyA.userId, subA, 'A menang');
  /* B mengirim token Google YANG SAMA dari perangkat lain, dan pembacaan
     pertamanya dibuat BUTA — persis kondisi lomba: B mengira belum ada tautan,
     ikut menulis, tulisannya tidak berbekas (ON CONFLICT DO NOTHING), lalu ia
     harus membaca ulang dan mendarat di akun A. */
  db._hideOnce.first = true;
  const now2 = tick();
  const ctxB = await makeCtx(env, { now: now2, sub: subB, body: { credential: await signToken({}, Math.floor(now2 / 1000)) } });
  const bodyB = await readJson(await route.routeAuthGoogle(ctxB));
  assert.strictEqual(bodyB.userId, subA, 'B ikut pemenang');
  assert.strictEqual(bodyB.linked, false, 'B tahu tautannya BUKAN yang tercatat');
  assert.strictEqual(await cookieSub(ctxB), subA, 'cookie B berpindah ke akun A');
  assert.strictEqual(db._oauth.size, 1, 'tetap satu tautan');
});

test('satu akun FIEZEL tidak boleh menumpuk dua akun Google', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const sub = 'cccccccc-1111-2222-3333-444444444444';
  db._oauth.set('google|000-lama', { provider: 'google', provider_sub: '000-lama', sub, linked_at: 1 });
  const now = tick();
  const ctx = await makeCtx(env, { now, sub, body: { credential: await signToken({}, Math.floor(now / 1000)) } });
  const res = await route.routeAuthGoogle(ctx);
  assert.strictEqual(res.status, 409, 'ditolak 409');
  assert.strictEqual(db._oauth.size, 1, 'tautan kedua tidak lahir');
});

test('rem laju: dua permintaan beruntun dari sub yang sama ditolak 429', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db);
  const sub = 'dddddddd-1111-2222-3333-444444444444';
  const now = tick();
  const token = await signToken({}, Math.floor(now / 1000));
  await route.routeAuthGoogle(await makeCtx(env, { now, sub, body: { credential: token } }));
  const res = await route.routeAuthGoogle(await makeCtx(env, { now: now + 100, sub, body: { credential: token } }));
  assert.strictEqual(res.status, 429, 'permintaan kedua dalam 2 detik ditolak');
});

test('GOOGLE_CLIENT_ID belum dipasang: 503, bukan menerima token apa adanya', async () => {
  stubFetch(true);
  const db = makeDb(); const env = makeEnv(db); delete env.GOOGLE_CLIENT_ID;
  const now = tick();
  const ctx = await makeCtx(env, { now, body: { credential: await signToken({}, Math.floor(now / 1000)) } });
  assert.strictEqual((await route.routeAuthGoogle(ctx)).status, 503, '503 konfigurasi');
});

test('Google tak terjangkau DAN nol salinan: 503, bukan 200', async () => {
  const db = makeDb(); const env = makeEnv(db);
  /* Modul memegang salinan dalam-isolate dari kasus sebelumnya; gerbang ini
     hanya bermakna kalau salinan itu tidak dipakai. Karena itu ia diuji lewat
     impor SEGAR — isolate yang belum pernah melihat kunci Google. */
  const url = require('url').pathToFileURL(path.join(__fzRoot, 'workers/api/route-auth-google.js')).href;
  const segar = await import(url + '?segar=1');
  globalThis.fetch = async () => { throw new Error('jaringan mati'); };
  const now = tick();
  const ctx = await makeCtx(env, { now, body: { credential: await signToken({}, Math.floor(now / 1000)) } });
  const res = await segar.routeAuthGoogle(ctx);
  assert.strictEqual(res.status, 503, '503 kunci tak tersedia');
  assert.strictEqual(db._oauth.size, 0, 'nol baris');
});

test('rute terdaftar di slot dengan metode dan path yang benar', async () => {
  assert.strictEqual(route.ROUTES.length, 1, 'satu rute');
  assert.deepStrictEqual(route.ROUTES[0].slice(0, 2), ['POST', '/api/auth/google'], 'POST /api/auth/google');
  const slots = await import(require('url').pathToFileURL(path.join(__fzRoot, 'workers/api/route-slots.js')).href);
  const cocok = slots.EXTRA_ROUTES.filter((r) => r[1] === '/api/auth/google');
  assert.strictEqual(cocok.length, 1, 'terpasang persis sekali di EXTRA_ROUTES');
  const schema = await import(require('url').pathToFileURL(path.join(__fzRoot, 'workers/api/schema.js')).href);
  assert.ok(schema.BYTE_LIMITS['/api/auth/google'] > 4096, 'cap byte terdaftar dan cukup untuk ID token');
});

(async () => {
  await setup();
  let pass = 0; let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS ' + name); pass++; }
    catch (e) { console.error('FAIL ' + name + ' — ' + e.message); fail++; }
  }
  console.log('\ngoogle-auth-route: ' + pass + '/' + (pass + fail) + ' lulus');
  process.exit(fail ? 1 : 0);
})();
