#!/usr/bin/env node
'use strict';
/**
 * d1-schema-contract-test.js — gerbang KONTRAK SKEMA D1 (node murni, nol dependensi,
 * nol jaringan).
 *
 * Yang dijaga gerbang ini:
 *   1. Setiap tabel yang DIPAKAI KODE ada di berkas migrasi (dan yang tidak ada
 *      di migrasi harus terdaftar sebagai DORMAN + terbukti tidak tersambung).
 *   2. TIDAK ADA kolom penghubung antara tabel kuota/identitas dan tabel
 *      analytics (pindai DDL kedua database, bukan hanya baca janji di dokumen).
 *   3. Setiap indeks BARU (migrasi >= 0003) punya kueri nyata yang memakainya.
 *   4. `tools/d1-schema-check.mjs` benar-benar MENDETEKSI tabel hilang, kolom
 *      hilang, indeks hilang, dan pelanggaran privasi (diuji dengan fixture,
 *      termasuk fixture yang sengaja rusak — gerbang yang hanya bisa hijau tidak
 *      membuktikan apa pun).
 *   5. Tidak ada `DELETE`/`DROP` tanpa `WHERE`/`LIMIT` di migrasi baru maupun di
 *      blok SQL `docs/D1-RETENTION.md`.
 *
 * Parser DDL di berkas ini SENGAJA ditulis ulang, terpisah dari parser di
 * `tools/d1-schema-check.mjs`. Kalau keduanya memakai kode yang sama, bug parser
 * akan lolos di kedua sisi sekaligus.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = __dirname;
const MIG_DIR = path.join(REPO, 'workers', 'api', 'migrations');
const API_DIR = path.join(REPO, 'workers', 'api');
const CHECKER = path.join(REPO, 'tools', 'd1-schema-check.mjs');

const FILES_BY_DB = {
  core: ['0001_identity.sql', '0001_quota.sql', '0004_indexes.sql'],
  stats: ['0002_analytics.sql']
};

/** Tabel yang dirujuk kode tetapi SENGAJA tidak punya migrasi. Setiap entri wajib
 *  dibuktikan dorman oleh pemeriksaan terpisah di bawah. */
const DORMANT_TABLES = {
  breaker_events: {
    berkas: 'workers/api/breaker/breaker.js',
    alasan:
      'INSERT hanya berjalan bila createStore() menerima handle D1; tidak ada satu pun ' +
      'pemanggil yang memberikannya, dan pemanggilannya dibungkus if(d1) + try/catch. ' +
      'Membuat tabelnya berarti membayar baris tertulis untuk fitur yang belum hidup.'
  }
};

/** Kolom yang tidak boleh muncul di DDL analytics. */
const LINKING_COLUMNS = ['user_id', 'sub', 'install_id', 'account_id', 'legacy_ref_hmac', 'sid'];
/** Kolom analytics yang tidak boleh muncul di DDL kuota/identitas. */
const ANALYTICS_COLUMNS = ['token', 'pepper'];

const checks = [];
function check(name, ok, details) {
  checks.push({ name, ok: Boolean(ok), details: details === undefined ? null : details });
}

/* ------------------------------------------------------------ utilitas kecil */

function stripComments(sql) {
  return String(sql).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}
function statements(sql) {
  return stripComments(sql)
    .split(';')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
function splitTop(body) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
function closingParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}
function listFiles(dir, ext, acc) {
  const out = acc || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      listFiles(full, ext, out);
    } else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}
function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

/* ------------------------------------------------------- skema dari migrasi */

