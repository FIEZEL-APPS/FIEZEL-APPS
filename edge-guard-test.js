/**
 * edge-guard-test.js — GERBANG penjaga jembatan edge (`X-Fiezel-Edge`).
 *
 * Node murni, nol dependency, nol jaringan, nol berkas temporer. Ia MENJALANKAN
 * Worker `workers/api/` yang sungguhan (graf ESM dirakit menjadi data: URL, lalu
 * dimuat lewat `tools/cf-test-harness.js` `loadWorkerSource`), bukan menguji
 * salinan logika.
 *
 * ==========================================================================
 * APA YANG DIJAGA, DAN KENAPA MASING-MASING PENTING
 * ==========================================================================
 * (a) Dengan `EDGE_SHARED_SECRET` terpasang, permintaan TANPA header ditolak 403.
 *     Tanpa ini, `https://fiezel-api.fitrajft.workers.dev` terbuka: siapa pun bisa
 *     `POST /api/auth/anon` langsung, melewati jembatan `api.fiezel.my.id`,
 *     menulis baris D1 (`identity`, `anon_issue`) tanpa batas, dan tiap identitas
 *     baru membawa jatah gratisnya sendiri.
 * (b) Header SALAH juga 403 — dan bentuk galatnya IDENTIK dengan (a). Perbedaan
 *     bentuk = oracle gratis: penyerang bisa membedakan "secret terpasang, punyamu
 *     salah" dari "tidak diperiksa".
 * (c) Header BENAR diteruskan: rute jalan seperti biasa, dan path yang tidak ada
 *     mendapat 404 (bukan 403) — bukti gerbang benar-benar dilewati, bukan
 *     kebetulan meloloskan satu rute.
 * (d) Perbandingannya WAKTU-KONSTAN. Dipindai dari kode: `mw-edge.js` harus punya
 *     `ctEq()` dan TIDAK BOLEH menerapkan operator kesetaraan langsung pada nilai
 *     header/secret. Operator biasa berhenti pada byte pertama yang beda, jadi
 *     waktunya membocorkan panjang prefiks yang cocok — dan header ini bisa dicoba
 *     tanpa batas.
 * (e) TANPA secret gerbang FAIL-CLOSED (audit D3 HIGH-3): semua rute kecuali
 *     `/healthz` ditolak 403 dengan bentuk galat IDENTIK dengan (a)/(b) — deploy
 *     yang lupa memasang secret menghasilkan API yang diam, bukan yang terbuka.
 *     Pengecualian eksplisit `ALLOW_NO_EDGE_SECRET="true"` (dan HANYA string
 *     persis itu) membuka mode `off` lama untuk dev/masa transisi, dengan
 *     peringatan di log dan `/health` melaporkan `edgeGuard:"off"` — jujur,
 *     bukan diam.
 * (f) Jalur bebas-header yang diputuskan (`/healthz`) TIDAK membocorkan
 *     `capabilities` (atau nama layanan/versi/mode gateway/waktu server).
 *     Keputusan yang dijaga di sini: `/health` TETAP DILINDUNGI justru karena ia
 *     mengumumkan `capabilities`, dan daftar itu adalah peta permukaan serang.
 * (g) `deploy/edge/api-index.php` TIDAK memuat nilai secret sungguhan — hanya
 *     placeholder `__EDGE_SECRET__`. Dipindai dengan pola panjang-acak, bukan
 *     dengan mencari satu string yang sudah diketahui (yang sudah diketahui tidak
 *     perlu dijaga).
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./tools/cf-test-harness.js');

const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'workers', 'api');
const DEPLOY_DIR = path.join(ROOT, 'deploy', 'edge');

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
 * Pola sama dengan cf-api-contract-test.js (impor relatif tidak punya base di
 * data URL, jadi tiap `from './x.js'` diganti data URL modul itu). Root-nya
 * dimuat lewat `harness.loadWorkerSource` supaya loader tetap SATU implementasi
 * bersama, bukan salinan yang bisa menyimpang.
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
  MODULE_CACHE.set(name, null); // penjaga sirkular
  const url = 'data:text/javascript;base64,' + Buffer.from(transformModule(name), 'utf8').toString('base64');
  MODULE_CACHE.set(name, url);
  return url;
}

/* ==========================================================================
 * Env + pemanggil
 * ======================================================================== */

const ORIGIN = 'https://fiezel.my.id';
const WORKERS_DEV = 'https://fiezel-api.fitrajft.workers.dev';
const EDGE_SECRET = 'uji-edge-secret-jembatan-0123456789abcdef';

/**
 * `makeEnv` harness dipakai untuk binding (D1/KV/R2/AI palsu yang MENCATAT
 * panggilannya), lalu vars khusus API ditambahkan. Itu penting untuk butir (a):
 * gerbang harus menolak SEBELUM satu tulis D1 pun terjadi, dan satu-satunya cara
 * membuktikannya adalah dengan D1 yang mencatat.
 */
