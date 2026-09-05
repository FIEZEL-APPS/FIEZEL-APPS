/**
 * tests/cf-api-contract-test.js — GERBANG kontrak Worker API Cloudflare (`workers/api/`).
 *
 * Node murni, nol dependency, nol jaringan, nol berkas temporer. Gerbang ini
 * MENGEKSEKUSI Worker sungguhan: modul ESM di `workers/api/**` dirakit menjadi
 * satu graf `data:text/javascript;base64,...` lalu diimpor (pola cf-b7 §2.1
 * `loadWorkerModule`, diperluas untuk Worker MODULAR — impor relatif tidak punya
 * base di data URL, jadi tiap `from './x.js'` diganti data URL modul itu).
 *
 * Yang dijamin gerbang ini (dan alasan tiap jaminannya):
 *   1. `/health` mengembalikan `protocol:'1.7'`. Tiga jalur frontend melempar
 *      `*_protocol_mismatch` (app.js:1589, :2038, :5276) — salah satu digit di
 *      sini mematikan pembimbing adaptif dan coach di produksi.
 *   2. Cookie identitas selalu `HttpOnly; Secure; SameSite=Lax; Path=/;
 *      Max-Age=15552000`. `HttpOnly` adalah syarat MANDAT bab 8 (identitas harus
 *      bertahan terhadap `localStorage.clear()`), bukan pengerasan opsional.
 *   3. Payload cookie hanya `{v,kid,sub,iat}` — `plan`/`class`/`quota` di dalam
 *      cookie akan membuat cookie lama menjadi klaim entitlement basi.
 *   4. Origin asing ditolak 403, origin allowlist mendapat ACAO eksplisit +
 *      credentials. `*` ilegal bersama credentials.
 *   5. Batas byte PERSIS kontrak Puter: 20000 / 12000 / 100000 / 8192, dan
 *      ditegakkan SEBELUM routing (jadi rute yang belum ada pun sudah ber-cap).
 *   6. Identitas STABIL lintas request: dua kali `/api/auth/anon` dengan cookie
 *      yang sama = satu `userId`, tanpa Set-Cookie kedua. Kalau ini pecah, satu
 *      murid bisa menggandakan kuota hanya dengan memuat ulang halaman.
 *   7. Tanpa PII di respons mana pun.
 *   8. Tiket klaim: tanpa tiket / kedaluwarsa / `aud` salah / tanda tangan salah
 *      / replay = 401 dengan body IDENTIK (anti-oracle).
 *   9. Konfigurasi tetap PLAN GRATIS: tidak ada Durable Object di wrangler.toml,
 *      dan alasannya (DO = berbayar, wajib dilaporkan ke owner) tertulis di sana.
 *
 * Gagal mengekstrak sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__fzRoot, 'workers', 'api');
const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

function mustRead(relative) {
  const file = path.join(API_DIR, relative);
  if (!fs.existsSync(file)) throw new Error('berkas wajib tidak ada: workers/api/' + relative);
  return fs.readFileSync(file, 'utf8');
}

/* ==========================================================================
 * Perakit modul: graf ESM -> satu data: URL (tanpa berkas temporer)
 * ======================================================================== */

const MODULE_CACHE = new Map();

const REL_SPEC = '(\\.\\.?\\/[A-Za-z0-9_.\\/-]+\\.js)';

