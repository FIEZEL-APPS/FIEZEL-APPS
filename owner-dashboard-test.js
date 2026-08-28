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
//
// KOREKSI D2: `usage_daily` DIKELUARKAN dari daftar ini, dan itu bukan pelemahan gerbang.
// Larangan lama berdiri di atas `reports/cf-b5-analytics.md` §2.1, yang memuat varian per-orang
// bertabel nama sama. Varian itu SENGAJA TIDAK DIBUAT (0002_analytics.sql peringatan #2). Yang
// benar-benar ada di produksi berbentuk (day, bucket, count) dengan `bucket` berenum tertutup
// 'dimensi:nilai' — nol identitas, dan satu-satunya jalan memecah error AI/TTS serta penolakan
// kuota. Gantinya, dua tabel yang MEMANG berbahaya dimasukkan ke daftar: `dau_dedup` (token
// per-perangkat) dan `pepper_state` (bahan rahasia HMAC). Keduanya ada di database yang sama,
// jadi tanpa baris ini tidak ada apa pun yang mencegah dashboard membacanya.
// Cakupan tabel lengkapnya (lima tabel yang diizinkan, nol di luar itu) diassert
// d1-schema-contract-test.js langsung terhadap DDL migrasi.
for (const table of ['identity', 'daily_active', 'dau_dedup', 'pepper_state',
  'quota_daily', 'quota_reservation', 'cost_daily', 'retention_cohort']) {
  assert(!new RegExp('\\bFROM\\s+' + table + '\\b', 'i').test(queriesSource),
    'queries.js membaca tabel yang dilarang untuk owner: ' + table);
}
assert(/\bFROM\s+metrics_daily\b/.test(queriesSource) && /\bFROM\s+usage_daily\b/.test(queriesSource)
  && /\bFROM\s+retention_daily\b/.test(queriesSource),
  'queries.js harus membaca tiga tabel agregat yang benar-benar ada (metrik, dimensi pemakaian, retensi)');

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
// Baris di bawah adalah bentuk PIVOT yang enak dibaca manusia. Stub D1 memancarkannya kembali
// sebagai baris (day, metric, value) — persis bentuk PANJANG tabel `metrics_daily` yang nyata
// (workers/api/migrations/0002_analytics.sql). Fixture bentuk LEBAR yang dipakai versi
// sebelumnya justru MENGUNCI skema yang tidak ada: gerbangnya hijau sementara produksi akan
// gagal total begitu event pertama masuk. Itu kegagalan gerbang, bukan sekadar fixture lama.
const metricsDaily = [];
for (let i = DAYS - 1; i >= 0; i--) {
  const day = shift(LAST_DAY, -i);
  const isLast = i === 0;
  metricsDaily.push({
    day,
    collection_ok: i === 3 ? 0 : 1,
    events_total: 5000,
    dau: isLast ? 123 : 100 + (i % 7),
    // WAU/MAU disimpan sepasang batas (bukan satu angka) karena dedup lintas hari mustahil.
    wau_lower: isLast ? 456 : 400, wau_upper: isLast ? 560 : 500,
    mau_lower: isLast ? 789 : 700, mau_upper: isLast ? 900 : 850,
    wau_mau_is_estimate: 1,
    app_open: 200 + i, app_open_with_identity: 120, day_active_reports: 150,
    new_users: 10 + (i % 5),
    sessions: 300, sessions_ended: 280, sessions_completed: 250, session_answers: 1800,
    lessons_started: 90, lessons_completed: 45,
    answers: 2000, answers_ok: 1400,
    ai_calls: 400, ai_success: 394, ai_failure: 6,
    ai_tokens_in: 561339, ai_tokens_out: 195606,
    tts_calls: 900, tts_success: 895, tts_failure: 5,
    tts_cache_hits: 700, tts_cache_misses: 200, tts_chars_rendered: 349555,
    quota_exhausted: 4, breaker_trips: 1, breaker_recoveries: 1,
  });
}
// Semua nama metrik di atas WAJIB punya penulis di jalur server; itu diassert terpisah oleh
// d1-schema-contract-test.js, jadi fixture ini tidak bisa mengarang metrik yang tidak ada.
const METRIC_NAMES = Object.keys(metricsDaily[0]).filter((k) => k !== 'day');

// usage_daily: bentuknya (day, bucket, count) dengan bucket berenum tertutup 'dimensi:nilai'.
// Jumlah bucket ai_err:* sengaja dibuat SAMA dengan metrik ai_failure (6) supaya panel tidak
// memunculkan peringatan selisih pada fixture yang sehat.
const USAGE_FIXTURE = [];
for (const r of metricsDaily) {
  USAGE_FIXTURE.push(
    { day: r.day, bucket: 'ai_err:429', count: 3 },
    { day: r.day, bucket: 'ai_err:timeout', count: 1 },
    { day: r.day, bucket: 'ai_err:5xx', count: 2 },
    { day: r.day, bucket: 'tts_err:timeout', count: 5 },
    { day: r.day, bucket: 'quota:ai', count: 3 },
    { day: r.day, bucket: 'quota:tts', count: 1 },
  );
}

