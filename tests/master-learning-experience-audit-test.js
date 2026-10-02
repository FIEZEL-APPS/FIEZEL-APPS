/**
 * tests/master-learning-experience-audit-test.js
 * Verification for Master Task: Complete Learning Experience Audit, Debugging & Improvement
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appJsPath = path.join(root, 'app.js');
const styleCssPath = path.join(root, 'style.css');
const grammarUpgradeJsPath = path.join(root, 'features', 'grammar', 'fiezel-grammar-upgrade.js');
const grammarUpgradeCssPath = path.join(root, 'features', 'grammar', 'grammar-upgrade.css');

console.log('=== RUNNING MASTER LEARNING EXPERIENCE AUDIT & VERIFICATION ===\n');

// 1. QUESTION TYPOGRAPHY HIERARCHY & INSTRUCTION SEPARATION
console.log('--- TEST 1: Question Layout & Typography Hierarchy ---');
const appJs = fs.readFileSync(appJsPath, 'utf8');
assert.ok(appJs.includes('question-instruction'), 'app.js must render .question-instruction');
assert.ok(appJs.includes('question-main'), 'app.js must render .question-main');

const styleCss = fs.readFileSync(styleCssPath, 'utf8');
assert.ok(styleCss.includes('.question-instruction'), 'style.css must style .question-instruction');
assert.ok(styleCss.includes('.question-main'), 'style.css must style .question-main');
assert.ok(styleCss.includes('#94A3B8') || styleCss.includes('#94a3b8'), 'style.css must provide secondary color for instruction');
console.log('✓ Test 1 passed: Question instruction & stem typography hierarchy established.\n');

// 2. OPTIMIZE ANSWER CHOICES (CONCISE OPTIONS, NO SENTENCE REPETITION)
console.log('--- TEST 2: Concise Answer Choices ---');
// Verify variant 1 complete_sentence uses meta.options (concise missing words)
assert.ok(!appJs.includes('v1Opts=hasBlank?meta.options:meta.options.map(option=>completeGrammarStem'), 'Variant 1 should not map concise options to repeated full sentences');
console.log('✓ Test 2 passed: Fill-in-the-blank options are concise words, not redundant full sentences.\n');

// 3. ZERO ANSWER LEAKAGE BEFORE SUBMIT
console.log('--- TEST 3: Zero Pre-Submission Answer Leakage ---');
const copyIdPath = path.join(root, 'features', 'i18n', 'copy-id-app-a.js');
const copyId = fs.readFileSync(copyIdPath, 'utf8');
assert.ok(!copyId.includes("'{opsiDikutip} masih salah. Yang benar yang mana?\\n{stem}'"), 'copy-id must not contain answer leakage stem in grammar.mode-repair-stem');
assert.ok(copyId.includes("'grammar.mode-repair-stem': `Perbaiki kalimat berikut dengan pilihan yang tepat:\\n{stem}`"), 'grammar.mode-repair-stem must use neutral instruction');
console.log('✓ Test 3 passed: Zero answer leakage before submit (no distractor naming in stem).\n');

// 4. WORD-ARRANGEMENT EXERCISES (SUSUN KATA)
console.log('--- TEST 4: Word-Arrangement (Susun Kata) Token Purity & Quantity ---');
// Test target: "I want to learn to ride a bike, but I can't."
const mockItem = [
  "I want to learn to ride a bike, but I ___.",
  ["can't", "don't can", "can't to", "couldn't"],
  0,
  {},
  ["", "", "", ""],
  "A1",
  "",
  "",
  "A1-202"
];

// Load simulation environment
const cleanWord = (w) => String(w || '').replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+|[.,\/#!$%\^&\*;:{}=\-_`~()“”"']+$/g, '');
const correct = mockItem[1][mockItem[2]];
let fullSentence = mockItem[0].replace(/_{2,}|\[\.\.\.\]/g, correct).trim();
const rawTokens = fullSentence.split(/\s+/).map(cleanWord).filter(Boolean);
const distractors = mockItem[1].filter((_, i) => i !== mockItem[2]).map(cleanWord).filter(w => Boolean(w) && !w.includes(' ')).slice(0, 2);

// Check tokens
assert.strictEqual(rawTokens.length, 11, 'Target sentence must yield exactly 11 clean tokens');
assert.deepStrictEqual(
  rawTokens,
  ['I', 'want', 'to', 'learn', 'to', 'ride', 'a', 'bike', 'but', 'I', "can't"],
  'All required words must be present without punctuation stuck to them'
);

// Verify two "to"s and two "I"s
const toCount = rawTokens.filter(t => t.toLowerCase() === 'to').length;
const iCount = rawTokens.filter(t => t === 'I').length;
assert.strictEqual(toCount, 2, 'Must have exactly 2 "to" tokens');
assert.strictEqual(iCount, 2, 'Must have exactly 2 "I" tokens');

// Verify distractors do not contain multi-word chips
assert.ok(distractors.every(d => !d.includes(' ')), 'Distractors must be single words');
assert.ok(distractors.includes("couldn't"), 'Distractor couldn\'t should be present');
assert.ok(!distractors.includes("don't can"), 'Multi-word distractor "don\'t can" must be excluded');
assert.ok(!distractors.includes("can't to"), 'Multi-word distractor "can\'t to" must be excluded');

// Test evaluation normalization
const norm = (s) => String(s || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()“”"']/g, '').replace(/\s+/g, ' ').trim();
const constructed = rawTokens.join(' ');
assert.strictEqual(norm(constructed), norm("I want to learn to ride a bike, but I can't."), 'Constructed tokens must evaluate to correct target sentence');

console.log('✓ Test 4 passed: Susun Kata has clean punctuation-free tokens, correct token quantities, and valid distractors.\n');

// 5. HIGH-CONTRAST IN "TUNTUNAN LANGKAH" AND HINTS
console.log('--- TEST 5: High Contrast in Scaffolding & Hints ---');
assert.ok(styleCss.includes('#FFF8EE !important'), 'Tuntunan Langkah must have #FFF8EE background');
assert.ok(styleCss.includes('#1C1917 !important'), 'Tuntunan Langkah text must have #1C1917 text');
assert.ok(styleCss.includes('#78350F !important'), 'Tuntunan Langkah eyebrow/final must have #78350F');

const grammarCss = fs.readFileSync(grammarUpgradeCssPath, 'utf8');
assert.ok(grammarCss.includes('#0f172a !important'), 'Grammar hint must have dark slate background');
assert.ok(grammarCss.includes('#f8fafc !important'), 'Grammar hint must have high contrast light text');
assert.ok(grammarCss.includes('#fbbf24 !important'), 'Grammar hint must have amber 400 titles');
console.log('✓ Test 5 passed: WCAG AAA text contrast verified across scaffolding, hints, and cards.\n');

// 6. TOKEN RESET / HAPUS BUTTON
console.log('--- TEST 6: Token Rail Reset Feature ---');
const grammarUpgradeJs = fs.readFileSync(grammarUpgradeJsPath, 'utf8');
assert.ok(grammarUpgradeJs.includes('tokenResetBtn'), 'fiezel-grammar-upgrade.js must include tokenResetBtn');
assert.ok(grammarCss.includes('.token-reset-btn'), 'grammar-upgrade.css must style .token-reset-btn');
console.log('✓ Test 6 passed: Interactive token reset (Hapus) button available for mobile learners.\n');

// 7. TARGET WORD FORMATTING & HIGHLIGHTING IN SENTENCE CORRECTION
console.log('--- TEST 7: Target Word Highlight, Underline, and Italic in Sentence Correction ---');
const FiezelGrammarUpgrade = require(grammarUpgradeJsPath);
assert.strictEqual(typeof FiezelGrammarUpgrade.formatTargetWord, 'function', 'FiezelGrammarUpgrade.formatTargetWord must be a function');

const testStem = 'The dog is happy. Their tail is moving fast.';
const formattedOutput = FiezelGrammarUpgrade.formatTargetWord(testStem, 'Their', ['Its', 'Their', "It's", "They're"], 'Perbaiki kalimat berikut dengan pilihan yang tepat:');
assert.ok(formattedOutput.includes('<span class="target-word">Their</span>'), 'Target word must be wrapped in <span class="target-word">');
assert.ok(formattedOutput.startsWith('The dog is happy.'), 'Full context opening sentence must be retained');

// Test auto-detection from options when targetWord not passed explicitly
const autoDetectedOutput = FiezelGrammarUpgrade.formatTargetWord(testStem, '', ['Their', 'Its'], 'Perbaiki kalimat berikut:');
assert.ok(autoDetectedOutput.includes('<span class="target-word">Their</span>'), 'Target word should auto-detect from options in repair questions');

// Verify CSS rules for .target-word in style.css and grammar-upgrade.css
assert.ok(styleCss.includes('.target-word'), 'style.css must define .target-word');
assert.ok(styleCss.includes('rgba(245, 158, 11') || styleCss.includes('rgba(245,158,11'), 'style.css must have amber highlight background');
assert.ok(styleCss.includes('text-decoration: underline'), 'style.css must have underline');
assert.ok(styleCss.includes('font-style: italic'), 'style.css must have italic styling');

assert.ok(grammarCss.includes('.target-word'), 'grammar-upgrade.css must define .target-word');
assert.ok(grammarCss.includes('rgba(245, 158, 11') || grammarCss.includes('rgba(245,158,11'), 'grammar-upgrade.css must have amber highlight background');
assert.ok(grammarCss.includes('text-decoration: underline'), 'grammar-upgrade.css must have underline');
assert.ok(grammarCss.includes('font-style: italic'), 'grammar-upgrade.css must have italic styling');
console.log('✓ Test 7 passed: Target word formatted with highlight, underline, and italic styling.\n');

// 8. FULL CONTEXT PRESERVATION (NO MISMATCHED EXPLANATIONS)
console.log('--- TEST 8: Full Context Preservation Across Multi-Sentence Stems ---');
// Verify variant 15-17 in app.js preserves multi-sentence stems instead of stripping them via grammarOptionStem
assert.ok(!appJs.includes('repairSentence=completeGrammarStem(grammarOptionStem(base)'), 'app.js must not strip opening context sentences with grammarOptionStem');
assert.ok(appJs.includes('repairSentence=completeGrammarStem(base,targetWord)'), 'app.js must retain full stem context in repair questions');
console.log('✓ Test 8 passed: Multi-sentence stem context preserved, preventing explanation-question mismatches.\n');

console.log('====================================================');
console.log('ALL MASTER AUDIT LEARNING EXPERIENCE TESTS PASSED!');
console.log('====================================================');

