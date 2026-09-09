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
  // m025-301: dua pose ini SUDAH sesuai G1 dan cuma belum pernah didaftarkan.
  // Diukur, bukan diasumsikan — keduanya lolos tanpa satu pun warna di luar palet.
  'assets/brand/mascot/paw-mascot-head.svg',
  'assets/brand/mascot/paw-mascot-official.svg',
];

/* SENI KARAKTER YANG SENGAJA TIDAK DIJAGA — daftar UTANG, bukan daftar lingkup (m025-301).
   -------------------------------------------------------------------------------------
   Daftar SVGS di atas ditulis tangan, dan itu berarti gerbang ini hanya sekuat ingatan
   orang yang terakhir menyuntingnya. Sapuan 8 September 2026 mengukur seluruh repo dan
   menemukan 104 berkas SVG karakter yang TIDAK pernah diperiksa siapa pun — bukan karena
   ada yang memutuskan begitu, tetapi karena tidak ada yang tahu.

   Yang diukur (bukan ditebak):
     - assets/brand/mascot/collection/*.svg — 100 pose, 100 dari 100 di luar palet G1.
       Warnanya palet bawaan Tailwind (#334155 #06b6d4 #8b5cf6 #fde047 dst), jadi jelas
       lahir dari pipeline lain, bukan dari rig PAW.
     - assets/brand/mascot/paw-mascot-hawaiian{,-sunglasses}.svg — palet Material.
     - assets/brand/mascot/paw-mascot-hello.svg + kembar website/-nya — kuning tetangga
       (#ffe066 #f5c442) yang mirip G1 tapi bukan G1.

   KENAPA TIDAK LANGSUNG DIJAGA: tidak satu pun dari 104 berkas itu dikapalkan. Dicari di
   seluruh repo, satu-satunya yang menyebutnya adalah mockups/*.html, dan itu pun menunjuk
   versi .png-nya. Tidak ada di index.html, tidak ada di ASSETS sw.js, tidak pernah sampai
   ke murid. Memasukkannya sekarang membuat CI merah selamanya atas seni yang tidak dilihat
   siapa pun, dan mengecat ulang 100 pose adalah keputusan seni OWNER dengan referensi spec
   — persis yang dilarang kepala berkas ini: "warna baru tidak pernah masuk lewat tes",
   dan kebalikannya juga benar, tes tidak boleh memutuskan seni.

   Jadi yang dijaga di bawah BUKAN warnanya, melainkan BATAS UTANG ini: berkas karakter
   baru — atau berkas lama yang naik dari mockup ke produksi — tidak bisa lagi menyelinap
   tanpa nama. Ia harus lulus palet, atau ditulis di sini sebagai keputusan bertanggal. */
const UTANG_TANPA_PALET = [
  'assets/brand/mascot/collection/',                       // 100 pose, palet Tailwind, hanya di mockups/
  'assets/brand/mascot/paw-mascot-hawaiian.svg',            // palet Material, tidak dikapalkan
  'assets/brand/mascot/paw-mascot-hawaiian-sunglasses.svg', // palet Material, tidak dikapalkan
  'assets/brand/mascot/paw-mascot-hello.svg',               // kuning tetangga, hanya .png-nya di mockups/
  'website/assets/brand/paw-mascot-hello.svg',              // kembar website dari yang di atas
];
/* design/ adalah prototipe yang tidak pernah dimuat produksi (sama seperti pengecualian
   di css-keyframe-uniq-test), jadi ia di luar lingkup, bukan utang. */
const BUKAN_PRODUKSI = ['design/', 'node_modules/', 'vendor/'];

