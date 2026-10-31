/**
 * FIEZEL · features/brain/fiezel-fsrs-bridge.js
 *
 * Pure-JS FSRS-6 Reference Oracle, Half-Life <-> Stability Exact Bridge,
 * & Bounded Threadless Worker Per-Learner Memory Optimizer.
 *
 * Adapted from open-spaced-repetition/ts-fsrs (MIT License).
 *
 * INVARIAN KEMURNIAN BRAINCORE:
 * - Modul 100% MURNI: nol Math.random, nol Date.now / new Date(), nol DOM (document/window),
 *   nol storage (localStorage/indexedDB), nol panggilan jaringan (fetch/XHR/WebSocket).
 * - Konversi dua arah antara FIEZEL Core Brain Half-Life (R = 0.50) dan FSRS-6 Stability
 *   (R = 0.90) bersifat eksak tertutup hingga presisi IEEE-754 (~1e-15).
 * - Optimasi bobot personal dijalankan di Dedicated Web Worker threadless (tanpa SharedArrayBuffer
 *   dan TANPA header COEP: require-corp sehingga aman 100% bagi PWA & iframe Voice Studio)
 *   serta dijaga 5 gerbang keamanan ketat (>= 200 ulasan lintas-hari, batas parameter resmi,
 *   evaluasi time-series split logLoss + rmseBins, kill-switch halt, dan rantai hash ParamLedger).
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFsrsOracle = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function (root) {
  'use strict';

  var SCHEMA = 'fiezel-fsrs-bridge-v1';
  var MIN_CROSS_DAY_REVIEWS = 200;
  var DAY_MS = 86400000;

  var Rating = Object.freeze({
    Manual: 0,
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4
  });

  var FSRS6_DECAY = 0.1542;
  var FSRS6_DEFAULT_WEIGHTS = Object.freeze([
    0.212, 1.2931, 2.3065, 8.2956,
    6.4133, 0.8334, 3.0194, 0.001,
    1.8722, 0.1666, 0.796, 1.4835,
    0.0614, 0.2629, 1.6483, 0.6014,
    1.8729, 0.5425, 0.0912, 0.0658,
    FSRS6_DECAY
  ]);

  var STATE_BOUNDS = Object.freeze({
    sMin: 0.001,
    sMax: 36500.0,
    dMin: 1.0,
    dMax: 10.0
  });

  // Batas parameter resmi FSRS-6 (w[0..20]) — dijaga sejak lahir (bounds-from-birth)
  var WEIGHT_BOUNDS = Object.freeze([
    [0.001, 100.0], [0.001, 100.0], [0.001, 100.0], [0.001, 100.0],
    [1.0, 10.0], [0.001, 4.0], [0.001, 4.0], [0.0, 0.75],
    [0.0, 4.5], [0.0, 0.8], [0.001, 3.5], [0.001, 5.0],
    [0.001, 0.25], [0.001, 0.9], [0.0, 4.0], [0.0, 1.0],
    [1.0, 6.0], [0.0, 2.0], [0.0, 2.0], [0.0, 0.8],
    [0.05, 0.8]
  ]);

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function sanitizeWeights(weights) {
    if (!Array.isArray(weights) || weights.length !== 21) {
      return FSRS6_DEFAULT_WEIGHTS.slice();
    }
    var out = new Array(21);
    for (var i = 0; i < 21; i++) {
      var val = Number(weights[i]);
      var b = WEIGHT_BOUNDS[i];
      if (!isFinite(val)) val = FSRS6_DEFAULT_WEIGHTS[i];
      out[i] = clamp(val, b[0], b[1]);
    }
    return out;
  }

  /**
   * Faktor kurva lupa power-law FSRS-6:
   * R(t, S) = (1 + factor * t / S)^(-w20), di mana R(S, S) === 0.90 eksak.
   */
  function computeDecayFactor(decayWeight) {
    var w20 = (typeof decayWeight === 'number' && isFinite(decayWeight) && decayWeight > 0)
      ? clamp(decayWeight, WEIGHT_BOUNDS[20][0], WEIGHT_BOUNDS[20][1])
      : FSRS6_DECAY;
    var factor = Math.pow(0.9, -1.0 / w20) - 1.0;
    return { decay: -w20, w20: w20, factor: factor };
  }

  function forgettingCurve(elapsedDays, stability, decayWeight) {
    var t = Math.max(0, Number(elapsedDays) || 0);
    var s = Math.max(STATE_BOUNDS.sMin, Number(stability) || STATE_BOUNDS.sMin);
    if (t === 0) return 1.0;
    var df = computeDecayFactor(decayWeight);
    return Math.pow(1.0 + (df.factor * t) / s, df.decay);
  }

  function nextInterval(stability, desiredRetention, decayWeight) {
    var s = Math.max(STATE_BOUNDS.sMin, Number(stability) || STATE_BOUNDS.sMin);
    var r = clamp(Number(desiredRetention) || 0.9, 0.01, 0.99);
    var df = computeDecayFactor(decayWeight);
    var raw = (s / df.factor) * (Math.pow(r, 1.0 / df.decay) - 1.0);
    return Math.max(1, Math.round(raw));
  }

  /**
   * Konversi dua arah eksak:
   * - FSRS-6 Stability S didefinisikan pada titik retensi R(S) = 0.90
   * - FIEZEL Core Brain Half-Life h didefinisikan pada titik retensi R(h) = 0.50
   */
  function stabilityToHalfLife(stability, decayWeight) {
    var s = Math.max(STATE_BOUNDS.sMin, Number(stability) || STATE_BOUNDS.sMin);
    var df = computeDecayFactor(decayWeight);
    var halfFactor = Math.pow(0.5, -1.0 / df.w20) - 1.0;
    return (s / df.factor) * halfFactor;
  }

  function halfLifeToStability(halfLifeDays, decayWeight) {
    var h = Math.max(STATE_BOUNDS.sMin, Number(halfLifeDays) || STATE_BOUNDS.sMin);
    var df = computeDecayFactor(decayWeight);
    var halfFactor = Math.pow(0.5, -1.0 / df.w20) - 1.0;
    return (h * df.factor) / halfFactor;
  }

  /**
   * Pemetaan bukti interaksi FIEZEL ({ ok, timing, streak }) -> Rating FSRS (1..4).
   * Tebakan terlalu cepat ('guess') tidak pernah diberi bonus Easy meski benar.
   */
  function fiezelAttemptToFsrsRating(attempt) {
    if (!attempt || !attempt.ok) return Rating.Again;
    if (attempt.timing === 'struggled') return Rating.Hard;
    if (attempt.timing === 'guess') return Rating.Good;
    if (typeof attempt.streak === 'number' && attempt.streak >= 4 && attempt.timing === 'fluent') {
      return Rating.Easy;
    }
    return Rating.Good;
  }

  function createFSRS6(customWeights, enableShortTerm) {
    var w = sanitizeWeights(customWeights);
    var shortTerm = enableShortTerm !== false;

    function initStability(g) {
      var idx = clamp(Math.round(Number(g) || 3) - 1, 0, 3);
      return clamp(w[idx], STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
    }

    function initDifficulty(g) {
      var grade = clamp(Math.round(Number(g) || 3), 1, 4);
      return clamp(w[4] - Math.exp((grade - 1) * w[5]) + 1.0, STATE_BOUNDS.dMin, STATE_BOUNDS.dMax);
    }

    function linearDamping(deltaD, oldD) {
      return (deltaD * (10.0 - oldD)) / 9.0;
    }

    function meanReversion(initD, curD) {
      return w[7] * initD + (1.0 - w[7]) * curD;
    }

    function nextDifficulty(d, g) {
      var deltaD = -w[6] * (g - 3);
      var nextD = d + linearDamping(deltaD, d);
      return clamp(meanReversion(initDifficulty(Rating.Easy), nextD), STATE_BOUNDS.dMin, STATE_BOUNDS.dMax);
    }

    function nextRecallStability(d, s, r, g) {
      var hardPenalty = g === Rating.Hard ? w[15] : 1.0;
      var easyBound = g === Rating.Easy ? w[16] : 1.0;
      var sNew = s * (
        1.0 +
        Math.exp(w[8]) *
        (11.0 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp((1.0 - r) * w[10]) - 1.0) *
        hardPenalty *
        easyBound
      );
      return clamp(sNew, STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
    }

    function nextForgetStability(d, s, r) {
      var sFail = w[11] *
        Math.pow(d, -w[12]) *
        (Math.pow(s + 1.0, w[13]) - 1.0) *
        Math.exp((1.0 - r) * w[14]);
      return clamp(sFail, STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
    }

    function nextShortTermStability(s, g) {
      var sinc = Math.pow(s, -w[19]) * Math.exp(w[17] * (g - 3 + w[18]));
      var masked = g >= Rating.Hard ? Math.max(sinc, 1.0) : sinc;
      return clamp(s * masked, STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
    }

    function step(memoryState, elapsedDays, rawGrade) {
      var grade = clamp(Math.round(Number(rawGrade) || 3), 1, 4);
      var t = Math.max(0, Number(elapsedDays) || 0);
      if (!memoryState || !(memoryState.stability > 0) || !(memoryState.difficulty > 0)) {
        var s0 = initStability(grade);
        return {
          difficulty: initDifficulty(grade),
          stability: s0,
          halfLife: stabilityToHalfLife(s0, w[20]),
          retrievability: 1.0
        };
      }
      var d = clamp(Number(memoryState.difficulty), STATE_BOUNDS.dMin, STATE_BOUNDS.dMax);
      var s = clamp(Number(memoryState.stability), STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
      var r = forgettingCurve(t, s, w[20]);
      var newS;
      if (t === 0 && shortTerm) {
        newS = nextShortTermStability(s, grade);
      } else if (grade === Rating.Again) {
        var sAfterFail = nextForgetStability(d, s, r);
        var sCap = shortTerm ? (s / Math.exp(w[17] * w[18])) : STATE_BOUNDS.sMax;
        newS = clamp(Math.min(sAfterFail, sCap), STATE_BOUNDS.sMin, STATE_BOUNDS.sMax);
      } else {
        newS = nextRecallStability(d, s, r, grade);
      }
      return {
        difficulty: nextDifficulty(d, grade),
        stability: newS,
        halfLife: stabilityToHalfLife(newS, w[20]),
        retrievability: r
      };
    }

    return {
      weights: w,
      step: step,
      forgettingCurve: function (t, s) { return forgettingCurve(t, s, w[20]); },
      nextInterval: function (s, ret) { return nextInterval(s, ret || 0.9, w[20]); },
      stabilityToHalfLife: function (s) { return stabilityToHalfLife(s, w[20]); },
      halfLifeToStability: function (h) { return halfLifeToStability(h, w[20]); }
    };
  }

  /**
   * Mengonversi daftar riwayat FiezelAttemptRecord menjadi sekuens ulasan per-item
   * [{ rating, deltaT, at? }, ...] dengan penghitungan ulasan lintas-hari (deltaT >= 1).
   */
  function buildFsrsTrainingItemsFromAttempts(records) {
    if (!Array.isArray(records) || records.length === 0) {
      return { items: [], totalReviews: 0, crossDayReviews: 0 };
    }
    var byKey = Object.create(null);
    for (var i = 0; i < records.length; i++) {
      var rec = records[i];
      if (!rec) continue;
      // Mendukung input yang sudah berbentuk array review per item
      if (Array.isArray(rec)) {
        continue;
      }
      var at = Number(rec.at);
      if (!isFinite(at) || at <= 0) continue;
      var key = String(rec.item || rec.itemId || rec.lesson || rec.skill || '').trim();
      if (!key) continue;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(rec);
    }

    var keys = Object.keys(byKey);
    var items = [];
    var totalReviews = 0;
    var crossDayReviews = 0;

    // Jika input sudah berupa array of review-arrays: [[{rating, deltaT}, ...], ...]
    if (keys.length === 0 && Array.isArray(records[0])) {
      for (var k = 0; k < records.length; k++) {
        var seq = records[k];
        if (!Array.isArray(seq) || seq.length < 2) continue;
        var cleanSeq = [];
        for (var m = 0; m < seq.length; m++) {
          var rv = seq[m];
          if (!rv) continue;
          var dt = m === 0 ? 0 : Math.max(0, Number(rv.deltaT != null ? rv.deltaT : rv.delta_t) || 0);
          var rt = clamp(Math.round(Number(rv.rating) || 3), 1, 4);
          cleanSeq.push({ rating: rt, deltaT: dt, at: Number(rv.at) || m });
          totalReviews++;
          if (m > 0 && dt >= 1) crossDayReviews++;
        }
        if (cleanSeq.length >= 2) items.push(cleanSeq);
      }
      return { items: items, totalReviews: totalReviews, crossDayReviews: crossDayReviews };
    }

    for (var idx = 0; idx < keys.length; idx++) {
      var list = byKey[keys[idx]].slice().sort(function (a, b) { return a.at - b.at; });
      if (list.length < 2) continue;
      var reviews = [];
      for (var j = 0; j < list.length; j++) {
        var prevAt = j === 0 ? list[0].at : list[j - 1].at;
        var deltaDays = j === 0 ? 0 : Math.max(0, Math.floor((list[j].at - prevAt) / DAY_MS));
        // Abaikan spam klik beruntun di menit yang sama (< 10 menit) sesudah review pertama
        // kecuali terjadi pergantian hari belajar, agar kurva memori tidak bias latihan tubi.
        if (j > 0 && deltaDays === 0 && (list[j].at - prevAt) < 600000) {
          continue;
        }
        var rating = typeof list[j].rating === 'number'
          ? clamp(Math.round(list[j].rating), 1, 4)
          : fiezelAttemptToFsrsRating(list[j]);
        reviews.push({ rating: rating, deltaT: deltaDays, at: list[j].at });
        totalReviews++;
        if (j > 0 && deltaDays >= 1) crossDayReviews++;
      }
      if (reviews.length >= 2) items.push(reviews);
    }

    return {
      items: items,
      totalReviews: totalReviews,
      crossDayReviews: crossDayReviews
    };
  }

  /**
   * Evaluasi Log-Loss (Binary Cross-Entropy) & RMSE Calibration Bins pada transisi lintas-hari.
   */
  function evaluateLogLoss(items, weights) {
    var model = createFSRS6(weights, true);
    var eps = 1e-7;
    var lossSum = 0;
    var n = 0;
    var bins = new Array(10);
    for (var b = 0; b < 10; b++) bins[b] = { predSum: 0, actualSum: 0, count: 0 };

    for (var i = 0; i < items.length; i++) {
      var seq = items[i];
      if (!Array.isArray(seq) || seq.length < 2) continue;
      var state = null;
      for (var j = 0; j < seq.length; j++) {
        var rv = seq[j];
        var dt = j === 0 ? 0 : Math.max(0, Number(rv.deltaT) || 0);
        if (j > 0 && state && dt >= 1) {
          var p = clamp(model.forgettingCurve(dt, state.stability), eps, 1.0 - eps);
          var y = rv.rating > Rating.Again ? 1.0 : 0.0;
          lossSum += -(y * Math.log(p) + (1.0 - y) * Math.log(1.0 - p));
          n++;
          var binIdx = clamp(Math.floor(p * 10), 0, 9);
          bins[binIdx].predSum += p;
          bins[binIdx].actualSum += y;
          bins[binIdx].count++;
        }
        state = model.step(state, dt, rv.rating);
      }
    }

    if (n === 0) {
      return { logLoss: Infinity, rmseBins: Infinity, count: 0 };
    }

    var sqErrWeightSum = 0;
    for (var k = 0; k < 10; k++) {
      if (bins[k].count > 0) {
        var meanP = bins[k].predSum / bins[k].count;
        var meanY = bins[k].actualSum / bins[k].count;
        var diff = meanP - meanY;
        sqErrWeightSum += diff * diff * bins[k].count;
      }
    }

    return {
      logLoss: lossSum / n,
      rmseBins: Math.sqrt(sqErrWeightSum / n),
      count: n
    };
  }

  /**
   * Evaluasi Out-of-Sample berbasis urutan waktu (Expanding-Window Time-Series Split):
   * Mengukur apakah bobot kandidat yang dilatih pada paruh awal riwayat benar-benar
   * memprediksi paruh akhir riwayat lebih akurat dibanding bobot bawaan FSRS-6.
   */
  function evaluateTimeSeriesSplit(items, fitFn, baselineWeights) {
    var baseW = sanitizeWeights(baselineWeights || FSRS6_DEFAULT_WEIGHTS);
    if (!Array.isArray(items) || items.length < 4) {
      return { valid: false, candidate: { logLoss: Infinity, rmseBins: Infinity, count: 0 }, baseline: evaluateLogLoss(items || [], baseW) };
    }
    var sorted = items.slice().sort(function (a, b) {
      var aLast = (a[a.length - 1] && a[a.length - 1].at) || 0;
      var bLast = (b[b.length - 1] && b[b.length - 1].at) || 0;
      return aLast - bLast;
    });
    var splitIdx = Math.max(2, Math.floor(sorted.length * 0.7));
    var trainSet = sorted.slice(0, splitIdx);
    var testSet = sorted.slice(splitIdx);
    var fittedW = fitFn(trainSet, baseW);
    var candMetrics = evaluateLogLoss(testSet, fittedW);
    var baseMetrics = evaluateLogLoss(testSet, baseW);
    return {
      valid: candMetrics.count > 0 && isFinite(candMetrics.logLoss),
      candidate: candMetrics,
      baseline: baseMetrics
    };
  }

  /**
   * Coordinate-Search Optimizer ringan pada parameter memori kunci FSRS-6
   * (w[0..3] stabilitas awal, w[8] laju penguatan ingat, w[11] pemulihan lupa, w[20] decay).
   * Seluruh kandidat dijaga di dalam WEIGHT_BOUNDS sejak lahir.
   */
  function fitCoordinateWeights(items, startWeights, maxEpochs) {
    var bestW = sanitizeWeights(startWeights || FSRS6_DEFAULT_WEIGHTS);
    var bestLoss = evaluateLogLoss(items, bestW).logLoss;
    if (!isFinite(bestLoss)) return bestW;

    var tunableIndices = [0, 1, 2, 3, 8, 11, 20];
    var stepScales = [0.25, 0.12, 0.05];
    var epochs = clamp(Math.round(Number(maxEpochs) || 3), 1, 5);

    for (var sIdx = 0; sIdx < epochs && sIdx < stepScales.length; sIdx++) {
      var scale = stepScales[sIdx];
      for (var tIdx = 0; tIdx < tunableIndices.length; tIdx++) {
        var wi = tunableIndices[tIdx];
        var bounds = WEIGHT_BOUNDS[wi];
        var baseVal = bestW[wi];
        var delta = Math.max(0.01, Math.abs(baseVal) * scale);
        var candidates = [
          clamp(baseVal + delta, bounds[0], bounds[1]),
          clamp(baseVal - delta, bounds[0], bounds[1])
        ];
        for (var c = 0; c < candidates.length; c++) {
          if (Math.abs(candidates[c] - bestW[wi]) < 1e-9) continue;
          var trial = bestW.slice();
          trial[wi] = candidates[c];
          var loss = evaluateLogLoss(items, trial).logLoss;
          if (loss + 1e-7 < bestLoss) {
            bestLoss = loss;
            bestW = trial;
          }
        }
      }
    }
    return bestW;
  }

  /**
   * Optimasi Bobot FSRS-6 Personal Berpagar Ketat (Synchronous Pure Core).
   */
  function optimizePersonalWeights(recordsOrItems, options) {
    var opts = options || {};
    var minReviews = typeof opts.minCrossDayReviews === 'number'
      ? Math.max(20, Math.floor(opts.minCrossDayReviews))
      : MIN_CROSS_DAY_REVIEWS;
    var minImprovement = typeof opts.minLogLossImprovement === 'number'
      ? Math.max(0.0005, opts.minLogLossImprovement)
      : 0.005;
    var baselineW = sanitizeWeights(opts.baselineWeights || FSRS6_DEFAULT_WEIGHTS);

    if (opts.halt === true) {
      return {
        schema: SCHEMA,
        accepted: false,
        reason: 'halt_active',
        weights: baselineW,
        crossDayReviews: 0,
        metrics: null,
        rationale: 'brain3_fsrs_halt'
      };
    }

    var dataset = (recordsOrItems && Array.isArray(recordsOrItems.items))
      ? recordsOrItems
      : buildFsrsTrainingItemsFromAttempts(recordsOrItems || []);

    if (dataset.crossDayReviews < minReviews) {
      return {
        schema: SCHEMA,
        accepted: false,
        reason: 'insufficient_cross_day_reviews',
        weights: baselineW,
        crossDayReviews: dataset.crossDayReviews,
        requiredCrossDayReviews: minReviews,
        metrics: null,
        rationale: 'brain3_fsrs_hold_sample_floor'
      };
    }

    var splitEval = evaluateTimeSeriesSplit(dataset.items, function (trainItems, bW) {
      return fitCoordinateWeights(trainItems, bW, opts.maxEpochs || 3);
    }, baselineW);

    var fullCandidateW = fitCoordinateWeights(dataset.items, baselineW, opts.maxEpochs || 3);
    var fullCandMetrics = evaluateLogLoss(dataset.items, fullCandidateW);
    var fullBaseMetrics = evaluateLogLoss(dataset.items, baselineW);

    var oosImproved = splitEval.valid &&
      (splitEval.candidate.logLoss <= splitEval.baseline.logLoss - minImprovement) &&
      (splitEval.candidate.rmseBins <= splitEval.baseline.rmseBins + 0.01);
    var fullImproved = isFinite(fullCandMetrics.logLoss) &&
      (fullCandMetrics.logLoss <= fullBaseMetrics.logLoss - minImprovement);

    var accepted = !!(oosImproved && fullImproved);
    var chosenWeights = accepted ? fullCandidateW : baselineW;

    var nextLedger = null;
    if (accepted && opts.paramLedger && typeof opts.paramLedger.append === 'function' && opts.ledgerChain) {
      try {
        nextLedger = opts.paramLedger.append(opts.ledgerChain, {
          event: 'param_proposed',
          path: 'memory.fsrs6Weights',
          from: baselineW,
          to: chosenWeights,
          reason: 'fsrs6_personal_oos_improvement',
          evidence: {
            crossDayReviews: dataset.crossDayReviews,
            oosLogLossBefore: splitEval.baseline.logLoss,
            oosLogLossAfter: splitEval.candidate.logLoss,
            fullLogLossBefore: fullBaseMetrics.logLoss,
            fullLogLossAfter: fullCandMetrics.logLoss
          },
          at: typeof opts.nowMs === 'number' ? Math.floor(opts.nowMs) : 0
        });
      } catch (_) {
        nextLedger = null;
      }
    }

    return {
      schema: SCHEMA,
      accepted: accepted,
      reason: accepted ? 'promoted_out_of_sample' : 'no_out_of_sample_improvement',
      weights: chosenWeights,
      crossDayReviews: dataset.crossDayReviews,
      metrics: {
        outOfSample: {
          candidate: splitEval.candidate,
          baseline: splitEval.baseline
        },
        fullSample: {
          candidate: fullCandMetrics,
          baseline: fullBaseMetrics
        }
      },
      ledgerChain: nextLedger,
      rationale: accepted ? 'brain3_fsrs_personal_promoted' : 'brain3_fsrs_default_retained'
    };
  }

  /**
   * Menjalankan optimizePersonalWeights di Dedicated Web Worker Threadless (tanpa SharedArrayBuffer
   * dan tanpa header COEP: require-corp) agar main thread tetap 60 FPS.
   * Otomatis fallback ke Promise sinkron di lingkungan Node.js atau tanpa Worker.
   */
  function optimizePersonalWeightsAsync(recordsOrItems, options) {
    var opts = options || {};
    var WorkerCtor = root && root.Worker;
    var BlobCtor = root && root.Blob;
    var UrlObj = root && root.URL;

    if (opts.forceSync || typeof WorkerCtor !== 'function' || typeof BlobCtor !== 'function' || !UrlObj || typeof UrlObj.createObjectURL !== 'function') {
      return Promise.resolve(optimizePersonalWeights(recordsOrItems, opts));
    }

    var dataset = (recordsOrItems && Array.isArray(recordsOrItems.items))
      ? recordsOrItems
      : buildFsrsTrainingItemsFromAttempts(recordsOrItems || []);

    if (opts.halt === true || dataset.crossDayReviews < (opts.minCrossDayReviews || MIN_CROSS_DAY_REVIEWS)) {
      return Promise.resolve(optimizePersonalWeights(dataset, opts));
    }

    return new Promise(function (resolve) {
      var blobUrl = null;
      var worker = null;
      function cleanup() {
        if (worker) {
          try { worker.terminate(); } catch (_) {}
          worker = null;
        }
        if (blobUrl) {
          try { UrlObj.revokeObjectURL(blobUrl); } catch (_) {}
          blobUrl = null;
        }
      }
      try {
        var workerSrc = '(' + factory.toString() + ')(self);\n' +
          'self.onmessage = function(ev) {\n' +
          '  var d = ev.data || {};\n' +
          '  var res = self.FiezelFsrsOracle.optimizePersonalWeights(d.dataset, d.opts);\n' +
          '  self.postMessage(res);\n' +
          '};';
        var blob = new BlobCtor([workerSrc], { type: 'application/javascript' });
        blobUrl = UrlObj.createObjectURL(blob);
        worker = new WorkerCtor(blobUrl);
        worker.onmessage = function (ev) {
          cleanup();
          resolve(ev.data);
        };
        worker.onerror = function () {
          cleanup();
          resolve(optimizePersonalWeights(dataset, opts));
        };
        worker.postMessage({
          dataset: dataset,
          opts: {
            minCrossDayReviews: opts.minCrossDayReviews,
            minLogLossImprovement: opts.minLogLossImprovement,
            baselineWeights: opts.baselineWeights,
            maxEpochs: opts.maxEpochs,
            halt: opts.halt === true
          }
        });
      } catch (_) {
        cleanup();
        resolve(optimizePersonalWeights(dataset, opts));
      }
    });
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    MIN_CROSS_DAY_REVIEWS: MIN_CROSS_DAY_REVIEWS,
    Rating: Rating,
    FSRS6_DECAY: FSRS6_DECAY,
    FSRS6_DEFAULT_WEIGHTS: FSRS6_DEFAULT_WEIGHTS,
    WEIGHT_BOUNDS: WEIGHT_BOUNDS,
    STATE_BOUNDS: STATE_BOUNDS,
    sanitizeWeights: sanitizeWeights,
    computeDecayFactor: computeDecayFactor,
    forgettingCurve: forgettingCurve,
    nextInterval: nextInterval,
    stabilityToHalfLife: stabilityToHalfLife,
    halfLifeToStability: halfLifeToStability,
    fiezelAttemptToFsrsRating: fiezelAttemptToFsrsRating,
    createFSRS6: createFSRS6,
    buildFsrsTrainingItemsFromAttempts: buildFsrsTrainingItemsFromAttempts,
    evaluateLogLoss: evaluateLogLoss,
    evaluateTimeSeriesSplit: evaluateTimeSeriesSplit,
    optimizePersonalWeights: optimizePersonalWeights,
    optimizePersonalWeightsAsync: optimizePersonalWeightsAsync
  });
});
