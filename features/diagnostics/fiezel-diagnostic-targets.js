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
    neuralVoice: Object.freeze({ expectedAssetCount: 5 }),
    validLevels: Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  });
}));
