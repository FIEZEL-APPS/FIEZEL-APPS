'use strict';
/**
 * tests/kurikulum-luring-test.js — F9 FASE 1: MISI LURING
 * (audit UI/UX KelasKu & Kurikulum 2026-09-20 §F9; keputusan owner: penuh-luring
 * bertahap, identitas = sesi terakhir + konfirmasi, paket = seluruh bank teks otomatis).
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Untuk sekolah pilot, misi kurikulum yang butuh sinyal terus-menerus berarti
 * fiturnya tidak bisa dipakai sama sekali. Fase 1 membuat latihan luring bisa
 * jalan dari bank perangkat (23 unit statis, nol gambar) dengan penilaian lokal
 * dan antrean bukti idempoten — tanpa endpoint baru, tanpa pintu ke backend
 * yang belum siap.
 *
 * Batas jujur yang dijaga gerbang ini: antrean dikirim sebagai question_answered
 * (event_id stabil, dedup server), TETAPI penguasaan/paspor tetap dihitung
 * server. Layar tidak pernah mengklaim bukti antre = bukti penguasaan.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

const SW = baca('sw.js');
const MISI_HTML = baca('misi.html');
const MISI = baca('features/curriculum/learning-mission.js');
const ID_KUR = baca('features/i18n/copy-id-kurikulum.js');
const TH_KUR = baca('features/i18n/copy-th-kurikulum.js');

/* --------------------------------- 1. paket luring ikut precache */

test('F9 — shell luring ikut precache (halaman, gaya, mesin, data lewat modulnya)', () => {
  ['misi.html', 'features/curriculum/console.css', 'features/curriculum/learning-mission.js',
    'features/curriculum/rapor-share.js', 'features/curriculum/fz-api.js',
    'features/teacher/fiezel-teacher-curriculum.js'].forEach((f) => {
    assert.ok(SW.includes("'./" + f + "'"), 'sw.js tidak mem-precache ./' + f + ' — luring gagal sebelum mulai.');
  });
});

