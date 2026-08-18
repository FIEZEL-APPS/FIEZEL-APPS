/**
 * m025-37 prosody shaping for the sherpa VITS engine.
 *
 * OWNER's report: tempo is right, but words run together as if one long word. The PDD
 * diagnosis was confirmed against the code — `speed` is a global time-stretch, and a
 * VITS/Piper duration predictor only places meaningful silence at PUNCTUATION, never at
 * a plain word boundary. There is no pause parameter to turn on.
 *
 * So natural rhythm has to be produced, not configured. Two levers, both here:
 *
 *   1. Give the model the punctuation it needs. A clause boundary with no comma is
 *      spoken as one continuous phoneme stream, which is exactly what OWNER hears.
 *   2. Insert real silence between synthesized chunks, so breath groups exist even
 *      where the model would run two sentences together.
 *
 * Reference for the timings is ordinary English speech rhythm, the same thing modern
 * assistant voices model: roughly 150-250ms at a comma, 400-600ms at a sentence end.
 * Values sit mid-range and are deliberately conservative — over-punctuating produces a
 * chopped, listing delivery, which is a different failure, not a fix.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelProsody = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PAUSE_MS = Object.freeze({ clause: 200, sentence: 500 });

  // m025-41 OWNER correction: the Indonesian tutor sounded flat and browser-like. The
  // cause was structural rather than model quality - every marker below was English, so
  // an Indonesian line reached the duration predictor with no clause punctuation at all
  // and was spoken as one unbroken, level stream. Rhythm is language specific, so the
  // markers are now a per-language profile and Indonesian has its own.
  //
  // Conjunctions and discourse markers that begin a new breath group in speech. A comma
  // before these is what a human would naturally pause at.
  // Deliberately conservative. Words like "when", "if", "so" and "then" usually begin a
  // restrictive clause that speech runs straight into; forcing a comma there produced a
  // chopped, listing delivery in testing. Only markers that reliably open a new breath
  // group are listed.
  var PROFILES = Object.freeze({
    en: Object.freeze({
      clauseLeads: ['but', 'because', 'although', 'though', 'whereas', 'unless', 'so that'],
      // Introductory adverbials: speech pauses just after these, not before.
      introMarkers: ['however', 'therefore', 'for example', 'for instance', 'in fact',
        'of course', 'first', 'second', 'finally', 'meanwhile', 'instead']
    }),
    id: Object.freeze({
      // Indonesian equivalents, held to the same conservative bar: only markers that
      // reliably open a new breath group. "yang", "kalau" and "saat" are restrictive and
      // are deliberately absent, exactly as "when" and "if" are on the English side.
      clauseLeads: ['tetapi', 'tapi', 'karena', 'walaupun', 'meskipun', 'padahal',
        'sedangkan', 'sehingga', 'supaya', 'agar'],
      // m025-42: the tutor now speaks a casual register, so the markers that open a
      // breath group in casual Indonesian are listed alongside the formal ones. Same
      // conservative bar as before - each of these reliably starts a new breath group
      // when a person says it, which is why a comma after it sounds like speech
      // rather than like a list.
      introMarkers: ['namun', 'jadi', 'nah', 'oke', 'misalnya', 'contohnya',
        'sebenarnya', 'sekarang', 'pertama', 'kedua', 'ketiga', 'terakhir', 'akhirnya',
        'selain itu', 'oleh karena itu', 'dengan kata lain',
        'yuk', 'gas', 'terus', 'abis itu', 'jadinya', 'soalnya', 'makanya',
        'pokoknya', 'intinya', 'gini', 'gitu']
    })
  });

  // Pitch and rate movement are bounded on purpose: past roughly 7% a resampled phrase
  // stops reading as intonation and starts reading as a different speaker.
  var CONTOUR_MIN = 0.93;
  var CONTOUR_MAX = 1.07;

  function profileFor(lang) {
    return /^id/i.test(String(lang || '')) ? PROFILES.id : PROFILES.en;
  }

  function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /**
   * Adds the punctuation the duration predictor needs, without changing the words.
   * Never inserts next to punctuation that already exists, so re-running is a no-op.
   */
  function punctuate(text, lang) {
    var profile = profileFor(lang);
    var out = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!out) return '';

    profile.introMarkers.forEach(function (marker) {
      var re = new RegExp('(^|[.!?]\\s+)(' + escapeRe(marker) + ')\\s+(?![,;:])', 'gi');
      out = out.replace(re, function (_m, lead, word) { return lead + word + ', '; });
    });

    profile.clauseLeads.forEach(function (lead) {
      // Require a real preceding clause (a few words) so short phrases are not chopped.
      var re = new RegExp('(\\w[\\w\'-]*(?:\\s+[\\w\'-]+){2,})\\s+(' + escapeRe(lead) + ')\\s+', 'gi');
      out = out.replace(re, function (match, before, word) {
        if (/[,;:]\s*$/.test(before)) return match;
        return before + ', ' + word + ' ';
      });
    });

    // A trailing sentence mark gives the model its final fall in intonation. Without it
    // the last word is clipped flat, which reads as abrupt.
    if (!/[.!?…]$/.test(out)) out += '.';
    return out.replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }

  /**
   * Splits into speakable units at sentence boundaries, then at clause boundaries only
   * if a sentence is still too long. Never splits mid-phrase: that is what produced a
   * chunk boundary with no punctuation, and therefore no pause, in the first place.
   */
  function phrases(text, maxChars, lang) {
    var limit = Number(maxChars) > 0 ? Number(maxChars) : 200;
    var source = punctuate(text, lang);
    if (!source) return [];
    var sentences = source.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g) || [source];
    var out = [];
    sentences.forEach(function (raw) {
      var sentence = raw.trim();
      if (!sentence) return;
      if (sentence.length <= limit) { out.push(sentence); return; }
      var parts = sentence.split(/(?<=[,;:])\s+/);
      var buffer = '';
      parts.forEach(function (part) {
        if (!buffer) { buffer = part; return; }
        if ((buffer + ' ' + part).length <= limit) buffer += ' ' + part;
        else { out.push(buffer.trim()); buffer = part; }
      });
      if (buffer.trim()) out.push(buffer.trim());
    });
    return out.filter(Boolean);
  }

  /** Silence that should follow a unit, based on how it ends. */
  function pauseAfter(phrase) {
    return /[.!?…]$/.test(String(phrase || '').trim()) ? PAUSE_MS.sentence : PAUSE_MS.clause;
  }

  /**
   * Appends silence to a Float32Array of samples. Real silence between breath groups is
   * what the engine will not produce on its own.
   */
  function padSilence(samples, sampleRate, ms, Ctor) {
    var Arr = Ctor || (typeof Float32Array !== 'undefined' ? Float32Array : null);
    if (!Arr || !samples || !samples.length) return samples;
    var rate = Number(sampleRate) > 0 ? Number(sampleRate) : 22050;
    var pad = Math.max(0, Math.round((Number(ms) || 0) / 1000 * rate));
    if (!pad) return samples;
    var out = new Arr(samples.length + pad);
    out.set(samples, 0);
    return out;
  }

  function clampContour(value) {
    return Math.round(Math.min(CONTOUR_MAX, Math.max(CONTOUR_MIN, value)) * 1000) / 1000;
  }

  /**
   * The intonation contour for one phrase inside an utterance.
   *
   * OWNER's second correction was that the delivery is "datar terus" - level from the
   * first word to the last. A VITS duration predictor has no pitch input, so movement
   * cannot be requested; like the pauses above it has to be produced. Two levers:
   *
   *   speed - passed to the engine, so the phrase is genuinely spoken faster or slower.
   *   pitch - a resample factor applied to the returned samples, which moves the whole
   *           phrase up or down the way a speaker's register moves between breath groups.
   *
   * The shape is the ordinary declarative contour both languages share: a phrase that
   * continues stays up, a question rises further, and the final phrase falls and slows,
   * which is what a listener hears as "finished". Mid-utterance phrases alternate by a
   * hair so a long lesson never settles into a monotone.
   */
  // m025-42: with a persona base the product is deliberately above the old ceiling
  // (hype sits at pitch 1.05 before the sentence shape is applied at all), so the
  // combined value gets its own wider guard rail. Beyond these the measured pitch
  // range starts COLLAPSING rather than widening, so this is a hard stop, not a taste.
  var PERSONA_SPEED_MAX = 1.24;
  var PERSONA_PITCH_MAX = 1.10;
  var PERSONA_PITCH_MIN = 0.90;

  function clampPersona(value, min, max) {
    return Math.round(Math.min(max, Math.max(min, value)) * 1000) / 1000;
  }

  /**
   * @param {object} [base] optional persona baseline {speed, pitch}. When given, the
   *   sentence shape below is applied ON TOP of it, so a praise line keeps its brighter
   *   register while still falling at the end the way a finished sentence does.
   */
  function contour(phrase, index, total, base) {
    var text = String(phrase == null ? '' : phrase).trim();
    var i = Number(index) > 0 ? Math.floor(Number(index)) : 0;
    var n = Number(total) > 0 ? Math.floor(Number(total)) : 1;
    var last = i >= n - 1;
    var speed = 1;
    var pitch = 1;
    if (/\?$/.test(text)) { pitch = 1.045; speed = 1.02; }
    else if (/!$/.test(text)) { pitch = 1.035; speed = 1.02; }
    else if (/[,;:]$/.test(text)) { pitch = 1.025; speed = 1.01; }
    else if (last) { pitch = 0.975; speed = 0.97; }
    else { pitch = i % 2 ? 0.99 : 1.012; }
    // An opening phrase sits slightly higher, the way a speaker starts a new thought.
    if (i === 0 && n > 1 && !/\?$/.test(text)) pitch += 0.008;
    if (base && (Number(base.speed) > 0 || Number(base.pitch) > 0)) {
      var baseSpeed = Number(base.speed) > 0 ? Number(base.speed) : 1;
      var basePitch = Number(base.pitch) > 0 ? Number(base.pitch) : 1;
      return {
        speed: clampPersona(baseSpeed * clampContour(speed), 0.6, PERSONA_SPEED_MAX),
        pitch: clampPersona(basePitch * clampContour(pitch), PERSONA_PITCH_MIN, PERSONA_PITCH_MAX)
      };
    }
    return { speed: clampContour(speed), pitch: clampContour(pitch) };
  }

  /**
   * Linear-interpolation resample. A factor above 1 shortens and raises the phrase, below
   * 1 lengthens and lowers it - one tape-speed move, so formants shift with the pitch and
   * the result still sounds like the same speaker rather than a vocoder artefact. Kept
   * small by clampContour for exactly that reason.
   */
  function resample(samples, factor, Ctor) {
    var Arr = Ctor || (typeof Float32Array !== 'undefined' ? Float32Array : null);
    var rate = Number(factor);
    if (!Arr || !samples || !samples.length || !(rate > 0) || rate === 1) return samples;
    var length = Math.max(1, Math.round(samples.length / rate));
    var out = new Arr(length);
    for (var i = 0; i < length; i++) {
      var at = i * rate;
      var low = Math.floor(at);
      var high = low + 1 < samples.length ? low + 1 : samples.length - 1;
      var frac = at - low;
      out[i] = samples[low] * (1 - frac) + samples[high] * frac;
    }
    return out;
  }

  return Object.freeze({
    PAUSE_MS: PAUSE_MS,
    PROFILES: PROFILES,
    CONTOUR_MIN: CONTOUR_MIN,
    CONTOUR_MAX: CONTOUR_MAX,
    PERSONA_SPEED_MAX: PERSONA_SPEED_MAX,
    PERSONA_PITCH_MAX: PERSONA_PITCH_MAX,
    PERSONA_PITCH_MIN: PERSONA_PITCH_MIN,
    profileFor: profileFor,
    punctuate: punctuate,
    phrases: phrases,
    pauseAfter: pauseAfter,
    padSilence: padSilence,
    contour: contour,
    resample: resample
  });
}));
