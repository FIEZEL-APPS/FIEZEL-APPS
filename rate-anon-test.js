#!/usr/bin/env node
/**
 * rate-anon-test.js — GERBANG pembatas penerbitan identitas anonim
 * (`POST /api/auth/anon`, `workers/api/rate-anon.js`).
 *
 * Node murni, NOL dependency, NOL jaringan, nol berkas temporer. Ia MENJALANKAN
 * Worker `workers/api/` yang sungguhan (graf ESM dirakit menjadi data: URL lalu
 * dimuat lewat `tools/cf-test-harness.js`), bukan menguji salinan logika.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA (temuan lapangan owner, 28 Agu 2026 — paket S1)
 * ==========================================================================
 * `POST https://api.fiezel.my.id/api/auth/anon` ditembak 52 kali dari SATU IP di
 * produksi hidup: **28 pertama lolos 200**, sisanya 429. Pembatasnya bekerja,
 * tarifnya salah — yang terpakai adalah tarif JEMBATAN (30/jam) padahal jembatan
 * PHP sudah lepas dari jalur permintaan (custom domain Worker sudah terikat).
 * Sebabnya: cabang tarif dipilih dari `edgeSecret(env)` (= "apakah Secret
 * terpasang"), bukan dari jalur yang benar-benar dipakai permintaan. Tidak ada
 * satu pun gerbang yang menjaga pemilihan cabang itu, jadi kesalahannya bisa
 * hidup tanpa terlihat. Berkas ini menutup kelas itu.
 *
 * ==========================================================================
 * APA YANG DIJAGA
 * ==========================================================================
 * (a) CABANG TARIF: jalur langsung memakai batas KETAT, jembatan memakai batas
 *     CADANGAN, dan cabangnya dipilih dari sinyal yang TIDAK BISA DIPALSUKAN
 *     KLIEN (`ctx.edgePath` yang ditulis `mw-edge.js`, bukan header). Dibuktikan
 *     dua arah: unit atas `anonIssueLimit()` + permintaan NYATA yang menempelkan
 *     `X-Fiezel-Edge` sah ke custom domain dan TETAP mendapat tarif ketat.
 *     Termasuk: pembatas benar-benar PER-IP (IP lain = ember lain), dan
 *     `rate-anon.js` NOL membaca header pemilih jalur.
 * (b) AMPLOP 429 tidak membocorkan riwayat: nol field turunan riwayat
 *     (`issued`/`remaining`/`limit`/`resetAt`/`window`/`ip`), `retryAfter`
 *     KONSTANTA, dan dua penolakan pada MENIT BERBEDA byte-identik. Nol
 *     Set-Cookie pada penolakan.
 * (c) JITTER masih ada, masih diekspor, dan masih dipanggil untuk SEMUA respons
 *     rute anon (terbit / stabil / tolak) — waktu respons tidak boleh menjadi
 *     oracle.
 * (d) D1 GALAT: keputusan yang tertulis di `rate-anon.js` (fail-closed terhadap
 *     PEMBATAS, bukan fail-open) diuji DUA ARAH: penerbitan tetap mungkin sampai
 *     batas degradasi, dan permintaan sesudahnya 429. Plus: batas degradasi
 *     tidak pernah melebihi batas normal.
 * (e) JENDELA BERGULIR: penghitung tidak reset di menit ke-0. Burst di 09:5x
 *     tetap 429 sesudah jam berganti ke 10:0x, dan baru lolos ketika ember
 *     tertua benar-benar keluar dari jendela.
 * (f) PRIVASI KUNCI: IP di-HMAC dengan `RATE_SALT` (salt yang berbeda = ember
 *     yang berbeda), hasilnya 32 hex, dan NOL IP mentah pernah masuk bind D1
 *     atau keluar ke console.
 * (g) LAPISAN KEDUA (verifikasi, NOL edit `workers/api/ai/`): plafon neuron
 *     tingkat akun benar-benar terpasang di jalur AI dan fail-closed di setiap
 *     cabang; celah yang ditemukan wajib tertulis di laporan.
 * (h) Gerbang ini terdaftar di `.github/workflows/quality.yml` (gerbang yang
 *     tidak dijalankan CI = gerbang yang tidak ada).
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./tools/cf-test-harness.js');

const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'workers', 'api');

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

function mustRead(absolute, label) {
  if (!fs.existsSync(absolute)) throw new Error('berkas wajib tidak ada: ' + label);
  return fs.readFileSync(absolute, 'utf8');
}

/* ==========================================================================
 * Perakit modul: graf ESM `workers/api/**` -> satu data: URL.
 * Pola sama dengan cf-api-contract-test.js / edge-guard-test.js.
 * ======================================================================== */

const MODULE_CACHE = new Map();
const REL_SPEC = '(\\.\\.?\\/[A-Za-z0-9_.\\/-]+\\.js)';

