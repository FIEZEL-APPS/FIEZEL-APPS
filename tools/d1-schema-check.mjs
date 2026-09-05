#!/usr/bin/env node
/**
 * tools/d1-schema-check.mjs — buktikan skema D1 PRODUKSI cocok dengan REPO.
 *
 * NOL JARINGAN. Skrip ini tidak pernah memanggil `fetch`, tidak pernah memanggil
 * `wrangler`, dan tidak pernah membuka socket. Ia membaca dua hal saja:
 *   1. HARAPAN  : berkas migrasi di `workers/api/migrations/*.sql` (repo).
 *   2. KENYATAAN: JSON dari STDIN, keluaran `wrangler d1 execute … --json`.
 *
 * Pemisahan itu disengaja: mesin yang punya kredensial Cloudflare (mesin owner)
 * menjalankan wrangler; pembandingnya adalah kode yang bisa diuji di CI tanpa
 * kredensial apa pun. Gerbang `tests/d1-schema-contract-test.js` menguji skrip ini
 * dengan fixture — termasuk fixture yang SENGAJA rusak — supaya terbukti skrip
 * ini bisa MERAH, bukan hanya bisa hijau.
 *
 * PEMAKAIAN
 *   cd workers/api
 *   wrangler d1 execute fiezel-core --remote --json \
 *     --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
 *     | node ../../tools/d1-schema-check.mjs --db core
 *
 *   wrangler d1 execute fiezel-stats --remote --json \
 *     --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
 *     | node ../../tools/d1-schema-check.mjs --db stats --json
 *
 * OPSI
 *   --db core|stats     database yang sedang diperiksa (wajib)
 *   --migrations <dir>  direktori migrasi (default: <repo>/workers/api/migrations)
 *   --files a.sql,b.sql timpa daftar berkas migrasi untuk database itu
 *   --json              keluarkan laporan JSON alih-alih teks
 *   --help
 *
 * KELUAR
 *   0 = skema nyata SAMA dengan skema harapan (dan kontrak privasi utuh)
 *   1 = ada beda (tabel/kolom/indeks hilang, ada yang berlebih, atau domain bocor)
 *   2 = masukan tidak bisa dibaca (JSON rusak / berkas migrasi hilang)
 *
 * YANG DIBANDINGKAN: nama tabel, nama kolom per tabel, nama indeks, daftar kolom
 * indeks, sifat UNIQUE, dan klausa WHERE indeks partial. YANG TIDAK: tipe kolom,
 * DEFAULT, urutan kolom, dan trigger — tiga yang pertama tidak pernah diubah oleh
 * migrasi repo ini, dan trigger tidak dipakai sama sekali (kalau nanti dipakai,
 * skrip ini harus diperluas dan bab ini harus diperbarui).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

/** Nama database yang dikenal skrip ini.
 *  [INFRA-0007-20260829] `learning` ditambahkan bersama migrasi
 *  `0007_learning.sql` (database ketiga `fiezel-learning`, binding
 *  `LEARNING_DB`). Tanpa entri ini, `filesByDbFromDoc` menganggap 0007 "tidak
 *  terpetakan" dan KELUAR 2 — arah gagal yang benar, tapi yang diminta di sini
 *  adalah memperluas gerbang dengan jujur, bukan membiarkannya merah. */
/* [INFRA-0008-20260901] `evidence` = database KEEMPAT (`fiezel-evidence`, binding
 * EVIDENCE_DB, migrasi 0008_evidence.sql). Satu-satunya database yang menyimpan
 * pengenal per-perangkat (`evidence_learner_day.cohort`, TTL 14 hari), jadi arah
 * larangannya paling ketat: tidak boleh memuat identitas, kuota, analytics, MAUPUN
 * tabel lane learning. */
const DB_NAMES = ['core', 'stats', 'learning', 'evidence'];
const DB_ALIAS = { 'fiezel-core': 'core', 'fiezel-stats': 'stats', 'fiezel-learning': 'learning', 'fiezel-evidence': 'evidence' };

/**
 * Berkas migrasi per database — DITURUNKAN, bukan ditulis tangan.
 *
 * Satu direktori melayani DUA database, jadi pemetaan berkas->database wajib
 * eksplisit. Sebelumnya pemetaan itu berupa literal di berkas ini DAN literal
 * kembar di `tests/d1-schema-contract-test.js`. Ketika `0003_cron.sql` mendarat, kedua
 * literal itu tidak diperbarui, jadi tabel `cron_run` lenyap dari "skema harapan"
 * di kedua sisi sekaligus — persis kegagalan diam-diam yang paling berbahaya:
 * gerbang tetap HIJAU untuk hal yang tidak pernah ia periksa.
 *
 * Sumber kebenarannya sekarang perintah penerapan resmi di
 * `<dir>/MIGRATIONS.md`. Kalau ada berkas `.sql` di direktori yang tidak punya
 * perintah `wrangler d1 execute <db> ... --file=migrations/<berkas>`, skrip ini
 * KELUAR 2 (masukan tidak bisa dipercaya) alih-alih membandingkan skema separuh.
 */
