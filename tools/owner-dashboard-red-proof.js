#!/usr/bin/env node
/**
 * BUKTI MERAH untuk assert baru di owner-dashboard-test.js (paket D1-owner).
 *
 * Gerbang yang tidak pernah dibuktikan bisa merah adalah dekorasi. Skrip ini merusak SATU
 * invarian pada satu waktu di salinan sementara `workers/owner/index.js`, menjalankan gerbang,
 * mencatat assert mana yang gugur, lalu MEMULIHKAN berkas apa adanya (hash dicek).
 *
 * Jalankan: node tools/owner-dashboard-red-proof.js
 * Keluar 0 hanya bila SEMUA mutasi benar-benar membuat gerbang merah dan pemulihan kembali hijau.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET = path.join(ROOT, 'workers/owner/index.js');
const GATE = path.join(ROOT, 'owner-dashboard-test.js');

const ORIGINAL = fs.readFileSync(TARGET, 'utf8');
const ORIGINAL_HASH = crypto.createHash('sha256').update(ORIGINAL).digest('hex');

// Setiap mutasi = satu cara realistis invarian ini bisa hilang di masa depan.
const MUTATIONS = [
  {
    id: 'M1',
    invariant: '(f) "belum ada pengukuran" dirender BEDA dari "nol terukur"',
    how: 'paksa state selalu "measured" (nol tanpa data disamakan dengan nol terukur)',
    apply: (s) => s.replace(
      'else if (!Number.isFinite(daysTotal) || daysTotal <= 0) state = STATE_NO_DATA;',
      'else if (false) state = STATE_NO_DATA;',
    ),
  },
  {
    id: 'M2',
    invariant: '(f) spanduk keadaan dirender di ATAS panel',
    how: 'hapus render spanduk keadaan dari HTML',
    apply: (s) => s.replace('\n${emptyBanner}', ''),
  },
  {
    id: 'M3',
    invariant: '(f) kegagalan baca D1 tidak menyamar jadi nol',
    how: 'label keadaan "unavailable" diganti menjadi "nol terukur"',
    apply: (s) => s.replace(
      '    ? UNAVAILABLE_TEXT : NO_DATA_TEXT;',
      '    ? MEASURED_ZERO_TEXT : NO_DATA_TEXT;',
    ),
  },
  {
    id: 'M4',
    invariant: '(f) nol terukur ditandai eksplisit, bukan angka telanjang',
    how: 'fmtCount() kembali menjadi format angka biasa',
    apply: (s) => s.replace(
      'function fmtCount(m, v) {',
      'function fmtCount(m, v) { return fmtInt(v); } function fmtCountUnused(m, v) {',
    ),
  },
  {
    id: 'M5',
    invariant: '(g) default deny untuk rute tak dikenal',
    how: 'rute tak dikenal dijawab 200 (fallthrough) alih-alih 403',
    // Fallthrough router = `return deny()` TERAKHIR di berkas. Diganti jadi 200 supaya rute yang
    // tidak dikenal "berhasil" — persis bentuk regresi yang paling mungkin terjadi.
    apply: (s) => {
      const needle = '  return deny();\n}';
      const at = s.lastIndexOf(needle);
      if (at < 0) return s;
      return s.slice(0, at) + "  return new Response('ok', { status: 200 });\n}" + s.slice(at + needle.length);
    },
  },
  {
    id: 'M6',
    invariant: '(h) nol rute owner yang bisa diakses tanpa gerbang',
    how: 'rute JSON /api/summary dipindah ke daftar publik',
    apply: (s) => s.replace(
      "const PUBLIC_ROUTES = ['/login'];",
      "const PUBLIC_ROUTES = ['/login', '/api/summary'];",
    ),
  },
  {
    id: 'M7',
    invariant: '(i) identitas murid perorangan tidak pernah tampil',
    how: 'sanitizeRow() meloloskan seluruh kolom apa adanya',
    apply: (s) => s.replace(
      'function sanitizeRow(row, droppedInto) {',
      'function sanitizeRow(row, droppedInto) { return row; } function sanitizeRowUnused(row, droppedInto) {',
    ),
  },
  {
    id: 'M8',
    invariant: '(i) JSON tidak mengulang NAMA kolom asing keluar',
    how: 'daftar nama kolom yang dibuang dikirim kembali di payload JSON',
    apply: (s) => s.replace(
      'droppedFieldCount: droppedFields.length,',
      'droppedFieldCount: droppedFields.length,\n    droppedFields,',
    ),
  },
];

function runGate() {
  try {
    const out = execFileSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { exit: 0, out };
  } catch (e) {
    return { exit: e.status == null ? 1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

function failedAsserts(out) {
  return out.split('\n').filter((l) => l.includes('\u2717')).map((l) => l.replace(/^\s*\u2717\s*/, '').trim());
}