test('F9 — misi.html memuat bank unit statis berpenanda build', () => {
  const build = (baca('core-config.js').match(/self\.FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1];
  assert.ok(build, 'FIEZEL_PAGE_BUILD tidak terbaca.');
  assert.ok(MISI_HTML.includes('./features/teacher/fiezel-teacher-curriculum.js?v=' + build),
    'misi.html tidak memuat bank unit berpenanda ?v=' + build + ' — cache lama bisa menyajikan bank basi.');
});

/* --------------------------------- 2. identitas: sesi terakhir + konfirmasi */

test('F9 — sesi terakhir dibekukan saat masuk, dilupakan saat keluar', () => {
  assert.ok(/simpanJSON\(SES_KEY, \{ u: u, at:/.test(MISI), 'start() tidak membekukan sesi — luring tak punya identitas.');
  assert.ok(/simpanJSON\(SES_KEY, null\); simpanJSON\(PAS_KEY, null\)/.test(MISI),
    'logout tidak melupakan sesi & paspor perangkat — HP bersama membocorkan identitas.');
});

test('F9 — pintu luring menyebut nama pemilik sesi, tanpa sesi tanpa pintu', () => {
  assert.ok(/data-testid="offline-door"/.test(MISI), 'pintu luring hilang dari layar masuk.');
  assert.ok(/if \(!nm\) return '';/.test(MISI), 'pintu luring tampil tanpa nama — bukti bisa diikat ke siapa saja.');
  assert.ok(/if \(!snap \|\| !snap\.u \|\| !uidOf\(snap\.u\)\) return renderAuth/.test(MISI),
    'konfirmasi luring tidak memeriksa identitas — tombol menyala untuk sesi hantu.');
});

/* --------------------------------- 3. latihan dinilai lokal, antre idempoten */

test('F9 — runner luring menilai di perangkat dari kunci butir', () => {
  assert.ok(/var ok = pilih === soal\.answer;/.test(MISI), 'penilaian lokal tidak membandingkan dengan kunci butir.');
  assert.ok(/S\.offItems = acakSalin\(unit\.items\)\.slice\(0, 6\)/.test(MISI), 'sesi luring tidak dibatasi 6 butir acak.');
  assert.ok(/q\.why && \(q\.why\[String\(q\.answer\)\]/.test(MISI), 'umpan balik tidak menunjukkan alasan kunci.');
});

test('F9 — antrean memakai event_id stabil dan pintu events yang ada', () => {
  assert.ok(/eid: 'offline:' \+ uid \+ ':' \+ soal\.id \+ ':' \+ Date\.parse\(saat\)/.test(MISI),
    'event_id antrean tidak stabil — kirim ulang bisa double-count.');
  assert.ok(/api\('\/learning\/events', \{ body: \{\s*type: 'question_answered'/.test(MISI),
    'sinkronisasi tidak memakai question_answered — pintu backend yang tersedia.');
  assert.ok(/correct: e\.correct \? 1 : 0, offline: true/.test(MISI),
    'payload antrean tidak menandai asal-luring — server tidak bisa membedakan.');
  assert.ok(/r\.stored \|\| r\.reason === 'duplicate'/.test(MISI),
    'respons duplicate tidak ikut menggugurkan antrean — antrean macet selamanya.');
});

test('F9 — layar tidak mengklaim antrean = bukti penguasaan', () => {
  assert.ok(/belum masuk bukti penguasaan/.test(MISI) || /kurikulum\.antre-isi/.test(MISI),
    'penanda jujur antrean hilang — murid mengira latihannya sudah dihitung.');
  assert.ok(!/paspor|mastery|tuntas/i.test(MISI.slice(MISI.indexOf('function kirimAntre'), MISI.indexOf('function kirimAntre') + 1500).replace(/kurikulum\.antre-\w+/g, '')) ||
    /belum masuk bukti penguasaan/.test(MISI),
    'pengirim antrean menyentuh paspor/mastery — di luar pintunya.');
});

/* --------------------------------- 4. dwibahasa */

test('F9 — seluruh naskah luring lahir dwibahasa (id+th)', () => {
  ['kurikulum.luring-kicker', 'kurikulum.luring-masuk', 'kurikulum.luring-masuk-sub',
    'kurikulum.luring-pilih-judul', 'kurikulum.luring-pilih-sub', 'kurikulum.luring-butir',
    'kurikulum.luring-soal-ke', 'kurikulum.luring-benar', 'kurikulum.luring-salah',
    'kurikulum.luring-berikutnya', 'kurikulum.luring-hasil', 'kurikulum.luring-selesai-judul',
    'kurikulum.luring-skor', 'kurikulum.luring-lagi', 'kurikulum.luring-ganti',
    'kurikulum.luring-tanpa-modul', 'kurikulum.antre-judul', 'kurikulum.antre-isi',
    'kurikulum.antre-kirim', 'kurikulum.antre-terkirim', 'kurikulum.antre-sisa'].forEach((k) => {
    assert.ok(ID_KUR.includes("'" + k + "'"), 'copy-id-kurikulum kehilangan ' + k + '.');
    assert.ok(TH_KUR.includes("'" + k + "'"), 'copy-th-kurikulum kehilangan ' + k + ' — paritas id/th robek.');
  });
});

/* ------------------------------------------------------------------------------ jalan */

let pass = 0;
const gagal = [];
tests.forEach(([n, fn]) => {
  try { fn(); pass++; console.log('  ok   ' + n); }
  catch (e) { gagal.push(n); console.log('  FAIL ' + n + ' — ' + e.message); }
});
console.log('\nFIEZEL misi luring: ' + (gagal.length ? 'FAIL' : 'PASS') + ' (' + pass + ' pass, ' + gagal.length + ' fail)');
process.exit(gagal.length ? 1 : 0);
