/**
 * features/mascot/fiezel-presence-engine.js — FIEZEL Braincore Presence Engine (v1.0).
 *
 * TUGAS UTAMA:
 * Menerjemahkan keadaan kognitif & keputusan belajar Braincore menjadi kehadiran
 * belajar yang nyata, kontekstual, dan bermakna lewat maskot PAW.
 *
 * PRINSIP MUTLAK:
 * 1. Braincore adalah Otak (Intelligence). PAW adalah Wajah Kehadiran (Presence).
 * 2. Keheningan adalah perilaku yang sah: saat murid lancar (flow state), maskot
 *    TIDAK BOLEH menginterupsi dengan animasi atau balon kata berlebihan (SILENT).
 * 3. Kehadiran hanya aktif saat membawa nilai pedagogis: membantu saat bingung (HINTING),
 *    menghibur saat keliru pertama kali (CORRECTING), memandu saat miskonsepsi (REINFORCING),
 *    menantang saat terlalu mudah (CHALLENGING), dan merayakan saat tuntas (CELEBRATING).
 * 4. Mendukung prefers-reduced-motion: bingkai statis (pose) menggantikan gerak.
 * 5. Murni: kalkulasi state presence deterministik, tanpa efek samping implisit.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPresenceEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-presence-engine-v1';

  var STATES = Object.freeze({
    SILENT: 'silent',
    OBSERVING: 'observing',
    THINKING: 'thinking',
    ENCOURAGING: 'encouraging',
    HINTING: 'hinting',
    CORRECTING: 'correcting',
    REINFORCING: 'reinforcing',
    CHALLENGING: 'challenging',
    CELEBRATING: 'celebrating',
    CONCERNED: 'concerned'
  });

  var PAW_MAP = Object.freeze({
    silent: { pawState: 'idle', pawPose: 'studying', silent: true },
    observing: { pawState: 'curious', pawPose: 'studying', silent: true },
    thinking: { pawState: 'thinking', pawPose: 'studying', silent: false },
    encouraging: { pawState: 'encouraging', pawPose: 'studying', silent: false },
    hinting: { pawState: 'hinting', pawPose: 'studying', silent: false },
    correcting: { pawState: 'confused', pawPose: 'studying', silent: false },
    reinforcing: { pawState: 'lesson-start', pawPose: 'reading', silent: false },
    challenging: { pawState: 'proud', pawPose: 'cheering', silent: false },
    celebrating: { pawState: 'celebrating', pawPose: 'cheering', silent: false },
    concerned: { pawState: 'sleepy', pawPose: 'studying', silent: false }
  });

  /**
   * determine(context) -> Decision
   * Menentukan state presence Braincore berdasarkan observasi & sinyal kognitif.
   */
  function determine(context) {
    var ctx = context || {};
    var ok = ctx.ok === true;
    var firstTry = ctx.firstTry !== false;
    var move = String(ctx.move || '');
    var scaffold = String(ctx.scaffold || '');
    var affect = String(ctx.affect || 'neutral');
    var streak = Number(ctx.streak) || 0;
    var isMilestone = ctx.isMilestone === true;
    var timing = String(ctx.timing || '');
    var isFatigued = ctx.isFatigued === true || affect === 'fatigued';

    // 1. Prioritas Keselamatan & Kelelahan (CONCERNED)
    if (isFatigued || move === 'breathe') {
      return {
        state: STATES.CONCERNED,
        pawState: PAW_MAP.concerned.pawState,
        pawPose: PAW_MAP.concerned.pawPose,
        microcopy: 'Fokusmu sudah luar biasa. Istirahat sejenak bila mulai lelah.',
        silent: false,
        rationale: 'presence_affect_fatigue_or_breathe'
      };
    }

    // 2. Perayaan Pencapaian Tuntas (CELEBRATING)
    if (isMilestone || move === 'celebrate') {
      return {
        state: STATES.CELEBRATING,
        pawState: PAW_MAP.celebrating.pawState,
        pawPose: PAW_MAP.celebrating.pawPose,
        microcopy: 'Luar biasa! Materi ini berhasil kamu tuntaskan.',
        silent: false,
        rationale: 'presence_mastery_celebration'
      };
    }

    // 3. Mengajar Ulang Miskonsepsi (REINFORCING)
    if (move === 'reteach') {
      return {
        state: STATES.REINFORCING,
        pawState: PAW_MAP.reinforcing.pawState,
        pawPose: PAW_MAP.reinforcing.pawPose,
        microcopy: 'Yuk kita cermati polanya bersama sebelum mencoba lagi.',
        silent: false,
        rationale: 'presence_reteach_reinforcing'
      };
    }

    // 4. Bantuan Perancah / Hint (HINTING)
    if (!ok && (scaffold === 'hint' || scaffold === 'worked' || move === 'hint')) {
      return {
        state: STATES.HINTING,
        pawState: PAW_MAP.hinting.pawState,
        pawPose: PAW_MAP.hinting.pawPose,
        microcopy: 'Perhatikan kata petunjuknya, lalu coba sekali lagi.',
        silent: false,
        rationale: 'presence_scaffold_hinting'
      };
    }

    // 5. Kesalahan Pertama / Koreksi Halus (CORRECTING)
    if (!ok && firstTry) {
      return {
        state: STATES.CORRECTING,
        pawState: PAW_MAP.correcting.pawState,
        pawPose: PAW_MAP.correcting.pawPose,
        microcopy: 'Hampir tepat. Coba periksa lagi pilihan lainnya.',
        silent: false,
        rationale: 'presence_first_mistake_correcting'
      };
    }

    // 6. Tantangan Lebih Tinggi (CHALLENGING)
    if (ok && (streak >= 5 || move === 'stretch' || affect === 'bored')) {
      return {
        state: STATES.CHALLENGING,
        pawState: PAW_MAP.challenging.pawState,
        pawPose: PAW_MAP.challenging.pawPose,
        microcopy: 'Latihan ini tampak mudah bagimu. Siap tantangan berikutnya?',
        silent: false,
        rationale: 'presence_streak_challenge'
      };
    }

    // 7. Dorongan Semangat saat Pulih (ENCOURAGING)
    if (ok && (!firstTry || timing === 'struggled')) {
      return {
        state: STATES.ENCOURAGING,
        pawState: PAW_MAP.encouraging.pawState,
        pawPose: PAW_MAP.encouraging.pawPose,
        microcopy: 'Bagus sekali! Kamu berhasil menyelesaikannya sendiri.',
        silent: false,
        rationale: 'presence_recovery_encouraging'
      };
    }

    // 8. Menyimak / Mengamati Soal (OBSERVING)
    if (ctx.phase === 'presenting' || ctx.type === 'listening' || ctx.passage) {
      return {
        state: STATES.OBSERVING,
        pawState: ctx.type === 'listening' ? 'listening' : PAW_MAP.observing.pawState,
        pawPose: ctx.type === 'listening' ? 'listening' : (ctx.passage ? 'reading' : PAW_MAP.observing.pawPose),
        microcopy: null,
        silent: true,
        rationale: 'presence_attentive_observing'
      };
    }

    // 9. Berpikir / Evaluasi Adaptif (THINKING)
    if (ctx.phase === 'evaluating') {
      return {
        state: STATES.THINKING,
        pawState: PAW_MAP.thinking.pawState,
        pawPose: PAW_MAP.thinking.pawPose,
        microcopy: null,
        silent: true,
        rationale: 'presence_evaluating_thinking'
      };
    }

    // 10. Default: Hening dalam Flow (SILENT)
    // Saat murid menjawab benar secara lancar, maskot diam memperhatikan tanpa mengganggu
    return {
      state: STATES.SILENT,
      pawState: PAW_MAP.silent.pawState,
      pawPose: PAW_MAP.silent.pawPose,
      microcopy: null,
      silent: true,
      rationale: 'presence_flow_silent'
    };
  }

  /**
   * apply(decision, options)
   * Mengirim instruksi presence ke PAW dan permukaan UI secara aman.
   */
  function apply(decision, options) {
    if (!decision || typeof decision !== 'object') return false;
    var opts = options || {};
    var rootObj = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
    if (!rootObj) return false;

    var motionAllowed = true;
    if (typeof opts.motion === 'boolean') {
      motionAllowed = opts.motion;
    } else if (typeof rootObj.pawMotionAllowed === 'function') {
      motionAllowed = rootObj.pawMotionAllowed();
    }

    var paw = rootObj.FiezelPaw;
    if (!paw) return false;

    try {
      if (motionAllowed && !decision.silent && decision.pawState) {
        paw.setState(decision.pawState);
      } else if (decision.pawPose && typeof paw.applyPose === 'function') {
        paw.applyPose(decision.pawPose);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  return {
    SCHEMA: SCHEMA,
    STATES: STATES,
    PAW_MAP: PAW_MAP,
    determine: determine,
    apply: apply
  };
});
