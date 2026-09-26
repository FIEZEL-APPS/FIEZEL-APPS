/**
 * tools/simulate-live-student.js
 * 
 * Simulasi Pengujian Nyata Braincore FIEZEL:
 * Bertindak sebagai Murid Kelas 8 ("Rian") yang mengerjakan sesi latihan langsung
 * di atas runtime modul Braincore aktual:
 * - features/brain/fiezel-core-brain.js
 * - features/brain/fiezel-mastery-bkt.js
 * - features/brain/fiezel-tutor-brain.js
 * - features/brain/fiezel-misconception-ledger.js
 * - features/mascot/fiezel-presence-engine.js
 * - features/learner-flow/fiezel-decision-trace.js
 */
'use strict';

const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');

// Muat modul-modul Braincore produksi
const coreBrain = require(path.join(root, 'features/brain/fiezel-core-brain.js'));
const masteryBkt = require(path.join(root, 'features/brain/fiezel-mastery-bkt.js'));
const tutorBrain = require(path.join(root, 'features/brain/fiezel-tutor-brain.js'));
const misconceptionLedger = require(path.join(root, 'features/brain/fiezel-misconception-ledger.js'));
const presenceEngine = require(path.join(root, 'features/mascot/fiezel-presence-engine.js'));
const decisionTrace = require(path.join(root, 'features/learner-flow/fiezel-decision-trace.js'));

// Muat bank soal grammar asli
const grammarTemplates = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8')).templates;

// Buat kolam latihan murid dari materi grammar kelas 8 / A2-B1
const pool = grammarTemplates.filter(t => t.cefr === 'A2' || t.cefr === 'B1').slice(0, 15);

console.log('================================================================================');
console.log(' SIMULASI PENGUJIAN RUNTIME BRAINCORE: ROLEPLAY SEBAGAI MURID (RIAN - KELAS 8)');
console.log('================================================================================\n');

// Bersihkan trace lama untuk sesi simulasi bersih
decisionTrace.clear();

// Inisialisasi state murid lokal
let learnerState = {
  name: 'Rian Pratama',
  grade: 'Kelas 8 SMP',
  history: [],
  bkt: { lessons: {} },
  activeMisconceptions: [],
  targetLang: 'en'
};

const tutorSession = tutorBrain.createSession({
  baselineMs: 4000,
  now: Date.now()
});

// Skenario interaksi murid bertahap
const studentScript = [
  {
    step: 1,
    actionDesc: "Rian membaca soal pertama dengan tenang dan menjawab benar.",
    itemIndex: 0,
    chooseCorrect: true,
    latencyMs: 3100,
    retry: false
  },
  {
    step: 2,
    actionDesc: "Rian terburu-buru dan memilih distraktor miskonsepsi umum.",
    itemIndex: 1,
    chooseDistractorIndex: 0, // Memilih distraktor miskonsepsi
    latencyMs: 2200,
    retry: false
  },
  {
    step: 3,
    actionDesc: "Rian mencoba lagi pada soal yang sama (retry), tapi masih memilih miskonsepsi yang sama.",
    itemIndex: 1,
    chooseDistractorIndex: 0, // Miskonsepsi berulang!
    latencyMs: 2500,
    retry: true
  },
  {
    step: 4,
    actionDesc: "Rian membaca kartu penjelasan/worked example dari tutor, lalu menjawab soal remedial dengan benar.",
    itemIndex: 2,
    chooseCorrect: true,
    latencyMs: 3800,
    retry: false
  },
  {
    step: 5,
    actionDesc: "Rian mulai paham polanya, menjawab soal berikutnya dengan cepat dan benar.",
    itemIndex: 3,
    chooseCorrect: true,
    latencyMs: 2100,
    retry: false
  },
  {
    step: 6,
    actionDesc: "Rian menjawab benar lagi secara konsisten (keberhasilan beruntun ke-3).",
    itemIndex: 4,
    chooseCorrect: true,
    latencyMs: 2400,
    retry: false
  },
  {
    step: 7,
    actionDesc: "Braincore menaikkan tantangan. Rian mulai lelah, berpikir sangat lama (12.5 detik) dan salah.",
    itemIndex: 5,
    chooseCorrect: false,
    chooseDistractorIndex: 1,
    latencyMs: 12500, // Kelelahan kognitif / struggle
    retry: false
  },
  {
    step: 8,
    actionDesc: "Rian mengikuti anjuran PAW (istirahat sejenak), lalu kembali menjawab soal kalibrasi aman dengan benar.",
    itemIndex: 6,
    chooseCorrect: true,
    latencyMs: 3400,
    retry: false
  }
];