export function filesByDbFromDoc(dir) {
  const doc = path.join(dir, 'MIGRATIONS.md');
  if (!fs.existsSync(doc)) {
    throw new Error('katalog migrasi tidak ada: ' + doc + ' (dibutuhkan untuk memetakan berkas -> database)');
  }
  const text = fs.readFileSync(doc, 'utf8');
  const byDb = {};
  for (const db of DB_NAMES) byDb[db] = [];
  const re = /d1\s+execute\s+([A-Za-z0-9_-]+)[^\n]*?--file=migrations\/([A-Za-z0-9_.-]+\.sql)/gi;
  let m;
  while ((m = re.exec(text))) {
    const db = DB_ALIAS[m[1].toLowerCase()];
    if (!db) continue;
    if (!byDb[db].includes(m[2])) byDb[db].push(m[2]);
  }
  for (const db of DB_NAMES) byDb[db].sort();

  // Setiap berkas .sql di direktori WAJIB terpetakan. Diam bukan jawaban.
  const inDir = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const mapped = DB_NAMES.flatMap((db) => byDb[db]).sort();
  const unmapped = inDir.filter((f) => !mapped.includes(f));
  const missing = mapped.filter((f) => !inDir.includes(f));
  if (!inDir.length) throw new Error('tidak ada berkas .sql di ' + dir);
  if (unmapped.length) {
    throw new Error('berkas migrasi tanpa database tujuan di MIGRATIONS.md: ' + unmapped.join(', ') +
      ' — tambahkan perintah `wrangler d1 execute <fiezel-core|fiezel-stats|fiezel-learning|fiezel-evidence> --remote --file=migrations/<berkas>`');
  }
  if (missing.length) {
    throw new Error('MIGRATIONS.md menyebut berkas yang tidak ada di ' + dir + ': ' + missing.join(', '));
  }
  if (mapped.length !== inDir.length) {
    throw new Error('jumlah berkas terpetakan (' + mapped.length + ') != jumlah berkas .sql (' + inDir.length + ')');
  }
  return byDb;
}

/** Tabel yang HARAM ada di masing-masing database (kontrak privasi).
 *  [INFRA-0007-20260829] Lane learning menambah dua arah larangan baru:
 *  tabel learning tidak boleh nyasar ke core/stats, dan database learning
 *  tidak boleh memuat tabel identitas/kuota/analytics. Pemisahan tiga domain
 *  (identitas · kehadiran perangkat · hasil kebijakan Brain) hanya bermakna
 *  kalau ketiga arahnya dijaga, bukan dua. */
/* [INFRA-0009-20260901] Lane bukti PER-MURID (`learner_evidence*`) hidup di
 * `core` bersama identitas. Ketiga tabelnya karena itu DILARANG muncul di
 * stats/learning/evidence: tabel yang memuat `sub` DAN dimensi belajar adalah
 * persis benda yang membuat tiga database lain berhenti anonim kalau ia nyasar
 * ke sana. Arah sebaliknya sudah dijaga baris `core` di bawah. */
const FORBIDDEN_BY_DB = {
  core: ['metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state',
    'learning_daily', 'learning_dedup', 'evidence_daily', 'evidence_dedup', 'evidence_learner_day'],
  stats: ['identity', 'session', 'anon_issue', 'quota_daily', 'quota_reservation',
    'learning_daily', 'learning_dedup', 'evidence_daily', 'evidence_dedup', 'evidence_learner_day',
    'learner_evidence', 'learner_evidence_state', 'learner_evidence_consent'],
  learning: ['identity', 'session', 'anon_issue', 'quota_daily', 'quota_reservation',
    'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state', 'batch_dedup',
    'evidence_daily', 'evidence_dedup', 'evidence_learner_day',
    'learner_evidence', 'learner_evidence_state', 'learner_evidence_consent'],
  evidence: ['identity', 'session', 'anon_issue', 'quota_daily', 'quota_reservation',
    'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state', 'batch_dedup',
    'learning_daily', 'learning_dedup',
    'learner_evidence', 'learner_evidence_state', 'learner_evidence_consent']
};

