/**
 * FIEZEL gerbang — uji COUNTERFACTUAL (Fase 2 / Phase E).
 *
 * PERTANYAANNYA. Fase C membuktikan keadaan Braincore bergerak. Fase D membuktikan lima pola
 * belajar berakhir berbeda. Keduanya belum menutup satu celah: mungkin saja perbedaan itu
 * datang dari MURID YANG BERBEDA, bukan dari BUKTI yang berbeda.
 *
 * Counterfactual menutup celah itu dengan cara yang tidak bisa dielakkan: SATU keadaan awal
 * yang sama persis, dicabangkan, dan hanya SATU hal yang diubah. Kalau hasilnya sama, mesin
 * itu tidak mendengarkan — apa pun kata arsitekturnya.
 *
 * SYARAT KEBENARAN YANG DIPERIKSA LEBIH DULU. Seluruh fase ini bertumpu pada satu asumsi:
 * mencabangkan keadaan benar-benar menghasilkan dua cabang yang TIDAK saling mencemari. Kalau
 * `answer()` memutasi masukannya, cabang kedua akan berangkat dari keadaan yang sudah disentuh
 * cabang pertama, dan setiap angka di bawah menjadi rapi tetapi salah. Itu BUKAN hipotesis:
 * TutorBrain.record() memang memutasi sesinya di tempat, dan pipeline versi pertama meneruskan
 * mutasi itu. Karena itu §0 di bawah menguji isolasi cabang LEBIH DULU, sebelum satu pun
 * perbandingan dipercaya.
 */
const assert = require('assert');
const P = require('./braincore-pipeline.js');
const BKT = require('./features/brain/fiezel-mastery-bkt.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = {
  id: 'g-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'mcq', stemLength: 40
};

/** Keadaan awal BERSAMA: murid yang sudah punya sedikit sejarah, supaya cabangnya berangkat
 *  dari sesuatu yang nyata, bukan dari nol. */
function sharedState() {
  let learner = P.createLearner({ level: 'A2', now: T0 });
  let t = T0;
  for (let i = 0; i < 3; i++) {
    t += DAY;
    learner = P.newSession(learner, t);
    learner = P.answer(learner, Q, { correct: true, ms: 7000, timing: 'normal' }, t).learner;
  }
  return { learner, t };
}

/** Cabangkan: jalankan satu jawaban dari keadaan bersama, tanpa menyentuh yang lain. */
function fork(answerInput) {
  const { learner, t } = sharedState();
  return P.answer(learner, Q, answerInput, t + DAY);
}

const RELIABLE_OK  = { correct: true,  ms: 7000, timing: 'normal' };
const RELIABLE_NO  = { correct: false, ms: 7000, timing: 'normal' };
const GUESSED_OK   = { correct: true,  ms: 700,  timing: 'guess'  };

/* ========================================================================================
 * §0. SYARAT KEBENARAN — cabang benar-benar terisolasi
 * ===================================================================================== */

test('§0 keadaan bersama REPRODUSIBEL: dua kali membangunnya memberi keadaan identik', () => {
  assert.strictEqual(JSON.stringify(sharedState().learner), JSON.stringify(sharedState().learner),
    'keadaan awal saja sudah tidak reprodusibel — tidak ada perbandingan yang bisa dipercaya');
});

test('§0 ISOLASI: mencabangkan tidak menyentuh keadaan bersama', () => {
  const { learner, t } = sharedState();
  const snapshot = JSON.stringify(learner);
  P.answer(learner, Q, RELIABLE_OK, t + DAY);
  P.answer(learner, Q, RELIABLE_NO, t + DAY);
  assert.strictEqual(JSON.stringify(learner), snapshot,
    'cabang mencemari keadaan bersama — setiap perbandingan di bawah akan salah tanpa terlihat salah');
});