function transformModule(name) {
  const source = mustRead(path.join(API_DIR, name), 'workers/api/' + name);
  const dir = path.posix.dirname(name);
  const resolveDep = (dep) => inlineModule(path.posix.normalize(path.posix.join(dir, dep)));
  return source.split('\n').map((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
    return line
      .replace(new RegExp("(from\\s+')" + REL_SPEC + "(')", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s)
      .replace(new RegExp("(import\\s*\\(\\s*')" + REL_SPEC + "('\\s*\\))", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s)
      .replace(new RegExp("(^\\s*import\\s+')" + REL_SPEC + "(')", 'g'), (a, p, dep, s) => p + resolveDep(dep) + s);
  }).join('\n');
}

function inlineModule(rawName) {
  const name = String(rawName).replace(/\\/g, '/');
  if (MODULE_CACHE.has(name)) return MODULE_CACHE.get(name);
  MODULE_CACHE.set(name, null);
  const url = 'data:text/javascript;base64,' + Buffer.from(transformModule(name), 'utf8').toString('base64');
  MODULE_CACHE.set(name, url);
  return url;
}

/* ==========================================================================
 * D1 palsu KHUSUS jalur penerbitan.
 *
 * Sengaja fixture (pola-per-pernyataan) dan bukan mesin SQL: yang harus
 * dibuktikan gerbang ini adalah BINDS yang benar-benar dikirim (butir f) dan
 * jumlah ember yang benar-benar dibaca (butir e). Keduanya paling jujur dibaca
 * dari log bind, bukan dari hasil akhir sebuah mesin SQL tiruan.
 * `mode:'throw-anon'` = D1 yang melempar HANYA pada pernyataan `anon_issue` (butir d).
 * Dibatasi ke pernyataan pembatas dengan sengaja: yang diputuskan butir (5) tugas adalah
 * "apa yang terjadi kalau PEMBACAAN PEMBATAS gagal". Kalau seluruh D1 mati, penerbitan
 * identitas gagal di tempat lain (`ensureIdentityRow`) dan itu keadaan berbeda yang tidak
 * bisa diputuskan berkas ini — dicatat di laporan, bukan disamarkan di sini.
 * ======================================================================== */
function fakeD1(options) {
  const opt = options || {};
  const log = [];
  const identity = new Map();
  const anon = new Map();
  const norm = (sql) => String(sql).replace(/\s+/g, ' ').trim();

  function execute(sql, binds) {
    const key = norm(sql);
    log.push({ sql: key, binds });
    if (opt.mode === 'throw') throw new Error('D1_DOWN');
    if (opt.mode === 'throw-anon' && /anon_issue/i.test(key)) throw new Error('D1_DOWN');

    if (/^SELECT issued FROM anon_issue WHERE day IN/i.test(key)) {
      const ip = binds[binds.length - 1];
      const rows = [];
      for (let i = 0; i < binds.length - 1; i += 1) {
        const stored = anon.get(binds[i] + '\u0000' + ip);
        if (stored !== undefined) rows.push({ issued: stored });
      }
      return { rows, changes: 0 };
    }
    if (/^INSERT INTO anon_issue/i.test(key)) {
      const k = binds[0] + '\u0000' + binds[1];
      anon.set(k, (anon.get(k) || 0) + 1);
      return { rows: [], changes: 1 };
    }
    if (/^INSERT INTO identity/i.test(key)) {
      if (!identity.has(binds[0])) {
        identity.set(binds[0], {
          sub: binds[0], created_at: binds[1], last_seen_day: binds[2],
          class: 'visitor', plan: 'free', revoked_at: null
        });
        return { rows: [], changes: 1 };
      }
      return { rows: [], changes: 0 };
    }
    if (/^SELECT sub, created_at, last_seen_day, class, plan, revoked_at FROM identity/i.test(key)) {
      const row = identity.get(binds[0]);
      return { rows: row ? [row] : [], changes: 0 };
    }
    if (/^UPDATE identity SET last_seen_day/i.test(key)) {
      const row = identity.get(binds[0]);
      if (row && row.last_seen_day !== binds[1]) { row.last_seen_day = binds[1]; return { rows: [], changes: 1 }; }
      return { rows: [], changes: 0 };
    }
    if (/^SELECT sub FROM identity WHERE legacy_ref_hmac/i.test(key)) return { rows: [], changes: 0 };
    throw new Error('D1 fixture tidak mengenal query ini: ' + key);
  }

  return {
    _log: log,
    _anon: anon,
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...args) { binds = args; return stmt; },
        async first(column) {
          const row = execute(sql, binds).rows[0] || null;
          return column && row ? row[column] : row;
        },
        async run() { const r = execute(sql, binds); return { success: true, meta: { changes: r.changes } }; },
        async all() { const r = execute(sql, binds); return { success: true, results: r.rows, meta: { changes: r.changes } }; }
      };
      return stmt;
    },
    async batch(statements) { const out = []; for (const s of statements) out.push(await s.run()); return out; }
  };
}