/** Kolom penghubung yang tidak boleh muncul di database analytics. */
const LINKING_COLUMNS = ['user_id', 'sub', 'install_id', 'account_id'];

/** Objek yang dibuat Cloudflare/SQLite sendiri; bukan urusan repo. */
const INTERNAL = /^(sqlite_|_cf_|d1_)/;

/* ------------------------------------------------------------------ argumen */

function parseArgs(argv) {
  const out = { db: null, migrations: null, files: null, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--db') out.db = argv[++i];
    else if (a === '--migrations') out.migrations = argv[++i];
    else if (a === '--files') out.files = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--db=')) out.db = a.slice(5);
    else if (a.startsWith('--migrations=')) out.migrations = a.slice(13);
    else if (a.startsWith('--files=')) out.files = a.slice(8).split(',').map((s) => s.trim()).filter(Boolean);
    else return { error: 'argumen tidak dikenal: ' + a };
  }
  return out;
}

const USAGE = `pemakaian:
  wrangler d1 execute <db> --remote --json --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \\
    | node tools/d1-schema-check.mjs --db core|stats [--migrations DIR] [--files a.sql,b.sql] [--json]`;

/* --------------------------------------------------------------- parser DDL */

export function stripSqlComments(sql) {
  return String(sql).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Pecah skrip SQL menjadi pernyataan. DDL repo ini tidak memuat ';' di dalam
 *  literal string, jadi pemisahan sederhana ini cukup — dan kalau suatu hari
 *  tidak cukup, hasilnya adalah pernyataan yang tidak dikenali (dilaporkan),
 *  bukan pernyataan yang salah dipahami secara diam-diam. */
export function splitStatements(sql) {
  return stripSqlComments(sql)
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Pecah isi CREATE TABLE (…) pada koma tingkat atas saja. */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

const CONSTRAINT_START = /^(primary\s+key|unique|check|foreign\s+key|constraint)\b/i;

function columnsFromTableBody(body) {
  const cols = [];
  for (const part of splitTopLevel(body)) {
    if (CONSTRAINT_START.test(part)) continue;
    const m = /^["`[]?([A-Za-z_][\w$]*)["`\]]?/.exec(part);
    if (m) cols.push(m[1].toLowerCase());
  }
  return cols;
}

function balancedParen(text, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Urai satu pernyataan DDL menjadi bentuk kanonik. */
export function parseStatement(stmt) {
  let m = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][\w$]*)["`\]]?\s*\(/i.exec(stmt);
  if (m) {
    const open = stmt.indexOf('(', m[0].length - 1);
    const close = balancedParen(stmt, open);
    if (close < 0) return { kind: 'unparsed', text: stmt };
    return {
      kind: 'table',
      name: m[1].toLowerCase(),
      columns: columnsFromTableBody(stmt.slice(open + 1, close)),
      withoutRowid: /WITHOUT\s+ROWID/i.test(stmt.slice(close))
    };
  }
  m = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`[]?([A-Za-z_][\w$]*)["`\]]?\s+ON\s+["`[]?([A-Za-z_][\w$]*)["`\]]?\s*\(/i.exec(stmt);
  if (m) {
    const open = stmt.indexOf('(', m[0].length - 1);
    const close = balancedParen(stmt, open);
    if (close < 0) return { kind: 'unparsed', text: stmt };
    const whereM = /\bWHERE\b(.*)$/i.exec(stmt.slice(close + 1));
    return {
      kind: 'index',
      name: m[2].toLowerCase(),
      table: m[3].toLowerCase(),
      unique: Boolean(m[1]),
      columns: splitTopLevel(stmt.slice(open + 1, close))
        .map((c) => c.replace(/\s+(asc|desc)$/i, '').replace(/["`[\]]/g, '').trim().toLowerCase()),
      where: whereM ? whereM[1].replace(/\s+/g, ' ').trim().toLowerCase().replace(/;$/, '') : null
    };
  }
  m = /^DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?["`[]?([A-Za-z_][\w$]*)["`\]]?/i.exec(stmt);
  if (m) return { kind: 'drop-index', name: m[1].toLowerCase() };
  m = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`[]?([A-Za-z_][\w$]*)["`\]]?/i.exec(stmt);
  if (m) return { kind: 'drop-table', name: m[1].toLowerCase() };
  return { kind: 'other', text: stmt };
}

/**
 * Bangun skema HARAPAN dengan MENERAPKAN migrasi berurutan: `DROP INDEX` di
 * `0004_indexes.sql` ikut diperhitungkan, sehingga harapan = keadaan SESUDAH
 * semua migrasi, bukan gabungan naif semua `CREATE`.
 */
export function expectedSchema(dir, files) {
  const tables = new Map();
  const indexes = new Map();
  const unparsed = [];
  for (const file of files) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) throw new Error('berkas migrasi hilang: ' + full);
    for (const stmt of splitStatements(fs.readFileSync(full, 'utf8'))) {
      const p = parseStatement(stmt);
      if (p.kind === 'table') tables.set(p.name, { name: p.name, columns: p.columns, withoutRowid: p.withoutRowid, file });
      else if (p.kind === 'index') indexes.set(p.name, { ...p, file });
      else if (p.kind === 'drop-index') indexes.delete(p.name);
      else if (p.kind === 'drop-table') tables.delete(p.name);
      else if (p.kind === 'unparsed') unparsed.push({ file, text: p.text.slice(0, 120) });
    }
  }
  return { tables, indexes, unparsed };
}

