/**
 * m025-42 voice persona — the tutor's two speaking registers.
 *
 * OWNER listened to the m025-42 audition kit and picked two deliveries by name:
 *
 *   R2-sid2_GENZ-energetic_S2_ajar  -> sid 2, speed 1.12, pitch 1.03   (explaining)
 *   R2-sid5_GENZ-max_S4_pujian      -> sid 5, speed 1.18, pitch 1.05   (praise / hype)
 *
 * Those exact numbers are the product decision, so they are stated here once and
 * nothing else is allowed to invent its own. The two personas are deliberately
 * different speakers: a lesson that never changes voice is the "bosan" OWNER asked
 * us to fix, and switching register at a praise line is what a human tutor does.
 *
 * Measured note kept as a warning, not a rule to re-derive: pushing beyond roughly
 * speed 1.18 / pitch 1.05 COMPRESSES the contour instead of energising it (the
 * research run measured the pitch range of the sid5 "max" setting falling from
 * 14.7 to 10.9 semitones). MAX_* below is that ceiling, and it is a ceiling, not a
 * target.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelVoicePersona = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var MAX_SPEED = 1.18;
  var MAX_PITCH = 1.05;

  var PERSONAS = Object.freeze({
    // Penjelasan: the register a learner hears most, so it is the calmer of the two.
    ajar: Object.freeze({ id: 'ajar', sid: 2, speed: 1.12, pitch: 1.03, label: 'Tutor ceria' }),
    // Sapaan, pujian, transisi: short lines, allowed to be brighter and faster.
    hype: Object.freeze({ id: 'hype', sid: 5, speed: 1.18, pitch: 1.05, label: 'Tutor hype' })
  });

  var DEFAULT_PERSONA = 'ajar';

  var HYPE_INTENTS = ['hype', 'pujian', 'sapaan', 'transisi',
    'praise', 'greeting', 'encourage', 'celebrate', 'welcome'];
  var AJAR_INTENTS = ['ajar', 'penjelasan', 'instruksi',
    'explain', 'teach', 'instruct', 'correction', 'koreksi'];

  // Words that mark a line as praise/greeting rather than teaching. Kept short and
  // unambiguous: a false positive only swaps the speaker, but a marker that also
  // appears mid-explanation would swap it constantly, which reads as unstable.
  var HYPE_MARKERS = [
    'keren', 'mantap', 'hebat', 'bagus', 'gas', 'yeay', 'wih', 'sip', 'top',
    'selamat', 'halo', 'haloo', 'hai', 'hei', 'yuk', 'ayo', 'semangat',
    'nice', 'good job', 'well done', 'awesome',
    // m025-48. One utterance is now rendered one SENTENCE at a time, so the register is
    // resolved per sentence rather than once for a whole paragraph - a praise line
    // inside an explanation finally gets to be spoken by the praise voice. That makes
    // the marker list worth completing with the words this tutor actually uses.
    'wah', 'yes', 'asik', 'asyik', 'wow', 'jago', 'pinter', 'pintar',
    'tepat', 'betul', 'bener banget', 'luar biasa', 'lanjut'
  ];

  function escapeRe(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  var HYPE_RE = new RegExp('(^|[\\s,.!?])(' + HYPE_MARKERS.map(escapeRe).join('|') + ')(?=$|[\\s,.!?])', 'i');

  /**
   * Which register a line belongs to. An explicit intent always wins: content that
   * knows it is a praise line should not depend on word matching.
   */
  function resolve(text, intent) {
    var explicit = String(intent || '').toLowerCase();
    // English intent names are accepted alongside the Indonesian ones: callers name their
    // intents in whichever language their module is written in, and a name that does not
    // resolve silently costs the line its register.
    if (HYPE_INTENTS.indexOf(explicit) >= 0) return PERSONAS.hype;
    if (AJAR_INTENTS.indexOf(explicit) >= 0) return PERSONAS.ajar;
    var line = String(text == null ? '' : text).trim();
    if (!line) return PERSONAS[DEFAULT_PERSONA];
    // A short exclamation is hype even without a listed marker: "Bener banget!"
    var wordCount = line.split(/\s+/).length;
    if (HYPE_RE.test(line) && wordCount <= 14) return PERSONAS.hype;
    if (/!$/.test(line) && wordCount <= 8) return PERSONAS.hype;
    return PERSONAS[DEFAULT_PERSONA];
  }

  function clampSpeed(value) {
    var n = Number(value);
    if (!(n > 0)) return 1;
    return Math.round(Math.min(MAX_SPEED, Math.max(0.6, n)) * 1000) / 1000;
  }
  function clampPitch(value) {
    var n = Number(value);
    if (!(n > 0)) return 1;
    return Math.round(Math.min(MAX_PITCH, Math.max(0.9, n)) * 1000) / 1000;
  }

  function byId(id) {
    var key = String(id || DEFAULT_PERSONA);
    return PERSONAS[key] || PERSONAS[DEFAULT_PERSONA];
  }

  /** Voice-id -> speaker-id map, in the shape the sherpa adapter expects. */
  function voiceSids() {
    return Object.freeze({
      // Product-facing ids. id_natural is retained so stored learner preferences
      // and the Indonesian bundle contract keep resolving after the engine change.
      id_natural: PERSONAS.ajar.sid,
      tutor_ajar: PERSONAS.ajar.sid,
      tutor_hype: PERSONAS.hype.sid
    });
  }

  return Object.freeze({
    HYPE_INTENTS: Object.freeze(HYPE_INTENTS.slice()),
    AJAR_INTENTS: Object.freeze(AJAR_INTENTS.slice()),
    MAX_SPEED: MAX_SPEED,
    MAX_PITCH: MAX_PITCH,
    PERSONAS: PERSONAS,
    DEFAULT_PERSONA: DEFAULT_PERSONA,
    HYPE_MARKERS: Object.freeze(HYPE_MARKERS.slice()),
    resolve: resolve,
    byId: byId,
    clampSpeed: clampSpeed,
    clampPitch: clampPitch,
    voiceSids: voiceSids
  });
}));