// retention_daily: (cohort_day, day_index, count). TIDAK ADA kolom ukuran kohor — baris
// day_index 0 ITULAH ukuran kohornya, dan dashboard wajib menurunkannya dari sana.
// Kohor D30 sengaja kecil (12) supaya aturan "cohort < 30 → belum cukup data" ikut teruji.
const RETENTION_FIXTURE = [
  { cohort_day: shift(LAST_DAY, -1), day_index: 0, count: 120 },
  { cohort_day: shift(LAST_DAY, -1), day_index: 1, count: 54 },
  { cohort_day: shift(LAST_DAY, -7), day_index: 0, count: 110 },
  { cohort_day: shift(LAST_DAY, -7), day_index: 7, count: 33 },
  { cohort_day: shift(LAST_DAY, -20), day_index: 0, count: 12 },
  { cohort_day: shift(LAST_DAY, -20), day_index: 30, count: 4 },
];

function inRange(day, from, to) { return day >= from && day <= to; }

// Satu pabrik stub D1 dipakai SEMUA skenario (fixture penuh, nol baris, satu hari nol, gagal
// baca). Dua pabrik terpisah adalah cara paling mudah membuat satu skenario diam-diam memakai
// skema lama tanpa ada yang sadar.
//
// Hanya query yang SUDAH DIDAFTARKAN dijawab; sisanya MELEMPAR, supaya query baru yang belum
// diperiksa gerbang tidak bisa lolos dengan diam-diam mengembalikan undefined.
function makeD1(opts) {
  const o = opts || {};
  const days = o.days || [];
  const usage = o.usage || [];
  const retention = o.retention || [];
  const log = [];
  const norm = (sql) => sql.replace(/\s+/g, ' ').trim();
  // Bentuk panjang: satu baris per (hari, metrik). Nilai 0 TETAP jadi baris — itulah bedanya
  // "nol terukur" dengan "tidak ada baris", dan justru beda itu yang diuji gerbang ini.
  const longRows = (from, to) => {
    const out = [];
    for (const r of days) {
      if (from != null && !inRange(r.day, from, to)) continue;
      for (const k of Object.keys(r)) {
        if (k !== 'day') out.push({ day: r.day, metric: k, value: Number(r[k]) || 0 });
      }
    }
    return out;
  };
  const handlers = [
    // LATEST_DAY — pada tabel kosong SQLite mengembalikan satu baris berisi NULL.
    [/^SELECT MAX\(day\) AS day FROM metrics_daily$/, () => [{
      day: days.length ? days[days.length - 1].day : null,
    }]],
    // COLLECTION_START
    [/^SELECT MIN\(day\) AS day_first_collected/, () => [{
      day_first_collected: days.length ? days[0].day : null, days_total: days.length,
    }]],
    // PERIOD_DAYS
    [/^SELECT COUNT\(DISTINCT day\) AS days_counted/, (b) => {
      const rows = days.filter((r) => inRange(r.day, b[0], b[1]));
      return [{
        days_counted: rows.length,
        day_from: rows.length ? rows[0].day : null,
        day_to: rows.length ? rows[rows.length - 1].day : null,
      }];
    }],
    // PERIOD_TOTALS — GROUP BY metric, jadi metrik tanpa baris TIDAK muncul sama sekali.
    [/^SELECT metric, COALESCE\(SUM\(value\), 0\) AS total/, (b) => {
      const acc = new Map();
      for (const r of longRows(b[0], b[1])) {
        const e = acc.get(r.metric) || { metric: r.metric, total: 0, days: 0 };
        e.total += r.value; e.days += 1; acc.set(r.metric, e);
      }
      return [...acc.values()].sort((x, y) => (x.metric < y.metric ? -1 : 1));
    }],
    // DAY_METRICS (hari diikat ?1)
    [/^SELECT metric, value FROM metrics_daily WHERE day = \?1/, (b) => longRows(b[0], b[0])
      .map((r) => ({ metric: r.metric, value: r.value }))],
    // METRIC_PEAK (nama metrik diikat ?1)
    [/^SELECT COUNT\(\*\) AS days, MAX\(value\) AS peak/, (b) => {
      const rows = longRows(b[1], b[2]).filter((r) => r.metric === b[0]);
      if (rows.length === 0) return [{ days: 0, peak: null, avg: null }];
      return [{
        days: rows.length,
        peak: Math.max(...rows.map((r) => r.value)),
        avg: rows.reduce((a, r) => a + r.value, 0) / rows.length,
      }];
    }],
    // BROKEN_DAYS (nama metrik diikat ?1)
    [/^SELECT COUNT\(\*\) AS days_broken/, (b) => [{
      days_broken: longRows(b[1], b[2]).filter((r) => r.metric === b[0] && r.value === 0).length,
    }]],
    // SERIES
    [/^SELECT day, metric, value FROM metrics_daily/, (b) => longRows(b[0], b[1])
      .filter((r) => SERIES_KEYS.includes(r.metric))],
    // USAGE_TOTALS
    [/^SELECT bucket, COALESCE\(SUM\(count\), 0\) AS total/, (b) => {
      const acc = new Map();
      for (const r of usage) {
        if (!inRange(r.day, b[0], b[1])) continue;
        const e = acc.get(r.bucket) || { bucket: r.bucket, total: 0, days: 0 };
        e.total += Number(r.count) || 0; e.days += 1; acc.set(r.bucket, e);
      }
      return [...acc.values()].sort((x, y) => (x.bucket < y.bucket ? -1 : 1));
    }],
    // RETENTION
    [/^SELECT cohort_day, day_index, count FROM retention_daily/, (b) => retention
      .filter((r) => inRange(r.cohort_day, b[0], b[1]))],
  ];
  function run(sql, binds) {
    const key = norm(sql);
    log.push(key);
    // Pesan galat meniru kegagalan skema yang NYATA: kueri yang ditulis untuk tabel/kolom yang
    // tidak ada. Itulah cacat yang paket ini perbaiki, jadi itulah kegagalan yang disimulasikan.
    if (o.throwAll) throw new Error('D1_ERROR: no such table: cost_daily (skema tidak cocok)');
    for (const [re, fn] of handlers) {
      if (re.test(key)) return (fn(binds) || []).map((r) => Object.assign({}, r, o.extraFields || {}));
    }
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
// Metrik yang ikut di kueri SERIES (harus sama dengan SERIES_METRICS di queries.js; diassert
// di bawah supaya fixture tidak bisa diam-diam berbeda dari kode).
const SERIES_KEYS = ['dau', 'new_users', 'answers', 'ai_calls', 'tts_calls', 'collection_ok'];

function fakeD1() {
  return makeD1({ days: metricsDaily, usage: USAGE_FIXTURE, retention: RETENTION_FIXTURE });
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
    // Wave D (D17): edge guard kini fail-closed tanpa EDGE_SHARED_SECRET. Test ini menguji
    // logika dashboard, bukan edge guard (guard punya suite sendiri 583 assert), jadi
    // escape hatch eksplisit dipakai di sini agar request uji sampai ke handler.
    ALLOW_NO_EDGE_SECRET: 'true',
  }, overrides || {});
}

