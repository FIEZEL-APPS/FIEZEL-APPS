/**
 * FIEZEL Braincore Evidence — pembangun event lane bukti belajar
 * (`fiezel-braincore-evidence-v1`) di sisi perangkat.
 *
 * PERAN BERKAS INI, DAN APA YANG BUKAN PERANNYA
 * ---------------------------------------------
 * Ia MEMPROYEKSIKAN keadaan belajar yang sudah ada di perangkat (model
 * `fiezel-learner-evidence-v1` dari `remoteLearnerEvidenceSnapshot()` di app.js,
 * plus ringkasan keputusan Braincore) menjadi event ber-ENUM TERTUTUP. Ia TIDAK
 * membaca localStorage, TIDAK menyentuh jaringan, TIDAK punya jam internal, dan
 * TIDAK PERNAH mengubah keputusan belajar. Personal Brain tetap local-first:
 * berkas ini hanya membaca angka yang sudah dihitung Brain, lalu membulatkannya
 * ke bucket sehingga yang keluar dari perangkat bukan lagi profil seseorang
 * melainkan satu titik pada distribusi.
 *
 * PENGENAL MURID YANG MENJAGA PRIVASI (`cohort`)
 * ----------------------------------------------
 * Server harus bisa menjawab "berapa MURID yang terukur", jadi harus ada
 * pengenal. Bentuk yang dipilih:
 *   - 16 hex ACAK dari CSPRNG perangkat. BUKAN turunan nama, akun, installId,
 *     atau waktu — tidak ada yang bisa dibalik karena tidak ada yang dimasukkan.
 *   - Berotasi tiap 14 hari (`COHORT_EPOCH_DAYS`). Nilai lama TIDAK disimpan,
 *     jadi perangkat sendiri pun tidak bisa menyambung epoch lama ke baru.
 *   - Dipakai HANYA untuk hitungan distinct-per-hari di server, dan dipurge di
 *     sana setelah 14 hari.
 * Konsekuensi jujur yang harus diketahui pembaca berikutnya: dalam satu epoch,
 * server BISA melihat bahwa dua hari kirim berasal dari cohort yang sama. Itu
 * memang harga dari "jumlah murid" dan "tren", dan jendela 14 hari adalah batas
 * atas kemampuan itu — bukan efek samping yang tidak disadari.
 *
 * TANPA TIMESTAMP PRESISI. Satu-satunya waktu yang keluar adalah `day`
 * (YYYY-MM-DD) di amplop batch, dibentuk transport.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBraincoreEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-braincore-evidence-v1';
  /* Lane KEDUA: bukti yang sama, dikirim ke endpoint terautentikasi supaya
   * server bisa menempelkan `identity.sub` sendiri. Skema TERPISAH karena
   * amplopnya memang berbeda maksud — dan supaya satu batch tidak pernah bisa
   * mendarat di lane yang salah kalau endpoint tertukar. */
  var IDENTITY_SCHEMA = 'fiezel-braincore-learner-evidence-v1';
  var COHORT_EPOCH_DAYS = 14;
  var DAY_MS = 86400000;

  /* ---------------------------------------------------------------- enum */
  /* Daftar ini WAJIB identik dengan workers/api/evidence/evidence-core.js.
   * `tests/braincore-evidence-test.js` mengadu kedua berkas dan memerah kalau
   * menyimpang: klien yang mengirim nilai yang ditolak server akan retry
   * selamanya tanpa ada yang tahu. */
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  var SKILL_BUCKETS = [
    'pronouns', 'articles', 'nouns-plural', 'possession', 'determiners-quantifiers',
    'prepositions-place', 'prepositions-time', 'prepositions-movement', 'prepositions-dependent',
    'tense-present', 'tense-past', 'tense-perfect', 'tense-future', 'aspect-contrast',
    'conditionals', 'modals-ability', 'modals-obligation', 'modals-deduction',
    'passive-voice', 'reported-speech', 'questions', 'comparison', 'adverbs',
    'verb-patterns', 'clauses-relative', 'clauses-subordinate', 'agreement',
    'negation', 'discourse', 'other'
  ];
  var MASTERY_BUCKETS = ['m0-40', 'm40-60', 'm60-80', 'm80-100'];
  var TRENDS = ['up', 'flat', 'down'];
  var MISCONCEPTION_BUCKETS = ['none', 'mc1', 'mc2-3', 'mc4p'];
  var CALIBRATION = ['too_easy', 'calibrated', 'too_hard'];
  var CALIBRATION_ERROR = ['e0-10', 'e10-20', 'e20-40', 'e40p'];
  var CONSISTENCY_BUCKETS = ['c0-25', 'c25-50', 'c50-75', 'c75-100'];
  var RETENTION_RISK = ['r0-30', 'r30-60', 'r60-100'];
  var VOLUME_BUCKETS = ['n1-20', 'n21-100', 'n101p'];
  var IMPROVEMENT = ['improving', 'steady', 'declining'];
  var DECISIONS = ['due_review', 'weak_skill', 'target_difficulty', 'new_content', 'fallback'];
  var POLICY_IDS = ['core-brain-v3-default'];
  var OUTCOMES = ['positive', 'mixed', 'negative', 'insufficient'];
  var RECOMMENDATIONS = ['keep_or_progress', 'adjust', 'reduce_load', 'collect_more_evidence'];
  var DELTA_BUCKETS = ['d-neg', 'd0', 'd1-10', 'd10p'];
  var ADHERENCE_BUCKETS = ['a0-50', 'a50-80', 'a80-100'];

  var ENUMS = Object.freeze({
    level: LEVELS, skillBucket: SKILL_BUCKETS, mastery: MASTERY_BUCKETS, trend: TRENDS,
    misconception: MISCONCEPTION_BUCKETS, calibration: CALIBRATION, calibrationError: CALIBRATION_ERROR,
    consistency: CONSISTENCY_BUCKETS, retentionRisk: RETENTION_RISK, volume: VOLUME_BUCKETS,
    improvement: IMPROVEMENT, decision: DECISIONS, policyId: POLICY_IDS, outcome: OUTCOMES,
    recommendation: RECOMMENDATIONS, delta: DELTA_BUCKETS, adherence: ADHERENCE_BUCKETS
  });

  /* -------------------------------------------------------------- bucket */

  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }

  function bucketMastery(pct) {
    var n = num(pct); if (n === null) return null;
    if (n < 40) return 'm0-40';
    if (n < 60) return 'm40-60';
    if (n < 80) return 'm60-80';
    return 'm80-100';
  }
  /** Tren dari DELTA, bukan dari dua angka mentah: yang dikirim adalah arah. */
  function bucketTrend(delta) {
    var n = num(delta); if (n === null) return 'flat';
    if (n >= 3) return 'up';
    if (n <= -3) return 'down';
    return 'flat';
  }
  function bucketMisconception(count) {
    var n = num(count); if (n === null) return null;
    if (n <= 0) return 'none';
    if (n === 1) return 'mc1';
    if (n <= 3) return 'mc2-3';
    return 'mc4p';
  }
  /**
   * Kalibrasi kesulitan = selisih akurasi terukur terhadap PITA TARGET.
   * Terlalu banyak benar berarti soal terlalu mudah, bukan murid hebat.
   */
  function bucketCalibration(accuracy, targetLow, targetHigh) {
    var a = num(accuracy); if (a === null) return null;
    var lo = num(targetLow), hi = num(targetHigh);
    if (lo === null) lo = 60;
    if (hi === null) hi = 85;
    if (a > hi) return 'too_easy';
    if (a < lo) return 'too_hard';
    return 'calibrated';
  }
  /** Besar galat kalibrasi (poin persen dari pita), sudah dibucket. */
  function bucketCalibrationError(accuracy, targetLow, targetHigh) {
    var a = num(accuracy); if (a === null) return null;
    var lo = num(targetLow), hi = num(targetHigh);
    if (lo === null) lo = 60;
    if (hi === null) hi = 85;
    var err = a > hi ? a - hi : (a < lo ? lo - a : 0);
    if (err < 10) return 'e0-10';
    if (err < 20) return 'e10-20';
    if (err < 40) return 'e20-40';
    return 'e40p';
  }
  function bucketConsistency(pct) {
    var n = num(pct); if (n === null) return null;
    if (n < 25) return 'c0-25';
    if (n < 50) return 'c25-50';
    if (n < 75) return 'c50-75';
    return 'c75-100';
  }
  function bucketRetentionRisk(pct) {
    var n = num(pct); if (n === null) return null;
    if (n < 30) return 'r0-30';
    if (n < 60) return 'r30-60';
    return 'r60-100';
  }
  function bucketVolume(count) {
    var n = num(count); if (n === null || n < 1) return null;
    if (n <= 20) return 'n1-20';
    if (n <= 100) return 'n21-100';
    return 'n101p';
  }
  function bucketImprovement(delta) {
    var n = num(delta); if (n === null) return 'steady';
    if (n >= 5) return 'improving';
    if (n <= -5) return 'declining';
    return 'steady';
  }
  function bucketDelta(delta) {
    var n = num(delta); if (n === null) return 'd0';
    if (n < 0) return 'd-neg';
    if (n === 0) return 'd0';
    if (n <= 10) return 'd1-10';
    return 'd10p';
  }
  function bucketAdherence(pct) {
    var n = num(pct); if (n === null) return null;
    if (n < 50) return 'a0-50';
    if (n < 80) return 'a50-80';
    return 'a80-100';
  }
  /** Skill bebas -> famili tertutup. Yang tak dikenal jadi 'other', BUKAN dibuang:
   *  "ada miskonsepsi tapi di luar taksonomi" adalah informasi yang sah. */
  function skillFamily(skill) {
    var s = String(skill || '').toLowerCase();
    if (!s) return null;
    for (var i = 0; i < SKILL_BUCKETS.length; i++) {
      if (s === SKILL_BUCKETS[i]) return SKILL_BUCKETS[i];
    }
    if (/present_perfect|perfect/.test(s)) return 'tense-perfect';
    if (/past/.test(s)) return 'tense-past';
    if (/future|will|going_to/.test(s)) return 'tense-future';
    if (/present|simple_present/.test(s)) return 'tense-present';
    if (/conditional|if_clause/.test(s)) return 'conditionals';
    if (/passive/.test(s)) return 'passive-voice';
    if (/modal/.test(s)) return 'modals-ability';
    if (/prepos/.test(s)) return 'prepositions-place';
    if (/article/.test(s)) return 'articles';
    if (/pronoun/.test(s)) return 'pronouns';
    if (/plural|noun/.test(s)) return 'nouns-plural';
    if (/question/.test(s)) return 'questions';
    if (/compar/.test(s)) return 'comparison';
    if (/adverb/.test(s)) return 'adverbs';
    if (/relative/.test(s)) return 'clauses-relative';
    if (/report/.test(s)) return 'reported-speech';
    if (/negat/.test(s)) return 'negation';
    return 'other';
  }
  function level(v) {
    var s = String(v || '').toUpperCase();
    return LEVELS.indexOf(s) === -1 ? 'A1' : s;
  }

  /* -------------------------------------------------------------- cohort */

  /**
   * cohortState({stored, nowMs, randomHex}) -> {cohort, epoch, rotated}
   *
   * `stored` = objek yang sebelumnya disimpan perangkat ({cohort, epoch}) atau
   * null. `randomHex(16)` di-inject supaya bisa deterministik di test — modul
   * ini tidak boleh punya sumber keacakan sendiri (kontrak Braincore).
   * Rotasi terjadi saat epoch berubah; nilai lama tidak pernah disimpan.
   */
  function cohortState(opts) {
    var o = opts || {};
    var now = Number(o.nowMs);
    if (!isFinite(now) || now < 0) now = 0;
    var epoch = Math.floor(Math.floor(now / DAY_MS) / COHORT_EPOCH_DAYS);
    var stored = o.stored && typeof o.stored === 'object' ? o.stored : null;
    if (stored && /^[0-9a-f]{16}$/.test(String(stored.cohort || '')) && Number(stored.epoch) === epoch) {
      return { cohort: String(stored.cohort), epoch: epoch, rotated: false };
    }
    var gen = typeof o.randomHex === 'function' ? String(o.randomHex(16)) : '';
    if (!/^[0-9a-f]{16}$/.test(gen)) return { cohort: null, epoch: epoch, rotated: false };
    return { cohort: gen, epoch: epoch, rotated: true };
  }

  /* --------------------------------------------------------------- build */

  function fail(reason) {
    return { ok: false, reason: reason, rationale: 'brain3_ev_' + reason, confidence: 1 };
  }

  function validId(id) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(String(id || ''));
  }

  /**
   * buildLearnerEvidenceEvent(input) -> {ok, event} | {ok:false, reason}
   *
   * input = {
   *   eventId, cohort,
   *   level, mastery, masteryDelta, misconceptions, misconceptionSkill,
   *   accuracy, targetLow, targetHigh, consistency, retentionRisk,
   *   evidenceCount, improvementDelta
   * }
   * Field WAJIB yang tidak bisa dibucket (mis. belum ada satu pun bukti)
   * membuat event DITOLAK, bukan diisi nilai bawaan: mengirim 'm0-40' untuk
   * murid yang belum pernah menjawab akan mengarang murid lemah yang tidak ada.
   */
  function buildLearnerEvidenceEvent(input) {
    var i = input || {};
    if (!validId(i.eventId)) return fail('bad_event_id');
    if (!/^[0-9a-f]{16}$/.test(String(i.cohort || ''))) return fail('bad_cohort');
    var payload = {
      level: level(i.level),
      masteryBucket: bucketMastery(i.mastery),
      masteryTrend: bucketTrend(i.masteryDelta),
      misconceptionBucket: bucketMisconception(i.misconceptions),
      difficultyCalibration: bucketCalibration(i.accuracy, i.targetLow, i.targetHigh),
      calibrationErrorBucket: bucketCalibrationError(i.accuracy, i.targetLow, i.targetHigh),
      consistencyBucket: bucketConsistency(i.consistency),
      retentionRiskBucket: bucketRetentionRisk(i.retentionRisk),
      evidenceVolumeBucket: bucketVolume(i.evidenceCount),
      improvementTrend: bucketImprovement(i.improvementDelta)
    };
    var skill = skillFamily(i.misconceptionSkill);
    if (skill) payload.misconceptionSkill = skill;
    for (var k in payload) {
      if (payload[k] === null || payload[k] === undefined) return fail('unmeasured_' + k);
    }
    return {
      ok: true,
      event: { eventId: String(i.eventId), type: 'learner_evidence', cohort: String(i.cohort), payload: payload },
      rationale: 'brain3_ev_learner_built',
      confidence: 1
    };
  }

  /**
   * buildDecisionEvent(input) -> {ok, event} | {ok:false, reason}
   * input = { eventId, cohort, level, policyId, decision, outcome,
   *           recommendation, masteryDelta, adherence }
   */
  function buildDecisionEvent(input) {
    var i = input || {};
    if (!validId(i.eventId)) return fail('bad_event_id');
    if (!/^[0-9a-f]{16}$/.test(String(i.cohort || ''))) return fail('bad_cohort');
    var policyId = String(i.policyId || '');
    if (POLICY_IDS.indexOf(policyId) === -1) return fail('unknown_policy');
    var decision = String(i.decision || '');
    if (DECISIONS.indexOf(decision) === -1) return fail('unknown_decision');
    var outcome = String(i.outcome || '');
    if (OUTCOMES.indexOf(outcome) === -1) return fail('unknown_outcome');
    var recommendation = String(i.recommendation || '');
    if (RECOMMENDATIONS.indexOf(recommendation) === -1) return fail('unknown_recommendation');
    var adherence = bucketAdherence(i.adherence);
    if (!adherence) return fail('unmeasured_adherence');
    return {
      ok: true,
      event: {
        eventId: String(i.eventId),
        type: 'braincore_decision',
        cohort: String(i.cohort),
        payload: {
          level: level(i.level),
          policyId: policyId,
          decision: decision,
          outcome: outcome,
          recommendation: recommendation,
          masteryDeltaBucket: bucketDelta(i.masteryDelta),
          adherenceBucket: adherence
        }
      },
      rationale: 'brain3_ev_decision_built',
      confidence: 1
    };
  }

  /**
   * fromSnapshot(snapshot, extra) -> input untuk buildLearnerEvidenceEvent.
   *
   * `snapshot` adalah HASIL `remoteLearnerEvidenceSnapshot()` di app.js
   * (skema `fiezel-learner-evidence-v1`). Pemetaan ditulis eksplisit supaya
   * jelas apa yang IKUT dan apa yang TIDAK: `preferredStudyWindow`,
   * `medianResponseMs`, `streakDays`, `todayAttempts`, dan seluruh daftar
   * `skills.weakest` (yang memuat nama skill mentah + hitungan) TIDAK IKUT.
   * Yang lolos hanyalah famili skill dari SATU miskonsepsi teratas.
   */
  function fromSnapshot(snapshot, extra) {
    var s = snapshot || {};
    var e = extra || {};
    var weakest = (s.skills && Array.isArray(s.skills.weakest) && s.skills.weakest[0]) || null;
    var accuracy = weakest && weakest.accuracy != null ? weakest.accuracy : e.accuracy;
    return {
      level: e.level,
      mastery: e.mastery,
      masteryDelta: e.masteryDelta,
      misconceptions: e.misconceptions != null ? e.misconceptions : (s.skills && s.skills.recurringErrorSkills),
      misconceptionSkill: weakest && weakest.skill,
      accuracy: accuracy,
      targetLow: e.targetLow,
      targetHigh: e.targetHigh,
      consistency: s.behavior && s.behavior.consistency14d,
      retentionRisk: s.memory && s.memory.maxForgettingRisk,
      evidenceCount: (s.skills && s.skills.measured) || (s.confidence && s.confidence.evidence),
      improvementDelta: e.improvementDelta
    };
  }

  /* ---------------------------------------------- lane bukti PER-MURID */

  /**
   * toIdentityEvent(event, newEventId) -> event lane per-murid | null
   *
   * Lane kedua (`fiezel-braincore-learner-evidence-v1`) mengirim BUCKET YANG
   * SAMA ke endpoint yang terautentikasi, tempat server menempelkan
   * `identity.sub` sendiri dari cookie. Fungsi ini yang membuat kedua lane
   * TIDAK BISA disambungkan satu sama lain, dan itu satu-satunya alasannya ada:
   *
   *   1. `cohort` DIBUANG. Kalau satu baris membawa cohort DAN duduk di sebelah
   *      sub, maka lane agregat yang anonim bisa dipetakan ke akun lewat satu
   *      SELECT — seluruh jaminan 0008_evidence.sql hilang dalam satu kolom.
   *   2. `eventId` DIGANTI dengan UUID BARU yang di-inject pemanggil. eventId
   *      bersama adalah kunci join yang sama berbahayanya dengan kolom bersama:
   *      `evidence_dedup.event_id` (database agregat) dan `learner_evidence.event_id`
   *      (database inti) akan cocok baris-per-baris.
   *
   * Mengembalikan null (bukan melempar) untuk masukan yang tidak sah — jalur
   * belajar tidak pernah membaca nilai kembali fungsi ini.
   */
  function toIdentityEvent(event, newEventId) {
    var e = event && typeof event === 'object' ? event : null;
    if (!e || !e.payload || typeof e.payload !== 'object') return null;
    if (e.type !== 'learner_evidence' && e.type !== 'braincore_decision') return null;
    if (!validId(newEventId)) return null;
    // eventId lane agregat dan lane per-murid TIDAK BOLEH sama, walau pemanggil
    // salah dan mengoper id yang itu-itu juga.
    if (String(newEventId) === String(e.eventId)) return null;
    var payload = {};
    for (var k in e.payload) {
      if (Object.prototype.hasOwnProperty.call(e.payload, k)) payload[k] = e.payload[k];
    }
    return { eventId: String(newEventId), type: e.type, payload: payload };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    COHORT_EPOCH_DAYS: COHORT_EPOCH_DAYS,
    ENUMS: ENUMS,
    IDENTITY_SCHEMA: IDENTITY_SCHEMA,
    cohortState: cohortState,
    toIdentityEvent: toIdentityEvent,
    bucketMastery: bucketMastery,
    bucketTrend: bucketTrend,
    bucketMisconception: bucketMisconception,
    bucketCalibration: bucketCalibration,
    bucketCalibrationError: bucketCalibrationError,
    bucketConsistency: bucketConsistency,
    bucketRetentionRisk: bucketRetentionRisk,
    bucketVolume: bucketVolume,
    bucketImprovement: bucketImprovement,
    bucketDelta: bucketDelta,
    bucketAdherence: bucketAdherence,
    skillFamily: skillFamily,
    fromSnapshot: fromSnapshot,
    buildLearnerEvidenceEvent: buildLearnerEvidenceEvent,
    buildDecisionEvent: buildDecisionEvent
  });
});
