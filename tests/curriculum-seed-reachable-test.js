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
/* Kartunya diparameterkan (satu bentuk, dua bank), jadi yang dicari bukan lagi literal
   `data-a="seed-english"` melainkan DUA hal yang bersama-sama menghasilkannya: tabel SEMAI
   yang mendeklarasikan aksinya, dan penggambar yang benar-benar memancarkan atribut itu.
   Menuntut bentuk literalnya akan memaksa duplikasi kartu — persis yang dihindari. */
tegaskan(
  /aksi:\s*'seed-english'/.test(konsol),
  'features/curriculum/teacher-console.js: tabel SEMAI tidak lagi mendeklarasikan aksi `seed-english`. Kurikulum ' +
  '144 kompetensi kembali menjadi kemampuan tanpa pintu — persis keadaan yang membuat owner menyimpulkan mata ' +
  'pelajarannya belum lengkap.'
);
tegaskan(
  /data-a="'\s*\+\s*d\.aksi\s*\+\s*'"/.test(konsol),
  'features/curriculum/teacher-console.js: penggambar kartu tidak memancarkan atribut data-a, jadi tombolnya ' +
  'tidak pernah sampai ke pengirim aksi — tombol mati yang terlihat seperti pintu.'
);
tegaskan(
  /data-testid="'\s*\+\s*d\.aksi\s*\+\s*'-btn"/.test(konsol),
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

/* PENYEMAI KEDUA: MAPEL SELAIN BAHASA INGGRIS (m025-328).

   Tuntutan yang sama persis, karena cacatnya yang sama yang sedang dijaga: backend
   punya endpointnya, klien punya pengikatnya, konsol punya kendali yang ditangani.
   Penyemai baru yang lolos tanpa ketiganya akan mengulang keadaan yang membuat 144
   kompetensi Inggris duduk di kode selama berbulan-bulan tanpa bisa dipanggil. */
const seedMapelPy = baca('backend/seed_mapel.py');
tegaskan(
  /@router\.post\("\/mapel"\)/.test(seedMapelPy),
  'backend/seed_mapel.py: rute POST /mapel hilang — penyemai mapel tidak bisa dipanggil siapa pun.'
);
tegaskan(
  /@router\.get\("\/mapel\/status"\)/.test(seedMapelPy),
  'backend/seed_mapel.py: rute GET /mapel/status hilang — konsol tidak bisa tahu banknya sudah terisi atau belum.'
);
/* MENDAFTAR, bukan sekadar MENGIMPOR. Versi pertama penegasan ini mencari
   `seed_mapel_router` di mana saja di server.py — dan itu lolos walau routernya dicabut
   dari daftar include_router, karena baris `import`-nya masih menyebut namanya. Diuji
   dengan mencabut pendaftarannya: gerbang tetap hijau. Modul yang diimpor tetapi tidak
   didaftarkan adalah rute yang tidak ada, dan itu persis kegagalan diam yang seluruh
   gerbang ini ada untuk menangkap. */
const serverPy = baca('backend/server.py');
tegaskan(
  /for r in \(([\s\S]*?)\):/.test(serverPy) && /seed_mapel_router/.test(RegExp.$1),
  'backend/server.py: router seed_mapel tidak DIDAFTARKAN di daftar include_router. Endpointnya ada di berkasnya ' +
  'tetapi tidak pernah dipasang ke aplikasi — rute yang tidak terdaftar adalah rute yang tidak ada.'
);
tegaskan(
  /mapel:\s*function[^}]*\/seed\/mapel'/.test(api) && /mapelStatus:\s*function[^}]*\/seed\/mapel\/status'/.test(api),
  'features/curriculum/fz-api.js: seed.mapel()/seed.mapelStatus() tidak memanggil rute /seed/mapel.'
);
tegaskan(
  /aksi:\s*'seed-mapel'/.test(konsol) && /a === 'seed-mapel'/.test(konsol),
  'features/curriculum/teacher-console.js: kendali `seed-mapel` tidak ada di layar atau tidak ditangani pengirim aksi.'
);
tegaskan(
  /E\.seed\.mapel\(\)/.test(konsol) && /E\.seed\.mapelStatus\(\)/.test(konsol),
  'features/curriculum/teacher-console.js: konsol tidak memanggil E.seed.mapel()/mapelStatus().'
);

