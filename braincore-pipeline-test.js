/**
 * FIEZEL gerbang — Braincore hidup: satu interaksi belajar, ujung ke ujung (Fase 2 / Phase C).
 *
 * PERTANYAAN YANG DIJAWAB GERBANG INI, dan ia satu-satunya pertanyaan yang penting:
 *
 *   "Ketika murid menjawab, apakah Braincore BENAR-BENAR mengamati, MENGUBAH keadaan
 *    internalnya, dan mengambil keputusan yang BERBEDA karena apa yang ia amati?"
 *
 * Audit Fase 1 hanya bisa menjawab "sebagian". Gerbang ini memaksa jawabannya menjadi ya-atau-
 * tidak yang bisa dibuktikan, dengan menjalankan modul Braincore SUNGGUHAN — bukan tiruan —
 * lewat perkabelan yang meniru app.js (braincore-pipeline.js).
 *
 * KENAPA MENJALANKAN, BUKAN MEMBACA. Dua temuan Fase 1 melarang jalan pintas berbasis pola
 * teks. Sebuah gerbang hijau berbulan-bulan karena membandingkan konstanta dengan konstanta.
 * Sebuah cacat produk (pengikat `say` hilang) lolos SEMUA gerbang teks karena polanya masih
 * ada di berkas — yang hilang justru pengikatnya. Satu-satunya obat adalah menjalankan
 * keputusannya dan memeriksa hasilnya.
 */
const assert = require('assert');
const P = require('./braincore-pipeline.js');
const Trace = require('./features/brain/fiezel-decision-trace.js');

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
const fresh = () => P.createLearner({ level: 'A2', now: T0 });

/* ========================================================================================
 * 1. JALUR LENGKAP BERJALAN, DAN MENINGGALKAN CATATAN YANG BISA DIBACA
 * ===================================================================================== */

test('satu jawaban melewati SELURUH jalur dan menghasilkan trace yang sah', () => {
  const { trace } = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  assert.strictEqual(trace.schema, 'fiezel-decision-trace-v1');
  assert.strictEqual(trace.conceptId, 'past-simple');
  assert.ok(trace.braincoreVersion, 'trace tidak membawa versi bundle — dua rilis tidak bisa dibandingkan');
  assert.ok(trace.masteryBefore && trace.masteryAfter, 'mastery tidak terpotret');
  assert.ok(trace.memoryAfter, 'ingatan tidak terpotret');
  assert.ok(Trace.DECISIONS.indexOf(trace.decision) !== -1, 'keputusan di luar enum');
});

test('SETIAP tahap jalur benar-benar menyumbang, bukan diam', () => {
  const { trace } = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  assert.notStrictEqual(trace.evidence.kappa, null, 'kredibilitas bukti tidak dihitung');
  assert.notStrictEqual(trace.difficultyState.prior, null, 'prior kesulitan tidak dihitung');
  assert.notStrictEqual(trace.difficultyState.target, null, 'target sukses tidak ditetapkan');
  assert.ok(trace.masteryAfter.n >= 1, 'BKT tidak mencatat observasi');
  assert.ok(trace.memoryAfter.stabilityDays > 0, 'model ingatan tidak menulis stabilitas');
});

/* ========================================================================================
 * 2. KEADAAN INTERNAL BENAR-BENAR BERGERAK KARENA BUKTI
 * ===================================================================================== */

test('jawaban BENAR menaikkan mastery', () => {
  const { trace } = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  assert.ok(trace.masteryAfter.L > trace.masteryBefore.L,
    `mastery tidak naik: ${trace.masteryBefore.L} -> ${trace.masteryAfter.L}`);
  assert.strictEqual(Trace.movedState(trace), true);
});

test('jawaban SALAH tidak menaikkan mastery seperti jawaban benar', () => {
  const ok = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0).trace;
  const no = P.answer(fresh(), Q, { correct: false, ms: 6000, timing: 'normal' }, T0).trace;
  assert.ok(no.masteryAfter.L < ok.masteryAfter.L,
    `salah (${no.masteryAfter.L}) seharusnya di bawah benar (${ok.masteryAfter.L})`);
});

test('mastery menumpuk lintas jawaban — bukan dihitung ulang dari nol tiap kali', () => {
  let L = fresh(); const seen = [];
  for (let i = 0; i < 5; i++) {
    const r = P.answer(L, Q, { correct: true, ms: 6000, timing: 'normal' }, T0 + i * DAY);
    L = r.learner; seen.push(r.trace.masteryAfter.L);
  }
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i] >= seen[i - 1], `mastery mundur di langkah ${i}: ${seen.join(' -> ')}`);
  }
  assert.ok(seen[seen.length - 1] > seen[0], `mastery tidak menumpuk: ${seen.join(' -> ')}`);
});

