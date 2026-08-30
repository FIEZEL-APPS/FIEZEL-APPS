/**
 * FIEZEL gerbang — lima profil murid sintetis lewat Braincore sungguhan (Fase 2 / Phase D).
 *
 * TIDAK ADA DATA MURID NYATA DI SINI, dan itu disengaja. Yang diuji bukan "apakah Braincore
 * membantu murid" — pertanyaan itu butuh murid sungguhan dan BELUM TERJAWAB (lihat
 * SALE/KNOWN_LIMITATIONS.md §1). Yang diuji: apakah mesinnya BEREAKSI BERBEDA terhadap pola
 * belajar yang berbeda, dengan arah yang bisa dinilai orang sebelum melihat angkanya.
 *
 * KENAPA ITU TETAP BERHARGA. Mesin adaptif yang memperlakukan murid kuat dan murid kesulitan
 * dengan cara yang sama bukan mesin adaptif — apa pun kata arsitekturnya. Gerbang ini menutup
 * kemungkinan itu, dan menutupnya lewat MENJALANKAN modul aslinya, bukan membaca sumbernya.
 *
 * SETIAP HARAPAN DITULIS LEBIH DULU sebagai kalimat yang bisa dibantah, lalu diuji. Kalau
 * sebuah harapan tidak terpenuhi, itu TEMUAN tentang Braincore — bukan alasan melonggarkan
 * assert sampai ia hijau.
 */
const assert = require('assert');
const P = require('./braincore-pipeline.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = {
  id: 'g-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
};

/**
 * Jalankan satu deret jawaban; kembalikan murid akhir dan semua trace-nya.
 *
 * Langkah ber-`gapDays` memulai SESI BARU, meniru app.js yang membuat sesi tutor sekali per
 * kuis. Ini bukan detail kosmetik: ledger miskonsepsi menuntut bukti dari >= 2 sesi berbeda
 * sebelum menuduh murid, jadi harness yang memakai satu sesi selamanya akan melaporkan
 * "ledger tetap kosong" dan menuduh Braincore atas kesalahan harness-nya sendiri.
 */
function run(steps, opts = {}) {
  let learner = P.createLearner({ level: opts.level || 'A2', now: T0 });
  const traces = [];
  let t = T0;
  for (const s of steps) {
    if (s.gapDays) { t += s.gapDays * DAY; learner = P.newSession(learner, t); }
    else { t += 60_000; }
    const r = P.answer(learner, { ...Q, ...(s.question || {}) }, s, t);
    learner = r.learner;
    traces.push(r.trace);
  }
  return { learner, traces, last: traces[traces.length - 1], first: traces[0] };
}

const reliable = (correct) => ({ correct, ms: 7000, timing: 'normal' });
const rep = (n, v) => Array.from({ length: n }, () => v);

/* ========================================================================================
 * PROFIL A — MURID KUAT
 * Harapan: mastery naik; keyakinan bukti tinggi; tidak dihujani remediasi.
 * ===================================================================================== */

test('A/kuat: mastery naik jelas sepanjang deret jawaban benar', () => {
  const { traces } = run(rep(8, reliable(true)));
  const first = traces[0].masteryAfter.L, last = traces[traces.length - 1].masteryAfter.L;
  assert.ok(last > first, `mastery tidak naik: ${first} -> ${last}`);
  assert.ok(last > 0.8, `8 jawaban benar hanya membawa mastery ke ${last}`);
});

test('A/kuat: buktinya dinilai KREDIBEL (kappa penuh), bukan didiskon tanpa alasan', () => {
  const { last } = run(rep(8, reliable(true)));
  assert.strictEqual(last.evidence.kappa, 1, `kappa murid kuat justru ${last.evidence.kappa}`);
});

test('A/kuat: TIDAK berakhir di remediasi — mesin tidak menghukum keberhasilan', () => {
  const { traces } = run(rep(8, reliable(true)));
  const remedial = traces.filter((t) => t.decision === 'reteach' || t.decision === 'review').length;
  assert.strictEqual(remedial, 0, `${remedial} dari 8 langkah menyuruh murid kuat mengulang`);
});

/* ========================================================================================
 * PROFIL B — MURID KESULITAN
 * Harapan: mastery TIDAK naik seperti murid kuat; keputusannya bergeser ke bantuan.
 * ===================================================================================== */

