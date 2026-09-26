/**
 * features/learner-flow/fiezel-decision-trace.js — FIEZEL Braincore Decision Trace & Autonomous Loop.
 *
 * TUGAS UTAMA:
 * 1. Merekam jejak keputusan kognitif (Decision Trace) yang mesin-terbaca (machine-readable),
 *    dapat diaudit, dan dapat diulang (replayable).
 * 2. Menutup lingkaran otonomi belajar berbatas (Bounded Autonomous Learning Loop):
 *    OBSERVE -> UNDERSTAND -> DECIDE -> ACT -> EVALUATE OUTCOME -> KEEP / ROLLBACK.
 * 3. Menyediakan potret tunggal Learner State Kanonik (Canonical Learner State) yang
 *    mengonsolidasikan BKT mastery, FSRS memory stability, belief miskonsepsi, dan status afek.
 * 4. Menyajikan ringkasan diagnostik untuk Owner & Guru tanpa mengekspos PII murid.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelDecisionTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-decision-trace-v1';
  var STORAGE_KEY = 'fiezel-decision-trace-v1';
  var MAX_RECORDS = 50;

  // In-memory buffer fallback jika localStorage tidak tersedia
  var memoryBuffer = [];

  function safeStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
    } catch (_) {}
    return null;
  }

  function readStore() {
    var store = safeStorage();
    if (!store) return memoryBuffer.slice();
    try {
      var raw = store.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return memoryBuffer.slice();
    }
  }

  function writeStore(records) {
    var clean = (Array.isArray(records) ? records : []).slice(-MAX_RECORDS);
    memoryBuffer = clean.slice();
    var store = safeStorage();
    if (!store) return;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (_) {}
  }

  /**
   * 1. CANONICAL LEARNER STATE
   * Mengonsolidasikan seluruh dimensi belajar murid menjadi satu potret kanonik.
   */
  function getCanonicalState(appState, nowMs) {
    var st = appState || {};
    var now = Number(nowMs) || Date.now();
    var history = Array.isArray(st.history) ? st.history : [];
    var recent = history.slice(-20);

    var totalAttempts = history.length;
    var correctCount = history.filter(function (h) { return h && h.ok; }).length;
    var rawAccuracy = totalAttempts > 0 ? (correctCount / totalAttempts) : null;

    // Hitung streak terkini
    var streak = 0;
    for (var i = history.length - 1; i >= 0; i--) {
      if (history[i] && history[i].ok) streak++;
      else break;
    }

    // Ambil BKT mastery
    var bktLessons = {};
    if (st.bkt && st.bkt.lessons) {
      bktLessons = st.bkt.lessons;
    } else {
      try {
        var store = safeStorage();
        if (store) {
          var bktRaw = store.getItem('fiezel-mastery-bkt-v1');
          if (bktRaw) bktLessons = (JSON.parse(bktRaw) || {}).lessons || {};
        }
      } catch (_) {}
    }

    // Ambil Miskonsepsi Aktif
    var activeMisconceptions = [];
    try {
      var storeM = safeStorage();
      if (storeM) {
        var miscRaw = storeM.getItem('fiezel-misconception-ledger-v1');
        if (miscRaw) {
          var ledger = JSON.parse(miscRaw) || {};
          var entries = ledger.entries || {};
          for (var k in entries) {
            if (Object.prototype.hasOwnProperty.call(entries, k)) {
              var e = entries[k];
              if (e && e.everActive && (e.logOdds >= 0.847)) { // belief >= ~0.70
                activeMisconceptions.push({ concept: e.concept, misconception: e.misconception, logOdds: e.logOdds });
              }
            }
          }
        }
      }
    } catch (_) {}

    return {
      totalAttempts: totalAttempts,
      rawAccuracy: rawAccuracy,
      currentStreak: streak,
      recentWindowCount: recent.length,
      bktMastery: bktLessons,
      activeMisconceptions: activeMisconceptions,
      timestamp: now
    };
  }

  /**
   * 2. OBSERVATION LAYER
   * Membuat rekaman observasi standar dari interaksi murid.
   */
  function createObservation(input) {
    var raw = input || {};
    var ms = Number(raw.ms) || 0;
    var ok = raw.ok === true;
    var timing = ms < 1800 ? 'guess' : ms < 4000 ? 'fluent' : ms > 10000 ? 'struggled' : 'normal';

    return {
      itemId: String(raw.itemId || raw.id || 'unknown'),
      concept: String(raw.concept || raw.skill || 'general'),
      family: String(raw.family || 'general'),
      difficulty: Number(raw.difficulty) || 2.5,
      correct: ok,
      latencyMs: ms,
      timing: timing,
      hintUsed: raw.hintUsed === true,
      retryCount: Number(raw.retryCount) || 0,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
      distractorChosen: raw.distractor ? String(raw.distractor) : null,
      kappa: Number(raw.kappa) || 1.0,
      timestamp: Number(raw.nowMs) || Date.now()
    };
  }

  /**
   * 3. NEURAL UNDERSTANDING LAYER
   * Menginterpretasikan pola kognitif dari observasi terhadap state kanonik.
   */
  function analyzePattern(observation, canonicalState) {
    var obs = observation || {};
    var cState = canonicalState || {};
    var isCorrect = obs.correct === true;
    var isFast = obs.latencyMs < 2500;
    var isVeryFast = obs.latencyMs < 1800;

    var isSlip = !isCorrect && isFast && obs.retryCount === 0;
    var isGaming = !isCorrect && isVeryFast;
    var isFluency = isCorrect && isFast && !obs.hintUsed;

    // Periksa apakah konsep ini memiliki riwayat miskonsepsi aktif
    var hasActiveMisconception = (cState.activeMisconceptions || []).some(function (m) {
      return m.concept === obs.concept;
    });

    var bktEntry = (cState.bktMastery || {})[obs.concept];
    var isMasteryMilestone = isCorrect && bktEntry && bktEntry.L >= 0.95 && bktEntry.n >= 5;

    return {
      pattern: isMasteryMilestone ? 'mastery_milestone'
             : hasActiveMisconception && !isCorrect ? 'recurrent_misconception'
             : isGaming ? 'gaming_detected'
             : isSlip ? 'careless_slip'
             : isFluency ? 'fluent_mastery'
             : isCorrect ? 'deliberate_success'
             : 'cognitive_struggle',
      isSlip: isSlip,
      isGaming: isGaming,
      isFluency: isFluency,
      hasActiveMisconception: hasActiveMisconception,
      isMasteryMilestone: !!isMasteryMilestone
    };
  }

  /**
   * 4. DECISION ENGINE & AUDIT TRACE
   * Membuat keputusan pedagogis eksplisit dan mencatat jejaknya.
   */
  function recordDecision(params) {
    var p = params || {};
    var traceId = 'trc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    var entry = {
      traceId: traceId,
      timestamp: Number(p.nowMs) || Date.now(),
      action: String(p.action || 'continue_practice'),
      targetSkill: String(p.targetSkill || p.concept || 'general'),
      targetDifficulty: Number(p.targetDifficulty) || 2.5,
      scaffoldLevel: String(p.scaffold || 'probe'),
      presenceState: String(p.presenceState || 'silent'),
      rationale: String(p.rationale || 'brain4_decision_standard'),
      policy: String(p.policy || 'fiezel-adaptive-v4'),
      evidenceStrength: String(p.evidenceStrength || 'moderate'),
      authorityBounded: true,
      observationSummary: p.observation || null,
      understanding: p.understanding || null,
      status: 'pending_outcome'
    };

    var current = readStore();
    current.push(entry);
    writeStore(current);

    return entry;
  }

  /**
   * 5. BOUNDED AUTONOMOUS LOOP & OUTCOME EVALUATION
   * Mengukur hasil nyata sesudah keputusan dijalankan dan mengevaluasi keep vs rollback.
   */
  function evaluateOutcome(traceId, subsequentObservation) {
    var records = readStore();
    var idx = -1;
    for (var i = records.length - 1; i >= 0; i--) {
      if (records[i].traceId === traceId) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return null;

    var decision = records[idx];
    var next = subsequentObservation || {};
    var isSuccess = next.correct === true;

    // Evaluasi Efektivitas Intervensi
    var outcomeStatus = 'neutral';
    var recommendation = 'keep';

    if (decision.action === 'scaffold_hint' || decision.action === 'reinforce_concept') {
      if (isSuccess) {
        outcomeStatus = 'positive';
        recommendation = 'keep'; // Perancah berhasil, lanjutkan ke pemudaran (fading)
      } else {
        outcomeStatus = 'negative';
        recommendation = 'modify'; // Perancah belum cukup, eskalasi ke worked-example atau istirahat
      }
    } else if (decision.action === 'increase_challenge') {
      if (isSuccess) {
        outcomeStatus = 'positive';
        recommendation = 'keep';
      } else {
        outcomeStatus = 'neutral';
        recommendation = 'rollback'; // Tantangan terlalu dini, kembalikan ke level sebelumnya
      }
    } else if (isSuccess) {
      outcomeStatus = 'positive';
      recommendation = 'keep';
    }

    decision.outcome = {
      evaluatedAt: Date.now(),
      nextItemId: next.itemId || null,
      nextCorrect: isSuccess,
      nextLatencyMs: next.latencyMs || null,
      status: outcomeStatus,
      recommendation: recommendation
    };
    decision.status = 'evaluated';

    records[idx] = decision;
    writeStore(records);

    return decision;
  }

  /**
   * 6. OWNER OBSERVABILITY & CAPABILITY STATS
   * Menghasilkan ringkasan diagnostik agregat untuk Owner/Guru.
   */
  function getDiagnosticsSummary() {
    var records = readStore();
    var counts = {
      totalDecisions: records.length,
      byAction: {},
      byPresenceState: {},
      byOutcome: { positive: 0, neutral: 0, negative: 0, pending: 0 }
    };

    records.forEach(function (r) {
      counts.byAction[r.action] = (counts.byAction[r.action] || 0) + 1;
      counts.byPresenceState[r.presenceState] = (counts.byPresenceState[r.presenceState] || 0) + 1;
      if (r.outcome && r.outcome.status) {
        counts.byOutcome[r.outcome.status] = (counts.byOutcome[r.outcome.status] || 0) + 1;
      } else {
        counts.byOutcome.pending += 1;
      }
    });

    return counts;
  }

  return {
    SCHEMA: SCHEMA,
    STORAGE_KEY: STORAGE_KEY,
    getCanonicalState: getCanonicalState,
    createObservation: createObservation,
    analyzePattern: analyzePattern,
    recordDecision: recordDecision,
    evaluateOutcome: evaluateOutcome,
    getDiagnosticsSummary: getDiagnosticsSummary,
    getRecent: function (limit) {
      var n = Number(limit) || 10;
      return readStore().slice(-n);
    },
    clear: function () {
      writeStore([]);
    }
  };
});
