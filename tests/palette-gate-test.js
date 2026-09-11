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

/* m025-303: daftar ini dulu berisi seluruh seni tubuh PAW (rig, ekspor pose,
   kembar website). Semuanya terhapus bersama rig: karakter aplikasi kini Nusa &
   Mira, seni gambar raster dengan palet storybook-flat sendiri — palet G1 adalah
   palet KARAKTER PAW dan tidak berlaku untuk mereka.

   Yang tersisa dan tetap dijaga adalah MARKA TELAPAK, dan itu memang masih hidup:
   favicon, cap splash, dan lima tempat di UI memakainya, dan Nusa sendiri
   membawanya di bandana. Tinta markanya (#2B2118) sudah dikecualikan MARK_INK
   sejak awal karena ia bukan warna tubuh karakter. */
const SVGS = [
  'assets/brand/fiezel-paw.svg',
  'website/assets/brand/fiezel-paw.svg',
];

/* DIREKTORI YANG DIJAGA UTUH (m025-302).
   ----------------------------------------
   SVGS di atas adalah daftar tulis-tangan, dan kepala daftar utang di bawah sudah
   mencatat kelemahannya: ia hanya sekuat ingatan penyunting terakhir. Sistem karakter
   merek (assets/brand/character-system/) lahir sebagai 64 berkas HASIL GENERATE dan akan
   bertambah tiap kali pustaka pose/prop tumbuh — menyalin 64 nama ke SVGS berarti daftar
   itu basi pada ekspor berikutnya, diam-diam, persis cacat yang sudah pernah terjadi.

   Jadi yang didaftarkan bukan berkasnya melainkan DIREKTORINYA: setiap .svg di bawah
   prefiks ini dijaga palet, hari ini dan pada setiap berkas baru, tanpa ada yang perlu
   ingat menambahkannya. Ini memperKETAT gerbang, bukan melonggarkannya. */
const SVG_DIRS = [
  /* kosong sejak m025-303: assets/brand/character-system/ (sistem karakter PAW)
     terhapus bersama rig-nya. Mekanismenya SENGAJA ditinggal hidup — begitu ada
     direktori seni vektor ber-palet G1 lagi, satu baris di sini menjaga seluruh
     isinya, termasuk berkas yang ditambahkan besok. */
];

/** Semua .svg di bawah SVG_DIRS, ditemukan dari isi direktori — bukan daftar. */
function svgsDiDirJaga() {
  const out = [];
  for (const d of SVG_DIRS) {
    const root = path.join(__fzRoot, d);
    if (!fs.existsSync(root)) continue;
    (function sapu(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) { sapu(abs); continue; }
        if (e.name.endsWith('.svg')) out.push(path.relative(__fzRoot, abs).split(path.sep).join('/'));
      }
    })(root);
  }
  return out.sort();
}

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
/* m025-303: daftar utang ini KOSONG sekarang, dan itu bukan karena dimaafkan —
   105 berkas yang tercatat di sini (100 pose koleksi, dua Hawaii, hello + kembarnya)
   benar-benar DIHAPUS dari repo bersama seluruh seni PAW. Utang lunas dengan cara
   yang paling bersih: subjeknya tidak ada lagi.

   Daftarnya ditinggal ada, bukan dibuang, supaya jalur sahnya tetap terbuka: seni
   karakter baru yang belum lulus palet harus ditulis di sini dengan alasan dan
   tanggal, bukan didiamkan. */
const UTANG_TANPA_PALET = [
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

  const dijaga = new Set([...SVGS, ...svgsDiDirJaga()]);
  const tercatat = (f) => UTANG_TANPA_PALET.some((x) => (x.endsWith('/') ? f.startsWith(x) : f === x));
  const liar = ditemukan.filter((f) => !dijaga.has(f) && !tercatat(f));

  if (liar.length) {
    throw new Error('\n      ' + liar.join('\n      ')
      + '\n      — SVG karakter yang tidak dijaga palet DAN tidak tercatat sebagai utang.'
      + '\n      Dua jalan sah: (a) sudah sesuai G1 -> tambahkan ke SVGS, atau'
      + '\n      (b) belum -> tulis di UTANG_TANPA_PALET dengan alasan dan tanggal, lalu'
      + '\n      sebutkan di laporan ke owner. Yang tidak sah adalah diam.');
  }
  if (ditemukan.length < dijaga.size) {
    throw new Error('penyapu inventaris hanya menemukan ' + ditemukan.length
      + ' SVG karakter padahal ' + dijaga.size + ' sudah dijaga — '
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
    /* '//' hanya dianggap komentar kalau ia berdiri di awal baris atau sesudah spasi,
       ';', '{', atau '}' — BUKAN sesudah "sembarang yang bukan titik dua" (temuan
       gitar-bot, PR #396). Versi pertama memakai [^:] untuk melindungi '://', dan itu
       melindunginya, tapi kutip pembuka juga cocok dengan [^:]: pada
       src="//cdn.host/assets/brand/mascot/paw-mascot-hello.svg" tanda " itu dibaca
       sebagai pendahulu komentar, seluruh sisa barisnya dibuang, dan jalur utangnya
       LENYAP dari yang dipindai. Akibatnya kebalikan dari masalah sebelumnya dan lebih
       buruk: seni berutang yang benar-benar dikapalkan lewat URL protokol-relatif akan
       lolos HIJAU. Gerbang yang diam saat seharusnya berteriak lebih berbahaya daripada
       gerbang yang berteriak salah — yang kedua menyita waktu, yang pertama menipu.
       Diukur: baris img di atas benar-benar hilang di versi sebelumnya. */
    .replace(/(^|[\s;{}])\/\/[^\n]*/g, '$1 ');
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
  for (const f of [...SVGS, ...svgsDiDirJaga()]) {
    if (!exists(f)) { drift.push(f + ': berkas hilang'); continue; }
    const bad = offenders(read(f), f.endsWith('fiezel-paw.svg') ? MARK_INK : null);
    if (bad.length) drift.push(f + ': ' + bad.join(', '));
  }
  if (drift.length) {
    throw new Error('\n      ' + drift.join('\n      ')
      + '\n      — warna baru tidak pernah masuk lewat tes; ubah dulu G1 di spec dengan keputusan OWNER');
  }
});

/* m025-303: dua tes komponen (fiezel-mascot.js dan bagian MASKOT fiezel-motion.css)
   diangkat bersama berkasnya. Keduanya menjaga agar warna TUBUH PAW — termasuk
   confetti yang dirender komponennya — tidak pernah menyimpang dari palet tertutup
   G1. Rig itu tidak ada lagi.

   Penggantinya, features/mascot/fiezel-character.js dan fiezel-character.css,
   SENGAJA tidak dimasukkan ke gerbang ini, dan alasannya perlu terang supaya
   tidak terbaca sebagai kelalaian: keduanya nyaris tidak membawa warna sama
   sekali. Seni Nusa & Mira adalah gambar raster ber-palet storybook-flat sendiri;
   satu-satunya warna di kode adalah tinta mulut viseme dan warna moncong, dan
   warna moncong itu DIUKUR dari asetnya oleh tools/sample-muzzle.py, bukan
   ditulis tangan — dijaga tests/character-art-gate-test.js. Memaksakan palet G1
   ke atasnya berarti menuntut karakter baru memakai palet karakter lama. */

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang palet G1: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang palet G1: PASS ' + pass);