function inlineModule(rawName, stack) {
  // Path bersarang diselesaikan RELATIF terhadap modul pengimpor. Sebelum
  // penggabungan delapan paket kerja, seluruh graf ada di satu direktori dan
  // `./x.js` cukup; sekarang `index.js` -> `route-slots.js` -> `route-wiring.js`
  // -> `./quota/route-quota.js` -> `./quota-core.js`, dan tanpa penyelesaian
  // relatif yang benar berkas terakhir itu dicari di `workers/api/quota-core.js`.
  const name = String(rawName).replace(/\\/g, '/');
  if (MODULE_CACHE.has(name)) return MODULE_CACHE.get(name);
  if (stack.includes(name)) throw new Error('impor sirkular: ' + stack.concat(name).join(' -> '));
  const source = mustRead(name);
  const dir = path.posix.dirname(name);
  const resolveDep = (dep) => inlineModule(path.posix.normalize(path.posix.join(dir, dep)), stack.concat(name));
  // Baris berkomentar DILEWATI: `route-slots.js` sengaja menyimpan contoh impor
  // untuk paket kerja lain (`// import ... from './route-ai.js'`) dan itu bukan
  // dependency nyata. Menganggapnya nyata akan membuat gerbang menuntut berkas
  // yang memang belum ada.
  const transformed = source.split('\n').map((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
    return line
      // `from './x.js'`
      .replace(new RegExp("(from\\s+')" + REL_SPEC + "(')", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s)
      // `await import('../x.js')` — dipakai `handlePepper` di analytics.
      .replace(new RegExp("(import\\s*\\(\\s*')" + REL_SPEC + "('\\s*\\))", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s)
      // `import './x.js';` — impor efek-samping modul UMD (ai-tasks, breaker, tts-key).
      .replace(new RegExp("(^\\s*import\\s+')" + REL_SPEC + "(')", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s);
  }).join('\n');
  const url = 'data:text/javascript;base64,' + Buffer.from(transformed, 'utf8').toString('base64');
  MODULE_CACHE.set(name, url);
  return url;
}

/* ==========================================================================
 * Stub binding (pola cf-b7 §2.1). Setiap stub MENCATAT panggilannya: "tidak
 * dipanggil" adalah invarian yang sama pentingnya dengan "dipanggil benar".
 * ======================================================================== */

function fakeClock(startIso) {
  let t = Date.parse(startIso);
  if (!Number.isFinite(t)) throw new Error('fakeClock butuh ISO sah: ' + startIso);
  return { now: () => t, advance: (ms) => (t += ms) };
}

/**
 * D1 palsu: BUKAN mesin SQL, tapi fixture. Query yang tidak terdaftar MELEMPAR,
 * supaya query baru yang belum dipikirkan menjadi gerbang merah — bukan
 * `undefined` yang lolos diam-diam.
 */
function fakeD1() {
  const rows = new Map(); // sub -> baris identity
  const anonIssue = new Map(); // 'bucket\0ip_hmac' -> issued (rem penerbitan, rate-anon.js)
  const log = [];
  const norm = (sql) => sql.replace(/\s+/g, ' ').trim();
  const handlers = [
    [/^INSERT INTO identity/i, (b) => {
      const [sub, createdAt, day, kid] = b;
      if (!rows.has(sub)) {
        rows.set(sub, {
          sub, created_at: createdAt, last_seen_day: day, class: 'visitor',
          plan: 'free', kid, account_id: null, legacy_ref_hmac: null, revoked_at: null
        });
        return { changes: 1 };
      }
      return { changes: 0 };
    }],
    [/^SELECT sub, created_at, last_seen_day, class, plan, revoked_at FROM identity WHERE sub/i,
      (b) => ({ rows: rows.has(b[0]) ? [rows.get(b[0])] : [] })],
    [/^UPDATE identity SET last_seen_day/i, (b) => {
      const row = rows.get(b[0]);
      if (row && row.last_seen_day !== b[1]) { row.last_seen_day = b[1]; return { changes: 1 }; }
      return { changes: 0 };
    }],
    [/^SELECT sub FROM identity WHERE legacy_ref_hmac/i, (b) => {
      for (const row of rows.values()) if (row.legacy_ref_hmac === b[0]) return { rows: [{ sub: row.sub }] };
      return { rows: [] };
    }],
    [/^UPDATE identity SET legacy_ref_hmac/i, (b) => {
      const row = rows.get(b[0]);
      if (row && row.legacy_ref_hmac === null) {
        row.legacy_ref_hmac = b[1]; row.account_id = b[2]; row.class = 'auth';
        return { changes: 1 };
      }
      return { changes: 0 };
    }],
    // m0261-d17: penghitung penerbitan identitas (audit D3 HIGH-2) memakai tabel
    // D1 `anon_issue` dari migrasi 0001 — BUKAN KV, supaya invarian "penerbitan
    // nol tulis KV" (§3 di bawah) tetap berlaku apa adanya.
    // S1 (28 Agu 2026): jendelanya BERGULIR — satu SELECT membaca 6 ember 10 menit
    // (`ANON_SQL.windowRead`: 6 kunci hari + 1 ip_hmac), jadi fixture ini menjumlahkan
    // ember yang ada alih-alih membaca satu baris.
    [/^SELECT issued FROM anon_issue WHERE day/i, (b) => {
      const ip = b[b.length - 1];
      const rows = [];
      for (let i = 0; i < b.length - 1; i += 1) {
        const stored = anonIssue.get(b[i] + '\u0000' + ip);
        if (stored !== undefined) rows.push({ issued: stored });
      }
      return { rows };
    }],
    [/^INSERT INTO anon_issue/i, (b) => {
      const key = b[0] + '\u0000' + b[1];
      anonIssue.set(key, (anonIssue.get(key) || 0) + 1);
      return { changes: 1 };
    }]
  ];
  function execute(sql, binds) {
    const key = norm(sql);
    log.push({ sql: key, binds });
    for (const [pattern, fn] of handlers) {
      if (pattern.test(key)) {
        const out = fn(binds, key) || {};
        return { rows: out.rows || [], meta: { changes: out.changes || 0 } };
      }
    }
    throw new Error('D1 fixture tidak mengenal query ini: ' + key);
  }
  return {
    _rows: rows,
    _log: log,
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...args) { binds = args; return stmt; },
        async first(column) {
          const row = execute(sql, binds).rows[0] || null;
          return column && row ? row[column] : row;
        },
        async run() { return { success: true, meta: execute(sql, binds).meta }; },
        async all() { const r = execute(sql, binds); return { success: true, results: r.rows, meta: r.meta }; }
      };
      return stmt;
    },
    async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; }
  };
}

/** KV palsu: mencatat SETIAP tulis, karena PLAN GRATIS = 1.000 tulis/hari. */
function fakeKV(initial = {}) {
  const store = new Map(Object.entries(initial));
  const calls = { get: [], put: [] };
  return {
    _store: store,
    calls,
    async get(key, options) {
      calls.get.push({ key, options });
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (options && options.type === 'json') return typeof raw === 'string' ? JSON.parse(raw) : raw;
      return raw;
    },
    async put(key, value, options) { calls.put.push({ key, options }); store.set(key, value); }
  };
}

/** R2 palsu: HANYA baca. `put`/`delete` MELEMPAR — Worker ini tidak boleh menulis aset audio. */
function fakeR2(objects = new Map()) {
  const calls = { get: [], head: [], put: 0, delete: 0 };
  return {
    calls,
    async get(key) { calls.get.push(key); return objects.has(key) ? { size: objects.get(key), body: null } : null; },
    async head(key) { calls.head.push(key); return objects.has(key) ? { size: objects.get(key) } : null; },
    async put() { calls.put += 1; throw new Error('R2_WRITE_FORBIDDEN'); },
    async delete() { calls.delete += 1; throw new Error('R2_DELETE_FORBIDDEN'); }
  };
}

/** AI palsu. Fase ini TIDAK memakai AI; gerbang membuktikan `run` nol dipanggil. */
function fakeAI() {
  const calls = [];
  return { calls, binding: { async run(model, input) { calls.push({ model, input }); return { response: 'aman' }; } } };
}

/* ==========================================================================
 * Utilitas kripto untuk merakit tiket klaim uji (meniru sisi Puter)
 * ======================================================================== */

const enc = new TextEncoder();
const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmacB64url(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message))));
}

async function makeTicket(secret, payload) {
  const encoded = b64url(enc.encode(JSON.stringify(payload)));
  return encoded + '.' + await hmacB64url(secret, encoded);
}

/* ==========================================================================
 * Harness request
 * ======================================================================== */

