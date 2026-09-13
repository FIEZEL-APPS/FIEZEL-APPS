// m025-307 — PEMANGGIL WAJIB BEREAKSI: gerbang untuk kelas bug yang muncul TIGA KALI.
//
// Pola yang sama, tiga kemunculan, satu hari:
//
//   | Kemunculan     | Aturan ditegakkan di            | Yang tidak dijaga siapa pun        |
//   |----------------|----------------------------------|------------------------------------|
//   | m025-231       | isi sidecar bank ujian           | overlay yang menyajikannya         |
//   | m025-305/307   | isi sidecar writing/reading      | applyContentLocale yang menyalinnya|
//   | gerbang INI    | penyedia yang mengembalikan null | pemanggil yang mengirimnya         |
//
// Rumusnya selalu sama: gerbang memeriksa PENYEDIA, tidak ada yang memeriksa PEMANGGIL.
// Penyedianya benar, datanya benar, gerbangnya hijau - dan murid atau guru tetap menanggung
// akibatnya. Berkas ini menutup dua pemanggil yang tertangkap hari itu, dan ia sengaja
// ditulis sebagai gerbang PEMANGGIL supaya kemunculan keempat punya tempat mendarat.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs = require('fs'), path = require('path');
const root = __fzRoot;

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok: !!ok, details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
};