/* ----------------------------------------------------- masukan dari wrangler */

/** Cari array baris di dalam bentuk-bentuk keluaran wrangler yang mungkin. */
export function rowsFromWranglerJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('STDIN bukan JSON yang sah: ' + e.message);
  }
  const looksLikeRow = (r) => r && typeof r === 'object' && ('sql' in r || 'name' in r);
  const candidates = [];
  const walk = (node, depth) => {
    if (depth > 6 || !node) return;
    if (Array.isArray(node)) {
      if (node.length && node.every(looksLikeRow)) candidates.push(node);
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (typeof node === 'object') {
      for (const key of ['results', 'result', 'rows']) if (key in node) walk(node[key], depth + 1);
      for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v, depth + 1);
    }
  };
  walk(data, 0);
  if (!candidates.length) {
    // Array kosong yang sah (database benar-benar kosong) tetap harus jalan.
    if (Array.isArray(data) && data.length === 0) return [];
    if (Array.isArray(data) && data.every((d) => d && typeof d === 'object' && Array.isArray(d.results))) return [];
    throw new Error('tidak menemukan array baris sqlite_master di JSON masukan');
  }
  return candidates[0];
}

export function actualSchema(rows) {
  const tables = new Map();
  const indexes = new Map();
  const internal = [];
  for (const row of rows) {
    const name = String(row.name || '').toLowerCase();
    if (!name) continue;
    if (INTERNAL.test(name)) { internal.push(name); continue; }
    const type = String(row.type || '').toLowerCase();
    const sql = row.sql ? String(row.sql) : '';
    const p = sql ? parseStatement(splitStatements(sql)[0] || '') : { kind: type === 'index' ? 'index' : 'table' };
    if (type === 'table' || p.kind === 'table') {
      tables.set(name, { name, columns: p.columns || [], withoutRowid: Boolean(p.withoutRowid) });
    } else if (type === 'index' || p.kind === 'index') {
      indexes.set(name, {
        name,
        table: (p.table || String(row.tbl_name || '')).toLowerCase(),
        unique: Boolean(p.unique),
        columns: p.columns || [],
        where: p.where || null
      });
    }
  }
  return { tables, indexes, internal };
}

/* ------------------------------------------------------------ pembandingnya */

export function compare(expected, actual, db) {
  const diffs = [];
  const add = (kind, detail) => diffs.push({ kind, ...detail });

  for (const [name, t] of expected.tables) {
    const a = actual.tables.get(name);
    if (!a) { add('tabel_hilang', { tabel: name, migrasi: t.file }); continue; }
    const missing = t.columns.filter((c) => !a.columns.includes(c));
    const extra = a.columns.filter((c) => !t.columns.includes(c));
    if (missing.length) add('kolom_hilang', { tabel: name, kolom: missing });
    if (extra.length) add('kolom_berlebih', { tabel: name, kolom: extra });
  }
  for (const name of actual.tables.keys()) {
    if (!expected.tables.has(name)) add('tabel_berlebih', { tabel: name });
  }

  for (const [name, ix] of expected.indexes) {
    const a = actual.indexes.get(name);
    if (!a) { add('indeks_hilang', { indeks: name, tabel: ix.table, migrasi: ix.file }); continue; }
    if (a.columns.join(',') !== ix.columns.join(',')) {
      add('indeks_kolom_beda', { indeks: name, harapan: ix.columns, nyata: a.columns });
    }
    if (a.unique !== ix.unique) add('indeks_unique_beda', { indeks: name, harapan: ix.unique, nyata: a.unique });
    if ((a.where || null) !== (ix.where || null)) {
      add('indeks_partial_beda', { indeks: name, harapan: ix.where, nyata: a.where });
    }
  }
  for (const [name, ix] of actual.indexes) {
    if (!expected.indexes.has(name)) add('indeks_berlebih', { indeks: name, tabel: ix.table });
  }

  // Kontrak privasi: dua domain tidak boleh hidup di satu database.
  for (const forbidden of FORBIDDEN_BY_DB[db] || []) {
    if (actual.tables.has(forbidden)) {
      add('pelanggaran_privasi_tabel', { tabel: forbidden, database: db });
    }
  }
  // [INFRA-0007-20260829] pemeriksaan kolom penghubung kini berlaku untuk KEDUA
  // database agregat: stats (analytics) dan learning. Keduanya sama-sama haram
  // memuat kolom yang bisa menautkan baris ke orang/perangkat.
  if (db === 'stats' || db === 'learning' || db === 'evidence') {
    for (const [name, t] of actual.tables) {
      const leaks = t.columns.filter((c) => LINKING_COLUMNS.includes(c));
      if (leaks.length) add('pelanggaran_privasi_kolom', { tabel: name, kolom: leaks });
    }
  }
  return diffs;
}