const ORIGIN = 'https://fiezel.my.id';
const SECRET_CURRENT = 'uji-secret-cookie-current-0123456789';
const SECRET_PREVIOUS = 'uji-secret-cookie-previous-0123456789';
const CLAIM_SECRET = 'uji-secret-klaim-puter-0123456789';

function makeEnv(clock, extra = {}) {
  return {
    SERVICE_NAME: 'fiezel-api',
    API_VERSION: 'cf-api-1',
    AI_GATEWAY_MODE: 'core-only',
    ALLOWED_ORIGINS: 'https://fiezel.my.id,https://www.fiezel.my.id',
    COOKIE_DOMAIN: 'fiezel.my.id',
    FEATURE_AI: 'off',
    FEATURE_TTS: 'off',
    FEATURE_COACH: 'off',
    // Cermin nilai wrangler.toml [vars] APA ADANYA. 🔄 28 Agu 2026: dulu '20'/'6000' di sini
    // sementara penegakan quota-config.js memberi 25/12000 — harness ikut mengabadikan naskah
    // yang membohongi murid. Sekarang keduanya = nilai yang benar-benar ditegakkan, dan
    // tests/config-consistency-test.js menjaga pasangannya tetap cocok.
    AI_LIMIT_PER_DAY: '25',
    AI_LIMIT_PER_HOUR: '40',
    TTS_CHARS_PER_DAY: '12000',
    SESSION_HMAC_KEY_CURRENT: SECRET_CURRENT,
    SESSION_HMAC_KEY_PREVIOUS: SECRET_PREVIOUS,
    PUTER_CLAIM_SECRET_CURRENT: CLAIM_SECRET,
    // m0261-d17: gerbang edge kini FAIL-CLOSED saat EDGE_SHARED_SECRET absen.
    // Harness ini menguji kontrak rute, bukan gerbang jembatan (itu tugas
    // tests/edge-guard-test.js), jadi mode transisi dibuka eksplisit.
    ALLOW_NO_EDGE_SECRET: 'true',
    // m0261-d17: penerbitan /api/auth/anon kini dibatasi laju (rate-anon.js).
    // Harness memakai jam TEST_CLOCK_MS yang beku (semua panggilan jatuh di satu
    // ember jam) dan banyak bagian menerbitkan identitas berulang, jadi batasnya
    // dilonggarkan; pengujian batas yang sebenarnya ada di bagian khususnya
    // sendiri (dengan var yang ketat) di bawah. Jitter dimatikan demi determinisme.
    ANON_ISSUE_LIMIT_PER_HOUR: '1000',
    ANON_JITTER_MAX_MS: '0',
    TEST_CLOCK_MS: String(clock.now()),
    CORE_DB: extra.db || fakeD1(),
    CFG: extra.kv || fakeKV(),
    AUDIO: extra.r2 || fakeR2(),
    AI: (extra.ai || fakeAI()).binding,
    ...extra.vars
  };
}

const bodies = [];

async function call(worker, env, method, pathname, opt = {}) {
  const headers = new Headers(opt.headers || {});
  if (!headers.has('origin') && opt.origin !== null) headers.set('origin', opt.origin || ORIGIN);
  if (opt.cookie) headers.set('cookie', opt.cookie);
  const init = { method, headers };
  if (opt.body !== undefined) {
    init.body = opt.body;
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  const request = new Request('https://api.fiezel.my.id' + pathname, init);
  const response = await worker.fetch(request, env, { waitUntil() {}, passThroughOnException() {} });
  const text = await response.clone().text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (json) bodies.push({ pathname, json });
  return { response, text, json, cookie: response.headers.get('set-cookie') };
}

/** Ambil nilai cookie fz_id dari header Set-Cookie. */
const cookieValue = (setCookie) => {
  const m = /fz_id=([^;]*)/.exec(setCookie || '');
  return m ? m[1] : null;
};
const cookieHeaderFor = (setCookie) => 'fz_id=' + cookieValue(setCookie);

function decodeCookiePayload(value) {
  const encoded = String(value).split('.')[0];
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64').toString('utf8'));
}

/* ==========================================================================
 * Pemeriksaan PII menyeluruh atas SEMUA body respons yang terkumpul
 * ======================================================================== */

const PII_KEYS = [
  'name', 'learnerName', 'userName', 'username', 'email', 'ip', 'ipAddress',
  'userAgent', 'ua', 'lat', 'lon', 'location', 'puterUuid', 'uuid', 'password',
  'secret', 'token', 'prompt', 'transcript', 'answer', 'answers', 'ref',
  'legacyRef', 'legacy_ref_hmac', 'account_id', 'accountId'
];

function scanForPii(value, trail, hits) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((v, i) => scanForPii(v, trail + '[' + i + ']', hits)); return; }
  for (const [key, child] of Object.entries(value)) {
    if (PII_KEYS.includes(key)) hits.push(trail + '.' + key);
    scanForPii(child, trail + '.' + key, hits);
  }
}

/* ==========================================================================
 * MAIN
 * ======================================================================== */

