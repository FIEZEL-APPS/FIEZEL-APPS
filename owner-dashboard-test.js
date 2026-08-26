// owner-dashboard-test.js — gerbang untuk workers/owner (dashboard owner, E6).
//
// Node murni, nol dependency. Worker Cloudflare adalah modul ESM, jadi ia dimuat lewat
// `await import('data:text/javascript;base64,...')` (pola cf-b7-testing-strategy.md §2:
// tidak butuh --experimental-vm-modules, tidak menulis berkas temporer, tidak mengotori
// working tree). Impor relatif './queries.js' ditulis ulang menjadi data: URL sendiri supaya
// grafik modulnya utuh tanpa bundler.
//
// Yang dijamin gerbang ini (bab 32):
//   (a) #20 SEMUA rute mengembalikan 403 tanpa sesi owner yang sah — termasuk rute yang belum
//       ada, dan termasuk saat penyerang mencoba ?admin=true / header / body.
//       Sekaligus: respons yang gagal gate tidak memuat satu pun kunci metrik.
//   (b) tidak ada query yang menyentuh kolom identitas/per-orang (pindai queries.js).
//   (c) perbandingan token waktu-konstan (tidak ada operator kesetaraan langsung atas nilai
//       rahasia — pindai kode).
//   (d) #24 rumus biaya menghasilkan angka yang benar untuk masukan contoh cf-a10.
//   (e) #22 DAU/WAU/MAU dihitung dari tabel AGREGAT, bukan dari baris per-perangkat.

'use strict';

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'workers', 'owner');
const indexSource = fs.readFileSync(path.join(DIR, 'index.js'), 'utf8');
const queriesSource = fs.readFileSync(path.join(DIR, 'queries.js'), 'utf8');
const wranglerSource = fs.readFileSync(path.join(DIR, 'wrangler.toml'), 'utf8');
const readmeSource = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');

let failures = 0;
function assert(cond, message) {
  if (cond) return;
  failures += 1;
  console.error('  ✗ ' + message);
}
function section(title) { console.log('\n' + title); }

const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const dataUrl = (text) => 'data:text/javascript;base64,' + b64(text);

/* ================= (b) PINDAI queries.js — hanya agregat, hanya baca ====================== */

section('(b) queries.js: hanya agregat, nol kolom identitas/per-orang');

// Persis daftar yang diminta gerbang: kolom/penanda per-orang.
const PERSON_MARKERS = [
  /user_id/i, /install_id/i, /uuid/i, /email/i, /\bname\b/i, /_name\b/i, /\bname_/i,
  /learnerName/i, /provider_hash/i, /install_hash/i,
];
for (const re of PERSON_MARKERS) {
  assert(!re.test(queriesSource), 'queries.js memuat penanda identitas per-orang: ' + re);
}

// Tabel per-orang dilarang muncul sama sekali di SQL owner.
for (const table of ['identity', 'daily_active', 'usage_daily']) {
  assert(!new RegExp('\\b' + table + '\\b').test(queriesSource),
    'queries.js membaca tabel per-orang: ' + table);
}

// Read-only ditegakkan di kode, karena D1 belum punya binding read-only.
for (const word of ['INSERT', 'UPDATE ', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'ATTACH']) {
  assert(!queriesSource.toUpperCase().includes(word + ' '),
    'queries.js memuat pernyataan tulis: ' + word);
}

// Rentang tanggal wajib parameter terikat, bukan string yang disusun dari masukan permintaan.
assert(!/\$\{[^}]*(from|to|day|period)[^}]*\}/i.test(queriesSource.replace(/\$\{SUM_LIST\}|\$\{DAILY_COLUMNS\}|\$\{c\}/g, '')),
  'queries.js menyusun rentang tanggal ke dalam string SQL, bukan lewat parameter terikat');
assert(/\?1/.test(queriesSource) && /\?2/.test(queriesSource),
  'queries.js tidak memakai parameter terikat ?1/?2');

/* ================= (c) PINDAI index.js — perbandingan waktu-konstan ====================== */

section('(c) index.js: perbandingan rahasia waktu-konstan');

