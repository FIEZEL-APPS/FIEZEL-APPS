#!/usr/bin/env node
/**
 * GERBANG BATAS WAKTU WORKFLOW (tests/workflow-timeout-gate-test.js)
 *
 * ==========================================================================
 * INSIDEN YANG MELAHIRKAN BERKAS INI — 3 September 2026
 * ==========================================================================
 * Dua run `quality.yml` untuk commit yang sama (33756627564 dan 33756667293)
 * berhenti bergerak di step `Core validation` dan TETAP DI SANA selama
 * 1 jam 59 menit, sampai Owner menyadarinya dan menekan Cancel dengan tangan.
 * Run ulang commit yang PERSIS SAMA menyelesaikan step itu dalam 14 menit 40
 * detik, jadi macetnya tidak deterministik dan tidak bisa diulang sesuka hati.
 *
 * Yang bisa dipastikan justru bukan penyebab macetnya, melainkan kenapa
 * macetnya berlangsung dua jam: TIDAK ADA `timeout-minutes` di mana pun di
 * `.github/workflows/`. Dari 25 job di 19 workflow, hanya DUA yang punya —
 * kebetulan dua job macOS, yang diberi batas karena menit macOS ditagih 10x,
 * bukan karena ada yang memikirkan hang. Dua puluh tiga job sisanya mewarisi
 * bawaan GitHub: 360 menit. ENAM JAM diam.
 *
 * Itu adalah cacat yang berdiri sendiri, terlepas dari apa pun penyebab hang
 * hari itu. Selama batasnya enam jam, setiap macet berikutnya — apa pun
 * sebabnya — hanya ketahuan kalau ada MANUSIA yang kebetulan sedang menonton
 * tab Actions. Gerbang yang bergantung pada seseorang yang kebetulan melihat
 * bukan gerbang.
 *
 * ==========================================================================
 * APA YANG DIJAGA DI SINI
 * ==========================================================================
 *   (T1) SETIAP job di SETIAP workflow punya `timeout-minutes` di tingkat job.
 *   (T2) Nilainya bilangan bulat positif dan TIDAK melebihi PLAFON. Menulis
 *        `timeout-minutes: 360` sama saja dengan tidak menulis apa pun: itu
 *        persis bawaan GitHub. Batas yang tidak mengikat adalah batas palsu,
 *        dan batas palsu lebih buruk daripada tidak ada karena ia terbaca
 *        seolah masalahnya sudah ditangani.
 *   (T3) `timeout-minutes` ada di tingkat JOB (indentasi 4 spasi), bukan
 *        terselip di dalam sebuah step. Batas per-step tidak menolong job yang
 *        macet di step lain, dan salah indentasi adalah cara paling mudah
 *        mendapatkan hijau tanpa mendapatkan batas.
 *   (T4) Parsernya sendiri terbukti masih menemukan job. Gerbang yang
 *        penguraiannya diam-diam rusak akan melaporkan "nol pelanggaran" untuk
 *        selamanya — persis kelas cacat yang dicatat di kepala
 *        tests/build-number-uniqueness-test.js (perintah rusak -> hijau palsu). Jadi
 *        jumlah job yang ditemukan dituntut >= JOB_MINIMUM, dan setiap berkas
 *        workflow wajib menyumbang minimal satu job.
 *
 * Yang SENGAJA tidak dijaga: apakah angkanya "tepat". Menuntut batas yang ketat
 * akan menukar satu kelas kegagalan (macet diam) dengan kelas lain (merah palsu
 * saat runner kebetulan lambat), dan yang kedua jauh lebih sering. Gerbang ini
 * hanya menuntut batasnya BERHINGGA dan mengikat; besarnya urusan penulis
 * workflow.
 *
 * Nol jaringan, nol dependensi. Ia hanya membaca berkas di `.github/workflows/`.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const DIR = path.join(ROOT, '.github', 'workflows');

/* Plafon. GitHub memakai 360 menit kalau `timeout-minutes` tidak ditulis, jadi apa pun
 * yang mendekatinya bukan batas melainkan hiasan. 120 menit dipilih karena job TERLAMA
 * yang benar-benar ada di repo ini (clean-room rebuild vendor neural) diukur jauh di
 * bawahnya; kalau suatu hari ada job yang jujur butuh lebih, naikkan angka ini SENGAJA
 * di satu tempat ini — bukan diam-diam per workflow. */
const PLAFON_MENIT = 120;

/* Penjaga parser (T4). Angka ini sengaja lebih rendah dari jumlah job hari ini (25)
 * supaya penambahan/penghapusan workflow yang wajar tidak memerahkannya, tapi cukup
 * tinggi untuk menangkap parser yang runtuh dan mengembalikan nol atau segelintir. */
const JOB_MINIMUM = 18;

/* Job yang memanggil reusable workflow (`uses:` di tingkat job) TIDAK BOLEH punya
 * `timeout-minutes` — GitHub menolak workflow-nya. Kalau suatu hari ada, ia dicatat
 * sebagai dikecualikan DENGAN alasan, bukan diam-diam dilewati. */
const ALASAN_REUSABLE = 'job memanggil reusable workflow (`uses:` tingkat job); '
  + 'GitHub tidak menerima timeout-minutes di sini — batasnya milik workflow yang dipanggil';

let gagal = 0;
const ok = (m) => console.log('ok  - ' + m);
const salah = (m) => { gagal++; console.error('GAGAL - ' + m); };

/* Penguraian berbasis indentasi, bukan pustaka YAML: repo ini melarang dependensi npm
 * di jalur produksi dan gerbang lain (tests/gate-registry-test.js) sudah membaca workflow yang
 * sama dengan cara yang sama. Yang dibutuhkan cuma tiga tingkat: `jobs:` di kolom 0,
 * nama job di kolom 2, kunci job di kolom 4. */