(async () => {
  /* ---------- 0. Berkas wajib ada ------------------------------------------ */
  for (const required of [
    'wrangler.toml', 'index.js', 'mw-identity.js', 'mw-guard.js', 'route-health.js',
    'route-auth.js', 'route-user.js', 'route-config.js', 'route-slots.js',
    'schema.js', 'util-hmac.js', 'errors.js', 'README.md',
    'STUB-PUTER-CLAIM-TICKET.md', 'migrations/0001_identity.sql'
  ]) {
    assert(fs.existsSync(path.join(API_DIR, required)), 'berkas wajib ada: workers/api/' + required);
  }

  /* ---------- 1. Muat Worker sungguhan ------------------------------------- */
  const worker = (await import(inlineModule('index.js', []))).default;
  assert(worker && typeof worker.fetch === 'function', 'Worker mengekspor default.fetch');

  const clock = fakeClock('2026-08-27T03:00:00.000Z');

  /* ---------- 2. /health: protocol 1.7 ------------------------------------- */
  {
    const env = makeEnv(clock);
    const r = await call(worker, env, 'GET', '/health');
    assert(r.response.status === 200, '/health menjawab 200');
    assert(r.json && r.json.status === 'ok', '/health status ok');
    assert(r.json && r.json.protocol === '1.7',
      "/health WAJIB protocol '1.7' (app.js:2038 menolak selain ini)");
    assert(r.json && r.json.aiGateway === 'core-only', '/health aiGateway core-only');
    assert(Array.isArray(r.json.capabilities) && r.json.capabilities.length > 0, '/health membawa capabilities');
    assert(typeof r.json.time === 'string' && r.json.time.startsWith('2026-08-27'),
      '/health memakai jam SERVER yang masuk sebagai parameter (bukan Date.now internal)');
    assert(!r.cookie, '/health TIDAK menerbitkan identitas (crawler tidak boleh membuat baris D1)');
    assert(env.CORE_DB._log.length === 0, '/health nol query D1 (PLAN GRATIS)');
  }

  /* ---------- 3. Cookie identitas: atribut + payload ----------------------- */
  let firstCookie = null;
  let firstUserId = null;
  {
    const env = makeEnv(clock);
    const r = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
    assert(r.response.status === 200, '/api/auth/anon menjawab 200');
    firstCookie = r.cookie;
    firstUserId = r.json && r.json.userId;
    assert(!!firstCookie, '/api/auth/anon memasang Set-Cookie');
    assert(/(^|;\s*)fz_id=/.test(firstCookie), 'nama cookie identitas adalah fz_id');
    assert(/HttpOnly/i.test(firstCookie), 'cookie HttpOnly (syarat bab 8: tahan localStorage.clear())');
    assert(/Secure/i.test(firstCookie), 'cookie Secure');
    assert(/SameSite=Lax/i.test(firstCookie), 'cookie SameSite=Lax');
    assert(/Path=\//.test(firstCookie), 'cookie Path=/');
    assert(/Max-Age=15552000/.test(firstCookie), 'cookie Max-Age=15552000 (180 hari)');
    assert(/Domain=fiezel\.my\.id/.test(firstCookie), 'cookie Domain=fiezel.my.id (same-site ke api.fiezel.my.id)');

    const payload = decodeCookiePayload(cookieValue(firstCookie));
    const keys = Object.keys(payload).sort().join(',');
    assert(keys === 'iat,kid,sub,v', 'payload cookie HANYA {v,kid,sub,iat}, dapat: ' + keys);
    assert(/^[0-9a-f-]{36}$/.test(payload.sub), 'sub adalah UUID acak sisi server');
    assert(payload.sub === firstUserId, 'userId di respons = sub di cookie');
    assert(env.CORE_DB._rows.has(payload.sub), 'baris identity dibuat di D1');
    assert(env.CFG.calls.put.length === 0, 'penerbitan identitas nol tulis KV (batas 1.000/hari)');
  }

  /* ---------- 4. Identitas STABIL lintas request --------------------------- */
  {
    const db = fakeD1();
    const env = makeEnv(clock, { db });
    const first = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
    const cookie = cookieHeaderFor(first.cookie);
    const second = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}', cookie });
    assert(second.json.userId === first.json.userId,
      'identitas STABIL: /api/auth/anon kedua mengembalikan userId yang sama');
    assert(!second.cookie, 'tidak ada Set-Cookie kedua untuk cookie yang masih sah');
    assert(second.json.issued === false, 'respons menandai identitas tidak baru diterbitkan');
    assert(db._rows.size === 1, 'tidak ada identitas ganda di D1 (kuota tidak bisa digandakan dengan reload)');

    const me = await call(worker, env, 'GET', '/api/user/me', { cookie });
    assert(me.response.status === 200, '/api/user/me 200 dengan cookie sah');
    assert(me.json.userId === first.json.userId, '/api/user/me memakai identitas yang sama');
    assert(me.json.protocol === '1.7', '/api/user/me membawa protocol 1.7');
    assert(me.json.class === 'visitor' && me.json.plan === 'free', '/api/user/me kelas & plan dari SERVER');
    assert(me.json.entitlements && me.json.entitlements.ai === false,
      'entitlement AI default MATI (fitur baru wajib di belakang flag OFF)');
    assert(me.json.limits && me.json.limits.aiPerDay === 25, '/api/user/me membawa angka limit dari vars');
    assert(!('quota' in me.json), 'kuota TIDAK di /api/user/me (GET /api/quota satu-satunya sumber)');

    // Tanpa cookie: 401 generik, TANPA menerbitkan identitas baru.
    const anon = await call(worker, env, 'GET', '/api/user/me');
    assert(anon.response.status === 401, '/api/user/me tanpa cookie = 401');
    assert(anon.json && anon.json.error === 'unauthenticated', 'body 401 generik: unauthenticated');
    assert(!anon.cookie, '/api/user/me tidak menerbitkan identitas');

    // Tanda tangan diubah 1 karakter => diperlakukan seperti tidak ada.
    const value = cookieValue(first.cookie);
    // A12: dulu karakter TERAKHIR yang diubah. Karakter terakhir base64url bisa memuat bit yang
    // TIDAK signifikan (padding implisit), jadi `A`→`B` di sana kadang mendekode ke byte yang
    // SAMA dan tanda tangannya tetap sah — gerbang ini merah ±1 dari 8 jalan tanpa ada cacat
    // produksi. Yang diubah sekarang karakter di TENGAH segmen tanda tangan: seluruh bitnya
    // signifikan, jadi byte-nya pasti berubah dan assert-nya deterministik.
    const dot = value.lastIndexOf('.');
    const cut = dot + 1 + Math.floor((value.length - dot - 1) / 2);
    const tampered = value.slice(0, cut) + (value.charAt(cut) === 'A' ? 'B' : 'A') + value.slice(cut + 1);
    const bad = await call(worker, env, 'GET', '/api/user/me', { cookie: 'fz_id=' + tampered });
    assert(bad.response.status === 401, 'cookie dengan tanda tangan diubah = 401');
    assert(bad.json.error === 'unauthenticated', 'galat cookie palsu identik dengan galat tanpa cookie (anti-oracle)');

    // Body yang mencoba menitipkan klaim entitlement = 400, bukan diabaikan.
    const injected = await call(worker, env, 'POST', '/api/auth/anon', {
      body: JSON.stringify({ userId: 'punya-orang-lain', class: 'auth', plan: 'plus', quotaRemaining: 999 }),
      cookie
    });
    assert(injected.response.status === 400, 'body dengan field asing (userId/class/plan) DITOLAK 400');
  }

  /* ---------- 5. `kid` lama & `kid` tak dikenal ---------------------------- */
  {
    const db = fakeD1();
    const env = makeEnv(clock, { db });
    const issued = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
    const sub = issued.json.userId;
    // kid=1 (previous secret) harus MASIH diterima: rotasi secret tidak melogout siapa pun.
    const payloadOld = b64url(enc.encode(JSON.stringify({ v: 1, kid: 1, sub, iat: Math.floor(clock.now() / 1000) })));
    const oldCookie = payloadOld + '.' + await hmacB64url(SECRET_PREVIOUS, payloadOld);
    const okOld = await call(worker, env, 'GET', '/api/user/me', { cookie: 'fz_id=' + oldCookie });
    assert(okOld.response.status === 200, 'kid=1 (secret previous) masih diterima selama dua secret aktif');
    // kid asing tidak boleh di-fallback ke secret current.
    const payloadAlien = b64url(enc.encode(JSON.stringify({ v: 1, kid: 9, sub, iat: Math.floor(clock.now() / 1000) })));
    const alienCookie = payloadAlien + '.' + await hmacB64url(SECRET_CURRENT, payloadAlien);
    const alien = await call(worker, env, 'GET', '/api/user/me', { cookie: 'fz_id=' + alienCookie });
    assert(alien.response.status === 401, 'kid tak dikenal DITOLAK (tidak di-fallback ke secret current)');
  }

  /* ---------- 6. CORS ketat ------------------------------------------------ */
  {
    const env = makeEnv(clock);
    const foreign = await call(worker, env, 'POST', '/api/auth/anon', {
      body: '{}', origin: 'https://penyerang.example'
    });
    assert(foreign.response.status === 403, 'origin asing DITOLAK 403');
    assert(foreign.json.error === 'forbidden_origin', 'galat origin asing = forbidden_origin');
    assert(!foreign.cookie, 'origin asing tidak bisa memancing penerbitan identitas');
    assert(foreign.response.headers.get('vary') === 'Origin', 'Vary: Origin pada penolakan');

    const preflight = await call(worker, env, 'OPTIONS', '/api/auth/anon');
    assert(preflight.response.status === 204, 'preflight origin sah = 204');
    assert(preflight.response.headers.get('access-control-allow-origin') === ORIGIN,
      'ACAO memantulkan origin allowlist EKSPLISIT, bukan *');
    assert(preflight.response.headers.get('access-control-allow-credentials') === 'true',
      'Allow-Credentials true (dan karena itu * ilegal)');
    assert((preflight.response.headers.get('vary') || '').includes('Origin'), 'preflight ber-Vary: Origin');

    const preflightForeign = await call(worker, env, 'OPTIONS', '/api/auth/anon', { origin: 'https://penyerang.example' });
    assert(preflightForeign.response.status === 403, 'preflight origin asing = 403');

    const ok = await call(worker, env, 'GET', '/health');
    assert(ok.response.headers.get('access-control-allow-origin') === ORIGIN, 'respons sukses ber-ACAO');
    assert(ok.response.headers.get('cache-control') === 'no-store', 'respons API tidak boleh ter-cache bersama');
  }

  /* ---------- 7. Batas byte PERSIS kontrak Puter --------------------------- */
  {
    const env = makeEnv(clock);
    const schema = await import(inlineModule('schema.js', []));
    assert(schema.BYTE_LIMITS['/api/ai/chat'] === 20000, 'cap /api/ai/chat = 20000 byte');
    assert(schema.BYTE_LIMITS['/api/ai/translate'] === 12000, 'cap /api/ai/translate = 12000 byte');
    assert(schema.BYTE_LIMITS['/api/coach/context'] === 100000, 'cap /api/coach/context = 100000 byte');
    assert(schema.BYTE_LIMITS['/api/activity'] === 100000, 'cap /api/activity = 100000 byte');
    assert(schema.BYTE_LIMITS['/api/policy/outcome'] === 100000, 'cap /api/policy/outcome = 100000 byte');
    assert(schema.BYTE_LIMITS['/api/push/subscribe'] === 8192, 'cap /api/push/subscribe = 8192 byte');
    assert(schema.BYTE_LIMITS['/api/feedback'] === 8192, 'cap /api/feedback = 8192 byte');
    assert(schema.PROTOCOL === '1.7', 'schema.PROTOCOL = 1.7');

    const cases = [
      ['/api/ai/chat', 20000], ['/api/ai/translate', 12000],
      ['/api/coach/context', 100000], ['/api/push/subscribe', 8192]
    ];
    for (const [pathname, limit] of cases) {
      const tooBig = 'x'.repeat(limit + 1);
      /* eslint-disable no-await-in-loop */
      const over = await call(worker, env, 'POST', pathname, { body: tooBig });
      assert(over.response.status === 413, pathname + ' > ' + limit + ' byte = 413 (bukan 400)');
      assert(over.json && over.json.limitBytes === limit, pathname + ' 413 menyebut limitBytes ' + limit);
      // Cap ditegakkan SEBELUM routing: rute AI belum didaftarkan, tapi capnya sudah hidup.
      const under = await call(worker, env, 'POST', pathname, { body: JSON.stringify({ ok: true }) });
      assert(under.response.status === 404,
        pathname + ' di bawah cap lolos gerbang byte (404 karena rute milik paket kerja lain)');
    }

    // Batas kecil endpoint auth + cap tetap berlaku walau Content-Length tidak ada.
    const over = await call(worker, env, 'POST', '/api/auth/anon', { body: 'y'.repeat(600) });
    assert(over.response.status === 413, '/api/auth/anon > 512 byte = 413');
    assert(over.response.headers.get('access-control-allow-origin') === ORIGIN,
      'respons 413 TETAP ber-header CORS (kalau tidak, browser tampil "network error")');

    const badMethod = await call(worker, env, 'GET', '/api/auth/anon');
    assert(badMethod.response.status === 405, 'metode salah pada rute yang ada = 405');
    assert((badMethod.response.headers.get('allow') || '').includes('POST'), '405 menyertakan header Allow');

    const unknown = await call(worker, env, 'GET', '/api/tidak-ada');
    assert(unknown.response.status === 404, 'rute tidak dikenal = 404');
  }

  /* ---------- 8. /api/config: kill switch server-side ---------------------- */
  {
    const env = makeEnv(clock);
    const r = await call(worker, env, 'GET', '/api/config');
    assert(r.response.status === 200, '/api/config 200 tanpa cookie (boleh anon)');
    assert(r.json.protocol === '1.7', '/api/config protocol 1.7');
    const flags = r.json.flags || {};
    assert(Object.keys(flags).length > 0, '/api/config membawa flags');
    assert(Object.values(flags).every((v) => v === false),
      'SEMUA flag default OFF (main auto-deploy 5 menit: fitur baru wajib mati)');
    assert(r.json.enabled && Object.values(r.json.enabled).every((v) => v === false),
      'kill switch server default OFF');
    assert(r.response.headers.get('cache-control') === 'no-store',
      '/api/config no-store (core-config.js ter-precache; kill switch harus bisa menembus SW)');
    assert(env.CFG.calls.get.length === 1 && env.CFG.calls.get[0].options.cacheTtl === 60,
      '/api/config baca KV sekali dengan cacheTtl 60 s (hemat operasi PLAN GRATIS)');
    assert(env.CFG.calls.put.length === 0, '/api/config NOL tulis KV');
    assert(!('workerUrl' in flags), "flags TIDAK memakai field workerUrl (tests/remote-push-test.js:6 mengunci regex *.puter.work)");

    // Nilai KV boleh menyalakan flag; kunci sampah TIDAK boleh menyuntik flag baru.
    const kv = fakeKV({ 'cfg:flags': JSON.stringify({ flags: { cfApiEnabled: true, jahat: true }, enabled: { ai: true } }) });
    const env2 = makeEnv(clock, { kv });
    const r2 = await call(worker, env2, 'GET', '/api/config');
    assert(r2.json.flags.cfApiEnabled === true, 'owner bisa menyalakan flag lewat KV');
    assert(!('jahat' in r2.json.flags), 'kunci tak dikenal di KV tidak menjadi flag baru');
    assert(r2.json.enabled.ai === true, 'kill switch ai bisa dinyalakan owner');

    const broken = { async get() { throw new Error('kv down'); }, async put() {}, calls: { get: [], put: [] } };
    const env3 = makeEnv(clock, { kv: broken });
    const r3 = await call(worker, env3, 'GET', '/api/config');
    assert(r3.response.status === 200 && Object.values(r3.json.flags).every((v) => v === false),
      'KV gagal = jatuh ke default OFF (gagal ke arah aman, bukan ke arah mahal)');
  }

  /* ---------- 9. Tiket klaim ----------------------------------------------- */
  {
    const db = fakeD1();
    const kv = fakeKV();
    const env = makeEnv(clock, { db, kv });
    const nowS = Math.floor(clock.now() / 1000);
    const ref = 'a'.repeat(64);
    const base = { v: 1, aud: 'fiezel-api', ref, jti: 'jti-uji-0001', iat: nowS, exp: nowS + 120 };

    const noTicket = await call(worker, env, 'POST', '/api/auth/claim', { body: '{}' });
    assert(noTicket.response.status === 400, 'klaim tanpa field ticket = 400 (skema wajib)');

    const garbage = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: 'bukan-tiket' }) });
    assert(garbage.response.status === 401 && garbage.json.error === 'claim_invalid', 'tiket sampah = 401 claim_invalid');

    const wrongSig = await makeTicket('secret-salah-0123456789', base);
    const rSig = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: wrongSig }) });
    assert(rSig.response.status === 401, 'tanda tangan tiket salah = 401');

    const expired = await makeTicket(CLAIM_SECRET, { ...base, jti: 'jti-uji-exp', iat: nowS - 200, exp: nowS - 80 });
    const rExp = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: expired }) });
    assert(rExp.response.status === 401, 'tiket kedaluwarsa (jam palsu) = 401');

    const longTtl = await makeTicket(CLAIM_SECRET, { ...base, jti: 'jti-uji-ttl', exp: nowS + 3600 });
    const rTtl = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: longTtl }) });
    assert(rTtl.response.status === 401, 'tiket berumur > 120 s DITOLAK walau tanda tangannya sah');

    const wrongAud = await makeTicket(CLAIM_SECRET, { ...base, aud: 'worker-lain', jti: 'jti-uji-aud' });
    const rAud = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: wrongAud }) });
    assert(rAud.response.status === 401, 'aud salah = 401');

    const bodies401 = [garbage.json, rSig.json, rExp.json, rTtl.json, rAud.json].map((b) => JSON.stringify(b));
    assert(new Set(bodies401).size === 1, 'SEMUA penolakan klaim memakai body identik (anti-oracle)');

    // Tiket sah: mengikat identitas pemanggil.
    const good = await makeTicket(CLAIM_SECRET, base);
    const rOk = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: good }) });
    assert(rOk.response.status === 200, 'tiket sah = 200');
    assert(rOk.json.linked === true && rOk.json.class === 'auth', 'klaim menaikkan kelas ke auth (keputusan SERVER)');
    assert(!!rOk.cookie, 'klaim tanpa cookie sebelumnya menerbitkan identitas');
    assert(!('ref' in rOk.json) && !JSON.stringify(rOk.json).includes(ref),
      'ref (turunan uuid Puter) TIDAK PERNAH dipantulkan ke klien');
    const claimedSub = rOk.json.userId;
    assert(db._rows.get(claimedSub).legacy_ref_hmac === ref, 'legacy_ref_hmac tersimpan sebagai HMAC, bukan uuid mentah');

    // Replay `jti` yang sama = 401.
    const replay = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: good }) });
    assert(replay.response.status === 401, 'tiket dipakai dua kali = 401 (anti-replay jti)');
    assert(kv.calls.put.length === 1 && kv.calls.put[0].options.expirationTtl === 300,
      'penanda anti-replay 1 tulis KV ber-TTL 300 s (batas 1.000 tulis/hari dihormati)');

    // Perangkat kedua: ref sama, identitas baru => MENGADOPSI sub lama, tanpa baris baru.
    const before = db._rows.size;
    const ticket2 = await makeTicket(CLAIM_SECRET, { ...base, jti: 'jti-uji-0002' });
    const second = await call(worker, env, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: ticket2 }) });
    assert(second.response.status === 200, 'klaim dari perangkat kedua = 200');
    assert(second.json.userId === claimedSub, 'ref yang sudah terikat mengembalikan sub YANG SUDAH ADA');
    assert(second.json.adopted === true, 'respons menandai adopsi identitas lama');
    assert(db._rows.size === before + 1,
      'perangkat kedua tidak menambah identitas ter-KLAIM (hanya identitas anon sementara yang lahir)');
    assert(!!second.cookie, 'cookie dipasang ulang untuk sub yang diadopsi');

    // Tanpa secret klaim terpasang: selalu 401 (fitur tanpa penerbit tidak mengikat apa pun).
    const envNoSecret = makeEnv(clock, { db: fakeD1(), kv: fakeKV(), vars: { PUTER_CLAIM_SECRET_CURRENT: '' } });
    const noSecret = await call(worker, envNoSecret, 'POST', '/api/auth/claim', { body: JSON.stringify({ ticket: good }) });
    assert(noSecret.response.status === 401, 'tanpa PUTER_CLAIM_SECRET_CURRENT, klaim selalu 401');
  }

  /* ---------- 10. Binding mahal tidak tersentuh di fase ini ---------------- */
  {
    const ai = fakeAI();
    const r2 = fakeR2(new Map([['a/abc.mp3', 1024]]));
    const env = makeEnv(clock, { ai, r2 });
    await call(worker, env, 'GET', '/health');
    await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
    await call(worker, env, 'GET', '/api/config');
    assert(ai.calls.length === 0, 'fase ini NOL panggilan Workers AI (biaya dibatasi ketat)');
    assert(r2.calls.put === 0 && r2.calls.delete === 0, 'Worker ini tidak pernah MENULIS ke bucket audio');
  }

  /* ---------- 11. Tanpa PII di seluruh respons ----------------------------- */
  {
    const hits = [];
    for (const body of bodies) scanForPii(body.json, body.pathname, hits);
    assert(hits.length === 0, 'nol field PII di seluruh respons; temuan: ' + hits.join(', '));
    const dump = JSON.stringify(bodies);
    assert(!dump.includes(SECRET_CURRENT) && !dump.includes(CLAIM_SECRET),
      'nilai secret tidak pernah muncul di respons');
  }

  /* ---------- 12. Invarian tingkat SUMBER ---------------------------------- */
  {
    const sources = fs.readdirSync(API_DIR).filter((f) => f.endsWith('.js'));
    assert(sources.length >= 9, 'Worker modular: minimal 9 modul .js');
    for (const file of sources) {
      const src = mustRead(file);
      // Komentar dibuang lebih dulu: berkas-berkas ini SENGAJA menyebut `hono`
      // dan contoh impor di prosa penjelas. Yang diadili adalah kode, bukan alasan.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
      const external = imports.filter((spec) => !spec.startsWith('./'));
      assert(external.length === 0,
        file + ' NOL dependency eksternal (npm install dilarang di jalur produksi); ditemukan: ' + external.join(','));
      assert(!/\bhono\b/i.test(code), file + ' tidak memakai Hono di kode');
      assert(!/require\(/.test(code), file + ' ESM murni, tanpa require()');
      // `sub` tidak boleh pernah masuk URL/query (agar tidak masuk log jaringan).
      assert(!/searchParams\.(set|append)\s*\(\s*['"](sub|userId|user_id)['"]/.test(code),
        file + ' tidak pernah menaruh sub/userId di query string');
    }
    const index = mustRead('index.js');
    assert(/KENAPA ROUTER MANUAL, BUKAN HONO/.test(index), 'index.js menjelaskan alasan router manual');
    assert(/route-slots\.js|EXTRA_ROUTES/.test(index), 'index.js punya slot registrasi rute untuk paket kerja lain');
    const slots = mustRead('route-slots.js');
    assert(/SLOT 1/.test(slots) && /SLOT 4/.test(slots), 'route-slots.js menyediakan slot bernomor per domain');
    assert(/export const EXTRA_ROUTES/.test(slots), 'route-slots.js mengekspor EXTRA_ROUTES');
  }

  /* ---------- 13. wrangler.toml tetap PLAN GRATIS -------------------------- */
  {
    const toml = mustRead('wrangler.toml');
    assert(/name\s*=\s*"fiezel-api"/.test(toml), 'wrangler name = fiezel-api (bukan fiezel-audio)');
    assert(/main\s*=\s*"index\.js"/.test(toml), 'wrangler main = index.js');
    assert(/compatibility_date\s*=\s*"20\d\d-\d\d-\d\d"/.test(toml), 'compatibility_date wajar terpasang');
    assert(/api\.fiezel\.my\.id/.test(toml) && /custom_domain\s*=\s*true/.test(toml),
      'route custom domain api.fiezel.my.id terpasang');
    assert(/workers_dev\s*=\s*false/.test(toml), 'workers_dev = false (origin kedua tidak bisa dikunci CORS)');
    assert(/\[\[d1_databases\]\]/.test(toml) && /binding\s*=\s*"CORE_DB"/.test(toml), 'binding D1 CORE_DB ada');
    assert(/\[\[kv_namespaces\]\]/.test(toml) && /binding\s*=\s*"CFG"/.test(toml), 'binding KV CFG ada');
    assert(/\[\[r2_buckets\]\]/.test(toml) && /bucket_name\s*=\s*"fiezel-audio"/.test(toml),
      'binding R2 ke bucket audio yang SUDAH ADA (baca)');
    assert(/\[ai\]/.test(toml) && /binding\s*=\s*"AI"/.test(toml), 'binding AI ada (binding, bukan token REST)');
    assert(/\[\[analytics_engine_datasets\]\]/.test(toml), 'binding Analytics Engine ada');
    assert(!/\[\[durable_objects\.bindings\]\]/.test(toml) && !/new_sqlite_classes/.test(toml),
      'TIDAK ADA Durable Object (DO butuh Workers Paid; keputusan owner: PLAN GRATIS)');
    assert(/DURABLE OBJECTS\s*—\s*TIDAK DIPASANG/.test(toml), 'wrangler.toml menjelaskan ketiadaan DO secara eksplisit');
    assert(/UPGRADE BERBAYAR/.test(toml) && /DILAPORKAN KE OWNER/.test(toml),
      'wrangler.toml menyatakan DO = upgrade berbayar yang WAJIB dilaporkan ke owner');
    assert(!/TEST_CLOCK_MS\s*=/.test(toml), 'TEST_CLOCK_MS tidak pernah dipasang sebagai var produksi');
    for (const secret of [
      'SESSION_HMAC_KEY_CURRENT', 'SESSION_HMAC_KEY_PREVIOUS',
      'PUTER_CLAIM_SECRET_CURRENT', 'PUTER_CLAIM_SECRET_PREVIOUS'
    ]) {
      assert(new RegExp('wrangler secret put ' + secret).test(toml), 'daftar Secret memuat ' + secret);
    }
    // Nilai rahasia tidak boleh ada di berkas konfigurasi.
    assert(!/SESSION_HMAC_KEY_CURRENT\s*=/.test(toml), 'tidak ada nilai secret di wrangler.toml');

    // Worker audio TIDAK BOLEH tersentuh oleh paket kerja ini.
    const audioToml = fs.readFileSync(path.join(__fzRoot, 'workers', 'wrangler.toml'), 'utf8');
    assert(/name\s*=\s*"fiezel-audio"/.test(audioToml), 'workers/wrangler.toml tetap milik fiezel-audio');
    assert(!/fiezel-api/.test(audioToml), 'workers/wrangler.toml tidak dicemari konfigurasi fiezel-api');
  }

  /* ---------- 14. README: batas PLAN GRATIS yang harus dipantau ------------ */
  {
    const readme = mustRead('README.md');
    assert(/wrangler\s+deploy/.test(readme), 'README menjelaskan cara deploy (wrangler)');
    assert(/wrangler\s+d1\s+create/.test(readme) && /d1\s+migrations\s+apply/.test(readme),
      'README menjelaskan pembuatan D1 + migrasi');
    assert(/wrangler secret put SESSION_HMAC_KEY_CURRENT/.test(readme), 'README mendaftar Secret yang dibutuhkan');
    assert(/10\s*ms/.test(readme), 'README menyebut batas CPU 10 ms');
    assert(/1\.000 tulis|1000 tulis/.test(readme), 'README menyebut batas KV 1.000 tulis/hari');
    assert(/50\s*subrequest|subrequest.*50/i.test(readme), 'README menyebut batas 50 subrequest');
    assert(/gejala|Gejala/.test(readme), 'README menjelaskan GEJALA kalau batas gratis tidak cukup');
  }

  /* ---------- 15. Rate limit penerbitan /api/auth/anon (D3 HIGH-2) --------- */
  {
    // Var ketat KHUSUS bagian ini; makeEnv default memakai batas longgar supaya
    // bagian-bagian lain (yang menerbitkan identitas berulang kali pada jam
    // TEST_CLOCK_MS yang beku) tidak saling menjatuhkan.
    const env = makeEnv(clock, { vars: { ANON_ISSUE_LIMIT_PER_HOUR: '3' } });
    let lastCookie = null;
    for (let i = 0; i < 3; i += 1) {
      const r = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
      assert(r.response.status === 200, 'penerbitan ke-' + (i + 1) + ' (di bawah batas) lolos 200, dapat ' + r.response.status);
      if (r.cookie) lastCookie = r.cookie;
    }
    const blocked = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}' });
    assert(blocked.response.status === 429, 'penerbitan di atas batas ditolak 429, dapat ' + blocked.response.status);
    assert(blocked.json && blocked.json.error === 'rate_limited', '429 memakai galat baku rate_limited dari errors.js');
    assert(!blocked.cookie, 'penolakan TIDAK menerbitkan cookie identitas');
    assert(Number(blocked.json && blocked.json.retryAfter) > 0, '429 membawa retryAfter > 0 (bukan PII)');
    assert(!!blocked.response.headers.get('retry-after'), '429 membawa header Retry-After untuk klien yang patuh HTTP');
    // Invarian identitas STABIL tidak boleh ikut terkunci: cookie sah bukan penerbitan.
    const stable = await call(worker, env, 'POST', '/api/auth/anon', { body: '{}', cookie: cookieHeaderFor(lastCookie) });
    assert(stable.response.status === 200, 'panggilan ber-cookie sah tetap 200 walau ember penerbitan penuh, dapat ' + stable.response.status);
    assert(stable.json && stable.json.issued === false, 'panggilan ber-cookie sah tidak menerbitkan identitas baru (issued:false)');
  }

  /* ---------- Laporan ------------------------------------------------------ */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('cf-api-contract-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('cf-api-contract-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  // Gagal mengekstrak/memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
  console.error('cf-api-contract-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