assert(/function ctEq\(/.test(indexSource), 'fungsi perbandingan waktu-konstan ctEq() tidak ada');
assert(/diff \|=/.test(indexSource) && /return diff === 0;/.test(indexSource),
  'ctEq() tidak terlihat menjumlahkan selisih bit (bukan waktu-konstan)');

// Tidak ada operator kesetaraan langsung yang diterapkan pada nilai rahasia.
const SECRET_WORD = '(token|hash|digest|secret|password|pepper|signature|sig)';
const LEFT_SIDE = new RegExp('[A-Za-z0-9_.$]*' + SECRET_WORD + '[A-Za-z0-9_.$]*\\s*[!=]==?', 'i');
const RIGHT_SIDE = new RegExp('[!=]==?\\s*[A-Za-z0-9_.$(\'"]*' + SECRET_WORD, 'i');
for (const line of indexSource.split('\n')) {
  const code = line.replace(/\/\/.*$/, '');
  assert(!LEFT_SIDE.test(code), 'perbandingan langsung atas nilai rahasia: ' + line.trim());
  assert(!RIGHT_SIDE.test(code), 'perbandingan langsung atas nilai rahasia: ' + line.trim());
}
// Dua tempat yang WAJIB memakai ctEq: digest token owner dan tanda tangan cookie sesi.
assert(/ctEq\(presentedDigest,/.test(indexSource), 'digest token owner tidak dibandingkan lewat ctEq()');
assert(/ctEq\(presented, expected\)/.test(indexSource), 'tanda tangan sesi tidak dibandingkan lewat ctEq()');

// Tidak ada rahasia di repo: hanya NAMA binding/Secret yang boleh muncul.
assert(!/OWNER_TOKEN_HASH\s*=\s*['"][0-9a-f]{16,}/i.test(indexSource + wranglerSource + readmeSource),
  'ada nilai hash token owner tertulis di repo');
assert(/OWNER_TOKEN_HASH/.test(wranglerSource) && !/^\s*OWNER_TOKEN_HASH\s*=/m.test(wranglerSource),
  'wrangler.toml harus MENYEBUT nama Secret tanpa memuat nilainya');
assert(!/\[vars\]/.test(wranglerSource), 'wrangler.toml owner tidak boleh punya [vars] (tempat rahasia menyelinap)');

/* ================= Halaman dirender Worker, bukan berkas di repo ========================= */

section('HTML dirender Worker (sw.js precache + invarian SW_REV tidak tersentuh)');

assert(!fs.existsSync(path.join(__dirname, 'owner.html')), 'owner.html tidak boleh ada di repo (sw.js precache)');
const swSource = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
assert(!/owner/i.test(swSource.split('\n').filter((l) => /ASSETS|\.html|\.js'/.test(l)).join('\n')),
  'daftar precache sw.js tidak boleh memuat aset owner');
assert(/SW_REV/.test(indexSource) && /precache/i.test(indexSource),
  'index.js wajib menuliskan ALASAN kenapa HTML dirender Worker (sw.js precache + SW_REV)');
assert(!/https?:\/\/[^\s"')]+\.(js|css)/i.test(indexSource), 'dashboard owner tidak boleh memuat aset dari CDN');

/* ================= Harness: stub D1 + fixture agregat ==================================== */

// Fixture 40 hari agregat. Nol baris per-orang: fixture pun tidak punya tabel per-orang,
// jadi seandainya kode owner mencoba membacanya, stub akan MELEMPAR.
const DAYS = 40;
const LAST_DAY = '2026-08-26';
function shift(day, delta) {
  return new Date(Date.parse(day + 'T00:00:00Z') + delta * 86400000).toISOString().slice(0, 10);
}
const metricsDaily = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const day = shift(LAST_DAY, -i);
  const isLast = i === 0;
  metricsDaily.push({
    day,
    visitors: 200 + i, new_users: 10 + (i % 5), registered_total: 1000 - i * 3,
    dau: isLast ? 123 : 100 + (i % 7), wau: isLast ? 456 : 400, mau: isLast ? 789 : 700,
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
const FLOW = ['visitors', 'new_users', 'sessions', 'lessons_started', 'lessons_completed', 'answers',
  'ai_calls', 'ai_tokens_out', 'ai_err_429', 'ai_err_timeout', 'ai_err_5xx', 'tts_calls',
  'tts_chars_rendered', 'tts_cache_hits', 'tts_cache_misses', 'tts_failures', 'quota_hit_users',
  'breaker_trips', 'worker_requests', 'backend_errors', 'offline_late_events'];

// Kalibrasi cf-a10: 1.000 pengguna, aura-1, cache 70% → US$162,01/bulan, US$0,162/pengguna.
const COST_FIXTURE = {
  days_counted: 30,
  tts_chars_rendered: 10486632,
  ai_tokens_in: 16840160,
  ai_tokens_out: 5868160,
  infra_usd: 1.7,                 // langganan US$5,00 − kredit gratis US$3,30
  tts_usd: 157.3, llm_usd: 3.01, total_usd: 162.01,
  tokens_are_estimated: 0,
};
const COST_RATES_FIXTURE = {
  day: LAST_DAY, tts_provider: 'workers-ai aura-1', tts_usd_per_1m_chars: 15.0,
  llm_model: '@cf/meta/llama-3.1-8b-instruct-fp8-fast',
  llm_usd_per_1m_in: 0.045, llm_usd_per_1m_out: 0.384, dau_at_calc: 123, tokens_are_estimated: 0,
};
const RETENTION_FIXTURE = [
  { cohort_day: shift(LAST_DAY, -1), day_offset: 1, cohort_size: 120, retained: 54 },
  { cohort_day: shift(LAST_DAY, -7), day_offset: 7, cohort_size: 110, retained: 33 },
  { cohort_day: shift(LAST_DAY, -20), day_offset: 30, cohort_size: 12, retained: 4 },
];

function inRange(day, from, to) { return day >= from && day <= to; }

// D1 palsu: hanya query yang SUDAH DIDAFTARKAN dijawab; sisanya MELEMPAR, supaya query baru
// yang belum diperiksa gerbang tidak bisa lolos dengan diam-diam mengembalikan undefined.
function fakeD1() {
  const log = [];
  const norm = (sql) => sql.replace(/\s+/g, ' ').trim();
  const handlers = [
    [/^SELECT day, visitors,.*ORDER BY day DESC LIMIT 1$/, () => [metricsDaily[metricsDaily.length - 1]]],
    [/^SELECT COUNT\(\*\) AS days_counted, COALESCE\(SUM\(tts_chars_rendered\)/, () => [COST_FIXTURE]],
    [/^SELECT COUNT\(\*\) AS days_counted, MIN\(day\)/, (b) => {
      const rows = metricsDaily.filter((r) => inRange(r.day, b[0], b[1]));
      const out = { days_counted: rows.length, day_from: rows[0] && rows[0].day, day_to: rows.length ? rows[rows.length - 1].day : null };
      for (const col of FLOW) out[col] = rows.reduce((a, r) => a + r[col], 0);
      out.days_broken = rows.filter((r) => r.collection_ok === 0).length;
      return [out];
    }],
    [/^SELECT MAX\(dau\) AS dau_peak/, (b) => {
      const rows = metricsDaily.filter((r) => inRange(r.day, b[0], b[1]));
      return [{
        dau_peak: Math.max(...rows.map((r) => r.dau)),
        wau_peak: Math.max(...rows.map((r) => r.wau)),
        mau_peak: Math.max(...rows.map((r) => r.mau)),
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
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
  };
}

const AE_WRITES = [];
const OWNER_TOKEN = 'uji-token-owner-32-byte-acak-xyz';
function sha256Hex(text) {
  return require('crypto').createHash('sha256').update(text, 'utf8').digest('hex');
}
function makeEnv(overrides) {
  return Object.assign({
    ANALYTICS: fakeD1(),
    AE: { writeDataPoint: (p) => AE_WRITES.push(p) },
    OWNER_TOKEN_HASH: sha256Hex(OWNER_TOKEN),
    OWNER_SESSION_KEY: 'kunci-hmac-sesi-uji-hanya-untuk-test',
  }, overrides || {});
}

const NOW = Date.parse('2026-08-27T02:00:00Z');
const METRIC_KEYS = /"?(dau|wau|mau|total_usd|totalUsd|new_users|registered_total|quota_hit_users|tts_chars_rendered)"?\s*[:=]/;

function makeRequest(url, opts) {
  return new Request('https://owner.fiezel.my.id' + url, opts || {});
}

(async () => {
  // Rewrite impor relatif → data: URL, lalu muat modul Worker ESM tanpa bundler.
  const mod = await import(dataUrl(indexSource.replace("'./queries.js'", `'${dataUrl(queriesSource)}'`)));

  /* ================= (a) SEMUA rute 403 tanpa sesi owner ================================= */
  section('(a) bab 32 #20: semua rute 403 tanpa sesi owner yang sah');

  const routes = mod.OWNER_ROUTES;
  assert(Array.isArray(routes) && routes.length >= 5, 'inventaris OWNER_ROUTES tidak diekspor');
  assert(routes.includes('/'), 'halaman dashboard harus ada di inventaris rute ber-gate');
  assert(JSON.stringify(mod.PUBLIC_ROUTES) === JSON.stringify(['/login']),
    'hanya /login yang boleh publik; rute publik lain = kebocoran');

  const goodCookieValue = await mod.issueSession(makeEnv(), NOW);
  const attempts = [
    ['tanpa cookie', {}],
    ['cookie kosong', { headers: { cookie: mod.SESSION_COOKIE + '=' } }],
    ['cookie sampah', { headers: { cookie: mod.SESSION_COOKIE + '=bukan-sesi' } }],
    ['cookie ter-tamper', { headers: { cookie: mod.SESSION_COOKIE + '=' + goodCookieValue.slice(0, -3) + 'aaa' } }],
    ['cookie kedaluwarsa', { headers: { cookie: mod.SESSION_COOKIE + '=' + (await mod.issueSession(makeEnv(), NOW - mod.SESSION_TTL_MS - 1000)) } }],
    ['header X-Owner', { headers: { 'x-owner': '1' } }],
    ['header X-Forwarded-Owner', { headers: { 'x-forwarded-owner': 'owner' } }],
  ];
  const probeRoutes = routes.concat(['/api/rute-baru-yang-lupa-dipagari', '/admin', '/api/owner/summary', '/index.html']);

  for (const route of probeRoutes) {
    for (const [label, opts] of attempts) {
      const env = makeEnv();
      const res = await mod.handle(makeRequest(route, opts), env, {}, NOW);
      assert(res.status === 403, `${route} [${label}] → ${res.status}, seharusnya 403`);
      const body = await res.text();
      assert(!METRIC_KEYS.test(body), `${route} [${label}] membocorkan kunci metrik di respons yang gagal gate`);
      assert(env.ANALYTICS._log.length === 0, `${route} [${label}] menyentuh D1 SEBELUM gate lulus`);
    }
    // ?admin=true, header, dan body TIDAK PERNAH mengubah keputusan.
    const res2 = await mod.handle(makeRequest(route + '?admin=true&period=30d', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-owner': 'true' },
      body: JSON.stringify({ userId: 'owner', admin: true, role: 'owner' }),
    }), makeEnv(), {}, NOW);
    assert(res2.status === 403, `${route} dengan ?admin=true + header + body → ${res2.status}, seharusnya 403`);
  }

  // Fail-closed: Secret belum dipasang → bahkan halaman masuk 403 (fitur baru default OFF).
  for (const route of ['/login', '/', '/api/summary']) {
    const res = await mod.handle(makeRequest(route), { ANALYTICS: fakeD1() }, {}, NOW);
    assert(res.status === 403, `tanpa Secret, ${route} → ${res.status}, seharusnya 403 (fail-closed)`);
  }

  // Token salah tidak pernah menerbitkan cookie sesi.
  const badLogin = await mod.handle(makeRequest('/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ t: 'token-salah' }),
  }), makeEnv(), {}, NOW);
  assert(badLogin.status === 403, 'token salah → ' + badLogin.status + ', seharusnya 403');
  assert(!/fz_owner=[A-Za-z0-9]/.test(badLogin.headers.get('set-cookie') || ''),
    'token salah tidak boleh menerbitkan cookie sesi');

  // Token benar → cookie sesi HttpOnly/Secure/SameSite berumur pendek.
  const okLogin = await mod.handle(makeRequest('/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ t: OWNER_TOKEN }),
  }), makeEnv(), {}, NOW);
  assert(okLogin.status === 303, 'token benar → ' + okLogin.status + ', seharusnya 303');
  const setCookie = okLogin.headers.get('set-cookie') || '';
  assert(/HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie),
    'cookie sesi owner harus HttpOnly + Secure + SameSite=Strict: ' + setCookie);
  const maxAge = Number((setCookie.match(/Max-Age=(\d+)/i) || [])[1]);
  assert(maxAge > 0 && maxAge <= 3600, 'sesi owner harus berumur pendek (≤1 jam), dapat ' + maxAge);
  assert(mod.SESSION_TTL_MS <= 60 * 60 * 1000, 'SESSION_TTL_MS harus ≤ 1 jam');

  // Sesi milik kunci lain tidak diterima (tanda tangan diverifikasi, bukan dipercaya).
  const foreign = await mod.issueSession({ OWNER_SESSION_KEY: 'kunci-penyerang' }, NOW);
  const foreignRes = await mod.handle(makeRequest('/', { headers: { cookie: mod.SESSION_COOKIE + '=' + foreign } }), makeEnv(), {}, NOW);
  assert(foreignRes.status === 403, 'cookie yang ditandatangani kunci lain harus 403');

  /* ================= (e) DAU/WAU/MAU dari tabel agregat ================================== */
  section('(e) bab 32 #22: DAU/WAU/MAU dari tabel agregat');

  const env = makeEnv();
  const cookie = mod.SESSION_COOKIE + '=' + (await mod.issueSession(env, NOW));
  const page = await mod.handle(makeRequest('/?period=30d', { headers: { cookie } }), env, {}, NOW);
  assert(page.status === 200, 'owner sah harus 200, dapat ' + page.status);
  const pageHtml = await page.text();

  const sql = env.ANALYTICS._log.join(' | ');
  assert(/metrics_daily/.test(sql), 'DAU/WAU/MAU tidak dibaca dari tabel metrik agregat');
  for (const table of ['identity', 'daily_active', 'usage_daily']) {
    assert(!new RegExp('\\b' + table + '\\b').test(sql), 'dashboard menyentuh tabel per-orang: ' + table);
  }
  assert(!/COUNT\(DISTINCT/i.test(sql), 'DAU/WAU/MAU tidak boleh dihitung ulang dengan COUNT(DISTINCT ...) per-orang');
  assert(!/user_id/i.test(sql), 'SQL yang dijalankan menyentuh kolom per-orang');

  const summaryRes = await mod.handle(makeRequest('/api/summary?period=30d', { headers: { cookie } }), makeEnv(), {}, NOW);
  const summary = JSON.parse(await summaryRes.text());
  assert(summary.latest.dau === 123, 'DAU harus persis nilai agregat fixture (123), dapat ' + summary.latest.dau);
  assert(summary.latest.wau === 456, 'WAU harus persis nilai agregat fixture (456), dapat ' + summary.latest.wau);
  assert(summary.latest.mau === 789, 'MAU harus persis nilai agregat fixture (789), dapat ' + summary.latest.mau);
  assert(summary.measurementBasis === 'perangkat-estimasi', 'respons JSON wajib menyatakan basis pengukuran = perangkat');
  assert(/ESTIMASI PERANGKAT/i.test(summary.honesty), 'respons JSON wajib membawa kalimat kejujuran estimasi perangkat');
  assert(!/user_id|install_id|uuid|email/i.test(JSON.stringify(summary)), 'respons owner memuat field per-orang');

  assert(pageHtml.includes('123') && pageHtml.includes('456') && pageHtml.includes('789'),
    'kartu DAU/WAU/MAU tidak menampilkan angka agregat');

  /* ================= Panel + kejujuran + desain ========================================== */
  section('panel wajib, label kejujuran, dan palet FIEZEL');

  for (const panel of ['User growth', 'Active users', 'Retention', 'Learning activity',
    'AI usage', 'TTS usage', 'Infrastructure', 'Cost estimation', 'Quota exhaustion']) {
    assert(pageHtml.toLowerCase().includes(panel.toLowerCase()), 'panel hilang dari dashboard: ' + panel);
  }
  assert(/ESTIMASI PERANGKAT/i.test(pageHtml), 'dashboard wajib menyatakan angka = estimasi perangkat');
  assert(/dua perangkat = dua hitungan/i.test(pageHtml), 'batas "satu orang dua perangkat" wajib tercetak');
  assert(/menghapus data browser/i.test(pageHtml), 'batas "hapus data browser = perangkat baru" wajib tercetak');
  assert(/ESTIMASI PERANGKAT/i.test(pageHtml.split('Retention')[1] || ''), 'panel RETENTION wajib memuat peringatan estimasi perangkat');
  assert(/cache hit rate/i.test(pageHtml), 'panel TTS wajib menampilkan cache hit rate');
  assert(/1\.005/.test(pageHtml) && /15,00/.test(pageHtml) && /0,045/.test(pageHtml) && /0,384/.test(pageHtml),
    'asumsi biaya (1005 char/menit, 15,0 USD/1M char, 0,045/0,384) wajib tampil di UI');
  assert(/ASUMSI YANG DIPAKAI/i.test(pageHtml), 'kartu biaya wajib mencetak asumsinya, bukan angka ajaib');
  assert(pageHtml.includes('#FFF8ED') && pageHtml.includes('#2B2118') && pageHtml.includes('#FFD23F'),
    'palet FIEZEL (cream/ink/kuning) tidak dipakai');
  assert(/width=device-width/.test(pageHtml), 'dashboard harus mobile-first (meta viewport)');
  assert(/@media\(min-width:640px\)/.test(pageHtml), 'tata letak harus satu kolom dulu, grid setelah 640px');
  assert(!/<script/i.test(pageHtml), 'dashboard owner tidak boleh memuat script (tanpa framework, tanpa CDN)');
  assert(!/https?:\/\//.test(pageHtml.replace(/reports\/[a-z0-9-]+\.md/g, '')), 'dashboard tidak boleh memuat URL eksternal (tanpa CDN)');
  assert(/noindex/.test(pageHtml), 'halaman owner harus noindex');
  assert(/collection_ok=0|rollup GAGAL/i.test(pageHtml), 'panel data quality wajib menyatakan hari rollup gagal');
  assert(/belum cukup data/.test(pageHtml), 'cohort < 30 wajib ditulis "belum cukup data", bukan persentase palsu');

  const loginPage = await mod.handle(makeRequest('/login'), makeEnv(), {}, NOW);
  const loginHtml = await loginPage.text();
  assert(loginPage.status === 200, 'halaman masuk harus 200');
  assert(!METRIC_KEYS.test(loginHtml) && !/\bDAU\b/.test(loginHtml), 'halaman masuk tidak boleh memuat metrik');
  assert(!new RegExp(OWNER_TOKEN).test(loginHtml), 'halaman masuk tidak boleh memuat token');

  /* ================= (d) rumus biaya ===================================================== */
  section('(d) bab 32 #24: rumus biaya cf-a10');

  // Kalibrasi cf-a10-cost-model.json: 1.000 pengguna, aura-1, cache 70%.
  const calib = mod.estimateCost({
    ttsCharsRendered: 10486632, aiTokensIn: 16840160, aiTokensOut: 5868160,
    ttsUsdPer1MChars: 15.0, llmUsdPer1MIn: 0.045, llmUsdPer1MOut: 0.384,
    infraUsd: 5.0, freeAiCreditUsd: 3.3, ttsOnWorkersAi: true,
    activeDevices: 1000, registeredDevices: 1000,
  });
  const near = (a, b, tol) => Math.abs(a - b) <= Math.abs(b) * (tol == null ? 0.01 : tol);
  assert(near(calib.ttsUsd, 157.3), 'biaya TTS ≠ US$157,30, dapat ' + calib.ttsUsd);
  assert(near(calib.llmUsd, 3.01), 'biaya LLM ≠ US$3,01, dapat ' + calib.llmUsd);
  assert(near(calib.totalUsd, 162.01), 'total ≠ US$162,01, dapat ' + calib.totalUsd);
  assert(near(calib.usdPerActiveDevice, 0.162), 'biaya/pengguna ≠ US$0,162, dapat ' + calib.usdPerActiveDevice);
  assert(near(calib.audioMinutesRendered, 10486632 / 1005), 'menit audio harus dihitung dengan 1005 char/menit');

  // Cache hit tidak berbiaya: hanya karakter yang benar-benar dirender masuk rumus.
  const cachedOnly = mod.estimateCost({ ttsCharsRendered: 0, aiTokensIn: 0, aiTokensOut: 0, infraUsd: 0 });
  assert(cachedOnly.ttsUsd === 0 && cachedOnly.totalUsd === 0, 'cache hit penuh harus berbiaya US$0');

  // Mengganti tarif provider mengubah hasil secara proporsional.
  const melotts = mod.estimateCost({ ttsCharsRendered: 10486632, ttsUsdPer1MChars: 0.2 });
  assert(near(melotts.ttsUsd, 10486632 / 1e6 * 0.2), 'tarif provider tidak proporsional');
  assert(near(melotts.ttsUsd * (15.0 / 0.2), calib.ttsUsd), 'perubahan tarif harus proporsional terhadap aura-1');

  // Pembagi nol → null, bukan Infinity/NaN.
  const zero = mod.estimateCost({ ttsCharsRendered: 1000, activeDevices: 0, registeredDevices: 0 });
  assert(zero.usdPerActiveDevice === null && zero.usdPerRegisteredDevice === null,
    'DAU=0 harus menghasilkan null, bukan pembagian nol');

  // Asumsi ikut keluar dari rumus supaya UI bisa mencetaknya.
  assert(calib.assumptions.charsPerAudioMin === 1005, 'chars_per_audio_min harus 1005');
  assert(calib.assumptions.ttsUsdPer1MChars === 15.0, 'tarif aura-1 harus 15,0 USD/1M char');
  assert(mod.RATE_CARD.llmUsdPer1MIn === 0.045 && mod.RATE_CARD.llmUsdPer1MOut === 0.384,
    'tarif LLM 0,045/0,384 harus ada di rate card');
  assert(mod.RATE_CARD.ttsUsdPer1MChars['workers-ai aura-1'] === 15.0, 'aura-1 15,0 USD/1M char harus ada di rate card');
  assert(mod.estimateCost({ tokensAreEstimated: true }).assumptions.tokensAreEstimated === true,
    'penanda token=proksi harus diteruskan ke UI');

  // Kartu biaya di HTML memakai rumus yang sama dengan fixture cost_daily.
  const costRes = await mod.handle(makeRequest('/api/cost?period=30d', { headers: { cookie } }), makeEnv(), {}, NOW);
  const cost = JSON.parse(await costRes.text());
  assert(near(cost.computed.totalUsd, 162.01), 'kartu biaya periode ≠ US$162,01, dapat ' + cost.computed.totalUsd);
  assert(cost.assumptions.ttsProvider === 'workers-ai aura-1', 'provider TTS harus ikut di respons biaya');

  /* ================= Jejak audit + rute JSON ============================================= */
  section('jejak audit akses owner + rute JSON');

  assert(AE_WRITES.some((p) => p.blobs && p.blobs[0] === 'owner_access'), 'akses owner tidak meninggalkan jejak audit');
  assert(!AE_WRITES.some((p) => JSON.stringify(p).match(/\d+\.\d+\.\d+\.\d+/)), 'jejak audit tidak boleh memuat IP');

  for (const route of ['/api/series', '/api/retention']) {
    const res = await mod.handle(makeRequest(route + '?period=30d', { headers: { cookie } }), makeEnv(), {}, NOW);
    assert(res.status === 200, route + ' untuk owner sah harus 200, dapat ' + res.status);
    const payload = await res.text();
    assert(!/user_id|install_id|uuid|email/i.test(payload), route + ' membocorkan field per-orang');
  }

  /* ================= README: batas kejujuran ============================================= */
  section('README: deploy, Secret, login, batas kejujuran');

  for (const needle of ['wrangler deploy', 'wrangler secret put', 'OWNER_TOKEN_HASH', 'OWNER_SESSION_KEY',
    'estimasi perangkat', 'Batas kejujuran']) {
    assert(readmeSource.toLowerCase().includes(needle.toLowerCase()), 'README kurang bagian: ' + needle);
  }
  assert(!new RegExp(OWNER_TOKEN).test(readmeSource), 'README tidak boleh memuat contoh token yang dipakai produksi');

  if (failures) {
    console.error('\nowner-dashboard-test: GAGAL (' + failures + ' assert)');
    process.exit(1);
  }
  console.log('\nowner-dashboard-test: LULUS — ' +
    'semua rute 403 tanpa sesi owner, SQL agregat-saja, perbandingan waktu-konstan, ' +
    'rumus biaya cf-a10 terkalibrasi, DAU/WAU/MAU dari tabel agregat.');
})().catch((err) => {
  console.error('owner-dashboard-test: GAGAL keras — ' + (err && err.stack || err));
  process.exit(1);
});