const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// =======================================================================================
// (1) attemptGoogleSignIn WAJIB keluar dari 'pending' saat renderButton gagal.
//
// Kontraknya tertulis di features/auth/fiezel-google.js: renderButton mengembalikan
// {ok:false, error:'script'|'no_host'|'not_configured', message} dan pemanggil WAJIB
// menampilkan cadangan. Sebelum m025-307, pemanggilnya membaca res.ok HANYA sebagai syarat
// memanggil prompt() dan tidak punya cabang gagal - jadi alurnya jatuh ke `return true`
// sambil meninggalkan gerbang auth di 'pending': spinner yang tidak pernah berhenti, tanpa
// teks galat, tanpa tombol Google, tanpa jalan ke tombol masuk FIEZEL di bawahnya.
//
// Di jaringan sekolah yang memblokir accounts.google.com itu keadaan sehari-hari.
// =======================================================================================
const gsiAt = app.indexOf('async function attemptGoogleSignIn()');
check('attemptGoogleSignIn ada', gsiAt !== -1);
if (gsiAt !== -1) {
  // Badan fungsi: sampai deklarasi berikutnya, supaya assert tidak bocor ke fungsi lain.
  const after = app.slice(gsiAt);
  const nextFn = after.indexOf('\nfunction ', 1);
  const body = nextFn === -1 ? after.slice(0, 2600) : after.slice(0, nextFn);

  check('renderButton dipanggil dan hasilnya ditampung', /const\s+res\s*=\s*await\s+self\.FiezelGoogle\.renderButton/.test(body),
    'hasil renderButton tidak ditampung; kegagalannya tidak mungkin dibaca');

  // Inti gerbang ini: ada cabang yang MENANGANI !res.ok, bukan hanya syarat res.ok.
  check('ada cabang yang menangani renderButton gagal (!res.ok)', /if\s*\(\s*!\s*res\?\.ok\s*\)/.test(body),
    'tidak ada cabang !res.ok; gerbang auth akan tertinggal di pending saat skrip Google gagal');

  const gagalAt = body.search(/if\s*\(\s*!\s*res\?\.ok\s*\)/);
  const gagalBlok = gagalAt === -1 ? '' : body.slice(gagalAt, gagalAt + 420);
  check('cabang gagal KELUAR dari pending lewat setAuthGateState(\'error\')',
    /setAuthGateState\(\s*'error'/.test(gagalBlok),
    'cabang gagal tidak mengubah keadaan gerbang; spinner tetap berjalan');
  check('cabang gagal mengembalikan false, bukan true',
    /return\s+false/.test(gagalBlok),
    'cabang gagal melaporkan sukses ke pemanggilnya');
  // Pesannya harus datang dari penyedia kalau ada: penyedia yang tahu APA yang gagal.
  check('pesan galat memakai res.message dari penyedia bila ada',
    /res\?\.message/.test(gagalBlok),
    'pesan penyedia dibuang; murid membaca galat generik padahal sebabnya diketahui');
}

// =======================================================================================
// (2) Bukti belajar TIDAK BOLEH memfabrikasi akurasi untuk murid tanpa riwayat.
//
// braincoreEvidenceEmitSnapshot() membangun buildLearnerEvidenceEvent, lane bukti belajar
// yang TERSINKRON KE GURU. Sebelum m025-307, cadangan terakhirnya `50`: murid yang belum
// menjawab satu soal pun tercatat akurasi 50% di layar guru - angka yang tampak seperti
// hasil pengukuran.
//
// Aturannya sudah diputuskan dan diuji di lane metrik, tiga tempat:
//   - tests/learning-metrics-test.js : riwayat kosong -> accuracy null DAN insufficient
//   - tests/metrics-digest-test.js   : nilai insufficient tidak dirilis
//   - tests/personal-journey-test.js : "tidak menebak skill yang belum diukur"
//
// null bukan kekosongan yang tidak tertangani melainkan jalur yang DIDUKUNG:
// bucketCalibration() di fiezel-braincore-evidence.js memulai dengan
// `if (a === null) return null`. Gerbang ini memeriksa kedua sisi kontrak itu.
// =======================================================================================
const snapAt = app.indexOf('function braincoreEvidenceEmitSnapshot(');
check('braincoreEvidenceEmitSnapshot ada', snapAt !== -1);
if (snapAt !== -1) {
  const snapBody = app.slice(snapAt, snapAt + 3400);
  const accAt = snapBody.indexOf('accuracy=recent.length');
  check('cadangan akurasi ada untuk diperiksa', accAt !== -1,
    'baris cadangan accuracy tidak ditemukan; gerbang ini perlu disesuaikan, jangan dibiarkan hijau');
  if (accAt !== -1) {
    const accLine = snapBody.slice(accAt, snapBody.indexOf(';', accAt) + 1);
    check('riwayat kosong -> accuracy null, BUKAN angka tebakan',
      /:\s*null\s*\)\s*;?\s*$/.test(accLine.trim()),
      'cadangan akurasi masih memfabrikasi angka: ' + accLine.trim().slice(-90));
    // Pagar eksplisit terhadap kambuhnya nilai lama, dan terhadap "tebakan sopan" lain.
    for (const angka of ['50', '0', '100']) {
      check('cadangan akurasi tidak jatuh ke ' + angka,
        !new RegExp(':\\s*' + angka + '\\s*\\)\\s*;?\\s*$').test(accLine.trim()),
        'akurasi difabrikasi jadi ' + angka + ' untuk murid tanpa riwayat');
    }
  }
}

// Sisi penyedia: kalau ini berubah, null berhenti aman dan gerbang di atas jadi menyesatkan.
const evPath = path.join(root, 'features', 'telemetry', 'fiezel-braincore-evidence.js');
if (fs.existsSync(evPath)) {
  const ev = fs.readFileSync(evPath, 'utf8');
  check('model bukti memang menerima accuracy null (bucketCalibration menjaganya)',
    /function bucketCalibration\([^)]*\)\s*\{[\s\S]{0,160}?===\s*null\s*\)\s*return null/.test(ev),
    'bucketCalibration tidak lagi menjaga null; mengirim null jadi tidak aman dan gerbang ini menyesatkan');
}

for (const c of checks) if (!c.ok) console.error('  - ' + c.name + (c.details ? ' :: ' + c.details : ''));
const lulus = checks.filter((c) => c.ok).length;
if (failed) { console.error('FIEZEL pemanggil wajib bereaksi: FAIL (' + lulus + '/' + checks.length + ')'); process.exit(1); }
console.log('FIEZEL pemanggil wajib bereaksi: PASS (' + lulus + '/' + checks.length + ')');