const NOW = Date.parse('2026-08-27T02:00:00Z');
const METRIC_KEYS = /"?(dau|wau|mau|total_usd|totalUsd|new_users|registered_total|quota_hit_users|tts_chars_rendered)"?\s*[:=]/;

function makeRequest(url, opts) {
  return new Request('https://owner.fiezel.my.id' + url, opts || {});
}

/* ==========================================================================================
 * PENANDA BUKU (D4). `GET /` tanpa sesi menjawab 303 ke `/login`, bukan 403
 * `{"error":"forbidden"}`. Alasannya di `workers/owner/README.md` §1: yang membuka
 * `https://owner.fiezel.my.id` tanpa sesi — atau sesudah sesi 30 menitnya habis, jadi ini
 * kejadian HARIAN — adalah owner, dan JSON galat untuk pemilik pintu itu cacat, bukan keamanan.
 * Yang TIDAK boleh melemah, dan itu yang diassert di sini: pengalihan tidak membawa data, tidak
 * menyentuh cookie, dan bentuknya tidak bergantung pada apakah Secret sudah dipasang.
 * ======================================================================================== */
async function assertLoginRedirect(res, label) {
  assert(res.status === 303, label + ': GET / tanpa sesi → 303, dapat ' + res.status);
  assert((res.headers.get('location') || '') === '/login',
    label + ": Location tepat '/login', dapat " + JSON.stringify(res.headers.get('location')));
  const body = await res.text();
  assert(body === '', label + ': pengalihan nol byte badan, dapat ' + body.length);
  assert(!res.headers.get('set-cookie'), label + ': pengalihan tidak menyentuh cookie');
  const shape = [...res.headers].map(([k, v]) => k + ':' + v).sort().join('|');
  assert(!METRIC_KEYS.test(body + shape), label + ': pengalihan tidak memuat kunci metrik');
  assert(!/OWNER_TOKEN_HASH|OWNER_SESSION_KEY|belum dikonfigurasi/i.test(body + shape),
    label + ': pengalihan tidak menyebut Secret atau keadaan konfigurasi');
  return res.status + '|' + shape + '|' + body;
}

