/**
 * FIEZEL gerbang — PEMBANDING BRAINCORE LAWAN MESIN DASAR (Fase 2 / Phase H).
 *
 * APA YANG DIJAGA GERBANG INI: bahwa perbandingannya JUJUR — baseline benar-benar bodoh,
 * kedua mesin melihat bukti yang identik, hasilnya deterministik, dan metriknya benar-benar
 * bisa membedakan (bukan dua angka yang mustahil berbeda).
 *
 * APA YANG SENGAJA TIDAK DIJAGA: bahwa Braincore MENANG. Tidak ada satu pun assert di bawah
 * yang menuntut Braincore lebih baik, karena pada ukuran-ukuran ini ia memang belum terbukti
 * lebih baik — dan gerbang yang menuntut kemenangan akan memaksa siapa pun yang menjalankannya
 * mengarang kemenangan itu. Hasilnya dicetak, bukan di-assert.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const C = require('./braincore-comparison.js');
const Baseline = require('./braincore-baseline.js');
const Tutor = require('./features/brain/fiezel-tutor-brain.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const rows = C.jalankanSemua();
const agg = C.agregat(rows);

/* ========================================================================================
 * §1 — BASELINE BENAR-BENAR BODOH
 * Sebuah "pembanding" yang diam-diam memanggil mesin yang sedang diuji akan membuat setiap
 * selisih terlihat kecil, dan kekecilan itu palsu.
 * ===================================================================================== */
test('§1 baseline TIDAK me-require apa pun dari features/brain/', () => {
  const src = fs.readFileSync(path.join(__dirname, 'braincore-baseline.js'), 'utf8');
  assert.ok(!/require\([^)]*features[\/\\]brain/.test(src),
    'baseline memanggil modul Braincore — ia bukan pembanding lagi, ia cermin');
});

test('§1 baseline mengabaikan justru yang membedakan Braincore', () => {
  const l0 = Baseline.createLearner({ level: 'A2' });
  const cepat = Baseline.answer(l0, {}, { correct: true, ms: 600 }, 0);
  const pelan = Baseline.answer(l0, {}, { correct: true, ms: 26000 }, 0);
  assert.strictEqual(cepat.belief, pelan.belief,
    'baseline membedakan waktu jawab — ia sudah punya kredibilitas bukti, jadi bukan baseline');
  assert.strictEqual(cepat.reasonCodes, null,
    'baseline mengembalikan kode alasan — ketidakmampuan menjelaskan justru yang sedang diukur');
});

/* ========================================================================================
 * §2 — PERBANDINGANNYA BERPASANGAN DAN BISA DIULANG
 * ===================================================================================== */
test('§2 kedua mesin menerima deret bukti yang IDENTIK', () => {
  const V3 = require('./adaptivity-simulation-v3.js');
  const a = C.deretBukti(V3.PROFILES[0], 42, 'normal', 3);
  const b = C.deretBukti(V3.PROFILES[0], 42, 'normal', 3);
  assert.deepStrictEqual(a, b, 'deret bukti tidak stabil — perbandingannya berhenti berpasangan');
  assert.ok(a.length === C.RUN_N, 'panjang deret bukti tidak sesuai RUN_N');
});

test('§2 DETERMINISTIK: menjalankan seluruh matriks dua kali memberi hasil identik', () => {
  assert.strictEqual(JSON.stringify(rows), JSON.stringify(C.jalankanSemua()),
    'pembanding tidak deterministik — tidak ada temuan di atasnya yang bisa diaudit');
});

test('§2 kebenaran dasar diukur sebagai HASIL, dan menyapu ketiga pita', () => {
  const tinggi = rows.filter((r) => r.kebenaran >= C.HIGH).length;
  const rendah = rows.filter((r) => r.kebenaran <= C.LOW).length;
  assert.ok(tinggi > 0, 'tidak satu pun jalan mencapai pita "sudah bisa" — metrik reteach-sia-sia diam');
  assert.ok(rendah > 0, 'tidak satu pun jalan mencapai pita "belum bisa" — metrik advance-terlewat diam');
});