/* PENYEMAI KETIGA: BANK SOAL (m025-330).

   Tuntutan pintu yang sama, plus dua tuntutan yang hanya berlaku untuk soal — dan
   keduanya menutup cara bank soal gagal MENGAJAR meski datanya masuk dengan rapi. */
const seedSoalPy = baca('backend/seed_soal.py');
tegaskan(
  /@router\.post\("\/soal"\)/.test(seedSoalPy) && /@router\.get\("\/soal\/status"\)/.test(seedSoalPy),
  'backend/seed_soal.py: rute POST /soal atau GET /soal/status hilang — bank soal tidak bisa dipanggil atau diperiksa.'
);
tegaskan(
  /for r in \(([\s\S]*?)\):/.test(serverPy) && /seed_soal_router/.test(RegExp.$1),
  'backend/server.py: router seed_soal tidak DIDAFTARKAN di daftar include_router.'
);
tegaskan(
  /soal:\s*function[^}]*\/seed\/soal'/.test(api) && /soalStatus:\s*function[^}]*\/seed\/soal\/status'/.test(api),
  'features/curriculum/fz-api.js: seed.soal()/seed.soalStatus() tidak memanggil rute /seed/soal.'
);
tegaskan(
  /aksi:\s*'seed-soal'/.test(konsol) && /a === 'seed-soal'/.test(konsol),
  'features/curriculum/teacher-console.js: kendali `seed-soal` tidak ada di layar atau tidak ditangani pengirim aksi.'
);

/* SOAL YATIM. Butir yang menunjuk kompetensi yang tidak ada akan masuk basis data,
   tidak pernah terambil sesi mana pun, dan TIDAK ADA satu gerbang pun yang merah
   karenanya — penyemainya sukses, jumlahnya bertambah, dan murid tidak pernah melihatnya.
   Karena itu penyemai WAJIB memeriksa keberadaan kompetensinya lebih dulu dan MELAPORKAN
   yang hilang, bukan menulis diam-diam. */
