/**
 * auth-schema-contract-test.js — GERBANG kontrak SKEMA lapisan akun/peran/konten guru.
 * Pola dan alasannya sama dengan `social-schema-contract-test.js`.
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. `migrations/0011_auth_roles.sql` + `0012_teacher_content.sql` (sumber
 *      resmi) SETARA pernyataan-per-pernyataan dengan DDL runtime di
 *      `workers/api/auth-schema.js`. Dua versi skema yang boleh berbeda =
 *      migrasi bayangan.
 *   2. Kedua migrasi hanya `CREATE TABLE/INDEX IF NOT EXISTS` — nol DROP/DELETE/
 *      UPDATE/INSERT/ALTER. Migrasi yang bisa menghapus data murid tidak boleh
 *      dijalankan runtime pada permintaan pertama.
 *   3. Kontrak privasi 0001/0006 DIWARISI: nol kolom email/nama murid/IP/UA,
 *      nol kolom teks bebas antar pengguna, nol kolom penghubung analytics.
 *   4. `identity` TETAP bersih: kredensial hidup di tabel terpisah.
 *   5. Nol tabrakan nama tabel dengan migrasi lain yang sudah ada.
 *   6. ensureAuthSchema membuat SEMUA tabel di D1 palsu, idempoten, dan MENOLAK
 *      db absen (fail-closed).
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = __dirname;
const API_DIR = path.join(REPO, 'workers', 'api');
const MIG_DIR = path.join(API_DIR, 'migrations');

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

/** Buang komentar `--`, rapikan spasi: bentuk banding kanonik. */
function normalizeSql(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

function statementsOf(sql) {
  return normalizeSql(sql)
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

(async () => {
  const schema = await import('file://' + path.join(API_DIR, 'auth-schema.js'));

  const sqlAuth = mustRead(path.join(MIG_DIR, '0011_auth_roles.sql'));
  const sqlTeacher = mustRead(path.join(MIG_DIR, '0012_teacher_content.sql'));

  /* ---------- 1. Kesetaraan runtime <-> migrasi ------------------------------- */
  const pairs = [
    ['0011_auth_roles.sql', sqlAuth, schema.AUTH_DDL],
    ['0012_teacher_content.sql', sqlTeacher, schema.TEACHER_DDL]
  ];
  for (const [name, sql, ddl] of pairs) {
    const fromFile = statementsOf(sql);
    const fromCode = ddl.map((s) => normalizeSql(s));
    assert(fromFile.length === fromCode.length,
      name + ': jumlah pernyataan sama (' + fromFile.length + ' vs ' + fromCode.length + ')');
    for (let i = 0; i < Math.max(fromFile.length, fromCode.length); i += 1) {
      assert(fromFile[i] === fromCode[i],
        name + ': pernyataan #' + (i + 1) + ' SETARA runtime vs migrasi');
    }
  }

  /* ---------- 2. Hanya DDL aditif -------------------------------------------- */
  for (const [name, sql] of [['0011', sqlAuth], ['0012', sqlTeacher]]) {
    const body = normalizeSql(sql).toUpperCase();
    for (const forbidden of ['DROP ', 'DELETE ', 'UPDATE ', 'INSERT ', 'ALTER ', 'TRUNCATE ', 'ATTACH ', 'PRAGMA ']) {
      assert(!body.includes(forbidden),
        name + ': TIDAK memuat `' + forbidden.trim() + '` — DDL yang diterapkan runtime harus aditif murni');
    }
    for (const statement of statementsOf(sql)) {
      assert(/^CREATE (TABLE|UNIQUE INDEX|INDEX) IF NOT EXISTS /.test(statement),
        name + ': setiap pernyataan ber-IF NOT EXISTS (idempoten): ' + statement.slice(0, 60));
    }
  }

  /* ---------- 3. Kontrak privasi diwarisi ------------------------------------ */
  const allDdl = normalizeSql(sqlAuth + '\n' + sqlTeacher).toLowerCase();
  // Hanya BADAN pernyataan yang diperiksa: komentar kepala berkas MEMBAHAS
  // larangan ini secara eksplisit, dan mencocokkan komentar akan memerah palsu.
  const columnsOnly = schema.ALL_DDL.join(' ').toLowerCase();
  const bannedColumns = [
    'email', 'phone', 'nomor_hp', 'birth', 'age', 'real_name', 'full_name',
    'ip_addr', 'user_agent', 'timezone', 'latitude', 'longitude',
    'message', 'comment', 'note_text', 'chat', 'transcript', 'answer_text',
    'visitor_token', 'pepper', 'password'
  ];
  for (const banned of bannedColumns) {
    assert(!columnsOnly.includes(banned),
      'DDL TIDAK memuat kolom terlarang `' + banned + '` (daftar keras bab 29)');
  }
  assert(columnsOnly.includes('pass_hash'),
    'kredensial disimpan sebagai `pass_hash` (turunan PBKDF2), BUKAN kolom bernama password');
  assert(columnsOnly.includes('code_hash') && !columnsOnly.includes('invite_code '),
    'undangan guru disimpan sebagai hash, bukan teks token');
  assert(!/\bnotification\b[^)]*\b(message|body|title)\b/.test(columnsOnly),
    'tabel notification TANPA kolom naskah — naskah dirakit klien dari i18n');
  assert(allDdl.includes('kind text not null') || columnsOnly.includes('kind text not null'),
    'notifikasi memakai enum `kind`, bukan teks bebas');

  /* ---------- 4. identity tetap bersih --------------------------------------- */
  // Komentar DIBUANG lebih dulu: kepala 0001 MENYEBUT kata "password" justru
  // untuk melarangnya, dan mencocokkan prosa akan memerah palsu atas dokumen
  // yang benar. Yang diperiksa adalah kolom yang sungguh ada.
  const identitySql = normalizeSql(mustRead(path.join(MIG_DIR, '0001_identity.sql'))).toLowerCase();
  assert(!identitySql.includes('pass_hash') && !identitySql.includes('password'),
    'tabel identity TETAP tanpa kredensial — pemisahan tabel dihormati, bukan hanya dijanjikan');
  assert(!statementsOf(sqlAuth).some((s) => /CREATE TABLE IF NOT EXISTS identity /i.test(s)),
    'paket ini tidak mendefinisikan ulang tabel identity');

  /* ---------- 5. Tabrakan nama tabel ----------------------------------------- */
  const ours = new Set([...schema.AUTH_TABLES, ...schema.TEACHER_TABLES]);
  const declared = schema.ALL_DDL
    .map((s) => (s.match(/CREATE TABLE IF NOT EXISTS (\w+)/) || [])[1])
    .filter(Boolean);
  assert(declared.length === ours.size,
    'daftar AUTH_TABLES+TEACHER_TABLES cocok dengan tabel yang benar-benar dibuat');
  for (const table of declared) {
    assert(ours.has(table), 'tabel ' + table + ' terdaftar di manifes tabel');
  }
  for (const file of fs.readdirSync(MIG_DIR)) {
    if (!file.endsWith('.sql') || file.startsWith('0011') || file.startsWith('0012')) continue;
    const other = mustRead(path.join(MIG_DIR, file));
    for (const match of other.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)) {
      assert(!ours.has(match[1]),
        'tabel ' + match[1] + ' (' + file + ') TIDAK bertabrakan dengan paket ini');
    }
  }

  /* ---------- 6. ensureAuthSchema atas D1 palsu ------------------------------ */
  const applied = [];
  const fakeDb = {
    prepare(sql) {
      return { async run() { applied.push(sql); return { success: true }; } };
    }
  };
  await schema.ensureAuthSchema(fakeDb);
  assert(applied.length === schema.ALL_DDL.length, 'ensureAuthSchema menerapkan SELURUH DDL');
  for (const table of ours) {
    assert(applied.some((s) => s.includes('IF NOT EXISTS ' + table + ' ')),
      'ensureAuthSchema membuat tabel ' + table);
  }
  const before = applied.length;
  await schema.ensureAuthSchema(fakeDb);
  assert(applied.length === before,
    'panggilan kedua = no-op (cache per handle DB, bukan satu rangkaian DDL per permintaan)');

  let rejected = false;
  try { await schema.ensureAuthSchema(null); } catch { rejected = true; }
  assert(rejected, 'ensureAuthSchema MENOLAK db absen (fail-closed, bukan 200 atas database tanpa tabel)');

  schema.resetSchemaCacheForTest(fakeDb);
  await schema.ensureAuthSchema(fakeDb);
  assert(applied.length === before * 2, 'reset cache gerbang benar-benar memaksa penerapan ulang');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('auth-schema-contract-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('auth-schema-contract-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('auth-schema-contract-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
