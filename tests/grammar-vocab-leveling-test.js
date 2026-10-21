/**
 * tests/grammar-vocab-leveling-test.js
 * Comprehensive automated verification for FIEZEL Learning Scaffolding & Pacing Leveling System:
 * - 3 Intensity Levels: Pelajar Santai (5V/10G), Siswa Teladan (10V/15G), Super Rajin (15V/20G)
 * - Mapping dataset integrity (all 180 curriculum lessons mapped to 15 vocab items from vocabulary-master.json)
 * - Vocabulary count scaling (5, 10, 15) and hierarchical prefix property
 * - Grammar question session scaling (10, 15, 20) in app.js and bridge
 * - State preferences persistence, sanitization, and PROGRESS_PREF_FIELDS
 * - Vocab prerequisite readiness scoring
 * - UI rendering for intensity selector, warmup card, and settings integration
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

console.log('===========================================================');
console.log('RUNNING TESTS: FIEZEL GRAMMAR-VOCAB LEVELING SYSTEM');
console.log('===========================================================\n');

// 1. Verify Bridge Module & Constants
console.log('--- TEST 1: Bridge Module Exports & Level Definitions ---');
const bridge = require(path.join(root, 'features', 'grammar', 'grammar-vocab-bridge.js'));

assert(bridge, 'Bridge module must export an object');
assert(bridge.LEVELS, 'bridge.LEVELS must be defined');

const santai = bridge.LEVELS.santai;
const teladan = bridge.LEVELS.teladan;
const rajin = bridge.LEVELS.rajin;

assert(santai, 'Level "santai" must exist');
assert(teladan, 'Level "teladan" must exist');
assert(rajin, 'Level "rajin" must exist');

// Verify exact specs from user prompt
assert.strictEqual(santai.vocabTarget, 5, 'Pelajar Santai must target 5 VOCAB');
assert.strictEqual(santai.name, 'Pelajar Santai', 'Pelajar Santai name must match');
assert(santai.grammarQuestionCount >= 5 && santai.grammarQuestionCount <= 10, 'Pelajar Santai grammar questions must be in range 5-10');
assert.strictEqual(santai.grammarQuestionCount, 10, 'Pelajar Santai standard grammar questions should be 10');

assert.strictEqual(teladan.vocabTarget, 10, 'Siswa Teladan must target 10 VOCAB');
assert.strictEqual(teladan.name, 'Siswa Teladan', 'Siswa Teladan name must match');
assert(teladan.grammarQuestionCount >= 10 && teladan.grammarQuestionCount <= 15, 'Siswa Teladan grammar questions must be in range 10-15');
assert.strictEqual(teladan.grammarQuestionCount, 15, 'Siswa Teladan standard grammar questions should be 15');

assert.strictEqual(rajin.vocabTarget, 15, 'Super Rajin must target 15 VOCAB');
assert.strictEqual(rajin.name, 'Super Rajin', 'Super Rajin name must match');
assert(rajin.grammarQuestionCount >= 15 && rajin.grammarQuestionCount <= 20, 'Super Rajin grammar questions must be in range 15-20');
assert.strictEqual(rajin.grammarQuestionCount, 20, 'Super Rajin standard grammar questions should be 20');

assert.strictEqual(bridge.DEFAULT_INTENSITY, 'santai', 'Default intensity should be santai');

console.log('✓ Test 1 passed: All 3 intensity tiers accurately defined with specified vocab and grammar targets.');

// 2. Verify Mapping File (content/grammar-vocab-map-v1.json)
console.log('--- TEST 2: Grammar-Vocab Mapping Dataset Integrity ---');
const mapPath = path.join(root, 'content', 'grammar-vocab-map-v1.json');
assert(fs.existsSync(mapPath), 'content/grammar-vocab-map-v1.json must exist');

const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
assert.strictEqual(mapData.schema, 'fiezel-grammar-vocab-map-v1', 'Schema must be fiezel-grammar-vocab-map-v1');

const curPath = path.join(root, 'grammar-curriculum-v1.json');
const curLessons = JSON.parse(fs.readFileSync(curPath, 'utf8')).lessons;

const vocabMasterPath = path.join(root, 'vocabulary-master.json');
const vocabMaster = JSON.parse(fs.readFileSync(vocabMasterPath, 'utf8'));
const vocabMasterIds = new Set(vocabMaster.map(v => v.id));

assert.strictEqual(curLessons.length, 180, 'Curriculum must contain 180 lessons');
assert(mapData.lessons, 'mapData.lessons must exist');

for (const lesson of curLessons) {
  const entry = mapData.lessons[lesson.lessonId];
  assert(entry, `Lesson ${lesson.lessonId} must be mapped in grammar-vocab-map-v1.json`);
  assert.strictEqual(entry.lessonId, lesson.lessonId, `lessonId must match for ${lesson.lessonId}`);
  assert.strictEqual(entry.level, lesson.level, `level must match curriculum for ${lesson.lessonId}`);
  assert(Array.isArray(entry.vocabIds), `vocabIds must be an array for ${lesson.lessonId}`);
  assert.strictEqual(entry.vocabIds.length, 15, `Each lesson must have exactly 15 vocabIds for all tiers (${lesson.lessonId})`);
  assert(Array.isArray(entry.words), `words must be an array for ${lesson.lessonId}`);
  assert.strictEqual(entry.words.length, 15, `Each lesson must have exactly 15 words (${lesson.lessonId})`);
  assert(Array.isArray(entry.vocabDetails), `vocabDetails must be an array for ${lesson.lessonId}`);
  assert.strictEqual(entry.vocabDetails.length, 15, `Each lesson must have exactly 15 vocabDetails (${lesson.lessonId})`);

  // Verify each vocab ID exists in vocabulary-master.json
  for (const vId of entry.vocabIds) {
    assert(vocabMasterIds.has(vId), `Vocab ID ${vId} in lesson ${lesson.lessonId} must exist in vocabulary-master.json`);
  }
}

console.log(`✓ Test 2 passed: All 180 curriculum lessons mapped to exactly 15 validated vocabulary words.`);

// 3. Verify Vocabulary Scaling & Hierarchical Prefix Property
console.log('--- TEST 3: Vocabulary Slicing & Hierarchical Consistency ---');
const sampleLesson = curLessons[0].lessonId;

const santaiVocab = bridge.getVocabForLesson(sampleLesson, 'santai');
const teladanVocab = bridge.getVocabForLesson(sampleLesson, 'teladan');
const rajinVocab = bridge.getVocabForLesson(sampleLesson, 'rajin');

assert.strictEqual(santaiVocab.length, 5, 'Santai must return exactly 5 vocabulary items');
assert.strictEqual(teladanVocab.length, 10, 'Teladan must return exactly 10 vocabulary items');
assert.strictEqual(rajinVocab.length, 15, 'Rajin must return exactly 15 vocabulary items');

// Check hierarchical prefix consistency: Santai 5 words are first 5 of Teladan, and first 5 of Rajin
for (let i = 0; i < 5; i++) {
  assert.strictEqual(santaiVocab[i].id, teladanVocab[i].id, `Word at index ${i} must match between Santai and Teladan`);
  assert.strictEqual(santaiVocab[i].id, rajinVocab[i].id, `Word at index ${i} must match between Santai and Rajin`);
}
for (let i = 0; i < 10; i++) {
  assert.strictEqual(teladanVocab[i].id, rajinVocab[i].id, `Word at index ${i} must match between Teladan and Rajin`);
}

console.log('✓ Test 3 passed: Vocab counts scale to 5, 10, and 15 with strict hierarchical continuity.');

// 4. Verify Readiness & Scaffolding Calculation
console.log('--- TEST 4: Vocabulary Prerequisite Readiness Scoring ---');
// User with empty vocab progress
const emptyState = { vocab: {} };
const emptyStatus = bridge.getVocabPrerequisiteStatus(sampleLesson, emptyState);

assert.strictEqual(emptyStatus.targetCount, 5, 'Santai targetCount must be 5 on empty state');
assert.strictEqual(emptyStatus.masteredCount, 0, 'masteredCount must be 0 on empty state');
assert.strictEqual(emptyStatus.isReady, false, 'isReady must be false when no words are mastered');

// User who mastered 4 out of 5 words
const masteredState = {
  preferences: { learningIntensity: 'santai' },
  vocab: {
    [santaiVocab[0].id]: { mastery: 85, attempts: 4 },
    [santaiVocab[1].id]: { mastery: 90, attempts: 3 },
    [santaiVocab[2].id]: { mastery: 75, attempts: 2 },
    [santaiVocab[3].id]: { mastery: 65, attempts: 2 }
  }
};
const readyStatus = bridge.getVocabPrerequisiteStatus(sampleLesson, masteredState);
assert.strictEqual(readyStatus.masteredCount, 4, 'masteredCount must be 4');
assert.strictEqual(readyStatus.isReady, true, 'isReady must be true when 4/5 words mastered');
assert(readyStatus.completionRatio >= 0.8, 'completionRatio must reflect 4/5 = 0.8');

console.log('✓ Test 4 passed: Prerequisite status correctly tracks mastery progress and readiness.');

// 5. Verify State Preferences & Sanitization in app.js
console.log('--- TEST 5: State Preferences Integration & Sanitization ---');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

assert(appSrc.includes("learningIntensity:'santai'"), 'defaultPreferences must include learningIntensity: santai');
assert(appSrc.includes("'learningIntensity'"), 'PROGRESS_PREF_FIELDS must include learningIntensity');
assert(appSrc.includes("['santai','teladan','rajin'].includes(String(rawPreferences.learningIntensity||''))"), 'sanitizeState must validate learningIntensity');

// Test switching intensity via API
const stateFixture = { preferences: { learningIntensity: 'santai' } };
assert.strictEqual(bridge.getActiveIntensity(stateFixture), 'santai');

assert.strictEqual(bridge.setActiveIntensity('teladan', stateFixture), true);
assert.strictEqual(stateFixture.preferences.learningIntensity, 'teladan');
assert.strictEqual(bridge.getActiveIntensity(stateFixture), 'teladan');
assert.strictEqual(bridge.getIntensityVocabTarget(undefined, stateFixture), 10);
assert.strictEqual(bridge.getIntensityGrammarCount(undefined, stateFixture), 15);

assert.strictEqual(bridge.setActiveIntensity('rajin', stateFixture), true);
assert.strictEqual(stateFixture.preferences.learningIntensity, 'rajin');
assert.strictEqual(bridge.getActiveIntensity(stateFixture), 'rajin');
assert.strictEqual(bridge.getIntensityVocabTarget(undefined, stateFixture), 15);
assert.strictEqual(bridge.getIntensityGrammarCount(undefined, stateFixture), 20);

// Invalid level must be rejected and fallback to default
assert.strictEqual(bridge.setActiveIntensity('invalid_level', stateFixture), false);
assert.strictEqual(bridge.getActiveIntensity({ preferences: { learningIntensity: 'bogus' } }), 'santai');

console.log('✓ Test 5 passed: State preferences, switching, sanitization, and fallback verified.');

// 6. Verify Grammar Question Count Adaptation
console.log('--- TEST 6: Grammar Session Question Scaling ---');
assert.strictEqual(bridge.getIntensityGrammarCount('santai'), 10, 'Santai must produce 10 grammar questions');
assert.strictEqual(bridge.getIntensityGrammarCount('teladan'), 15, 'Teladan must produce 15 grammar questions');
assert.strictEqual(bridge.getIntensityGrammarCount('rajin'), 20, 'Rajin must produce 20 grammar questions');

// Test grammarLessonSessionTarget scaling in sandbox
function sourceBlock(name, source = appSrc) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

const targetFnSrc = sourceBlock('grammarLessonSessionTarget');
assert(targetFnSrc, 'grammarLessonSessionTarget source block must exist');

const makeTargetSandbox = (intensity) => ({
  state: { preferences: { learningIntensity: intensity } },
  FiezelGrammarVocabBridge: bridge,
  GRAMMAR_SESSION_SIZE: 20,
  GRAMMAR_PRACTICE_SLOT_MODES: ['apply_form','complete_sentence','repair_distractor_1','repair_distractor_2','repair_distractor_3'],
  G: { [sampleLesson]: new Array(10).fill(['stem', ['a','b'], 0]) },
  grammarLessonReviewSkills: () => []
});

const runTargetInSandbox = (intensity) => {
  const sb = makeTargetSandbox(intensity);
  vm.createContext(sb);
  vm.runInContext(`${targetFnSrc}\nresult = grammarLessonSessionTarget(${JSON.stringify(sampleLesson)});`, sb);
  return sb.result;
};

assert.strictEqual(runTargetInSandbox('santai'), 10, 'grammarLessonSessionTarget must scale to 10 for santai');
assert.strictEqual(runTargetInSandbox('teladan'), 15, 'grammarLessonSessionTarget must scale to 15 for teladan');
assert.strictEqual(runTargetInSandbox('rajin'), 20, 'grammarLessonSessionTarget must scale to 20 for rajin');
console.log('✓ Test 6 passed: Grammar session target scales to 10, 15, and 20 in VM execution.');

// Verify app.js hooks
assert(appSrc.includes('FiezelGrammarVocabBridge.getIntensityGrammarCount'), 'app.js must call getIntensityGrammarCount in session building');
assert(appSrc.includes('id="settingLearningIntensity"'), 'app.js must include settingLearningIntensity in settings');
// 7. Verify UI Components & Styles
console.log('--- TEST 7: UI Markup & CSS Integrity ---');
const selectorHtml = bridge.renderIntensitySelector();
assert(selectorHtml.includes('data-intensity="santai"'), 'grammar-vocab-bridge.js must render data-intensity for pills');
assert(selectorHtml.includes('Pelajar Santai'), 'Selector must include Pelajar Santai');
assert(selectorHtml.includes('Siswa Teladan'), 'Selector must include Siswa Teladan');
assert(selectorHtml.includes('Super Rajin'), 'Selector must include Super Rajin');

const warmupHtml = bridge.renderLessonVocabWarmup(sampleLesson);
assert(warmupHtml.includes('grammar-vocab-scaffold-card'), 'Warmup card must include grammar-vocab-scaffold-card');
assert(warmupHtml.includes('scaffold-warmup-btn'), 'Warmup card must include warmup action button');

const cssPath = path.join(root, 'features', 'grammar', 'grammar-vocab-bridge.css');
assert(fs.existsSync(cssPath), 'grammar-vocab-bridge.css must exist');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.grammar-intensity-selector'), 'CSS must define .grammar-intensity-selector');
assert(cssContent.includes('.grammar-vocab-scaffold-card'), 'CSS must define .grammar-vocab-scaffold-card');
assert(cssContent.includes('.scaffold-vocab-chip'), 'CSS must define .scaffold-vocab-chip');
assert(cssContent.includes('.scaffold-intensity-pill'), 'CSS must define .scaffold-intensity-pill');

// Verify index.html includes CSS and JS
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(indexHtml.includes('features/grammar/grammar-vocab-bridge.css'), 'index.html must include grammar-vocab-bridge.css');
assert(indexHtml.includes('features/grammar/grammar-vocab-bridge.js'), 'index.html must include grammar-vocab-bridge.js');

console.log('✓ Test 7 passed: UI components, CSS styling, and index.html wiring verified.');

// 8. Verify PWA Service Worker Precache Integrity
console.log('--- TEST 8: PWA Service Worker Precache Integrity ---');
const swSrc = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const swAssetsMatch = swSrc.match(/const ASSETS=\[[\s\S]*?\];/);
assert(swAssetsMatch, 'sw.js must contain ASSETS array');
const swAssets = swAssetsMatch[0];

assert(swAssets.includes('./features/grammar/grammar-vocab-bridge.css'), 'sw.js ASSETS must include grammar-vocab-bridge.css');
assert(swAssets.includes('./features/grammar/grammar-vocab-bridge.js'), 'sw.js ASSETS must include grammar-vocab-bridge.js');
assert(swAssets.includes('./content/grammar-vocab-map-v1.json'), 'sw.js ASSETS must include grammar-vocab-map-v1.json');
console.log('✓ Test 8 passed: All leveling and bridge assets precached in service worker.');

// 9. Verify Warmup Session Flow & Cross-Level Integrity
console.log('--- TEST 9: Warmup Session Flow & Cross-Level Integration ---');
assert(appSrc.includes('cfg.allowCrossLevel'), 'quizLoop must support allowCrossLevel for prerequisite vocab warmups');
assert(appSrc.includes('cfg?.warmupSkill'), 'finishQuiz must support warmupSkill return action');
assert(appSrc.includes('cfg?.onComplete'), 'finishQuiz must invoke cfg.onComplete callback');
assert(typeof bridge.setGrammarVocabMap === 'function', 'bridge must export setGrammarVocabMap');

// Test warmup start with mock quizLoop
let launchedQuiz = null;
global.state = { preferences: { learningIntensity: 'teladan' }, vocab: {} };
global.V = vocabMaster;
global.showToast = () => {};
global.quizLoop = (cfg) => { launchedQuiz = cfg; };

bridge.startGrammarVocabWarmup(sampleLesson);
assert(launchedQuiz, 'startGrammarVocabWarmup must invoke quizLoop');
assert.strictEqual(launchedQuiz.type, 'vocab', 'Warmup session type must be vocab');
assert.strictEqual(launchedQuiz.warmupSkill, sampleLesson, 'Warmup session must carry warmupSkill');
assert.strictEqual(launchedQuiz.allowCrossLevel, true, 'Warmup session must specify allowCrossLevel: true');
assert.strictEqual(launchedQuiz.count, 10, 'Teladan warmup must launch with 10 words');
assert.strictEqual(typeof launchedQuiz.onComplete, 'function', 'Warmup session must define onComplete callback');
console.log('✓ Test 9 passed: Warmup session configuration, cross-level safety, and return CTA verified.');

// 10. Verify Vocab Hub Quiz Scaling & Scroll Preservation
console.log('--- TEST 10: Vocab Hub Quiz Scaling & Interaction Robustness ---');
// Test startVocabQuiz in VM sandbox with different intensities
const vocabQuizFnSrc = sourceBlock('startVocabQuiz');
assert(vocabQuizFnSrc, 'startVocabQuiz function must exist in app.js');

// Audit V-A 2026-10-04: startVocabQuiz membangun kolamnya sendiri (kartu jatuh tempo dulu, lalu kata
// level aktif) dan menyaringnya dengan validateQuestion/sigQ, jadi sandbox menyediakan ketiganya.
const runVocabQuizInSandbox = (intensity, dueCards = []) => {
  let launched = null;
  const sb = {
    state: { preferences: { learningIntensity: intensity } },
    FiezelGrammarVocabBridge: bridge,
    getActiveLevel: () => 'A1',
    shuffle: (arr) => arr.slice(),
    V: vocabMaster,
    makeVocabQuestion: (item) => ({ ...item }),
    vocabReviewQueue: () => dueCards,
    validateQuestion: () => ({ ok: true }),
    sigQ: (q) => String(q.id),
    quizLoop: (cfg) => { launched = cfg; },
    showToast: () => {},
    FiezelI18n: { t: () => '' }
  };
  vm.createContext(sb);
  vm.runInContext(`${vocabQuizFnSrc}\nstartVocabQuiz();`, sb);
  return launched;
};

assert.strictEqual(runVocabQuizInSandbox('santai')?.count, 5, 'Vocab Hub quiz must scale to 5 for Pelajar Santai');
assert.strictEqual(runVocabQuizInSandbox('teladan')?.count, 10, 'Vocab Hub quiz must scale to 10 for Siswa Teladan');
assert.strictEqual(runVocabQuizInSandbox('rajin')?.count, 15, 'Vocab Hub quiz must scale to 15 for Super Rajin');
assert.strictEqual(runVocabQuizInSandbox('teladan')?.pool.length, 10, 'Vocab Hub quiz pool must hold exactly one session of words');
{
  // Kartu jatuh tempo (termasuk level di bawah level aktif) wajib ikut sesi, di depan kolam.
  const a1 = vocabMaster.filter(v => v.level === 'A1');
  const due = [{ ...a1[a1.length - 1], level: 'A1' }, { id: 'due-old-level', word: 'old', level: 'A1' }];
  const launchedDue = runVocabQuizInSandbox('santai', due);
  assert.strictEqual(JSON.stringify(launchedDue.pool.slice(0, 2).map(q => String(q.id))), JSON.stringify(due.map(v => String(v.id))), 'Due cards must lead the vocab quiz pool'); // JSON: array dari realm vm
  assert.strictEqual(launchedDue.pool.length, 5, 'Due cards count toward the session size, not on top of it');
  assert.strictEqual(new Set(launchedDue.pool.map(q => String(q.id))).size, 5, 'A due card must not appear twice in one session');
  assert.strictEqual(launchedDue.allowCrossLevel, true, 'Vocab quiz must allow due cards from earlier levels');
}

// Test scroll position restoration in handleIntensitySelect
let restoredScrollY = null;
let lessonRendered = false;
global.window = {
  scrollY: 420,
  scrollTo: (opts) => { restoredScrollY = opts.top; }
};
global.renderGrammarLesson = (sk) => { lessonRendered = true; };

bridge.handleIntensitySelect('rajin', sampleLesson);
assert.strictEqual(lessonRendered, true, 'renderGrammarLesson must be invoked');
assert.strictEqual(restoredScrollY, 420, 'Scroll position must be preserved at 420px on intensity switch');
console.log('✓ Test 10 passed: Vocab Hub quiz scaling (5/10/15) and mid-lesson scroll preservation verified.');

console.log('\n===========================================================');
console.log('ALL GRAMMAR-VOCAB LEVELING TESTS PASSED PERFECTLY!');
console.log('===========================================================\n');