test('B/kesulitan: mastery tetap jauh di bawah murid kuat', () => {
  const strong = run(rep(8, reliable(true))).last.masteryAfter.L;
  const weak = run(rep(8, { ...reliable(false), chosenMisconception: 'past-simple-vs-present-perfect' })).last.masteryAfter.L;
  assert.ok(weak < strong, `kesulitan (${weak}) tidak di bawah kuat (${strong})`);
  assert.ok(weak < 0.35, `8 jawaban salah masih meninggalkan mastery ${weak}`);
});

test('B/kesulitan: mesin BERHENTI menyuruh "lanjut" dan mulai membantu', () => {
  const { traces } = run(rep(6, { ...reliable(false), chosenMisconception: 'past-simple-vs-present-perfect' }));
  const helped = traces.filter((t) => t.decision !== 'continue').length;
  assert.ok(helped > 0, 'enam jawaban salah beruntun dan mesin tetap "lanjut saja" setiap kali');
});

test('B/kesulitan: miskonsepsi yang BERULANG akhirnya tercatat aktif', () => {
  // Melintasi beberapa sesi, karena ledger memang menuntut MIN_SESSIONS >= 2 sebelum
  // menuduh. Kalau ini gagal, pagarnya terlalu ketat ATAU tidak pernah bisa dilewati —
  // dua-duanya temuan yang layak dilihat.
  const { last } = run(rep(10, { ...reliable(false), chosenMisconception: 'past-simple-vs-present-perfect', gapDays: 1 }));
  assert.ok(last.misconceptionState.activeCount >= 1,
    'sepuluh kesalahan pada miskonsepsi yang sama, lintas hari, dan ledger tetap kosong');
});

/* ========================================================================================
 * PROFIL C — MURID LUPA
 * Harapan: setelah jeda panjang, daya ingat SEBELUM review turun jelas.
 * ===================================================================================== */

test('C/lupa: jeda 90 hari menurunkan retrievability jauh di bawah jeda 1 hari', () => {
  const warm = rep(5, reliable(true));
  const soon = run(warm.concat([{ ...reliable(true), gapDays: 1 }])).last;
  const late = run(warm.concat([{ ...reliable(true), gapDays: 90 }])).last;
  assert.ok(late.memoryBefore.retrievability < soon.memoryBefore.retrievability,
    `jeda 90 hari (${late.memoryBefore.retrievability}) tidak di bawah jeda 1 hari (${soon.memoryBefore.retrievability})`);
  assert.ok(late.memoryBefore.retrievability < 0.9,
    `setelah 90 hari mesin masih menganggap ingatannya ${late.memoryBefore.retrievability}`);
});

test('C/lupa: salah SESUDAH jeda panjang memendekkan stabilitas ingatan', () => {
  const warm = rep(5, reliable(true));
  const kept = run(warm.concat([{ ...reliable(true), gapDays: 90 }])).last;
  const lost = run(warm.concat([{ ...reliable(false), gapDays: 90 }])).last;
  assert.ok(lost.memoryAfter.stabilityDays < kept.memoryAfter.stabilityDays,
    `lupa lalu salah (${lost.memoryAfter.stabilityDays}) tidak memendekkan dibanding tetap benar (${kept.memoryAfter.stabilityDays})`);
});

/* ========================================================================================
 * PROFIL D — PENEBAK CEPAT   ← pembeda terpenting
 * Harapan: benar-tapi-menebak TIDAK menaikkan mastery sekuat benar-yang-dipikirkan.
 * ===================================================================================== */

test('D/penebak: bukti tebakan didiskon (kappa jauh di bawah 1)', () => {
  const { last } = run(rep(8, { correct: true, ms: 700, timing: 'guess' }));
  assert.ok(last.evidence.kappa < 0.5, `kappa tebakan 0,7 detik justru ${last.evidence.kappa}`);
});

test('D/penebak: 8 benar-menebak menghasilkan mastery LEBIH RENDAH daripada 8 benar-dipikirkan', () => {
  const thoughtful = run(rep(8, reliable(true))).last.masteryAfter.L;
  const guessing = run(rep(8, { correct: true, ms: 700, timing: 'guess' })).last.masteryAfter.L;
  assert.ok(guessing < thoughtful,
    `menebak (${guessing}) menghasilkan mastery yang sama atau lebih tinggi daripada berpikir (${thoughtful}) — ` +
    'bobot kredibilitas tidak sampai ke keputusan');
});

