/**
 * tests/curriculum-seed-reachable-test.js — KEMAMPUAN YANG TIDAK PUNYA PINTU
 * BUKAN KEMAMPUAN.
 *
 * ==========================================================================
 * KEJADIAN YANG MELAHIRKAN GERBANG INI (m025-327)
 * ==========================================================================
 * Owner membuka konsol kurikulum, melihat dua mata pelajaran dengan satu elemen
 * masing-masing, lalu berkata: "sepertinya mata pelajarannya juga belum lengkap."
 *
 * Ia benar tentang yang dilihatnya, dan salah tentang sebabnya — dan salahnya itu
 * bukan salahnya. Kurikulum Merdeka Bahasa Inggris UTUH sudah ada di repo sejak lama:
 * `backend/seed_english.py` membangun Fase A–F, Kelas 1–12, 3 elemen resmi, 72 tujuan
 * pembelajaran, 144 kompetensi, plus materi ajar dan prasyarat yang dirantai antar
 * kelas. Endpointnya pun ada: `POST /api/seed/english`.
 *
 * Yang tidak pernah ada adalah PEMANGGILNYA. Nol antarmuka di seluruh klien menyentuh
 * endpoint itu, jadi satu-satunya kurikulum yang pernah mendarat di MongoDB adalah
 * demo Matematika 11 kompetensi yang dijalankan otomatis oleh `/seed/bootstrap`.
 * Kurikulum lengkapnya duduk di kode, benar dan teruji, tanpa satu pun jalan untuk
 * memintanya.
 *
 * Ini kelas cacat yang SUDAH pernah menghantam repo ini, dan itulah sebabnya ia
 * pantas dijaga: token `FZG-` dulu juga begitu — konsol menuntutnya, dan tidak ada
 * satu pun antarmuka yang bisa menerbitkannya (PR #428). Bentuknya sama persis:
 * kemampuan yang lengkap di satu sisi, nol jalan dari sisi yang lain.
 *
 * ==========================================================================
 * YANG DITUNTUT GERBANG INI
 * ==========================================================================
 * Tiga lapis, dan ketiganya harus ada bersama — dua dari tiga berarti pintu yang
 * berhenti di tengah jalan:
 *
 *   (A) BACKEND punya endpointnya.
 *   (B) KLIEN punya pengikatnya (FZEngine.seed).
 *   (C) KONSOL punya kendali yang benar-benar bisa ditekan guru, DAN pengirim
 *       aksinya menangani kendali itu. Tombol tanpa penangan adalah tombol mati,
 *       dan itu persis jenis kebohongan yang gerbang ini ada untuk mencegah.
 */

const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');

let lulus = 0;
const gagal = [];
function tegaskan(syarat, pesan) {
  if (syarat) { lulus += 1; return; }
  gagal.push(pesan);
}

/* ---------- (A) backend: endpointnya ada ---------- */
const seedPy = baca('backend/seed_english.py');
tegaskan(
  /@router\.post\("\/english"\)/.test(seedPy),
  'backend/seed_english.py: rute POST /english hilang — penyemai kurikulum tidak bisa dipanggil siapa pun.'
);
tegaskan(
  /@router\.get\("\/english\/status"\)/.test(seedPy),
  'backend/seed_english.py: rute GET /english/status hilang — konsol tidak bisa tahu banknya sudah terisi atau belum, ' +
  'jadi tombolnya hanya bisa menebak.'
);

/* ---------- (B) klien: pengikatnya ada ---------- */
const api = baca('features/curriculum/fz-api.js');
tegaskan(
  /seed:\s*\{/.test(api),
  'features/curriculum/fz-api.js: FZEngine tidak lagi mengekspor `seed` — konsol kehilangan satu-satunya jalan ' +
  'memanggil penyemai kurikulum.'
);
tegaskan(
  /english:\s*function[^}]*\/seed\/english'/.test(api),
  'features/curriculum/fz-api.js: seed.english() tidak memanggil /seed/english.'
);
tegaskan(
  /englishStatus:\s*function[^}]*\/seed\/english\/status'/.test(api),
  'features/curriculum/fz-api.js: seed.englishStatus() tidak memanggil /seed/english/status.'
);

/* ---------- (C) konsol: kendalinya ADA dan HIDUP ---------- */
const konsol = baca('features/curriculum/teacher-console.js');
tegaskan(
  /data-a="seed-english"/.test(konsol),
  'features/curriculum/teacher-console.js: tidak ada kendali `seed-english` di layar. Kurikulum 144 kompetensi ' +
  'kembali menjadi kemampuan tanpa pintu — persis keadaan yang membuat owner menyimpulkan mata pelajarannya belum lengkap.'
);
tegaskan(
  /data-testid="seed-english-btn"/.test(konsol),
  'features/curriculum/teacher-console.js: tombol semai kehilangan data-testid, jadi tidak bisa dipegang uji peramban.'
);
tegaskan(
  /a === 'seed-english'/.test(konsol),
  'features/curriculum/teacher-console.js: pengirim aksi tidak menangani `seed-english`. Tombol yang tidak ditangani ' +
  'adalah tombol mati — ia terlihat seperti pintu dan tidak membuka apa pun.'
);
tegaskan(
  /E\.seed\.english\(\)/.test(konsol),
  'features/curriculum/teacher-console.js: penangan `seed-english` tidak memanggil E.seed.english().'
);

/* Statusnya WAJIB dibaca sebelum tombolnya digambar. Tanpa itu guru menekan tombol yang
   tidak tahu apa-apa tentang banknya sendiri, dan tidak punya cara membedakan "berhasil"
   dari "memang sudah terisi sejak tadi". */
tegaskan(
  /E\.seed\.englishStatus\(\)/.test(konsol),
  'features/curriculum/teacher-console.js: konsol tidak pernah membaca status bank kurikulum, jadi tombolnya ' +
  'tidak bisa jujur tentang keadaan sebelum dan sesudah.'
);

if (gagal.length) {
  console.error('MERAH curriculum-seed-reachable (' + gagal.length + '):');
  for (const g of gagal) console.error('  - ' + g);
  process.exit(1);
}
console.log('OK curriculum-seed-reachable: ' + lulus + ' penegasan — backend, klien, dan konsol tersambung.');