(async () => {
  // Rewrite impor relatif → data: URL, lalu muat modul Worker ESM tanpa bundler.
  const mod = await import(dataUrl(indexSource.replace("'./queries.js'", `'${dataUrl(queriesSource)}'`)));
  const q = await import(dataUrl(queriesSource));

  // Fixture TIDAK BOLEH mengarang metrik sendiri. Setiap nama metrik di fixture wajib ada di
  // daftar metrik queries.js, dan daftar itu sendiri diassert punya penulis nyata di
  // workers/api/ oleh d1-schema-contract-test.js. Tanpa dua rantai ini, gerbang bisa hijau di
  // atas metrik yang tidak pernah ditulis siapa pun — tepat cacat yang paket ini perbaiki.
  for (const name of METRIC_NAMES) {
    assert(q.ALL_METRICS.includes(name),
      'fixture memakai metrik yang tidak dikenal queries.js: ' + name);
  }
  assert(SERIES_KEYS.slice().sort().join(',') === q.SERIES_METRICS.slice().sort().join(','),
    'daftar metrik sparkline di fixture berbeda dari SERIES_METRICS di queries.js');
  for (const bucket of USAGE_FIXTURE.map((r) => r.bucket)) {
    assert(Object.prototype.hasOwnProperty.call(q.USAGE_BUCKETS, bucket),
      'fixture memakai bucket usage_daily yang tidak dikenal queries.js: ' + bucket);
  }

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
      if (route === '/') {
        await assertLoginRedirect(res.clone(), `${route} [${label}]`);
      } else {
        assert(res.status === 403, `${route} [${label}] → ${res.status}, seharusnya 403`);
      }
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
  const configuredRootShape = await assertLoginRedirect(
    await mod.handle(makeRequest('/'), makeEnv(), {}, NOW), '/ dengan Secret lengkap');
  for (const route of ['/login', '/', '/api/summary']) {
    const res = await mod.handle(makeRequest(route), { ANALYTICS: fakeD1() }, {}, NOW);
    if (route === '/') {
      // Fail-closed TIDAK berarti "403 di semua tempat": `GET /` mengalihkan ke halaman masuk.
      // Syaratnya jawabannya BYTE-IDENTIK dengan saat Secret lengkap, kalau tidak `curl -I /`
      // menjadi cara memeriksa apakah dashboard sudah dikonfigurasi.
      const shape = await assertLoginRedirect(res, 'tanpa Secret, /');
      assert(shape === configuredRootShape,
        'pengalihan / identik dengan/tanpa Secret (bukan oracle konfigurasi)');
    } else {
      assert(res.status === 403, `tanpa Secret, ${route} → ${res.status}, seharusnya 403 (fail-closed)`);
    }
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
  await assertLoginRedirect(foreignRes, 'cookie yang ditandatangani kunci lain');
  const foreignApi = await mod.handle(makeRequest('/api/summary', { headers: { cookie: mod.SESSION_COOKIE + '=' + foreign } }), makeEnv(), {}, NOW);
  assert(foreignApi.status === 403,
    'cookie yang ditandatangani kunci lain tetap 403 di rute data, dapat ' + foreignApi.status);

  /* ================= (e) DAU/WAU/MAU dari tabel agregat ================================== */
  section('(e) bab 32 #22: DAU/WAU/MAU dari tabel agregat');

  const env = makeEnv();
  const cookie = mod.SESSION_COOKIE + '=' + (await mod.issueSession(env, NOW));
  const page = await mod.handle(makeRequest('/?period=30d', { headers: { cookie } }), env, {}, NOW);
  assert(page.status === 200, 'owner sah harus 200, dapat ' + page.status);
  const pageHtml = await page.text();

  const sql = env.ANALYTICS._log.join(' | ');
  assert(/metrics_daily/.test(sql), 'DAU/WAU/MAU tidak dibaca dari tabel metrik agregat');
  for (const table of ['identity', 'daily_active', 'dau_dedup', 'pepper_state', 'cost_daily']) {
    assert(!new RegExp('\\b' + table + '\\b').test(sql), 'dashboard menyentuh tabel terlarang: ' + table);
  }
  // COUNT(DISTINCT day) sah (menghitung HARI, bukan orang). Yang dilarang adalah menghitung
  // ulang perangkat unik dari baris token — dan itu mustahil di sini karena tabel tokennya tidak
  // pernah disebut sama sekali (assert di atas).
  assert(!/COUNT\(DISTINCT\s+(?!day\b)/i.test(sql),
    'COUNT(DISTINCT ...) hanya boleh atas kolom hari, bukan atas penunjuk perangkat');
  assert(!/user_id/i.test(sql), 'SQL yang dijalankan menyentuh kolom per-orang');

  const summaryRes = await mod.handle(makeRequest('/api/summary?period=30d', { headers: { cookie } }), makeEnv(), {}, NOW);
  const summary = JSON.parse(await summaryRes.text());
  assert(summary.latest.dau === 123, 'DAU harus persis nilai agregat fixture (123), dapat ' + summary.latest.dau);
  // WAU/MAU adalah SEPASANG batas, bukan satu angka: dedup lintas hari mustahil (pepper dirotasi
  // 24 jam). Gerbang mengunci bentuk berpasangan itu, supaya tidak ada yang "merapikan" UI
  // dengan satu angka tunggal yang mengarang presisi.
  assert(summary.latest.wau_lower === 456 && summary.latest.wau_upper === 560,
    'WAU harus berupa pasangan batas fixture (456–560), dapat '
    + summary.latest.wau_lower + '–' + summary.latest.wau_upper);
  assert(summary.latest.mau_lower === 789 && summary.latest.mau_upper === 900,
    'MAU harus berupa pasangan batas fixture (789–900), dapat '
    + summary.latest.mau_lower + '–' + summary.latest.mau_upper);
  assert(summary.latest.wau === undefined && summary.latest.mau === undefined,
    'WAU/MAU tidak boleh muncul sebagai satu angka tunggal: skema hanya menyimpan batas bawah/atas');
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

  // Rute biaya memakai VOLUME dari metrics_daily (bukan tabel biaya — tabel itu tidak ada dan
  // dilarang dibuat). Jadi yang diassert di sini adalah perakitannya: volume periode berasal dari
  // penjumlahan baris nyata, dan totalnya sama dengan rumus yang sudah dikalibrasi di atas.
  const costRes = await mod.handle(makeRequest('/api/cost?period=30d', { headers: { cookie } }), makeEnv(), {}, NOW);
  const cost = JSON.parse(await costRes.text());
  const from = cost.from, to = cost.to;
  const inPeriod = metricsDaily.filter((r) => r.day >= from && r.day <= to);
  const sum = (k) => inPeriod.reduce((a, r) => a + r[k], 0);
  assert(inPeriod.length > 0, 'periode 30d harus mencakup hari fixture; dapat 0 hari');
  const expected = mod.estimateCost({
    ttsCharsRendered: sum('tts_chars_rendered'),
    aiTokensIn: sum('ai_tokens_in'),
    aiTokensOut: sum('ai_tokens_out'),
  });
  assert(near(cost.computed.totalUsd, expected.totalUsd),
    'total biaya periode harus = rumus atas volume metrics_daily (' + expected.totalUsd
    + '), dapat ' + cost.computed.totalUsd);
  // Biaya WAJIB nol tanpa volume, bukan angka infrastruktur karangan: tidak ada satu pun sumber
  // di database ini yang tahu tagihan Cloudflare.
  assert(mod.estimateCost({}).totalUsd === 0,
    'tanpa volume, biaya harus 0 — tidak boleh ada komponen infrastruktur yang dikarang');
  assert((cost.unmeasurable || []).length > 0
    && cost.unmeasurable.every((x) => x.hal && x.sebab),
    'rute biaya wajib menyebutkan apa yang TIDAK bisa diukur beserta sebabnya');
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

  /* ================= (f) "belum ada pengukuran" ≠ "nol terukur" ========================== */
  // KENAPA INI ADA (bab 28): owner mengambil keputusan KUOTA dari halaman ini. Dashboard yang
  // menulis "0 perangkat aktif" padahal yang benar "belum ada pengukuran" memberi owner fakta
  // palsu untuk dipangkas. Tiga keadaan wajib dirender BERBEDA:
  //   no-data     → nol baris hari di tabel agregat (pemancar klien belum ada).
  //   measured    → ada baris hari, nilainya benar-benar nol.
  //   unavailable → pembacaan D1 gagal; kegagalan tidak boleh menyamar jadi nol.
  section('(f) keadaan kosong: "belum ada pengukuran" WAJIB ≠ "nol terukur"');

  const ZERO_DAY = LAST_DAY;
  const zeroRow = Object.assign({}, metricsDaily[metricsDaily.length - 1]);
  for (const k of Object.keys(zeroRow)) if (k !== 'day') zeroRow[k] = 0;
  zeroRow.day = ZERO_DAY;
  zeroRow.collection_ok = 1;            // hari INI terkumpul; hasilnya yang nol.

  // D1 palsu yang meniru perilaku SQL sungguhan pada nol baris:
  //   COUNT(*) → 0, SUM(...) → NULL yang di-COALESCE jadi 0, MAX(...) → NULL, LIMIT 1 → null.
  // Justru karena COALESCE mengubah "tidak ada" menjadi 0, keadaan TIDAK BOLEH disimpulkan dari
  // nilai metrik — dan itulah yang gerbang ini kunci.
  // Skenario kosong/nol/gagal memakai PABRIK YANG SAMA dengan fixture penuh (makeD1), jadi tidak
  // mungkin satu skenario diam-diam berjalan di atas skema yang berbeda.
  function fakeD1Rows(rows, opts) {
    return makeD1(Object.assign({
      days: rows,
      usage: [],
      retention: [],
    }, opts || {}));
  }

  async function pageWith(db) {
    const e = makeEnv({ ANALYTICS: db });
    const ck = mod.SESSION_COOKIE + '=' + (await mod.issueSession(e, NOW));
    const res = await mod.handle(makeRequest('/?period=7d', { headers: { cookie: ck } }), e, {}, NOW);
    return { res, html: await res.text(), env: e, cookie: ck };
  }
  async function summaryWith(db) {
    const e = makeEnv({ ANALYTICS: db });
    const ck = mod.SESSION_COOKIE + '=' + (await mod.issueSession(e, NOW));
    const res = await mod.handle(makeRequest('/api/summary?period=7d', { headers: { cookie: ck } }), e, {}, NOW);
    return JSON.parse(await res.text());
  }
  // Potongan satu panel, supaya assert menunjuk kartu tertentu dan bukan "ada di halaman".
  function panel(htmlText, title) {
    const parts = String(htmlText).split('<section>');
    return parts.find((p) => p.toLowerCase().includes(title.toLowerCase())) || '';
  }

  const empty = await pageWith(fakeD1Rows([]));
  const zeroPage = await pageWith(fakeD1Rows([zeroRow]));
  const broken = await pageWith(fakeD1Rows([], { throwAll: true }));

  assert(empty.res.status === 200, 'keadaan kosong harus tetap 200 untuk owner sah, dapat ' + empty.res.status);
  assert(zeroPage.res.status === 200, 'keadaan nol-terukur harus 200, dapat ' + zeroPage.res.status);
  assert(broken.res.status === 200, 'kegagalan baca D1 harus tetap merender halaman jujur (200), dapat ' + broken.res.status);

  // INTI: dua keadaan itu tidak boleh menghasilkan halaman yang sama.
  assert(empty.html !== zeroPage.html, '"belum ada pengukuran" dan "nol terukur" merender HTML IDENTIK');
  assert(empty.html !== broken.html, '"belum ada pengukuran" dan "pengukuran tidak tersedia" merender HTML identik');

  const activeEmpty = panel(empty.html, 'Active users');
  const activeZero = panel(zeroPage.html, 'Active users');
  assert(activeEmpty.includes(mod.NO_DATA_TEXT),
    'panel Active users pada keadaan kosong harus berbunyi "' + mod.NO_DATA_TEXT + '"');
  assert(!activeEmpty.includes(mod.MEASURED_ZERO_TEXT),
    'keadaan kosong tidak boleh mengaku "' + mod.MEASURED_ZERO_TEXT + '"');
  assert(activeZero.includes(mod.MEASURED_ZERO_TEXT),
    'nol yang terukur harus ditandai "' + mod.MEASURED_ZERO_TEXT + '", bukan angka 0 telanjang');
  assert(!activeZero.includes(mod.NO_DATA_TEXT),
    'nol terukur tidak boleh berbunyi "' + mod.NO_DATA_TEXT + '" (itu meremehkan pengukuran yang nyata)');
  assert(!/<b>0<\/b>/.test(empty.html),
    'keadaan kosong merender angka 0 telanjang — owner akan membacanya sebagai fakta');
  assert(new RegExp('<b>0 \\(' + mod.MEASURED_ZERO_TEXT + '\\)</b>').test(zeroPage.html),
    'nol terukur harus dirender sebagai "0 (' + mod.MEASURED_ZERO_TEXT + ')"');

  // Spanduk keadaan wajib DI ATAS panel, bukan catatan kaki, dan menyebut sebab yang benar.
  assert(empty.html.includes(mod.NO_DATA_BANNER), 'spanduk "belum ada pengukuran" tidak dirender');
  assert(/cfAnalyticsEnabled/.test(empty.html) && /pemancar/i.test(empty.html),
    'spanduk kosong wajib menyebut sebabnya: pemancar klien belum ada + cfAnalyticsEnabled false');
  assert(empty.html.indexOf('class="empty"') < empty.html.indexOf('<main>'),
    'spanduk keadaan harus di ATAS panel, bukan di bawah');
  assert(/keputusan kuota/i.test(empty.html), 'halaman kosong wajib melarang keputusan kuota di atasnya');

  // Kegagalan baca ≠ nol, dan sebabnya disebut.
  assert(broken.html.includes(mod.UNAVAILABLE_TEXT), 'kegagalan baca D1 harus berbunyi "' + mod.UNAVAILABLE_TEXT + '"');
  assert(!broken.html.includes(mod.MEASURED_ZERO_TEXT), 'kegagalan baca D1 tidak boleh digambar sebagai nol terukur');
  assert(/LATEST_DAY|PERIOD_TOTALS/.test(broken.html), 'halaman "tidak tersedia" wajib menyebut query yang gagal');

  // Sparkline: nol hari = tidak ada grafik. Garis datar di nol adalah pengukuran palsu.
  assert(!/<polyline/.test(empty.html), 'keadaan kosong tidak boleh menggambar garis grafik');

  // JSON membawa keadaan yang SAMA — dua permukaan tidak boleh bercerita beda.
  const sEmpty = await summaryWith(fakeD1Rows([]));
  const sZero = await summaryWith(fakeD1Rows([zeroRow]));
  const sBroken = await summaryWith(fakeD1Rows([], { throwAll: true }));
  assert(sEmpty.measurement && sEmpty.measurement.state === mod.STATE_NO_DATA,
    'JSON keadaan kosong harus state=' + mod.STATE_NO_DATA + ', dapat ' + JSON.stringify(sEmpty.measurement && sEmpty.measurement.state));
  assert(sZero.measurement.state === mod.STATE_MEASURED, 'JSON nol-terukur harus state=' + mod.STATE_MEASURED);
  assert(sBroken.measurement.state === mod.STATE_UNAVAILABLE, 'JSON gagal-baca harus state=' + mod.STATE_UNAVAILABLE);
  assert(sEmpty.measurement.zeroMeansMeasured === false && sZero.measurement.zeroMeansMeasured === true,
    'JSON wajib menyatakan apakah nol berarti terukur');
  assert(sEmpty.measurement.daysTotal === 0 && sZero.measurement.daysTotal === 1,
    'jumlah hari terrollup wajib ikut di JSON (dasar keputusan keadaan)');
  assert(sBroken.measurement.readErrors.length > 0, 'JSON gagal-baca wajib menyebut query yang gagal');
  assert(sEmpty.dataHonesty === mod.NO_DATA_BANNER, 'JSON kosong wajib membawa kalimat kejujuran yang sama dengan HTML');

  // Periode di luar rentang data yang ADA: keadaan sendiri, bukan "nol".
  const oldRow = Object.assign({}, zeroRow, { day: '2026-01-01', dau: 5, collection_ok: 1 });
  const outOfRange = await pageWith(fakeD1Rows([oldRow]));
  const sOut = await summaryWith(fakeD1Rows([oldRow]));
  // Assert ini SENGAJA tidak lagi menerima STATE_MEASURED sebagai jawaban yang sah. Versi lama
  // ("MEASURED ATAU NO_DATA_IN_PERIOD") tidak menguji apa pun: dengan rentang yang dijangkarkan
  // pada hari rollup TERAKHIR, keadaan no-data-in-period mustahil terjadi, jadi assert itu selalu
  // hijau lewat cabang MEASURED. Sekarang rentang dijangkarkan pada HARI INI, sehingga data yang
  // hanya berisi 2026-01-01 memang berada di luar periode 7d — dan keadaan keempat benar-benar
  // punya arti, bukan hiasan.
  assert(sOut.measurement.state === mod.STATE_NO_DATA_IN_PERIOD,
    'data yang seluruhnya di luar periode WAJIB berkeadaan ' + mod.STATE_NO_DATA_IN_PERIOD
    + ', dapat ' + sOut.measurement.state);
  assert(sOut.measurement.daysTotal === 1 && sOut.measurement.daysCounted === 0,
    'keadaan no-data-in-period harus diputuskan dari JUMLAH HARI (total>0, dalam periode=0), dapat '
    + sOut.measurement.daysTotal + '/' + sOut.measurement.daysCounted);
  assert(outOfRange.html.includes(mod.NO_DATA_PERIOD_BANNER),
    'periode tanpa hari wajib mencetak spanduk periodenya sendiri, bukan spanduk "belum ada pengukuran"');
  assert(!outOfRange.html.includes('<b>5</b>'),
    'periode tanpa hari tidak boleh menampilkan angka dari hari lain sebagai fakta periode ini');
  // Data basi wajib terbaca sebagai basi, bukan tersembunyi di balik rentang yang menyesuaikan diri.
  assert(/DATA BASI/.test(outOfRange.html) && /Periksa cron rollup/.test(outOfRange.html),
    'rollup yang berhenti berhari-hari wajib memunculkan peringatan kebasian di halaman');

  /* ================= (g) default-deny rute + (h) nol rute owner tanpa gerbang ============= */
  section('(g)+(h) default deny rute & nol rute owner yang bisa diakses tanpa gerbang');

  // Rute yang belum ada HARI INI adalah rute yang paling mudah lupa dipagari besok.
  const UNKNOWN_ROUTES = [
    '/api', '/api/', '/api/summary2', '/api/owner', '/api/owner/summary', '/api/cost/detail',
    '/api/students', '/api/murid', '/api/export', '/api/debug', '/admin', '/admin/', '/dashboard',
    '/owner', '/metrics', '/health', '/healthz', '/status', '/.env', '/.git/config',
    '/wrangler.toml', '/queries.js', '/index.js', '/favicon.ico', '/robots.txt', '/sitemap.xml',
    '/LOGIN', '/Login', '/logout/x', '/api/summary.json', '/api//summary',
  ];
  // Jalur yang DINORMALISASI oleh URL/handler menjadi rute yang memang ada ('/api/summary/../summary'
  // → '/api/summary', '/%2e%2e/' → '/', '/login/' → '/login'). Ia bukan rute baru, jadi yang
  // diuji hanya bahwa TANPA sesi ia tetap 403 — bukan bahwa ia 403 untuk owner yang sah.
  const NORMALIZING_ROUTES = ['/api/summary/../summary', '/%2e%2e/', '/login/', '/api/cost/'];
  const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  const reachableWithoutGate = [];
  for (const route of UNKNOWN_ROUTES.concat(NORMALIZING_ROUTES.filter((r) => !/login/i.test(r)))) {
    for (const m2 of METHODS) {
      const e = makeEnv();
      const res = await mod.handle(makeRequest(route, { method: m2 }), e, {}, NOW);
      // `/%2e%2e/` dinormalkan menjadi `/`; untuk GET, jawaban yang benar kini pengalihan ke
      // halaman masuk (tetap nol data, nol cookie), bukan 403.
      if (m2 === 'GET' && route === '/%2e%2e/') await assertLoginRedirect(res.clone(), 'GET ' + route);
      else if (res.status !== 403) reachableWithoutGate.push(m2 + ' ' + route + ' → ' + res.status);
      assert(e.ANALYTICS._log.length === 0, m2 + ' ' + route + ' menyentuh D1 sebelum gate lulus');
    }
  }
  assert(reachableWithoutGate.length === 0,
    'ada rute yang bisa diakses tanpa gerbang owner: ' + reachableWithoutGate.join(', '));

  // Default deny berlaku JUGA untuk owner yang sudah masuk: sesi sah bukan surat izin universal.
  const withSessionNot403 = [];
  for (const route of UNKNOWN_ROUTES) {
    if (route.toLowerCase() === '/login') continue;
    const e = makeEnv();
    const ck = mod.SESSION_COOKIE + '=' + (await mod.issueSession(e, NOW));
    const res = await mod.handle(makeRequest(route, { headers: { cookie: ck } }), e, {}, NOW);
    if (res.status !== 403) withSessionNot403.push(route + ' → ' + res.status);
  }
  assert(withSessionNot403.length === 0,
    'rute tak dikenal harus 403 bahkan untuk sesi owner yang sah (default deny): ' + withSessionNot403.join(', '));

  // Semua rute ber-gate wajib terdaftar, dan hanya /login yang publik.
  for (const route of mod.OWNER_ROUTES) {
    assert(!mod.PUBLIC_ROUTES.includes(route), 'rute owner ' + route + ' bocor ke daftar publik');
    const e = makeEnv();
    const res = await mod.handle(makeRequest(route), e, {}, NOW);
    if (route === '/') await assertLoginRedirect(res, 'rute owner / tanpa sesi');
    else assert(res.status === 403, 'rute owner ' + route + ' tanpa sesi → ' + res.status + ', harus 403');
  }
  assert(mod.PUBLIC_ROUTES.length === 1, 'jumlah rute publik harus tepat satu, dapat ' + mod.PUBLIC_ROUTES.length);
  // Rute publik pun tidak boleh menyentuh D1 (halaman masuk bukan pintu data).
  for (const m2 of ['GET', 'POST']) {
    const e = makeEnv();
    await mod.handle(makeRequest('/login', m2 === 'POST'
      ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ t: 'salah' }) }
      : {}), e, {}, NOW);
    assert(e.ANALYTICS._log.length === 0, 'halaman masuk (' + m2 + ') menyentuh D1');
  }
  // Tidak ada satu pun rute owner yang dilewatkan penjaga edge (daftar bebas-header harus kosong).
  assert(Array.isArray(mod.EDGE_FREE_PATHS) && mod.EDGE_FREE_PATHS.length === 0,
    'nol rute boleh bebas dari penjaga edge di Worker owner');

  /* ================= (i) kontrak privasi: nol identitas murid perorangan ================= */
  section('(i) KONTRAK PRIVASI: dashboard tidak pernah menampilkan identitas murid perorangan');

  // Skenario terburuk yang realistis: suatu hari tabel agregat mendapat kolom asing (mis. karena
  // migrasi salah atau JOIN yang lolos). Dashboard TETAP tidak boleh menampilkannya — penyaringan
  // ada di sisi PEMBACA, bukan cuma di sisi penulis.
  const LEAK_FIELDS = {
    user_id: 'murid-0042',
    install_id: 'inst-8f3c9a',
    learner_name: 'Aisyah Putri',
    email: 'aisyah@example.test',
    provider_uuid: '11111111-2222-3333-4444-555555555555',
    answer_text: 'She go to school every day',
    ai_transcript: 'tolong jelaskan present simple',
    ip: '203.0.113.7',
    user_agent: 'Mozilla/5.0 (Linux; Android 13)',
  };
  const leakDb = () => fakeD1Rows([Object.assign({}, metricsDaily[metricsDaily.length - 1])], { extraFields: LEAK_FIELDS });
  const leakPage = await pageWith(leakDb());
  const leakSurfaces = [['HTML /', leakPage.html]];
  for (const route of ['/api/summary', '/api/series', '/api/retention', '/api/cost']) {
    const e = makeEnv({ ANALYTICS: leakDb() });
    const ck = mod.SESSION_COOKIE + '=' + (await mod.issueSession(e, NOW));
    const res = await mod.handle(makeRequest(route + '?period=7d', { headers: { cookie: ck } }), e, {}, NOW);
    leakSurfaces.push([route, await res.text()]);
  }
  for (const [label, body] of leakSurfaces) {
    for (const [field, value] of Object.entries(LEAK_FIELDS)) {
      assert(!body.includes(value), label + ' menampilkan NILAI identitas murid (' + field + ')');
      assert(!new RegExp('\\b' + field + '\\b').test(body),
        label + ' menampilkan NAMA kolom identitas murid (' + field + ')');
    }
    assert(!/\b(nama murid|learner|siswa ke-|top user|per murid|drill.?down)\b/i.test(body),
      label + ' memuat istilah per-murid (daftar/urutan/drill-down individu)');
  }
  // Bukti penyaringan benar-benar berjalan (bukan fixture yang kebetulan tidak terpakai).
  const leakSummary = await summaryWith(leakDb());
  assert(leakSummary.measurement.droppedFieldCount >= Object.keys(LEAK_FIELDS).length,
    'kolom asing tidak tercatat dibuang — penyaring pembaca tidak berjalan (dapat '
    + leakSummary.measurement.droppedFieldCount + ')');
  assert(!('droppedFields' in leakSummary.measurement),
    'JSON tidak boleh mengulang NAMA kolom asing keluar (nama kolom pun bisa jadi petunjuk)');
  for (const field of Object.keys(LEAK_FIELDS)) {
    const dropped = [];
    mod.sanitizeRow(Object.assign({ dau: 1 }, { [field]: LEAK_FIELDS[field] }), dropped);
    assert(dropped.includes(field), 'sanitizeRow() tidak membuang kolom "' + field + '"');
  }
  assert(!mod.ALLOWED_ROW_FIELDS.has('user_id') && !mod.ALLOWED_ROW_FIELDS.has('learner_name'),
    'daftar putih field tidak boleh memuat kolom per-orang');
  // Bentuk PANJANG: baris yang sah dari D1 adalah (day, metric, value) — bukan kolom per-metrik.
  // Karena itu `dau` BUKAN lagi nama kolom yang sah dan ikut dibuang; itu perilaku yang benar.
  assert(Object.keys(mod.sanitizeRow(Object.assign({ metric: 'dau', value: 1 }, LEAK_FIELDS), [])).sort().join(',')
    === 'metric,value', 'sanitizeRow() harus menyisakan HANYA field agregat');
  assert(Object.keys(mod.sanitizeRow({ dau: 1 }, [])).length === 0,
    'nama metrik sebagai KOLOM adalah bentuk skema lama dan harus ikut dibuang');
  // Dashboard tidak boleh punya rute yang secara konsep per-murid.
  for (const route of mod.OWNER_ROUTES) {
    assert(!/(student|murid|learner|user)s?\b/i.test(route), 'ada rute owner yang berorientasi per-murid: ' + route);
  }

  if (failures) {
    console.error('\nowner-dashboard-test: GAGAL (' + failures + ' assert)');
    process.exit(1);
  }
  console.log('\nowner-dashboard-test: LULUS — ' +
    'rute data 403 tanpa sesi owner (GET / 303 ke /login, nol data, nol cookie), ' +
    'SQL agregat-saja, perbandingan waktu-konstan, ' +
    'rumus biaya cf-a10 terkalibrasi, DAU/WAU/MAU dari tabel agregat.');
})().catch((err) => {
  console.error('owner-dashboard-test: GAGAL keras — ' + (err && err.stack || err));
  process.exit(1);
});