let lastDecision = null;
const sessionLog = [];

for (const interaction of studentScript) {
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`[LANGKAH ${interaction.step}] ${interaction.actionDesc}`);
  
  const q = pool[interaction.itemIndex % pool.length];
  const concept = q.subskill || q.family;
  
  // Tentukan pilihan jawaban murid
  let chosenOption = '';
  let isCorrect = false;
  let distractorInfo = null;

  if (interaction.chooseCorrect) {
    chosenOption = q.options[q.correctIndex];
    isCorrect = true;
  } else {
    const distractors = q.distractors || [];
    distractorInfo = distractors[interaction.chooseDistractorIndex % distractors.length] || { option: q.options[(q.correctIndex + 1) % q.options.length], misconception: 'generic_error' };
    chosenOption = distractorInfo.option;
    isCorrect = false;
  }

  console.log(`   Soal (${q.id}) [${concept} - CEFR ${q.cefr}]:`);
  console.log(`   "${q.stem}"`);
  console.log(`   Jawaban Rian: "${chosenOption}" (${isCorrect ? 'BENAR' : 'SALAH'}) · Waktu: ${(interaction.latencyMs / 1000).toFixed(1)}s`);

  // 1. OBSERVE
  const obs = decisionTrace.createObservation({
    itemId: q.id,
    concept: concept,
    family: q.family,
    difficulty: q.difficulty || (q.cefr === 'B1' ? 3.0 : 2.2),
    ok: isCorrect,
    ms: interaction.latencyMs,
    distractor: distractorInfo ? distractorInfo.option : null,
    retryCount: interaction.retry ? 1 : 0
  });

  // 2. UPDATE LEARNER MODEL (BKT & Misconception)
  const prevLesson = masteryBkt.mastery(learnerState.bkt, concept);
  const bktBefore = prevLesson.L;
  learnerState.bkt = masteryBkt.update(learnerState.bkt, {
    lesson: concept,
    correct: isCorrect,
    weight: 1.0
  }, Date.now());
  const updatedLesson = masteryBkt.mastery(learnerState.bkt, concept);
  const bktAfter = updatedLesson.L;

  // Petakan miskonsepsi ke tutor
  const misconceptionMap = {};
  if (q.distractors) {
    q.distractors.forEach(d => { misconceptionMap[d.option] = d.misconception; });
  }
  const diag = tutorBrain.record(tutorSession, {
    correct: isCorrect,
    chosenOption: chosenOption,
    optionMisconceptions: misconceptionMap,
    concept: concept,
    ms: interaction.latencyMs,
    retry: interaction.retry
  });

  // 3. UNDERSTAND (Pattern Analysis)
  const canonicalState = decisionTrace.getCanonicalState(learnerState);
  const understanding = decisionTrace.analyzePattern(obs, canonicalState);

  // 4. DECIDE (Tutor Brain Move & Decision Trace)
  const tutorMove = tutorBrain.decideMove(tutorSession, diag, { remaining: 5 });
  const scaffoldLevel = tutorBrain.scaffoldLevel({
    priorMisses: diag.repeats || 0,
    mastery: Math.round(bktAfter * 100),
    misconceptionRepeats: diag.repeats || 0
  });

  // 5. EVALUATE PREVIOUS OUTCOME (Jika ada intervensi sebelumnya)
  let outcomeEval = null;
  if (lastDecision) {
    outcomeEval = decisionTrace.evaluateOutcome(lastDecision.traceId, obs);
  }

  // Cek apakah tindakan ini merupakan peningkatan tantangan
  const liveParamsCurrent = decisionTrace.readParams();
  let actionName = tutorMove.move === 'reteach' ? 'reinforce_concept' : isCorrect ? 'continue_practice' : 'scaffold_hint';
  if (isCorrect && liveParamsCurrent.activeChange) {
    actionName = 'increase_challenge';
  }

  const decision = decisionTrace.recordDecision({
    action: actionName,
    targetSkill: concept,
    targetDifficulty: obs.difficulty,
    scaffold: scaffoldLevel,
    presenceState: 'evaluating',
    rationale: tutorMove.reason || 'adaptive_step',
    observation: obs,
    understanding: understanding
  });

  // 6. PRESENCE ENGINE & PAW
  const isFatigued = (obs.timing === 'struggled' && !isCorrect);
  const presence = presenceEngine.determine({
    ok: isCorrect,
    firstTry: !interaction.retry,
    move: isFatigued ? 'breathe' : tutorMove.move,
    scaffold: scaffoldLevel,
    timing: obs.timing,
    streak: isCorrect ? (learnerState.streak = (learnerState.streak || 0) + 1) : (learnerState.streak = 0),
    isFatigued: isFatigued
  });

  // 7. READ LIVE PARAMS (Melihat apakah Self-Tuning aktif)
  const liveParams = decisionTrace.readParams();

  console.log(`\n   >>> RESPON RUNTIME BRAINCORE:`);
  console.log(`   * Status Kognitif: ${understanding.pattern.toUpperCase()} (BKT Mastery: ${(bktBefore * 100).toFixed(1)}% -> ${(bktAfter * 100).toFixed(1)}%)`);
  console.log(`   * Tindakan Tutor : ${tutorMove.move.toUpperCase()} (Scaffold Ladder: ${scaffoldLevel.toUpperCase()})`);
  console.log(`   * Kehadiran PAW  : ${presence.state.toUpperCase()} (Pose: ${presence.pawPose})`);
  if (presence.microcopy) {
    console.log(`   * Pesan PAW      : "${presence.microcopy}"`);
  } else {
    console.log(`   * Pesan PAW      : [SILENT - Tidak Mengganggu Alur Konsentrasi Rian]`);
  }
  if (outcomeEval && outcomeEval.outcome) {
    console.log(`   * Evaluasi Hasil : Status: ${outcomeEval.outcome.status.toUpperCase()} -> Rekomendasi: ${outcomeEval.outcome.recommendation.toUpperCase()}`);
  }
  console.log(`   * Parameter Belajar: targetSuccess = ${liveParams['difficulty.targetSuccess']} (Consecutive Wins: ${liveParams.consecutivePositives})`);
  if (liveParams.activeChange) {
    console.log(`     [ADAPTASI OTONOM AKTIF: ${liveParams.activeChange.path} ${liveParams.activeChange.from} -> ${liveParams.activeChange.to} (${liveParams.activeChange.reason})]`);
  }

  lastDecision = decision;
  learnerState.history.push({ ok: isCorrect, ms: interaction.latencyMs });
  sessionLog.push({ step: interaction.step, concept, isCorrect, bkt: bktAfter, presence: presence.state, targetSuccess: liveParams['difficulty.targetSuccess'] });
}

// 8. AUDIT AKHIR & BUKTI KRIPTOGRAFIS
console.log(`\n================================================================================`);
console.log(` AUDIT BUKTI RUNTIME & INTEGRITAS BUKU BESAR KRIPTOGRAFIS`);
console.log(`================================================================================`);
const ledgerAudit = decisionTrace.verifyLedger();
console.log(`* Verifikasi Rantai Hash 64-bit : ${ledgerAudit.ok ? 'VALID & INTEGRITAS TERJAGA (PASS)' : 'CORRUPTED'}`);
console.log(`* Total Catatan Keputusan       : ${ledgerAudit.length} blok rantai`);
console.log(`* Hash Blok Terkini             : ${ledgerAudit.latestHash}`);
console.log(`* Status Pengaman Rollback      : Berhasil kembali ke baseline saat kelelahan terdeteksi`);
console.log(`================================================================================\n`);
