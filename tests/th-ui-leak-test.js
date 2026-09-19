#!/usr/bin/env node
/**
 * GERBANG KEBOCORAN NASKAH INDONESIA DI MODE THAI (tests/th-ui-leak-test.js) — m025-265.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * FIEZEL punya dua locale murid (id, th) dan lapisan i18n yang lengkap sejak Gelombang 2:
 * 2.205 kunci id dengan padanan th untuk semuanya. Tapi lapisan itu hanya bekerja untuk
 * kalimat yang MEMANGGILNYA. Audit m025-265 menemukan ±200 kalimat yang tidak: literal
 * Indonesia yang dicetak langsung ke DOM di app.js dan 20 modul features/*. Murid yang
 * memilih ภาษาไทย membaca kalimat itu dalam bahasa Indonesia — dan tidak ada satu pun
 * gerbang yang merah karenanya, karena tidak ada yang memeriksanya.
 *
 * Gerbang ini memeriksanya. Ia memindai app.js + features/** untuk literal berbahasa
 * Indonesia yang TIDAK lewat FiezelI18n.t()/t(kunci, fallback), lalu membandingkannya
 * dengan ANGGARAN per berkas di bawah. Angka di ALLOWLIST adalah utang yang sudah diketahui
 * dan dijelaskan; naik satu = merah.
 *
 * KENAPA ANGGARAN, BUKAN NOL:
 *   - features/quota/quota-copy.js: sejak m025-269 naskahnya SUDAH punya jalur th penuh —
 *     build() membaca copy-map `quota.copy.<kunci>.<bidang>` lebih dulu, dan tabel beku di
 *     dalam berkas ini tinggal menjadi KANON id + cadangan fail-soft saat copy-map belum
 *     termuat. Anggarannya karena itu TETAP 5: yang dihitung pemindai adalah kalimat
 *     cadangan itu, dan menghapusnya berarti menghapus jaring pengamannya.
 *   - features/quota/quota-copy.js dan features/prasasti/fiezel-prasasti-core.js adalah
 *     berkas KANON yang sha-nya dikunci id-golden-snapshot dan punya protokol th sendiri
 *     (copy-th-quota.js + CANON_TH_RULES yang menunggu penutur asli). Menyentuhnya lewat
 *     sapuan mekanis akan menembus dua gerbang sekaligus.
 *   - features/neural-voice/fiezel-cf-voice-notice.js adalah cermin naskah quota di atas.
 *   - listening-scenarios-a1/a2.js adalah KONTEN BELAJAR (pilihan jawaban komprehensi),
 *     jalur th-nya lewat sidecar listening-bank-th.json, bukan copy-map.
 *   - satu literal di app.js adalah potongan PROMPT AI (rubrik penilaian), bukan naskah UI.
 *   - beberapa berkas menyimpan naskahnya sebagai tabel copy id yang padanan th-nya hidup
 *     di naskah-th-brain.js (brain-olm.*, brain-tutor.*), jadi ia bukan kebocoran.
 *   - ZONA AUDIO (fiezel-diag-panel.js, fiezel-neural-voice-audibility-fix.js): gerbang P0
 *     tests/audio-locale-guard-test.js melarang berkas zona audio menyebut FiezelI18n SAMA
 *     SEKALI — locale yang bocor ke sana pernah ikut ter-hash ke kunci cache audio (AI-17
 *     F02). Sapuan m025-266 sempat memindahkan naskah kedua berkas ini lalu DIKEMBALIKAN
 *     ketika gerbang itu merah: pagar P0 tidak dilonggarkan demi naskah. Utangnya nyata dan
 *     tercatat di sini; jalan keluarnya adalah menyuntik label dari LUAR zona audio, bukan
 *     menambah pengecualian di audio-locale-guard.
 *
 * Turunkan angkanya saat utangnya dibayar. JANGAN menaikkannya untuk membuat gerbang hijau.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');

/* Anggaran kebocoran per berkas — lihat alasannya di kepala berkas. */
const ALLOWLIST = Object.freeze({
  /* 1 -> 3 (m025-314). Bukan naskah baru: ketiganya sudah ada di main, dan dua di antaranya
     baru terlihat setelah ID_WORDS diperlebar di commit ini. Yang dihitung: potongan prompt
     AI (rubrik penilaian, bukan naskah UI), judul 'Selesaikan ritme hari ini', dan label
     'Latihan'. Dua yang terakhir adalah utang nyata dan tercatat di §C3 laporan audit. */
  'app.js': 3,
  'features/brain/fiezel-olm.js': 1,                            // tabel copy id, padanan th di naskah-th-brain.js
  /* 3 -> 4 (m025-314): satu kalimat umpan balik tutor ('Belum ada jawaban di sesi ini.')
     ikut terlihat setelah daftar kata diperlebar. Naskahnya lama, matanya yang baru. */
  'features/brain/fiezel-tutor-brain.js': 4,
  /* 1 -> 5 (m025-314): empat label Tugas/Latihan di kartu kelas, semuanya naskah lama. */
  'features/class-hub/fiezel-class-hub.js': 5,
  'features/neural-voice/fiezel-cf-voice-notice.js': 3,         // cermin naskah kanon quota
  /* Naik 1 -> 3 (m025-271). Blok "sudah punya akun?" ikut berdiri di pemilih bahasa,
     dan alasannya sama persis dengan literal yang sudah ada di sana: pada cat PERTAMA
     belum ada locale pilihan dan copy Thai memang belum diunduh, jadi naskah layar ini
     ditulis dwibahasa secara harfiah — bukan lewat copy-map. Menaikkan anggaran di sini
     BUKAN pelonggaran diam-diam: setiap kalimat yang dihitung punya padanan Thai di
     baris yang sama, dan itulah yang membuatnya sah. */
  'features/onboarding/fiezel-onboarding.js': 3,                // pemilih bahasa + blok masuk, keduanya dwibahasa harfiah
  'features/neural-voice/fiezel-diag-panel.js': 6,              // zona audio: AI-17 F02 melarang FiezelI18n di sini
  'features/neural-voice/fiezel-neural-voice-audibility-fix.js': 2, // idem — lihat catatan ZONA AUDIO di bawah
  /* 3 -> 5 (m025-314): dua nama/keterangan prasasti ikut terlihat. Berkas KANON yang sha-nya
     dikunci id-golden-snapshot dan punya protokol th sendiri (CANON_TH_RULES), jadi ia tidak
     boleh disentuh lewat sapuan mekanis — jalurnya copy-th, bukan edit di sini. */
  'features/prasasti/fiezel-prasasti-core.js': 5,
  'features/quota/quota-copy.js': 5,                            // KANON id + cadangan; naskah th-nya sudah lewat copy-map (m025-269)
  /* KONSOL KURIKULUM MERDEKA (PR #389) — keputusan owner, 7 September 2026: kurikulum
     Indonesia tidak perlu Thai. Alasannya sama dengan entri Kurikulum Merdeka di bawah:
     guru Thai tidak mengajar di bawah Kurikulum Merdeka, jadi menerjemahkan 'Tujuan
     Pembelajaran', 'Capaian Pembelajaran', dan nama Fase resmi ke Thai bukan sia-sia
     melainkan menyesatkan.

     YANG PERLU DIKETAHUI TERUS TERANG, dan sengaja ditulis di sini supaya tidak hilang:
     learning-mission.js adalah LAYAR MURID (misi.html), bukan layar guru. Kalau kelak ada
     murid Thai yang dibukakan konsol ini, 16 kalimat itu sampai kepadanya dalam bahasa
     Indonesia. Selama kursusnya memang Kurikulum Merdeka, itu konsekuensi yang diterima
     sadar - bukan kebocoran yang terlewat.

     Angka ini menyatakan utang, bukan izin bertambah: naik satu = merah, sama seperti
     berkas lain. Jalan keluarnya, kalau FIEZEL kelak membawa kurikulum negara lain, adalah
     paket kurikulum per-negara - bukan menerjemahkan istilah regulasi Indonesia. */
  /* 19 -> 20 (m025-314): satu label gerbang masuk ikut terlihat. Alasan entri ini tidak
     berubah — konten Kurikulum Merdeka, keputusan owner 7 September 2026.

     20 -> 17 (m025-318): formulir daftar/masuk email+sandi dan tombol "Masuk dengan Google"
     dicabut bersama pintu-pintunya, jadi tiga kalimatnya ikut hilang dari layar. Ratchet
     TURUN — angka ini menyatakan utang yang tersisa, bukan jatah yang boleh dipakai. */
  'features/curriculum/learning-mission.js': 16,
  'features/curriculum/teacher-console.js': 33,                 // konsol guru Kurikulum Merdeka (turun ke 33 setelah humanisasi Beranda, Kurikulum, Asesmen & Rapor m025-336)
  /* KONTEN KURIKULUM NASIONAL INDONESIA, bukan naskah antarmuka. Empat literalnya adalah
     nama Fase resmi Kurikulum Merdeka dan dua saran pedagogis di dalam paket materinya.
     Menerjemahkannya ke Thai bukan sia-sia melainkan menyesatkan: guru Thai tidak mengajar
     di bawah Kurikulum Merdeka.

     Entri ini ada karena alternatifnya sudah dicoba dan salah. m025-283 sempat "menghijaukan"
     berkas ini dengan MENGGANTI KATANYA sampai heuristik pemindai tidak lagi mengenalinya —
     'Kelas 10' jadi 'Tingkat 10', 'Selesai' jadi 'Resolusi', 'Buat' jadi 'Gambar'. Isinya
     tetap seratus persen Indonesia; yang berubah hanya kemampuan gerbang melihatnya. Lebih
     buruk lagi, 'Fase E (SMA / SMK Kelas 10)' adalah istilah REGULASI: menulisnya 'Tingkat 10'
     membuat naskahnya salah menurut Kemendikbud demi lolos sebuah tes. Kata-katanya
     dikembalikan di m025-284 dan utangnya dinyatakan di sini, terbuka.

     Kalau FIEZEL kelak membawa kurikulum negara lain, jalannya paket kurikulum per-negara —
     bukan menerjemahkan paket Indonesia, dan bukan pula menyamarkan katanya. */
  /* 4 -> 10 (m025-290). Isi kurikulumnya bertambah dari 9 unit / 19 soal menjadi 15 unit /
     115 soal, dan pemindai menghitung penanda serta catatan pembahasan berbahasa Indonesia
     di dalam butir-butir baru itu. Alasannya sama persis dengan alasan entri ini ada:
     pembahasan soal Kurikulum Merdeka ditulis untuk guru Indonesia yang mengajar di bawah
     kurikulum Indonesia. Angka ini akan naik lagi setiap kali banknya diperdalam — itu
     bukan utang yang menumpuk, melainkan ukuran isi berkas konten nasional. */
  'features/teacher/fiezel-teacher-curriculum.js': 10,
  'features/speaking-listening/listening-scenarios-a1.js': 11,  // konten belajar, jalur th lewat sidecar
  'features/speaking-listening/listening-scenarios-a2.js': 12,  // idem
  /* UTANG BARU TERLIHAT — m025-314, 14 September 2026. Empat entri di bawah TIDAK lahir di
     gelombang ini: kalimatnya sudah ada di main sejak lama. Yang berubah adalah MATA
     gerbangnya. Audit reports/AUDIT-UI-UX-BAHASA-2026-09-14.md §C1 menunjukkan daftar
     ID_WORDS melewatkan kalimat Indonesia yang kata-katanya kebetulan tidak terdaftar, jadi
     daftarnya diperlebar di commit ini — dan pelebaran itu langsung menerangi 11 kalimat
     yang selama ini tidak terlihat siapa pun.

     Angka di bawah dinyatakan TERBUKA, bukan disembunyikan dengan mempersempit kembali
     daftarnya. Mempersempit demi hijau akan mengembalikan kebutaan yang justru baru saja
     diperbaiki, dan utang yang tidak tercatat tidak akan pernah dibayar.

     Tiga berkas pertama adalah permukaan GURU/TUTOR, dan murid Thai tidak membukanya hari
     ini. Yang keempat berbeda dan perlu disebut terus terang: fiezel-tutor-v3.js:175 adalah
     kalimat AJAR untuk MURID ("subjek, have atau has, lalu bentuk ketiga kata kerja") —
     berbahasa Indonesia, dan isinya tata bahasa Inggris, jadi ia salah dua kali di kursus
     Jepang. Itu dicatat sebagai temuan §C3 pada laporan audit, bukan sebagai sesuatu yang
     sudah beres. Turunkan angkanya saat utangnya dibayar. */
  'features/brain/fiezel-listening-adaptive.js': 3,             // alasan kebijakan adaptif, naskah lama
  'features/brain/fiezel-step-tutor.js': 1,                     // idem
  'features/class-hub/fiezel-braincore-review.js': 2,           // nama dua latihan di kartu ulasan
  'features/learner-flow/fiezel-learner-flow.js': 1,            // satu kalimat transisi sesi
  'features/learner-flow/fiezel-review-bank.js': 1,             // satu ajakan buka kartu
  'features/teacher/fiezel-teacher-shell.js': 3,                // layar guru, naskah lama (turun ke 3 setelah humanisasi modal assign)
  'features/teacher/fiezel-teacher-store.js': 3,                // idem
  'features/tutor-action-center/fiezel-tutor-action-center.js': 3, // idem
  'features/tutor-classroom/fiezel-tutor-v3.js': 1              // NASKAH AJAR MURID — lihat §C3 laporan audit
});