/** KV palsu: mencatat setiap tulis (jalur penerbitan harus NOL tulis KV). */
function fakeKV() {
  const store = new Map();
  const calls = { get: [], put: [] };
  return {
    calls,
    async get(key, options) { calls.get.push({ key, options }); return store.get(key) === undefined ? null : store.get(key); },
    async put(key, value) { calls.put.push({ key }); store.set(key, value); }
  };
}

/* ==========================================================================
 * Env + pemanggil
 * ======================================================================== */

const ORIGIN = 'https://fiezel.my.id';
const TRUSTED_BASE = 'https://api.fiezel.my.id';
const WORKERS_DEV = 'https://fiezel-api.fitrajft.workers.dev';
const EDGE_SECRET = 'uji-edge-secret-jembatan-0123456789abcdef';
const IP_A = '203.0.113.77';
const IP_B = '198.51.100.9';
const CLOCK_ISO = '2026-08-28T09:52:00.000Z';

function makeEnv(vars, d1Options) {
  const db = fakeD1(d1Options);
  const kv = fakeKV();
  const env = Object.assign({
    PROTOCOL_VERSION: '1.7',
    SERVICE_NAME: 'fiezel-api',
    API_VERSION: 'cf-api-1',
    AI_GATEWAY_MODE: 'core-only',
    ALLOWED_ORIGINS: ORIGIN,
    COOKIE_DOMAIN: 'fiezel.my.id',
    FEATURE_AI: 'off',
    FEATURE_TTS: 'off',
    SESSION_HMAC_KEY_CURRENT: 'uji-secret-cookie-current-0123456789',
    SESSION_HMAC_KEY_PREVIOUS: 'uji-secret-cookie-previous-0123456789',
    RATE_SALT: 'uji-rate-salt-0123456789',
    ANON_JITTER_MAX_MS: '0',           // determinisme harness; butir (c) mengujinya terpisah
    TEST_CLOCK_MS: String(Date.parse(CLOCK_ISO)),
    CORE_DB: db,
    CFG: kv
  }, vars || {});
  return { env, db, kv };
}

async function call(worker, env, opt) {
  const options = opt || {};
  const headers = new Headers(options.headers || {});
  headers.set('origin', options.origin || ORIGIN);
  headers.set('content-type', 'application/json');
  headers.set('cf-connecting-ip', options.ip || IP_A);
  if (options.edge !== undefined && options.edge !== null) headers.set('x-fiezel-edge', options.edge);
  if (options.cookie) headers.set('cookie', options.cookie);
  const base = options.base || TRUSTED_BASE;
  const response = await worker.fetch(
    new Request(base + (options.pathname || '/api/auth/anon'), { method: options.method || 'POST', headers, body: options.body === undefined ? '{}' : options.body }),
    env,
    { waitUntil() {}, passThroughOnException() {} }
  );
  const text = await response.clone().text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
  const setCookie = response.headers.get('set-cookie');
  return { response, status: response.status, text, json, setCookie };
}

/** Kumpulkan keluaran console selama sebuah blok — butir (f) melarang IP mentah di log. */
async function captureConsole(fn) {
  const lines = [];
  const original = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const level of Object.keys(original)) {
    console[level] = (...args) => { lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); };
  }
  try { await fn(); } finally { Object.assign(console, original); }
  return lines.join('\n');
}

/* ==========================================================================
 * MAIN
 * ======================================================================== */

