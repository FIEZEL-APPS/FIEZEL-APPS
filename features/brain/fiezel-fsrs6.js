/**
 * FIEZEL FSRS-6 Memory Engine — model memori 21-parameter generasi ke-6 + lapisan kuis FIEZEL.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * `fiezel-core-brain.js` membawa FSRS-lite (peluruhan eksponensial 2^(-t/h), biner ok/salah,
 * kesulitan statis per level). Di skala ratusan ribu pengulangan lintas minggu/bulan, tiga
 * keterbatasan matematis FSRS-lite muncul:
 *
 *   1. EKOR INGATAN MANUSIA ADALAH POWER-LAW, BUKAN EKSPONENSIAL.
 *      Kurva lupa FSRS-6: R(t, S) = (1 + factor · t / S)^(-w20), dengan w20 di [0.10, 0.80]
 *      yang dapat disetel per pembelajar/kohort. Eksponensial melebih-lebihkan lupa pada
 *      ingatan matang yang sudah beberapa kali berhasil ditarik.
 *   2. REVIEW HARI-YANG-SAMA (SHORT-TERM MEMORY).
 *      Saat murid mengulang item yang baru dipelajari di hari yang sama (elapsedDays === 0),
 *      stabilitas dikendalikan w17..w19 (next_short_term_stability), bukan rumus antar-hari.
 *   3. SINYAL IMPLISIT KUIS (4 GRADE TANPA POPUP MENGGANGGU).
 *      OWNER telah menghapus popup keyakinan yang memotong alur kuis. FIEZEL sudah memiliki
 *      telemetri waktu jawab (ms), kredibilitas bukti (kappa), jumlah putar ulang audio
 *      (replayCount), dan bantuan scaffold (hintLevel/retryCount). `deriveImplicitRating()`
 *      memetakan sinyal ini secara jujur ke 4 tingkat FSRS (Again=1, Hard=2, Good=3, Easy=4)
 *      lengkap dengan pagar anti-tebakan (jawaban kilat < 1.4 dtk ditahan di Hard, tidak
 *      pernah diberi bonus Easy).
 *
 * JEMBATAN KONTINUITAS JADWAL (TANPA LOMPATAN 6,6x)
 * -------------------------------------------------
 * `b.stabilityDays` pada FSRS-lite adalah paruh-waktu eksponensial h (R=0.50), dengan jarak
 * ulangan R=0.90 sebesar -h·log2(0.9) ≈ 0.1520·h hari. Dalam FSRS-6, `stability` S didefinisikan
 * langsung pada R(S)=0.90. `legacyHalfLifeToStability(h)` menjembatani keduanya tepat di titik
 * operasional R=0.90 sehingga migrasi item lama memiliki diskontinuitas jadwal 0,000%.
 *
 * BATAS KEMURNIAN BRAINCORE
 * -------------------------
 * Modul MURNI: nol DOM, nol jaringan, nol penyimpanan, nol sumber acak, nol jam internal.
 * Seluruh konstanta dan API yang diekspor dibekukan dalam (deep-frozen).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFsrs6 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-fsrs6-v1';
  var ENGINE_VERSION = '6.0.0-fiezel.1';

  var FSRS5_DECAY = 0.5;
  var FSRS6_DECAY = 0.1542;
  var FSRS6_W17_W18_CEILING = 2;
  var DEFAULT_DESIRED_RETENTION = 0.9;
  var EXP_R90_RATIO = -Math.log2(0.9); // ~0.15200309344504997

  var Rating = {
    Manual: 0,
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4
  };

  var MODEL_BOUNDS = {
    sMin: 0.001,
    sMax: 36500,
    dMin: 1,
    dMax: 10
  };

  // Bobot bawaan kanonik FSRS-6 (21 parameter).
  var DEFAULT_WEIGHTS = [
    0.212,
    1.2931,
    2.3065,
    8.2956,
    6.4133,
    0.8334,
    3.0194,
    0.001,
    1.8722,
    0.1666,
    0.796,
    1.4835,
    0.0614,
    0.2629,
    1.6483,
    0.6014,
    1.8729,
    0.5425,
    0.0912,
    0.0658,
    FSRS6_DECAY
  ];

  function deepFreeze(obj) {
    if (obj && (typeof obj === 'object' || typeof obj === 'function') && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      var keys = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < keys.length; i++) {
        deepFreeze(obj[keys[i]]);
      }
    }
    return obj;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function roundTo(num, decimals) {
    var factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  function finiteOr(v, fallback) {
    var n = typeof v === 'number' ? v : Number(v);
    return isFinite(n) ? n : fallback;
  }

  function parameterBounds(w17W18Ceiling, enableShortTerm) {
    var ceiling = typeof w17W18Ceiling === 'number' && isFinite(w17W18Ceiling)
      ? w17W18Ceiling
      : FSRS6_W17_W18_CEILING;
    var shortTerm = enableShortTerm !== false;
    return [
      [MODEL_BOUNDS.sMin, 100],
      [MODEL_BOUNDS.sMin, 100],
      [MODEL_BOUNDS.sMin, 100],
      [MODEL_BOUNDS.sMin, 100],
      [MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax],
      [0.001, 4],
      [0.001, 4],
      [0.001, 0.75],
      [0, 4.5],
      [0, 0.8],
      [0.001, 3.5],
      [0.001, 5],
      [0.001, 0.25],
      [0.001, 0.9],
      [0, 4],
      [0, 1],
      [1, 6],
      [0, ceiling],
      [0, ceiling],
      [shortTerm ? 0.01 : 0, 0.8],
      [0.1, 0.8]
    ];
  }

  function clipParameters(parameters, numRelearningSteps, enableShortTerm) {
    var src = Array.isArray(parameters) ? parameters : DEFAULT_WEIGHTS;
    var steps = Math.max(0, Math.floor(finiteOr(numRelearningSteps, 0)));
    var shortTerm = enableShortTerm !== false;
    var bounds = parameterBounds(FSRS6_W17_W18_CEILING, shortTerm).slice(0, src.length);
    if (steps > 1 && src.length >= 19) {
      var w11 = clamp(finiteOr(src[11], 0), bounds[11][0], bounds[11][1]);
      var w13 = clamp(finiteOr(src[13], 0), bounds[13][0], bounds[13][1]);
      var w14 = clamp(finiteOr(src[14], 0), bounds[14][0], bounds[14][1]);
      var value = -(Math.log(w11) + Math.log(Math.pow(2, w13) - 1) + w14 * 0.3) / steps;
      var dynCeiling = clamp(roundTo(Math.sqrt(Math.max(value, 0)), 8), 0.01, FSRS6_W17_W18_CEILING);
      bounds[17] = [bounds[17][0], dynCeiling];
      bounds[18] = [bounds[18][0], dynCeiling];
    }
    var out = [];
    for (var i = 0; i < bounds.length; i++) {
      out.push(clamp(finiteOr(src[i], 0), bounds[i][0], bounds[i][1]));
    }
    return out;
  }

  function migrateParameters(parameters) {
    if (!Array.isArray(parameters) || parameters.length === 0) {
      return DEFAULT_WEIGHTS.slice();
    }
    if (parameters.length === 21) return parameters.slice();
    if (parameters.length === 19) return parameters.slice().concat([0, FSRS5_DECAY]);
    if (parameters.length === 17) {
      var w = parameters.slice();
      w[4] = Number((w[5] * 2 + w[4]).toFixed(8));
      w[5] = Number((Math.log(w[5] * 3 + 1) / 3).toFixed(8));
      w[6] = Number((w[6] + 0.5).toFixed(8));
      return w.concat([0, 0, 0, FSRS5_DECAY]);
    }
    throw new RangeError('FSRS-6 membutuhkan 17, 19, atau 21 parameter; diterima ' + parameters.length);
  }

  function computeDecayFactor(decayOrWeights) {
    var w20 = typeof decayOrWeights === 'number'
      ? clamp(finiteOr(decayOrWeights, FSRS6_DECAY), 0.1, 0.8)
      : (Array.isArray(decayOrWeights) && decayOrWeights.length >= 21
        ? clamp(finiteOr(decayOrWeights[20], FSRS6_DECAY), 0.1, 0.8)
        : FSRS6_DECAY);
    var decay = -w20;
    var factor = Math.exp(Math.pow(decay, -1) * Math.log(0.9)) - 1;
    return {
      decay: decay,
      factor: roundTo(factor, 8)
    };
  }

  function forgettingCurve(elapsedDays, stability, decayOrWeights) {
    var t = Math.max(0, finiteOr(elapsedDays, 0));
    var s = finiteOr(stability, 0);
    if (!(s > 0)) return 0;
    if (t === 0) return 1;
    var df = computeDecayFactor(decayOrWeights == null ? FSRS6_DECAY : decayOrWeights);
    return roundTo(Math.pow(1 + df.factor * t / s, df.decay), 8);
  }

  /**
   * Jembatan tanpa-lompatan antara `stabilityDays` FSRS-lite (paruh-waktu eksponensial R=0.50)
   * dan `stability` FSRS-6 (titik retensi R=0.90). Keduanya menghasilkan jarak ulangan R=0.90
   * yang identik pada saat migrasi.
   */
  function legacyHalfLifeToStability(halfLifeDays) {
    var h = Math.max(0.05, finiteOr(halfLifeDays, 1.6));
    return roundTo(clamp(h * EXP_R90_RATIO, MODEL_BOUNDS.sMin, MODEL_BOUNDS.sMax), 8);
  }

  function stabilityToLegacyHalfLife(stabilityDays) {
    var s = Math.max(MODEL_BOUNDS.sMin, finiteOr(stabilityDays, legacyHalfLifeToStability(1.6)));
    return roundTo(clamp(s / EXP_R90_RATIO, 0.05, 36500), 6);
  }

  /**
   * Paruh-waktu sejati di bawah kurva power-law FSRS-6: titik waktu t di mana R(t, S) = 0.50.
   */
  function powerLawHalfLife(stabilityDays, decayOrWeights) {
    var s = Math.max(MODEL_BOUNDS.sMin, finiteOr(stabilityDays, MODEL_BOUNDS.sMin));
    var df = computeDecayFactor(decayOrWeights == null ? FSRS6_DECAY : decayOrWeights);
    var halfTerm = Math.pow(0.5, 1 / df.decay) - 1;
    return roundTo(s / df.factor * halfTerm, 6);
  }

  function createModel(config) {
    var cfg = config && typeof config === 'object' ? config : {};
    var enableShortTerm = cfg.enableShortTerm !== false;
    var numRelearningSteps = Math.max(0, Math.floor(finiteOr(cfg.numRelearningSteps, 0)));
    var migrated = migrateParameters(cfg.weights);
    var weights = cfg.clip === false ? migrated.slice() : clipParameters(migrated, numRelearningSteps, enableShortTerm);
    if (weights.length !== 21) {
      throw new RangeError('FSRS-6 membutuhkan tepat 21 parameter');
    }
    var df = computeDecayFactor(weights[20]);

    function initStability(g) {
      return clamp(weights[g - 1], MODEL_BOUNDS.sMin, MODEL_BOUNDS.sMax);
    }

    function initDifficulty(g) {
      var d = weights[4] - Math.exp((g - 1) * weights[5]) + 1;
      return roundTo(d, 8);
    }

    function linearDamping(deltaD, oldD) {
      return roundTo(deltaD * (10 - oldD) / 9, 8);
    }

    function meanReversion(init, current) {
      return roundTo(weights[7] * init + (1 - weights[7]) * current, 8);
    }

    function nextDifficulty(d, g) {
      var deltaD = -weights[6] * (g - 3);
      var nextD = d + linearDamping(deltaD, d);
      return clamp(meanReversion(initDifficulty(Rating.Easy), nextD), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax);
    }

    function nextRecallStability(d, s, r, g) {
      var hardPenalty = g === Rating.Hard ? weights[15] : 1;
      var easyBound = g === Rating.Easy ? weights[16] : 1;
      var nextS = s * (1 + Math.exp(weights[8]) * (11 - d) * Math.pow(s, -weights[9])
        * (Math.exp((1 - r) * weights[10]) - 1) * hardPenalty * easyBound);
      return roundTo(clamp(nextS, MODEL_BOUNDS.sMin, MODEL_BOUNDS.sMax), 8);
    }

    function nextForgetStability(d, s, r) {
      var nextS = weights[11] * Math.pow(d, -weights[12])
        * (Math.pow(s + 1, weights[13]) - 1) * Math.exp((1 - r) * weights[14]);
      return roundTo(clamp(nextS, MODEL_BOUNDS.sMin, MODEL_BOUNDS.sMax), 8);
    }

    function nextShortTermStability(s, g) {
      var sinc = Math.pow(s, -weights[19]) * Math.exp(weights[17] * (g - 3 + weights[18]));
      var maskedSinc = g >= Rating.Hard ? Math.max(sinc, 1) : sinc;
      return roundTo(clamp(s * maskedSinc, MODEL_BOUNDS.sMin, MODEL_BOUNDS.sMax), 8);
    }

    function curve(elapsedDays, stability) {
      return roundTo(Math.pow(1 + df.factor * elapsedDays / stability, df.decay), 8);
    }

    function step(params) {
      var p = params || {};
      var mem = p.memoryState || { difficulty: 0, stability: 0 };
      var d = finiteOr(mem.difficulty, 0);
      var s = finiteOr(mem.stability, 0);
      var t = finiteOr(p.elapsedDays, 0);
      var g = Math.floor(finiteOr(p.rating, -1));
      if (t < 0) throw new RangeError('elapsedDays tidak boleh negatif: ' + t);
      if (g < 0 || g > 4) throw new RangeError('rating FSRS harus 0..4: ' + g);
      if (g === Rating.Manual) {
        return { difficulty: d, stability: s };
      }
      if (d === 0 && s === 0) {
        return {
          difficulty: clamp(initDifficulty(g), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax),
          stability: initStability(g)
        };
      }
      if (d < MODEL_BOUNDS.dMin || s < MODEL_BOUNDS.sMin) {
        throw new RangeError('memoryState tidak sah: D=' + d + ', S=' + s);
      }
      var r = typeof p.retrievability === 'number' && isFinite(p.retrievability)
        ? p.retrievability
        : curve(t, s);
      var newS;
      if (t === 0 && enableShortTerm) {
        newS = nextShortTermStability(s, g);
      } else if (g === Rating.Again) {
        var sAfterFail = nextForgetStability(d, s, r);
        var w17 = enableShortTerm ? weights[17] : 0;
        var w18 = enableShortTerm ? weights[18] : 0;
        var nextSMin = s / Math.exp(w17 * w18);
        newS = clamp(roundTo(nextSMin, 8), MODEL_BOUNDS.sMin, sAfterFail);
      } else {
        newS = nextRecallStability(d, s, r, g);
      }
      return {
        difficulty: nextDifficulty(d, g),
        stability: newS
      };
    }

    function nextInterval(memoryState, desiredRetention) {
      var dr = desiredRetention == null ? DEFAULT_DESIRED_RETENTION : Number(desiredRetention);
      if (!isFinite(dr) || dr <= 0 || dr > 1) {
        throw new RangeError('desiredRetention harus berada di (0, 1]');
      }
      var s = finiteOr(memoryState && memoryState.stability != null ? memoryState.stability : memoryState, 0);
      return Math.max(Math.round(s / df.factor * (Math.pow(dr, 1 / df.decay) - 1)), 1);
    }

    function nextExactGapDays(memoryState, desiredRetention) {
      var dr = clamp(finiteOr(desiredRetention, DEFAULT_DESIRED_RETENTION), 0.5, 0.99);
      var s = Math.max(MODEL_BOUNDS.sMin, finiteOr(memoryState && memoryState.stability != null ? memoryState.stability : memoryState, MODEL_BOUNDS.sMin));
      var raw = s / df.factor * (Math.pow(dr, 1 / df.decay) - 1);
      return roundTo(clamp(raw, 0.05, 365), 4);
    }

    function modelForgettingCurve(memoryState, elapsedDays) {
      var s = finiteOr(memoryState && memoryState.stability != null ? memoryState.stability : memoryState, 0);
      if (!(s > 0)) return 0;
      return curve(Math.max(0, finiteOr(elapsedDays, 0)), s);
    }

    function forward(input) {
      var history = input && Array.isArray(input.history) ? input.history : [];
      var memoryState = (input && input.initialState) ? {
        difficulty: finiteOr(input.initialState.difficulty, 0),
        stability: finiteOr(input.initialState.stability, 0)
      } : null;
      var states = [];
      for (var i = 0; i < history.length; i++) {
        var rv = history[i] || {};
        memoryState = step({
          memoryState: memoryState,
          rating: rv.rating,
          elapsedDays: rv.deltaT != null ? rv.deltaT : rv.elapsedDays
        });
        states.push(memoryState);
      }
      return states;
    }

    return deepFreeze({
      weights: weights.slice(),
      enableShortTerm: enableShortTerm,
      numRelearningSteps: numRelearningSteps,
      bounds: MODEL_BOUNDS,
      initDifficulty: initDifficulty,
      initStability: initStability,
      step: step,
      forward: forward,
      nextInterval: nextInterval,
      nextExactGapDays: nextExactGapDays,
      forgettingCurve: modelForgettingCurve
    });
  }

  var DEFAULT_MODEL = createModel({
    weights: DEFAULT_WEIGHTS,
    enableShortTerm: true,
    numRelearningSteps: 0
  });

  /**
   * Lapisan kuis FIEZEL: turunkan rating 1..4 implisit dari telemetri jawaban nyata,
   * lengkap dengan pagar anti-tebakan (anti-ghost-guess) dan kesadaran bantuan scaffold.
   */
  function deriveImplicitRating(attempt) {
    var a = attempt || {};
    var ok = !!a.ok;
    if (!ok) {
      return { rating: Rating.Again, rationale: 'brain3_fsrs6_rating_again' };
    }
    var ms = finiteOr(a.ms, 6000);
    var guessFloorMs = Math.max(400, finiteOr(a.guessFloorMs, 1400));
    var confidence = a.confidence == null ? null : Number(a.confidence);
    var hintLevel = Math.max(0, Math.floor(finiteOr(a.hintLevel, 0)));
    var retryCount = Math.max(0, Math.floor(finiteOr(a.retryCount, 0)));
    var replayCount = Math.max(0, Math.floor(finiteOr(a.replayCount, 0)));
    var kappa = a.kappa == null ? null : finiteOr(a.kappa, 1);

    // Pagar kejujuran: jawaban cepat mencurigakan (< guessFloorMs), dibantu petunjuk berat,
    // percobaan ulang, putar ulang audio berkali-kali, ragu (confidence=1), atau macet lama (>15 dtk)
    // adalah kemenangan rapuh -> Hard (2), bukan Good/Easy.
    if (
      retryCount > 0 ||
      hintLevel >= 2 ||
      (ms > 0 && ms < guessFloorMs) ||
      (kappa !== null && kappa < 0.55) ||
      replayCount >= 2 ||
      confidence === 1 ||
      ms > 15000
    ) {
      return { rating: Rating.Hard, rationale: 'brain3_fsrs6_rating_hard_guarded' };
    }

    // Penguasaan lancar: mandiri penuh, tanpa ulangan audio/petunjuk, kredibilitas tinggi,
    // dan waktu jawab berada di pita fasih (bukan ketukan buta <1.4 dtk).
    var fluentWithConf = confidence === 3 && ms >= guessFloorMs && ms <= 5500;
    var fluentNoConf = confidence === null && ms >= Math.max(guessFloorMs, 1600) && ms <= 3600;
    if (
      hintLevel === 0 &&
      retryCount === 0 &&
      replayCount === 0 &&
      (kappa === null || kappa >= 0.85) &&
      (fluentWithConf || fluentNoConf)
    ) {
      return { rating: Rating.Easy, rationale: 'brain3_fsrs6_rating_easy_fluent' };
    }

    return { rating: Rating.Good, rationale: 'brain3_fsrs6_rating_good' };
  }

  /**
   * Padukan prior kesulitan populasi ("Ketua Braincore" skala 1..6 CEFR) dengan D0(rating) FSRS-6.
   */
  function seedDifficultyFromPrior(opts) {
    var o = opts || {};
    var model = Array.isArray(o.weights) ? createModel({ weights: o.weights }) : DEFAULT_MODEL;
    var g = clamp(Math.round(finiteOr(o.rating, Rating.Good)), Rating.Again, Rating.Easy);
    var dFsrs = clamp(model.initDifficulty(g), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax);
    if (o.itemDifficulty == null || !isFinite(Number(o.itemDifficulty))) {
      return dFsrs;
    }
    var cefrD = clamp(Number(o.itemDifficulty), 1, 6);
    var dPrior = clamp(1 + (cefrD - 1) * (9 / 5), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax);
    return roundTo(clamp(0.7 * dFsrs + 0.3 * dPrior, MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax), 8);
  }

  function binaryLogLoss(predictedP, ok) {
    var p = clamp(finiteOr(predictedP, 0.5), 1e-6, 1 - 1e-6);
    return ok ? -Math.log(p) : -Math.log(1 - p);
  }

  function binaryBrier(predictedP, ok) {
    var p = clamp(finiteOr(predictedP, 0.5), 0, 1);
    var y = ok ? 1 : 0;
    var diff = p - y;
    return diff * diff;
  }

  /**
   * Langkah bayangan/aktif yang idempoten terhadap pemanggilan ulang `setConfidence()`.
   * Menerima `nowMs` sebagai argumen eksplisit (nol jam tersembunyi).
   */
  function observeShadow(input) {
    var inp = input || {};
    var model = Array.isArray(inp.weights) ? createModel({ weights: inp.weights }) : DEFAULT_MODEL;
    var nowMs = Math.max(0, Math.floor(finiteOr(inp.nowMs != null ? inp.nowMs : inp.now, 0)));
    var prev = inp.baseFsrs6 && typeof inp.baseFsrs6 === 'object' ? inp.baseFsrs6 : null;
    var ok = !!inp.ok;

    var ratingInfo = inp.rating != null && inp.rating >= 1 && inp.rating <= 4
      ? { rating: Math.round(Number(inp.rating)), rationale: 'brain3_fsrs6_rating_explicit' }
      : deriveImplicitRating(inp);
    var g = ratingInfo.rating;

    var hasPrevState = !!(prev && finiteOr(prev.stability, 0) >= MODEL_BOUNDS.sMin && finiteOr(prev.difficulty, 0) >= MODEL_BOUNDS.dMin);
    var memBefore = null;
    var migrated = false;

    if (hasPrevState) {
      memBefore = {
        stability: finiteOr(prev.stability, 0),
        difficulty: clamp(finiteOr(prev.difficulty, 5), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax)
      };
    } else if (finiteOr(inp.legacyHalfLifeDays, 0) > 0) {
      var cefr = clamp(finiteOr(inp.itemDifficulty, 3), 1, 6);
      memBefore = {
        stability: legacyHalfLifeToStability(inp.legacyHalfLifeDays),
        difficulty: roundTo(clamp(1 + (cefr - 1) * (9 / 5), MODEL_BOUNDS.dMin, MODEL_BOUNDS.dMax), 8)
      };
      migrated = true;
    }

    var rawElapsed = inp.elapsedDays != null
      ? Math.max(0, finiteOr(inp.elapsedDays, 0))
      : (prev && finiteOr(prev.lastReviewMs, 0) > 0 && nowMs > prev.lastReviewMs
        ? (nowMs - prev.lastReviewMs) / 86400000
        : 0);
    // FSRS-6 mengaktifkan short-term stability saat deltaT === 0 hari (ulangan di hari yang sama, < 12 jam).
    var stepDays = rawElapsed < 0.5 ? 0 : rawElapsed;

    var predictedR = memBefore ? forgettingCurve(rawElapsed, memBefore.stability, model.weights) : null;
    var nextMem;
    if (!memBefore) {
      var firstStep = model.step({ memoryState: null, rating: g, elapsedDays: 0 });
      nextMem = {
        stability: firstStep.stability,
        difficulty: seedDifficultyFromPrior({
          rating: g,
          itemDifficulty: inp.itemDifficulty,
          weights: model.weights
        })
      };
    } else {
      nextMem = model.step({
        memoryState: memBefore,
        rating: g,
        elapsedDays: stepDays,
        retrievability: stepDays === 0 ? undefined : predictedR
      });
    }

    var baseReps = prev ? Math.max(0, Math.floor(finiteOr(prev.reps, 0))) : 0;
    var baseLapses = prev ? Math.max(0, Math.floor(finiteOr(prev.lapses, 0))) : 0;
    var baseScored = prev ? Math.max(0, Math.floor(finiteOr(prev.nScored, 0))) : 0;
    var baseLl6 = prev ? Math.max(0, finiteOr(prev.logLossSum, 0)) : 0;
    var baseBr6 = prev ? Math.max(0, finiteOr(prev.brierSum, 0)) : 0;
    var baseLlLite = prev ? Math.max(0, finiteOr(prev.liteLogLossSum, 0)) : 0;
    var baseBrLite = prev ? Math.max(0, finiteOr(prev.liteBrierSum, 0)) : 0;

    if (predictedR !== null && rawElapsed > 0) {
      baseScored += 1;
      baseLl6 = roundTo(baseLl6 + binaryLogLoss(predictedR, ok), 6);
      baseBr6 = roundTo(baseBr6 + binaryBrier(predictedR, ok), 6);
      if (inp.litePredictedR != null && isFinite(Number(inp.litePredictedR))) {
        baseLlLite = roundTo(baseLlLite + binaryLogLoss(Number(inp.litePredictedR), ok), 6);
        baseBrLite = roundTo(baseBrLite + binaryBrier(Number(inp.litePredictedR), ok), 6);
      }
    }

    var desiredRetention = clamp(finiteOr(inp.desiredRetention, DEFAULT_DESIRED_RETENTION), 0.7, 0.97);
    var nextGapDays = model.nextExactGapDays(nextMem, desiredRetention);
    var nextIntervalDays = model.nextInterval(nextMem, desiredRetention);

    var nextState = {
      v: 1,
      stability: nextMem.stability,
      difficulty: nextMem.difficulty,
      reps: baseReps + 1,
      lapses: baseLapses + (ok ? 0 : 1),
      lastRating: g,
      lastReviewMs: nowMs,
      nScored: baseScored,
      logLossSum: baseLl6,
      brierSum: baseBr6,
      liteLogLossSum: baseLlLite,
      liteBrierSum: baseBrLite
    };

    return deepFreeze({
      schema: SCHEMA,
      state: nextState,
      rating: g,
      ratingRationale: ratingInfo.rationale,
      migratedFromLegacy: migrated,
      predictedR: predictedR,
      nextGapDays: nextGapDays,
      nextIntervalDays: nextIntervalDays,
      legacyHalfLifeEquiv: stabilityToLegacyHalfLife(nextMem.stability),
      rationale: migrated ? 'brain3_fsrs6_shadow_migrated' : 'brain3_fsrs6_shadow_step',
      confidence: roundTo(clamp(0.5 + 0.05 * Math.min(10, nextState.reps), 0.5, 0.99), 3)
    });
  }

  /**
   * Penyetel berbatas parameter peluruhan ekor pribadi/kohort `w20` di [0.10, 0.80].
   * Pagar wajib: kill-switch, lantai sampel >= 50, validasi silang lipatan genap/ganjil,
   * dan batas langkah tunggal <= 0.05.
   */
  function tuneDecayW20(probeRows, opts) {
    var o = opts || {};
    var currentW20 = clamp(finiteOr(o.currentW20, FSRS6_DECAY), 0.1, 0.8);
    if (o.halted === true) {
      return deepFreeze({
        applied: false,
        w20: currentW20,
        previousW20: currentW20,
        n: 0,
        rationale: 'brain3_fsrs6_tune_halted',
        confidence: 1
      });
    }
    var minSamples = Math.max(20, Math.floor(finiteOr(o.minSamples, 50)));
    var maxStep = clamp(finiteOr(o.maxStep, 0.05), 0.01, 0.2);
    var minImprovement = Math.max(0.0005, finiteOr(o.minImprovement, 0.002));
    var rows = Array.isArray(probeRows) ? probeRows : [];
    var valid = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || typeof r !== 'object') continue;
      var s = finiteOr(r.stability, 0);
      var t = finiteOr(r.elapsedDays, 0);
      if (s >= MODEL_BOUNDS.sMin && t >= 0.25 && typeof r.ok === 'boolean') {
        valid.push({ stability: s, elapsedDays: t, ok: r.ok });
      }
    }
    if (valid.length < minSamples) {
      return deepFreeze({
        applied: false,
        w20: currentW20,
        previousW20: currentW20,
        n: valid.length,
        rationale: 'brain3_fsrs6_tune_insufficient_data',
        confidence: 0.4
      });
    }

    function foldLoss(w, parity) {
      var sum = 0;
      var count = 0;
      for (var j = parity; j < valid.length; j += 2) {
        var item = valid[j];
        var p = forgettingCurve(item.elapsedDays, item.stability, w);
        sum += binaryLogLoss(p, item.ok);
        count++;
      }
      return count > 0 ? sum / count : Infinity;
    }

    var baseLoss0 = foldLoss(currentW20, 0);
    var baseLoss1 = foldLoss(currentW20, 1);
    var bestW = currentW20;
    var bestAvg = (baseLoss0 + baseLoss1) / 2;

    for (var stepIdx = 10; stepIdx <= 80; stepIdx++) {
      var cand = roundTo(stepIdx / 100, 2);
      var l0 = foldLoss(cand, 0);
      var l1 = foldLoss(cand, 1);
      var avg = (l0 + l1) / 2;
      if (
        baseLoss0 - l0 >= minImprovement &&
        baseLoss1 - l1 >= minImprovement &&
        avg < bestAvg
      ) {
        bestAvg = avg;
        bestW = cand;
      }
    }

    if (bestW === currentW20) {
      return deepFreeze({
        applied: false,
        w20: currentW20,
        previousW20: currentW20,
        n: valid.length,
        rationale: 'brain3_fsrs6_tune_hold',
        confidence: 0.85
      });
    }

    var delta = clamp(bestW - currentW20, -maxStep, maxStep);
    var nextW20 = roundTo(clamp(currentW20 + delta, 0.1, 0.8), 4);
    return deepFreeze({
      applied: true,
      w20: nextW20,
      previousW20: currentW20,
      targetW20: bestW,
      n: valid.length,
      improvementNats: roundTo(((baseLoss0 + baseLoss1) / 2) - bestAvg, 6),
      rationale: 'brain3_fsrs6_tune_applied',
      confidence: roundTo(clamp(0.6 + valid.length / 500, 0.6, 0.95), 3)
    });
  }

  return deepFreeze({
    SCHEMA: SCHEMA,
    ENGINE_VERSION: ENGINE_VERSION,
    FSRS5_DECAY: FSRS5_DECAY,
    FSRS6_DECAY: FSRS6_DECAY,
    DEFAULT_DESIRED_RETENTION: DEFAULT_DESIRED_RETENTION,
    Rating: Rating,
    MODEL_BOUNDS: MODEL_BOUNDS,
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS,
    parameterBounds: parameterBounds,
    clipParameters: clipParameters,
    migrateParameters: migrateParameters,
    computeDecayFactor: computeDecayFactor,
    forgettingCurve: forgettingCurve,
    legacyHalfLifeToStability: legacyHalfLifeToStability,
    stabilityToLegacyHalfLife: stabilityToLegacyHalfLife,
    powerLawHalfLife: powerLawHalfLife,
    createModel: createModel,
    deriveImplicitRating: deriveImplicitRating,
    seedDifficultyFromPrior: seedDifficultyFromPrior,
    observeShadow: observeShadow,
    tuneDecayW20: tuneDecayW20
  });
});