function makeEnv(vars) {
  const built = harness.makeEnv({ clock: harness.fakeClock('2026-08-27T15:00:00.000Z') });
  const env = Object.assign(built.env, {
    SERVICE_NAME: 'fiezel-api',
    API_VERSION: 'cf-api-1',
    AI_GATEWAY_MODE: 'core-only',
    ALLOWED_ORIGINS: 'https://fiezel.my.id,https://www.fiezel.my.id',
    COOKIE_DOMAIN: 'fiezel.my.id',
    FEATURE_AI: 'off',
    FEATURE_TTS: 'off',
    SESSION_HMAC_KEY_CURRENT: 'uji-secret-cookie-current-0123456789',
    SESSION_HMAC_KEY_PREVIOUS: 'uji-secret-cookie-previous-0123456789',
    TEST_CLOCK_MS: String(built.clock.now()),
    CORE_DB: built.env.DB,
    CFG: built.env.KV
  }, vars || {});
  return { env, built };
}

async function call(worker, env, method, pathname, opt) {
  const options = opt || {};
  const headers = new Headers(options.headers || {});
  if (options.origin) headers.set('origin', options.origin);
  if (options.edge !== undefined && options.edge !== null) headers.set('x-fiezel-edge', options.edge);
  const init = { method, headers };
  if (options.body !== undefined) {
    init.body = options.body;
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
  }
  const base = options.base || WORKERS_DEV;
  const response = await worker.fetch(new Request(base + pathname, init), env, {
    waitUntil() {}, passThroughOnException() {}
  });
  const text = await response.clone().text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
  return { response, status: response.status, text, json };
}

/* ==========================================================================
 * MAIN
 * ======================================================================== */