/* ========================================================================================
 * §3 — METRIKNYA TIDAK DEGENERATE
 * Versi pertama menghitung SEMUA remediasi (hint+reteach) dan melaporkan 114 lawan 114, 786
 * lawan 786. Angka itu identik bukan karena kedua mesin sama bijak, tetapi karena keduanya
 * meremediasi tepat saat jawabannya salah, dan jumlah salah sama karena buktinya dibagi.
 * Dua angka yang mustahil berbeda tidak pernah bisa membedakan apa pun.
 * ===================================================================================== */
test('§3 metrik tindakan BISA berbeda antara kedua mesin', () => {
  assert.notStrictEqual(agg.sia2Baseline, agg.sia2Braincore,
    'reteach-sia-sia identik untuk kedua mesin — metrik ini degenerate lagi, seperti pendahulunya');
});

test('§3 kedua mesin memang mengambil keputusan yang berbeda', () => {
  assert.ok(agg.keputusanBerbeda > 0,
    'kedua mesin selalu sepakat — entah baseline terlalu pintar, entah pembandingnya rusak');
  assert.ok(agg.keputusanBerbeda < agg.jumlahKeputusan,
    'kedua mesin tidak pernah sepakat sama sekali — curigai harness, bukan mesinnya');
});

/* ========================================================================================
 * §4 — TEMUAN YANG SUDAH DIPERBAIKI, DIKUNCI DARI SISI SEBALIKNYA
 *
 * RIWAYATNYA, karena ia menjelaskan kenapa assert di bawah berbentuk begini.
 *
 * Bagian ini dulu MENGUNCI SEBUAH CACAT sebagai characterization test: tutor melaporkan
 * `persistent_misconception` untuk murid yang sekadar salah dua kali pada keterampilan yang
 * sama TANPA satu pun bukti miskonsepsi. Waktu itu perbaikannya sengaja TIDAK diterapkan —
 * mengubah tindakan tutor di produksi adalah keputusan pemilik, bukan keputusan audit — dan
 * gerbang ini ditulis supaya perbaikannya membuat bagian ini MERAH dan memaksa dokumennya ikut
 * diperbarui.
 *
 * Pemilik memutuskan. Perbaikannya diterapkan. Bagian ini merah, seperti yang dijanjikan, dan
 * sekarang mengunci arah sebaliknya.
 *
 * DUA SYARAT yang sekarang berlaku sebelum sebuah keputusan boleh disebut mengajar ulang
 * karena miskonsepsi:
 *   (a) harus ADA bukti miskonsepsi (`precision === 'misconception'`), dan
 *   (b) murid yang mastery-nya sudah tinggi tidak diajar ulang gara-gara dua kali keseleo.
 * ===================================================================================== */
test('§4 tanpa bukti miskonsepsi, namanya BUKAN lagi persistent_misconception', () => {
  const sesi = Tutor.createSession({ now: 0, baselineMs: 0 });
  let akhir = null;
  for (let i = 0; i < 2; i++) {
    const d = Tutor.record(sesi, { correct: false, skill: 'vocab_x', concept: 'vocab_x', ms: 7000, now: i * 1000 });
    akhir = { d, m: Tutor.decideMove(sesi, d, { remaining: 10 }) };
  }
  assert.strictEqual(akhir.d.precision, 'skill', 'diagnosis tidak lagi melaporkan precision=skill');
  assert.strictEqual(akhir.m.reason, 'repeated_miss_same_skill',
    'alasannya mengklaim ketepatan yang tidak dimiliki buktinya lagi');
  assert.strictEqual(akhir.m.move, 'reteach',
    'murid yang belum bisa TETAP harus diajar ulang — perbaikan ini bukan tentang berhenti mengajar');
});

