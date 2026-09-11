#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL PAW — pustaka SISTEM KARAKTER MEREK (prop, badge, adegan)
 * ============================================================
 *
 * Apa yang ADA di sini, dan apa yang TIDAK.
 *
 * TIDAK ada di sini: bentuk tubuh PAW. Satu-satunya sumber bentuk karakter
 * tetap `features/mascot/fiezel-mascot.js` (aturan E5/G11), dibaca lewat
 * `tools/lib/mascot-rig.mjs`. Berkas ini tidak pernah menggambar mata, telinga,
 * atau ekor — ia hanya MENYUSUN karakter yang sudah ada ke dalam bingkai.
 *
 * ADA di sini: tiga hal yang memang belum punya sumber di repo —
 *   1. PROP  — benda yang dipegang/didampingi PAW (buku, pensil, lampu, …).
 *   2. BADGE — lambang telapak kaki sebagai lencana. Glyph-nya BUKAN gambar
 *              baru: ia disalin apa adanya dari assets/brand/fiezel-paw.svg
 *              saat ekspor, jadi geometrinya mustahil menyimpang.
 *   3. ADEGAN — komposisi (pose + prop + badge + bidang) untuk kit ilustrasi
 *              UI: keadaan kosong, berhasil, galat, onboarding, pemasaran.
 *
 * BAHASA BENTUK (dijaga tests/character-system-gate-test.js):
 *   - Palet TERTUTUP G1. Tidak ada warna ke-sepuluh, tidak ada gradien,
 *     tidak ada tekstur, tidak ada filter.
 *   - Isian datar + sudut membulat. Karakter PAW sendiri TIDAK berkontur —
 *     itu bahasa bentuknya sejak awal — jadi prop pun tidak berkontur, supaya
 *     prop dan karakter terbaca sebagai satu semesta. Kontur tebal yang lazim
 *     di maskot SaaS lain SENGAJA tidak dipakai: memberi kontur pada PAW
 *     berarti mengubah identitasnya, dan itu keputusan OWNER, bukan keputusan
 *     berkas ini.
 *   - Setiap prop hidup di kotak 100×100 pada titik asalnya sendiri, sehingga
 *     adegan bisa menempatkannya dengan translate+scale tanpa menghitung ulang.
 *   - Setiap prop punya `class="fz-prop fz-prop-<nama>"` supaya bisa dianimasi
 *     terpisah (Lottie/Rive) tanpa menyentuh rig.
 * ============================================================
 */
'use strict';

/* Palet G1 — dinamai, supaya definisi prop terbaca sebagai keputusan warna,
   bukan sebagai deretan hex. Nilainya WAJIB cermin tests/palette-gate-test.js. */
export const C = {
  kuning:  '#FFD94F',
  emas:    '#EDB93A',
  krem:    '#FFF4DA',
  marun:   '#8C2233',
  tinta:   '#33201F',
  merona:  '#F0A0AC',
  tan:     '#D8B36B',
  merah:   '#D9536A',
  biru:    '#9CC7E8',
};

/* ============================================================
   1. PUSTAKA PROP — 12 benda, kotak 100×100, isian datar
   ============================================================
   Setiap entri: { label, body } — `body` adalah markup anak (tanpa <svg>),
   `label` dipakai sebagai aria-label saat prop diekspor berdiri sendiri. */