(async () => {
  /* ---------- 0. Berkas wajib --------------------------------------------- */
  assert(fs.existsSync(path.join(API_DIR, 'mw-edge.js')), 'workers/api/mw-edge.js ada');
  assert(fs.existsSync(path.join(DEPLOY_DIR, 'api-index.php')), 'deploy/edge/api-index.php ada');
  assert(fs.existsSync(path.join(DEPLOY_DIR, 'README.md')), 'deploy/edge/README.md ada');

  const worker = (await harness.loadWorkerSource(transformModule('index.js'))).default;
  assert(worker && typeof worker.fetch === 'function', 'Worker mengekspor default.fetch');

  /* ---------- (a) secret terpasang, TANPA header -> 403 -------------------- */
  {
    const { env, built } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET });

    const health = await call(worker, env, 'GET', '/health');
    assert(health.status === 403, '(a) GET /health tanpa header X-Fiezel-Edge ditolak 403, dapat ' + health.status);
    assert(health.json && health.json.error === 'forbidden_edge', '(a) galat bernama forbidden_edge');
    assert(!/capabilit/i.test(health.text), '(a) penolakan tidak membocorkan capabilities');
    assert(!/EDGE_SHARED_SECRET|workers\.dev|X-Fiezel-Edge/i.test(health.text),
      '(a) penolakan tidak menyebut nama secret, nama header, atau alamat jembatan');

    // Jalur yang paling mahal kalau terbuka: penerbitan identitas anonim.
    const anon = await call(worker, env, 'POST', '/api/auth/anon', { origin: ORIGIN, body: '{}' });
    assert(anon.status === 403, '(a) POST /api/auth/anon tanpa header ditolak 403, dapat ' + anon.status);
    assert(!anon.response.headers.get('set-cookie'), '(a) penolakan tidak pernah menerbitkan cookie identitas');

    // Inti kerugian yang dicegah: nol tulis D1, nol tulis KV pada penolakan.
    const d1Writes = built.d1 && built.d1._log
      ? built.d1._log.filter((e) => /^(INSERT|UPDATE|DELETE)/i.test(String(e.sql || '')))
      : [];
    assert(d1Writes.length === 0, '(a) penolakan tidak menulis satu baris pun ke D1, dapat ' + d1Writes.length);
    const kvPuts = (built.kv && built.kv.calls && built.kv.calls.put) || [];
    assert(kvPuts.length === 0, '(a) penolakan tidak menulis ke KV, dapat ' + kvPuts.length);

    // Semua rute berbiaya ikut tertutup, bukan hanya yang diingat.
    for (const [method, route] of [
      ['GET', '/api/config'], ['GET', '/api/user/me'], ['GET', '/api/quota'],
      ['POST', '/api/auth/claim'], ['POST', '/api/ai/task'], ['POST', '/api/tts/render'],
      ['GET', '/api/tts/manifest'], ['POST', '/api/usage/events']
    ]) {
      const r = await call(worker, env, method, route,
        method === 'GET' ? { origin: ORIGIN } : { origin: ORIGIN, body: '{}' });
      assert(r.status === 403, '(a) ' + method + ' ' + route + ' tanpa header ditolak 403, dapat ' + r.status);
    }
  }

  /* ---------- (b) header SALAH -> 403, bentuk identik --------------------- */
  {
    const { env } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET });
    const none = await call(worker, env, 'GET', '/health');
    const wrong = await call(worker, env, 'GET', '/health', { edge: 'salah-sekali' });
    const empty = await call(worker, env, 'GET', '/health', { edge: '' });
    // Prefiks yang benar tapi tidak lengkap: kelas serangan yang justru dilayani
    // perbandingan non-waktu-konstan.
    const prefix = await call(worker, env, 'GET', '/health', { edge: EDGE_SECRET.slice(0, -1) });
    const longer = await call(worker, env, 'GET', '/health', { edge: EDGE_SECRET + 'x' });

    assert(wrong.status === 403, '(b) header salah ditolak 403, dapat ' + wrong.status);
    assert(empty.status === 403, '(b) header kosong ditolak 403, dapat ' + empty.status);
    assert(prefix.status === 403, '(b) header berprefiks benar tapi terpotong ditolak 403, dapat ' + prefix.status);
    assert(longer.status === 403, '(b) header lebih panjang dari secret ditolak 403, dapat ' + longer.status);
    assert(wrong.text === none.text && empty.text === none.text && prefix.text === none.text,
      '(b) bentuk galat IDENTIK untuk header tidak ada / salah / kosong / prefiks (anti-oracle)');
  }

  /* ---------- (c) header BENAR diteruskan --------------------------------- */
  {
    const { env } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET });
    const health = await call(worker, env, 'GET', '/health', { edge: EDGE_SECRET, origin: ORIGIN });
    assert(health.status === 200, '(c) header benar diteruskan: /health 200, dapat ' + health.status);
    assert(health.json && health.json.protocol === '1.7', '(c) protokol tetap 1.7 lewat gerbang');
    assert(health.json && health.json.edgeGuard === 'on', '(c) /health melaporkan edgeGuard:"on" saat secret terpasang');
    assert(Array.isArray(health.json && health.json.capabilities) && health.json.capabilities.length > 0,
      '(c) /health yang lolos tetap memuat capabilities (jadi ia memang layak dilindungi)');

    // Bukti gerbang DILEWATI, bukan kebetulan meloloskan satu rute: path yang
    // tidak ada harus 404, dan metode salah harus 405 — keduanya keputusan
    // router, yang hanya bisa tercapai kalau [M-1] mengembalikan null.
    const missing = await call(worker, env, 'GET', '/rute-yang-tidak-ada', { edge: EDGE_SECRET, origin: ORIGIN });
    assert(missing.status === 404, '(c) path tak dikenal dengan header benar = 404 (bukan 403), dapat ' + missing.status);
    const wrongMethod = await call(worker, env, 'POST', '/health', { edge: EDGE_SECRET, origin: ORIGIN, body: '{}' });
    assert(wrongMethod.status === 405, '(c) metode salah dengan header benar = 405, dapat ' + wrongMethod.status);

    // Gerbang jembatan TIDAK menggantikan gerbang origin: origin asing tetap 403
    // forbidden_origin walau header jembatan benar (dua lapisan, bukan satu).
    const alien = await call(worker, env, 'GET', '/api/config', { edge: EDGE_SECRET, origin: 'https://jahat.example' });
    assert(alien.status === 403 && alien.json && alien.json.error === 'forbidden_origin',
      '(c) origin asing tetap ditolak forbidden_origin walau header jembatan benar');

    // Nama header tidak boleh peka huruf besar/kecil (proxy PHP mengirim
    // `X-Fiezel-Edge`, HTTP/2 mengirimnya huruf kecil).
    const mixed = await call(worker, env, 'GET', '/health', {
      headers: { 'X-FIEZEL-EDGE': EDGE_SECRET }, origin: ORIGIN
    });
    assert(mixed.status === 200, '(c) nama header tidak peka huruf besar/kecil, dapat ' + mixed.status);
  }

  /* ---------- (d) perbandingan waktu-konstan (pindai kode) ---------------- */
  {
    const src = mustRead(path.join(API_DIR, 'mw-edge.js'), 'workers/api/mw-edge.js');
    assert(/function\s+ctEq\s*\(/.test(src), '(d) mw-edge.js mendefinisikan ctEq()');
    assert(/ctEq\(\s*presented\s*,/.test(src), '(d) header rahasia dibandingkan lewat ctEq(presented, ...)');

    // Kode saja, tanpa komentar/string: komentar SENGAJA menyebut "===" untuk
    // menjelaskan kenapa ia dilarang, dan itu tidak boleh memerahkan gerbang.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');

    const SECRET_IDENTIFIERS = /(presented|configured|edgeSecret|EDGE_SHARED_SECRET|EDGE_HEADER)/;
    const offenders = codeOnly.split('\n').filter((line) => {
      if (!/(===|!==|==|!=)/.test(line)) return false;
      return SECRET_IDENTIFIERS.test(line);
    });
    assert(offenders.length === 0,
      '(d) tidak ada operator kesetaraan langsung pada nilai rahasia di mw-edge.js: ' + (offenders.join(' | ') || '0'));

    // Dan tidak ada jalur pintas lewat perbandingan hasil `headers.get(...)`.
    assert(!/headers\.get\([^)]*\)\s*(===|!==|==|!=)/.test(codeOnly),
      '(d) hasil headers.get() tidak pernah dibandingkan dengan operator kesetaraan');

    // ctEq harus benar-benar konstan-waktu secara bentuk: satu loop atas panjang
    // maksimum, akumulasi XOR, tanpa `return` dini di dalam loop.
    const body = /function\s+ctEq\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(src);
    assert(!!body, '(d) badan ctEq bisa dibaca gerbang');
    if (body) {
      assert(/Math\.max\(/.test(body[1]), '(d) ctEq mengiterasi panjang MAKSIMUM kedua masukan');
      assert(/\^=|\|=/.test(body[1]), '(d) ctEq mengakumulasi selisih dengan XOR/OR, bukan keluar dini');
      assert(!/\breturn\b[\s\S]*?\bfor\b/.test(body[1]) || !/for[\s\S]*?\breturn\b[^\n]*\n[\s\S]*?\}/.test(body[1])
        || /for\s*\([^)]*\)\s*diff/.test(body[1]),
        '(d) ctEq tidak keluar dari loop pada byte pertama yang berbeda');
    }

    // Bukti bahwa ctEq memang membandingkan benar (bukan selalu true/false) —
    // perbandingan yang aman tapi salah lebih buruk daripada tidak ada.
    const mod = await import(inlineModule('mw-edge.js'));
    assert(mod.ctEq('abc', 'abc') === true, '(d) ctEq cocok untuk nilai identik');
    assert(mod.ctEq('abc', 'abd') === false, '(d) ctEq menolak nilai berbeda pada byte terakhir');
    assert(mod.ctEq('abc', 'abcd') === false, '(d) ctEq menolak panjang berbeda');
    assert(mod.ctEq(null, '') === false || mod.ctEq(null, 'x') === false, '(d) ctEq tidak melempar untuk header tidak ada');
    assert(mod.ctEq(null, EDGE_SECRET) === false, '(d) header tidak ada tidak pernah cocok dengan secret');
    assert(mod.EDGE_FREE_PATHS.length === 1 && mod.EDGE_FREE_PATHS[0] === '/healthz',
      '(d) daftar path bebas-header tetap satu: /healthz (' + mod.EDGE_FREE_PATHS.join(',') + ')');
  }

  /* ---------- (e) tanpa secret: FAIL-CLOSED, kecuali pengecualian eksplisit */
  {
    /* (e1) Default AMAN (audit D3 HIGH-3): tanpa secret DAN tanpa
     * ALLOW_NO_EDGE_SECRET, semua rute ditolak 403 — kecuali /healthz, supaya
     * monitor tetap bisa melihat "hidup tapi tertutup". */
    const closedLogs = [];
    const realError = console.error;
    console.error = (...args) => { closedLogs.push(args.join(' ')); };
    let closedHealth; let closedAnon; let closedHealthz; let closedBuilt; let closedBlank;
    try {
      const { env, built } = makeEnv({});
      assert(env.EDGE_SHARED_SECRET === undefined, '(e) env uji benar-benar tanpa EDGE_SHARED_SECRET');
      closedBuilt = built;
      closedHealth = await call(worker, env, 'GET', '/health', { origin: ORIGIN });
      closedAnon = await call(worker, env, 'POST', '/api/auth/anon', { origin: ORIGIN, body: '{}' });
      closedHealthz = await call(worker, env, 'GET', '/healthz');
      // Secret kosong/spasi = tidak terpasang, dan arah amannya kini TERTUTUP:
      // `wrangler secret put` yang salah tempel menghasilkan API yang diam,
      // bukan API yang terbuka diam-diam.
      const blank = makeEnv({ EDGE_SHARED_SECRET: '   ' });
      closedBlank = await call(worker, blank.env, 'GET', '/health', { origin: ORIGIN });
      // Nilai selain string persis 'true' TIDAK membuka gerbang — salinan
      // setengah jadi ('1', 'TRUE') tidak boleh diam-diam mematikan pengaman.
      const half = makeEnv({ ALLOW_NO_EDGE_SECRET: '1' });
      const halfHealth = await call(worker, half.env, 'GET', '/health', { origin: ORIGIN });
      assert(halfHealth.status === 403, '(e) ALLOW_NO_EDGE_SECRET="1" TIDAK membuka gerbang (tetap 403), dapat ' + halfHealth.status);
    } finally {
      console.error = realError;
    }
    assert(closedHealth.status === 403, '(e) tanpa secret /health FAIL-CLOSED 403, dapat ' + closedHealth.status);
    assert(closedHealth.json && closedHealth.json.error === 'forbidden_edge', '(e) penolakan fail-closed bernama forbidden_edge');
    assert(closedAnon.status === 403, '(e) tanpa secret POST /api/auth/anon ditolak 403, dapat ' + closedAnon.status);
    assert(!closedAnon.response.headers.get('set-cookie'), '(e) penolakan fail-closed tidak pernah menerbitkan cookie identitas');
    assert(closedBlank.status === 403, '(e) secret berisi spasi saja = tidak terpasang = FAIL-CLOSED 403, dapat ' + closedBlank.status);
    const closedWrites = closedBuilt.d1 && closedBuilt.d1._log
      ? closedBuilt.d1._log.filter((entry) => /^(INSERT|UPDATE|DELETE)/i.test(String(entry.sql || '')))
      : [];
    assert(closedWrites.length === 0, '(e) penolakan fail-closed nol tulis D1, dapat ' + closedWrites.length);
    assert(closedHealthz.status === 200 && closedHealthz.json && closedHealthz.json.ok === true,
      '(e) /healthz tetap hidup saat fail-closed (monitor melihat "hidup tapi tertutup"), dapat ' + closedHealthz.status);
    assert(!/EDGE_SHARED_SECRET|ALLOW_NO_EDGE_SECRET|X-Fiezel-Edge/i.test(closedHealth.text),
      '(e) penolakan fail-closed tidak menyebut nama secret, nama var pengecualian, atau nama header');
    assert(closedLogs.some((w) => /FAIL-CLOSED/.test(w) && /EDGE_SHARED_SECRET/.test(w)),
      '(e) fail-closed dicatat di log dengan instruksi memasang secret (bukan mati diam-diam)');
    assert(closedLogs.length <= 2, '(e) peringatan fail-closed tidak satu baris per permintaan, dapat ' + closedLogs.length);

    // Anti-oracle lintas mode: penolakan "secret belum dipasang" harus TIDAK BISA
    // DIBEDAKAN dari penolakan "secret terpasang, headermu salah".
    {
      const withSecret = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET });
      const onReject = await call(worker, withSecret.env, 'GET', '/health', { origin: ORIGIN });
      assert(onReject.text === closedHealth.text,
        '(e) bentuk galat fail-closed IDENTIK dengan penolakan header-salah (anti-oracle)');
    }

    /* (e2) Pengecualian eksplisit: ALLOW_NO_EDGE_SECRET="true" membuka mode
     * `off` lama — untuk dev/masa transisi SAJA, dengan peringatan di log. */
    const warnings = [];
    const realWarn = console.warn;
    console.warn = (...args) => { warnings.push(args.join(' ')); };
    let health;
    let missing;
    try {
      const { env } = makeEnv({ ALLOW_NO_EDGE_SECRET: 'true' });
      health = await call(worker, env, 'GET', '/health', { origin: ORIGIN });
      missing = await call(worker, env, 'GET', '/api/config', { origin: ORIGIN });
    } finally {
      console.warn = realWarn;
    }
    assert(health.status === 200, '(e) mode transisi eksplisit: /health tetap 200, dapat ' + health.status);
    assert(health.json && health.json.edgeGuard === 'off', '(e) /health melaporkan edgeGuard:"off" di mode transisi');
    assert(health.json && health.json.protocol === '1.7', '(e) protokol tetap 1.7 saat guard off');
    assert(missing.status !== 403, '(e) rute lain tetap jalan di mode transisi (tidak 403), dapat ' + missing.status);
    assert(warnings.some((w) => /edgeGuard=off/.test(w)),
      '(e) peringatan mode transisi dicatat lewat jalur log Worker yang sudah ada');
    assert(warnings.some((w) => /EDGE_SHARED_SECRET/.test(w) && /transisi/i.test(w)),
      '(e) peringatan menyebut secret yang harus dipasang DAN bahwa keadaan ini hanya transisi');
    assert(warnings.length <= 2, '(e) peringatan tidak satu baris per permintaan (banjir log), dapat ' + warnings.length);

    // Komentar tegas soal sifat sementara `off` wajib ada di kode, bukan hanya
    // di dokumen: yang membaca `mw-edge.js` besok belum tentu membaca runbook.
    const src = mustRead(path.join(API_DIR, 'mw-edge.js'), 'workers/api/mw-edge.js');
    assert(/masa transisi/i.test(src), '(e) mw-edge.js menyatakan `off` hanya sah selama masa transisi');
    assert(/off.*BUKAN mode produksi|BUKAN mode produksi/i.test(src), '(e) mw-edge.js menegaskan `off` bukan mode produksi');
    assert(/workers_dev\s*=\s*false|workers\.dev/i.test(src), '(e) mw-edge.js menyebut kapan `off` harus berakhir selamanya');
    assert(/FAIL-CLOSED|fail-closed/i.test(src) && /ALLOW_NO_EDGE_SECRET/.test(src),
      '(e) mw-edge.js mendokumentasikan default fail-closed DAN var pengecualiannya');
  }

  /* ---------- (f) jalur bebas-header tidak membocorkan capabilities ------- */
  {
    const { env, built } = makeEnv({ EDGE_SHARED_SECRET: EDGE_SECRET });
    const z = await call(worker, env, 'GET', '/healthz');
    assert(z.status === 200, '(f) /healthz boleh diakses tanpa header jembatan, dapat ' + z.status);
    assert(z.json && z.json.ok === true && z.json.protocol === '1.7',
      '(f) /healthz menjawab {ok:true,protocol:"1.7"}');
    assert(Object.keys(z.json || {}).sort().join(',') === 'ok,protocol',
      '(f) /healthz HANYA memuat ok+protocol, dapat: ' + Object.keys(z.json || {}).join(','));
    assert(!/capabilit/i.test(z.text), '(f) /healthz tidak membocorkan capabilities');
    assert(!/fiezel-api|core-only|free-tier|cf-api-1/i.test(z.text),
      '(f) /healthz tidak membocorkan nama layanan, versi, mode gateway, atau plan');
    assert(!/edgeGuard/i.test(z.text), '(f) /healthz tidak membocorkan status gerbang (itu oracle)');

    // Nol I/O: rute yang dipanggil monitor tiap menit tidak boleh membakar
    // anggaran D1/KV plan gratis, selamanya.
    assert(((built.kv && built.kv.calls && built.kv.calls.put) || []).length === 0, '(f) /healthz nol tulis KV');
    assert(((built.kv && built.kv.calls && built.kv.calls.get) || []).length === 0, '(f) /healthz nol baca KV');
    assert(!(built.d1 && built.d1._log && built.d1._log.length), '(f) /healthz nol query D1');

    // `/health` TETAP DILINDUNGI — inilah keputusan yang dijaga gerbang ini.
    const h = await call(worker, env, 'GET', '/health');
    assert(h.status === 403, '(f) KEPUTUSAN: /health TETAP dilindungi gerbang (403 tanpa header), dapat ' + h.status);

    // Alasannya wajib tertulis, supaya orang berikutnya tidak "menyederhanakan"
    // dengan membebaskan /health.
    const healthSrc = mustRead(path.join(API_DIR, 'route-health.js'), 'workers/api/route-health.js');
    assert(/healthz/.test(healthSrc) && /capabilit/i.test(healthSrc),
      '(f) route-health.js menuliskan alasan /health dilindungi dan /healthz ada');

    // Tidak ada path bebas-header lain yang menyelinap masuk ke Worker.
    const edgeSrc = mustRead(path.join(API_DIR, 'mw-edge.js'), 'workers/api/mw-edge.js');
    const freeList = /EDGE_FREE_PATHS\s*=\s*Object\.freeze\(\[([^\]]*)\]/.exec(edgeSrc);
    assert(!!freeList && (freeList[1].match(/'/g) || []).length === 2,
      '(f) EDGE_FREE_PATHS memuat tepat SATU path di kode');
  }

  /* ---------- (g) artefak deployment bebas nilai secret ------------------- */
  {
    const php = mustRead(path.join(DEPLOY_DIR, 'api-index.php'), 'deploy/edge/api-index.php');

    assert(php.includes('__EDGE_SECRET__'), '(g) api-index.php memakai placeholder __EDGE_SECRET__');
    assert(/EDGE_SECRET\s*=\s*'__EDGE_SECRET__'/.test(php),
      '(g) konstanta EDGE_SECRET berisi placeholder, bukan nilai');
    assert((php.match(/__EDGE_SECRET__/g) || []).length === 1,
      '(g) placeholder muncul tepat sekali (tidak ada salinan yang lupa diganti)');
    assert(/X-Fiezel-Edge/.test(php), '(g) proxy benar-benar mengirim header X-Fiezel-Edge');
    assert(/fiezel-api\.fitrajft\.workers\.dev/.test(php), '(g) proxy menunjuk Worker upstream yang benar');
    assert(/const ALLOW/.test(php) && /not_found/.test(php),
      '(g) proxy memakai allowlist endpoint dengan default TOLAK');
    assert(/sementara|SEMENTARA/.test(php), '(g) api-index.php menyatakan sifat sementaranya');

    /**
     * Pemindai nilai rahasia. Bukan mencari string yang sudah diketahui (yang
     * sudah diketahui tidak perlu dijaga), melainkan POLA nilai acak: deret
     * panjang base64url/hex yang berentropi tinggi. Kandidat diambil dari
     * seluruh berkas lalu placeholder + kata-kata biasa dibuang.
     */
    const KNOWN_SAFE = new Set(['__EDGE_SECRET__']);
    const scanSecretLike = (text) => (text.match(/[A-Za-z0-9_\-+/=]{24,}/g) || []).filter((token) => {
      if (KNOWN_SAFE.has(token)) return false;
      if (/^_+[A-Z_]+_+$/.test(token)) return false;          // placeholder gaya __X__
      if (/^[a-z_]+$/.test(token)) return false;              // identifier PHP biasa
      if (/^[A-Z_]+$/.test(token)) return false;              // KONSTANTA PHP biasa
      // Nama berpemisah yang seluruh segmennya kata (mis. `Access-Control-Allow-Origin`,
      // `fiezel_api_edge`). Nilai acak tidak pernah terurai menjadi kata-kata.
      if (token.split(/[-_+/=]/).every((seg) => seg.length > 0 && /^[A-Za-z]+$/.test(seg))) return false;
      const classes = (/[a-z]/.test(token) ? 1 : 0) + (/[A-Z]/.test(token) ? 1 : 0)
        + (/[0-9]/.test(token) ? 1 : 0) + (/[_\-+/=]/.test(token) ? 1 : 0);
      // Hex panjang adalah bentuk secret yang hanya punya DUA kelas karakter
      // (huruf kecil + angka), jadi ia harus diperlakukan khusus — kalau tidak,
      // digest 40 heksa lolos pemindai dengan mudah.
      const hexLike = /^[0-9a-f]{32,}$/.test(token);
      // Nilai acak base64url hampir selalu mencampur >=3 kelas karakter; kata dan
      // nama fungsi PHP tidak.
      if (!hexLike && classes < 3) return false;
      const unique = new Set(token.split('')).size;
      return unique >= 12; // entropi kasar: nilai acak 24+ byte, bukan kalimat
    });

    // PEMINDAI YANG TIDAK PERNAH BISA MERAH ADALAH PEMINDAI YANG BOHONG.
    // Buktikan ia menangkap secret sungguhan: tiga bentuk nilai acak yang paling
    // mungkin ter-commit (base64url, hex, base64 ber-padding) disuntikkan ke
    // salinan DI MEMORI — berkas di repo tidak disentuh.
    for (const injected of [
      'kZ8vQ2m-Lp4TxYs7Rw9NcBd1FgHj3KlMnOpQrStUvWx',
      '3f9a1c7e5b2d8046a1c3e5f7091b2d4c6e8f0a1b',
      'aGVsbG8rd29ybGQvc2VjcmV0K3ZhbHVlPT0xMjM0NTY3OA=='
    ]) {
      const poisoned = php.replace('__EDGE_SECRET__', injected);
      assert(scanSecretLike(poisoned).includes(injected),
        '(g) pemindai TERBUKTI menangkap nilai secret sungguhan berbentuk ' + injected.slice(0, 6) + '...');
    }

    const candidates = scanSecretLike(php);
    assert(candidates.length === 0,
      '(g) tidak ada nilai berpola acak (kemungkinan secret sungguhan) di api-index.php: '
      + (candidates.join(' | ') || '0'));

    // Bentuk secret yang paling mungkin ter-commit karena salah tempel.
    assert(!/EDGE_SECRET\s*=\s*'[A-Za-z0-9_\-+/=]{16,}'/.test(php.replace('__EDGE_SECRET__', '')),
      '(g) EDGE_SECRET tidak pernah berisi literal panjang');
    for (const pattern of [
      [/-{5}BEGIN [A-Z ]*PRIVATE KEY/, 'private key PEM'],
      [/\bsk-[A-Za-z0-9]{16,}/, 'kunci gaya sk-'],
      [/\beyJ[A-Za-z0-9_\-]{20,}\./, 'JWT'],
      [/\b[0-9a-f]{40,}\b/, 'hex panjang']
    ]) {
      assert(!pattern[0].test(php), '(g) api-index.php tidak memuat ' + pattern[1]);
    }

    // README pembongkaran: tanpa ini, artefak sementara menjadi permanen.
    const readme = mustRead(path.join(DEPLOY_DIR, 'README.md'), 'deploy/edge/README.md');
    for (const [pattern, label] of [
      [/SEMENTARA|sementara/, 'sifat sementara'],
      [/public suffix list/i, 'alasan cookie pihak pertama'],
      [/scp /, 'cara memasang (scp)'],
      [/chmod 644/, 'izin berkas (chmod)'],
      [/\.htaccess/, '.htaccess'],
      [/allowlist/i, 'allowlist endpoint'],
      [/PEMBONGKARAN/, 'LANGKAH PEMBONGKARAN'],
      [/workers_dev\s*=\s*false/, 'matikan workers.dev saat pembongkaran'],
      [/custom_domain\s*=\s*true|custom domain/i, 'pasang custom domain saat pembongkaran'],
      [/secret delete EDGE_SHARED_SECRET/, 'hapus secret saat pembongkaran'],
      [/2\.214|1\.051|1\.163/, 'angka latensi terukur'],
      [/titik gagal tunggal/i, 'kejujuran soal titik gagal tunggal'],
      [/audio/i, 'kenapa audio tidak lewat jembatan']
    ]) {
      assert(pattern.test(readme), '(g) deploy/edge/README.md menjelaskan ' + label);
    }
    assert(!/__EDGE_SECRET__[A-Za-z0-9]/.test(readme), '(g) README tidak menempelkan nilai ke placeholder');
    assert(!/[0-9a-f]{40,}/.test(readme), '(g) README tidak memuat nilai berpola acak');
  }

  /* ---------- Runbook: temuan lapangan + angka + kejujuran ---------------- */
  {
    const runbook = mustRead(path.join(ROOT, 'docs', 'CF-MIGRATION-RUNBOOK.md'), 'docs/CF-MIGRATION-RUNBOOK.md');
    assert(/JEMBATAN SEMENTARA/.test(runbook), 'runbook memuat bagian jembatan');
    assert(/🔄 TEMUAN LAPANGAN 27 Agu 2026 — BAGIAN INI BARU/.test(runbook),
      'bagian jembatan memakai penanda temuan lapangan yang sama dengan bagian lain');
    assert(/2\.214 ms/.test(runbook), 'runbook memuat angka latensi dingin 2.214 ms');
    assert(/1\.051/.test(runbook) && /1\.163/.test(runbook), 'runbook memuat rentang latensi hangat 1.051-1.163 ms');
    assert(/titik gagal tunggal/i.test(runbook), 'runbook jujur bahwa origin PHP menjadi titik gagal tunggal');
    assert(/aset audio TIDAK lewat jembatan|audio TIDAK lewat/i.test(runbook),
      'runbook menyatakan aset audio TIDAK lewat jembatan');
    assert(/edgeGuard/.test(runbook) && /healthz/.test(runbook),
      'runbook menjelaskan edgeGuard dan jalur /healthz');
    assert(/EDGE_SHARED_SECRET/.test(runbook), 'runbook mendaftar Secret EDGE_SHARED_SECRET');
    assert(/deploy\/edge\/api-index\.php/.test(runbook), 'runbook menunjuk artefak yang bisa diaudit');
    assert(!/[0-9a-f]{40,}/.test(runbook.split('## Bagian 2A')[1].split('## Bagian 3')[0]),
      'bagian jembatan runbook tidak memuat nilai berpola acak');
  }

  /* ---------- Pemasangan di index.js ------------------------------------- */
  {
    const index = mustRead(path.join(API_DIR, 'index.js'), 'workers/api/index.js');
    assert(/from '\.\/mw-edge\.js'/.test(index), 'index.js mengimpor mw-edge.js');
    const chain = /const MIDDLEWARE = \[([\s\S]*?)\];/.exec(index);
    assert(!!chain, 'rantai MIDDLEWARE bisa dibaca gerbang');
    if (chain) {
      const edgeAt = chain[1].indexOf('edgeGuardMiddleware');
      const guardAt = chain[1].indexOf('guardMiddleware,');
      const identityAt = chain[1].indexOf('identityMiddleware');
      assert(edgeAt >= 0, 'edgeGuardMiddleware terpasang di rantai MIDDLEWARE');
      assert(edgeAt < guardAt && edgeAt < identityAt,
        'edgeGuardMiddleware berjalan PALING LUAR (sebelum cors/origin dan identitas)');
    }
    assert(/routeHealthz/.test(index), 'index.js mendaftarkan rute /healthz');
    assert(/\['GET', '\/healthz', routeHealthz\]/.test(index), 'rute /healthz terdaftar sebagai GET literal');
  }

  /* ---------- Gerbang ini benar-benar terdaftar di CI --------------------- */
  // Gerbang yang tidak dijalankan workflow apa pun adalah gerbang yang tidak ada
  // (temuan K13, reports/cf-c1-konsistensi.md). Ia menjaga dirinya sendiri.
  {
    const workflow = mustRead(path.join(ROOT, '.github', 'workflows', 'quality.yml'), '.github/workflows/quality.yml');
    assert(/node edge-guard-test\.js/.test(workflow), 'quality.yml memanggil node edge-guard-test.js');
  }

  /* ---------- Laporan ---------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  fs.writeFileSync(path.join(ROOT, 'EDGE-GUARD-REPORT.json'), JSON.stringify({
    schema: 'fiezel-edge-guard-report-v1',
    generatedAt: new Date().toISOString(),
    pass: failures === 0,
    counts: { pass: passed, fail: failures, total: results.length },
    decision: {
      healthProtected: true,
      freeHeaderPath: '/healthz',
      reason: '/health mengumumkan capabilities (peta permukaan serang); monitor hanya butuh satu bit hidup/mati'
    },
    checks: results
  }, null, 2) + '\n');
  console.log('edge-guard-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('edge-guard-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('edge-guard-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
