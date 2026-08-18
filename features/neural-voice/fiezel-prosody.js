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

  // Conjunctions and discourse markers that begin a new breath group in speech. A comma
  // before these is what a human would naturally pause at.
  // Deliberately conservative. Words like "when", "if", "so" and "then" usually begin a
  // restrictive clause that speech runs straight into; forcing a comma there produced a
  // chopped, listing delivery in testing. Only markers that reliably open a new breath
  // group are listed.
  var CLAUSE_LEADS = ['but', 'because', 'although', 'though', 'whereas', 'unless', 'so that'];
  // Introductory adverbials: speech pauses just after these, not before.
  var INTRO_MARKERS = ['however', 'therefore', 'for example', 'for instance', 'in fact',
    'of course', 'first', 'second', 'finally', 'meanwhile', 'instead'];

  function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /**
   * Adds the punctuation the duration predictor needs, without changing the words.
   * Never inserts next to punctuation that already exists, so re-running is a no-op.
   */
  function punctuate(text) {
    var out = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    if (!out) return '';

    INTRO_MARKERS.forEach(function (marker) {
      var re = new RegExp('(^|[.!?]\\s+)(' + escapeRe(marker) + ')\\s+(?![,;:])', 'gi');
      out = out.replace(re, function (_m, lead, word) { return lead + word + ', '; });
    });

    CLAUSE_LEADS.forEach(function (lead) {
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
  function phrases(text, maxChars) {
    var limit = Number(maxChars) > 0 ? Number(maxChars) : 200;
    var source = punctuate(text);
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

  return Object.freeze({
    PAUSE_MS: PAUSE_MS,
    punctuate: punctuate,
    phrases: phrases,
    pauseAfter: pauseAfter,
    padSilence: padSilence
  });
}));
