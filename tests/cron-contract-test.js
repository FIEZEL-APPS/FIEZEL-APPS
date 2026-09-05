/**
 * tests/cron-contract-test.js — GERBANG kontrak Cron Trigger Worker `fiezel-api` (A3).
 *
 * Node murni, nol dependency, nol jaringan. Memakai `tools/cf-test-harness.js`
 * untuk binding palsu dan MENGEKSEKUSI Worker sungguhan: graf ESM di
 * `workers/api/**` dirakit menjadi `data:text/javascript;base64,…` lalu diimpor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KENAPA GERBANG INI ADA
 * ────────────────────────────────────────────────────────────────────────────
 * Dua Cron Trigger sudah terpasang di Cloudflare (ekspresi tiap-5-menit untuk
 * sweep kuota, `5 17 * * *` untuk rollup analytics + rotasi pepper; nilai
 * literalnya ada di konstanta CRON_SWEEP/CRON_ROLLUP) dan SATU pun belum pernah
 * terbukti berjalan benar. Selama itu, dua klaim produk berdiri tanpa bukti:
 *   1. "slot kuota yang tertahan kembali dalam menit"  -> butuh sweep hidup;
 *   2. "server tidak bisa menyambung hari-1 ke hari-2" -> butuh rollup hidup,
 *      karena rollup-lah yang MENGHAPUS `dau_dedup` dan MEROTASI pepper.
 * Kalau rollup gagal diam-diam, klaim (2) bukan lagi janji yang lemah — ia
 * menjadi pernyataan palsu tentang data orang. Gerbang ini menolak keadaan
 * "mungkin jalan".
 *
 * Yang dibuktikan (butir sesuai perintah paket kerja A3):
 *   (a) `scheduled()` memanggil SWEEP pada ekspresi 5-menit dan ROLLUP pada
 *       ekspresi harian — tidak keduanya sekaligus;
 *   (b) rollup dijalankan dua kali TIDAK menurunkan angka (idempoten monoton);
 *   (c) pepper lama benar-benar DIHAPUS, bukan diarsipkan;
 *   (d) `cron_run` tercatat untuk SUKSES dan GAGAL;
 *   (e) tidak ada pesan galat mentah atau data murid di dalam tabel `cron_run`;
 *   (f) `dau_dedup` kosong + `usage_daily` terisi -> `collection_ok=0`;
 *   (g) `GET /api/owner/cron-status` 403 tanpa kredensial owner.
 * Plus (h): pemasangan — rute terdaftar, migrasi ada, gerbang terdaftar di CI.
 *
 * Gagal mengekstrak sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const nodeCrypto = require('crypto');

const root = __fzRoot;
const API_DIR = path.join(root, 'workers', 'api');
const H = require(path.join(root, 'tools', 'cf-test-harness.js'));

/* ============================================================ pelaporan ============ */

const checks = [];
let failed = false;

function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
}

