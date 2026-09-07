'use strict';
/**
 * tests/i18n-kunci-hantu-test.js — GERBANG: t('kunci') YANG KUNCINYA TIDAK PERNAH ADA.
 *
 * `FiezelI18n.t(key)` untuk kunci yang tidak terdaftar TIDAK mengembalikan fallback —
 * ia mengembalikan NAMA KUNCINYA (fiezel-i18n.js: `if (s === undefined) s = key;`).
 * Jadi satu kunci yang salah ketik atau tidak pernah didaftarkan tidak tampil sebagai
 * kalimat Indonesia, melainkan sebagai `guru.pilih-bab-kurikulum` mentah di layar guru,
 * untuk SEMUA bahasa sekaligus.
 *
 * Berkas ini lahir dari kejadian nyata. m025-283 membungkus empat label kurikulum dengan
 * t() dan tidak pernah mendaftarkan kuncinya di copy-map. Gerbang kebocoran Thai berubah
 * hijau — literalnya memang hilang dari kode — sementara layarnya justru menjadi lebih
 * rusak daripada sebelum "diperbaiki". Tidak ada satu pun gerbang yang melihatnya, karena
 * semua gerbang i18n yang ada memeriksa arah sebaliknya: kunci yang TERDAFTAR tapi tidak
 * punya padanan th. Yang hilang adalah arah ini: kunci yang DIPANGGIL tapi tidak ada.
 *
 * Cakupan: pemanggilan dengan kunci LITERAL saja. Prefiks yang disambung di runtime
 * (`t('quota.copy.' + k)`) sengaja dilewati — pemindai statis tidak bisa tahu kunci
 * akhirnya, dan menebaknya akan melahirkan merah palsu.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

/*
 * UTANG YANG SUDAH ADA SEBELUM GERBANG INI (sapuan 2026-09-06).
 * Lima belas kunci ini sudah dipanggil tanpa pernah didaftarkan, jauh sebelum berkas ini
 * ditulis. Mereka dicatat — bukan dimaafkan diam-diam — supaya gerbang ini bisa berdiri
 * hari ini dan menahan kerusakan BARU, sementara utang lama dibayar terpisah oleh yang
 * paling tahu maksud tiap kunci. Hapus barisnya begitu kuncinya didaftarkan; menambah
 * baris baru ke sini untuk membuat gerbang hijau adalah persis kesalahan yang berkas ini
 * ada untuk mencegah.
 */
const UTANG = new Set([
  'progress.belum-terukur',            // app.js
  'account.err-pass-mismatch',         // features/auth/fiezel-account.js
  'quiz.tombol-dengar',                // features/library/fiezel-library-ui.js
  'social.validate-too-short',         // features/social/fiezel-social.js — enam kunci validasi
  'social.validate-too-long',
  'social.validate-end-underscore',
  'social.validate-impersonation',
  'social.milestone-default',
  'social.error-rate-limited-with-retry',
  'fsl.explain-detail',                // features/speaking-listening/listening-generate.js
  'fsl.explain-inference',
  'fsl.explain-attitude',
  'fsl.explain-paraphrase',
  'fsl.explain-dictation',
  /* th-only yang SAH menurut tests/th-coverage-test.js: padanan id-nya adalah fungsi
     perakit di gems-core.js, jadi mendaftarkannya di copy-id justru melanggar gerbang emas. */
  'gems.chip-aria',
  'gems.streak-toast'
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git/.test(p)) walk(p, out); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const I18N_DIR = path.join(__fzRoot, 'features', 'i18n');
const terdaftar = new Set();
for (const f of fs.readdirSync(I18N_DIR).filter((f) => /^copy-id-.*\.js$/.test(f))) {
  const s = fs.readFileSync(path.join(I18N_DIR, f), 'utf8');
  for (const m of s.matchAll(/'([a-z0-9][a-z0-9_.-]*\.[a-z0-9][a-z0-9_.-]*)'\s*:/gi)) terdaftar.add(m[1]);
}

const berkas = [path.join(__fzRoot, 'app.js')]
  .concat(walk(path.join(__fzRoot, 'features'), []))
  .filter((f) => !f.includes(path.join('features', 'i18n')));

const temuan = [];
for (const f of berkas) {
  const src = fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const m of src.matchAll(/(?:FiezelI18n\.t|[^A-Za-z0-9_$]t)\(\s*'([^']+)'/g)) {
    const k = m[1];
    if (!/^[a-z0-9][a-z0-9_.-]*\.[a-z0-9]/i.test(k)) continue;   // bukan bentuk kunci
    if (k.endsWith('.')) continue;                               // prefiks disambung runtime
    if (terdaftar.has(k) || UTANG.has(k)) continue;
    temuan.push(path.relative(__fzRoot, f) + ' → ' + k);
  }
}

let failures = 0;
function test(n, fn) { try { fn(); console.log('ok - ' + n); } catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); } }

test('setiap t(\'kunci\') literal punya kunci yang benar-benar terdaftar di copy-id', () => {
  assert.deepStrictEqual([...new Set(temuan)].sort(), [],
    'kunci dipanggil tapi tidak pernah didaftarkan — layar akan menampilkan NAMA KUNCI, bukan kalimat:\n      ' +
    [...new Set(temuan)].sort().join('\n      '));
});

test('registri utang tidak menyimpan izin yang sudah tidak dipakai', () => {
  const basi = [...UTANG].filter((k) => terdaftar.has(k) && k !== 'gems.chip-aria' && k !== 'gems.streak-toast');
  assert.deepStrictEqual(basi, [],
    'kunci ini sudah didaftarkan; hapus barisnya dari UTANG: ' + basi.join(', '));
});

console.log('\nKunciHantu: ' + (failures ? 'FAIL (' + failures + ')' : 'PASS') + ' — ' + terdaftar.size + ' kunci id terdaftar, ' + UTANG.size + ' utang tercatat');
process.exit(failures ? 1 : 0);