test('§0 dua cabang dari keadaan yang sama berangkat dari potret SEBELUM yang identik', () => {
  const a = fork(RELIABLE_OK).trace, b = fork(RELIABLE_NO).trace;
  assert.deepStrictEqual(a.masteryBefore, b.masteryBefore, 'mastery awal cabang berbeda');
  assert.deepStrictEqual(a.memoryBefore, b.memoryBefore, 'ingatan awal cabang berbeda');
  assert.strictEqual(a.learnerStateVersion, b.learnerStateVersion, 'versi keadaan awal berbeda');
});

/* ========================================================================================
 * §1. BENAR vs SALAH — satu hal diubah, lima dimensi dibandingkan
 * ===================================================================================== */

test('§1 MASTERY bergerak ke arah berlawanan', () => {
  const ok = fork(RELIABLE_OK).trace, no = fork(RELIABLE_NO).trace;
  assert.ok(ok.masteryAfter.L > ok.masteryBefore.L, 'benar tidak menaikkan mastery');
  assert.ok(no.masteryAfter.L < no.masteryBefore.L, 'salah tidak menurunkan mastery');
  assert.ok(ok.masteryAfter.L > no.masteryAfter.L,
    `benar (${ok.masteryAfter.L}) tidak berakhir di atas salah (${no.masteryAfter.L})`);
});

test('§1 INGATAN: benar memperpanjang stabilitas, salah memendekkan', () => {
  const ok = fork(RELIABLE_OK).trace, no = fork(RELIABLE_NO).trace;
  assert.ok(ok.memoryAfter.stabilityDays > no.memoryAfter.stabilityDays,
    `stabilitas benar (${ok.memoryAfter.stabilityDays}) tidak di atas salah (${no.memoryAfter.stabilityDays})`);
});

test('§1 KEPUTUSAN BERIKUTNYA berbeda', () => {
  const ok = fork(RELIABLE_OK).trace, no = fork(RELIABLE_NO).trace;
  assert.notStrictEqual(ok.decision, no.decision,
    `keputusan sama ("${ok.decision}") untuk benar dan salah — bukti tidak sampai ke keputusan`);
});

test('§1 MISKONSEPSI hanya tercatat pada cabang yang salah', () => {
  const ok = fork(RELIABLE_OK);
  const no = fork({ ...RELIABLE_NO, chosenMisconception: 'past-simple-vs-present-perfect' });
  const entries = (l) => (l.ledger && l.ledger.entries) ? Object.keys(l.ledger.entries).length : 0;
  assert.strictEqual(entries(ok.learner), 0, 'jawaban benar menambah entri miskonsepsi');
  assert.ok(entries(no.learner) >= 1, 'jawaban salah ber-miskonsepsi tidak mencatat apa pun');
});

test('§1 seluruh trace berbeda — bukan hanya satu field yang kebetulan berubah', () => {
  const ok = fork(RELIABLE_OK).trace, no = fork(RELIABLE_NO).trace;
  const differing = ['masteryAfter', 'memoryAfter', 'decision', 'evidence']
    .filter((k) => JSON.stringify(ok[k]) !== JSON.stringify(no[k]));
  assert.ok(differing.length >= 3,
    `hanya ${differing.length} dimensi yang berbeda (${differing.join(', ')}) — reaksinya terlalu dangkal`);
});

/* ========================================================================================
 * §2. JAWABAN SAMA, KREDIBILITAS BERBEDA  ← counterfactual yang paling tajam
 *
 * Kedua cabang menjawab BENAR. Yang berbeda hanya seberapa layak jawaban itu dipercaya.
 * Kalau mesin memperlakukan keduanya sama, bobot bukti hanyalah hiasan.
 * ===================================================================================== */

test('§2 kappa berbeda untuk jawaban yang sama-sama BENAR', () => {
  const solid = fork(RELIABLE_OK).trace, guess = fork(GUESSED_OK).trace;
  assert.strictEqual(solid.evidence.correct, true);
  assert.strictEqual(guess.evidence.correct, true);
  assert.ok(guess.evidence.kappa < solid.evidence.kappa,
    `kappa tebakan (${guess.evidence.kappa}) tidak di bawah kappa jawaban dipikirkan (${solid.evidence.kappa})`);
});