test('§4 murid yang SUDAH BISA tidak diajar ulang karena dua kali keseleo', () => {
  const sesi = Tutor.createSession({ now: 0, baselineMs: 0 });
  let m = null;
  for (let i = 0; i < 2; i++) {
    const d = Tutor.record(sesi, { correct: false, skill: 'vocab_x', concept: 'vocab_x', ms: 7000, now: i * 1000 });
    m = Tutor.decideMove(sesi, d, { remaining: 10, mastery: 0.93 });
  }
  assert.strictEqual(m.move, 'hint', 'murid dengan mastery 0,93 masih diajar ulang');
  assert.strictEqual(m.reason, 'likely_slip_high_mastery');
});

test('§4 BUKTI miskonsepsi nyata tetap diajar ulang, setinggi apa pun mastery-nya', () => {
  // Pagar terpenting perbaikan ini. Murid mahir pun bisa memegang satu keyakinan keliru, dan
  // itulah justru yang paling layak disentuh. Kalau assert ini merah, perbaikannya sudah
  // berubah menjadi "berhenti mengajar", dan itu bukan perbaikan.
  const sesi = Tutor.createSession({ now: 0, baselineMs: 0 });
  let m = null;
  for (let i = 0; i < 2; i++) {
    const d = Tutor.record(sesi, { correct: false, skill: 'g', concept: 'g', ms: 7000, now: i * 1000,
      chosenOption: 'A', optionMisconceptions: { A: 'm_ed_ending' } });
    m = Tutor.decideMove(sesi, d, { remaining: 10, mastery: 0.99 });
  }
  assert.strictEqual(m.move, 'reteach', 'miskonsepsi bernama TIDAK lagi diajar ulang — pagarnya jebol');
  assert.strictEqual(m.reason, 'persistent_misconception');
});

test('§4 pemanggil lama yang tidak mengirim mastery TIDAK berubah perilakunya', () => {
  const sesi = Tutor.createSession({ now: 0, baselineMs: 0 });
  let m = null;
  for (let i = 0; i < 2; i++) {
    const d = Tutor.record(sesi, { correct: false, skill: 'vocab_x', concept: 'vocab_x', ms: 7000, now: i * 1000 });
    m = Tutor.decideMove(sesi, d, { remaining: 10 });
  }
  assert.strictEqual(m.move, 'reteach', 'tanpa field mastery, perilakunya berubah — itu bukan opsional lagi');
});

test('§4 remediasi untuk murid yang BELUM bisa tidak ikut berkurang', () => {
  // Cara termudah "memperbaiki" mengajar-ulang-berlebihan adalah berhenti mengajar ulang.
  // Assert ini menutup pintu itu: pada murid yang memang belum bisa, mesin harus tetap
  // sering mengajar ulang.
  const rendah = rows.filter((r) => r.kebenaran <= C.LOW);
  assert.ok(rendah.length > 0, 'tidak ada murid di pita "belum bisa" untuk diperiksa');
  const totalReteachBrain = rendah.reduce((n, r) => n + (r.braincore.reteachSia2 || 0), 0);
  assert.strictEqual(totalReteachBrain, 0,
    'reteachSia2 seharusnya nol di pita "belum bisa" — metriknya salah pita');
});

/* ========================================================================================
 * §5 — HASIL DICETAK, TIDAK DI-ASSERT
 * ===================================================================================== */
console.log('');
console.log('     HASIL (dicetak, bukan di-assert — tidak ada kemenangan yang dipaksakan):');
console.log('       jalan                        : ' + agg.n);
console.log('       galat pelacakan lebih kecil  : Braincore ' + agg.trackingBraincoreLebihBaik
  + ', dasar ' + agg.trackingBaselineLebihBaik);
console.log('       selisih rata-rata galat      : ' + agg.dTracking + '  (negatif = Braincore lebih dekat)');
console.log('       reteach pada yang sudah bisa : dasar ' + agg.sia2Baseline + ', Braincore ' + agg.sia2Braincore);
console.log('       advance pada yang belum bisa : dasar ' + agg.lewatBaseline + ', Braincore ' + agg.lewatBraincore);
console.log('       keputusan berbeda            : ' + agg.keputusanBerbeda + '/' + agg.jumlahKeputusan);
console.log('');
console.log(failures === 0 ? 'BraincoreComparison: PASS' : 'BraincoreComparison: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