function bacaJob(isi) {
  const baris = isi.split('\n');
  const jobs = [];
  let diJobs = false;
  let kini = null;

  for (let i = 0; i < baris.length; i++) {
    const l = baris[i];

    if (/^jobs:\s*$/.test(l)) { diJobs = true; continue; }
    if (!diJobs) continue;

    /* Kembali ke kolom 0 (mis. `permissions:` sesudah blok jobs) = blok jobs selesai. */
    if (/^\S/.test(l) && !/^jobs:\s*$/.test(l)) { diJobs = false; continue; }

    const namaJob = l.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (namaJob) {
      kini = { nama: namaJob[1], baris: i + 1, kunci: [], reusable: false };
      jobs.push(kini);
      continue;
    }

    if (!kini) continue;

    /* Kunci tingkat job = tepat 4 spasi lalu bukan spasi. Yang lebih dalam milik step. */
    const kunci = l.match(/^ {4}([A-Za-z0-9_-]+):(.*)$/);
    if (kunci) {
      kini.kunci.push({ nama: kunci[1], nilai: kunci[2].trim(), baris: i + 1 });
      if (kunci[1] === 'uses') kini.reusable = true;
    }
  }
  return jobs;
}

/* Deteksi `timeout-minutes` yang ADA di berkas tapi TIDAK di tingkat job — inti (T3).
 * Tanpa ini, seseorang yang menaruhnya di dalam sebuah step mendapat hijau dari (T1)
 * yang tidak pernah ia peroleh. */
function timeoutSalahTingkat(isi) {
  return isi.split('\n')
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(({ l }) => /timeout-minutes:/.test(l) && !/^\s*#/.test(l))
    .filter(({ l }) => !/^ {4}timeout-minutes:/.test(l));
}

if (!fs.existsSync(DIR)) {
  salah('.github/workflows/ tidak ada — gerbang ini tidak punya apa pun untuk dijaga.');
} else {
  const berkas = fs.readdirSync(DIR).filter((f) => /\.ya?ml$/.test(f)).sort();

  if (berkas.length === 0) {
    salah('.github/workflows/ kosong — lihat catatan (T4): parser yang tidak menemukan '
      + 'apa pun akan selamanya melaporkan nol pelanggaran.');
  }

  let totalJob = 0;
  const dikecualikan = [];

  for (const f of berkas) {
    const isi = fs.readFileSync(path.join(DIR, f), 'utf8');
    const jobs = bacaJob(isi);

    if (jobs.length === 0) {
      salah(f + ': tidak satu pun job terbaca. Entah berkas ini bukan workflow, entah '
        + 'penguraian gerbang ini rusak — keduanya harus dilihat manusia, bukan dilewati.');
      continue;
    }
    totalJob += jobs.length;

    for (const j of jobs) {
      const t = j.kunci.find((k) => k.nama === 'timeout-minutes');

      if (j.reusable && !t) {
        dikecualikan.push(f + ' / ' + j.nama);
        continue;
      }

      if (!t) {
        salah(f + ' / job "' + j.nama + '" (baris ' + j.baris + '): tanpa `timeout-minutes`, '
          + 'jadi GitHub memakai 360 menit. Satu langkah yang menggantung membakar enam jam '
          + 'dalam diam dan hanya ketahuan kalau ada manusia yang kebetulan menonton.');
        continue;
      }

      const n = Number(t.nilai);
      if (!Number.isInteger(n) || n <= 0) {
        salah(f + ' / job "' + j.nama + '" (baris ' + t.baris + '): `timeout-minutes` bukan '
          + 'bilangan bulat positif: "' + t.nilai + '".');
      } else if (n > PLAFON_MENIT) {
        salah(f + ' / job "' + j.nama + '" (baris ' + t.baris + '): `timeout-minutes: ' + n
          + '` melewati plafon ' + PLAFON_MENIT + ' menit. Batas sebesar ini tidak mengikat '
          + 'apa pun dan terbaca seolah masalahnya sudah ditangani. Naikkan PLAFON_MENIT '
          + 'dengan sengaja kalau job ini memang sejujurnya selama itu.');
      }
    }

    for (const { l, n } of timeoutSalahTingkat(isi)) {
      salah(f + ' baris ' + n + ': `timeout-minutes` di luar tingkat job (indentasi 4 spasi). '
        + 'Batas per-step tidak menolong job yang macet di step lain: ' + l.trim());
    }
  }

  if (gagal === 0) {
    ok('seluruh ' + totalJob + ' job di ' + berkas.length + ' workflow punya '
      + '`timeout-minutes` tingkat job, bilangan bulat, <= ' + PLAFON_MENIT + ' menit.');
  }

  for (const d of dikecualikan) {
    console.log('    dikecualikan - ' + d + ': ' + ALASAN_REUSABLE);
  }

  if (totalJob < JOB_MINIMUM) {
    salah('hanya ' + totalJob + ' job terbaca, di bawah JOB_MINIMUM=' + JOB_MINIMUM + '. '
      + 'Entah workflow benar-benar berkurang drastis (sesuaikan angkanya dengan sengaja), '
      + 'entah penguraian gerbang ini rusak dan sejak sekarang ia menjaga nol.');
  } else {
    ok('penjaga parser: ' + totalJob + ' job terbaca (minimum ' + JOB_MINIMUM + ').');
  }
}

if (gagal > 0) {
  console.error('\nGerbang batas waktu workflow: GAGAL (' + gagal + ').');
  process.exit(1);
}
console.log('\nGerbang batas waktu workflow: PASS.');
