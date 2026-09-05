const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL gerbang anti-regresi privasi — ID stabil dilarang masuk /api/usage/*.
 *
 * Fitur dedup batchId (temuan council gpt_5_6_sol §4.3 / opus §1.3) membuka
 * satu kolom baru yang menerima nilai dari klien. Sejarah bug privasi hampir
 * selalu begini: kolom yang lahir untuk tujuan sempit pelan-pelan diisi ID
 * stabil "karena praktis". Gerbang ini memindai STATIS semua berkas
 * workers/api/analytics/ (+ features/telemetry/ bila ada) dan MERAH bila:
 *
 *  1. Ada pola ID stabil (installId mentah, userId, deviceId, fingerprint,
 *     dsb.) di kode mana pun yang menyusun/menerima payload /api/usage/*.
 *  2. Allowlist EVENT_SPEC memuat field bernama ID stabil, atau field yang
 *     tipenya bukan tipe tertutup.
 *  3. DDL migrasi analytics menumbuhkan kolom per-orang, atau tabel
 *     batch_dedup menyimpan lebih dari (batch_id, day).
 *  4. Kunci dedup kehilangan pagarnya: bentuk batchId tidak lagi dikunci,
 *     purge-nya hilang, atau umurnya melar melewati jendela retry 48 jam.
 *
 * Komentar dibuang sebelum pindai (pola tests/analytics-privacy-test.js): yang
 * dihakimi adalah KODE, bukan penjelasan.
 */
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const ANALYTICS_DIR = path.join(root, 'workers', 'api', 'analytics');
const TELEMETRY_DIR = path.join(root, 'features', 'telemetry');
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
function stripSqlComments(src) {
  return src.replace(/--[^\n]*/g, ' ');
}

/** Kumpulkan berkas .js/.mjs/.sql secara rekursif. */
function collectFiles(dir, exts) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.some(e => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

/**
 * Pola ID stabil. Substring pada kode huruf-kecil tanpa komentar — daftar ini
 * sengaja lebih luas dari FORBIDDEN_TOKENS di tests/analytics-privacy-test.js:
 * gerbang itu menjaga PII umum; gerbang ini khusus menjaga IDENTITAS STABIL
 * lintas-hari, yang justru kelihatan "tidak berbahaya" (cuma angka acak, kan?).
 */
const STABLE_ID_TOKENS = [
  'installid', 'install_id',       // identitas pemasangan: TIDAK PERNAH boleh mentah di server
  'userid', 'user_id',
  'deviceid', 'device_id',
  'accountid', 'account_id',
  'learnerid', 'learner_id',
  'clientid', 'client_id',
  'visitorid', 'visitor_id',       // beda dengan visitor_token (harian, dirotasi)
  'fingerprint', 'canvas_hash',
  'mac_address', 'macaddress', 'imei', 'idfa', 'idfv', 'gaid', 'androidid', 'android_id',
  'advertising_id', 'advertisingid'
];

/**
 * Pengecualian yang terdokumentasi: `installId` di analytics-core.js adalah
 * ARGUMEN visitorToken(pepper, installId) yang dihitung DI PERANGKAT; gerbang
 * tests/analytics-privacy-test.js sudah membuktikan ia tidak pernah keluar/kembali.
 */
const ALLOWED = [{ file: 'analytics-core.js', token: 'installid' }];

/**
 * Daftar larangan BUKAN kebocoran: modul pertahanan (mis. FORBIDDEN_KEYS di
 * features/telemetry) sengaja menyebut token berbahaya sebagai ISI blocklist
 * untuk menolaknya. Deklarasi array yang namanya jelas-jelas daftar larangan
 * dihapus dari teks sebelum pindai — tapi HANYA bentuk deklarasi itu; token
 * yang muncul sebagai identifier, akses properti, atau kunci payload tetap
 * tertangkap (dibuktikan oleh swa-uji di bagian 0).
 */
function stripDenyListDeclarations(src) {
  return src.replace(
    /(?:var|let|const)\s+[A-Za-z0-9_$]*(?:FORBIDDEN|BLOCK|DENY|BANNED|DILARANG|TERLARANG)[A-Za-z0-9_$]*\s*=\s*(?:Object\.freeze\s*\(\s*)?\[[^\]]*\]\s*\)?/gi,
    ' '
  );
}

/** Pindai satu sumber JS: kembalikan token ID stabil yang benar-benar dipakai kode. */
function scanSource(src) {
  const code = stripDenyListDeclarations(stripJsComments(src)).toLowerCase();
  return STABLE_ID_TOKENS.filter(token => code.includes(token));
}

