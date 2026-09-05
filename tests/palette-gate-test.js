#!/usr/bin/env node
/**
 * Gerbang palet tertutup G1 untuk redesign maskot PAW.
 *
 * G1 (spec §1, §14): palet karakter TERTUTUP — #FFD94F #EDB93A #FFF4DA #8C2233
 * #33201F #F0A0AC #D8B36B #D9536A, plus pengecualian tersahkan #9CC7E8
 * (keringat/air mata), sorot #fff, dan #000 pada opacity bayangan. Tidak ada
 * yang lain, selamanya. Audit menemukan drift-nya bukan hipotesis: pose lama
 * membawa #241A11 #FFC700 #E6A800, BRAND-GUIDE menulis #F8CF4D padahal seninya
 * #EDB93A, dan komponen menyelundupkan #F8CF4D + #4FC79B ke confetti. Gerbang
 * ini MERAH sampai rig baru (subagent Rig komponen PAW, Wave I) me-retint
 * confetti dan pipeline ekspor (Wave II) me-generate ulang pose — dan itu
 * tugasnya: warna baru tidak pernah masuk lewat tes.
 *
 * Lingkup: berkas SVG karakter (brand + pose + kembar website), seluruh
 * fiezel-mascot.js, dan bagian MASKOT dari fiezel-motion.css. Blok token
 * micro-interaction UI (--fz-ink, --fz-green, dsb.) SENGAJA di luar lingkup:
 * itu chrome aplikasi yang menumpang berkas, bukan tubuh karakter, dan sudah
 * dijaga tes kontras yang ada.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(__fzRoot, f));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

// Palet tertutup G1 + pengecualian tersahkan. Menambah warna ke daftar ini
// adalah keputusan OWNER dengan referensi spec — bukan penyesuaian tes.
const G1 = new Set([
  'ffd94f', 'edb93a', 'fff4da', '8c2233', '33201f', 'f0a0ac', 'd8b36b', 'd9536a',
  '9cc7e8',                    // keringat / air mata (sanctioned, spec §1 G1)
  'fff', 'ffffff',             // sorot mata / gigi
  '000', '000000',             // bayangan tanah & noda lengan @ .08/.04
]);

// Tinta marka tapak standalone (favicon/cetak). Di DALAM aplikasi ikonnya tanpa
// warna dan mengikuti --fz-i-line (dijaga tests/paw-mascot-test.js); berkas standalone
// butuh satu tinta mati, dan tintanya BUKAN warna tubuh karakter. Hanya berlaku
// untuk dua berkas fiezel-paw.svg — muncul di tempat lain tetap pelanggaran.
const MARK_INK = new Set(['2b2118']);

const norm = (hex) => hex.replace('#', '').toLowerCase();

function offenders(text, extra) {
  const bad = new Map();
  for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    const h = norm(m[0]);
    if (!G1.has(h) && !(extra && extra.has(h))) bad.set(h, (bad.get(h) || 0) + 1);
  }
  return [...bad].map(([h, n]) => '#' + h + ' ×' + n);
}

/* ---------- berkas SVG karakter: lingkup penuh ---------- */

const SVGS = [
  'assets/brand/fiezel-paw.svg',
  'assets/brand/paw-mascot-full.svg',
  'assets/brand/paw-mascot-head.svg',
  'website/assets/brand/fiezel-paw.svg',
  'website/assets/brand/paw-mascot-full.svg',
  'website/assets/brand/paw-mascot-head.svg',
  'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
];

test('SVG karakter: tidak ada hex di luar palet G1', () => {
  const drift = [];
  for (const f of SVGS) {
    if (!exists(f)) { drift.push(f + ': berkas hilang'); continue; }
    const bad = offenders(read(f), f.endsWith('fiezel-paw.svg') ? MARK_INK : null);
    if (bad.length) drift.push(f + ': ' + bad.join(', '));
  }
  if (drift.length) {
    throw new Error('\n      ' + drift.join('\n      ')
      + '\n      — warna baru tidak pernah masuk lewat tes; ubah dulu G1 di spec dengan keputusan OWNER');
  }
});

/* ---------- komponen rig: lingkup penuh berkas ---------- */

test('fiezel-mascot.js: tidak ada hex di luar palet G1 (termasuk confetti)', () => {
  // Confetti IKUT dijaga: ia dirender dari CONF_COLORS di berkas ini dan tampil
  // menempel pada karakter. #F8CF4D adalah drift dokumen yang dikapalkan ke
  // runtime, #4FC79B tidak pernah ada di palet mana pun.
  const bad = offenders(read('features/mascot/fiezel-mascot.js'));
  if (bad.length) throw new Error(bad.join(', '));
});

/* ---------- fiezel-motion.css: hanya bagian karakter ---------- */

test('fiezel-motion.css: bagian MASKOT/STATE bebas hex di luar G1', () => {
  const css = read('features/mascot/fiezel-motion.css');
  // Irisan berbasis penanda bagian. Kalau penandanya hilang, GAGAL — lingkup yang
  // menyusut diam-diam lebih buruk daripada tes yang minta diperbarui. (Catatan
  // untuk penulis ulang motion CSS: pertahankan penanda MASKOT, MICRO-INTERACTIONS
  // UI, dan 4 STATE TAMBAHAN, atau perbarui irisan gerbang ini dalam PR yang sama.)
  const cut = (from, to) => {
    const a = css.indexOf(from);
    const b = css.indexOf(to);
    if (a === -1 || b === -1 || b < a) {
      throw new Error('penanda bagian "' + from.slice(0, 30) + '…" tidak ditemukan — '
        + 'struktur berkas berubah, perbarui irisan gerbang ini');
    }
    return css.slice(a, b);
  };
  // Dua tata letak dikenal: berkas lama menaruh "4 STATE TAMBAHAN" SESUDAH blok
  // MICRO-INTERACTIONS UI (perlu irisan kedua sampai PENEMPATAN); berkas hasil
  // penulisan ulang Wave I menaruh seluruh bagian karakter berurutan sebelum blok
  // chrome, sehingga irisan pertama sudah memuat semuanya — irisan kedua justru
  // akan menyeret chrome (tombol/XP bar) ke lingkup karakter dan gagal palsu.
  let character =
    cut('================= MASKOT =================', '================= MICRO-INTERACTIONS UI');
  if (css.indexOf('4 STATE TAMBAHAN') === -1) {
    throw new Error('penanda "4 STATE TAMBAHAN" hilang dari berkas — '
      + 'struktur berkas berubah, perbarui irisan gerbang ini');
  }
  if (!character.includes('4 STATE TAMBAHAN')) {
    character += cut('4 STATE TAMBAHAN', 'PENEMPATAN DI FIEZEL-APPS');
  }
  const bad = offenders(character);
  if (bad.length) throw new Error(bad.join(', '));
});

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang palet G1: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang palet G1: PASS ' + pass);