test('D/penebak: mesin tidak menyatakan penebak sudah menguasai materi', () => {
  const BKT = require('./features/brain/fiezel-mastery-bkt.js');
  const { learner } = run(rep(8, { correct: true, ms: 700, timing: 'guess' }));
  assert.strictEqual(BKT.masteryGate(learner.bkt, 'past-simple'), false,
    'delapan tebakan beruntung sudah cukup dinyatakan menguasai — gerbang mastery tidak bekerja');
});

/* ========================================================================================
 * PROFIL E — SOAL BERBAHASA BERAT
 * Harapan: kegagalan pemula pada soal Inggris penuh TIDAK dihitung sebagai bukti
 * kegagalan tata bahasa yang setara.
 * ===================================================================================== */

test('E/bahasa: gagal pada soal Inggris penuh didiskon untuk pemula (kappa 0,45)', () => {
  const { last } = run(rep(5, { ...reliable(false), langLoad: 'full_en' }), { level: 'A2' });
  assert.ok(last.evidence.kappa <= 0.45,
    `beban bahasa penuh pada murid A2 memberi kappa ${last.evidence.kappa} — seharusnya didiskon berat`);
});

test('E/bahasa: pemula dan murid mahir TIDAK dinilai sama pada soal Inggris penuh', () => {
  const beginner = run(rep(5, { ...reliable(false), langLoad: 'full_en', question: { level: 'A2' } }), { level: 'A2' }).last;
  const advanced = run(rep(5, { ...reliable(false), langLoad: 'full_en', question: { level: 'B2' } }), { level: 'B2' }).last;
  assert.ok(beginner.evidence.kappa < advanced.evidence.kappa,
    `pemula (${beginner.evidence.kappa}) dan mahir (${advanced.evidence.kappa}) dinilai sama — ` +
    'kegagalan MEMBACA soal dihitung sebagai kegagalan tata bahasa');
});

test('E/bahasa: mastery jatuh lebih pelan saat kegagalannya mungkin soal bahasa', () => {
  const plain = run(rep(5, reliable(false))).last.masteryAfter.L;
  const heavy = run(rep(5, { ...reliable(false), langLoad: 'full_en' })).last.masteryAfter.L;
  assert.ok(heavy > plain,
    `kegagalan berbeban-bahasa (${heavy}) menghukum mastery sama beratnya dengan kegagalan biasa (${plain})`);
});

/* ========================================================================================
 * LINTAS PROFIL — mesin benar-benar MEMBEDAKAN, bukan berperilaku sama
 * ===================================================================================== */

test('LINTAS PROFIL: lima profil menghasilkan lima keadaan akhir yang BERBEDA', () => {
  const m = {
    A_kuat:      run(rep(8, reliable(true))).last.masteryAfter.L,
    B_kesulitan: run(rep(8, { ...reliable(false), chosenMisconception: 'x' })).last.masteryAfter.L,
    D_penebak:   run(rep(8, { correct: true, ms: 700, timing: 'guess' })).last.masteryAfter.L,
    E_bahasa:    run(rep(8, { ...reliable(false), langLoad: 'full_en' })).last.masteryAfter.L
  };
  const values = Object.values(m);
  assert.strictEqual(new Set(values).size, values.length,
    'dua profil berakhir pada mastery yang persis sama: ' + JSON.stringify(m));
  // Urutan yang diharapkan sebelum melihat angkanya: kuat > penebak > bahasa > kesulitan.
  assert.ok(m.A_kuat > m.D_penebak, `kuat ${m.A_kuat} tidak di atas penebak ${m.D_penebak}`);
  assert.ok(m.E_bahasa > m.B_kesulitan, `bahasa ${m.E_bahasa} tidak di atas kesulitan ${m.B_kesulitan}`);
  console.log('     mastery akhir per profil: ' + JSON.stringify(m));
});

test('REPRODUSIBEL: menjalankan profil yang sama dua kali memberi hasil identik', () => {
  const a = JSON.stringify(run(rep(6, reliable(true))).traces);
  const b = JSON.stringify(run(rep(6, reliable(true))).traces);
  assert.strictEqual(a, b, 'profil sintetis tidak reprodusibel — perbandingan apa pun jadi tak berarti');
});

console.log(failures ? 'LearnerProfiles: FAIL (' + failures + ' kegagalan)' : 'LearnerProfiles: PASS');
process.exit(failures ? 1 : 0);
