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

  /**
   * m025-48 breath-group timing for the streaming player.
   *
   * PAUSE_MS above is synthetic silence appended to a Piper render. These are something
   * different: the player now schedules each sentence at an exact context time, with the
   * engine's own lead-in and tail-out trimmed off, so the gap between two sentences is
   * whatever this table says and nothing else. That is the difference between rhythm we
   * describe and rhythm we control.
   *
   * The values are ordinary read-speech spacing - a statement lands and moves on, a
   * question leaves the listener a beat to take it in, a trailing thought hangs longer,
   * a comma is a lift rather than a stop.
   */
  var GAP_MS = Object.freeze({
    clause: 200,
    sentence: 420,
    question: 480,
    exclamation: 420,
    trailing: 560,
    unpunctuated: 260
  });

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
        'of course', 'first', 'second', 'finally', 'meanwhile', 'instead'],
      // m025-48: openers that make a line a question. Kept to unambiguous wh-words -
      // "have", "do" and "can" open imperatives and statements at least as often as
      // questions, and a wrongly rising statement is worse than a flat question.
      questionLeads: ['what', 'why', 'how', 'when', 'where', 'who', 'whose', 'which'],
      questionTags: [],
      softenTags: [],
      exclaimLeads: []
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
        'pokoknya', 'intinya', 'gini', 'gitu',
        // m025-48: a greeting or an interjection is its own breath group. Without the
        // comma "Halo Jahran" is one four-syllable word to the duration predictor, which
        // is why the tutor's opening line never sounded like someone saying hello.
        'halo', 'haloo', 'hai', 'hei', 'eh', 'wah', 'wih', 'aduh', 'duh', 'oh', 'ya ampun'],
      // m025-48. An Indonesian question is usually marked by its opening word, not by
      // word order, so without this every question reached the model as a statement and
      // fell at the end instead of rising. "apakah" is included because it is explicit;
      // "boleh" and "mau" are not, because they open statements just as often.
      questionLeads: ['apa', 'apakah', 'siapa', 'kenapa', 'mengapa', 'kapan', 'gimana',
        'bagaimana', 'berapa', 'di mana', 'dimana', 'yang mana', 'kok'],
      // Tag questions. In casual Indonesian these carry the whole interrogative contour:
      // "Gampang kan" is a question, and only the tag says so.
      questionTags: ['kan', 'gak', 'nggak', 'bukan', 'kah'],
      // Sentence-final softeners. Not all of them ask anything - "kita mulai ya" is an
      // invitation, not a question - but every one of them is a separate beat, and
      // running it into the word before is what makes casual Indonesian sound recited.
      softenTags: ['ya', 'yah', 'deh', 'dong', 'sih', 'nih', 'kok', 'lho', 'loh',
        'kan', 'gak', 'nggak', 'kah'],
      // Short lines that open with one of these are exclamations. A full stop flattens
      // them into an announcement; an exclamation mark is what makes praise sound pleased.
      exclaimLeads: ['halo', 'haloo', 'hai', 'hei', 'wah', 'wih', 'yuk', 'ayo', 'gas',
        'mantap', 'keren', 'hebat', 'sip', 'top', 'yes', 'yeay', 'selamat', 'semangat',
        'bagus', 'nice']
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

    // m025-48: a sentence-final softener is its own beat. "Gampang kan" reaches the
    // duration predictor as one word without this comma, which is precisely the
    // "kata-katanya nyambung" complaint, and the comma is also what lets the tag carry
    // the rise that makes the line a question.
    if (profile.softenTags.length) {
      var tagRe = new RegExp('(\\w[\\w\'’-]*(?:\\s+[\\w\'’-]+)*)\\s+(' +
        profile.softenTags.map(escapeRe).join('|') + ')(?=$|[.!?…])', 'i');
      out = out.replace(tagRe, function (match, before, tag) {
        if (/[,;:]\s*$/.test(before)) return match;
        if (before.trim().split(/\s+/).length < 2) return match;
        return before + ', ' + tag;
      });
    }

    // A trailing sentence mark gives the model its final fall in intonation. Without it
    // the last word is clipped flat, which reads as abrupt.
    //
    // m025-48: WHICH mark is chosen is the intonation. Every unmarked line used to get a
    // full stop, so "Gimana kabarmu" and "Wih keren banget" were both delivered as flat
    // declaratives - a question that never rose and praise that never lifted. That is
    // most of what OWNER hears as "datar".
    if (!/[.!?…]$/.test(out)) out += terminalFor(out, lang);
    return out.replace(/\s+([,.;:!?])/g, '$1').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
  }

  // Punctuation is stripped, not skipped: this runs AFTER the comma rules above, so the
  // opening word of "Wih, keren banget" is "wih" and not "wih,".
  function firstWords(text, count) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s'\u2019-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .slice(0, count)
      .join(' ');
  }

  /** True when the line opens on a question word, or closes on a question tag. */
  function isQuestion(text, lang) {
    var profile = profileFor(lang);
    var line = String(text || '').trim();
    if (!line) return false;
    var lead = firstWords(line, 2);
    for (var i = 0; i < profile.questionLeads.length; i++) {
      var marker = profile.questionLeads[i];
      if (lead === marker || lead.indexOf(marker + ' ') === 0) {
        // "How to open it" is a title, not a question; nobody says it with a rise.
        if (/^\w+ to$/.test(lead)) return false;
        return true;
      }
    }
    var tail = line.toLowerCase().replace(/[^\w\s]+$/, '').split(/\s+/).pop() || '';
    return profile.questionTags.indexOf(tail) >= 0;
  }

  /** True for short interjection-led lines: greetings, praise, encouragement. */
  function isExclamation(text, lang) {
    var profile = profileFor(lang);
    var line = String(text || '').trim();
    if (!line || !profile.exclaimLeads.length) return false;
    if (line.split(/\s+/).length > 6) return false;
    var lead = firstWords(line, 1);
    return profile.exclaimLeads.indexOf(lead) >= 0;
  }

  function terminalFor(text, lang) {
    if (isQuestion(text, lang)) return '?';
    if (isExclamation(text, lang)) return '!';
    return '.';
  }

  /**
   * The silence that belongs BEFORE the next line, given how this one ended.
   *
   * Used by the streaming player, which schedules sentences at exact context times with
   * the engine's own edge silence trimmed away - so this table is the rhythm the learner
   * actually hears between two sentences, not an estimate of it.
   */
  function gapAfter(text, lang) {
    var line = String(text || '').trim();
    if (!line) return 0;
    if (/…$|\.\.\.$/.test(line)) return GAP_MS.trailing;
    if (/\?$/.test(line)) return GAP_MS.question;
    if (/!$/.test(line)) return GAP_MS.exclamation;
    if (/\.$/.test(line)) return GAP_MS.sentence;
    if (/[,;:]$/.test(line)) return GAP_MS.clause;
    // Unmarked text is mid-thought; give it a beat rather than a breath.
    return isQuestion(line, lang) ? GAP_MS.question : GAP_MS.unpunctuated;
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

  /**
   * m025-48 per-sentence delivery.
   *
   * The active engine has its own intonation, so the pitch resampler is off (m025-45) -
   * which left exactly one lever between one sentence and the next: the rate the engine
   * is asked to speak it at. That is enough, because it is a real prosodic cue rather
   * than a post-hoc effect: a person quickens through praise, holds a question level and
   * slows into the sentence that closes a thought.
   *
   * Movement is small on purpose. Beyond a few percent this stops reading as delivery
   * and starts reading as an unstable speaking rate.
   */
  var EMOTION = Object.freeze({
    hype: Object.freeze({ id: 'hype', speed: 1.05 }),
    question: Object.freeze({ id: 'question', speed: 1.005 }),
    opening: Object.freeze({ id: 'opening', speed: 1.02 }),
    carrying: Object.freeze({ id: 'carrying', speed: 1.012 }),
    settling: Object.freeze({ id: 'settling', speed: 0.99 }),
    closing: Object.freeze({ id: 'closing', speed: 0.965 }),
    neutral: Object.freeze({ id: 'neutral', speed: 1 })
  });

  /**
   * @param {string} text       the sentence about to be spoken
   * @param {string} [intent]   an explicit product intent, which always wins
   * @param {string} [lang]     language profile for the marker lists
   * @param {object} [position] {index, total} of this sentence inside the utterance
   */
  function emotion(text, intent, lang, position) {
    var explicit = String(intent || '').toLowerCase();
    if (explicit === 'hype' || explicit === 'pujian' || explicit === 'sapaan') return EMOTION.hype;
    var line = String(text == null ? '' : text).trim();
    if (!line) return EMOTION.neutral;
    if (/!$/.test(line) || isExclamation(line, lang)) return EMOTION.hype;
    if (/\?$/.test(line) || isQuestion(line, lang)) return EMOTION.question;
    var total = position && Number(position.total) > 0 ? Math.floor(Number(position.total)) : 1;
    // A line spoken on its own has no arc to shape, so it is left exactly as the engine
    // and the persona deliver it. Shaping one isolated sentence would only make every
    // sentence in the Library slower than the last release, which is not intonation.
    if (total < 2) return EMOTION.neutral;
    var index = position && Number(position.index) > 0 ? Math.floor(Number(position.index)) : 0;
    if (index >= total - 1) return EMOTION.closing;
    if (/…$|\.\.\.$/.test(line)) return EMOTION.settling;
    if (index === 0) return EMOTION.opening;
    // Mid-utterance sentences alternate by a hair, which is what stops a paragraph from
    // settling into one rate the way a reading machine does.
    return index % 2 ? EMOTION.settling : EMOTION.carrying;
  }

  return Object.freeze({
    PAUSE_MS: PAUSE_MS,
    GAP_MS: GAP_MS,
    EMOTION: EMOTION,
    PROFILES: PROFILES,
    CONTOUR_MIN: CONTOUR_MIN,
    CONTOUR_MAX: CONTOUR_MAX,
    PERSONA_SPEED_MAX: PERSONA_SPEED_MAX,
    PERSONA_PITCH_MAX: PERSONA_PITCH_MAX,
    PERSONA_PITCH_MIN: PERSONA_PITCH_MIN,
    profileFor: profileFor,
    punctuate: punctuate,
    isQuestion: isQuestion,
    isExclamation: isExclamation,
    terminalFor: terminalFor,
    gapAfter: gapAfter,
    emotion: emotion,
    phrases: phrases,
    pauseAfter: pauseAfter,
    padSilence: padSilence,
    contour: contour,
    resample: resample
  });
}));
