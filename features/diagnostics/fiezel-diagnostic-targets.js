/**
 * m025-34 central diagnostic targets.
 *
 * Every threshold the self-tests measure against lives here and nowhere else, so a
 * changed target is a one-line edit rather than a hunt through module code.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FiezelDiagnosticTargets = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return Object.freeze({
    schema: 'fiezel-diag-targets-v1',
    vocabulary: Object.freeze({ minEntries: 1500, maxEmptyMeaningPercent: 1, maxEmptyPhoneticPercent: 5 }),
    reading: Object.freeze({ minPassages: 200, maxDuplicatePercent: 1 }),
    grammar: Object.freeze({ minTemplates: 100, minItemsPerSkill: 1 }),
    leveltest: Object.freeze({ totalQuestions: 150 }),
    listening: Object.freeze({ minItems: 30 }),
    speaking: Object.freeze({ minItems: 30 }),
    // m025-45: Supertonic 3 ships 11 files (wasm + js + worker + four int8 models +
    // tokenizer data). The count exists to catch a drifted manifest, so it has to
    // track the engine actually shipped.
    neuralVoice: Object.freeze({ expectedAssetCount: 11 }),
    // m025-41: the Indonesian bundle is optional, so its absence is never a failure -
    // but a half-installed or drifted bundle is exactly the state that produced silent
    // Classroom audio, and that must be visible.
    indonesianVoice: Object.freeze({ expectedAssetCount: 11 }),
    // The prototype contract OWNER set: A1 complete across every subject before any
    // higher level is worth counting.
    classroom: Object.freeze({
      foundationLevel: 'A1',
      requiredCategories: Object.freeze(['grammar', 'vocabulary', 'reading', 'listening', 'speaking', 'exam']),
      minFoundationLessons: 24,
      minLessonsPerCategory: 2,
      minSegmentsPerLesson: 3,
      minQuestionsPerLesson: 1
    }),
    // A contour that never moves is the flat delivery OWNER rejected; it is measurable,
    // so the scanner measures it rather than waiting for a human to listen.
    prosody: Object.freeze({ languages: Object.freeze(['en', 'id']), minContourSpread: 0.01 }),
    storage: Object.freeze({ maxUsedPercent: 90 }),
    ui: Object.freeze({ primaryDestinations: 5, maxRenderMs: 1200 }),
    validLevels: Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  });
}));