(async () => {
  const SRC = mustRead(path.join(API_DIR, 'rate-anon.js'), 'workers/api/rate-anon.js');
  /**
   * SRC tanpa komentar. Pemindaian butir (a3) harus menilai KODE, bukan prosa: berkas ini
   * WAJIB menjelaskan bug `edgeSecret(env)` di komentarnya (itu bagian dari perbaikan), jadi
   * pemindaian yang menolak kata itu di komentar akan menghukum dokumentasi yang benar.
   */
  const CODE = SRC
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  const ROUTE_AUTH = mustRead(path.join(API_DIR, 'route-auth.js'), 'workers/api/route-auth.js');

  const worker = (await harness.loadWorkerSource(transformModule('index.js'))).default;
  assert(worker && typeof worker.fetch === 'function', 'Worker mengekspor default.fetch');

  const mod = await harness.loadWorkerSource(transformModule('rate-anon.js'));
  assert(typeof mod.anonIssueGate === 'function', 'rate-anon.js mengekspor anonIssueGate');

  /* ======================================================================
   * (a) CABANG TARIF DAN SINYAL PEMILIHNYA
   * ==================================================================== */
  {
    const strict = mod.ANON_ISSUE_LIMIT_DEFAULT;
    const bridge = mod.ANON_ISSUE_LIMIT_BRIDGE_DEFAULT;
    assert(strict > 0 && strict < bridge,
      '(a1) batas KETAT (' + strict + ') lebih rapat daripada batas CADANGAN jembatan (' + bridge + ')');
    assert(strict === 15, '(a1) batas ketat per-IP = 15/jam bergulir (angka berargumen di komentar), dapat ' + strict);
    assert(bridge === 30, '(a1) batas cadangan jembatan tetap 30/jam, dapat ' + bridge);

    // Cabang dipilih dari ctx.edgePath, dan HANYA 'header' (= lewat proxy PHP)
    // yang mendapat tarif cadangan.
    assert(mod.anonIssueLimit({ env: {}, edgePath: 'header' }) === bridge, '(a2) edgePath=header -> tarif jembatan');
    assert(mod.anonIssueLimit({ env: {}, edgePath: 'custom-domain' }) === strict, '(a2) edgePath=custom-domain -> tarif ketat');
    assert(mod.anonIssueLimit({ env: {}, edgePath: 'off' }) === strict, '(a2) edgePath=off (dev) -> tarif ketat');
    assert(mod.anonIssueLimit({ env: {}, edgePath: 'unknown' }) === strict, '(a2) edgePath=unknown -> tarif ketat');
    assert(mod.anonIssueLimit({ env: {} }) === strict, '(a2) edgePath TIDAK ADA (rantai middleware rusak) -> tarif ketat, bukan longgar');
    assert(mod.anonIssueLimit({ env: { EDGE_SHARED_SECRET: EDGE_SECRET }, edgePath: 'custom-domain' }) === strict,
      '(a2) Secret EDGE_SHARED_SECRET yang MASIH terpasang TIDAK lagi menaikkan tarif (ini bug lapangan 28 Agu)');

    // Pemindaian kode: sinyal cabang tidak boleh datang dari klien atau dari env.
    assert(!/edgeSecret/.test(CODE), '(a3) KODE rate-anon.js TIDAK lagi memakai edgeSecret(env) sebagai pemilih cabang');
    assert(!/from '\.\/mw-edge\.js'/.test(CODE), '(a3) rate-anon.js tidak lagi mengimpor apa pun dari mw-edge.js untuk memilih tarif');
    assert(/edgePath/.test(CODE), '(a3) rate-anon.js memilih cabang dari ctx.edgePath');
    assert(!/x-forwarded|x-fiezel-edge|['"]host['"]/i.test(CODE), '(a3) rate-anon.js NOL membaca header proxy/hostname yang bisa dipalsukan klien');
    const ipHeaderReads = (CODE.match(/headers\.get\(/g) || []).length;
    assert(ipHeaderReads === 2, '(a3) hanya DUA pembacaan header di berkas ini (cf-connecting-ip + x-real-ip, keduanya untuk KUNCI ember), dapat ' + ipHeaderReads);

    // Jalur langsung: batas ketat DITEGAKKAN walau klien menempelkan header jembatan yang SAH.
    const { env } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '2', ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR: '30' });
    mod.resetAnonRateLimitForTests();
    const r1 = await call(worker, env, { edge: EDGE_SECRET });
    const r2 = await call(worker, env, { edge: EDGE_SECRET });
    const r3 = await call(worker, env, { edge: EDGE_SECRET });
    assert(r1.status === 200 && r2.status === 200, '(a4) dua penerbitan pertama di custom domain lolos 200');
    assert(r3.status === 429,
      '(a4) penerbitan ke-3 di custom domain DITOLAK 429 walau klien mengirim X-Fiezel-Edge SAH — header klien tidak bisa membeli tarif jembatan, dapat ' + r3.status);

    // Cabang jembatan (satu-satunya jalan: hostname *.workers.dev + header SAH) memakai tarif cadangan.
    const bridgeEnv = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '2', ANON_ISSUE_LIMIT_BRIDGE_PER_HOUR: '30' });
    const b = [];
    for (let i = 0; i < 3; i += 1) b.push(await call(worker, bridgeEnv.env, { base: WORKERS_DEV, edge: EDGE_SECRET }));
    assert(b.every((r) => r.status === 200),
      '(a5) di belakang jembatan (workers.dev + header sah) tiga penerbitan lolos: tarif CADANGAN 30, bukan 2 — status ' + b.map((r) => r.status).join(','));

    // Tanpa header sah, workers.dev tetap 403 (gerbang edge), jadi tarif cadangan tidak bisa dijangkau klien.
    const forged = await call(worker, bridgeEnv.env, { base: WORKERS_DEV, edge: 'palsu-' + EDGE_SECRET });
    assert(forged.status === 403, '(a6) workers.dev dengan header PALSU 403 — tarif cadangan tidak bisa dijangkau tanpa secret, dapat ' + forged.status);

    // Pembatas benar-benar PER-IP.
    const perIp = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '1' });
    const a1 = await call(worker, perIp.env, { ip: IP_A });
    const a2 = await call(worker, perIp.env, { ip: IP_A });
    const other = await call(worker, perIp.env, { ip: IP_B });
    assert(a1.status === 200 && a2.status === 429, '(a7) IP yang sama kena batas pada penerbitan ke-2 (batas 1)');
    assert(other.status === 200, '(a7) IP LAIN punya ember sendiri (batas per-IP, bukan global), dapat ' + other.status);
  }

  /* ======================================================================
   * (b) AMPLOP 429 TIDAK MEMBOCORKAN RIWAYAT
   * ==================================================================== */
  {
    const { env } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '1' });
    await call(worker, env, { ip: IP_A });                       // terbit 1x
    const blocked = await call(worker, env, { ip: IP_A });
    assert(blocked.status === 429, '(b1) melewati batas menjawab 429, dapat ' + blocked.status);
    assert(blocked.json && blocked.json.error === 'rate_limited', '(b1) memakai galat baku rate_limited dari errors.js');
    const keys = Object.keys(blocked.json || {}).sort().join(',');
    assert(keys === 'error,retryAfter', '(b2) amplop 429 HANYA {error,retryAfter}, dapat: ' + keys);
    const forbidden = ['issued', 'remaining', 'limit', 'count', 'resetAt', 'window', 'ip', 'ipHmac', 'first', 'seen', 'bucket'];
    const leaked = forbidden.filter((k) => new RegExp('"' + k + '"', 'i').test(blocked.text));
    assert(leaked.length === 0, '(b2) amplop 429 nol field turunan riwayat, bocor: ' + leaked.join(','));
    assert(Number(blocked.json.retryAfter) === mod.RETRY_AFTER_S && mod.RETRY_AFTER_S > 0,
      '(b3) retryAfter = KONSTANTA lebar ember (' + mod.RETRY_AFTER_S + ' s), bukan sisa waktu yang membocorkan kapan IP terakhir terbit');
    assert(!blocked.setCookie, '(b4) penolakan TIDAK menerbitkan cookie identitas');

    // Dua penolakan pada MENIT berbeda harus byte-identik: kalau retryAfter dihitung
    // dari sisa jam (perilaku versi lama), keduanya akan berbeda dan menjadi oracle waktu.
    const later = Object.assign({}, env, { TEST_CLOCK_MS: String(Date.parse(CLOCK_ISO) + 4 * 60000) });
    const blocked2 = await call(worker, later, { ip: IP_A });
    assert(blocked2.status === 429 && blocked2.text === blocked.text,
      '(b5) penolakan 4 menit kemudian byte-identik (nol oracle waktu): ' + blocked2.text);
    assert(blocked2.response.headers.get('retry-after') === blocked.response.headers.get('retry-after'),
      '(b5) header Retry-After identik pada dua menit berbeda');

    // Amplop penolakan di MODE DEGRADASI juga identik (sebab tidak boleh terbaca klien).
    const down = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '1', ANON_ISSUE_LIMIT_DEGRADED_PER_HOUR: '1' }, { mode: 'throw-anon' });
    mod.resetAnonRateLimitForTests();
    await call(worker, down.env, { ip: IP_A });
    const degradedBlocked = await call(worker, down.env, { ip: IP_A });
    assert(degradedBlocked.status === 429 && degradedBlocked.text === blocked.text,
      '(b6) penolakan mode degradasi byte-identik dengan penolakan normal (sebab tidak bocor)');
  }

  /* ======================================================================
   * (c) JITTER MASIH ADA DAN MASIH MENYELIMUTI SEMUA RESPONS
   * ==================================================================== */
  {
    assert(typeof mod.anonJitter === 'function', '(c1) anonJitter() masih diekspor');
    assert(mod.ANON_JITTER_MAX_MS_DEFAULT === 150, '(c1) default jitter tetap 150 ms, dapat ' + mod.ANON_JITTER_MAX_MS_DEFAULT);
    assert(/waktu respons|oracle/i.test(SRC) && /anonJitter/.test(CODE), '(c2) alasan jitter (anti-oracle waktu) tetap tertulis di kode');

    const t0 = Date.now();
    await mod.anonJitter({ ANON_JITTER_MAX_MS: '40' });
    const spent = Date.now() - t0;
    assert(spent >= 0 && spent <= 400, '(c3) jitter menunda dalam rentang yang wajar (' + spent + ' ms)');
    const t1 = Date.now();
    await mod.anonJitter({ ANON_JITTER_MAX_MS: '0' });
    assert(Date.now() - t1 < 30, '(c3) ANON_JITTER_MAX_MS="0" mematikan jitter (determinisme harness)');

    // Rute anon memanggil jitter SEKALI, MENYELIMUTI hasil apa pun — jadi 200 dan 429
    // sama-sama terkena. Kalau jitter dipindah ke dalam salah satu cabang, ia menjadi oracle.
    // Jitter harus TANPA SYARAT: baris pemanggilnya tidak boleh punya `if`, `?`,
    // atau `&&` di depannya. Jitter yang hanya berlaku pada 200 justru MEMBUAT
    // oracle (respons cepat = ditolak), bukan menutupnya.
    const jitterLines = ROUTE_AUTH.split('\n').map((l) => l.trim()).filter((l) => l.includes('anonJitter(ctx.env)'));
    assert(jitterLines.length === 1 && jitterLines[0] === 'await anonJitter(ctx.env);',
      '(c4) jitter dipanggil TANPA SYARAT untuk semua respons rute anon, dapat: ' + JSON.stringify(jitterLines));
    assert(/const response = await routeAuthAnonInner\(ctx\);\s*\n\s*await anonJitter\(ctx\.env\);\s*\n\s*return response;/.test(ROUTE_AUTH),
      '(c4) urutannya: jalankan rute -> jitter -> kembalikan respons (satu jalur keluar, bukan per cabang)');
    const jitterCalls = (ROUTE_AUTH.match(/anonJitter\(/g) || []).length;
    assert(jitterCalls === 1, '(c4) tepat SATU titik pemanggilan jitter di route-auth.js, dapat ' + jitterCalls);
  }

  /* ======================================================================
   * (d) D1 GALAT — DIUJI DUA ARAH
   * ==================================================================== */
  {
    // Arah 1: pembatas TIDAK hilang, tetapi penerbitan tetap mungkin (ketersediaan
    // belajar menang) sampai batas DEGRADASI.
    const down = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '15' }, { mode: 'throw-anon' });
    mod.resetAnonRateLimitForTests();
    const statuses = [];
    for (let i = 0; i < 8; i += 1) statuses.push((await call(worker, down.env, { ip: IP_A })).status);
    const ok = statuses.filter((s) => s === 200).length;
    const denied = statuses.filter((s) => s === 429).length;
    assert(ok === mod.ANON_ISSUE_LIMIT_DEGRADED_DEFAULT,
      '(d1) saat D1 melempar, penerbitan MASIH mungkin tepat sampai batas degradasi (' + mod.ANON_ISSUE_LIMIT_DEGRADED_DEFAULT + '), dapat ' + ok);
    assert(denied === 8 - mod.ANON_ISSUE_LIMIT_DEGRADED_DEFAULT,
      '(d2) sesudah batas degradasi, D1 yang mati TIDAK menjadi pembatas yang hilang: sisanya 429, dapat ' + denied);
    assert(ok < 15, '(d2) batas saat degradasi lebih RAPAT daripada batas normal (bukan fail-open bernama lain)');

    // Batas degradasi tidak pernah melampaui batas normal, walau var-nya disetel besar.
    assert(mod.anonIssueDegradedLimit({ env: { ANON_ISSUE_LIMIT_PER_HOUR: '2', ANON_ISSUE_LIMIT_DEGRADED_PER_HOUR: '50' }, edgePath: 'custom-domain' }) === 2,
      '(d3) batas degradasi dijepit oleh batas normal (2), bukan 50');
    assert(mod.anonIssueDegradedLimit({ env: { ANON_ISSUE_LIMIT_PER_HOUR: '0' }, edgePath: 'custom-domain' }) === 0,
      '(d3) pembatas yang dimatikan eksplisit (0) tetap mati di mode degradasi — keputusan owner tidak dibalik diam-diam');

    // Keputusannya WAJIB tertulis di kode, termasuk posisinya terhadap preseden repo.
    assert(/fail-closed terhadap PEMBATAS/i.test(SRC), '(d4) keputusan D1-galat tertulis eksplisit di rate-anon.js');
    assert(/ai-account-budget\.js/.test(SRC) && /quota-store-d1\.js/.test(SRC),
      '(d4) kode menyebut preseden repo yang dibandingkan (ai-account-budget fail-closed keras, quota-store-d1 store_unavailable)');
  }

  /* ======================================================================
   * (e) JENDELA BERGULIR, BUKAN RESET DI MENIT KE-0
   * ==================================================================== */
  {
    assert(mod.WINDOW_BUCKETS * mod.BUCKET_MS === 3600000,
      '(e1) jendela = WINDOW_BUCKETS x BUCKET_MS = 1 jam, dapat ' + (mod.WINDOW_BUCKETS * mod.BUCKET_MS) + ' ms');
    assert(mod.WINDOW_BUCKETS >= 6, '(e1) minimal 6 ember/jam (granularitas <= 10 menit), dapat ' + mod.WINDOW_BUCKETS);
    const keysAtBoundary = mod.windowKeys(Date.parse('2026-08-28T10:00:30.000Z'));
    assert(keysAtBoundary.includes('2026-08-28T09:50') && keysAtBoundary.includes('2026-08-28T09:20'),
      '(e2) jendela di 10:00:30 MASIH memuat ember jam sebelumnya: ' + keysAtBoundary.join(' '));
    assert(mod.bucketKey(Date.parse('2026-08-28T09:59:59.000Z')) === '2026-08-28T09:50',
      '(e2) kunci ember berbentuk tanggal-jam-menit (bisa dibandingkan cron retensi `day < :cutoff`)');
    assert(!/HOUR_MS/.test(CODE), '(e2) tidak ada lagi ember per JAM penuh (HOUR_MS) di kode');

    // Bukti perilaku: penuhi batas di 09:52, lalu lewati batas jam ke 10:01.
    const rolling = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '2' });
    const first = await call(worker, rolling.env, { ip: IP_A });
    const second = await call(worker, rolling.env, { ip: IP_A });
    assert(first.status === 200 && second.status === 200, '(e3) dua penerbitan pertama pada 09:52 lolos');
    const afterHourFlip = Object.assign({}, rolling.env, { TEST_CLOCK_MS: String(Date.parse('2026-08-28T10:01:00.000Z')) });
    const flipped = await call(worker, afterHourFlip, { ip: IP_A });
    assert(flipped.status === 429,
      '(e4) SESUDAH pergantian jam (10:01) penghitung TIDAK reset — penyerang tidak bisa cukup menunggu menit ke-0, dapat ' + flipped.status);
    const afterWindow = Object.assign({}, rolling.env, { TEST_CLOCK_MS: String(Date.parse('2026-08-28T10:55:00.000Z')) });
    const freed = await call(worker, afterWindow, { ip: IP_A });
    assert(freed.status === 200,
      '(e5) sesudah ember tertua benar-benar keluar dari jendela (10:55), penerbitan lolos lagi, dapat ' + freed.status);
  }

  /* ======================================================================
   * (f) PRIVASI KUNCI: HMAC(RATE_SALT), NOL IP MENTAH
   * ==================================================================== */
  {
    const { env, db, kv } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '3' });
    const logText = await captureConsole(async () => {
      await call(worker, env, { ip: IP_A });
      await call(worker, env, { ip: IP_A });
      await call(worker, env, { ip: IP_A });
      await call(worker, env, { ip: IP_A }); // yang ke-4 ditolak
    });
    const binds = JSON.stringify(db._log);
    assert(!binds.includes(IP_A), '(f1) NOL IP mentah pernah di-bind ke pernyataan D1');
    assert(!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(binds), '(f1) nol pola IPv4 apa pun di log bind D1');
    assert(!logText.includes(IP_A), '(f2) NOL IP mentah pernah keluar ke console/log Worker');
    assert(kv.calls.put.length === 0, '(f3) jalur penerbitan tetap NOL tulis KV (plan gratis 1.000 tulis/hari)');

    const anonBinds = db._log.filter((e) => /anon_issue/i.test(e.sql));
    assert(anonBinds.length > 0, '(f4) pembatas benar-benar menyentuh tabel anon_issue');
    const hashes = new Set();
    for (const entry of anonBinds) for (const b of entry.binds) if (/^[0-9a-f]{32}$/.test(String(b))) hashes.add(String(b));
    assert(hashes.size === 1, '(f4) ip_hmac 32 hex (128 bit) dan stabil untuk satu IP dalam satu hari, dapat ' + hashes.size + ' nilai');

    // Salt BENAR-BENAR dipakai: RATE_SALT berbeda -> ember berbeda -> izin baru.
    const saltA = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '1', RATE_SALT: 'salt-satu' });
    const saltB = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET, ANON_ISSUE_LIMIT_PER_HOUR: '1', RATE_SALT: 'salt-dua' });
    await call(worker, saltA.env, { ip: IP_A });
    await call(worker, saltB.env, { ip: IP_A });
    const hashOf = (fake) => String((fake._log.filter((e) => /anon_issue/i.test(e.sql))[0].binds).find((b) => /^[0-9a-f]{32}$/.test(String(b))));
    assert(hashOf(saltA.db) !== hashOf(saltB.db), '(f5) RATE_SALT benar-benar masuk HMAC: salt berbeda -> ip_hmac berbeda');
    assert(/RATE_SALT/.test(SRC) && /IDENTITY_PEPPER/.test(SRC),
      '(f5) urutan salt terdokumentasi di kode: RATE_SALT lalu IDENTITY_PEPPER (kompatibilitas) lalu garam konstanta');
    assert(mod.rateSaltOf({ RATE_SALT: 'a', IDENTITY_PEPPER: 'b' }) === 'a' && mod.rateSaltOf({ IDENTITY_PEPPER: 'b' }) === 'b',
      '(f5) rateSaltOf memilih RATE_SALT lebih dulu, IDENTITY_PEPPER sebagai cadangan');
    assert(mod.rateSaltOf({}).length > 0, '(f5) tanpa secret apa pun tetap ada garam konstanta (IP tetap tidak mentah)');
  }

  /* ======================================================================
   * (g) LAPISAN KEDUA — plafon neuron tingkat AKUN (verifikasi, nol edit)
   * ==================================================================== */
  {
    const budget = await harness.loadWorkerSource(transformModule('ai/ai-account-budget.js'));
    const wiring = mustRead(path.join(API_DIR, 'route-wiring.js'), 'workers/api/route-wiring.js');
    const routeAi = mustRead(path.join(API_DIR, 'ai', 'route-ai.js'), 'workers/api/ai/route-ai.js');

    assert(fs.existsSync(path.join(API_DIR, 'migrations', '0005_ai_account_budget.sql')),
      '(g1) migrasi 0005_ai_account_budget.sql ada');
    const noDb = await budget.reserveAccountNeurons({ db: null, env: {}, neurons: 60, now: Date.parse(CLOCK_ISO) });
    assert(noDb.allowed === false && noDb.reason === 'ai_budget_store_missing', '(g2) tanpa binding D1: TOLAK (fail-closed)');
    const throwing = { prepare() { return { bind() { return this; }, async run() { throw new Error('D1_DOWN'); }, async first() { throw new Error('D1_DOWN'); } }; } };
    const broken = await budget.reserveAccountNeurons({ db: throwing, env: {}, neurons: 60, now: Date.parse(CLOCK_ISO) });
    assert(broken.allowed === false && broken.reason === 'ai_budget_unreadable', '(g2) D1 melempar / tabel belum ada: TOLAK (fail-closed)');
    assert(budget.accountCapNeurons({ GLOBAL_NEURON_CAP: '80000' }) <= 10000,
      '(g3) var GLOBAL_NEURON_CAP yang salah tulis TIDAK bisa membuka plafon di atas jatah akun');
    assert(budget.accountCapNeurons({ GLOBAL_NEURON_CAP: '8000' }) === 8000, '(g3) plafon efektif memakai var yang sah (8.000)');
    assert(/WHERE day = \?1 AND neurons \+ \?2 <= \?4/.test(budget.ACCOUNT_SQL.reserve),
      '(g4) reservasi neuron ATOMIK: syarat plafon ada di dalam WHERE, bukan baca-lalu-tulis');
    assert(/accountBudget/.test(wiring) && /reserveAccountNeurons/.test(wiring),
      '(g5) route-wiring.js benar-benar MENYUNTIKKAN pagar akun ke deps AI (bukan modul yang tidak dipanggil siapa pun)');
    assert(/if \(!budget \|\| budget\.allowed !== true\)/.test(routeAi),
      '(g5) route-ai.js MENOLAK ketika pagar akun menjawab tidak-boleh');

    // CELAH YANG DULU DITEMUKAN DI SINI SUDAH DITAMBAL PAKET S2: pagar akun tidak lagi
    // opsional per pemanggil. Assert-nya DIBALIK arah sengaja — assert lama menuntut
    // literal `typeof deps.accountBudget === 'function'` TETAP ADA, jadi begitu celahnya
    // ditambal assert itu berubah fungsi menjadi PENJAGA CELAH: ia akan merah pada
    // perbaikannya dan hijau pada kerusakannya. Itu gerbang yang bekerja untuk lawan.
    assert(/if \(!budgetFn\) return budgetDenied\([^)]*'ai_budget_dep_missing'/.test(routeAi),
      '(g6) pagar akun WAJIB: dep hilang = TOLAK 503 (ai_budget_dep_missing), bukan dilayani diam-diam');
    assert(/quotaCharged: false/.test(routeAi),
      '(g6) penolakan plafon tidak menagih jatah murid (quotaCharged:false)');
    const report = mustRead(path.join(ROOT, 'reports', 'work-s1-auth-anon.md'), 'reports/work-s1-auth-anon.md');
    assert(/deps\.accountBudget/.test(report), '(g6) celah dep-opsional itu tertulis di reports/work-s1-auth-anon.md');
    const s2report = mustRead(path.join(ROOT, 'reports', 'work-s2-account-cap.md'), 'reports/work-s2-account-cap.md');
    assert(/ai-account-cap-gate-test\.js/.test(s2report),
      '(g6) penambalannya punya gerbang sendiri yang disebut di reports/work-s2-account-cap.md');
    assert(/Turnstile/i.test(report) && /WAF/i.test(report),
      '(g7) laporan menyebut apa yang MASIH tidak tertutup (serangan tersebar) dan alatnya (WAF rate-rule / Turnstile)');
  }

  /* ======================================================================
   * (h) Gerbang ini benar-benar terdaftar di CI
   * ==================================================================== */
  {
    const workflow = mustRead(path.join(ROOT, '.github', 'workflows', 'quality.yml'), '.github/workflows/quality.yml');
    assert(/node rate-anon-test\.js/.test(workflow), '(h) quality.yml memanggil node rate-anon-test.js');
  }

  /* ---------- Laporan ---------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  fs.writeFileSync(path.join(ROOT, 'RATE-ANON-REPORT.json'), JSON.stringify({
    schema: 'fiezel-rate-anon-report-v1',
    generatedAt: new Date().toISOString(),
    pass: failures === 0,
    counts: { pass: passed, fail: failures, total: results.length },
    decision: {
      strictPerIpPerRollingHour: 15,
      bridgeFallbackPerHour: 30,
      degradedPerRollingHour: 5,
      branchSignal: 'ctx.edgePath dari mw-edge.js (bukan header klien, bukan ada/tidaknya Secret)',
      window: { bucketMs: 600000, buckets: 6, rolling: true },
      retryAfterSeconds: 600,
      d1FailurePolicy: 'fail-closed terhadap pembatas: ember per-isolate dengan batas diperketat, tidak pernah fail-open',
      saltOrder: ['RATE_SALT', 'IDENTITY_PEPPER', 'konstanta'],
      layerTwo: 'workers/api/ai/ai-account-budget.js terpasang + fail-closed; celah: dep opsional per pemanggil'
    },
    checks: results
  }, null, 2) + '\n');
  console.log('rate-anon-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('rate-anon-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('rate-anon-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