const rows = [];
let ok = true;

const baseline = runGate();
if (baseline.exit !== 0) {
  console.error('BASELINE SUDAH MERAH — bukti merah tidak bermakna. Perbaiki gerbang dulu.');
  console.error(baseline.out.slice(-2000));
  process.exit(1);
}
console.log('baseline: HIJAU (exit 0)\n');

for (const m of MUTATIONS) {
  const mutated = m.apply(ORIGINAL);
  if (mutated === ORIGINAL) {
    console.error(m.id + ': MUTASI TIDAK MENGENAI APA PUN (pola sudah berubah) — dianggap gagal.');
    rows.push({ id: m.id, invariant: m.invariant, how: m.how, exit: 'n/a', failed: ['MUTASI TIDAK BERLAKU'] });
    ok = false;
    continue;
  }
  fs.writeFileSync(TARGET, mutated);
  const res = runGate();
  const failed = failedAsserts(res.out);
  fs.writeFileSync(TARGET, ORIGINAL);
  const restoredHash = crypto.createHash('sha256').update(fs.readFileSync(TARGET, 'utf8')).digest('hex');
  if (restoredHash !== ORIGINAL_HASH) {
    console.error(m.id + ': PEMULIHAN GAGAL — berkas tidak identik lagi. Berhenti.');
    process.exit(1);
  }
  const red = res.exit !== 0 && failed.length > 0;
  if (!red) ok = false;
  rows.push({ id: m.id, invariant: m.invariant, how: m.how, exit: res.exit, failed: failed.slice(0, 4), failedCount: failed.length });
  console.log(`${m.id} ${red ? 'MERAH \u2713' : 'TETAP HIJAU \u2717'} exit=${res.exit} assert gugur=${failed.length}`);
  for (const f of failed.slice(0, 4)) console.log('    - ' + f);
}

const after = runGate();
console.log('\npasca-pemulihan: ' + (after.exit === 0 ? 'HIJAU (exit 0)' : 'MERAH exit=' + after.exit));
if (after.exit !== 0) ok = false;

const md = ['# Matriks bukti merah — owner-dashboard-test.js (paket D1-owner)', '',
  'Dihasilkan `tools/owner-dashboard-red-proof.js`. Setiap baris: satu invarian dirusak di',
  '`workers/owner/index.js`, gerbang dijalankan, lalu berkas dipulihkan (hash sha256 dicek identik).',
  '', '| Mutasi | Invarian yang dirusak | Cara merusak | exit | assert gugur | contoh assert yang merah |',
  '|---|---|---|---|---|---|'];
for (const r of rows) {
  md.push(`| ${r.id} | ${r.invariant} | ${r.how} | ${r.exit} | ${r.failedCount == null ? '-' : r.failedCount} | ${(r.failed[0] || '-').replace(/\|/g, '\\|')} |`);
}
md.push('', 'Baseline sebelum mutasi: exit 0. Pasca seluruh pemulihan: exit ' + after.exit + '.', '');
fs.writeFileSync(path.join(ROOT, 'reports/owner-dashboard-red-proof.md'), md.join('\n'));
console.log('matriks ditulis ke reports/owner-dashboard-red-proof.md');
process.exit(ok ? 0 : 1);
