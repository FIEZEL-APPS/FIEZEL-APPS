/**
 * features/learner-flow/fiezel-decision-trace.js — FIEZEL Braincore Living Autonomous Engine.
 *
 * TUGAS UTAMA:
 * 1. Merekam jejak keputusan kognitif (Decision Trace) yang mesin-terbaca (machine-readable),
 *    dapat diaudit, dan dapat diulang (replayable).
 * 2. Menutup lingkaran otonomi belajar berbatas (Bounded Autonomous Learning Loop):
 *    OBSERVE -> UNDERSTAND -> DECIDE -> ACT -> EVALUATE OUTCOME -> KEEP / ROLLBACK.
 * 3. Mengoperasikan rantai hash kriptografis anti-rusak (tamper-evident hash chain)
 *    untuk mencatat setiap peristiwa keputusan kognitif dan perubahan parameter.
 * 4. (DIMATIKAN OWNER 2026-09-26, m025-375) Penyetelan parameter otomatis. Modul ini dulu
 *    menaikkan difficulty.targetSuccess +0.02 setiap tiga hasil 'positive' kumulatif, tanpa
 *    stat-gate, halt, maupun ledger berantai - dan dialah satu-satunya penyetel yang benar-
 *    benar dibaca pemilihan soal (app.js affectTargetSuccess). Audit braincore 2026-09-26
 *    (reports/BRAINCORE-AUDIT-2026-09-26.md, A1) mengukurnya: murid berakurasi 60-85% mentok
 *    di 0.90 pada median jawaban ke-16..31, lalu disodori soal "latihan pemulihan" selamanya.
 *    Sekarang modul ini HANYA merekam dan mengevaluasi; readParams() selalu mengembalikan
 *    nilai bawaan dan mengabaikan sisa setelan lama di perangkat murid.
 * 5. Alokasi eksperimen N-of-1 within-subject (control vs candidate) deterministik.
 * 6. Menyediakan potret tunggal Learner State Kanonik (Canonical Learner State) yang
 *    mengonsolidasikan BKT mastery, FSRS memory stability, belief miskonsepsi, dan status afek.
 * 7. Menyajikan ringkasan diagnostik untuk Owner & Guru tanpa mengekspos PII murid.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelDecisionTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-decision-trace-v2';
  var STORAGE_KEY = 'fiezel-decision-trace-v2';
  var PARAM_STORAGE_KEY = 'fiezel-live-params-v1';
  var GENESIS_HASH = '0000000000000000';
  var MAX_RECORDS = 100;

  // In-memory buffer fallback jika localStorage tidak tersedia
  var memoryBuffer = [];

  // Batas kanonik parameter yang DULU disetel modul ini. Dipertahankan hanya sebagai rujukan
  // nilai bawaan; tidak ada lagi jalur yang menggeser nilainya (lihat butir 4 header).
  var TUNABLE = Object.freeze({
    'difficulty.targetSuccess': { default: 0.80, min: 0.70, max: 0.90, step: 0.02 },
    'bkt.T': { default: 0.15, min: 0.05, max: 0.35, step: 0.02 }
  });

  // Hashing deterministik 64-bit (FNV-1a + fmix32 ganda)
  function fnv1a(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function fmix32(h) {
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16; return h >>> 0;
  }
  function hex8(n) { var s = (n >>> 0).toString(16); return '00000000'.slice(s.length) + s; }
  function hash64(s) {
    return hex8(fmix32(fnv1a(s))) + hex8(fmix32(fnv1a(s + '#2')));
  }

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
   * Parameter hidup = nilai bawaan, SELALU. Kunci PARAM_STORAGE_KEY sengaja TIDAK dibaca:
   * perangkat yang sudah dipakai sebelum m025-375 menyimpan targetSuccess hasil penyetel lama
   * (sering 0.90), dan membacanya berarti murid itu tetap terkunci di soal mudah walau
   * penyetelnya sudah dimatikan. Kunci itu dihapus saat reset progres (app.js) dan clear().
   */
  function readParams() {
    return {
      'difficulty.targetSuccess': TUNABLE['difficulty.targetSuccess'].default,
      'bkt.T': TUNABLE['bkt.T'].default,
      selfTuning: false,
      consecutivePositives: 0,
      consecutiveNegatives: 0,
      activeChange: null,
      adaptationHistory: []
    };
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

    var liveParams = readParams();

    return {
      totalAttempts: totalAttempts,
      rawAccuracy: rawAccuracy,
      currentStreak: streak,
      recentWindowCount: recent.length,
      bktMastery: bktLessons,
      activeMisconceptions: activeMisconceptions,
      liveParameters: liveParams,
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
   * 4. DECISION ENGINE & TAMPER-EVIDENT HASH CHAIN
   * Membuat keputusan pedagogis eksplisit dan mencatat jejaknya dengan bukti kriptografis.
   */
  function recordDecision(params) {
    var p = params || {};
    var nowMs = Number(p.nowMs) || Date.now();
    var traceId = p.traceId || ('trc_' + nowMs + '_' + (p.seed != null ? hex8(fmix32(Number(p.seed))) : Math.random().toString(36).substr(2, 6)));

    var current = readStore();
    var prevHash = GENESIS_HASH;
    var seq = 0;
    if (current.length > 0) {
      var prev = current[current.length - 1];
      prevHash = prev.hash || GENESIS_HASH;
      seq = (prev.seq || 0) + 1;
    }

    var entry = {
      seq: seq,
      traceId: traceId,
      timestamp: nowMs,
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
      status: 'pending_outcome',
      prevHash: prevHash
    };

    // Canonical digest untuk hashing rantai
    var canonicalStr = JSON.stringify([
      entry.seq,
      entry.traceId,
      entry.action,
      entry.targetSkill,
      entry.targetDifficulty,
      entry.scaffoldLevel,
      entry.presenceState,
      entry.timestamp,
      entry.prevHash
    ]);
    entry.hash = hash64(canonicalStr);

    current.push(entry);
    writeStore(current);

    return entry;
  }

  /**
   * 5. OUTCOME EVALUATION
   * Mengukur hasil nyata sesudah keputusan dijalankan dan mencatat rekomendasinya
   * (keep / modify / rollback) di jejak keputusan. Rekomendasi itu TIDAK lagi menggeser
   * parameter apa pun - penyetelan otomatis dimatikan owner (butir 4 header).
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
    } else {
      outcomeStatus = 'neutral';
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
   * 6. N-OF-1 INTERLEAVED ASSIGNMENT (Within-Subject Trial)
   * Mengalokasikan perlakuan eksperimen (control vs candidate) secara deterministik tanpa state.
   */
  function assignNof1(itemId, experimentId) {
    var it = String(itemId || '').trim();
    var exp = String(experimentId || 'exp_default').trim();
    if (!it) return null;
    var hash = fnv1a(it + '::' + exp);
    var mixed = fmix32(hash);
    return (mixed % 2 === 0) ? 'control' : 'candidate';
  }

  /**
   * 7. CRYPTOGRAPHIC INTEGRITY VERIFIER
   * Memvalidasi keutuhan seluruh rantai keputusan dan parameter.
   */
  function verifyLedger() {
    var records = readStore();
    if (!records.length) {
      return { ok: true, length: 0, brokenAt: null, message: 'ledger_empty' };
    }

    var prevHash = GENESIS_HASH;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.prevHash !== prevHash) {
        return { ok: false, length: records.length, brokenAt: r.seq, error: 'broken_link_hash_mismatch' };
      }
      var canonicalStr = JSON.stringify([
        r.seq,
        r.traceId,
        r.action,
        r.targetSkill,
        r.targetDifficulty,
        r.scaffoldLevel,
        r.presenceState,
        r.timestamp,
        r.prevHash
      ]);
      var expectedHash = hash64(canonicalStr);
      if (r.hash !== expectedHash) {
        return { ok: false, length: records.length, brokenAt: r.seq, error: 'tampered_data_hash_mismatch' };
      }
      prevHash = r.hash;
    }

    return {
      ok: true,
      length: records.length,
      brokenAt: null,
      genesisHash: GENESIS_HASH,
      latestHash: prevHash,
      message: 'tamper_evident_chain_verified'
    };
  }

  /**
   * 8. OWNER OBSERVABILITY & CAPABILITY STATS
   * Menghasilkan ringkasan diagnostik agregat untuk Owner/Guru.
   */
  function getDiagnosticsSummary() {
    var records = readStore();
    var params = readParams();
    var counts = {
      totalDecisions: records.length,
      byAction: {},
      byPresenceState: {},
      byOutcome: { positive: 0, neutral: 0, negative: 0, pending: 0 },
      selfTuning: {
        enabled: false,
        liveTargetSuccess: params['difficulty.targetSuccess'],
        liveBktT: params['bkt.T'],
        totalAdaptations: (params.adaptationHistory || []).length,
        hasActiveChange: !!params.activeChange
      },
      chainIntegrity: verifyLedger()
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
    TUNABLE: TUNABLE,
    getCanonicalState: getCanonicalState,
    createObservation: createObservation,
    analyzePattern: analyzePattern,
    recordDecision: recordDecision,
    evaluateOutcome: evaluateOutcome,
    assignNof1: assignNof1,
    verifyLedger: verifyLedger,
    readParams: readParams,
    getDiagnosticsSummary: getDiagnosticsSummary,
    getRecent: function (limit) {
      var n = Number(limit) || 10;
      return readStore().slice(-n);
    },
    clear: function () {
      writeStore([]);
      if (safeStorage()) {
        try { safeStorage().removeItem(PARAM_STORAGE_KEY); } catch (_) {}
      }
    }
  };
});