test('inventaris: tidak ada SVG karakter yang tak bernama — lulus palet, atau tercatat sebagai utang', () => {
  const ditemukan = [];
  (function sapu(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git') continue;
      const abs = path.join(dir, e.name);
      const rel = path.relative(__fzRoot, abs).split(path.sep).join('/');
      if (BUKAN_PRODUKSI.some((x) => rel.startsWith(x))) continue;
      if (e.isDirectory()) { sapu(abs); continue; }
      /* "SVG karakter" = seni yang menggambar TUBUH PAW. Penandanya adalah nama berkas,
         karena itu sudah jadi konvensi repo ini sejak awal (paw-*.svg / *paw-mascot*.svg).
         BATAS HEURISTIK INI PERLU DITULIS, bukan dibiarkan tersirat: logo dan wordmark
         (fiezel-icon.svg, fiezel-ask.svg, fiezel-wordmark{,-mono}.svg) tidak tertangkap,
         dan memang di luar lingkup — kepala berkas ini menaruh "chrome aplikasi" di luar
         palet karakter.

         Tapi satu fakta terukur perlu sampai ke owner, bukan hilang di sini: pengukuran
         8 September 2026 menemukan fiezel-wordmark.svg membawa #ffc700 dan #e6a800 —
         PERSIS dua warna yang kepala berkas ini sebut sebagai drift pose lama. Apakah
         wordmark wajib ikut palet karakter G1 adalah keputusan MEREK milik owner, bukan
         keputusan tes, jadi gerbang ini tidak memutuskannya sendiri. Kalau owner
         memutuskan ikut, tambahkan berkasnya ke SVGS. */
      if (/\.svg$/.test(e.name) && /paw/i.test(e.name)) ditemukan.push(rel);
    }
  })(__fzRoot);

  const dijaga = new Set(SVGS);
  const tercatat = (f) => UTANG_TANPA_PALET.some((x) => (x.endsWith('/') ? f.startsWith(x) : f === x));
  const liar = ditemukan.filter((f) => !dijaga.has(f) && !tercatat(f));

  if (liar.length) {
    throw new Error('\n      ' + liar.join('\n      ')
      + '\n      — SVG karakter yang tidak dijaga palet DAN tidak tercatat sebagai utang.'
      + '\n      Dua jalan sah: (a) sudah sesuai G1 -> tambahkan ke SVGS, atau'
      + '\n      (b) belum -> tulis di UTANG_TANPA_PALET dengan alasan dan tanggal, lalu'
      + '\n      sebutkan di laporan ke owner. Yang tidak sah adalah diam.');
  }
  if (ditemukan.length < SVGS.length) {
    throw new Error('penyapu inventaris hanya menemukan ' + ditemukan.length
      + ' SVG karakter padahal ' + SVGS.length + ' sudah dijaga dengan tangan — '
      + 'penyapunya patah, bukan reponya menyusut');
  }
});

test('utang palet tidak diam-diam naik ke produksi', () => {
  /* Alasan SATU-SATUNYA kenapa 104 berkas itu boleh berutang adalah karena tidak
     dikapalkan. Kalau alasan itu gugur, utangnya gugur bersamanya — jadi alasannya
     DIPERIKSA, bukan dipercaya. */
  /* KOMENTAR DIBUANG DULU, dan ini pelajaran yang sudah tiga kali menggigitku di sesi
     m025-301: gerbang yang memindai prosa bisa dibohongi — atau menuduh — oleh sebuah
     kalimat. sw.js penuh penjelasan, dan menyebut jalur aset DI DALAM KOMENTAR bukan
     mengapalkannya. Yang lebih buruk: komentar yang PALING MUNGKIN ditulis orang di sw.js
     adalah "collection/ sengaja TIDAK diprecache" — persis kalimat yang mendokumentasikan
     aturan gerbang ini, dan tanpa penyaring ini gerbangnya justru merah karena kalimat itu,
     sambil menuduh seni yang tidak dikapalkan. Diukur: kalimat itu memerahkan versi
     sebelumnya. Yang ditanya gerbang ini adalah "apakah murid mengunduhnya", dan hanya
     kode yang bisa menjawab. Pola '//' menjaga '://' supaya URL tidak ikut terpotong. */
  const bersih = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const shell = bersih(read('index.html')) + bersih(read('sw.js'));
  /* PENANDA YANG DICARI BERBEDA UNTUK DIREKTORI DAN BERKAS, dan bedanya disengaja
     (temuan review m025-301). Versi pertama memakai basename untuk keduanya, sehingga
     entri direktori 'assets/brand/mascot/collection/' menyusut jadi kata 'collection'
     — kata biasa yang bisa lahir di shell sebagai kelas CSS, nama variabel, atau jalur
     aset lain yang tidak ada hubungannya dengan seni maskot. Gerbangnya lalu merah
     sambil menuduh pose maskot yang tidak pernah dikapalkan: merah palsu yang menyita
     waktu review untuk menelusuri kegagalan yang tidak ada. Diukur 8 September 2026:
     'collection' nol kali di index.html maupun sw.js, jadi ini utang laten, bukan
     kerusakan aktif — diperbaiki sekarang justru selagi murah.

       - DIREKTORI -> dicocokkan sebagai JALUR PENUH ('assets/brand/mascot/collection').
         Rujukan sungguhan ke isinya selalu membawa jalur itu utuh, jadi ketajamannya
         tidak berkurang sedikit pun, sementara tabrakan kata biasa hilang.
       - BERKAS -> tetap dicocokkan sebagai BASENAME ('paw-mascot-hello.svg'). Nama
         seperti itu sudah cukup khas untuk tidak bertabrakan, dan basename menangkap
         rujukan yang jalurnya ditulis lain (mis. kembar website/ yang dipanggil dari
         akar) — hal yang justru lolos kalau jalur penuh dipaksakan ke berkas. */
  const naik = UTANG_TANPA_PALET.filter((x) => {
    const jejak = x.endsWith('/') ? x.replace(/\/$/, '') : x.split('/').pop();
    return shell.indexOf(jejak) >= 0;
  });
  if (naik.length) {
    throw new Error(naik.join(', ')
      + ' — seni ini dikapalkan (disebut index.html atau ASSETS sw.js) padahal tercatat '
      + 'sebagai utang palet. Begitu murid melihatnya, ia wajib lulus G1: cat ulang, '
      + 'atau tarik dari shell.');
  }
});

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