function finish(extra) {
  const report = {
    schema: 'fiezel-cron-contract-v1',
    pass: !failed,
    counts: {
      pass: checks.filter((c) => c.status === 'PASS').length,
      fail: checks.filter((c) => c.status === 'FAIL').length
    },
    ...extra,
    checks
  };
  fs.writeFileSync(path.join(root, 'CRON-CONTRACT-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

function mustRead(relative) {
  const file = path.join(API_DIR, relative);
  if (!fs.existsSync(file)) throw new Error('berkas wajib tidak ada: workers/api/' + relative);
  return fs.readFileSync(file, 'utf8');
}

/* ============================================================ perakit modul ======== */
/* Sama polanya dengan `tests/cf-wiring-test.js`: path bersarang diselesaikan relatif
 * terhadap modul pengimpor, dan `await import('../x.js')` dinamis ikut ditulis
 * ulang (jalur pepper memakainya). */
const MODULE_CACHE = new Map();
const REL = '(\\.\\.?\\/[A-Za-z0-9_.\\/-]+\\.js)';

function inlineModule(relative, stack = []) {
  const rel = relative.replace(/\\/g, '/');
  if (MODULE_CACHE.has(rel)) return MODULE_CACHE.get(rel);
  if (stack.includes(rel)) throw new Error('impor sirkular: ' + stack.concat(rel).join(' -> '));
  const source = mustRead(rel);
  const dir = path.posix.dirname(rel);
  const resolve = (dep) => inlineModule(path.posix.normalize(path.posix.join(dir, dep)), stack.concat(rel));
  const transformed = source.split('\n').map((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
    return line
      .replace(new RegExp("(from\\s+')" + REL + "(')", 'g'), (a, p, d, s) => p + resolve(d) + s)
      .replace(new RegExp("(import\\s*\\(\\s*')" + REL + "('\\s*\\))", 'g'), (a, p, d, s) => p + resolve(d) + s)
      .replace(new RegExp("(^\\s*import\\s+')" + REL + "(')", 'g'), (a, p, d, s) => p + resolve(d) + s);
  }).join('\n');
  const url = 'data:text/javascript;base64,' + Buffer.from(transformed, 'utf8').toString('base64');
  MODULE_CACHE.set(rel, url);
  return url;
}

/* ============================================================ lingkungan uji ======= */

const ORIGIN = 'https://fiezel.my.id';
const CLOCK_ISO = '2026-08-27T17:05:00.000Z'; // persis jam cron harian: 00:05 WIB 28 Agu
const NOW = Date.parse(CLOCK_ISO);
const DAY_MS = 86400000;
const ROLLUP_DAY = new Date(NOW - DAY_MS).toISOString().slice(0, 10); // hari yang baru selesai
const CRON_SWEEP = '*/5 * * * *';
const CRON_ROLLUP = '5 17 * * *';

const OWNER_TOKEN = 'uji-token-owner-a3-0123456789abcdef';
const OWNER_TOKEN_HASH = nodeCrypto.createHash('sha256').update(OWNER_TOKEN).digest('hex');

function migrationStatements(relative) {
  return mustRead(relative)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function applyMigration(db, relative) {
  for (const statement of migrationStatements(relative)) await db.prepare(statement).run();
}

function boot(worker, options = {}) {
  const clock = H.fakeClock(CLOCK_ISO);
  const core = H.fakeD1();
  const stats = H.fakeD1();
  const kv = H.fakeKV({ clock });

  const env = {
    SERVICE_NAME: 'fiezel-api',
    API_VERSION: 'cf-api-1',
    ALLOWED_ORIGINS: ORIGIN,
    COOKIE_DOMAIN: 'fiezel.my.id',
    FEATURE_AI: 'off',
    FEATURE_TTS: 'off',
    ANALYTICS_ENABLED: 'on',
    // m0261-d17: gerbang edge kini fail-closed tanpa EDGE_SHARED_SECRET; harness
    // ini menguji kontrak cron, bukan gerbang jembatan. Jitter anon dimatikan.
    ALLOW_NO_EDGE_SECRET: 'true',
    ANON_JITTER_MAX_MS: '0',
    SESSION_HMAC_KEY_CURRENT: 'uji-secret-cookie-current-0123456789',
    ANALYTICS_PEPPER_CURRENT: 'uji-pepper-analytics-0123456789',
    OWNER_TOKEN_HASH,
    TEST_CLOCK_MS: String(NOW),
    CORE_DB: core,
    STATS_DB: stats,
    CFG: kv,
    AI: H.fakeAI({ clock }).binding,
    ANALYTICS: H.fakeAnalyticsEngine().dataset || H.fakeAnalyticsEngine(),
    ...options.vars
  };

  const call = async (method, pathname, opt = {}) => {
    const headers = new Headers(opt.headers || {});
    if (opt.origin !== null) headers.set('origin', opt.origin || ORIGIN);
    if (opt.cookie) headers.set('cookie', opt.cookie);
    const init = { method, headers };
    if (opt.body !== undefined) {
      init.body = opt.body;
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    const request = new Request('https://api.fiezel.my.id' + pathname, init);
    const response = await worker.fetch(request, env, H.fakeExecutionContext());
    const text = await response.clone().text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: response.status, json, text };
  };

  const cron = (expression, at) => worker.scheduled(
    { cron: expression, scheduledTime: Number.isFinite(at) ? at : NOW },
    env, H.fakeExecutionContext()
  );

  const runs = () => core._rows('cron_run').map((r) => ({ ...r }));
  const metric = (day, name) => {
    const row = stats._rows('metrics_daily').find((r) => r.day === day && r.metric === name);
    return row ? Number(row.value) : null;
  };

  return { clock, core, stats, env, call, cron, runs, metric };
}

async function bootMigrated(worker, options = {}) {
  const app = boot(worker, options);
  await applyMigration(app.core, 'migrations/0001_identity.sql');
  await applyMigration(app.core, 'migrations/0001_quota.sql');
  await applyMigration(app.core, 'migrations/0003_cron.sql');
  if (options.skipAnalyticsMigration !== true) {
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
  }
  return app;
}

/** Benih token DAU + baris pemakaian untuk satu hari (tanpa lewat HTTP). */
async function seedDau(stats, day, tokens) {
  for (const token of tokens) {
    await stats.prepare('INSERT OR IGNORE INTO dau_dedup (day, token) VALUES (?1, ?2)').bind(day, token).run();
  }
}
async function seedUsage(stats, day, buckets) {
  for (const [bucket, count] of Object.entries(buckets)) {
    await stats.prepare(
      'INSERT INTO usage_daily (day, bucket, count) VALUES (?1, ?2, ?3) ' +
      'ON CONFLICT(day, bucket) DO UPDATE SET count = count + excluded.count'
    ).bind(day, bucket, count).run();
  }
}
async function seedPepper(stats, rotatedAt, current, previous) {
  await stats.prepare(
    'INSERT INTO pepper_state (id, rotated_at, current, previous) VALUES (1, ?1, ?2, ?3) ' +
    'ON CONFLICT(id) DO UPDATE SET rotated_at = excluded.rotated_at, current = excluded.current, previous = excluded.previous'
  ).bind(rotatedAt, current, previous).run();
}

const tok = (seed) => seed.repeat(32).slice(0, 32);

/* ============================================================ MAIN ================= */

(async () => {
  const worker = (await import(inlineModule('index.js'))).default;
  const cronMod = await import(inlineModule('cron-status.js'));

  /* ==================================================================== */
  /* (a) Satu ekspresi cron = satu job. Bukan keduanya sekaligus.          */
  /* ==================================================================== */
  {
    const app = await bootMigrated(worker);

    const sweepOut = await app.cron(CRON_SWEEP);
    check('a ekspresi 5-menit menjalankan SWEEP',
      !!(sweepOut && sweepOut.quotaSweep), JSON.stringify(sweepOut));
    check('a ekspresi 5-menit TIDAK menjalankan rollup (rollup harian bukan tiap 5 menit)',
      sweepOut && sweepOut.analyticsRollup === null, JSON.stringify(sweepOut && sweepOut.analyticsRollup));
    const afterSweep = app.runs();
    check('a sweep meninggalkan TEPAT satu baris cron_run bernama quota_sweep',
      afterSweep.length === 1 && afterSweep[0].job === 'quota_sweep', JSON.stringify(afterSweep));
    check('a sweep tanpa satu pun reservasi tetap SUKSES dengan rows_affected 0',
      afterSweep.length === 1 && Number(afterSweep[0].ok) === 1 && Number(afterSweep[0].rows_affected) === 0,
      JSON.stringify(afterSweep[0]));

    const rollupOut = await app.cron(CRON_ROLLUP);
    check('a ekspresi harian menjalankan ROLLUP',
      !!(rollupOut && rollupOut.analyticsRollup && rollupOut.analyticsRollup.day),
      JSON.stringify(rollupOut && rollupOut.analyticsRollup));
    check('a ekspresi harian TIDAK menjalankan sweep',
      rollupOut && rollupOut.quotaSweep === null, JSON.stringify(rollupOut && rollupOut.quotaSweep));
    const afterRollup = app.runs();
    check('a rollup meninggalkan baris cron_run bernama analytics_rollup',
      afterRollup.length === 2 && afterRollup[1].job === 'analytics_rollup' && Number(afterRollup[1].ok) === 1,
      JSON.stringify(afterRollup));
    check('a kedua job tidak pernah tercatat pada jalan cron yang sama',
      afterRollup.filter((r) => r.job === 'quota_sweep').length === 1 &&
      afterRollup.filter((r) => r.job === 'analytics_rollup').length === 1,
      JSON.stringify(afterRollup.map((r) => r.job)));

    // Kontrak lawas yang tidak boleh hilang: cron TAK DIKENAL menjalankan
    // keduanya (lebih baik job idempoten jalan dua kali daripada mati senyap).
    const bothOut = await app.cron('entah-apa');
    check('a cron tak dikenal menjalankan sweep DAN rollup',
      !!(bothOut && bothOut.quotaSweep && bothOut.analyticsRollup),
      JSON.stringify({ s: !!(bothOut && bothOut.quotaSweep), r: !!(bothOut && bothOut.analyticsRollup) }));

    const wrangler = mustRead('wrangler.toml');
    const cronList = (wrangler.match(/crons\s*=\s*\[([^\]]*)\]/) || [])[1] || '';
    check('a kedua ekspresi cron di wrangler.toml sama dengan yang diuji di sini',
      cronList.includes(CRON_SWEEP) && cronList.includes(CRON_ROLLUP), cronList.trim());
  }

  /* ==================================================================== */
  /* (b) Rollup dua kali tidak menurunkan angka.                           */
  /* ==================================================================== */
  {
    const app = await bootMigrated(worker);
    await seedDau(app.stats, ROLLUP_DAY, [tok('a'), tok('b'), tok('c')]);
    await seedUsage(app.stats, ROLLUP_DAY, { 'attempts:5-9': 2, 'level:A2': 3 });

    const run1 = await app.cron(CRON_ROLLUP);
    const dau1 = app.metric(ROLLUP_DAY, 'dau');
    check('b rollup pertama menulis DAU dari token harian',
      dau1 === 3 && run1.analyticsRollup.dau === 3, JSON.stringify({ dau1, out: run1.analyticsRollup.dau }));
    check('b rollup pertama MENGHAPUS token harian (kontrak privasi, bukan opsi)',
      app.stats._rows('dau_dedup').length === 0, String(app.stats._rows('dau_dedup').length));

    const run2 = await app.cron(CRON_ROLLUP);
    const dau2 = app.metric(ROLLUP_DAY, 'dau');
    check('b rollup KEDUA tidak menurunkan DAU (tulis monoton MAX bertahan)',
      dau2 === 3, JSON.stringify({ dau1, dau2, out: run2.analyticsRollup && run2.analyticsRollup.dau }));
    check('b rollup kedua tidak menurunkan batas WAU/MAU',
      app.metric(ROLLUP_DAY, 'wau_lower') === 3 && app.metric(ROLLUP_DAY, 'mau_upper') === 3,
      JSON.stringify({ wau_lower: app.metric(ROLLUP_DAY, 'wau_lower'), mau_upper: app.metric(ROLLUP_DAY, 'mau_upper') }));
    check('b tulis monoton dipakai untuk dau (setMetricMax ada di store)',
      /setMetricMax:[\s\S]{0,200}MAX\(value, excluded\.value\)/.test(mustRead('analytics/analytics-store-d1.js')));
    check('b jalan kedua tetap tercatat sebagai SUKSES di cron_run',
      app.runs().filter((r) => r.job === 'analytics_rollup' && Number(r.ok) === 1).length === 2,
      JSON.stringify(app.runs()));
  }

  /* ==================================================================== */
  /* (c) Pepper lama DIHAPUS, bukan diarsipkan.                            */
  /* ==================================================================== */
  {
    const app = await bootMigrated(worker);
    const PEPPER_NOL = 'PEPPERNOL0000000000000000000000a';
    const PEPPER_SATU = 'PEPPERSATU000000000000000000000b';
    await seedPepper(app.stats, NOW - 2 * DAY_MS, PEPPER_SATU, PEPPER_NOL);

    const out1 = await app.cron(CRON_ROLLUP);
    const dump1 = JSON.stringify([...app.stats._tables.keys()].map((t) => app.stats._rows(t)));
    check('c rollup merotasi pepper saat jatuh tempo',
      out1.analyticsRollup && out1.analyticsRollup.pepperRotated === true,
      JSON.stringify(out1.analyticsRollup && out1.analyticsRollup.pepperRotated));
    check('c pepper DUA putaran lalu hilang dari SELURUH database analytics',
      !dump1.includes(PEPPER_NOL), dump1.slice(0, 400));

    const state1 = app.stats._rows('pepper_state')[0] || {};
    check('c pepper putaran sebelumnya masih ada SATU putaran (jendela toleransi event tertahan)',
      state1.previous === PEPPER_SATU && state1.current !== PEPPER_SATU,
      JSON.stringify({ previous: state1.previous === PEPPER_SATU, currentSama: state1.current === PEPPER_SATU }));

    // Rotasi kedua, 25 jam kemudian: PEPPER_SATU harus benar-benar lenyap.
    const later = NOW + 25 * 3600000;
    await app.cron(CRON_ROLLUP, later);
    const dump2 = JSON.stringify(['metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state']
      .map((t) => app.stats._rows(t)));
    check('c rotasi berikutnya MENGHAPUS pepper lama, tidak menyimpannya',
      !dump2.includes(PEPPER_SATU), dump2.slice(0, 400));
    check('c skema analytics tidak punya tabel arsip pepper',
      !/pepper_(history|archive|log)/i.test(mustRead('migrations/0002_analytics.sql')));
    check('c baris pepper_state hanya memuat current + satu previous',
      Object.keys(app.stats._rows('pepper_state')[0] || {}).sort().join(',') === 'current,id,previous,rotated_at',
      JSON.stringify(Object.keys(app.stats._rows('pepper_state')[0] || {})));
  }

  /* ==================================================================== */
  /* (d) cron_run tercatat untuk SUKSES dan GAGAL.                          */
  /* ==================================================================== */
  {
    // GAGAL sungguhan: database analytics belum dimigrasi -> rollup melempar.
    const broken = await bootMigrated(worker, { skipAnalyticsMigration: true });
    const out = await broken.cron(CRON_ROLLUP);
    const rows = broken.runs();
    check('d rollup yang GAGAL tetap meninggalkan baris cron_run',
      rows.length === 1 && rows[0].job === 'analytics_rollup', JSON.stringify(rows));
    check('d baris gagal ditandai ok=0 dengan KELAS galat, bukan pesan',
      rows.length === 1 && Number(rows[0].ok) === 0 &&
      cronMod.CRON_ERROR_CLASSES.includes(rows[0].error_class),
      JSON.stringify(rows[0]));
    check('d kegagalan rollup tidak menelan galat dari nilai balik scheduled()',
      !!(out && out.analyticsRollup && out.analyticsRollup.error), JSON.stringify(out && out.analyticsRollup));

    // Fitur analytics dimatikan owner: job "tidak jalan" TIDAK boleh dicatat sukses.
    const off = await bootMigrated(worker, { vars: { ANALYTICS_ENABLED: 'off' } });
    await off.cron(CRON_ROLLUP);
    const offRows = off.runs();
    check('d rollup yang dilewati karena flag mati dicatat GAGAL berkelas flag_off',
      offRows.length === 1 && Number(offRows[0].ok) === 0 && offRows[0].error_class === 'flag_off',
      JSON.stringify(offRows));

    // SUKSES: sudah dibuktikan di (a)/(b); di sini yang diuji adalah bahwa
    // pencatatan TIDAK menjatuhkan job ketika tabelnya belum dimigrasi.
    const unmigrated = boot(worker);
    await applyMigration(unmigrated.core, 'migrations/0001_identity.sql');
    await applyMigration(unmigrated.core, 'migrations/0001_quota.sql');
    await applyMigration(unmigrated.stats, 'migrations/0002_analytics.sql');
    const sweepOut = await unmigrated.cron(CRON_SWEEP);
    check('d tanpa migrasi 0003, sweep TETAP JALAN (pencatatan fail-soft)',
      !!(sweepOut && sweepOut.quotaSweep && !sweepOut.quotaSweep.error),
      JSON.stringify(sweepOut && sweepOut.quotaSweep));
    check('d pencatatan fail-soft TIDAK membuat tabel sendiri diam-diam',
      !unmigrated.core._tables.has('cron_run'), JSON.stringify([...unmigrated.core._tables.keys()]));
  }

  /* ==================================================================== */
  /* (e) Tidak ada pesan galat mentah / data murid di cron_run.             */
  /* ==================================================================== */
  {
    const app = await bootMigrated(worker);
    const anon = await app.call('POST', '/api/auth/anon', { body: '{}' });
    const userId = (anon.json && anon.json.userId) || '';
    check('e identitas uji berhasil diterbitkan (prasyarat pemindaian)', !!userId, anon.text.slice(0, 160));

    await app.cron(CRON_SWEEP);
    const brokenStats = H.fakeD1();
    app.env.STATS_DB = brokenStats;               // rollup akan melempar d1_error
    await app.cron(CRON_ROLLUP);

    const rows = app.runs();
    const dump = JSON.stringify(rows);
    const COLUMNS = ['job', 'day', 'started_at', 'finished_at', 'ok', 'rows_affected', 'error_class'];
    check('e cron_run hanya punya tujuh kolom operasional',
      rows.every((r) => Object.keys(r).sort().join(',') === COLUMNS.slice().sort().join(',')),
      JSON.stringify(Object.keys(rows[0] || {})));
    check('e ada baris gagal untuk dipindai (kalau tidak, pemindaian ini kosong)',
      rows.some((r) => Number(r.ok) === 0), dump);
    check('e semua error_class berada di enum tertutup',
      rows.every((r) => r.error_class === null || cronMod.CRON_ERROR_CLASSES.includes(r.error_class)),
      JSON.stringify(rows.map((r) => r.error_class)));
    // Enum kelas galat dibuang dulu dari teks: `d1_error` adalah LABEL yang sah,
    // dan memindainya sebagai "jejak SQL" hanya akan membuat gerbang berteriak
    // pada satu-satunya bentuk galat yang memang diizinkan.
    const scrubbed = cronMod.CRON_ERROR_CLASSES.reduce((s, cls) => s.split(cls).join(''), dump);
    check('e tidak ada jejak pesan galat mentah (SQL, nama tabel, stack)',
      !/SELECT|INSERT INTO|DELETE FROM|UPDATE |no such table|Error:|at Object|\bstack\b|D1_[A-Z]/i.test(scrubbed),
      scrubbed.slice(0, 400));
    check('e tidak ada pengenal murid di tabel',
      !dump.includes(userId), dump.slice(0, 400));
    const PII = ['user_id', 'userid', 'token', 'email', 'ip', 'name', 'question', 'answer', 'transcript'];
    check('e tidak ada satu pun kolom bernuansa data murid',
      rows.every((r) => Object.keys(r).every((k) => !PII.includes(k.toLowerCase()))),
      JSON.stringify(Object.keys(rows[0] || {})));
    // Komentar dibuang lebih dulu: berkas migrasi SENGAJA menyebut `user_id`
    // dalam daftar larangannya, dan larangan yang tertulis bukan kolom.
    const migrationSql = mustRead('migrations/0003_cron.sql')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ');
    check('e migrasi 0003 tidak mendefinisikan kolom pengenal apa pun',
      !/\b(user_id|sub|install_id|visitor_token|email|ip_hmac)\b/.test(migrationSql), migrationSql.slice(0, 300));
  }

  /* ==================================================================== */
  /* (f) dau_dedup kosong + usage_daily terisi -> collection_ok = 0.        */
  /* ==================================================================== */
  {
    const broken = await bootMigrated(worker);
    await seedUsage(broken.stats, ROLLUP_DAY, { 'attempts:5-9': 4, 'level:A2': 6 });
    const out = await broken.cron(CRON_ROLLUP);
    check('f pengumpulan rusak (0 token, usage terisi) menulis collection_ok=0',
      broken.metric(ROLLUP_DAY, 'collection_ok') === 0,
      JSON.stringify({ collection_ok: broken.metric(ROLLUP_DAY, 'collection_ok'), out: out.analyticsRollup }));
    check('f ringkasan rollup ikut mengaku collectionOk=false',
      out.analyticsRollup && out.analyticsRollup.collectionOk === false,
      JSON.stringify(out.analyticsRollup && out.analyticsRollup.collectionOk));
    check('f pagar TIDAK menyembunyikan DAU nol yang menyesatkan (nilainya tetap 0, penandanya yang bicara)',
      broken.metric(ROLLUP_DAY, 'dau') === 0, String(broken.metric(ROLLUP_DAY, 'dau')));

    const quiet = await bootMigrated(worker);
    const quietOut = await quiet.cron(CRON_ROLLUP);
    check('f hari yang benar-benar sepi (0 token, 0 usage) TIDAK dituduh rusak',
      quiet.metric(ROLLUP_DAY, 'collection_ok') === 1 && quietOut.analyticsRollup.collectionOk === true,
      JSON.stringify({ ok: quiet.metric(ROLLUP_DAY, 'collection_ok') }));

    const healthy = await bootMigrated(worker);
    await seedDau(healthy.stats, ROLLUP_DAY, [tok('x'), tok('y')]);
    await seedUsage(healthy.stats, ROLLUP_DAY, { 'attempts:5-9': 2 });
    await healthy.cron(CRON_ROLLUP);
    const okFirst = healthy.metric(ROLLUP_DAY, 'collection_ok');
    await healthy.cron(CRON_ROLLUP);
    check('f jalan KEDUA tidak membalik collection_ok menjadi 0 (pagar tidak menuduh dirinya sendiri)',
      okFirst === 1 && healthy.metric(ROLLUP_DAY, 'collection_ok') === 1,
      JSON.stringify({ okFirst, okSecond: healthy.metric(ROLLUP_DAY, 'collection_ok') }));
  }

  /* ==================================================================== */
  /* (g) /api/owner/cron-status tunduk pada gate owner.                    */
  /* ==================================================================== */
  {
    const app = await bootMigrated(worker);
    await app.cron(CRON_SWEEP);
    await app.cron(CRON_ROLLUP);

    const anon = await app.call('GET', '/api/owner/cron-status');
    check('g tanpa kredensial owner: 403 (bukan 200, bukan 404)',
      anon.status === 403, `${anon.status} ${anon.text.slice(0, 120)}`);
    check('g penolakan tidak membocorkan satu pun angka cron',
      !/jobs|lastSuccess|rowsAffected|quota_sweep/.test(anon.text), anon.text.slice(0, 200));

    const wrong = await app.call('GET', '/api/owner/cron-status', {
      headers: { 'x-fiezel-owner-token': OWNER_TOKEN + 'x' }
    });
    check('g token owner salah: 403', wrong.status === 403, String(wrong.status));

    const cookieOnly = await app.call('GET', '/api/owner/cron-status', {
      cookie: 'fz_id=bukan-token-owner'
    });
    check('g cookie murid bukan kredensial owner: 403', cookieOnly.status === 403, String(cookieOnly.status));

    const okRes = await app.call('GET', '/api/owner/cron-status', {
      headers: { 'x-fiezel-owner-token': OWNER_TOKEN }
    });
    check('g token owner benar: 200 dengan ringkasan dua job',
      okRes.status === 200 && okRes.json && Array.isArray(okRes.json.jobs) && okRes.json.jobs.length === 2,
      `${okRes.status} ${okRes.text.slice(0, 200)}`);
    check('g ringkasan memuat sukses terakhir, jumlah gagal, dan baris terpengaruh',
      okRes.json && okRes.json.jobs.every((j) =>
        'lastSuccessAt' in j && 'failed' in j && 'rowsAffected' in j && 'errorClasses' in j),
      JSON.stringify(okRes.json && okRes.json.jobs));
    check('g sukses cron yang baru saja terjadi terbaca di ringkasan',
      okRes.json && okRes.json.jobs.every((j) => j.ok >= 1 && j.lastSuccessAt === NOW),
      JSON.stringify(okRes.json && okRes.json.jobs.map((j) => [j.job, j.ok, j.lastSuccessAt])));
    check('g respons tidak memuat pesan galat mentah',
      !/Error:|SELECT|D1_|at Object/i.test(okRes.text), okRes.text.slice(0, 200));
    check('g Bearer juga diterima (satu token, dua cara kirim)',
      (await app.call('GET', '/api/owner/cron-status', {
        headers: { authorization: 'Bearer ' + OWNER_TOKEN }
      })).status === 200);

    // Secret belum dipasang = FAIL-CLOSED. Bukan "boleh dulu, nanti dijaga".
    const noSecret = await bootMigrated(worker, { vars: { OWNER_TOKEN_HASH: '' } });
    const attempt = await noSecret.call('GET', '/api/owner/cron-status', {
      headers: { 'x-fiezel-owner-token': OWNER_TOKEN }
    });
    check('g tanpa OWNER_TOKEN_HASH endpoint TERTUTUP, bukan terbuka',
      attempt.status === 403, String(attempt.status));

    // Tabel belum dimigrasi: 200 dengan migrated:false, bukan 500 dan bukan
    // "semuanya baik". Owner harus bisa membedakan dua kegagalan ini.
    const unmigrated = boot(worker);
    await applyMigration(unmigrated.core, 'migrations/0001_identity.sql');
    const pre = await unmigrated.call('GET', '/api/owner/cron-status', {
      headers: { 'x-fiezel-owner-token': OWNER_TOKEN }
    });
    check('g tabel belum dimigrasi: 200 dengan migrated:false (bukan 500, bukan klaim sehat)',
      pre.status === 200 && pre.json && pre.json.migrated === false,
      `${pre.status} ${pre.text.slice(0, 200)}`);

    check('g gate owner memakai perbandingan waktu-konstan, bukan operator kesetaraan atas secret',
      /ctEq\(/.test(mustRead('cron-status.js')) &&
      !/OWNER_TOKEN_HASH\s*(===|==|!==|!=)/.test(mustRead('cron-status.js')));
  }

  /* ==================================================================== */
  /* (h) Pemasangan: rute, migrasi, dan pendaftaran di CI.                 */
  /* ==================================================================== */
  {
    const slots = mustRead('route-slots.js');
    check('h rute status cron terdaftar lewat route-slots.js',
      /from '\.\/cron-status\.js'/.test(slots) && /CRON_STATUS_ROUTES/.test(slots));
    check('h modul cron-status.js mengekspor ROUTES dengan path owner',
      Array.isArray(cronMod.ROUTES) && cronMod.ROUTES.length === 1 &&
      cronMod.ROUTES[0][1] === '/api/owner/cron-status' && cronMod.ROUTES[0][0] === 'GET',
      JSON.stringify(cronMod.ROUTES && cronMod.ROUTES.map((r) => [r[0], r[1]])));
    check('h migrasi 0003_cron.sql membuat tabel cron_run dengan tujuh kolom yang disepakati',
      /CREATE TABLE IF NOT EXISTS cron_run/.test(mustRead('migrations/0003_cron.sql')) &&
      ['job', 'day', 'started_at', 'finished_at', 'ok', 'rows_affected', 'error_class']
        .every((c) => new RegExp('\\b' + c + '\\b').test(mustRead('migrations/0003_cron.sql'))));
    check('h MIGRATIONS.md menyebut database dan perintah untuk 0003',
      /0003_cron\.sql/.test(mustRead('migrations/MIGRATIONS.md')) &&
      /d1 execute fiezel-core --remote --file=migrations\/0003_cron\.sql/.test(mustRead('migrations/MIGRATIONS.md')));
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
    check('h gerbang ini terdaftar di .github/workflows/quality.yml',
      /node tests\/cron-contract-test\.js/.test(workflow));
    check('h ringkasan cron adalah fungsi MURNI (bisa diuji tanpa D1)',
      typeof cronMod.summarizeCronRuns === 'function' &&
      cronMod.summarizeCronRuns([
        { job: 'quota_sweep', day: ROLLUP_DAY, started_at: NOW, ok: 1, rows_affected: 4, error_class: null },
        { job: 'quota_sweep', day: ROLLUP_DAY, started_at: NOW + 1, ok: 0, rows_affected: 0, error_class: 'd1_error' }
      ], { days: 7, today: ROLLUP_DAY }).jobs[0].failed === 1);
    check('h kelas galat bebas TIDAK bisa diselundupkan ke ringkasan',
      cronMod.summarizeCronRuns([
        { job: 'quota_sweep', day: ROLLUP_DAY, started_at: NOW, ok: 0, rows_affected: 0, error_class: 'D1_ERROR: no such table cron_run' }
      ], { days: 7, today: ROLLUP_DAY }).jobs[0].errorClasses.unknown === 1);
  }

  finish({
    clock: CLOCK_ISO,
    rollupDay: ROLLUP_DAY,
    crons: { sweep: CRON_SWEEP, rollup: CRON_ROLLUP }
  });
})().catch((err) => {
  check('gerbang cron berjalan sampai selesai', false, (err && err.stack) || String(err));
  finish({ fatal: (err && err.message) || String(err) });
});
