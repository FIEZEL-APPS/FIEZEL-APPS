#!/usr/bin/env node
/**
 * PHASE 0 · id-golden-snapshot-test.js — GERBANG BASELINE EMAS BAHASA INDONESIA
 *
 * MENGAPA GERBANG INI ADA. Audit multilingual v2 (§24) menemukan bahwa TIDAK ADA satu pun
 * gerbang yang membekukan byte teks yang dilihat murid Indonesia. FIEZEL-5.18.0-BASELINE-
 * CHECKSUM.json hanya dokumentasi — tidak dibaca oleh test mana pun (AI-20 F09). Padahal
 * refactor i18n (ekstraksi ±2.192 literal dari app.js) justru menyentuh SEMUA kalimat itu.
 * Gerbang ini adalah jaminannya: kalau sebuah refactor mengubah SATU kata yang dibaca murid
 * Indonesia, gerbang ini merah. Kalau refactor hanya MEMINDAHKAN kalimat (ke copy-map,
 * ke berkas lain) tanpa mengubah isinya, gerbang ini tetap hijau — karena yang dibekukan
 * adalah HIMPUNAN literal, bukan posisi barisnya.
 *
 * DUA MODE:
 *   node id-golden-snapshot-test.js                  → verifikasi terhadap baseline (CI)
 *   node id-golden-snapshot-test.js --write-baseline → tulis ulang baseline (TINDAKAN SADAR,
 *                                                      hanya ketika perubahan naskah memang
 *                                                      disengaja dan sudah direview owner)
 *
 * ENV:
 *   FIEZEL_ROOT     → root repo FIEZEL (default: __dirname, sesuai konvensi gerbang lain)
 *   FIEZEL_BASELINE → path berkas baseline (default: <folder test ini>/id-golden-baseline.json)
 *
 * TIGA LAPIS PEMBEKUAN:
 *   1. FILES  — sha256 utuh untuk permukaan yang memang berupa berkas naskah/data murid
 *               (lapisan -id, copy-map, manifest, kunci audio yang dilarang berubah).
 *   2. LITERALS — himpunan literal string berbahasa Indonesia yang diekstrak dari app.js +
 *               features/**. Disimpan sebagai daftar terurut + sha256 gabungan. Perubahan
 *               kata = merah, pemindahan kalimat = tetap hijau.
 *   3. ANCHORS — regex yang menegaskan konstanta locale hari ini masih di tempatnya
 *               (lang="id", locale:'id', GUARD Indonesia). Saat Phase 1 mengubahnya secara
 *               sengaja, baseline di-regenerate dalam commit yang sama.
 *
 * Konvensi: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js supaya otomatis
 * terdaftar oleh gate-registry-test.js begitu berkas ini mendarat di root repo.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.env.FIEZEL_ROOT || __dirname;
const BASELINE_PATH = process.env.FIEZEL_BASELINE || path.join(__dirname, 'id-golden-baseline.json');
const WRITE_MODE = process.argv.includes('--write-baseline');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const rel = (p) => path.join(ROOT, p);
const exists = (p) => fs.existsSync(rel(p));

// ------------------------------------------------------------------------------------------
// LAPIS 1 — berkas yang dibekukan utuh.
// Naskah/data murid Indonesia + dua berkas kunci audio (audit AI-17 F02: mengubah skema kunci
// = seluruh korpus audio berbayar yatim). Daftar ini SENGAJA eksplisit, bukan glob.
// ------------------------------------------------------------------------------------------
const LOCKED_FILES = [
  'grammar-explanations-id.json',
  'grammar-misconception-id.json',
  'grammar-labels-id.js',
  'grammar-templates.json',
  'vocabulary-master.json',
  'misconception-taxonomy-v1.json',
  'manifest.json',
  '404.html',
  'features/quota/quota-copy.js',
  'features/speaking-listening/gems-core.js',
  'features/prasasti/fiezel-prasasti-core.js',
  'workers/api/tts/tts-key.js',
  'features/audio-assets/fiezel-audio-key.js'
];

// ------------------------------------------------------------------------------------------
// LAPIS 2 — ekstraksi literal Indonesia dari kode UI.
// ------------------------------------------------------------------------------------------
const LITERAL_SOURCES = () => {
  const out = ['app.js'];
  const walk = (dir) => {
    for (const e of fs.readdirSync(rel(dir), { withFileTypes: true })) {
      const p = dir + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(p);
    }
  };
  walk('features');
  return out.sort();
};

// Lexer kecil: jalan karakter demi karakter, buang komentar, kumpulkan isi string literal.
// Template literal diambil mentah (termasuk ${...}) supaya deterministik.
function extractStrings(src) {
  const strings = [];
  let i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2); if (i < 0) break; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c; let j = i + 1, buf = '';
      while (j < n) {
        if (src[j] === '\\') { buf += src[j] + (src[j + 1] || ''); j += 2; continue; }
        if (src[j] === quote) break;
        buf += src[j]; j++;
      }
      strings.push(buf);
      i = j + 1; continue;
    }
    i++;
  }
  return strings;
}

// Klasifikasi Indonesia: minimal 1 penanda KUAT atau 2 penanda umum, panjang ≥ 4.
// Metode sama dengan lexer audit AI-03 — deterministik, presisi > recall tidak penting di
// sini: yang kita bekukan adalah himpunan yang SAMA dari commit ke commit.
const STRONG = /\b(nggak|kamu|aku|belajar|latihan|jawaban|pelajaran|kosakata|soal|murid|jatah|runtun|permata|tandai|ketuk|ulangi|lanjut|berikutnya|sebelumnya|pengaturan|pencapaian|harian|dengarkan|ucapkan|terjemahan|bahasa)\b/i;
const COMMON = /\b(yang|dengan|untuk|sudah|belum|bisa|akan|lagi|coba|benar|salah|hari|ini|itu|dan|atau|dari|kalau|masih|sedang|semua|target|kembali|mulai|pilih|selesai|baru|saat|per|ke|di)\b/gi;

function isIndonesian(s) {
  if (s.length < 4) return false;
  if (STRONG.test(s)) return true;
  const m = s.match(COMMON);
  return !!m && new Set(m.map(x => x.toLowerCase())).size >= 2;
}

function collectLiterals() {
  const set = new Set();
  for (const f of LITERAL_SOURCES()) {
    if (!exists(f)) continue;
    for (const s of extractStrings(fs.readFileSync(rel(f), 'utf8'))) {
      if (isIndonesian(s)) set.add(s);
    }
  }
  return [...set].sort();
}

// ------------------------------------------------------------------------------------------
// LAPIS 3 — jangkar konstanta locale hari ini. Saat Phase 1 sengaja mengubahnya,
// regenerate baseline di commit yang sama dan jelaskan di pesan commit.
// ------------------------------------------------------------------------------------------
const ANCHORS = [
  { name: 'html lang="id" (index.html)', file: 'index.html', re: /<html[^>]*\blang="id"/ },
  { name: "locale:'id' pin di AI request (app.js)", file: 'app.js', re: /locale:\s*['"]id['"]/ },
  { name: 'GUARD berbahasa Indonesia (ai-tasks.js)', file: 'workers/api/ai/ai-tasks.js', re: /Jawab dalam bahasa Indonesia/ },
  { name: 'utterance.lang default en-US (voice-say)', file: 'features/neural-voice/fiezel-voice-say.js', re: /utterance\.lang\s*=\s*opts\.locale\s*\|\|\s*'en-US'/ },
  { name: 'nama manifest tetap', file: 'manifest.json', re: /"FIEZEL Personal English OS"/ }
];

// ------------------------------------------------------------------------------------------
// Eksekusi
// ------------------------------------------------------------------------------------------
function snapshot() {
  const files = {};
  for (const f of LOCKED_FILES) {
    files[f] = exists(f) ? sha256(fs.readFileSync(rel(f))) : 'MISSING';
  }
  const literals = collectLiterals();
  const anchors = {};
  for (const a of ANCHORS) {
    anchors[a.name] = exists(a.file) ? a.re.test(fs.readFileSync(rel(a.file), 'utf8')) : false;
  }
  return {
    schema: 'id-golden-baseline/1',
    generatedAt: new Date().toISOString(),
    root: ROOT,
    files,
    literals: { count: literals.length, sha256: sha256(literals.join('\n')), list: literals },
    anchors
  };
}

const current = snapshot();

if (WRITE_MODE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));
  console.log(`BASELINE DITULIS → ${BASELINE_PATH}`);
  console.log(`  berkas terkunci : ${Object.keys(current.files).length}`);
  console.log(`  literal Indonesia: ${current.literals.count} (sha256 ${current.literals.sha256.slice(0, 16)}…)`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('GAGAL: baseline belum ada. Jalankan sekali dengan --write-baseline (tindakan sadar).');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok, details });
  if (!ok) failed = true;
};

for (const [f, h] of Object.entries(baseline.files)) {
  check(`FILE ${f}`, current.files[f] === h,
    current.files[f] === h ? 'identik' : `baseline ${String(h).slice(0, 12)}… ≠ sekarang ${String(current.files[f]).slice(0, 12)}…`);
}

const baseSet = new Set(baseline.literals.list);
const curSet = new Set(current.literals.list);
const removed = baseline.literals.list.filter(s => !curSet.has(s));
const added = current.literals.list.filter(s => !baseSet.has(s));
check('LITERAL Indonesia: tidak ada yang hilang/berubah', removed.length === 0,
  removed.length ? `${removed.length} hilang, contoh: ${removed.slice(0, 5).map(s => JSON.stringify(s.slice(0, 60))).join(' | ')}` : 'utuh');
check('LITERAL Indonesia: tidak ada tambahan liar', added.length === 0,
  added.length ? `${added.length} baru (kalau disengaja: regenerate baseline), contoh: ${added.slice(0, 5).map(s => JSON.stringify(s.slice(0, 60))).join(' | ')}` : 'bersih');

for (const [name, ok] of Object.entries(baseline.anchors)) {
  check(`ANCHOR ${name}`, current.anchors[name] === ok && ok === true, ok ? 'sesuai' : 'baseline sendiri false — periksa');
}

for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.details ? ' — ' + c.details : ''}`);
}
console.log(failed
  ? '\nMERAH: teks murid Indonesia berubah. Kalau perubahan ini disengaja dan sudah direview, jalankan --write-baseline di commit yang sama.'
  : '\nHIJAU: baseline emas Indonesia utuh.');
process.exit(failed ? 1 : 0);