function schemaFromMigrations(files) {
  const tables = new Map();
  const indexes = new Map();
  for (const file of files) {
    const full = path.join(MIG_DIR, file);
    const raw = fs.readFileSync(full, 'utf8');
    for (const stmt of statements(raw)) {
      let m = /^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s*\(/i.exec(stmt);
      if (m) {
        const open = stmt.indexOf('(', m[0].length - 1);
        const close = closingParen(stmt, open);
        const cols = [];
        for (const part of splitTop(stmt.slice(open + 1, close))) {
          if (/^(primary\s+key|unique|check|foreign\s+key|constraint)\b/i.test(part)) continue;
          const c = /^([A-Za-z_]\w*)/.exec(part);
          if (c) cols.push(c[1].toLowerCase());
        }
        tables.set(m[1].toLowerCase(), { name: m[1].toLowerCase(), columns: cols, file, ddl: stmt });
        continue;
      }
      m = /^CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s+ON\s+([A-Za-z_]\w*)\s*\(/i.exec(stmt);
      if (m) {
        const open = stmt.indexOf('(', m[0].length - 1);
        const close = closingParen(stmt, open);
        const tail = stmt.slice(close + 1);
        const w = /\bWHERE\b(.*)$/i.exec(tail);
        indexes.set(m[2].toLowerCase(), {
          name: m[2].toLowerCase(),
          table: m[3].toLowerCase(),
          unique: Boolean(m[1]),
          columns: splitTop(stmt.slice(open + 1, close)).map((c) =>
            c.replace(/\s+(asc|desc)$/i, '').trim().toLowerCase()),
          where: w ? norm(w[1]).toLowerCase() : null,
          file
        });
        continue;
      }
      m = /^DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([A-Za-z_]\w*)/i.exec(stmt);
      if (m) { indexes.delete(m[1].toLowerCase()); continue; }
      m = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([A-Za-z_]\w*)/i.exec(stmt);
      if (m) { tables.delete(m[1].toLowerCase()); }
    }
  }
  return { tables, indexes };
}

/* ------------------------------------------- SQL yang benar-benar ada di kode */

function sqlLiteralsFromCode() {
  const out = [];
  for (const file of listFiles(API_DIR, '.js')) {
    const src = fs.readFileSync(file, 'utf8');
    const re = /(`(?:[^`\\]|\\.)*`|'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")/g;
    let m;
    while ((m = re.exec(src))) {
      const body = m[1].slice(1, -1);
      if (/\b(SELECT|INSERT\s+INTO|INSERT\s+OR|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|CREATE\s+INDEX)\b/i.test(body)) {
        out.push({ file: path.relative(REPO, file), sql: norm(body) });
      }
    }
  }
  return out;
}

function tablesFromSql(sqlList) {
  const found = new Map();
  const re = /\b(?:FROM|INTO|UPDATE|JOIN)\s+([A-Za-z_]\w*)/gi;
  for (const item of sqlList) {
    let m;
    while ((m = re.exec(item.sql))) {
      const t = m[1].toLowerCase();
      if (['select', 'values', 'set', 'sqlite_master'].includes(t)) continue;
      if (!found.has(t)) found.set(t, item.file);
    }
  }
  return found;
}

/* ------------------------------------------------------- pemeriksaan 1 & 1b */

const coreSchema = schemaFromMigrations(FILES_BY_DB.core);
const statsSchema = schemaFromMigrations(FILES_BY_DB.stats);
const allMigrationTables = new Set([...coreSchema.tables.keys(), ...statsSchema.tables.keys()]);
const codeSql = sqlLiteralsFromCode();
const codeTables = tablesFromSql(codeSql);

check('kode_punya_sql_yang_terbaca', codeSql.length >= 20 && codeTables.size >= 8, {
  literal_sql: codeSql.length,
  tabel_dirujuk: [...codeTables.keys()].sort()
});

{
  const missing = [];
  for (const [t, file] of codeTables) {
    if (allMigrationTables.has(t)) continue;
    if (DORMANT_TABLES[t]) continue;
    missing.push({ tabel: t, dirujuk_di: file });
  }
  check('setiap_tabel_yang_dipakai_kode_ada_di_migrasi', missing.length === 0, {
    tabel_migrasi: [...allMigrationTables].sort(),
    tanpa_migrasi: missing,
    dorman_diizinkan: Object.keys(DORMANT_TABLES)
  });
}

// Tabel dorman WAJIB tetap dorman: begitu ada pemanggil yang mengoper handle D1,
// tabelnya harus dibuatkan migrasi dan gerbang ini harus MERAH.
{
  const problems = [];
  for (const [table, meta] of Object.entries(DORMANT_TABLES)) {
    if (allMigrationTables.has(table)) continue; // sudah dibuatkan migrasi: lolos
    const src = fs.readFileSync(path.join(REPO, meta.berkas), 'utf8');
    const exported = /function\s+createStore\s*\(/.test(src);
    if (!exported) { problems.push({ tabel: table, sebab: 'createStore() tidak lagi ada di ' + meta.berkas }); continue; }
    const wiredCalls = [];
    for (const file of listFiles(API_DIR, '.js')) {
      if (path.resolve(file) === path.resolve(REPO, meta.berkas)) continue;
      const s = fs.readFileSync(file, 'utf8');
      const re = /createStore\s*\(([^)]*)\)/g;
      let m;
      while ((m = re.exec(s))) {
        if (/\bd1\b/.test(m[1])) wiredCalls.push({ berkas: path.relative(REPO, file), argumen: norm(m[1]).slice(0, 80) });
      }
    }
    if (wiredCalls.length) problems.push({ tabel: table, sebab: 'createStore() sudah menerima handle D1 tanpa migrasi', pemanggil: wiredCalls });
  }
  check('tabel_dorman_terbukti_belum_tersambung', problems.length === 0, {
    masalah: problems,
    catatan: DORMANT_TABLES
  });
}

// Tabel yang ada di migrasi tapi belum dipakai kode: bukan kegagalan, tapi wajib terlihat.
check('inventaris_tabel_belum_dipakai_kode', true, {
  belum_dipakai: [...allMigrationTables].filter((t) => !codeTables.has(t)).sort(),
  catatan: 'session dan anon_issue sudah ada DDL-nya tetapi belum ada kode yang menulisnya; ' +
    'retensi untuk keduanya tetap wajib ditulis karena DDL-nya sudah dijalankan di produksi.'
});

/* -------------------------------------------- pemeriksaan 2: kontrak privasi */

{
  const coreTableNames = new Set(coreSchema.tables.keys());
  const statsTableNames = new Set(statsSchema.tables.keys());
  const overlap = [...coreTableNames].filter((t) => statsTableNames.has(t));
  check('dua_database_tidak_punya_tabel_bersama', overlap.length === 0, {
    core: [...coreTableNames].sort(), stats: [...statsTableNames].sort(), tumpang_tindih: overlap
  });

  const leaksInStats = [];
  for (const [name, t] of statsSchema.tables) {
    for (const c of t.columns) if (LINKING_COLUMNS.includes(c)) leaksInStats.push({ tabel: name, kolom: c });
  }
  check('ddl_analytics_tanpa_kolom_penghubung', leaksInStats.length === 0, {
    dipindai: [...statsSchema.tables.keys()].sort(), kolom_terlarang: LINKING_COLUMNS, temuan: leaksInStats
  });

  const leaksInCore = [];
  for (const [name, t] of coreSchema.tables) {
    for (const c of t.columns) if (ANALYTICS_COLUMNS.includes(c)) leaksInCore.push({ tabel: name, kolom: c });
  }
  check('ddl_kuota_tanpa_kolom_analytics', leaksInCore.length === 0, {
    dipindai: [...coreSchema.tables.keys()].sort(), kolom_terlarang: ANALYTICS_COLUMNS, temuan: leaksInCore
  });

  // Tidak boleh ada REFERENCES lintas domain, dan tidak boleh ada ATTACH sama sekali.
  const crossRefs = [];
  for (const [db, schema] of [['core', coreSchema], ['stats', statsSchema]]) {
    const foreign = db === 'core' ? statsSchema.tables : coreSchema.tables;
    for (const [name, t] of schema.tables) {
      const refs = t.ddl.match(/REFERENCES\s+([A-Za-z_]\w*)/gi) || [];
      for (const r of refs) {
        const target = norm(r).split(/\s+/)[1].toLowerCase();
        if (foreign.has(target)) crossRefs.push({ database: db, tabel: name, referensi: target });
      }
    }
  }
  const attachHits = [];
  for (const file of [...listFiles(MIG_DIR, '.sql'), ...listFiles(API_DIR, '.js')]) {
    const s = fs.readFileSync(file, 'utf8');
    if (/\bATTACH\s+DATABASE\b/i.test(stripComments(s))) attachHits.push(path.relative(REPO, file));
  }
  check('tidak_ada_foreign_key_atau_attach_lintas_database', crossRefs.length === 0 && attachHits.length === 0, {
    referensi_lintas: crossRefs, attach: attachHits
  });
}

/* ------------------------- pemeriksaan 3: indeks baru harus dipakai kueri */

const NEW_MIGRATIONS = listFiles(MIG_DIR, '.sql')
  .map((f) => path.basename(f))
  .filter((f) => /^(\d{4})_/.test(f) && Number(f.slice(0, 4)) >= 3)
  .sort();

check('ada_migrasi_baru_untuk_diperiksa', NEW_MIGRATIONS.length >= 1, { migrasi_baru: NEW_MIGRATIONS });

{
  const retentionDoc = path.join(REPO, 'docs', 'D1-RETENTION.md');
  const docSql = fs.existsSync(retentionDoc) ? norm(fs.readFileSync(retentionDoc, 'utf8')) : '';
  const haystack = codeSql.map((c) => c.sql.toLowerCase());
  const unused = [];
  const evidence = [];

  for (const file of NEW_MIGRATIONS) {
    const raw = fs.readFileSync(path.join(MIG_DIR, file), 'utf8');
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^\s*CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s+ON\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i.exec(lines[i]);
      if (!m) continue;
      const name = m[2].toLowerCase();
      const table = m[3].toLowerCase();
      const cols = m[4].split(',').map((c) => c.replace(/\s+(asc|desc)$/i, '').trim().toLowerCase());

      // Klaim pemakaian: blok komentar 'DIPAKAI ...' persis di atas CREATE INDEX.
      const claims = [];
      for (let j = i - 1; j >= 0; j -= 1) {
        const line = lines[j];
        if (!/^\s*--/.test(line)) break;
        claims.unshift(line.replace(/^\s*--\s?/, ''));
        if (/DIPAKAI/i.test(line) && j > 0 && !/^\s*--/.test(lines[j - 1])) break;
      }
      const claimText = claims.join(' ');
      const quoted = (claimText.match(/'[^']+'/g) || []).map((q) => norm(q.slice(1, -1)).toLowerCase());

      // Bukti nyata: kueri yang disebut harus benar-benar ada di kode ATAU di
      // dokumen retensi, harus menyentuh tabel indeks ini, dan harus menyaring/
      // mengurutkan dengan kolom pertama indeks.
      const proofs = [];
      for (const q of quoted) {
        const inCode = haystack.some((h) => h.includes(q));
        const inDoc = docSql.toLowerCase().includes(q);
        const touchesTable = q.includes(table);
        const usesLeading = new RegExp('\\b' + cols[0] + '\\b').test(q) &&
          /\b(where|order\s+by|group\s+by)\b/i.test(q);
        if ((inCode || inDoc) && touchesTable && usesLeading) {
          proofs.push({ kueri: q, sumber: inCode ? 'kode' : 'docs/D1-RETENTION.md' });
        }
      }
      evidence.push({ migrasi: file, indeks: name, tabel: table, kolom: cols, klaim: quoted.length, bukti: proofs });
      if (!proofs.length) {
        unused.push({ migrasi: file, indeks: name, tabel: table, kolom: cols, klaim_di_komentar: quoted });
      }
    }
  }
  check('setiap_indeks_baru_punya_kueri_yang_memakainya', unused.length === 0, {
    tanpa_bukti: unused, bukti: evidence
  });
}

/* --------------- pemeriksaan 4: DELETE/DROP liar di migrasi baru & dokumen */

function scanDangerousSql(label, sqlText, opts) {
  const problems = [];
  for (const stmt of statements(sqlText)) {
    if (/^TRUNCATE\b/i.test(stmt)) problems.push({ berkas: label, pernyataan: stmt.slice(0, 140), sebab: 'TRUNCATE dilarang' });
    if (/^DROP\s+TABLE\b/i.test(stmt)) problems.push({ berkas: label, pernyataan: stmt.slice(0, 140), sebab: 'DROP TABLE dilarang di migrasi baru' });
    if (/^DELETE\s+FROM\b/i.test(stmt)) {
      const hasWhere = /\bWHERE\b/i.test(stmt);
      const hasLimit = /\bLIMIT\s+\d+/i.test(stmt);
      if (!hasWhere || !hasLimit) {
        problems.push({ berkas: label, pernyataan: stmt.slice(0, 160), sebab: (!hasWhere ? 'tanpa WHERE' : '') + (!hasWhere && !hasLimit ? ' dan ' : '') + (!hasLimit ? 'tanpa LIMIT' : '') });
      }
    }
    if (/^UPDATE\b/i.test(stmt) && !/\bWHERE\b/i.test(stmt)) {
      problems.push({ berkas: label, pernyataan: stmt.slice(0, 140), sebab: 'UPDATE tanpa WHERE' });
    }
  }
  if (opts && opts.checkDropIndex) problems.push(...scanDropIndex(label, sqlText));
  return problems;
}

/** `DROP INDEX` hanya boleh kalau baris di atasnya menyatakan indeks pengganti
 *  yang dibuat di berkas yang sama, di tabel yang sama, dan kolomnya SUPERSET. */
function scanDropIndex(label, raw) {
  const problems = [];
  const created = new Map();
  const lines = raw.split('\n');
  for (const line of lines) {
    const m = /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s+ON\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i.exec(line);
    if (m) {
      created.set(m[1].toLowerCase(), {
        table: m[2].toLowerCase(),
        columns: m[3].split(',').map((c) => c.trim().toLowerCase())
      });
    }
  }
  // Indeks lama (dari migrasi 0001/0002) untuk mengetahui kolom yang dibuang.
  const legacy = new Map();
  for (const f of listFiles(MIG_DIR, '.sql')) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = /^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_]\w*)\s+ON\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/i.exec(line);
      if (m) legacy.set(m[1].toLowerCase(), { table: m[2].toLowerCase(), columns: m[3].split(',').map((c) => c.trim().toLowerCase()) });
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^\s*DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?([A-Za-z_]\w*)/i.exec(lines[i]);
    if (!m) continue;
    const dropped = m[1].toLowerCase();
    const prev = (lines[i - 1] || '').trim();
    const rm = /^--\s*REDUNDANT-BY:\s*([A-Za-z_]\w*)/i.exec(prev);
    if (!rm) {
      problems.push({ berkas: label, pernyataan: norm(lines[i]), sebab: 'DROP INDEX tanpa baris "-- REDUNDANT-BY: <indeks pengganti>" di atasnya' });
      continue;
    }
    const replacement = created.get(rm[1].toLowerCase());
    const old = legacy.get(dropped);
    if (!replacement) {
      problems.push({ berkas: label, pernyataan: norm(lines[i]), sebab: 'indeks pengganti "' + rm[1] + '" tidak dibuat di berkas yang sama' });
      continue;
    }
    if (old && old.table !== replacement.table) {
      problems.push({ berkas: label, pernyataan: norm(lines[i]), sebab: 'indeks pengganti ada di tabel lain (' + replacement.table + ' vs ' + old.table + ')' });
      continue;
    }
    if (old && !old.columns.every((c) => replacement.columns.includes(c))) {
      problems.push({
        berkas: label, pernyataan: norm(lines[i]),
        sebab: 'kolom indeks lama [' + old.columns.join(',') + '] bukan subset pengganti [' + replacement.columns.join(',') + ']'
      });
    }
  }
  return problems;
}

{
  const problems = [];
  for (const file of NEW_MIGRATIONS) {
    const raw = fs.readFileSync(path.join(MIG_DIR, file), 'utf8');
    problems.push(...scanDangerousSql('workers/api/migrations/' + file, raw, { checkDropIndex: true }));
  }
  check('migrasi_baru_tanpa_delete_drop_liar', problems.length === 0, { diperiksa: NEW_MIGRATIONS, masalah: problems });
}

{
  const doc = path.join(REPO, 'docs', 'D1-RETENTION.md');
  const ok = fs.existsSync(doc);
  let problems = [];
  let blocks = 0;
  if (ok) {
    const text = fs.readFileSync(doc, 'utf8');
    const re = /```sql\n([\s\S]*?)```/g;
    let m;
    while ((m = re.exec(text))) {
      blocks += 1;
      problems.push(...scanDangerousSql('docs/D1-RETENTION.md#blok' + blocks, m[1], null));
    }
  }
  check('sql_retensi_selalu_ber_where_dan_ber_limit', ok && blocks >= 1 && problems.length === 0, {
    dokumen_ada: ok, blok_sql: blocks, masalah: problems
  });
}

/* ------------- pemeriksaan 5: pembanding skema benar-benar bisa MERAH */

function renderRows(schema) {
  const rows = [];
  for (const [name, t] of schema.tables) {
    rows.push({ type: 'table', name, tbl_name: name, sql: 'CREATE TABLE ' + name + ' (' + t.columns.map((c) => c + ' TEXT').join(', ') + ')' });
  }
  for (const [name, ix] of schema.indexes) {
    rows.push({
      type: 'index', name, tbl_name: ix.table,
      sql: 'CREATE ' + (ix.unique ? 'UNIQUE ' : '') + 'INDEX ' + name + ' ON ' + ix.table +
        '(' + ix.columns.join(', ') + ')' + (ix.where ? ' WHERE ' + ix.where : '')
    });
  }
  return rows;
}
function wranglerEnvelope(rows) {
  return JSON.stringify([{ results: rows, success: true, meta: { duration: 1 } }]);
}
function runChecker(db, stdinText) {
  try {
    const out = execFileSync(process.execPath, [CHECKER, '--db', db, '--json'], { input: stdinText, encoding: 'utf8' });
    return { code: 0, report: JSON.parse(out) };
  } catch (e) {
    let report = null;
    try { report = JSON.parse(String(e.stdout || '')); } catch (_) { /* biarkan null */ }
    return { code: e.status === undefined ? -1 : e.status, report, stderr: String(e.stderr || '') };
  }
}

check('pembanding_skema_ada_dan_nol_jaringan', (() => {
  if (!fs.existsSync(CHECKER)) return false;
  const src = fs.readFileSync(CHECKER, 'utf8');
  return !/\bfetch\s*\(|node:https?|require\(['"](https?|net|dgram|tls)['"]\)|from\s+['"]node:(net|http|https|tls|dgram)['"]/.test(src);
})(), { berkas: 'tools/d1-schema-check.mjs' });

const coreRows = renderRows(coreSchema);
const statsRows = renderRows(statsSchema);

{
  const r = runChecker('core', wranglerEnvelope(coreRows));
  check('pembanding_hijau_untuk_skema_yang_benar_core', r.code === 0 && r.report && r.report.cocok === true, {
    exit: r.code, beda: r.report ? r.report.beda : null, ringkasan: r.report ? r.report.ringkasan : null
  });
}
{
  const r = runChecker('stats', wranglerEnvelope(statsRows));
  check('pembanding_hijau_untuk_skema_yang_benar_stats', r.code === 0 && r.report && r.report.cocok === true, {
    exit: r.code, beda: r.report ? r.report.beda : null
  });
}
{ // TABEL HILANG
  const rows = coreRows.filter((r) => r.name !== 'quota_reservation');
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_tabel_hilang', r.code === 1 && kinds.includes('tabel_hilang'), { exit: r.code, kinds });
}
{ // KOLOM HILANG
  const rows = coreRows.map((r) => (r.name === 'quota_daily'
    ? { ...r, sql: r.sql.replace(/ai_held TEXT, /, '') } : r));
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_kolom_hilang', r.code === 1 && kinds.includes('kolom_hilang'), {
    exit: r.code, kinds, beda: r.report ? r.report.beda.filter((d) => d.kind === 'kolom_hilang') : null
  });
}
{ // INDEKS HILANG
  const rows = coreRows.filter((r) => r.name !== 'idx_quota_reservation_expires');
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_indeks_hilang', r.code === 1 && kinds.includes('indeks_hilang'), { exit: r.code, kinds });
}
{ // INDEKS SALAH KOLOM (mis. rollback diam-diam di produksi)
  const rows = coreRows.map((r) => (r.name === 'idx_quota_reservation_day_user'
    ? { ...r, sql: 'CREATE INDEX idx_quota_reservation_day_user ON quota_reservation(day)' } : r));
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_kolom_indeks_berbeda', r.code === 1 && kinds.includes('indeks_kolom_beda'), { exit: r.code, kinds });
}
{ // INDEKS BERLEBIH (indeks lama yang seharusnya sudah di-DROP masih hidup)
  const rows = coreRows.concat([{ type: 'index', name: 'idx_quota_daily_day', tbl_name: 'quota_daily', sql: 'CREATE INDEX idx_quota_daily_day ON quota_daily(day)' }]);
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_indeks_berlebih', r.code === 1 && kinds.includes('indeks_berlebih'), { exit: r.code, kinds });
}
{ // PELANGGARAN PRIVASI: tabel analytics muncul di database kuota
  const rows = coreRows.concat([{ type: 'table', name: 'dau_dedup', tbl_name: 'dau_dedup', sql: 'CREATE TABLE dau_dedup (day TEXT, token TEXT)' }]);
  const r = runChecker('core', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_tabel_analytics_di_database_kuota', r.code === 1 && kinds.includes('pelanggaran_privasi_tabel'), { exit: r.code, kinds });
}
{ // PELANGGARAN PRIVASI: kolom penghubung muncul di database analytics
  const rows = statsRows.map((r) => (r.name === 'metrics_daily'
    ? { ...r, sql: r.sql.replace(/\)$/, ', user_id TEXT)') } : r));
  const r = runChecker('stats', wranglerEnvelope(rows));
  const kinds = r.report ? r.report.beda.map((d) => d.kind) : [];
  check('pembanding_mendeteksi_kolom_penghubung_di_database_analytics', r.code === 1 && kinds.includes('pelanggaran_privasi_kolom'), { exit: r.code, kinds });
}
{ // Masukan rusak harus keluar 2, bukan 0 (jangan pernah "hijau karena diam")
  const r = runChecker('core', 'ini bukan json');
  check('pembanding_menolak_masukan_rusak', r.code === 2, { exit: r.code });
}
{ // Bentuk keluaran wrangler alternatif harus tetap dipahami
  const r = runChecker('core', JSON.stringify({ result: [{ results: coreRows, success: true }] }));
  check('pembanding_menerima_bentuk_json_alternatif', r.code === 0 && r.report && r.report.cocok === true, { exit: r.code });
}

/* -------------------------- pemeriksaan 6: dokumen wajib & pernyataan wajib */

{
  const need = [
    ['docs/D1-BACKUP-RESTORE.md', [/localStorage/, /wrangler d1 export/, /fiezel-core/, /fiezel-stats/, /d1-schema-check\.mjs/]],
    ['docs/D1-RETENTION.md', [/quota_daily/, /session/, /anon_issue/, /dau_dedup/, /quota_reservation/]],
    ['docs/D1-CAPACITY.md', [/100\.000/, /developers\.cloudflare\.com\/d1\/platform\/(pricing|limits)/, /500 MB/]]
  ];
  const problems = [];
  for (const [rel, patterns] of need) {
    const full = path.join(REPO, rel);
    if (!fs.existsSync(full)) { problems.push({ berkas: rel, sebab: 'tidak ada' }); continue; }
    const text = fs.readFileSync(full, 'utf8');
    for (const p of patterns) if (!p.test(text)) problems.push({ berkas: rel, sebab: 'tidak memuat ' + String(p) });
  }
  check('dokumen_d1_wajib_lengkap', problems.length === 0, { masalah: problems });
}

{
  // Pernyataan yang tidak boleh hilang dari dokumen backup, karena itu inti
  // kejujuran ke murid: progres TIDAK ada di D1.
  const full = path.join(REPO, 'docs', 'D1-BACKUP-RESTORE.md');
  const text = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
  const ok = /PROGRES BELAJAR MURID \*\*TIDAK ADA DI D1\*\*/.test(text) &&
    /BUKAN kehilangan progres/.test(text);
  check('dokumen_backup_menyatakan_progres_bukan_di_d1', ok, {
    berkas: 'docs/D1-BACKUP-RESTORE.md'
  });
}

{
  // Urutan pemulihan wajib eksplisit: core sebelum stats.
  const text = fs.existsSync(path.join(REPO, 'docs', 'D1-BACKUP-RESTORE.md'))
    ? fs.readFileSync(path.join(REPO, 'docs', 'D1-BACKUP-RESTORE.md'), 'utf8') : '';
  const iCore = text.indexOf('pulihkan `fiezel-core` LEBIH DULU');
  const iStats = text.indexOf('`fiezel-stats` (SESUDAH core sehat)');
  check('dokumen_backup_menyatakan_urutan_pemulihan', iCore > 0 && iStats > iCore, { posisi_core: iCore, posisi_stats: iStats });
}

/* -------------------------------------------------------------------- laporan */

const failed = checks.filter((c) => !c.ok);
const report = {
  schema: 'fiezel-d1-schema-contract-v1',
  generated_at: new Date().toISOString(),
  total: checks.length,
  lulus: checks.length - failed.length,
  gagal: failed.length,
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  checks
};
fs.writeFileSync(path.join(REPO, 'D1-SCHEMA-CONTRACT-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed.length) {
  console.error('\nd1-schema-contract-test: GAGAL ' + failed.length + '/' + checks.length);
  for (const f of failed) console.error('  - ' + f.name);
  process.exitCode = 1;
} else {
  console.error('\nd1-schema-contract-test: LULUS ' + checks.length + '/' + checks.length);
}
