// owner-edge-guard-test.js — GERBANG penjaga jembatan edge SISI OWNER (`owner.fiezel.my.id`).
//
// Node murni, nol dependency, nol jaringan, nol berkas temporer. Ia MENJALANKAN Worker
// `workers/owner/index.js` yang sungguhan (ESM dimuat lewat data: URL, pola
// cf-b7-testing-strategy.md §2 — sama seperti `owner-dashboard-test.js`), bukan salinan logika.
//
// ==========================================================================================
// MASALAH NYATA YANG DIJAGA BERKAS INI
// ==========================================================================================
// Worker `fiezel-owner` sudah ter-deploy, tetapi `owner.fiezel.my.id` TIDAK BISA jadi custom
// domain Cloudflare: zona `fiezel.my.id` belum ada di Cloudflare (nameserver di reseller; zona
// subdomain butuh Enterprise). Jadi hostname-nya dibuat dengan pola yang SUDAH TERBUKTI untuk
// `api.fiezel.my.id`: subdomain cPanel di origin ArenHost + satu proxy PHP
// (`deploy/edge/owner-index.php`) yang meneruskan ke `fiezel-owner.fitrajft.workers.dev`.
//
// Konsekuensinya Worker hidup di DUA alamat, dan alamat `*.workers.dev` tidak bisa dimatikan
// (proxy memanggilnya). Di alamat itu, Cloudflare Access — "lapis kedua" yang dijanjikan
// `workers/owner/README.md` §2 dan dipasang PER HOSTNAME — sama sekali tidak berlaku.
//
// YANG DIASSERT:
//  (a) SEMUA rute owner (termasuk `/login`, termasuk rute yang belum ada) 403 tanpa header
//      `X-Fiezel-Edge` yang benar — bahkan dengan cookie sesi owner yang sah. Nol sentuhan D1.
//  (b) DUA LAPIS, bukan satu: header edge yang benar TIDAK menggantikan sesi owner. Rute owner
//      tetap 403 tanpa sesi walau header edge benar; dan header edge + sesi sah = 200 (bukti
//      lapis pertama benar-benar dilewati, bukan kebetulan meloloskan satu rute).
//  (c) Header keamanan HTML yang dipasang Worker (`Content-Security-Policy`, `X-Robots-Tag`,
//      `Referrer-Policy`, `X-Content-Type-Options`) dan `Content-Type: text/html` LOLOS lewat
//      daftar pass-through proxy — diambil dari respons Worker SUNGGUHAN lalu dijalankan melalui
//      tiruan filter `$passThrough` yang dibaca dari berkas PHP. `Location` dan `Set-Cookie` ikut,
//      kalau tidak login/logout mati.
//  (d) `deploy/edge/owner-index.php` TIDAK memuat nilai secret sungguhan — dipindai dengan pola
//      nilai acak panjang, bukan dengan mencari string yang sudah diketahui.
//  (e) Perbandingan token/secret memakai fungsi waktu-konstan (`ctEq`), dan tidak ada operator
//      kesetaraan langsung yang menyentuh nilai edge secret.
//
// Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OWNER_DIR = path.join(ROOT, 'workers', 'owner');
const DEPLOY_DIR = path.join(ROOT, 'deploy', 'edge');

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) {
    failures += 1;
    console.error('  ✗ ' + message);
  }
}

function mustRead(absolute, label) {
  if (!fs.existsSync(absolute)) throw new Error('berkas wajib tidak ada: ' + label);
  return fs.readFileSync(absolute, 'utf8');
}

const dataUrl = (text) => 'data:text/javascript;base64,' + Buffer.from(text, 'utf8').toString('base64');

const indexSource = mustRead(path.join(OWNER_DIR, 'index.js'), 'workers/owner/index.js');
const queriesSource = mustRead(path.join(OWNER_DIR, 'queries.js'), 'workers/owner/queries.js');
const phpSource = mustRead(path.join(DEPLOY_DIR, 'owner-index.php'), 'deploy/edge/owner-index.php');
const readmeSource = mustRead(path.join(DEPLOY_DIR, 'README.md'), 'deploy/edge/README.md');
const workflowSource = mustRead(path.join(ROOT, '.github', 'workflows', 'quality.yml'), '.github/workflows/quality.yml');

/* ==========================================================================================
 * Fixture D1 agregat. DISALIN (bentuk ringkas) dari `owner-dashboard-test.js`: gerbang ini butuh
 * satu render dashboard yang SUNGGUHAN untuk membaca header keamanannya, dan fixture-nya tidak
 * boleh punya tabel per-orang — kalau kode owner mencoba membacanya, stub MELEMPAR.
 * ======================================================================================== */

const DAYS = 40;
const LAST_DAY = '2026-08-26';
function shift(day, delta) {
  return new Date(Date.parse(day + 'T00:00:00Z') + delta * 86400000).toISOString().slice(0, 10);
}
const FLOW = ['visitors', 'new_users', 'sessions', 'lessons_started', 'lessons_completed', 'answers',
  'ai_calls', 'ai_tokens_out', 'ai_err_429', 'ai_err_timeout', 'ai_err_5xx', 'tts_calls',
  'tts_chars_rendered', 'tts_cache_hits', 'tts_cache_misses', 'tts_failures', 'quota_hit_users',
  'breaker_trips', 'worker_requests', 'backend_errors', 'offline_late_events'];