/* ------------------------------------------------------------------ jalankan */

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (e) {
    throw new Error('gagal membaca STDIN: ' + e.message);
  }
}

export function runCheck({ db, dir, files, stdinText }) {
  const expected = expectedSchema(dir, files);
  const rows = rowsFromWranglerJson(stdinText);
  const actual = actualSchema(rows);
  const diffs = compare(expected, actual, db);
  return {
    schema: 'fiezel-d1-schema-check-v1',
    database: db,
    migrasi: files,
    direktori_migrasi: dir,
    cocok: diffs.length === 0,
    ringkasan: {
      tabel_harapan: expected.tables.size,
      tabel_nyata: actual.tables.size,
      indeks_harapan: expected.indexes.size,
      indeks_nyata: actual.indexes.size,
      objek_internal_diabaikan: actual.internal.length,
      beda: diffs.length
    },
    pernyataan_tak_terurai: expected.unparsed,
    beda: diffs
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) { console.error(args.error + '\n' + USAGE); process.exit(2); }
  if (args.help) { console.log(USAGE); process.exit(0); }
  if (!args.db || !DB_NAMES.includes(args.db)) {
    console.error('--db wajib dan harus salah satu: ' + DB_NAMES.join(', ') + '\n' + USAGE);
    process.exit(2);
  }
  const dir = args.migrations ? path.resolve(args.migrations) : path.join(REPO, 'workers', 'api', 'migrations');
  let files;
  if (args.files && args.files.length) {
    files = args.files;
  } else {
    try {
      files = filesByDbFromDoc(dir)[args.db];
    } catch (e) {
      if (args.json) console.log(JSON.stringify({ schema: 'fiezel-d1-schema-check-v1', cocok: false, galat: e.message }, null, 2));
      else console.error('GALAT: ' + e.message);
      process.exit(2);
    }
  }
  let report;
  try {
    report = runCheck({ db: args.db, dir, files, stdinText: readStdin() });
  } catch (e) {
    if (args.json) console.log(JSON.stringify({ schema: 'fiezel-d1-schema-check-v1', cocok: false, galat: e.message }, null, 2));
    else console.error('GALAT: ' + e.message);
    process.exit(2);
  }
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const r = report.ringkasan;
    console.log(`d1-schema-check · database=${report.database} · migrasi=${report.migrasi.join(', ')}`);
    console.log(`  tabel  harapan ${r.tabel_harapan} / nyata ${r.tabel_nyata}`);
    console.log(`  indeks harapan ${r.indeks_harapan} / nyata ${r.indeks_nyata}`);
    if (report.pernyataan_tak_terurai.length) {
      console.log('  PERINGATAN pernyataan DDL tidak terurai:');
      for (const u of report.pernyataan_tak_terurai) console.log(`    - ${u.file}: ${u.text}`);
    }
    if (report.cocok) {
      console.log('  HASIL: COCOK — skema produksi identik dengan berkas migrasi di repo.');
    } else {
      console.log(`  HASIL: TIDAK COCOK — ${report.beda.length} beda:`);
      for (const d of report.beda) {
        const { kind, ...rest } = d;
        console.log(`    - ${kind}: ${JSON.stringify(rest)}`);
      }
    }
  }
  process.exit(report.cocok ? 0 : 1);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main();

export default { runCheck, expectedSchema, actualSchema, compare, rowsFromWranglerJson, parseStatement, splitStatements, filesByDbFromDoc, DB_NAMES };
