/* Menulis semua artboard .dc.html + canvas.json, lalu memeriksa kontras teks.

   Halaman "Pilihan arah" berisi empat arah desain yang sedang dipilih owner.
   Halaman berikutnya adalah rancangan lengkap versi pertama, disimpan sebagai
   pembanding sampai satu arah dipilih.

   Landing page website SENGAJA TIDAK ADA di sini — owner meminta redesain
   dibatasi ke aplikasi saja. */
import { writeFileSync } from 'node:fs';
import { T, DOM } from './kit.mjs';
import * as A from './screens-1-auth.mjs';
import * as B from './screens-2-app.mjs';
import * as C from './screens-3-sesi.mjs';
import * as D from './screens-4-web.mjs';
import * as ArA from './arah-a.mjs';
import * as ArB from './arah-b.mjs';
import * as ArC from './arah-c.mjs';
import * as ArD from './arah-d.mjs';

const PH = { w: 390, h: 844 };
const AUTH = A.AUTH_SIZE;

const ARAH = [
  ['A', ArA], ['B', ArB], ['C', ArC], ['D', ArD]
];
const LAYAR = ['Home', 'Latihan', 'Soal'];

/* file, pembuat, halaman, ukuran */
const ART = [];
for (const [kode, mod] of ARAH) {
  for (const l of LAYAR) ART.push(['Arah' + kode + l, mod[l], 'page-arah', PH]);
}
ART.push(
  ['Login', A.Login, 'page-auth', AUTH],
  ['Daftar', A.Daftar, 'page-auth', AUTH],
  ['Splash', A.Splash, 'page-auth', PH],
  ['Intro1', A.Intro1, 'page-auth', PH],
  ['Intro2', A.Intro2, 'page-auth', PH],
  ['Intro3', A.Intro3, 'page-auth', PH],
  ['ObNama', A.ObNama, 'page-auth', PH],
  ['ObTujuan', A.ObTujuan, 'page-auth', PH],
  ['ObTes', A.ObTes, 'page-auth', PH],
  ['ObSelesai', A.ObSelesai, 'page-auth', PH],

  ['Main', B.Main, 'page-menu', PH],
  ['MainThai', B.MainTH, 'page-menu', PH],
  ['Latihan', B.Latihan, 'page-menu', PH],
  ['KelasKu', B.KelasKu, 'page-menu', PH],
  ['Progres', B.Progres, 'page-menu', PH],
  ['Profil', B.Profil, 'page-menu', PH],
  ['Pengaturan', B.Pengaturan, 'page-menu', PH],

  ['Peta', C.Peta, 'page-sesi', PH],
  ['Soal', C.Soal, 'page-sesi', PH],
  ['Benar', C.Benar, 'page-sesi', PH],
  ['Salah', C.Salah, 'page-sesi', PH],
  ['Hasil', C.Hasil, 'page-sesi', PH],
  ['TanyaMira', C.TanyaMira, 'page-sesi', PH],

  ['Sistem', D.Sistem, 'page-sistem', D.SISTEM]
);

/* ---------- tata letak kanvas ---------- */
const GAP_X = 90, GAP_Y = 210;
const pos = {};
function deret(nama, x0, y0) {
  let x = x0;
  for (const n of nama) {
    const it = ART.find((a) => a[0] === n);
    if (!it) throw new Error('artboard tidak dikenal di tata letak: ' + n);
    pos[n] = { x, y: y0, w: it[3].w, h: it[3].h };
    x += it[3].w + GAP_X;
  }
}
/* Halaman pilihan arah: satu baris per arah. */
ARAH.forEach(([kode], i) => {
  deret(LAYAR.map((l) => 'Arah' + kode + l), 0, i * (PH.h + GAP_Y));
});
deret(['Login', 'Daftar'], 0, 0);
deret(['Splash', 'Intro1', 'Intro2', 'Intro3', 'ObNama', 'ObTujuan', 'ObTes', 'ObSelesai'],
  0, AUTH.h + 140);
deret(['Main', 'MainThai', 'Latihan', 'KelasKu', 'Progres', 'Profil', 'Pengaturan'], 0, 0);
deret(['Peta', 'Soal', 'Benar', 'Salah', 'Hasil', 'TanyaMira'], 0, 0);
deret(['Sistem'], 0, 0);

const catatanArah = {
  A: 'ARAH A — "Kartu Tebal". Kartu bergaris 2,5px dengan bayangan padat tanpa blur, '
    + 'huruf Fredoka yang membulat, warna datar terang.\nPaling ramai dan paling ramah anak. '
    + 'Cocok kalau muridnya SMP ke bawah.',
  B: 'ARAH B — "Lembut". Tidak ada garis tepi sama sekali; kedalaman datang dari bayangan '
    + 'halus dan ruang kosong. Huruf Quicksand, pastel diredam, elemen lebih sedikit per layar.'
    + '\nPaling tenang. Paling tidak melelahkan dipakai lama.',
  C: 'ARAH C — "Editorial Rimba". Hijau rimba jadi permukaan utama, bukan aksen. Judul '
    + 'berhuruf serif Lora, kartu krem bergaris rambut emas, angka besar.\nPaling dewasa — '
    + 'condong ke murid SMA dan ke guru.\nCATATAN PENTING: serif melanggar BRAND-GUIDE '
    + '("tidak ada serif") dan gerbang tests/paw-mascot-test.js. Memilih arah ini berarti '
    + 'panduan merek dan gerbangnya ikut diperbarui — keputusan owner, bukan keputusanku.',
  D: 'ARAH D — "Blok Warna". Tidak ada kartu sama sekali: layar disusun dari pita warna '
    + 'penuh dari tepi ke tepi. Huruf Archivo tebal, warna jenuh, maskot tampil besar.'
    + '\nPaling berani dan paling dekat ke referensi kedua yang kamu kirim.'
};