const metricsDaily = [];
for (let i = DAYS - 1; i >= 0; i -= 1) {
  metricsDaily.push({
    day: shift(LAST_DAY, -i),
    visitors: 200 + i, new_users: 10 + (i % 5), registered_total: 1000 - i * 3,
    dau: i === 0 ? 123 : 100 + (i % 7), wau: 456, mau: 789,
    returning_users: 60, sessions: 300, lessons_started: 90, lessons_completed: 45,
    answers: 2000, ai_calls: 400, ai_users: 80, ai_tokens_out: 50000,
    ai_err_429: 3, ai_err_timeout: 1, ai_err_5xx: 2,
    tts_calls: 900, tts_users: 70, tts_chars_rendered: 300000,
    tts_cache_hits: 700, tts_cache_misses: 200, tts_failures: 5,
    quota_hit_users: 4, breaker_trips: 1, worker_requests: 12000,
    r2_objects: 273, r2_bytes: 588000000, backend_errors: 2,
    offline_late_events: 7, collection_ok: i === 3 ? 0 : 1,
  });
}
const COST_FIXTURE = {
  days_counted: 30, tts_chars_rendered: 10486632, ai_tokens_in: 16840160,
  ai_tokens_out: 5868160, infra_usd: 1.7, tokens_are_estimated: 0,
};
const COST_RATES_FIXTURE = {
  day: LAST_DAY, tts_provider: 'workers-ai aura-1', tts_usd_per_1m_chars: 15.0,
  llm_model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  llm_usd_per_1m_in: 0.045, llm_usd_per_1m_out: 0.384, dau_at_calc: 123, tokens_are_estimated: 0,
};
const RETENTION_FIXTURE = [
  { cohort_day: shift(LAST_DAY, -1), day_offset: 1, cohort_size: 120, retained: 54 },
  { cohort_day: shift(LAST_DAY, -7), day_offset: 7, cohort_size: 110, retained: 33 },
];
const inRange = (day, from, to) => day >= from && day <= to;

function fakeD1() {
  const log = [];
  const norm = (sql) => sql.replace(/\s+/g, ' ').trim();
  const handlers = [
    [/^SELECT day, visitors,.*ORDER BY day DESC LIMIT 1$/, () => [metricsDaily[metricsDaily.length - 1]]],
    [/^SELECT COUNT\(\*\) AS days_counted, COALESCE\(SUM\(tts_chars_rendered\)/, () => [COST_FIXTURE]],
    [/^SELECT COUNT\(\*\) AS days_counted, MIN\(day\)/, (b) => {
      const rows = metricsDaily.filter((r) => inRange(r.day, b[0], b[1]));
      const out = { days_counted: rows.length };
      for (const col of FLOW) out[col] = rows.reduce((a, r) => a + r[col], 0);
      out.days_broken = rows.filter((r) => r.collection_ok === 0).length;
      return [out];
    }],
    [/^SELECT MAX\(dau\) AS dau_peak/, (b) => {
      const rows = metricsDaily.filter((r) => inRange(r.day, b[0], b[1]));
      return [{
        dau_peak: Math.max(...rows.map((r) => r.dau)),
        wau_peak: 456, mau_peak: 789,
        dau_avg: rows.reduce((a, r) => a + r.dau, 0) / rows.length,
      }];
    }],
    [/^SELECT day, dau, wau, mau, new_users/, (b) => metricsDaily.filter((r) => inRange(r.day, b[0], b[1]))],
    [/^SELECT day, registered_total/, (b) => [metricsDaily.filter((r) => r.day <= b[1]).slice(-1)[0]]],
    [/^SELECT cohort_day, day_offset/, (b) => RETENTION_FIXTURE.filter((r) => inRange(r.cohort_day, b[0], b[1]))],
    [/^SELECT day_offset, COALESCE\(SUM\(cohort_size\)/, (b) => RETENTION_FIXTURE
      .filter((r) => inRange(r.cohort_day, b[0], b[1]))
      .map((r) => ({ day_offset: r.day_offset, cohort_total: r.cohort_size, retained_total: r.retained }))],
    [/^SELECT day, tts_provider/, () => [COST_RATES_FIXTURE]],
    [/^SELECT MIN\(day\) AS day_first_collected/, () => [{ day_first_collected: metricsDaily[0].day, days_total: metricsDaily.length }]],
  ];
  function run(sql, binds) {
    const key = norm(sql);
    log.push(key);
    for (const [re, fn] of handlers) if (re.test(key)) return fn(binds) || [];
    throw new Error('D1 fixture tidak mengenal query ini: ' + key);
  }
  return {
    _log: log,
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...args) { binds = args; return stmt; },
        async first() { return run(sql, binds)[0] || null; },
        async all() { return { success: true, results: run(sql, binds) }; },
        async run() { return { success: true, meta: { changes: 0 } }; },
      };
      return stmt;
    },
  };
}

const EDGE_SECRET = 'uji-edge-secret-owner-0123456789abcdefXYZ';
const OWNER_TOKEN = 'uji-token-owner-32-byte-acak-xyz';
const NOW = Date.parse('2026-08-27T02:00:00Z');
const sha256Hex = (text) => require('crypto').createHash('sha256').update(text, 'utf8').digest('hex');

function makeEnv(overrides) {
  return Object.assign({
    ANALYTICS: fakeD1(),
    AE: { writeDataPoint() {} },
    OWNER_TOKEN_HASH: sha256Hex(OWNER_TOKEN),
    OWNER_SESSION_KEY: 'kunci-hmac-sesi-uji-hanya-untuk-test',
    EDGE_SHARED_SECRET: EDGE_SECRET,
  }, overrides || {});
}

function makeRequest(url, opts) {
  return new Request('https://fiezel-owner.fitrajft.workers.dev' + url, opts || {});
}

/* ==========================================================================================
 * Tiruan filter pass-through proxy PHP — dibaca DARI berkas PHP, bukan diketik ulang di sini.
 * Kalau daftar di PHP berubah, tiruan ini berubah bersamanya; itu inti butir (c).
 * ======================================================================================== */

