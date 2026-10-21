/**
 * tests/social-schema-contract-test.js — GERBANG kontrak SKEMA lapisan sosial.
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. `migrations/0006_social.sql` (sumber resmi) dan `SOCIAL_DDL` runtime
 *      (workers/api/social-schema.js, jalur ensureSocialSchema untuk token CI
 *      yang tidak bisa migrasi remote) SETARA pernyataan-per-pernyataan.
 *      Dua versi skema yang boleh berbeda = migrasi bayangan.
 *   2. 0006 hanya berisi `CREATE TABLE IF NOT EXISTS` — nol DELETE/DROP/UPDATE/
 *      INSERT, nol indeks tambahan (semua kueri panas dilayani PRIMARY KEY).
 *   3. Kontrak privasi 0001/0002 DIWARISI: nol kolom PII (nama/email/ip/ua/...),
 *      nol kolom teks bebas antar pengguna, nol kolom analytics (token/pepper),
 *      nol tabrakan nama tabel dengan migrasi lain, terdaftar di MIGRATIONS.md
 *      sebagai migrasi fiezel-core (BUKAN fiezel-stats).
 *   4. Dinding analytics: route-social.js + social-schema.js tidak menyentuh
 *      STATS_DB/ANALYTICS_DB dan tidak merujuk satu pun tabel analytics.
 *   5. `social-config.js` mengikuti disiplin berkas beku quota-config:
 *      tanpa import, tanpa Date.now, tanpa env/globalThis, Object.freeze.
 *   6. ensureSocialSchema benar-benar membuat SEMUA tabel di D1 palsu harness,
 *      idempoten, dan MENOLAK db yang absen (fail-closed).
 *   7. Ekonomi PB masuk akal: setiap aturan punya pb & cap terbatas; sorakan
 *      tidak pernah menjadi sumber PB.
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const boot = require('../tools/cf-worker-boot.js');
const H = boot.harness;

const REPO = __fzRoot;
const API_DIR = path.join(REPO, 'workers', 'api');
const MIG = path.join(API_DIR, 'migrations', '0006_social.sql');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}
function mustRead(p) {
  if (!fs.existsSync(p)) throw new Error('berkas wajib tidak ada: ' + p);
  return fs.readFileSync(p, 'utf8');
}

/** Normalisasi SQL: buang komentar, rapatkan spasi, samakan spasi kurung. */
function normalizeSql(sql) {
  return String(sql)
    .replace(/--[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s*,\s*/g, ', ')
    .trim()
    .replace(/;$/, '');
}
function statementsOf(sqlText) {
  return String(sqlText)
    .replace(/--[^\n]*/g, ' ')
    .split(';')
    .map(normalizeSql)
    .filter(Boolean);
}

(async () => {
  /* ---------- 0. Berkas wajib ada ------------------------------------------ */
  for (const rel of [
    'migrations/0006_social.sql', 'social-schema.js', 'social-config.js', 'route-social.js'
  ]) {
    assert(fs.existsSync(path.join(API_DIR, rel)), 'berkas wajib ada: workers/api/' + rel);
  }

  const migRaw = mustRead(MIG);
  const migStatements = statementsOf(migRaw);
  const schemaMod = await boot.importApiModule('social-schema.js');
  const configMod = await boot.importApiModule('social-config.js');

  /* ---------- 1. Migrasi <-> DDL runtime SETARA ----------------------------- */
  {
    const runtime = (schemaMod.SOCIAL_DDL || []).map(normalizeSql);
    assert(Array.isArray(schemaMod.SOCIAL_DDL) && runtime.length > 0, 'SOCIAL_DDL runtime terekspor');
    assert(migStatements.length === runtime.length,
      'jumlah pernyataan sama: migrasi ' + migStatements.length + ' vs runtime ' + runtime.length);
    for (let i = 0; i < Math.max(migStatements.length, runtime.length); i += 1) {
      assert(migStatements[i] === runtime[i],
        'pernyataan #' + (i + 1) + ' identik (ternormalisasi); migrasi="' +
        String(migStatements[i]).slice(0, 70) + '..." runtime="' + String(runtime[i]).slice(0, 70) + '..."');
    }
  }

  /* ---------- 2. 0006 hanya CREATE TABLE IF NOT EXISTS ---------------------- */
  {
    const offenders = migStatements.filter((s) => !/^CREATE TABLE IF NOT EXISTS [a-z_]+\s*\(/i.test(s));
    assert(offenders.length === 0,
      '0006 hanya CREATE TABLE IF NOT EXISTS (idempoten, aman diterapkan runtime); pelanggar: ' +
      offenders.map((s) => s.slice(0, 40)).join(' | '));
    assert(!/CREATE\s+(UNIQUE\s+)?INDEX/i.test(migRaw.replace(/--[^\n]*/g, '')),
      'NOL indeks tambahan: semua kueri panas dilayani PRIMARY KEY (indeks tanpa kueri = tulis sia-sia)');
    assert(!/\b(DELETE|DROP|TRUNCATE|ALTER)\b/i.test(migRaw.replace(/--[^\n]*/g, '')),
      'NOL DELETE/DROP/TRUNCATE/ALTER di migrasi sosial');
  }

  /* ---------- 3. Warisan kontrak privasi 0001/0002 -------------------------- */
  {
    const code = migRaw.replace(/--[^\n]*/g, ' ');
    // Kolom PII yang daftar keras 0001 larang. Dipindai sebagai KATA UTUH di DDL.
    const forbidden = [
      'name', 'real_name', 'full_name', 'nickname', 'email', 'school', 'age',
      'birth', 'phone', 'ip', 'ip_raw', 'user_agent', 'ua', 'language',
      'resolution', 'timezone', 'puter_uuid', 'password', 'token', 'pepper',
      'secret', 'transcript', 'answer', 'message', 'note', 'comment',
      'free_text', 'status_text', 'bio'
    ];
    const hits = [];
    for (const col of forbidden) {
      if (new RegExp('\\b' + col + '\\b', 'i').test(code)) hits.push(col);
    }
    // `display_name` adalah pseudonim tersanitasi yang DIizinkan; pastikan
    // pemindaian kata-utuh di atas tidak salah menuduhnya, dan tidak ada kolom
    // lain yang mengandung kata terlarang.
    assert(hits.length === 0,
      'NOL kolom PII / teks-bebas / analytics di DDL sosial; temuan: ' + hits.join(', '));
    assert(/DAFTAR KERAS/i.test(migRaw) && /0001_identity\.sql/.test(migRaw),
      'kepala 0006 mewarisi daftar keras 0001 secara eksplisit');
    assert(/DILARANG JOIN|dilarang join/i.test(migRaw) || /analytics/i.test(migRaw),
      'kepala 0006 menyebut dinding analytics');

    // Tidak ada tabrakan nama tabel dengan migrasi lain.
    const migDir = path.join(API_DIR, 'migrations');
    const tablesIn = (file) =>
      [...mustRead(path.join(migDir, file)).matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z_]\w*)/gi)]
        .map((m) => m[1].toLowerCase());
    const mine = tablesIn('0006_social.sql');
    assert(mine.length === 10 && mine.join(',') === (schemaMod.SOCIAL_TABLES || []).join(','),
      'daftar tabel 0006 = SOCIAL_TABLES runtime, dapat ' + mine.join(','));
    const collisions = [];
    for (const f of fs.readdirSync(migDir).filter((x) => x.endsWith('.sql') && x !== '0006_social.sql')) {
      for (const t of tablesIn(f)) if (mine.includes(t)) collisions.push(t + '@' + f);
    }
    assert(collisions.length === 0, 'NOL tabrakan nama tabel dengan migrasi lain: ' + collisions.join(','));

    // Terdaftar di MIGRATIONS.md sebagai fiezel-core + catatan runtime jujur.
    const doc = mustRead(path.join(migDir, 'MIGRATIONS.md'));
    assert(/d1 execute fiezel-core[^\n]*--file=migrations\/0006_social\.sql/.test(doc),
      'MIGRATIONS.md memetakan 0006 ke fiezel-core (dibaca gerbang d1-schema-contract)');
    assert(!/d1 execute fiezel-stats[^\n]*0006_social/.test(doc), '0006 TIDAK PERNAH diterapkan ke fiezel-stats');
    assert(/ensureSocialSchema/.test(doc) && /tidak bisa menjalankan `wrangler d1 execute --remote`|tidak bisa menjalankan migrasi remote/i.test(doc),
      'MIGRATIONS.md jujur soal keterbatasan token CI + jalur runtime');
  }

  /* ---------- 4. Dinding analytics di tingkat KODE --------------------------- */
  {
    const sources = ['route-social.js', 'social-schema.js', 'social-config.js']
      .map((f) => ({ f, src: mustRead(path.join(API_DIR, f)) }));
    const analyticsTables = ['metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state'];
    for (const { f, src } of sources) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      assert(!/STATS_DB|ANALYTICS_DB|DB_ANALYTICS/.test(code),
        f + ' tidak pernah menyentuh binding analytics (dinding privasi fisik)');
      const hit = analyticsTables.find((t) => code.includes(t));
      assert(!hit, f + ' tidak merujuk tabel analytics; temuan: ' + (hit || '-'));
      // `.join(...)` JS bukan JOIN SQL — yang dilarang adalah JOIN di dalam kueri.
      const sqlJoin = [...code.matchAll(/'[^'\n]*\bJOIN\b[^'\n]*'/gi)];
      assert(sqlJoin.length === 0, f + ' tidak memakai JOIN SQL sama sekali (papan dirakit per-kueri PK)');
      const external = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).filter((s) => !s.startsWith('./'));
      assert(external.length === 0, f + ' nol dependency eksternal; temuan: ' + external.join(','));
    }
  }

  /* ---------- 5. social-config.js = berkas beku (pola quota-config) ---------- */
  {
    const src = mustRead(path.join(API_DIR, 'social-config.js'));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert(!/^\s*import\b/m.test(code) && !/\brequire\s*\(/.test(code), 'social-config.js TANPA import/require');
    assert(!/Date\.now|new Date/.test(code), 'social-config.js TANPA waktu tersembunyi');
    assert(!/\benv\b|globalThis|process\./.test(code), 'social-config.js TANPA env/globalThis/process');
    assert((code.match(/Object\.freeze/g) || []).length >= 10, 'social-config.js Object.freeze berlapis');

    // Nilai kunci yang dijanjikan spec/tugas — dikunci sebagai ANGKA di gerbang.
    const C = configMod;
    assert(C.HANDLE_RULES.MIN === 3 && C.HANDLE_RULES.MAX === 20 &&
      String(C.HANDLE_RULES.PATTERN) === '/^[a-z][a-z0-9_]{2,19}$/',
      'handle 3-20 char a-z0-9_ (mandat tugas), pola: ' + String(C.HANDLE_RULES.PATTERN));
    assert(C.HANDLE_RULES.BLOCKLIST.includes('fiezel') && C.HANDLE_RULES.BLOCKLIST.includes('admin'),
      'blocklist memuat peniruan (fiezel/admin)');
    assert(C.INVITE_RULES.TTL_DAYS === 7 && C.INVITE_RULES.SINGLE_USE === true &&
      C.INVITE_RULES.MAX_ACTIVE_PER_USER === 3, 'kode undangan: TTL 7 hari, SINGLE-USE, maks 3 aktif');
    assert(!/[01OI]/.test(C.INVITE_RULES.ALPHABET), 'alfabet kode tanpa 0/O/1/I (Crockford)');
    assert(C.CHEER_STICKERS.length === 6 && C.CHEER_PER_FRIEND_PER_DAY === 5,
      'sorakan: 6 stiker enum, 5/hari/teman');
    assert(C.FRIENDS_MAX === 50, 'maks 50 teman/akun');
    assert(C.COHORT_RULES.MAX_MEMBERS === 20, 'kohor liga <= 20 profil');
    assert(Object.isFrozen(C.PB_RULES) && Object.isFrozen(C.PB_RULES.meaningful_day), 'PB_RULES beku berlapis');

    // Tabel PB persis spec §4.1.
    const expect = {
      meaningful_day: [10, 1, 'day'], daily_target: [15, 1, 'day'],
      lesson_mastered: [25, 3, 'day'], srs_review: [2, 20, 'day'],
      exam_passed: [150, 1, 'day'], book_finished: [40, 1, 'week'], weekly_mission: [50, 1, 'week']
    };
    assert(Object.keys(C.PB_RULES).sort().join(',') === Object.keys(expect).sort().join(','),
      'sumber PB persis 7 jenis spec §4.1');
    for (const [kind, [pb, cap, period]] of Object.entries(expect)) {
      const r = C.PB_RULES[kind];
      assert(r && r.pb === pb && r.cap === cap && r.period === period,
        'PB ' + kind + ' = ' + pb + ' cap ' + cap + '/' + period + ', dapat ' + JSON.stringify(r));
    }
    // Sorakan/teman/undangan BUKAN sumber PB — dua ekonomi tidak saling beli.
    for (const kind of Object.keys(C.PB_RULES)) {
      assert(!/cheer|friend|invite|social/.test(kind), 'sumber PB "' + kind + '" bukan aktivitas sosial');
    }
    // Plafon harian terhitung: cap harian total = 10+15+75+40+150 = 290.
    const dailyMax = Object.values(C.PB_RULES)
      .filter((r) => r.period === 'day')
      .reduce((sum, r) => sum + r.pb * r.cap, 0);
    assert(dailyMax === 290, 'plafon PB harian terhitung 290 (150 di antaranya ujian ber-cooldown), dapat ' + dailyMax);
  }

  /* ---------- 6. ensureSocialSchema: membuat semua tabel, idempoten, fail-closed */
  {
    const db = H.fakeD1();
    await schemaMod.ensureSocialSchema(db);
    for (const t of schemaMod.SOCIAL_TABLES) {
      let ok = true;
      try { await db.prepare('SELECT COUNT(*) AS n FROM ' + t).first(); } catch { ok = false; }
      assert(ok, 'ensureSocialSchema membuat tabel ' + t);
    }
    // Idempoten: dijalankan ulang + migrasi resmi menyusul = tanpa galat.
    await schemaMod.ensureSocialSchema(db);
    let migOk = true;
    try { await boot.applyMigration(db, 'migrations/0006_social.sql'); } catch { migOk = false; }
    assert(migOk, 'migrasi resmi menyusul setelah runtime = no-op idempoten');
    // Fail-closed tanpa DB.
    let rejected = false;
    try { await schemaMod.ensureSocialSchema(null); } catch { rejected = true; }
    assert(rejected, 'ensureSocialSchema MENOLAK db absen (fail-closed, bukan diam-diam)');
  }

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('social-schema-contract-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('social-schema-contract-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('social-schema-contract-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