const canvas = {
  pages: [
    { id: 'page-arah', name: 'Pilihan arah' },
    { id: 'page-auth', name: 'Masuk & Perkenalan' },
    { id: 'page-menu', name: 'Menu utama' },
    { id: 'page-sesi', name: 'Sesi belajar' },
    { id: 'page-sistem', name: 'Sistem' }
  ],
  artboards: ART.map(([nama, , page]) => ({
    file: nama + '.dc.html', page,
    x: pos[nama].x, y: pos[nama].y, w: pos[nama].w, h: pos[nama].h
  })),
  annotations: [
    ...ARAH.map(([kode], i) => ({
      id: 'catatan-arah-' + kode.toLowerCase(), page: 'page-arah',
      x: 1500, y: i * (PH.h + GAP_Y), w: 460, text: catatanArah[kode]
    })),
    {
      id: 'catatan-maskot', page: 'page-arah', x: 0, y: -170, w: 700,
      text: 'Aturan maskot sesudah temuan "badannya bocor": maskot berdiri di panggung '
        + 'miliknya sendiri yang ukurannya mengikuti rasio aspek gambar, tanpa offset negatif, '
        + 'dan wadahnya tidak boleh lebih pendek dari panggungnya. Hiasan warna memakai '
        + 'gradasi yang meluruh, bukan bentuk padat yang dipotong wadah dan terbaca sebagai '
        + 'bercak bersudut.\nGerbang di arah-preview.mjs memeriksa tiap gambar terhadap wadah '
        + 'pemotongnya dan melaporkan sisi yang jatuh di luar. Sekarang: 12 layar, 0 bocor.'
    },
    {
      id: 'catatan-lingkup', page: 'page-auth', x: 0, y: -150, w: 560,
      text: 'Landing page website SENGAJA tidak ada di kanvas ini — redesain dibatasi ke '
        + 'aplikasi saja atas permintaan owner.\nHalaman-halaman sesudah "Pilihan arah" adalah '
        + 'rancangan lengkap versi pertama, disimpan sebagai pembanding. Begitu satu arah '
        + 'dipilih, seluruh layar dibangun ulang dalam arah itu.'
    },
    {
      id: 'catatan-dwibahasa', page: 'page-menu', x: 0, y: -150, w: 560,
      text: 'Hari ini dan Hari ini (Thai) memakai satu tata letak dengan dua bank copy, '
        + 'cerminan pasangan berkas copy-id dan copy-th di app.\nSetiap teks di semua artboard '
        + 'harus mendarat sebagai pasangan kunci ID+TH waktu diimplementasi — belum ada kunci '
        + 'yang dibuat di tahap mock ini.'
    }
  ],
  launch: { view: 'canvas', page: 'page-arah' }
};

/* ---------- kontras ---------- */
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function rasio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const cek = [
  ...Object.entries(DOM).map(([k, d]) => [`${k}: tinta pada blok`, d.ink, d.bg]),
  ['teks utama pada krem', T.ink, T.cream],
  ['teks redup pada krem', T.ink2, T.cream],
  ['teks samar pada kertas', T.ink3, T.paper],
  ['teks samar pada krem', T.ink3, T.cream],
  ['krem pada marun', T.cream, T.marun],
  ['matahari pada rimba', T.sun, T.rimba],
  ['matahari pada rimba dalam', T.sun, T.rimbaDeep],
  ['rimba dalam pada matahari', T.rimbaDeep, T.sun],
  ['ok pada ok-soft', T.ok, T.okSoft],
  ['bad pada bad-soft', T.bad, T.badSoft]
];
let gagal = 0;
for (const [nama, fg, bg] of cek) {
  const r = rasio(fg, bg);
  const tanda = r >= 4.5 ? 'AA ' : r >= 3 ? 'AA-besar' : 'KURANG';
  if (r < 4.5) gagal++;
  console.log(`  ${tanda.padEnd(9)} ${r.toFixed(2).padStart(5)}  ${nama}`);
}

/* Gagal-keras: gerbang yang cuma mencetak angka bukan gerbang. Artboard TIDAK
   ditulis kalau ada pasangan yang jatuh - perbaiki tokennya di kit.mjs dulu. */
if (gagal > 0) {
  console.error(`\nGAGAL: ${gagal} pasangan warna di bawah 4.5:1. Artboard tidak ditulis.`);
  process.exit(1);
}

/* ---------- tulis ---------- */
/* Spasi di ujung baris ditanggalkan saat menulis: `git diff --check` di gerbang
   A9/A10 menolaknya, dan template literal gampang meninggalkannya. */
const rapikan = (teks) => teks.split('\n').map((b) => b.replace(/[ \t]+$/, '')).join('\n');

for (const [nama, buat] of ART) writeFileSync(nama + '.dc.html', rapikan(buat()));
writeFileSync('canvas.json', JSON.stringify(canvas, null, 2) + '\n');
console.log(`\n${ART.length} artboard + canvas.json ditulis. ${gagal} pasangan di bawah 4.5:1.`);