tegaskan(
  /curriculum_nodes\.find_one\(\{"id": komp_id, "type": "competency"\}/.test(seedSoalPy) &&
  /missing_competencies/.test(seedSoalPy),
  'backend/seed_soal.py: penyemai tidak memeriksa keberadaan kompetensi sebelum menulis soal, atau tidak ' +
  'melaporkan yang hilang. Soal yatim masuk basis data tanpa pernah terambil sesi mana pun, dan tidak ada ' +
  'gerbang yang bisa melihatnya.'
);

/* TIAP BUTIR WAJIB PUNYA PEMBAHASAN DAN PETUNJUK. Soal tanpa pembahasan hanya memberi
   tahu murid bahwa ia salah — tepat pada saat ia paling siap belajar. Diperiksa di sini
   karena validator backend hanya MEMPERINGATKAN (warn), tidak menolak: peringatan yang
   tidak ada yang membacanya sama dengan tidak ada aturan. */
{
  const butir = [...seedSoalPy.matchAll(/\n\s{8}Q\(/g)].length;
  tegaskan(butir >= 40, 'backend/seed_soal.py: hanya ' + butir + ' butir soal — gelombang pertama terlalu tipis untuk dipakai satu sesi belajar.');
  const tanpaPembahasan = [...seedSoalPy.matchAll(/Q\("(?:[^"\\]|\\.)*",\s*\n?\s*\[[^\]]*\],\s*"[A-D]",\s*\n\s*""/g)].length;
  tegaskan(tanpaPembahasan === 0, 'backend/seed_soal.py: ada butir tanpa pembahasan — murid yang salah tidak mendapat apa pun.');

  /* DUA OPSI YANG TERBACA SAMA OLEH MURID ADALAH SATU OPSI, DAN TEBAKANNYA JADI 1 DARI 3.

     Yang dijaga di sini bukan "opsi yang berbeda tanda baca". Itu justru yang BOLEH:
     pada soal mekanika bedanya apostrof, pada soal bilangan bulat bedanya tanda minus,
     pada soal geometri bedanya satuan cm vs cm². Semua itu terlihat murid, dan justru
     itulah yang diuji.

     Yang tidak boleh adalah dua opsi yang benar-benar sama di layar — beda kapital atau
     beda jumlah spasi saja. Murid melihat empat pilihan, tetapi dua di antaranya satu
     pilihan yang sama, jadi peluang menebak benar naik tanpa penguasaan naik.

     Batas ini MENCERMINKAN backend, tidak menebaknya: questions.py memakai norm_option()
     untuk menandai `duplicate_options`, dan norm_option() sengaja hanya menyamakan
     kapital dan spasi. Pernah dipakai norm_stem() di sana — yang membuang seluruh tanda
     baca — dan akibatnya setiap pengecoh matematika yang benar (5 vs -5, x - 7 vs x + 7)
     dilaporkan sebagai opsi identik. Dua pemeriksaan di bawah menjaga keduanya tetap satu
     aturan: isinya, dan sumber aturannya. */
  const normOpsi = (x) => x.toLowerCase().replace(/\s+/g, ' ').trim();
  const blokOpsi = [...seedSoalPy.matchAll(/\n\s{10}\[((?:[^\][]|\[[^\]]*\])*)\],\s*"[A-D]"/g)];
  const opsiTabrakan = [];
  for (const m of blokOpsi) {
    const opsi = [...m[1].matchAll(/(['"])((?:\\.|(?!\1)[^\\])*)\1/g)].map((o) => normOpsi(o[2]));
    if (opsi.length >= 2 && new Set(opsi).size !== opsi.length) opsiTabrakan.push(opsi[0].slice(0, 45));
  }
  tegaskan(
    opsiTabrakan.length === 0,
    'backend/seed_soal.py: ' + opsiTabrakan.length + ' butir punya dua opsi yang terbaca SAMA oleh murid ' +
    '(' + opsiTabrakan.slice(0, 2).join(' | ') + '). Opsi yang hanya berbeda kapital atau jumlah spasi adalah ' +
    'satu pilihan yang ditulis dua kali: murid melihat empat, sebenarnya memilih dari tiga.'
  );

  const questionsPy = baca('backend/questions.py');
  tegaskan(
    /opts\s*=\s*\[norm_option\(/.test(questionsPy),
    'backend/questions.py: pemeriksaan `duplicate_options` tidak lagi memakai norm_option(). Kalau ia kembali ' +
    'ke norm_stem(), setiap pengecoh matematika yang benar (5 vs -5, x - 7 vs x + 7) dilaporkan sebagai opsi ' +
    'identik, dan gerbang ini diam-diam menjaga aturan yang berbeda dari yang dijalankan backend.'
  );
  const badanNormOption = (questionsPy.match(/def norm_option[\s\S]*?\n    return ([^\n]+)/) || [])[1] || '';
  tegaskan(
    badanNormOption !== '' && !/\[\^a-z0-9/.test(badanNormOption),
    'backend/questions.py: norm_option() ikut membuang karakter non-alfanumerik. Itu mengembalikan cacat yang ' +
    'sama lewat pintu lain — tanda minus, tanda kurung, dan satuan pangkat adalah ISI jawaban matematika, ' +
    'bukan hiasan yang boleh dinormalisasi.'
  );

  /* STEM KEMBAR ADALAH BUTIR YANG HILANG DIAM-DIAM.
     Penyemai membuang duplikat berdasarkan `stem`, jadi dua kompetensi yang memakai stem
     yang sama menghasilkan SATU butir saja — dan kompetensi kedua kehilangan soalnya
     tanpa satu pun galat, tanpa satu pun gerbang merah. Terjadi sungguhan pada gelombang
     2: "Choose the correct sentence." dipakai di Kelas 7 dan Kelas 8 sekaligus, dan butir
     Kelas 8 tidak pernah masuk basis data. Ditemukan hanya karena penyemainya dijalankan
     dan jumlah yang masuk dibandingkan dengan jumlah di tabel. */
  const normStemSoal = (x) => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const stems = [...seedSoalPy.matchAll(/\n\s{8}Q\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
  const ganda = stems.filter((x, i) => stems.indexOf(x) !== i);
  tegaskan(
    ganda.length === 0,
    'backend/seed_soal.py: ada stem kembar (' + [...new Set(ganda)].slice(0, 3).join(' | ') + '). Penyemai membuang ' +
    'duplikat berdasarkan stem, jadi butir kedua TIDAK PERNAH masuk basis data dan kompetensinya kehilangan soal ' +
    'tanpa satu pun galat. Tulis stem yang khas per butir.'
  );

  /* BANK CONTOH DAN BANK ISI TIDAK BOLEH MENULIS SOAL YANG SAMA.

     seed.py membawa 21 soal demo di kompetensi demo (KOMP-BIL-*, KOMP-ENG-*). Kalau
     seed_soal.py menulis soal yang stem-nya sama sesudah norm_stem(), backend menandainya
     `duplicate_question` — dan benar: satu soal yang sama duduk di dua kompetensi, jadi
     murid yang sudah mengerjakannya di satu tempat mengerjakannya lagi di tempat lain
     seolah materi baru. Terjadi sungguhan pada gelombang 9: "Hitunglah: -7 + 12" dan
     "Hitunglah: 8 - (-5)" sudah ada di bank demo, hanya beda titik dua. */
  const stemDemo = new Set(
    [...baca('backend/seed.py').matchAll(/stem="((?:[^"\\]|\\.)*)"/g)].map((m) => normStemSoal(m[1])));
  const bentrokDemo = [...new Set(stems.map(normStemSoal).filter((x) => stemDemo.has(x)))];
  tegaskan(
    bentrokDemo.length === 0,
    'backend/seed_soal.py: ' + bentrokDemo.length + ' stem sudah ada di bank demo seed.py (' +
    bentrokDemo.slice(0, 2).join(' | ') + '). Backend menandainya duplicate_question, dan soal yang sama di dua ' +
    'kompetensi membuat murid mengerjakan ulang hal yang sama seolah materi baru.'
  );
}

/* SESUDAH MENYEMAI, BANK YANG BARU HARUS TERLIHAT DI TEMPAT GURU MEMAKAINYA.

   Temuan gitar-bot pada PR #433, dan ia benar: versi pertama penangan ini mengosongkan
   S.tps/S.comps lalu menggambar ulang. Tetapi `tree` dan `health` punya pemuat malas di
   vCurriculum sementara `tps`/`comps` TIDAK — satu-satunya yang mengisinya adalah
   loadContext() saat boot. Jadi sesudah menyemai, pilihan TP dan kompetensi di Kopilot
   dan Asesmen kosong sampai halaman dimuat ulang: 72 TP dan 144 kompetensi yang baru
   tiba tidak terlihat justru di tempat guru akan memakainya.

   Cacat itu MENIADAKAN guna tombolnya sambil tetap terlihat berhasil (toast hijau, status
   berubah "sudah tersemai"). Karena itu ia dikunci di sini, bukan sekadar diperbaiki. */
tegaskan(
  /S\[d\.st\] = st[\s\S]{0,900}?loadContext\(\)\.then\(render\)/.test(konsol),
  'features/curriculum/teacher-console.js: penangan `seed-english` tidak memanggil ulang loadContext() sesudah ' +
  'menyemai. S.tps/S.comps hanya diisi loadContext() — tanpa itu pilihan TP dan kompetensi di Kopilot dan Asesmen ' +
  'kosong sampai halaman dimuat ulang, dan kurikulum yang baru disemai tidak terlihat di tempat ia dipakai.'
);

if (gagal.length) {
  console.error('MERAH curriculum-seed-reachable (' + gagal.length + '):');
  for (const g of gagal) console.error('  - ' + g);
  process.exit(1);
}
console.log('OK curriculum-seed-reachable: ' + lulus + ' penegasan — backend, klien, dan konsol tersambung.');