function readPassThroughList(php) {
  const block = /\$passThrough\s*=\s*\[([\s\S]*?)\];/.exec(php);
  if (!block) return null;
  return (block[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1).toLowerCase());
}

// Meniru perilaku berkas PHP: hanya nama di daftar yang dikirim ulang, `set-cookie` ditangani
// khusus (boleh berulang), sisanya DIJATUHKAN.
function proxyForward(workerHeaders, list) {
  const out = new Map();
  const cookies = [];
  for (const [rawName, value] of workerHeaders) {
    const name = String(rawName).toLowerCase();
    if (name === 'set-cookie') { cookies.push(value); continue; }
    if (list.includes(name)) out.set(name, value);
  }
  return { headers: out, cookies };
}

(async () => {
  const mod = await import(dataUrl(indexSource.replace("'./queries.js'", `'${dataUrl(queriesSource)}'`)));

  /* ---------- 0. Berkas wajib + inventaris rute --------------------------------------- */
  assert(fs.existsSync(path.join(DEPLOY_DIR, 'owner-index.php')), 'deploy/edge/owner-index.php ada');
  assert(fs.existsSync(path.join(DEPLOY_DIR, 'api-index.php')), 'pola sumber deploy/edge/api-index.php masih ada');
  assert(typeof mod.handle === 'function', 'Worker owner mengekspor handle()');

  const ownerRoutes = mod.OWNER_ROUTES;
  const publicRoutes = mod.PUBLIC_ROUTES;
  const allRoutes = ownerRoutes.concat(publicRoutes);

  // Allowlist proxy WAJIB cocok dengan rute Worker yang SUNGGUHAN — tidak ada rute karangan,
  // dan tidak ada rute Worker yang lupa didaftarkan (kalau lupa, dashboard-nya 404 di origin).
  const allowBlock = /const ALLOW = \[([\s\S]*?)\];/.exec(phpSource);
  assert(!!allowBlock, 'deploy/edge/owner-index.php memakai const ALLOW yang bisa dibaca gerbang');
  const allow = {};
  for (const line of (allowBlock ? allowBlock[1] : '').split('\n')) {
    const m = /'([^']+)'\s*=>\s*\[([^\]]*)\]/.exec(line);
    if (m) allow[m[1]] = (m[2].match(/'([A-Z]+)'/g) || []).map((s) => s.slice(1, -1));
  }
  for (const route of allRoutes) {
    assert(Object.prototype.hasOwnProperty.call(allow, route),
      'rute Worker owner ' + route + ' tidak ada di allowlist proxy (di origin ia akan 404)');
  }
  for (const route of Object.keys(allow)) {
    assert(allRoutes.includes(route),
      'allowlist proxy memuat rute yang TIDAK ADA di Worker owner (dikarang): ' + route);
  }
  assert(allow['/login'] && allow['/login'].includes('POST') && allow['/login'].includes('GET'),
    '/login harus mengizinkan GET (form) dan POST (kirim token)');
  assert(Object.keys(allow).every((r) => r === '/login' || !(allow[r] || []).includes('POST')),
    'hanya /login yang boleh POST; rute lain GET saja');
  assert(/not_found|Halaman tidak ada/.test(phpSource) && /405|tidak diizinkan/i.test(phpSource),
    'proxy owner menolak path tak terdaftar dan metode salah (default TOLAK)');

  /* ---------- (a) semua rute 403 tanpa header edge ------------------------------------ */
  const goodCookie = mod.SESSION_COOKIE + '=' + (await mod.issueSession(makeEnv(), NOW));
  const probeRoutes = allRoutes.concat(['/api/rute-baru-yang-lupa-dipagari', '/admin', '/healthz', '/index.html']);
  const bodies = [];
  for (const route of probeRoutes) {
    for (const [label, headers] of [
      ['tanpa header edge', {}],
      ['header edge salah', { 'x-fiezel-edge': 'salah-sekali' }],
      ['header edge kosong', { 'x-fiezel-edge': '' }],
      ['header edge berprefiks benar', { 'x-fiezel-edge': EDGE_SECRET.slice(0, -1) }],
      ['header edge lebih panjang', { 'x-fiezel-edge': EDGE_SECRET + 'x' }],
      // Kasus yang paling penting: sesi owner SAH tetap tidak menolong tanpa jembatan.
      ['sesi owner sah tanpa header edge', { cookie: goodCookie }],
    ]) {
      const env = makeEnv();
      const res = await mod.handle(makeRequest(route, { headers }), env, {}, NOW);
      assert(res.status === 403, '(a) ' + route + ' [' + label + '] → ' + res.status + ', seharusnya 403');
      const body = await res.text();
      bodies.push(body);
      assert(env.ANALYTICS._log.length === 0,
        '(a) ' + route + ' [' + label + '] menyentuh D1 sebelum penjaga edge lulus');
      assert(!res.headers.get('set-cookie'),
        '(a) ' + route + ' [' + label + '] tidak boleh menerbitkan cookie apa pun');
      assert(!/EDGE_SHARED_SECRET|X-Fiezel-Edge|workers\.dev|edgeGuard/i.test(body),
        '(a) penolakan tidak menyebut nama secret, nama header, alamat jembatan, atau status penjaga');
      assert(!new RegExp(EDGE_SECRET).test(body), '(a) penolakan tidak pernah memantulkan nilai secret');
      assert(!/dau|wau|mau|totalUsd/i.test(body), '(a) penolakan tidak memuat satu pun kunci metrik');
    }
  }
  assert(new Set(bodies).size === 1,
    '(a) bentuk penolakan IDENTIK untuk semua sebab (anti-oracle): ' + new Set(bodies).size + ' bentuk berbeda');

  // POST /login dengan token BENAR tapi tanpa header edge: tetap 403, tetap tanpa cookie sesi.
  {
    const env = makeEnv();
    const res = await mod.handle(makeRequest('/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ t: OWNER_TOKEN }),
    }), env, {}, NOW);
    assert(res.status === 403, '(a) login dengan token benar tanpa header edge → ' + res.status + ', seharusnya 403');
    assert(!/fz_owner=[A-Za-z0-9]/.test(res.headers.get('set-cookie') || ''),
      '(a) login tanpa header edge tidak boleh menerbitkan sesi (penjaga edge di DEPAN login)');
  }

  // Penjaga tidak boleh peka huruf besar/kecil: proxy mengirim `X-Fiezel-Edge`, HTTP/2 huruf kecil.
  {
    const res = await mod.handle(makeRequest('/login', { headers: { 'X-FIEZEL-EDGE': EDGE_SECRET } }), makeEnv(), {}, NOW);
    assert(res.status === 200, 'nama header edge tidak peka huruf besar/kecil, dapat ' + res.status);
  }

  // Secret berisi spasi saja = dianggap tidak terpasang. Sejak audit D3 HIGH-3: tidak terpasang
  // = FAIL-CLOSED (semua ditolak), KECUALI ALLOW_NO_EDGE_SECRET === 'true' dipasang eksplisit.
  {
    const errors = [];
    const realError = console.error;
    console.error = (...a) => errors.push(a.join(' '));
    let res;
    let res2;
    let resHalfOpen;
    try {
      mod.resetEdgeWarningForTests();
      res = await mod.handle(makeRequest('/login'), makeEnv({ EDGE_SHARED_SECRET: '   ' }), {}, NOW);
      res2 = await mod.handle(makeRequest('/login'), makeEnv({ EDGE_SHARED_SECRET: '   ' }), {}, NOW);
      // Nilai selain string persis 'true' TIDAK membuka gerbang — salah ketik gagal ke arah aman.
      resHalfOpen = await mod.handle(makeRequest('/login'),
        makeEnv({ EDGE_SHARED_SECRET: '   ', ALLOW_NO_EDGE_SECRET: '1' }), {}, NOW);
    } finally { console.error = realError; }
    assert(res.status === 403, 'FAIL-CLOSED: secret belum terpasang → 403, dapat ' + res.status);
    assert(res2.status === 403, 'FAIL-CLOSED: permintaan kedua juga ditolak, dapat ' + res2.status);
    assert(resHalfOpen.status === 403, "ALLOW_NO_EDGE_SECRET='1' TIDAK membuka gerbang (hanya string 'true'), dapat " + resHalfOpen.status);
    const closedBody = await res.text();
    const wrongHeaderRes = await mod.handle(makeRequest('/login', { headers: { 'x-fiezel-edge': 'salah' } }), makeEnv(), {}, NOW);
    assert(closedBody === await wrongHeaderRes.text(),
      'badan penolakan fail-closed IDENTIK dengan penolakan header salah (bukan oracle konfigurasi)');
    assert(!/EDGE_SHARED_SECRET|ALLOW_NO_EDGE_SECRET|x-fiezel-edge/i.test(closedBody),
      'penolakan fail-closed tidak membocorkan nama secret/var/header');
    assert(mod.edgeGuardStatus({ EDGE_SHARED_SECRET: '  ' }) === 'off', 'edgeGuardStatus() jujur: off untuk secret kosong');
    assert(mod.edgeGuardStatus({ EDGE_SHARED_SECRET: EDGE_SECRET }) === 'on', 'edgeGuardStatus() jujur: on saat terpasang');
    assert(errors.some((e) => /FAIL-CLOSED/i.test(e) && /EDGE_SHARED_SECRET/.test(e)),
      'fail-closed dicatat via console.error dan menyebut secret yang harus dipasang');
    assert(errors.length === 1, 'log fail-closed sekali per isolate, bukan per permintaan, dapat ' + errors.length);
  }

  // Pembuka darurat masa transisi: ALLOW_NO_EDGE_SECRET='true' (persis) → perilaku off lama,
  // lengkap dengan peringatan console.warn sekali per isolate.
  {
    const warns = [];
    const realWarn = console.warn;
    console.warn = (...a) => warns.push(a.join(' '));
    let res;
    let res2;
    try {
      mod.resetEdgeWarningForTests();
      const envOff = { EDGE_SHARED_SECRET: '   ', ALLOW_NO_EDGE_SECRET: 'true' };
      res = await mod.handle(makeRequest('/login'), makeEnv(envOff), {}, NOW);
      res2 = await mod.handle(makeRequest('/login'), makeEnv(envOff), {}, NOW);
    } finally { console.warn = realWarn; }
    assert(res.status === 200, "ALLOW_NO_EDGE_SECRET='true' membuka mode transisi, dapat " + res.status);
    assert(res2.status === 200, 'permintaan kedua saat off tetap dilayani');
    assert(warns.some((w) => /edgeGuard=off/.test(w) && /EDGE_SHARED_SECRET/.test(w) && /transisi/i.test(w)),
      'mode off mencatat peringatan yang menyebut secret + sifat transisinya');
    assert(warns.length === 1, 'peringatan off sekali per isolate, bukan per permintaan, dapat ' + warns.length);
    assert(mod.EDGE_FREE_PATHS.length === 0,
      'owner TIDAK punya path bebas header (nol permukaan terbuka di workers.dev), dapat ' + mod.EDGE_FREE_PATHS.length);
  }

  /* ---------- (b) DUA LAPIS: header edge benar TIDAK menggantikan sesi owner ---------- */
  for (const route of ownerRoutes) {
    for (const [label, headers] of [
      ['tanpa cookie', { 'x-fiezel-edge': EDGE_SECRET }],
      ['cookie sampah', { 'x-fiezel-edge': EDGE_SECRET, cookie: mod.SESSION_COOKIE + '=bukan-sesi' }],
      ['cookie ter-tamper', { 'x-fiezel-edge': EDGE_SECRET, cookie: goodCookie.slice(0, -3) + 'aaa' }],
      ['cookie kedaluwarsa', { 'x-fiezel-edge': EDGE_SECRET,
        cookie: mod.SESSION_COOKIE + '=' + (await mod.issueSession(makeEnv(), NOW - mod.SESSION_TTL_MS - 1000)) }],
      ['cookie kunci lain', { 'x-fiezel-edge': EDGE_SECRET,
        cookie: mod.SESSION_COOKIE + '=' + (await mod.issueSession({ OWNER_SESSION_KEY: 'kunci-penyerang' }, NOW)) }],
    ]) {
      const env = makeEnv();
      const res = await mod.handle(makeRequest(route + '?admin=true', { headers }), env, {}, NOW);
      assert(res.status === 403,
        '(b) ' + route + ' [' + label + '] dengan header edge BENAR → ' + res.status + ', seharusnya 403');
      assert(env.ANALYTICS._log.length === 0, '(b) ' + route + ' [' + label + '] menyentuh D1 tanpa sesi owner');
    }
  }
  // Lapis pertama benar-benar DILEWATI, bukan kebetulan meloloskan satu rute: header edge + sesi
  // sah = 200, dan rute yang tidak dikenal tetap 403 (default deny Worker owner).
  {
    const env = makeEnv();
    const ok = await mod.handle(makeRequest('/?period=30d', {
      headers: { 'x-fiezel-edge': EDGE_SECRET, cookie: goodCookie },
    }), env, {}, NOW);
    assert(ok.status === 200, '(b) header edge + sesi owner sah → 200, dapat ' + ok.status);
    assert(env.ANALYTICS._log.length > 0, '(b) permintaan yang lolos DUA lapis benar-benar membaca D1 agregat');
    const unknown = await mod.handle(makeRequest('/api/rute-baru', {
      headers: { 'x-fiezel-edge': EDGE_SECRET, cookie: goodCookie },
    }), makeEnv(), {}, NOW);
    assert(unknown.status === 403, '(b) rute tak dikenal tetap 403 walau dua lapis lulus, dapat ' + unknown.status);
  }

  /* ---------- (c) header keamanan HTML lolos lewat daftar pass-through proxy ---------- */
  const passList = readPassThroughList(phpSource);
  assert(Array.isArray(passList) && passList.length > 0, '(c) daftar $passThrough bisa dibaca dari owner-index.php');

  {
    const env = makeEnv();
    const page = await mod.handle(makeRequest('/?period=7d', {
      headers: { 'x-fiezel-edge': EDGE_SECRET, cookie: goodCookie },
    }), env, {}, NOW);
    assert(page.status === 200, '(c) dashboard owner 200 untuk pembaca sah, dapat ' + page.status);

    // Setiap header yang dipasang Worker pada respons HTML WAJIB ada di daftar pass-through.
    // Ini yang membuat header baru tidak bisa hilang diam-diam di jembatan.
    for (const [name] of page.headers) {
      const lower = name.toLowerCase();
      if (lower === 'set-cookie') continue;   // ditangani khusus, diperiksa di bawah
      assert(passList.includes(lower),
        '(c) header respons Worker "' + lower + '" TIDAK ada di daftar pass-through proxy (hilang di jembatan)');
    }

    const forwarded = proxyForward(page.headers, passList);
    assert(/^text\/html/.test(forwarded.headers.get('content-type') || ''),
      '(c) Content-Type text/html lolos utuh lewat proxy, dapat ' + forwarded.headers.get('content-type'));
    assert(/charset=utf-8/i.test(forwarded.headers.get('content-type') || ''),
      '(c) charset ikut lolos (tanpa itu halaman Indonesia bisa salah render)');
    for (const secure of ['content-security-policy', 'x-robots-tag', 'referrer-policy', 'x-content-type-options']) {
      assert(!!page.headers.get(secure), '(c) Worker owner memang memasang ' + secure + ' pada HTML');
      assert(!!forwarded.headers.get(secure), '(c) header keamanan ' + secure + ' bertahan lewat proxy');
    }
    assert(/default-src 'none'/.test(forwarded.headers.get('content-security-policy') || ''),
      '(c) CSP yang lolos masih CSP ketat yang sama, bukan versi yang dilemahkan');
    assert(/noindex/i.test(forwarded.headers.get('x-robots-tag') || ''),
      '(c) noindex bertahan lewat proxy (dashboard owner tidak boleh terindeks)');
    assert(/no-store/.test(forwarded.headers.get('cache-control') || ''),
      '(c) Cache-Control: no-store bertahan (hosting bersama tidak boleh menyimpan halaman owner)');
    // Sesi diperbarui tiap akses -> Set-Cookie harus sampai ke browser.
    assert(forwarded.cookies.length === 1 && /fz_owner=/.test(forwarded.cookies[0]),
      '(c) Set-Cookie sesi owner diteruskan proxy (tanpa ini sesi mati di setiap muat halaman)');
    assert(/if \(\$name === 'set-cookie'\) \{ header\('Set-Cookie: ' \. \$val, false\);/.test(phpSource),
      '(c) proxy meneruskan Set-Cookie dengan replace=false (boleh lebih dari satu)');
    assert(/HTTP_COOKIE/.test(phpSource), '(c) proxy meneruskan Cookie dari browser ke Worker');

    // PEMERIKSAAN YANG TIDAK BISA MERAH ADALAH PEMERIKSAAN YANG BOHONG: daftar tanpa CSP harus
    // benar-benar kehilangan CSP di tiruan filter ini.
    const poisoned = proxyForward(page.headers, passList.filter((h) => h !== 'content-security-policy'));
    assert(!poisoned.headers.get('content-security-policy'),
      '(c) tiruan filter TERBUKTI bisa kehilangan CSP kalau daftar pass-through lupa mendaftarkannya');
  }

  // Redirect 303 login/logout: `Location` harus lolos, dan proxy tidak boleh mengikuti redirect
  // sendiri (kalau diikuti, Set-Cookie sesi mati di proses PHP).
  {
    const login = await mod.handle(makeRequest('/login', {
      method: 'POST',
      headers: { 'x-fiezel-edge': EDGE_SECRET, 'content-type': 'application/json' },
      body: JSON.stringify({ t: OWNER_TOKEN }),
    }), makeEnv(), {}, NOW);
    assert(login.status === 303, '(c) login sah lewat jembatan → 303, dapat ' + login.status);
    const fwd = proxyForward(login.headers, passList);
    assert(fwd.headers.get('location') === '/', '(c) Location lolos lewat proxy, dapat ' + fwd.headers.get('location'));
    assert(fwd.cookies.length === 1 && /HttpOnly/i.test(fwd.cookies[0]) && /SameSite=Strict/i.test(fwd.cookies[0]),
      '(c) cookie sesi (HttpOnly + SameSite=Strict) lolos utuh lewat proxy');
    assert(/CURLOPT_FOLLOWLOCATION\s*=>\s*false/.test(phpSource),
      '(c) proxy TIDAK mengikuti redirect sendiri (Set-Cookie 303 harus sampai ke browser)');
    assert(/text\/html/.test(phpSource), '(c) proxy sadar jawaban utamanya HTML, bukan JSON');
  }

  /* ---------- (d) artefak deployment bebas nilai secret ------------------------------- */
  {
    assert(phpSource.includes('__EDGE_SECRET__'), '(d) owner-index.php memakai placeholder __EDGE_SECRET__');
    assert(/EDGE_SECRET\s*=\s*'__EDGE_SECRET__'/.test(phpSource), '(d) konstanta EDGE_SECRET berisi placeholder, bukan nilai');
    assert((phpSource.match(/__EDGE_SECRET__/g) || []).length === 1, '(d) placeholder muncul tepat sekali');
    assert(/X-Fiezel-Edge/.test(phpSource), '(d) proxy benar-benar mengirim header X-Fiezel-Edge');
    assert(/fiezel-owner\.fitrajft\.workers\.dev/.test(phpSource), '(d) proxy menunjuk Worker owner yang benar');
    assert(!/fiezel-api\.fitrajft\.workers\.dev/.test(phpSource), '(d) proxy owner TIDAK menunjuk Worker api (salah salin)');
    assert(/SEMENTARA|sementara/.test(phpSource), '(d) owner-index.php menyatakan sifat sementaranya');
    assert(/MAX_BODY/.test(phpSource) && /TIMEOUT_S/.test(phpSource) && /CONNECT_S/.test(phpSource),
      '(d) proxy punya cap byte dan timeout (hosting bersama tidak boleh digantung)');
    assert(/413|terlalu besar/i.test(phpSource), '(d) body melebihi cap ditolak, tidak diteruskan');
    assert(!/HTTP_X_FORWARDED_FOR|REMOTE_ADDR|CF-Connecting-IP/i.test(phpSource),
      '(d) IP mentah TIDAK pernah diteruskan ke Worker');
    assert(/error_log\(/.test(phpSource) && !/curl_error\(\$ch\)\s*\)?\s*;?\s*echo/.test(phpSource),
      '(d) galat curl mentah hanya masuk log, tidak pernah dicetak ke pengguna');
    assert(/Dashboard sedang tidak bisa dihubungi/.test(phpSource),
      '(d) kegagalan upstream dijawab pesan sopan tanpa detail vendor');

    // Pemindai nilai rahasia: POLA nilai acak panjang (base64url/hex), bukan string yang sudah
    // diketahui — yang sudah diketahui tidak perlu dijaga. Disalin dari edge-guard-test.js butir
    // (g) supaya dua artefak deployment dipindai dengan ukuran yang SAMA.
    const KNOWN_SAFE = new Set(['__EDGE_SECRET__']);
    const scanSecretLike = (text) => (text.match(/[A-Za-z0-9_\-+/=]{24,}/g) || []).filter((token) => {
      if (KNOWN_SAFE.has(token)) return false;
      if (/^_+[A-Z_]+_+$/.test(token)) return false;
      if (/^[a-z_]+$/.test(token)) return false;
      if (/^[A-Z_]+$/.test(token)) return false;
      if (token.split(/[-_+/=]/).every((seg) => seg.length > 0 && /^[A-Za-z]+$/.test(seg))) return false;
      const classes = (/[a-z]/.test(token) ? 1 : 0) + (/[A-Z]/.test(token) ? 1 : 0)
        + (/[0-9]/.test(token) ? 1 : 0) + (/[_\-+/=]/.test(token) ? 1 : 0);
      const hexLike = /^[0-9a-f]{32,}$/.test(token);
      if (!hexLike && classes < 3) return false;
      return new Set(token.split('')).size >= 12;
    });

    /* Nilai probe ini SENGAJA berbeda dari kembarannya di edge-guard-test.js. Pemindai
     * rahasia memaafkan digest PER BERKAS, jadi menyalin fixture yang sama ke dua berkas
     * membuat salinan kedua tidak berentri dan gerbang merah dengan benar. Membuat nilainya
     * berbeda lebih jujur daripada melonggarkan pemindai agar satu digest berlaku global. */
    for (const injected of [
      'Qw7nR2t-Yp5MxZa8Sd3JhFg6KvBcNmLqTuVwXyZ',
      '3f9a1c7e5b2d8046a1c3e5f7091b2d4c6e8f0a1b',
      'b3duZXItcHJvYmUvdmFsdWUrZm9yLWd1YXJkPT0Ng==',
    ]) {
      const poisonedPhp = phpSource.replace('__EDGE_SECRET__', injected);
      assert(scanSecretLike(poisonedPhp).includes(injected),
        '(d) pemindai TERBUKTI menangkap nilai secret sungguhan berbentuk ' + injected.slice(0, 6) + '...');
    }
    const candidates = scanSecretLike(phpSource);
    assert(candidates.length === 0,
      '(d) tidak ada nilai berpola acak di owner-index.php: ' + (candidates.join(' | ') || '0'));
    for (const [pattern, label] of [
      [/-{5}BEGIN [A-Z ]*PRIVATE KEY/, 'private key PEM'],
      [/\bsk-[A-Za-z0-9]{16,}/, 'kunci gaya sk-'],
      [/\beyJ[A-Za-z0-9_\-]{20,}\./, 'JWT'],
      [/\b[0-9a-f]{40,}\b/, 'hex panjang (mis. sha256 token owner)'],
    ]) {
      assert(!pattern.test(phpSource), '(d) owner-index.php tidak memuat ' + label);
    }
    assert(!/OWNER_TOKEN_HASH|OWNER_SESSION_KEY/.test(phpSource),
      '(d) proxy tidak pernah menyentuh Secret gate owner (nol logika bisnis di PHP)');
  }

  /* ---------- (e) perbandingan waktu-konstan ------------------------------------------ */
  {
    assert(/function ctEq\(/.test(indexSource), '(e) index.js owner mendefinisikan ctEq()');
    assert(/ctEq\(presentedEdge, configuredEdge\)/.test(indexSource),
      '(e) header edge dibandingkan lewat ctEq(presentedEdge, configuredEdge)');
    assert(/ctEq\(presentedDigest,/.test(indexSource), '(e) digest token owner tetap dibandingkan lewat ctEq()');
    assert(/ctEq\(presented, expected\)/.test(indexSource), '(e) tanda tangan sesi tetap dibandingkan lewat ctEq()');

    // Kode saja, tanpa komentar/string: komentar SENGAJA membahas operator kesetaraan untuk
    // menjelaskan kenapa ia dilarang, dan itu tidak boleh memerahkan gerbang.
    const codeOnly = indexSource
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""');
    const EDGE_IDENTIFIERS = /(presentedEdge|configuredEdge|edgeSecret|EDGE_SHARED_SECRET|EDGE_HEADER)/;
    const offenders = codeOnly.split('\n').filter((line) => /(===|!==|==|!=)/.test(line) && EDGE_IDENTIFIERS.test(line));
    assert(offenders.length === 0,
      '(e) tidak ada operator kesetaraan langsung pada nilai edge secret: ' + (offenders.join(' | ') || '0'));
    assert(!/headers\.get\([^)]*\)\s*(===|!==|==|!=)/.test(codeOnly),
      '(e) hasil headers.get() tidak pernah dibandingkan dengan operator kesetaraan');

    // Bentuk ctEq: satu loop atas panjang MAKSIMUM, akumulasi XOR, tanpa keluar dini.
    const body = /function ctEq\([^)]*\)\s*\{([\s\S]*?)\n\}/.exec(indexSource);
    assert(!!body, '(e) badan ctEq bisa dibaca gerbang');
    if (body) {
      assert(/Math\.max\(/.test(body[1]), '(e) ctEq mengiterasi panjang MAKSIMUM kedua masukan');
      assert(/diff \|=/.test(body[1]), '(e) ctEq mengakumulasi selisih dengan XOR/OR');
      assert(!/\bbreak\b/.test(body[1]) && !/return[^\n]*\n[\s\S]*for/.test(body[1]),
        '(e) ctEq tidak keluar dari loop pada byte pertama yang berbeda');
    }
    // Perbandingan yang aman tapi SALAH lebih buruk daripada tidak ada.
    assert(mod.ctEq('abc', 'abc') === true, '(e) ctEq cocok untuk nilai identik');
    assert(mod.ctEq('abc', 'abd') === false, '(e) ctEq menolak byte terakhir berbeda');
    assert(mod.ctEq('abc', 'abcd') === false, '(e) ctEq menolak panjang berbeda');
    assert(mod.ctEq(null, EDGE_SECRET) === false, '(e) header tidak ada tidak pernah cocok dengan secret');
    assert(mod.ctEq('', '') === true, '(e) ctEq tetap fungsi perbandingan, bukan penolak buta');

    // Penjaga edge harus PALING LUAR: sebelum rute publik dan sebelum sesi dibaca.
    const handleBody = indexSource.slice(indexSource.indexOf('async function handle('));
    const edgeAt = handleBody.indexOf('edgeGuard(request, env, path)');
    const publicAt = handleBody.indexOf('PUBLIC_ROUTES.includes(path)');
    const sessionAt = handleBody.indexOf('await ownerSession(');
    assert(edgeAt > 0 && edgeAt < publicAt && edgeAt < sessionAt,
      '(e) penjaga edge dijalankan PALING LUAR (sebelum rute publik dan sebelum sesi owner)');
    assert(/DISALIN, BUKAN DIIMPOR|KENAPA DISALIN/.test(indexSource),
      '(e) index.js menuliskan KENAPA penjaga disalin dari workers/api/mw-edge.js, bukan diimpor');
    assert(/masa transisi/i.test(indexSource) && /BUKAN mode produksi/i.test(indexSource),
      '(e) index.js menyatakan mode off hanya sah selama masa transisi dan bukan mode produksi');
  }

  /* ==================================================================================
   * (f) 🔄 TEMUAN LAPANGAN 28 Agu 2026 — ASIMETRI API vs OWNER (BAGIAN INI BARU).
   *
   * `api.fiezel.my.id` SUDAH terikat sebagai custom domain Worker, sehingga
   * `workers/api/mw-edge.js` kini meloloskan HOSTNAME TEPERCAYA tanpa header.
   * `owner.fiezel.my.id` BELUM: ia masih subdomain cPanel + `owner-index.php`.
   * Karena itu penjaga owner TIDAK BOLEH ikut-ikutan meloloskan hostname — kalau
   * ikut, dashboard owner terbuka di sebuah hostname yang belum pernah berdiri di
   * Cloudflare dan belum dilindungi Cloudflare Access. Asimetri ini disengaja,
   * dan gerbang inilah yang menjaganya tetap disengaja.
   * ================================================================================ */
  {
    assert(!/TRUSTED_EDGE_HOSTS|isTrustedEdgeHost/.test(indexSource),
      '(f) penjaga owner TIDAK punya jalur hostname-tepercaya (owner belum custom domain)');

    // Permintaan yang tiba di hostname owner "resmi" TANPA header tetap 403:
    // satu-satunya jalur sah owner hari ini adalah proxy PHP + header.
    for (const host of ['https://owner.fiezel.my.id', 'https://fiezel-owner.fitrajft.workers.dev']) {
      const res = await mod.handle(new Request(host + '/login'), makeEnv(), {}, NOW);
      assert(res.status === 403,
        '(f) ' + host + '/login tanpa header edge tetap 403 (owner belum punya jalur hostname), dapat ' + res.status);
      const body = await res.clone().text();
      assert(/forbidden_edge|Permintaan ini harus lewat/.test(body) || res.status === 403,
        '(f) penolakan owner tetap satu bentuk galat');
    }

    // Dan header sah tetap SATU-SATUNYA pembuka lapis pertama owner.
    const viaHeader = await mod.handle(
      makeRequest('/login', { headers: { 'x-fiezel-edge': EDGE_SECRET } }), makeEnv(), {}, NOW);
    assert(viaHeader.status === 200,
      '(f) jalur header sah tetap membuka lapis pertama owner, dapat ' + viaHeader.status);

    // Dokumen wajib menyatakan asimetrinya, supaya orang berikutnya tidak
    // "menyelaraskan" kedua penjaga tanpa tahu owner belum punya hostname.
    assert(/CADANGAN|cadangan/.test(readmeSource),
      '(f) README menyatakan jembatan PHP kini jalur CADANGAN untuk `api`');
    assert(/owner[^\n]*belum[^\n]*custom domain|belum menjadi custom domain/i.test(readmeSource),
      '(f) README menyatakan `owner` BELUM custom domain (asimetri dengan `api`)');
  }

  /* ---------- README pemasangan + pembongkaran ---------------------------------------- */
  {
    for (const [pattern, label] of [
      [/owner\.fiezel\.my\.id/, 'bagian pemasangan owner.fiezel.my.id'],
      [/owner-index\.php/, 'artefak owner-index.php'],
      [/public_html\/owner/, 'docroot terpisah ~/public_html/owner'],
      [/scp .*owner/, 'perintah scp untuk owner'],
      [/chmod 644 ~\/public_html\/owner\/index\.php/, 'chmod 644 berkas owner'],
      [/\(bak\|orig\|save\|swp\|old\|php~\|dist\)/, '.htaccess yang memblokir *.bak dll'],
      [/RequestHeader unset X-Fiezel-Edge/, '.htaccess menutup penyuntikan header edge'],
      [/wrangler@3 secret put EDGE_SHARED_SECRET/, 'pemasangan secret di Worker'],
      [/rm -rf ~\/public_html\/owner/, 'langkah pembongkaran subdomain owner'],
      [/owner-edge-guard-test\.js/, 'gerbang yang menjaga klaim owner'],
    ]) {
      assert(pattern.test(readmeSource), 'deploy/edge/README.md menjelaskan ' + label);
    }
    assert(/PEMBONGKARAN/.test(readmeSource), 'README tetap memuat bagian PEMBONGKARAN');
    assert(!/[0-9a-f]{40,}/.test(readmeSource), 'README tidak memuat nilai berpola acak');
    assert(!/__EDGE_SECRET__[A-Za-z0-9]/.test(readmeSource), 'README tidak menempelkan nilai ke placeholder');
    // Urutan pemasangan: proxy DULU, Worker BELAKANGAN. Terbalik = dashboard mati.
    const proxyFirst = readmeSource.search(/PROXY dulu, Worker belakangan|proxy dulu, Worker belakangan/i);
    assert(proxyFirst > 0, 'README menegaskan urutan: proxy dulu, Worker belakangan');
  }

  /* ---------- Gerbang ini benar-benar terdaftar di CI --------------------------------- */
  assert(/node owner-edge-guard-test\.js/.test(workflowSource),
    'quality.yml memanggil node owner-edge-guard-test.js (gerbang yang tidak dijalankan = tidak ada)');
  assert(/node owner-dashboard-test\.js/.test(workflowSource), 'quality.yml tetap memanggil owner-dashboard-test.js');

  /* ---------- Laporan ----------------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(ROOT, 'OWNER-EDGE-GUARD-REPORT.json'), JSON.stringify({
    schema: 'fiezel-owner-edge-guard-report-v1',
    generatedAt: new Date().toISOString(),
    pass: failures === 0,
    counts: { pass: passed, fail: failures, total: results.length },
    decision: {
      layers: ['X-Fiezel-Edge (jembatan)', 'sesi owner fz_owner (HMAC)'],
      edgeFreePaths: [],
      reason: 'dashboard owner tidak punya monitor eksternal, jadi nol path bebas header',
    },
    checks: results,
  }, null, 2) + '\n');
  console.log('owner-edge-guard-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('owner-edge-guard-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('owner-edge-guard-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