/* ========================================================================================
 * 3. KREDIBILITAS BUKTI BENAR-BENAR MENGUBAH BOBOTNYA (bukan sekadar dicatat)
 * ===================================================================================== */

test('tebakan cepat DIDISKON: benar-tapi-2-detik menggerakkan mastery lebih sedikit', () => {
  const slow = P.answer(fresh(), Q, { correct: true, ms: 8000, timing: 'normal' }, T0).trace;
  const fast = P.answer(fresh(), Q, { correct: true, ms: 900, timing: 'guess' }, T0).trace;
  assert.ok(fast.evidence.kappa < slow.evidence.kappa,
    `kappa tebakan (${fast.evidence.kappa}) tidak di bawah kappa jawaban dipikirkan (${slow.evidence.kappa})`);
  assert.ok(fast.masteryAfter.L < slow.masteryAfter.L,
    `bukti lemah menggerakkan mastery sama jauh dengan bukti kuat: ${fast.masteryAfter.L} vs ${slow.masteryAfter.L}`);
});

test('BEBAN BAHASA didiskon: pemula pada soal Inggris penuh dinilai lebih hati-hati', () => {
  const plain = P.answer(fresh(), Q, { correct: false, ms: 7000, timing: 'normal' }, T0).trace;
  const heavy = P.answer(fresh(), Q, { correct: false, ms: 7000, timing: 'normal', langLoad: 'full_en' }, T0).trace;
  assert.ok(heavy.evidence.kappa <= plain.evidence.kappa,
    `beban bahasa tidak mendiskon bukti: ${heavy.evidence.kappa} vs ${plain.evidence.kappa}`);
});

/* ========================================================================================
 * 4. INGATAN BEREAKSI PADA HASIL DAN PADA WAKTU
 * ===================================================================================== */

test('benar memperpanjang stabilitas ingatan, salah memendekkannya', () => {
  const ok = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0).trace;
  const no = P.answer(fresh(), Q, { correct: false, ms: 6000, timing: 'normal' }, T0).trace;
  assert.ok(ok.memoryAfter.stabilityDays > no.memoryAfter.stabilityDays,
    `stabilitas benar (${ok.memoryAfter.stabilityDays}) tidak di atas salah (${no.memoryAfter.stabilityDays})`);
});

test('jeda panjang menurunkan retrievability SEBELUM review (murid memang lupa)', () => {
  const first = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  const soon = P.answer(first.learner, Q, { correct: true, ms: 6000, timing: 'normal' }, T0 + DAY).trace;
  const late = P.answer(first.learner, Q, { correct: true, ms: 6000, timing: 'normal' }, T0 + 60 * DAY).trace;
  assert.ok(late.memoryBefore.retrievability < soon.memoryBefore.retrievability,
    `jeda 60 hari tidak menurunkan retrievability: ${late.memoryBefore.retrievability} vs ${soon.memoryBefore.retrievability}`);
});

/* ========================================================================================
 * 5. MISKONSEPSI TERCATAT — DAN TIDAK DITUDUHKAN DARI SATU KESALAHAN
 * ===================================================================================== */

test('satu kesalahan TIDAK langsung menuduh murid punya miskonsepsi', () => {
  const { trace } = P.answer(fresh(), Q,
    { correct: false, ms: 7000, timing: 'normal', chosenMisconception: 'past-simple-vs-present-perfect' }, T0);
  assert.strictEqual(trace.misconceptionState.activeCount, 0,
    'satu slip sudah cukup menuduh — pagar MIN_EVIDENCE/MIN_SESSIONS tidak bekerja');
});

/* ========================================================================================
 * 6. KEPUTUSAN BERUBAH KARENA APA YANG DIAMATI  ← inti Fase C
 * ===================================================================================== */

test('KEPUTUSAN BERBEDA untuk bukti berbeda pada keadaan awal yang SAMA', () => {
  const right = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  const wrong = P.answer(fresh(), Q, { correct: false, ms: 6000, timing: 'normal' }, T0);
  assert.notStrictEqual(right.trace.decision, wrong.trace.decision,
    `Braincore memilih tindakan yang sama ("${right.trace.decision}") untuk benar dan salah — ` +
    'itu berarti keputusannya tidak dipengaruhi bukti');
});

test('rentetan salah mengubah tindakan menjauh dari sekadar "lanjut"', () => {
  let L = fresh(); let last = null;
  for (let i = 0; i < 4; i++) {
    const r = P.answer(L, Q, { correct: false, ms: 7000, timing: 'normal' }, T0 + i * 60000);
    L = r.learner; last = r.trace;
  }
  assert.notStrictEqual(last.decision, 'continue',
    'empat jawaban salah beruntun dan Braincore tetap "lanjut saja"');
});

