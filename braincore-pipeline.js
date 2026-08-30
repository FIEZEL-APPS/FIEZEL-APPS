/**
 * FIEZEL Braincore Pipeline — satu interaksi belajar, dijalankan lewat modul Braincore YANG
 * SESUNGGUHNYA (Fase 2 / Phase C).
 *
 * APA INI. Perkabelan yang MENIRU jalur produksi di app.js — evidence -> kredibilitas ->
 * mastery -> ingatan -> miskonsepsi -> kesulitan -> tindakan berikut — tetapi bisa dijalankan
 * di Node tanpa DOM. Setiap langkah memanggil modul asli di features/brain/. TIDAK ADA satu pun
 * tiruan modul Braincore di sini; yang disediakan hanya keadaan murid dan soalnya.
 *
 * KENAPA BUKAN MENJALANKAN app.js LANGSUNG. app.js butuh DOM, jaringan, dan storage, dan
 * membungkus semuanya berarti menguji tiruan browser, bukan menguji Braincore. Braincore justru
 * dirancang supaya ini mungkin: 21 modulnya murni, jadi jalur keputusannya bisa dijalankan apa
 * adanya. Pipeline ini adalah pembuktian sifat itu, sekaligus alat ukurnya.
 *
 * BATAS YANG HARUS DIBACA SEBELUM MEMERCAYAI ANGKANYA. Pipeline ini menyalin URUTAN dan
 * PARAMETER yang dipakai app.js, tetapi ia BUKAN app.js. Kalau app.js berubah dan berkas ini
 * tidak, keduanya menyimpang tanpa ada yang tahu. Karena itu titik-titik sambungnya ditulis
 * dengan nomor baris app.js di setiap langkah, dan gerbangnya (braincore-pipeline-test.js)
 * memeriksa bahwa nomor-nomor itu masih menunjuk kode yang sama. Alat ukur yang diam-diam
 * mengukur hal lain lebih berbahaya daripada tidak ada alat ukur.
 *
 * MURNI DAN DETERMINISTIK. Tanpa jam, tanpa acak: `now` selalu disuntikkan pemanggil. Dua
 * pemanggilan dengan masukan identik menghasilkan keadaan DAN trace yang identik — syarat mutlak
 * supaya dua rilis Braincore bisa dibandingkan (Phase P).
 */
'use strict';

const path = require('path');
const B = (f) => require(path.join(__dirname, 'features', 'brain', f));

const Credibility = B('fiezel-evidence-credibility.js');
const BKT         = B('fiezel-mastery-bkt.js');
const CoreBrain   = B('fiezel-core-brain.js');
const Ledger      = B('fiezel-misconception-ledger.js');
const ItemPrior   = B('fiezel-item-prior.js');
const Calibration = B('fiezel-item-calibration.js');
const TutorBrain  = B('fiezel-tutor-brain.js');
const Affect      = B('fiezel-affect.js');
const Trace       = B('fiezel-decision-trace.js');
const Manifest    = B('fiezel-brain-manifest.js');

/** Keadaan murid kosong. Bentuknya mengikuti kunci penyimpanan app.js satu per satu. */
function createLearner(opts = {}) {
  return {
    level: String(opts.level || 'A2'),
    stateRevision: 0,
    bkt: { schema: BKT.SCHEMA, lessons: {} },      // fiezel-mastery-bkt-v1
    ledger: null,                                   // fiezel-misconception-ledger-v1
    calibration: null,                              // fiezel-item-calibration-v1
    memory: {},                                     // per-konsep {stabilityDays, lastSeenMs}
    history: [],                                    // baris riwayat, seperti state.history
    affectRows: [],                                 // jendela 64 jawaban (app.js:2234)
    affectState: 'neutral',
    affectConfidence: 0,
    affectChanged: false,
    tutor: TutorBrain.createSession({ now: Number(opts.now) || 0, baselineMs: Number(opts.baselineMs) || 0 })
  };
}

