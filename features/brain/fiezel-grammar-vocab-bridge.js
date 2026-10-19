/**
 * FIEZEL GRAMMAR-VOCAB BRIDGE – Smart Prerequisite Gate with BKT Consultation
 * Enforces Braincore Rule 5: Automatic bypass if learner already masters prerequisite vocab (P(L_t) >= 0.60).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelGrammarVocabBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var gvMap = null;

  function setGrammarVocabMap(map) {
    gvMap = map || null;
  }

  function getLessonVocabStatus(skill, state, bktEngine, externalBktState) {
    var lessons = gvMap && gvMap.lessons ? gvMap.lessons : {};
    var entry = null;
    for (var k in lessons) {
      if (lessons[k] && (lessons[k].skill === skill || k === skill)) {
        entry = lessons[k];
        break;
      }
    }
    var words = Array.isArray(entry && entry.vocabWords) ? entry.vocabWords : [];
    if (!words.length) return { isReady: true, masteredRatio: 1, words: [] };

    var bkt = bktEngine || (typeof self !== 'undefined' ? self.FiezelMasteryBKT : null);
    var bktState = externalBktState || (typeof self !== 'undefined' && typeof self.bktRead === 'function' ? self.bktRead() : null);
    var readyCount = 0;

    for (var i = 0; i < words.length; i++) {
      var w = String(words[i] || '').toLowerCase();
      var bktLesson = 'vocab_' + w;
      var L = bkt && typeof bkt.mastery === 'function' ? Number(bkt.mastery(bktState, bktLesson)?.L || 0) : 0;
      if (L >= 0.60) {
        readyCount++;
      }
    }

    var ratio = readyCount / words.length;
    var isReady = ratio >= 0.60 || !!(state && state.grammar && state.grammar[skill] && state.grammar[skill].vocabReady);
    return {
      isReady: isReady,
      masteredRatio: ratio,
      words: words
    };
  }

  function openLessonPrerequisiteGate(skill) {
    var st = typeof self !== 'undefined' && self.state ? self.state : null;
    var status = getLessonVocabStatus(skill, st);
    // Smart Prerequisite Bypass (P(L_t) >= 0.60 or isReady)
    if (status.isReady && st) {
      st.grammar = st.grammar || {};
      st.grammar[skill] = Object.assign({}, st.grammar[skill] || {}, { vocabReady: true });
      if (typeof self.save === 'function') self.save();
      if (typeof self.practiceSkill === 'function') self.practiceSkill(skill);
    }
  }

  function getIntensityVocabTarget(level, state) {
    var intensity = state && state.studyIntensity ? state.studyIntensity : 'regular';
    if (intensity === 'light') return 6;
    if (intensity === 'intensive') return 14;
    return 10;
  }

  function getIntensityGrammarCount(level, state) {
    var intensity = state && state.studyIntensity ? state.studyIntensity : 'regular';
    if (intensity === 'light') return 6;
    if (intensity === 'intensive') return 12;
    return 10;
  }

  function renderIntensitySelector() {
    return '';
  }

  function checkFirstTimeIntensity() {}

  function startVocabMiniGame(skill) {
    openLessonPrerequisiteGate(skill);
  }

  return {
    setGrammarVocabMap: setGrammarVocabMap,
    getLessonVocabStatus: getLessonVocabStatus,
    openLessonPrerequisiteGate: openLessonPrerequisiteGate,
    getIntensityVocabTarget: getIntensityVocabTarget,
    getIntensityGrammarCount: getIntensityGrammarCount,
    renderIntensitySelector: renderIntensitySelector,
    checkFirstTimeIntensity: checkFirstTimeIntensity,
    startVocabMiniGame: startVocabMiniGame
  };
});