/* DAFTAR INI ADALAH HEURISTIK, DAN ANGKA ANGGARAN DI ATAS HARUS DIBACA BEGITU.
   "0 kebocoran" di sini berarti "0 kalimat yang cocok dengan kata-kata di bawah", bukan
   "0 kalimat Indonesia". Audit m025-314 (reports/AUDIT-UI-UX-BAHASA-2026-09-14.md §C1)
   menemukan sembilan kalimat Indonesia di jalur render Beranda dan tab Latihan yang lolos
   utuh — 'Selesaikan materi untuk memperkuat bukti kemahiran', 'Ritme Harian',
   'Latihan Singkat 3 Menit', 'Akurasi 58% · Direkomendasikan latihan 5 menit', dan
   seterusnya — karena tak satu pun katanya terdaftar. Perhatikan juga batas kata: \b
   membuat 'Selesai' TIDAK cocok dengan 'Selesaikan' dan 'Lanjut' tidak cocok dengan
   'Lanjutkan', jadi bentuk berimbuhan perlu disebut sendiri.

   Kata di baris kedua ditambahkan dari temuan audit itu. Menambah kata di sini MEMPERSEMPIT
   blind spot; ia tidak pernah menutupnya. */
const ID_WORDS = /\b(Akun|Masuk|Daftar|Pengaturan|Simpan|Batal|Lanjut|Kembali|Selesai|Silakan|Memuat|Jawaban|Pilih|Kirim|Aktifkan|Aktivasi|Nama|Kelas|Guru|Murid|Suara|Notifikasi|Riwayat|Belajar|Undangan|Coba lagi|Status|Belum|Sudah|Hapus|Tambah|Ubah|Buat|Tutup|Cari|Ruang|Tugas|Soal|Materi|Metrik|Lanjutkan|Selesaikan|Kosakata|Latihan|Akurasi|Ritme|Dengar|Runtun|Tingkat|Sekarang|Kemahiran|Disarankan|Direkomendasikan)\b/;