test('§2 MASTERY bergerak lebih sedikit saat buktinya lemah — diskonnya SAMPAI ke keputusan', () => {
  const solid = fork(RELIABLE_OK).trace, guess = fork(GUESSED_OK).trace;
  const dSolid = solid.masteryAfter.L - solid.masteryBefore.L;
  const dGuess = guess.masteryAfter.L - guess.masteryBefore.L;
  assert.ok(dGuess < dSolid,
    `kenaikan menebak (${dGuess.toFixed(4)}) tidak di bawah kenaikan berpikir (${dSolid.toFixed(4)}) — ` +
    'kappa dicatat tetapi tidak dipakai');
  assert.ok(dGuess > 0, 'jawaban benar-tapi-menebak seharusnya tetap bukti positif, hanya lebih lemah');
});

test('§2 BEBAN BAHASA: jawaban salah yang sama dihukum lebih ringan bila soalnya berat', () => {
  const plain = fork(RELIABLE_NO).trace;
  const heavy = fork({ ...RELIABLE_NO, langLoad: 'full_en' }).trace;
  assert.ok(heavy.evidence.kappa < plain.evidence.kappa,
    `kappa berbeban-bahasa (${heavy.evidence.kappa}) tidak di bawah biasa (${plain.evidence.kappa})`);
  assert.ok(heavy.masteryAfter.L > plain.masteryAfter.L,
    `mastery jatuh sama dalamnya (${heavy.masteryAfter.L} vs ${plain.masteryAfter.L}) — ` +
    'kegagalan MEMBACA soal dihukum sebagai kegagalan tata bahasa');
});

/* ========================================================================================
 * §3. DI MANA MESIN TIDAK BEREAKSI — dicatat sebagai TEMUAN, bukan disembunyikan
 * ===================================================================================== */

test('§3 batas jujur: satu jawaban tidak menggeser kesulitan item yang dipilih', () => {
  const ok = fork(RELIABLE_OK).trace, no = fork(RELIABLE_NO).trace;
  // Ini BUKAN cacat: kalibrasi item sengaja memakai shrinkage + MIN_N_APPLY supaya satu
  // jawaban tidak mengguncang kesulitan sebuah soal. Dicatat di sini supaya batasnya
  // terlihat dan tidak ada yang mengira Braincore "menyesuaikan kesulitan seketika".
  assert.strictEqual(ok.difficultyState.effective, no.difficultyState.effective,
    'satu jawaban SUDAH menggeser kesulitan efektif — shrinkage kalibrasi tidak bekerja');
});

test('§3 gerbang mastery tidak terbuka oleh satu jawaban benar', () => {
  const ok = fork(RELIABLE_OK);
  assert.strictEqual(BKT.masteryGate(ok.learner.bkt, 'past-simple'), false,
    'empat jawaban benar sudah cukup dinyatakan menguasai — gerbang dua-syarat tidak bekerja');
});

/* ========================================================================================
 * §4. TIDAK ADA GALAT YANG DITELAN DI SELURUH SKENARIO
 * ===================================================================================== */

test('§4 tidak satu pun cabang menghasilkan galat penjaga yang tertelan', () => {
  for (const [label, ans] of [
    ['benar', RELIABLE_OK], ['salah', RELIABLE_NO], ['tebakan', GUESSED_OK],
    ['beban bahasa', { ...RELIABLE_NO, langLoad: 'full_en' }],
    ['salah + miskonsepsi', { ...RELIABLE_NO, chosenMisconception: 'm1' }]
  ]) {
    assert.deepStrictEqual(fork(ans).guardErrors, [], `penjaga menelan galat di cabang "${label}"`);
  }
});

console.log(failures ? 'Counterfactual: FAIL (' + failures + ' kegagalan)' : 'Counterfactual: PASS');
process.exit(failures ? 1 : 0);
