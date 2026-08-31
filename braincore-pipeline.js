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
  //
  // CACAT SAYA YANG PALING MAHAL, dan ia keluarga yang sama dengan cacat kalibrasi di Fase G:
  // NAMA FIELD YANG SALAH. Versi pertama mengirim `correct`; `estimateAbility` membaca `ok`
  // (fiezel-core-brain.js:206 — `var actual = row.ok ? 1 : 0`). `row.ok` selalu undefined,
  // jadi `actual` selalu 0: penaksir diberi tahu murid SELALU SALAH, pada setiap jawaban,
  // selamanya. Taksirannya lari ke lantai 0,40 dan terpaku di sana sementara kemampuan sejati
  // murid 2,3-3,7.
  //
  // Akibatnya jauh lebih besar daripada satu angka yang meleset. `predicted` di trace dihitung
  // dari taksiran ini, dan `predicted` adalah besaran yang dipakai SELURUH perbandingan Fase H
  // dan studi Fase J. Vonis "Braincore terbukti lebih buruk daripada mesin dasar" diukur
  // dengan penaksir kemampuan Braincore yang tidak pernah diberi satu pun jawaban benar.
  // Vonis itu batal, dan penggantinya diukur ulang di AUDIT/12.
  //
  // Sekali lagi penjaga tidak bisa melihatnya: tidak ada yang dilempar. Modulnya menerima
  // baris tanpa `ok` sebagai baris yang jawabannya salah — itu masukan yang sah, bukan galat.
  // app.js:1974 mengirim `ok:!!h?.ok` dengan benar; bentuk di bawah sekarang mengikutinya.
  const rows = learner.history.map((h) => ({
    at: h.at,
    ok: h.correct === true,
    difficulty: h.difficulty,
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

  /* Sesi tutor DISALIN DI SINI, di paling atas — bukan di langkah 10 tempat ia dipakai.
   *
   * Versi pertama mendeklarasikannya di langkah 10 tetapi memakainya di langkah 7 (ledger
   * miskonsepsi). Itu temporal dead zone: `ReferenceError: Cannot access 'tutorSession'
   * before initialization`. Dan penjaga try/catch di langkah 7 MENELANNYA — jadi ledger
   * diam-diam tidak pernah terisi, dan profil "murid kesulitan" terlihat seperti ledger
   * Braincore yang rusak. Braincore-nya baik-baik saja; harness ini yang cacat, dan
   * cacatnya disembunyikan oleh penjaganya sendiri.
   *
   * Ini persis kelas cacat yang audit Fase 1 catat sebagai risiko (`catch{}` senyap di
   * app.js membuat modul yang gagal berhenti bekerja tanpa bersuara) — direproduksi di sini
   * oleh penulis catatan itu sendiri. Lihat guardErrors di bawah untuk penutupnya. */

  /* PENJAGA YANG TIDAK BOLEH SENYAP.
   * Penjaga per-langkah dipertahankan karena app.js memang begitu — modul absen harus
   * mendegradasi, bukan meledak. Tetapi harness yang menyembunyikan galatnya sendiri tidak
   * berguna: setiap galat yang tertangkap DICATAT dan ikut dikembalikan, dan gerbangnya
   * meng-assert daftar itu KOSONG untuk masukan normal. Degradasi yang disengaja tetap
   * mungkin; degradasi yang tidak disadari tidak. */
  const tutorSession = JSON.parse(JSON.stringify(learner.tutor));

  const guardErrors = [];
  const guard = (stage, fn, fallback) => {
    try { return fn(); }
    catch (e) { guardErrors.push(stage + ': ' + (e && e.message ? e.message : String(e))); return fallback; }
  };

  // ---- 1. KESULITAN SEBELUM MENJAWAB (app.js:2958 buildAdaptivePool) -----------------
  // Prior menimpa difficulty soal; kalibrasi mengoreksinya dari murid nyata.
  // ItemPrior.difficultyFor() mengembalikan ANGKA, bukan objek — diverifikasi dengan
  // memanggilnya, bukan diasumsikan dari namanya. (Asumsi pertama saya salah, dan
  // `prior.difficulty` yang undefined diam-diam menjadi 0 di trace.)
  //
  // FASE F. Versi pertama memanggil `difficultyFor()`, yang mengembalikan ANGKA saja, lalu
  // menaruh `const prior = { rationale: [] }` sebagai penampung kosong dan menyerahkannya ke
  // pengumpul alasan. Penampung itu tidak pernah terisi apa pun: pipeline bertanya "kenapa
  // segini?" kepada objek yang memang tidak tahu. `ItemPrior.explain()` adalah fungsi yang
  // SUDAH ADA di modul yang sama dan mengembalikan angka yang sama BESERTA rationale-nya.
  // Jadi alasannya tidak perlu dikarang — ia hanya perlu diminta.
  const prior = ItemPrior.explain({
    level: q.level || learner.level, domain: q.domain || 'grammar',
    // 'complete_sentence' adalah mode default jalur polos di app.js:2354 — BUKAN 'mcq'.
    // Lihat catatan TEMUAN FASE F di bawah: 'mcq' bukan anggota MODE_COST sama sekali.
    mode: q.mode || 'complete_sentence', stemLength: Number(q.stemLength) || 0
  });
  const priorValue = isFinite(Number(prior && prior.difficulty)) ? Number(prior.difficulty) : null;
  let effective = priorValue;
  // `eff` DIANGKAT keluar dari try. Sebelumnya ia hidup dan mati di dalam blok itu, jadi
  // `brain3_item_calibration_*` — yang terbit pada SETIAP jawaban — dihitung lalu dibuang
  // satu baris kemudian. Yang diambil hanya angkanya.
  let eff = null;
  try {
    eff = Calibration.effective(learner.calibration, String(q.id || ''), priorValue);
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
    ledgerNext = guard('ledger', () => Ledger.update(learner.ledger, {
      concept: String(q.concept || lesson),
      misconception: String(a.chosenMisconception),
      sessionId: String(tutorSession.startedAt),
      timing: String(a.timing || 'normal')
    }, nowMs), learner.ledger);
  }

  // ---- 8. KALIBRASI ITEM (app.js itemCalibrationObserve) ------------------------------
  //
  // TEMUAN FASE G, DAN INI CACAT SAYA SENDIRI YANG PALING LAMA HIDUP. Versi pertama memanggil
  // observe() dengan nama field karangan — {correct, weight, prior} — padahal modulnya menuntut
  // {ok, kappa, priorDifficulty, ability}. observe() memvalidasi masukannya lalu MENGEMBALIKAN
  // STATE UTUH tanpa mencatat apa pun bila satu saja field wajib hilang (degradasi yang
  // disengaja, bukan bug modul). Jadi ia dipanggil pada setiap jawaban, mengembalikan objek
  // yang tampak sah, dan TIDAK PERNAH menyimpan satu pun bukti: `items` tetap {} selamanya.
  //
  // Akibatnya kalibrasi item adalah NO-OP di sepanjang Fase C, D, E, dan F. Kode alasan
  // brain3_item_calibration_prior_only yang muncul di setiap trace itu JUJUR — ia memang
  // melaporkan "belum ada data kalibrasi" — tetapi sebabnya bukan awal yang dingin, melainkan
  // berkas ini. Penjaga tidak bisa melihatnya karena tidak ada yang dilempar.
  //
  // app.js:2315 memanggilnya BENAR. Jadi ini murni cacat harness, bukan cacat produk, dan
  // tidak boleh dilaporkan sebagai "kalibrasi item rusak". Bentuk panggilan di bawah sekarang
  // sama persis dengan app.js:2315, termasuk syarat ability yang harus berhingga — pada
  // jawaban pertama seorang murid, ability memang belum ada, dan tidak mencatat di situ adalah
  // perilaku produksi, bukan kekurangan.
  const calibrationNext = guard('calibration', () => (abilityNow === null ? learner.calibration
    : Calibration.observe(learner.calibration, {
        itemId: String(q.id || ''),
        priorDifficulty: priorValue,
        ability: abilityNow,
        ok: correct,
        kappa: kappa == null ? 1 : kappa
      }, nowMs)), learner.calibration);

  // ---- 9. AFEK (app.js:2234 affectObserve) -------------------------------------------
  const affectRows = learner.affectRows.concat([{
    ok: correct, ms: Math.max(0, Number(a.ms) || 0),
    concept: String(q.concept || lesson), timing: String(a.timing || '')
  }]).slice(-64);
  let affectState = learner.affectState, affectConfidence = learner.affectConfidence,
      affectChanged = learner.affectChanged;
  // `affectAssessment` diangkat keluar dari try untuk alasan yang sama seperti `eff`: modul
  // afek menerbitkan brain3_affect_* pada setiap jawaban, dan sebelumnya kode itu lenyap
  // bersama variabel lokal blok try.
  let affectAssessment = null;
  try {
    affectAssessment = Affect.assess(affectRows, {
      previous: learner.affectState, previousConfidence: learner.affectConfidence,
      changedAlready: learner.affectChanged
    });
    const nextState = String((affectAssessment && affectAssessment.state) || 'neutral');
    if (nextState !== affectState) { affectState = nextState; affectChanged = true; }
    affectConfidence = Math.max(0, Math.min(1, Number(affectAssessment && affectAssessment.confidence) || 0));
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
  const diagnosis = TutorBrain.record(tutorSession, {
    correct, skill: lesson, concept: String(q.concept || lesson),
    ms: Math.max(0, Number(a.ms) || 0), now: nowMs,
    ...(a.chosenMisconception ? { optionMisconceptions: { chosen: String(a.chosenMisconception) },
                                  chosenOption: 'chosen' } : {})
  });
  //
  // TEMUAN FASE F, DARI KELUARGA YANG SAMA DENGAN KODE ALASAN YANG DIBUANG. Versi Fase C
  // memanggil decideMove dengan `{ remaining: 10 }` saja. app.js:2808 mengirim TIGA hal:
  // remaining yang nyata, keadaan lelah dari CoreBrain, dan keadaan afek bila bukan netral.
  // Akibat kekurangan itu, afek dihitung dengan rapi di langkah 9 lalu TIDAK PERNAH sampai ke
  // pemutus, dan tiga cabang decideMove yang ada di produksi — breathe/affect_frustrated,
  // stretch/affect_bored, wrapup/pool_exhausted — tidak bisa dicapai sama sekali oleh harness.
  // Mengukur mesin pada jalur yang lebih sempit daripada jalur produksinya, lalu melaporkan
  // cakupan, adalah cara paling halus untuk salah lapor. Sekarang bentuk konteksnya sama
  // persis dengan app.js:2808.
  const mAfterTutor = BKT.mastery(bktNext, lesson);
  const masteryAfterForTutor = mAfterTutor && isFinite(mAfterTutor.L) ? mAfterTutor.L : null;
  const fatigueState = guard('fatigue', () => {
    const f = CoreBrain.fatigue(affectRows);
    return f && f.state ? String(f.state) : '';
  }, '');
  let move = null;
  try {
    move = TutorBrain.decideMove(tutorSession, diagnosis, {
      remaining: Number(a.remaining) >= 0 ? Number(a.remaining) : 10,
      fatigue: fatigueState === 'unknown' ? '' : fatigueState,
      // Mastery BKT SESUDAH jawaban ini — cermin app.js, yang membaca state BKT yang sudah
      // ditulis bktRecord() sebelum tutorObserve() berjalan.
      ...(masteryAfterForTutor === null ? {} : { mastery: masteryAfterForTutor }),
      ...(affectState && affectState !== 'neutral' ? { affect: { state: affectState } } : {})
    });
  } catch (_) { move = null; }

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
  // FASE F — DARI MANA ALASAN DIKUMPULKAN.
  //
  // Daftar ini adalah temuan Fase F, bukan pilihan gaya. Versi Fase C mengumpulkan dari EMPAT
  // objek — [weighed, diagnosis, move, prior] — dan dari keempatnya hanya `weighed` yang
  // benar-benar membawa kode brain3_*, itu pun HANYA saat bukti didiskon. Akibatnya jawaban
  // benar biasa dan jawaban salah biasa — dua kejadian paling sering di seluruh produk —
  // tercatat dengan reasonCodes KOSONG. Mesin yang tidak bisa menjelaskan kasus yang paling
  // sering terjadi tidak bisa disebut bisa menjelaskan.
  //
  // Yang hilang bukan kodenya. Kodenya sudah dihitung, di langkah-langkah di atas, lalu
  // dibuang sebelum sampai ke trace: rationale ingatan (`updated`), afek, kalibrasi (`eff`),
  // prior, dan baris-baris ledger. Perbaikannya karena itu adalah MENDENGARKAN, bukan
  // menambah kecerdasan: tidak ada satu pun kode baru yang lahir di berkas ini.
  const reasonCodes = collectReasons([
    prior,                  // brain3_item_prior_*          (ItemPrior.explain)
    eff,                    // brain3_item_calibration_*    (Calibration.effective)
    weighed,                // brain3_evidence_*            (EvidenceCredibility.weigh)
    updated,                // brain3_memory_*              (CoreBrain.updateMemory)
    affectAssessment,       // brain3_affect_*              (Affect.assess)
    diagnosis, move         // tutor: lihat catatan di collectReasons()
  ].concat(activeMisconceptions));  // brain3_misconception_active (Ledger.active)
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
    // Kata asli tutor, disimpan berdampingan dengan enum. Pemetaan `stretch -> advance` adalah
    // klaim; dengan dua field ini klaim itu bisa diperiksa balik, bukan dipercaya begitu saja.
    decisionRaw: String((move && move.move) || ''),
    decisionReason: String((move && move.reason) || ''),
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

  return { trace, learner: nextLearner, decision: move, diagnosis, guardErrors };
}

/**
 * Petakan keputusan tutor ke enum tertutup Decision Trace.
 *
 * TEMUAN FASE F, DIUKUR BUKAN DIBACA. Peta versi Fase C hanya mengenal continue/hint/reteach
 * plus dua alias. `TutorBrain.decideMove()` menerbitkan DELAPAN gerakan. Lima di antaranya —
 * breathe, consolidate, celebrate, stretch, wrapup — jatuh ke 'unknown'. Artinya untuk mayoritas
 * kosakata tutor, trace mencatat "saya tidak tahu apa yang diputuskan" padahal tutornya
 * menyebutkan keputusannya dengan jelas. 'unknown' seperti itu bukan kejujuran, itu kebutaan
 * yang menyamar sebagai kejujuran.
 *
 * Peta di bawah karena itu LENGKAP terhadap kedelapan gerakan, dan gerbangnya
 * (braincore-explainability-test.js) membaca literal `move: '...'` langsung dari sumber
 * fiezel-tutor-brain.js lalu meng-assert tidak ada satu pun yang tak terpetakan. Kalau tutor
 * menumbuhkan gerakan kesembilan besok, gerbangnya merah — bukan trace-nya yang diam-diam
 * menulis 'unknown'.
 *
 * SETIAP BARIS ADALAH KLAIM, dan klaimnya ditulis supaya bisa dibantah:
 *   stretch     -> advance  naikkan tingkat: soalnya di bawah kemampuan sekarang
 *   consolidate -> review   benar tapi lambat: mantapkan dulu di sini, itu pengulangan
 *   celebrate   -> continue miskonsepsi terpecahkan; secara alur, ini tetap lanjut
 *   breathe     -> stop     berhenti karena lelah/beban — sesi disudahi
 *   wrapup      -> stop     soal habis — sesi disudahi
 * Yang hilang oleh pemetaan (celebrate vs continue TIDAK sama secara pedagogis) tersimpan utuh
 * di trace.decisionRaw, jadi tidak ada bukti yang menguap demi kerapian enum.
 */
const MOVE_TO_DECISION = Object.freeze({
  continue: 'continue', hint: 'hint', reteach: 'reteach',
  stretch: 'advance', consolidate: 'review',
  celebrate: 'continue', breathe: 'stop', wrapup: 'stop',
  // alias jalur lain di app.js, dipertahankan dari Fase C
  teach: 'reteach', reteach_concept: 'reteach', next: 'continue'
});

function normalizeDecision(move) {
  const raw = String((move && (move.move || move.decision)) || '').toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MOVE_TO_DECISION, raw)) return MOVE_TO_DECISION[raw];
  if (Trace.DECISIONS.indexOf(raw) !== -1) return raw;
  return 'unknown';   // benar-benar tidak dikenal — JUJUR, bukan ditebak jadi 'continue'
}

/**
 * Kumpulkan kode brain3_* dari keluaran modul. Hanya kode yang BENAR-BENAR dikembalikan
 * modul — pipeline tidak pernah mengarang alasan.
 *
 * KENAPA KOSAKATA TUTOR TIDAK DINAIKKAN KE brain3_. `TutorBrain.decideMove()` selalu memberi
 * alasan, dan alasannya bagus: on_track, miss_streak, persistent_misconception, too_easy,
 * cognitive_load_high, dan sembilan lainnya. Tetapi kosakatanya BUKAN brain3_*, jadi saringan
 * di bawah membuangnya. Godaannya jelas: tempel awalan, jadikan 'brain3_tutor_on_track', dan
 * cakupan alasan langsung 100%.
 *
 * Itu tidak dilakukan. Kode brain3_* adalah klaim bahwa modul yang memutuskan menerbitkan kode
 * itu; kode hasil tempelan akan terlihat persis sama di trace, dan pembeli yang memeriksa tidak
 * punya cara membedakan kode asli dari kode buatan pencatat. Kontrak trace menyebutnya lebih
 * dulu: "trace mencatat alasan, ia tidak menciptakannya." Sebagai gantinya alasan tutor dicatat
 * APA ADANYA di `trace.decisionReason` — tanpa pemetaan, tanpa awalan, hilang nol.
 *
 * Maka trace punya dua lapis penjelasan yang berbeda asalnya, dan perbedaan itu disengaja:
 *   reasonCodes     — kode brain3_* dari modul-modul PENGUKUR (bukti, mastery, ingatan,
 *                     afek, kalibrasi, prior, miskonsepsi). Kosakata terkunci, bisa dihitung.
 *   decisionReason  — satu alasan verbatim dari modul PEMUTUS. Selalu ada, tidak diterjemahkan.
 *
 * YANG SENGAJA TIDAK DIKUMPULKAN, supaya ketiadaannya tidak terbaca sebagai kelalaian.
 * `BKT.rootCause()` menerbitkan brain3_bkt_root_cause dan akan menambah satu alasan bertingkat
 * mastery yang bagus di sini. Ia TIDAK dipanggil, karena app.js juga tidak memanggilnya di jalur
 * ini: satu-satunya pemanggilnya (app.js:8338) ada di jalur BACA panel kemajuan, bukan di jalur
 * PUTUS per jawaban yang ditiru pipeline ini. Menambahkannya akan menaikkan angka cakupan sambil
 * membuat pipeline kurang setia pada jalur yang diukurnya — persis pertukaran yang ditolak
 * fase ini.
 */
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

/**
 * Mulai SESI baru untuk murid yang sama — meniru app.js, yang memanggil
 * TutorBrain.createSession() sekali per kuis, bukan sekali seumur hidup murid.
 *
 * KENAPA INI PENTING, dan kenapa ia ditambahkan sesudah gerbang menangkap ketiadaannya:
 * fiezel-misconception-ledger.js menuntut MIN_SESSIONS >= 2 sebelum sebuah miskonsepsi
 * boleh disebut aktif — pagar yang sengaja ada supaya satu sore yang buruk tidak cukup
 * untuk menuduh murid. Pipeline versi pertama memakai SATU sessionId selamanya, jadi
 * pagar itu MUSTAHIL dilewati dan profil "murid kesulitan" terlihat seperti ledger yang
 * rusak. Ledgernya benar; harness-nya yang tidak setia pada produksi.
 */
function newSession(learner, now) {
  return {
    ...learner,
    tutor: TutorBrain.createSession({ now: Number(now) || 0, baselineMs: 0 }),
    affectRows: [],            // jendela afek adalah per-sesi (app.js:2227 affectSessionSync)
    affectState: 'neutral',
    affectConfidence: 0,
    affectChanged: false
  };
}

module.exports = {
  MOVE_TO_DECISION, createLearner, newSession, answer, ability, normalizeDecision, collectReasons };