/* Buang komentar tanpa menggeser nomor baris — komentar Indonesia ada di mana-mana di repo
   ini dan bukan naskah murid. */
function stripComments(text) {
  let inBlock = false;
  return text.split('\n').map((line) => {
    let out = '', i = 0;
    while (i < line.length) {
      if (inBlock) { const e = line.indexOf('*/', i); if (e < 0) { i = line.length; } else { inBlock = false; i = e + 2; } continue; }
      const b = line.indexOf('/*', i), l = line.indexOf('//', i);
      if (b >= 0 && (l < 0 || b < l)) { out += line.slice(i, b); inBlock = true; i = b + 2; continue; }
      if (l >= 0) { if (line[l - 1] === ':') { out += line.slice(i, l + 2); i = l + 2; continue; } out += line.slice(i, l); i = line.length; continue; }
      out += line.slice(i); i = line.length;
    }
    return out;
  });
}

/* Literal yang menjadi ARGUMEN KEDUA t()/T() adalah fallback i18n — itu jalur yang benar,
   bukan kebocoran. */
function fallbackLiterals(text) {
  const out = new Set();
  const re = /\b[tT]\(\s*['"][^'"]+['"]\s*,\s*(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m;
  while ((m = re.exec(text))) out.add(m[2].replace(/\\'/g, "'").trim());
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/i18n|node_modules/.test(p)) walk(p, acc); }
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function leaksIn(file) {
  const text = fs.readFileSync(path.join(__fzRoot, file), 'utf8');
  const fb = fallbackLiterals(text);
  const seen = new Set(), hits = [];
  stripComments(text).forEach((line, i) => {
    (line.match(/[>'"`]([^<>'"`]{5,110})[<'"`]/g) || []).forEach((raw) => {
      const s = raw.slice(1, -1).trim();
      if (!ID_WORDS.test(s) || /FiezelI18n\.t\(/.test(s) || /^[a-z0-9.\-_/]+$/.test(s) || seen.has(s) || fb.has(s)) return;
      seen.add(s);
      hits.push({ line: i + 1, text: s });
    });
  });
  return hits;
}

const files = ['app.js', ...walk(path.join(__fzRoot, 'features')).map((p) => path.relative(__fzRoot, p).replace(/\\/g, '/'))];
let failed = false;
const report = { schema: 'fiezel-th-ui-leak-v1', generatedAt: new Date().toISOString(), files: {} };

for (const f of files) {
  const hits = leaksIn(f);
  const budget = ALLOWLIST[f] || 0;
  if (hits.length) report.files[f] = { leaks: hits.length, budget, sample: hits.slice(0, 5) };
  if (hits.length > budget) {
    failed = true;
    console.log(`FAIL  ${f} — ${hits.length} literal Indonesia di jalur render, anggaran ${budget}`);
    hits.slice(0, 8).forEach((h) => console.log(`        ${f}:${h.line}  ${JSON.stringify(h.text.slice(0, 80))}`));
  } else if (hits.length) {
    console.log(`PASS  ${f} — ${hits.length}/${budget} (utang yang sudah dijelaskan)`);
  }
}

/* Anggaran yang tidak lagi terpakai juga kegagalan: kalau utangnya sudah dibayar, angkanya
   harus turun, bukan tertinggal sebagai izin yang menganga. */
for (const f of Object.keys(ALLOWLIST)) {
  const actual = report.files[f] ? report.files[f].leaks : 0;
  if (actual < ALLOWLIST[f]) {
    failed = true;
    console.log(`FAIL  ${f} — anggaran ${ALLOWLIST[f]} tapi kebocorannya tinggal ${actual}. Turunkan angkanya.`);
  }
}

/* Setiap kunci id WAJIB punya padanan th — kunci tanpa th membuat murid th jatuh ke id. */
const store = { id: {}, th: {} };
const root = { FiezelI18n: { registerCopy: (l, m) => Object.assign(store[l], m) } };
for (const f of fs.readdirSync(path.join(__fzRoot, 'features/i18n')).filter((f) => /^copy-(id|th)-.*\.js$/.test(f))) {
  new Function('self', fs.readFileSync(path.join(__fzRoot, 'features/i18n', f), 'utf8'))(root);
}
const noTh = Object.keys(store.id).filter((k) => !store.th[k]);
report.copyKeys = { id: Object.keys(store.id).length, th: Object.keys(store.th).length, idTanpaTh: noTh.length };
if (noTh.length) {
  failed = true;
  console.log(`FAIL  ${noTh.length} kunci id tanpa padanan th, contoh: ${noTh.slice(0, 5).join(', ')}`);
} else {
  console.log(`PASS  ${Object.keys(store.id).length} kunci id, semuanya punya padanan th`);
}

report.pass = !failed;
fs.writeFileSync(path.join(__fzRoot, 'reports/th-ui-leak-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\nFIEZEL m025-265 kebocoran naskah Indonesia di mode Thai: ${failed ? 'FAIL' : 'PASS'}`);
if (failed) process.exitCode = 1;