/** Kemampuan laten dari riwayat — cermin coreBrainAttempts/estimateAbility (app.js:2155). */
function ability(learner) {
  const rows = learner.history.map((h) => ({
    correct: h.correct, difficulty: h.difficulty, level: learner.level,
    credibility: h.kappa == null ? 1 : h.kappa
  }));
  if (!rows.length) return null;
  try {
    const est = CoreBrain.estimateAbility(rows, { level: learner.level });
    return est && isFinite(est.ability) ? est.ability : null;
  } catch (_) { return null; }
}

/**
 * Satu jawaban, lewat seluruh jalur keputusan.
 *
 * @param {object} learner  dari createLearner()
 * @param {object} question {id, concept, lesson, level, domain, mode, stemLength, misconception}
 * @param {object} answer   {correct, ms, timing, langLoad, integrity, chosenMisconception}
 * @param {number} now      milidetik yang DISUNTIKKAN — tidak ada jam di dalam
 * @returns {{trace: object, learner: object, decision: object}}
 */
function answer(learner, question, answerInput, now) {
  const q = question || {};
  const a = answerInput || {};
  const nowMs = Number(now) || 0;
  const correct = a.correct === true;

  // ---- 1. KESULITAN SEBELUM MENJAWAB (app.js:2958 buildAdaptivePool) -----------------
  // Prior menimpa difficulty soal; kalibrasi mengoreksinya dari murid nyata.
  // ItemPrior.difficultyFor() mengembalikan ANGKA, bukan objek — diverifikasi dengan
  // memanggilnya, bukan diasumsikan dari namanya. (Asumsi pertama saya salah, dan
  // `prior.difficulty` yang undefined diam-diam menjadi 0 di trace.)
  const priorRaw = ItemPrior.difficultyFor({
    level: q.level || learner.level, domain: q.domain || 'grammar',
    mode: q.mode || 'mcq', stemLength: Number(q.stemLength) || 0
  });
  const prior = { rationale: [] };
  const priorValue = isFinite(Number(priorRaw)) ? Number(priorRaw) : null;
  let effective = priorValue;
  try {
    const eff = Calibration.effective(learner.calibration, String(q.id || ''), priorValue);
    const effNum = (eff && typeof eff === 'object') ? Number(eff.difficulty) : Number(eff);
    if (isFinite(effNum)) effective = effNum;
  } catch (_) { /* modul absen = prior dipakai apa adanya, persis guard app.js */ }

  // ---- 2. PREDIKSI SAAT PENYAJIAN (app.js:7640 -> quizPredictedSuccess app.js:2158) ---
  const abilityNow = ability(learner);
  let predicted = null;
  if (abilityNow !== null && isFinite(effective)) {
    const p = Number(CoreBrain.successProbability(abilityNow, effective));
    if (isFinite(p)) predicted = Math.max(0, Math.min(1, p));
  }

  // ---- 3. KREDIBILITAS BUKTI (app.js:2165 evidenceKappa) -----------------------------
  const weighed = Credibility.weigh({
    timing: Math.max(0, Number(a.ms) || 0),
    learnerLevel: q.level || learner.level,
    ...(a.langLoad ? { langLoad: a.langLoad } : {}),
    ...(a.integrity ? { integrity: a.integrity } : {}),
    ...(Number(a.replayCount) > 0 ? { replayCount: Number(a.replayCount) } : {})
  });
  const kappa = weighed && isFinite(weighed.kappa) ? Math.max(0, Math.min(1, weighed.kappa)) : null;

  // ---- 4. POTRET SEBELUM (untuk trace + counterfactual Fase E) ------------------------
  const lesson = String(q.lesson || q.concept || '');
  const masteryBefore = BKT.mastery(learner.bkt, lesson);
  const memBefore = learner.memory[lesson] || null;
  const memoryBefore = memBefore ? {
    stabilityDays: memBefore.stabilityDays,
    retrievability: Number(CoreBrain.retrievability(
      memBefore.stabilityDays, Math.max(0, (nowMs - (memBefore.lastSeenMs || nowMs)) / 86400000)))
  } : null;

  // ---- 5. MASTERY (app.js:2196 bktRecord; bobot = kappa, cloze 1.5) -------------------
  const weight = Number(a.weight) > 0 ? Number(a.weight) : (kappa == null ? 1 : kappa);
  const bktNext = BKT.update(learner.bkt, { lesson, correct, weight }, nowMs);

  // ---- 6. INGATAN (app.js:1731 scheduleNext -> CoreBrain.updateMemory) ----------------
  const priorStability = memBefore && memBefore.stabilityDays > 0 ? memBefore.stabilityDays : null;
  const ageDays = memBefore ? Math.max(0, (nowMs - (memBefore.lastSeenMs || nowMs)) / 86400000) : 0;
  const startStability = priorStability !== null ? priorStability
    : Number(CoreBrain.halfLife({ successes: correct ? 1 : 0, lapses: correct ? 0 : 1, lapseBurden: correct ? 0 : 1,
                                  difficulty: isFinite(effective) ? effective : 3 }));
  const retrAtReview = Number(CoreBrain.retrievability(startStability, ageDays));
  const updated = CoreBrain.updateMemory({
    stability: startStability,
    retrievability: Math.max(0, Math.min(1, isFinite(retrAtReview) ? retrAtReview : 1)),
    difficulty: isFinite(effective) ? effective : 3,
    ok: correct
  });
  const nextStability = updated && isFinite(updated.stability) ? updated.stability : startStability;

  // ---- 7. MISKONSEPSI (app.js:2136 MisconceptionLedger.update) ------------------------
  let ledgerNext = learner.ledger;
  if (!correct && a.chosenMisconception) {
    try {
      ledgerNext = Ledger.update(learner.ledger, {
        concept: String(q.concept || lesson),
        misconception: String(a.chosenMisconception),
        sessionId: String(tutorSession.startedAt),
        timing: String(a.timing || 'normal')
      }, nowMs);
    } catch (_) { /* guard, persis app.js */ }
  }

  // ---- 8. KALIBRASI ITEM (app.js itemCalibrationObserve) ------------------------------
  let calibrationNext = learner.calibration;
  try {
    calibrationNext = Calibration.observe(learner.calibration,
      { itemId: String(q.id || ''), correct, weight: kappa == null ? 1 : kappa, prior: priorValue }, nowMs);
  } catch (_) { /* guard */ }

  // ---- 9. AFEK (app.js:2234 affectObserve) -------------------------------------------
  const affectRows = learner.affectRows.concat([{
    ok: correct, ms: Math.max(0, Number(a.ms) || 0),
    concept: String(q.concept || lesson), timing: String(a.timing || '')
  }]).slice(-64);
  let affectState = learner.affectState, affectConfidence = learner.affectConfidence,
      affectChanged = learner.affectChanged;
  try {
    const res = Affect.assess(affectRows, {
      previous: learner.affectState, previousConfidence: learner.affectConfidence,
      changedAlready: learner.affectChanged
    });
    const nextState = String((res && res.state) || 'neutral');
    if (nextState !== affectState) { affectState = nextState; affectChanged = true; }
    affectConfidence = Math.max(0, Math.min(1, Number(res && res.confidence) || 0));
  } catch (_) { /* guard */ }

  // Target sukses digeser afek — app.js:2255 affectTargetSuccess()
  const targetSuccess = affectState === 'frustrated' ? 0.90 : affectState === 'bored' ? 0.75 : 0.80;

  // ---- 10. KEPUTUSAN TUTOR (app.js:2795 tutorObserve -> record + decideMove) ----------
  //
  // TEMUAN, dan ia menentukan kebenaran seluruh Fase D/E: `TutorBrain.record()` MEMUTASI
  // sesi yang diberikan kepadanya, di tempat. Di produksi itu memang yang diinginkan —
  // app.js memegang SATU sesi yang harus menumpuk sepanjang kuis. Tetapi di sini, kalau
  // sesi itu dipakai apa adanya, `answer()` berhenti murni: dua skenario counterfactual yang
  // berangkat dari murid yang sama akan saling mencemari lewat sesi yang mereka bagi, dan
  // perbandingannya menghasilkan angka yang terlihat rapi tetapi salah.
  //
  // Ditangkap gerbangnya sendiri ("keadaan murid TIDAK dimutasi di tempat"), bukan ditemukan
  // belakangan setelah Fase E terlanjur melaporkan hasil. Sesi disalin dulu; salinan itulah
  // yang dimutasi dan dikembalikan bersama murid barunya.
  const tutorSession = JSON.parse(JSON.stringify(learner.tutor));
  const diagnosis = TutorBrain.record(tutorSession, {
    correct, skill: lesson, concept: String(q.concept || lesson),
    ms: Math.max(0, Number(a.ms) || 0), now: nowMs,
    ...(a.chosenMisconception ? { optionMisconceptions: { chosen: String(a.chosenMisconception) },
                                  chosenOption: 'chosen' } : {})
  });
  let move = null;
  try { move = TutorBrain.decideMove(tutorSession, diagnosis, { remaining: 10 }); } catch (_) { move = null; }

  // ---- 11. KEADAAN SESUDAH -----------------------------------------------------------
  const masteryAfter = BKT.mastery(bktNext, lesson);
  const memoryAfter = {
    stabilityDays: nextStability,
    retrievability: Number(CoreBrain.retrievability(nextStability, 0))
  };

  const activeMisconceptions = (() => {
    try { const rows = Ledger.active(ledgerNext, nowMs); return Array.isArray(rows) ? rows : []; }
    catch (_) { return []; }
  })();

  // ---- 12. TRACE ---------------------------------------------------------------------
  const decision = normalizeDecision(move);
  const reasonCodes = collectReasons([weighed, diagnosis, move, prior]);
  const trace = Trace.build({
    braincoreVersion: Manifest.bundleVersion,
    sessionId: tutorSession.startedAt,
    learnerStateVersion: learner.stateRevision + 1,
    conceptId: String(q.concept || lesson),
    evidence: { correct, kappa, timing: String(diagnosis && diagnosis.timing || a.timing || ''), predicted },
    masteryBefore, masteryAfter,
    memoryBefore, memoryAfter,
    misconceptionState: {
      activeCount: activeMisconceptions.length,
      topCode: activeMisconceptions.length ? String(activeMisconceptions[0].misconception || activeMisconceptions[0].code || '') : ''
    },
    difficultyState: { prior: priorValue, effective, target: targetSuccess },
    decision,
    reasonCodes,
    confidence: (move && isFinite(move.confidence)) ? move.confidence
              : (diagnosis && isFinite(diagnosis.confidence)) ? diagnosis.confidence : null
  });

  const nextLearner = {
    ...learner,
    stateRevision: learner.stateRevision + 1,
    bkt: bktNext,
    ledger: ledgerNext,
    calibration: calibrationNext,
    memory: { ...learner.memory, [lesson]: { stabilityDays: nextStability, lastSeenMs: nowMs } },
    history: learner.history.concat([{ correct, difficulty: effective, kappa, concept: String(q.concept || lesson), at: nowMs }]).slice(-1000),
    affectRows, affectState, affectConfidence, affectChanged,
    tutor: tutorSession
  };

  return { trace, learner: nextLearner, decision: move, diagnosis };
}

/** Petakan keputusan tutor ke enum tertutup Decision Trace. Nilai asing menjadi 'unknown' —
 *  JUJUR, bukan ditebak jadi 'continue'. */
function normalizeDecision(move) {
  const raw = String((move && (move.move || move.decision)) || '').toLowerCase();
  if (Trace.DECISIONS.indexOf(raw) !== -1) return raw;
  if (raw === 'teach' || raw === 'reteach_concept') return 'reteach';
  if (raw === 'next') return 'continue';
  return raw ? 'unknown' : 'unknown';
}

/** Kumpulkan kode brain3_* dari keluaran modul. Hanya kode yang BENAR-BENAR dikembalikan
 *  modul — pipeline tidak pernah mengarang alasan. */
function collectReasons(outputs) {
  const out = [];
  for (const o of outputs) {
    if (!o) continue;
    const candidates = [].concat(o.rationale || [], o.reasons || [], o.rationaleCodes || []);
    for (const c of candidates) {
      const code = String(c || '').trim();
      if (/^brain3_[a-z0-9_]+$/.test(code) && out.indexOf(code) === -1) out.push(code);
    }
  }
  return out;
}

module.exports = { createLearner, answer, ability, normalizeDecision, collectReasons };