/* ========================================================================================
 * 7. DETERMINISTIK — syarat mutlak untuk membandingkan dua rilis
 * ===================================================================================== */

test('DETERMINISTIK: masukan identik -> trace identik byte demi byte', () => {
  const a = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0).trace;
  const b = P.answer(fresh(), Q, { correct: true, ms: 6000, timing: 'normal' }, T0).trace;
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('keadaan murid TIDAK dimutasi di tempat — pemanggil memegang salinan barunya', () => {
  const L = fresh();
  const before = JSON.stringify(L);
  P.answer(L, Q, { correct: true, ms: 6000, timing: 'normal' }, T0);
  assert.strictEqual(JSON.stringify(L), before,
    'answer() memutasi keadaan masukan — dua skenario counterfactual akan saling mencemari');
});

/* ========================================================================================
 * 8. PIPELINE MASIH MENUNJUK KODE PRODUKSI YANG SAMA
 * ===================================================================================== */

test('PENJAGA TIDAK SENYAP: masukan normal tidak menghasilkan satu pun galat tertangkap', () => {
  // Kenapa gerbang ini ada, dan ia lahir dari kesalahan penulisnya sendiri: versi pertama
  // pipeline memakai `tutorSession` di langkah 7 padahal ia baru dideklarasikan di langkah 10
  // — temporal dead zone. try/catch di langkah itu MENELAN ReferenceError-nya, jadi ledger
  // miskonsepsi diam-diam tidak pernah terisi dan profil "murid kesulitan" terlihat seperti
  // Braincore yang rusak. Braincore-nya benar; harness-nya cacat, dan penjaganya sendiri yang
  // menyembunyikan cacat itu selama dua fase.
  //
  // Penjaganya TETAP ADA (app.js memang mendegradasi saat modul absen), tetapi sekarang ia
  // MENCATAT. Gerbang ini menuntut catatan itu kosong untuk masukan yang sehat — degradasi
  // yang disengaja tetap mungkin, degradasi yang tidak disadari tidak.
  for (const [label, ans] of [
    ['benar', { correct: true, ms: 6000, timing: 'normal' }],
    ['salah', { correct: false, ms: 7000, timing: 'normal' }],
    ['salah + miskonsepsi', { correct: false, ms: 7000, timing: 'normal', chosenMisconception: 'm1' }],
    ['tebakan cepat', { correct: true, ms: 700, timing: 'guess' }],
    ['beban bahasa', { correct: false, ms: 7000, timing: 'normal', langLoad: 'full_en' }]
  ]) {
    const r = P.answer(fresh(), Q, ans, T0);
    assert.deepStrictEqual(r.guardErrors, [],
      `penjaga menelan galat pada masukan "${label}": ${JSON.stringify(r.guardErrors)}`);
  }
});

test('ledger miskonsepsi BENAR-BENAR terisi lewat pipeline (bukan null diam-diam)', () => {
  const r = P.answer(fresh(), Q, { correct: false, ms: 7000, timing: 'normal', chosenMisconception: 'm1' }, T0);
  assert.ok(r.learner.ledger && r.learner.ledger.entries,
    'ledger tetap null sesudah jawaban salah ber-miskonsepsi — jalurnya putus tanpa bersuara');
  assert.ok(Object.keys(r.learner.ledger.entries).length >= 1, 'ledger terisi tetapi tanpa entri');
});

test('titik sambung app.js yang dirujuk pipeline masih ada di app.js', () => {
  const fs = require('fs'), path = require('path');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  // Kalau salah satu hilang, pipeline sedang meniru kode yang sudah tidak ada, dan seluruh
  // angka di atas berhenti berarti. Ini yang membuat alat ukur ini tidak diam-diam basi.
  for (const [what, re] of [
    ['record() pintu bukti tunggal', /function record\(q,ok,ms,selectedIndex\)/],
    ['evidenceKappa -> EvidenceCredibility', /FiezelEvidenceCredibility/],
    ['bktRecord -> MasteryBKT.update', /FiezelMasteryBKT\.update/],
    ['scheduleNext -> CoreBrain.updateMemory', /brain\.updateMemory\(/],
    ['MisconceptionLedger.update', /FiezelMisconceptionLedger/],
    ['ItemPrior.difficultyFor', /FiezelItemPrior/],
    ['tutor selectNext/decideMove', /FiezelTutorBrain/],
    ['affectTargetSuccess 0.90/0.75/0.80', /frustrated'\)return \.90[\s\S]{0,80}bored'\)return \.75/]
  ]) {
    assert.ok(re.test(app), `titik sambung hilang dari app.js: ${what}`);
  }
});

console.log(failures ? 'BraincorePipeline: FAIL (' + failures + ' kegagalan)' : 'BraincorePipeline: PASS');
process.exit(failures ? 1 : 0);