(async () => {
  /* =====================================================================
   * 0. Swa-uji pemindai: pagar yang tidak bisa menangkap apa-apa = bohong
   * ===================================================================== */
  check('Swa-uji: pemindai MENANGKAP ID stabil yang dipakai kode',
    scanSource('const p = { installId: x }; send(p);').includes('installid') &&
    scanSource('payload.userId = getUser();').includes('userid') &&
    scanSource('var deviceId = navigator.hardware;').includes('deviceid'),
    'pemindai buta terhadap kebocoran nyata');
  check('Swa-uji: pemindai TIDAK menyalahkan daftar larangan (blocklist adalah pagar, bukan bocor)',
    scanSource("var FORBIDDEN_KEYS = Object.freeze(['installid', 'userid', 'deviceid']);").length === 0 &&
    scanSource("const DILARANG = ['user_id'];").length === 0,
    'blocklist ikut tertuduh');
  check('Swa-uji: token di dalam komentar tidak dihitung',
    scanSource('// jangan pernah kirim installId\nconst a = 1;').length === 0, 'komentar ikut tertuduh');

  /* =====================================================================
   * 1. Pindai kode: tidak ada token ID stabil di jalur /api/usage/*
   * ===================================================================== */
  const jsFiles = [
    ...collectFiles(ANALYTICS_DIR, ['.js', '.mjs']),
    ...collectFiles(TELEMETRY_DIR, ['.js', '.mjs'])
  ];
  check('Ada berkas analytics untuk dipindai (gerbang tidak lulus kosong)', jsFiles.length >= 5,
    jsFiles.map(f => path.relative(root, f)).join(','));

  if (fs.existsSync(TELEMETRY_DIR)) {
    check('features/telemetry/ ikut terpindai', jsFiles.some(f => f.startsWith(TELEMETRY_DIR)), 'direktori ada tapi tidak terpindai');
  } else {
    check('features/telemetry/ belum ada — hanya workers/api/analytics/ yang dipindai (jalankan ulang gerbang ini saat telemetry lahir)', true);
  }

  const hits = [];
  for (const file of jsFiles) {
    const rel = path.relative(root, file);
    const base = path.basename(file);
    for (const token of scanSource(fs.readFileSync(file, 'utf8'))) {
      if (ALLOWED.some(a => a.file === base && a.token === token)) continue;
      hits.push(`${rel}:${token}`);
    }
  }
  check('Tidak ada pola ID stabil di kode analytics/telemetry (di luar pengecualian visitorToken)',
    hits.length === 0, hits.join(', '));

  // Pengecualian itu sendiri harus tetap dijaga bentuknya.
  const coreCode = stripJsComments(fs.readFileSync(path.join(ANALYTICS_DIR, 'analytics-core.js'), 'utf8'));
  check('Pengecualian analytics-core.js masih sebatas argumen visitorToken (tidak di-return / disimpan)',
    !/return\s+installId/.test(coreCode) && !/installId\s*=[^=]/.test(coreCode.replace(/\(pepper,\s*installId\)/g, '')),
    'installId dipakai di luar perhitungan HMAC');

  /* =====================================================================
   * 2. Allowlist EVENT_SPEC: tidak ada field ID stabil, semua tipe tertutup
   * ===================================================================== */
  const core = await import('../workers/api/analytics/analytics-core.js');
  const fieldHits = [];
  const typeHits = [];
  const CLOSED_KINDS = ['bool', 'int', 'enum', 'day', 'token', 'version'];
  for (const [evName, spec] of Object.entries(core.EVENT_SPEC)) {
    for (const [field, t] of Object.entries(spec.fields)) {
      const f = field.toLowerCase();
      if (STABLE_ID_TOKENS.some(tok => f.includes(tok))) fieldHits.push(`${evName}.${field}`);
      if (!CLOSED_KINDS.includes(t.kind)) typeHits.push(`${evName}.${field}:${t.kind}`);
    }
  }
  check('EVENT_SPEC bebas field ID stabil', fieldHits.length === 0, fieldHits.join(','));
  check('Semua field EVENT_SPEC bertipe tertutup (tidak ada saluran teks bebas baru)', typeHits.length === 0, typeHits.join(','));

  /* =====================================================================
   * 3. DDL: kolom per-orang dilarang; batch_dedup tepat (batch_id, day)
   * ===================================================================== */
  const sqlFiles = collectFiles(path.join(ANALYTICS_DIR, 'migrations'), ['.sql']);
  check('Migrasi analytics ditemukan (0002 + 0003)', sqlFiles.length >= 2, sqlFiles.join(','));

  const PER_PERSON_COLUMNS = ['user_id', 'install_id', 'installid', 'account_id', 'learner_id', 'device_id', 'session_id', 'visitor_id', 'client_id'];
  const ddlHits = [];
  let batchBody = null;
  for (const file of sqlFiles) {
    const ddl = stripSqlComments(fs.readFileSync(file, 'utf8')).toLowerCase();
    for (const m of ddl.matchAll(/create table if not exists\s+([a-z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:without rowid)?\s*;/g)) {
      const [, tableName, body] = m;
      if (tableName === 'batch_dedup') batchBody = body;
      for (const col of PER_PERSON_COLUMNS) {
        if (new RegExp(`(^|[\\s(,])${col}\\b`).test(body)) ddlHits.push(`${path.basename(file)}:${tableName}.${col}`);
      }
    }
  }
  check('Tidak ada kolom per-orang di DDL analytics mana pun (termasuk migrasi 0003)', ddlHits.length === 0, ddlHits.join(','));
  check('Tabel batch_dedup ada di migrasi', batchBody !== null, 'CREATE TABLE batch_dedup tidak ditemukan');

  if (batchBody !== null) {
    const cols = [...batchBody.matchAll(/(?:^|,)\s*([a-z_][a-z0-9_]*)\s+text/g)].map(m => m[1]);
    check('batch_dedup hanya menyimpan (batch_id, day) — tidak ada kolom penumpang',
      JSON.stringify(cols.sort()) === JSON.stringify(['batch_id', 'day']), batchBody.trim().slice(0, 200));
  }

  /* =====================================================================
   * 4. Pagar dedup: bentuk batchId terkunci, purge ada, TTL <= jendela retry
   * ===================================================================== */
  const route = await import('../workers/api/analytics/route-events.js');
  const store = await import('../workers/api/analytics/analytics-store-d1.js');
  const rollup = await import('../workers/api/analytics/rollup.js');

  check('BATCH_ID_PATTERN masih ada dan mengunci bentuk 36 karakter hex+dash',
    route.BATCH_ID_PATTERN instanceof RegExp &&
    route.BATCH_ID_PATTERN.test('3f2504e0-4f89-41d3-9a0c-0305e82c3301') &&
    !route.BATCH_ID_PATTERN.test('id-stabil-perangkat') &&
    !route.BATCH_ID_PATTERN.test('2026-08-27T00:00:00Z'),
    String(route.BATCH_ID_PATTERN));

  check('normalizeBatchId menolak nilai non-UUID (tidak ada jalan menyelipkan ID stabil)',
    route.normalizeBatchId('installid-1234-stabil').ok === false &&
    route.normalizeBatchId({}).ok === false &&
    route.normalizeBatchId(null).ok === true && route.normalizeBatchId(null).value === null,
    'normalizeBatchId melemah');

  check('SQL purge batch_dedup masih ada di lapisan penyimpanan',
    typeof store.SQL.purgeBatchDedupOlderThan === 'string' && /delete from batch_dedup/i.test(store.SQL.purgeBatchDedupOlderThan),
    String(store.SQL.purgeBatchDedupOlderThan));

  const rollupSrc = stripJsComments(fs.readFileSync(path.join(ANALYTICS_DIR, 'rollup.js'), 'utf8'));
  check('rollup.js memanggil purge batch_dedup (kunci dedup tidak menumpuk selamanya)',
    /purgeBatchDedupOlderThan\s*\(/.test(rollupSrc), 'panggilan purge hilang dari rollup');

  check('Umur kunci dedup <= jendela retry 48 jam (tidak melar diam-diam)',
    Number(rollup.RETENTION_DAYS.BATCH_DEDUP) <= 2 && Number(route.LIMITS.BATCH_ID_TTL_DAYS) <= 2,
    JSON.stringify({ rollup: rollup.RETENTION_DAYS.BATCH_DEDUP, route: route.LIMITS.BATCH_ID_TTL_DAYS }));

  // batch_id tidak boleh bocor ke tabel agregat: pernyataan tulis agregat
  // tidak menyebut batch sama sekali.
  const aggSqlHits = ['upsertMetric', 'setMetric', 'setMetricMax', 'upsertUsage', 'upsertRetention', 'insertDauToken']
    .filter(k => /batch/i.test(String(store.SQL[k])));
  check('Tidak ada SQL agregat yang menyentuh batch_id (dedup terisolasi di tabelnya sendiri)',
    aggSqlHits.length === 0, aggSqlHits.join(','));

  /* ===================================================================== */
  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'analytics-stable-id-guard',
    counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'ANALYTICS-STABLE-ID-GUARD-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`StableIdGuard: ${report.status === 'PASS' ? 'PASS' : 'FAIL'}`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