export const PROPS = {
  buku: {
    label: 'buku terbuka',
    body: `
      <path d="M50 28C37 19 22 16 6 21v62c16-5 31-2 44 7Z" fill="${C.tan}"/>
      <path d="M50 28c13-9 28-12 44-7v62c-16-5-31-2-44 7Z" fill="${C.tan}"/>
      <path d="M50 34C38 26 25 23 11 27v50c14-4 27-1 39 7Z" fill="#fff"/>
      <path d="M50 34c12-8 25-11 39-7v50c-14-4-27-1-39 7Z" fill="#fff"/>
      <rect x="45" y="28" width="10" height="62" rx="5" fill="${C.marun}"/>
      <rect x="18" y="48" width="22" height="5" rx="2.5" fill="${C.tan}"/>
      <rect x="18" y="60" width="15" height="5" rx="2.5" fill="${C.tan}"/>
      <rect x="60" y="48" width="22" height="5" rx="2.5" fill="${C.tan}"/>
      <rect x="60" y="60" width="15" height="5" rx="2.5" fill="${C.tan}"/>`,
  },
  pensil: {
    label: 'pensil',
    body: `
      <rect x="38" y="10" width="24" height="64" rx="12" fill="${C.kuning}"/>
      <rect x="38" y="10" width="24" height="16" rx="12" fill="${C.merona}"/>
      <rect x="38" y="24" width="24" height="6" fill="${C.emas}"/>
      <path d="M38 66h24l-12 24Z" fill="${C.tan}"/>
      <path d="M43.6 78h12.8L50 90Z" fill="${C.tinta}"/>`,
  },
  lampu: {
    label: 'lampu ide',
    body: `
      <circle cx="50" cy="44" r="28" fill="${C.kuning}"/>
      <circle cx="40" cy="35" r="9" fill="#fff" opacity=".75"/>
      <rect x="36" y="70" width="28" height="9" rx="4.5" fill="${C.tan}"/>
      <rect x="36" y="83" width="28" height="9" rx="4.5" fill="${C.tan}"/>
      <rect x="45" y="0" width="10" height="14" rx="5" fill="${C.emas}"/>
      <rect x="10" y="12" width="10" height="16" rx="5" fill="${C.emas}" transform="rotate(-38 15 20)"/>
      <rect x="80" y="12" width="10" height="16" rx="5" fill="${C.emas}" transform="rotate(38 85 20)"/>`,
  },
  bintang: {
    label: 'bintang',
    body: `
      <path d="M50 6c3 0 6 2 7 6l8 21 22 2c7 1 9 9 4 14l-17 15 5 22c1 7-6 12-12 8l-17-11-17 11c-6 4-13-1-12-8l5-22-17-15c-5-5-3-13 4-14l22-2 8-21c1-4 4-6 7-6Z" fill="${C.kuning}"/>
      <path d="M50 22c1 0 2 1 3 4l4 12-10 5-10-5 4-12c1-3 2-4 3-4Z" fill="#fff" opacity=".7"/>`,
  },
  piala: {
    label: 'piala',
    body: `
      <path d="M24 10h52v26c0 16-12 28-26 28S24 52 24 36Z" fill="${C.kuning}"/>
      <path d="M24 18H12c0 16 7 23 16 24Z" fill="${C.emas}"/>
      <path d="M76 18h12c0 16-7 23-16 24Z" fill="${C.emas}"/>
      <rect x="42" y="62" width="16" height="16" rx="8" fill="${C.emas}"/>
      <rect x="22" y="78" width="56" height="14" rx="7" fill="${C.tan}"/>
      <circle cx="50" cy="32" r="11" fill="#fff" opacity=".8"/>`,
  },
  gelembung: {
    label: 'gelembung percakapan',
    body: `
      <rect x="4" y="10" width="92" height="62" rx="26" fill="${C.tan}"/>
      <path d="M28 64h28l-20 28Z" fill="${C.tan}"/>
      <rect x="9" y="15" width="82" height="52" rx="21" fill="#fff"/>
      <path d="M31 60h20l-14 21Z" fill="#fff"/>
      <circle cx="32" cy="41" r="7" fill="${C.tan}"/>
      <circle cx="50" cy="41" r="7" fill="${C.tan}"/>
      <circle cx="68" cy="41" r="7" fill="${C.tan}"/>`,
  },
  tanya: {
    label: 'tanda tanya',
    body: `
      <circle cx="50" cy="50" r="46" fill="${C.kuning}"/>
      <path d="M50 20c-13 0-22 9-22 20h15c0-4 3-7 7-7s7 3 7 7c0 6-13 9-13 20v3h14v-2c0-8 14-11 14-23 0-11-9-18-22-18Z" fill="${C.marun}"/>
      <circle cx="50" cy="74" r="7" fill="${C.marun}"/>`,
  },
  kaca: {
    label: 'kaca pembesar',
    body: `
      <rect x="56" y="58" width="40" height="16" rx="8" fill="${C.tan}" transform="rotate(42 56 58)"/>
      <circle cx="40" cy="40" r="34" fill="${C.emas}"/>
      <circle cx="40" cy="40" r="25" fill="${C.biru}"/>
      <circle cx="31" cy="31" r="8" fill="#fff" opacity=".8"/>`,
  },
  awan: {
    label: 'awan terputus',
    body: `
      <path d="M27 72c-13 0-23-10-23-21S14 30 27 30c3-14 15-24 30-24 16 0 29 12 30 28 9 2 15 11 15 20 0 11-9 18-21 18Z" fill="${C.tan}"/>
      <path d="M29 66c-11 0-19-8-19-17s8-17 19-17c3-12 13-21 25-21 14 0 25 10 26 24 7 2 13 9 13 17 0 9-8 14-18 14Z" fill="#fff"/>
      <rect x="20" y="80" width="16" height="9" rx="4.5" fill="${C.tan}"/>
      <rect x="42" y="80" width="16" height="9" rx="4.5" fill="${C.tan}"/>
      <rect x="64" y="80" width="16" height="9" rx="4.5" fill="${C.tan}"/>`,
  },
  hati: {
    label: 'hati',
    body: `
      <path d="M50 88C18 68 8 52 8 36 8 21 19 11 33 11c8 0 15 4 17 10 2-6 9-10 17-10 14 0 25 10 25 25 0 16-10 32-42 52Z" fill="${C.merona}"/>
      <path d="M28 24c-7 0-12 5-12 12h9c0-5 3-8 7-8Z" fill="#fff" opacity=".85"/>`,
  },
  jam: {
    label: 'jam',
    body: `
      <circle cx="50" cy="54" r="40" fill="${C.emas}"/>
      <circle cx="50" cy="54" r="32" fill="#fff"/>
      <rect x="46" y="28" width="8" height="30" rx="4" fill="${C.marun}"/>
      <rect x="50" y="50" width="24" height="8" rx="4" fill="${C.marun}"/>
      <circle cx="50" cy="54" r="5.5" fill="${C.tinta}"/>
      <rect x="41" y="2" width="18" height="10" rx="5" fill="${C.tan}"/>`,
  },
  centang: {
    label: 'tanda centang',
    body: `
      <circle cx="50" cy="50" r="46" fill="${C.kuning}"/>
      <path d="M28 52 L44 68 L74 34" stroke="${C.marun}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  },
};

/* ============================================================
   2. BADGE TELAPAK — lencana dari assets/brand/fiezel-paw.svg
   ============================================================
   `glyph` disuntikkan saat ekspor (teks mentah dari berkas merek), jadi tidak
   ada satu koordinat pun yang ditulis ulang di sini. Kotak badge 96×96; glyph
   24×24 diskala 2.4 lalu dipusatkan — angka yang sama untuk SEMUA varian,
   supaya lencana bertumpuk presisi di Figma. */
export const BADGE_SCALE = 2.4;
export const BADGE_BOX = 96;

export const BADGES = {
  solid: {
    label: 'Lencana telapak FIEZEL — padat',
    bg: `<circle cx="48" cy="48" r="46" fill="${C.marun}"/>`,
    ink: C.krem,
  },
  ring: {
    label: 'Lencana telapak FIEZEL — cincin',
    bg: `<circle cx="48" cy="48" r="46" fill="${C.krem}"/>`
      + `<circle cx="48" cy="48" r="41" fill="none" stroke="${C.marun}" stroke-width="6"/>`,
    ink: C.marun,
  },
  emas: {
    label: 'Lencana telapak FIEZEL — emas',
    bg: `<circle cx="48" cy="48" r="46" fill="${C.kuning}"/>`
      + `<path d="M48 94a46 46 0 0 0 45-37 46 46 0 0 1-90 0 46 46 0 0 0 45 37Z" fill="${C.emas}"/>`,
    ink: C.tinta,
  },
  mono: {
    label: 'Lencana telapak FIEZEL — satu tinta',
    bg: `<circle cx="48" cy="48" r="43" fill="none" stroke="${C.tinta}" stroke-width="6"/>`,
    ink: C.tinta,
  },
};

/* ============================================================
   3. KIT ILUSTRASI — adegan UI
   ============================================================
   Bingkai adegan 480×360. Field:
     id     — nama berkas & kunci manifest
     grup   — empty | success | error | onboarding | marketing
     label  — aria-label (Indonesia; padanan Thai hidup di copy-map i18n,
              bukan di dalam SVG — aturan dua bahasa CLAUDE.md)
     pose   — nama pose/ekspresi dari rig (POSES lebih dulu, lalu EXPRESSIONS)
     prop   — { nama, x, y, s } atau null. Kotak prop 100x100 ditempatkan
              rata-kanan dengan selokan 16 px dan dipusatkan pada y=186,
              sehingga seluruh kit punya kolom prop yang sama persis dan
              prop tidak pernah bertabrakan dengan badge di pojok (y<=84).
     badge  — varian badge atau null; selalu di pojok, tidak pernah menutup PAW
     bidang — 'pastel' (elips tanah krem) atau 'polos'
   PAW selalu berdiri di poros yang sama (pusat-bawah bingkai) supaya seluruh
   kit terbaca sebagai satu karakter yang sama, bukan dua belas gambar lepas. */
export const SCENES = [
  { id: 'empty-belum-ada-pelajaran', grup: 'empty', pose: 'looking',
    label: 'PAW melihat rak pelajaran yang masih kosong',
    prop: { nama: 'buku', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
  { id: 'empty-belum-ada-teman', grup: 'empty', pose: 'waving',
    label: 'PAW melambai di ruang teman yang masih kosong',
    prop: { nama: 'gelembung', x: 308.0, y: 108.0, s: 1.56 }, badge: 'ring', bidang: 'pastel' },
  { id: 'empty-pencarian-kosong', grup: 'empty', pose: 'curious',
    label: 'PAW mencari dengan kaca pembesar dan tidak menemukan apa pun',
    prop: { nama: 'kaca', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
  { id: 'empty-luring', grup: 'empty', pose: 'calm',
    label: 'PAW menunggu sambungan kembali',
    prop: { nama: 'awan', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },

  { id: 'success-pelajaran-selesai', grup: 'success', pose: 'celebrating',
    label: 'PAW merayakan pelajaran yang selesai',
    prop: { nama: 'piala', x: 286.0, y: 97.0, s: 1.78 }, badge: 'emas', bidang: 'pastel' },
  { id: 'success-runtun-terjaga', grup: 'success', pose: 'proud',
    label: 'PAW bangga runtun belajarnya terjaga',
    prop: { nama: 'bintang', x: 294.0, y: 101.0, s: 1.7 }, badge: 'emas', bidang: 'pastel' },
  { id: 'success-jawaban-benar', grup: 'success', pose: 'excited',
    label: 'PAW gembira atas jawaban yang benar',
    prop: { nama: 'centang', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },

  { id: 'error-ada-yang-salah', grup: 'error', pose: 'confused',
    label: 'PAW bingung karena ada yang tidak beres',
    prop: { nama: 'tanya', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
  { id: 'error-sambungan-putus', grup: 'error', pose: 'concern',
    label: 'PAW cemas karena sambungan terputus',
    prop: { nama: 'awan', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
  { id: 'error-waktu-habis', grup: 'error', pose: 'surprised',
    label: 'PAW terkejut karena waktunya habis',
    prop: { nama: 'jam', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },

  { id: 'onboarding-selamat-datang', grup: 'onboarding', pose: 'welcoming',
    label: 'PAW menyambut murid baru',
    prop: { nama: 'hati', x: 311.0, y: 109.5, s: 1.53 }, badge: 'solid', bidang: 'pastel' },
  { id: 'onboarding-pilih-bahasa', grup: 'onboarding', pose: 'pointing',
    label: 'PAW menunjuk pilihan bahasa',
    prop: { nama: 'gelembung', x: 303.0, y: 105.5, s: 1.61 }, badge: null, bidang: 'pastel' },
  { id: 'onboarding-pilih-tujuan', grup: 'onboarding', pose: 'encouraging',
    label: 'PAW menyemangati murid memilih tujuan belajar',
    prop: { nama: 'lampu', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
  { id: 'onboarding-mulai-belajar', grup: 'onboarding', pose: 'reading',
    label: 'PAW membuka pelajaran pertama',
    prop: { nama: 'buku', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },

  { id: 'marketing-pahlawan', grup: 'marketing', pose: 'presenting',
    label: 'PAW menyapa — ilustrasi utama FIEZEL',
    prop: { nama: 'bintang', x: 328.0, y: 118.0, s: 1.36 }, badge: 'solid', bidang: 'pastel' },
  { id: 'marketing-kartu-bagikan', grup: 'marketing', pose: 'happy',
    label: 'PAW pada kartu bagikan FIEZEL',
    prop: { nama: 'piala', x: 320.0, y: 114.0, s: 1.44 }, badge: 'emas', bidang: 'pastel' },
  { id: 'marketing-belajar-tiap-hari', grup: 'marketing', pose: 'studying',
    label: 'PAW belajar setiap hari',
    prop: { nama: 'pensil', x: 294.0, y: 101.0, s: 1.7 }, badge: null, bidang: 'pastel' },
];
