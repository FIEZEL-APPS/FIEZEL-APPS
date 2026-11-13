/**
 * FIEZEL · tests/pte-academic-engine-test.js
 * Comprehensive Deterministic Unit Test Suite for PTE Academic Big 4 Scoring Engine.
 */
const assert = require('assert');
const engine = require('../features/pte/fiezel-pte-engine.js');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('--- Testing FIEZEL PTE Academic Engine ---');

// 1. Tokenization & Distance
test('tokenize handles punctuation, case, and whitespace', () => {
  const tokens = engine.tokenize("Cooking is both an art, and a science! Won't you agree?");
  assert.deepStrictEqual(tokens, ['cooking', 'is', 'both', 'an', 'art', 'and', 'a', 'science', "won't", 'you', 'agree']);
});

test('charLevenshtein calculates accurate edit distance', () => {
  assert.strictEqual(engine.charLevenshtein('accommodation', 'accommodation'), 0);
  assert.strictEqual(engine.charLevenshtein('accommodation', 'acommodation'), 1);
  assert.strictEqual(engine.charLevenshtein('hygiene', 'hygeine'), 2);
  assert.strictEqual(engine.charLevenshtein('', 'test'), 4);
});

test('tokenAlignment computes accurate substitutions, deletions, and WER', () => {
  const ref = ['the', 'quick', 'brown', 'fox'];
  const hyp = ['the', 'fast', 'brown', 'fox'];
  const align = engine.tokenAlignment(ref, hyp);
  assert.strictEqual(align.substitutions, 1);
  assert.strictEqual(align.deletions, 0);
  assert.strictEqual(align.insertions, 0);
  assert.strictEqual(align.wer, 0.25);
  assert.strictEqual(align.matchRatio, 0.75);
});

// 2. Read Aloud Scoring
test('evaluateReadAloud gives full score for exact speech transcript', () => {
  const text = 'Cooking is both an art and an exacting science.';
  // 8 words read in 3.6 seconds = 133 WPM (optimal fluency cadence 115-155 WPM)
  const res = engine.evaluateReadAloud(text, text, { durationSec: 3.6, confidenceAvg: 0.95 });
  assert.strictEqual(res.content.score, 3);
  assert.strictEqual(res.content.matchRatio, 1.0);
  assert.strictEqual(res.fluency.score >= 3, true);
  assert.strictEqual(res.pronunciation.score >= 4, true);
  assert.strictEqual(res.pearsonScore >= 70, true);
});

test('evaluateReadAloud degrades gracefully on missed words', () => {
  const text = 'Cooking is both an art and an exacting science.';
  const spoken = 'Cooking is art science.';
  const res = engine.evaluateReadAloud(text, spoken, { durationSec: 10, confidenceAvg: 0.85 });
  assert.strictEqual(res.content.score <= 2, true);
  assert.strictEqual(res.pearsonScore < 70, true);
});

// 3. Repeat Sentence Scoring
test('evaluateRepeatSentence awards 3 points for exact sequence', () => {
  const sentence = 'Please submit your completed assignment to the student office before Friday afternoon.';
  const res = engine.evaluateRepeatSentence(sentence, sentence, { durationSec: 5, confidenceAvg: 0.92 });
  assert.strictEqual(res.content.score, 3);
  assert.strictEqual(res.crossCredits.listening >= 40, true);
  assert.strictEqual(res.crossCredits.speaking >= 40, true);
});

test('evaluateRepeatSentence awards 2 points for partial sequence (>=50%)', () => {
  const sentence = 'Please submit your completed assignment to the student office before Friday afternoon.';
  const spoken = 'Please submit your completed assignment before Friday.';
  const res = engine.evaluateRepeatSentence(sentence, spoken, { durationSec: 4 });
  assert.strictEqual(res.content.score >= 1, true);
});

test('evaluateRepeatSentence awards 0 points for completely irrelevant response', () => {
  const sentence = 'Please submit your completed assignment to the student office.';
  const spoken = 'I want to eat delicious pizza today.';
  const res = engine.evaluateRepeatSentence(sentence, spoken, { durationSec: 4 });
  assert.strictEqual(res.content.score, 0);
});

// 4. Describe Image Scoring
test('evaluateDescribeImage detects keywords and template markers', () => {
  const chartData = {
    keywords: ['tourist', 'arrivals', 'Western Australia', 'Perth', '2024'],
    categories: ['2018', '2020', '2024'],
    highPoint: '2024',
    lowPoint: '2020'
  };
  const response = 'The given image represents tourist arrivals in Western Australia. According to the chart, we can see 2018, 2020, and 2024. The maximum figure is in 2024 with high visitors. In conclusion, the picture provides significant data.';
  const res = engine.evaluateDescribeImage(chartData, response, { durationSec: 30, confidenceAvg: 0.90 });

  assert.strictEqual(res.content.score >= 3, true);
  assert.strictEqual(res.durationSufficient, true);
  assert.strictEqual(res.content.matchedKeywords.length >= 2, true);
  assert.strictEqual(res.content.detectedTemplateMarkers.length >= 3, true);
  assert.strictEqual(res.pearsonScore >= 42, true);
});

test('evaluateDescribeImage penalizes short speech under 20 seconds', () => {
  const chartData = { keywords: ['tourist', 'arrivals'] };
  const shortResponse = 'The given image represents tourist arrivals.';
  const res = engine.evaluateDescribeImage(chartData, shortResponse, { durationSec: 8 });
  assert.strictEqual(res.durationSufficient, false);
  assert.strictEqual(res.content.score <= 2, true);
});

// 5. Write from Dictation Scoring
test('evaluateWriteFromDictation awards 1 point per correct word', () => {
  const sentence = 'The university provides free accommodation for international exchange students.';
  const typed = 'The university provides free accommodation for international exchange students.';
  const res = engine.evaluateWriteFromDictation(sentence, typed);
  assert.strictEqual(res.content.score, 9);
  assert.strictEqual(res.content.max, 9);
  assert.strictEqual(res.content.matchRatio, 1.0);
  assert.strictEqual(res.pearsonScore, 90);
  assert.strictEqual(res.isTarget42Qualified, true);
});

test('evaluateWriteFromDictation flags spelling misconceptions accurately', () => {
  const sentence = 'The university provides free accommodation for international students.';
  const typed = 'The university provides free acommodation for international students.';
  const challenges = [
    { word: 'accommodation', commonErrors: ['acommodation', 'accomodation'], rule: "Double 'c' and double 'm'." }
  ];
  const res = engine.evaluateWriteFromDictation(sentence, typed, challenges);
  assert.strictEqual(res.content.score, 7); // 7 of 8 words (missed accommodation due to typo)
  assert.strictEqual(res.spellingMisconceptions.length, 1);
  assert.strictEqual(res.spellingMisconceptions[0].targetWord, 'accommodation');
  assert.strictEqual(res.spellingMisconceptions[0].typedWord, 'acommodation');
});

// 6. Composite Pearson Score & Target 42 Benchmarking
test('calculateCompositePearson correctly computes overall and evaluates Target 42 pass', () => {
  const perfect = engine.calculateCompositePearson({ ra: 80, rs: 85, di: 75, wfd: 90 });
  assert.strictEqual(perfect.overall >= 80, true);
  assert.strictEqual(perfect.target42Passed, true);
  assert.strictEqual(perfect.distanceToTarget42, 0);

  const target42 = engine.calculateCompositePearson({ ra: 45, rs: 42, di: 40, wfd: 44 });
  assert.strictEqual(target42.target42Passed, true);
  assert.strictEqual(target42.overall >= 42, true);

  const beginner = engine.calculateCompositePearson({ ra: 25, rs: 20, di: 20, wfd: 25 });
  assert.strictEqual(beginner.target42Passed, false);
  assert.strictEqual(beginner.distanceToTarget42 > 0, true);
});

// 7. Nakul 2025/2026 Masterclass Algorithmic Enhancements
test('evaluateRepeatSentence flags Nakul 50% rule compliance', () => {
  const sentence = 'Please submit your completed assignment to the student office before Friday afternoon.';
  const spoken = 'Please submit your completed assignment before Friday.';
  const res = engine.evaluateRepeatSentence(sentence, spoken, { durationSec: 4 });
  assert.strictEqual(res.meets50PercentRule, true);
  assert.ok(res.content.nakulFeedback.includes('50% Rule Satisfied'));
});

test('evaluateDescribeImage detects Nakul 5-line template and 25-28s optimal duration zone', () => {
  const chartData = {
    keywords: ['coffee', 'consumption', 'Europe', 'Finland', 'Italy'],
    categories: ['Finland', 'Norway', 'Italy'],
    highPoint: 'Finland',
    lowPoint: 'Italy'
  };
  const nakulResponse = 'The image provided is a bar chart that gives information about coffee consumption in Europe. While the x-axis represents European countries, the y-axis shows kilograms per person. It is evident that Finland has the highest value with over twelve kilograms. Conversely, Italy has the lowest value among the selected countries. Overall, this image clearly illustrates significant variations in beverage consumption.';

  const res = engine.evaluateDescribeImage(chartData, nakulResponse, { durationSec: 26.5 });
  assert.strictEqual(res.isOptimalDuration, true);
  assert.strictEqual(res.durationZone, 'optimal_25_28');
  assert.strictEqual(res.nakulTemplate.isDetected, true);
  assert.strictEqual(res.nakulTemplate.linesCount >= 4, true);
  assert.strictEqual(res.content.score, 5);
  assert.ok(res.durationAdvice.includes('Optimal Nakul Fluency Zone'));
});

test('evaluateWriteFromDictation verifies Nakul Extra Words Hack without penalty', () => {
  const sentence = 'The student completed the challenging assignment.';
  // Student uses extra word hack: writing both singular & plural (student students) and extra article
  const studentWithHack = 'The student students completed the challenging assignment assignments on time.';
  const res = engine.evaluateWriteFromDictation(sentence, studentWithHack);

  // Target sentence has 6 words: the, student, completed, the, challenging, assignment.
  // Student matched all 6 words.
  assert.strictEqual(res.content.score, 6);
  assert.strictEqual(res.content.matchRatio, 1);
  assert.strictEqual(res.extraWordsCount >= 3, true);
  assert.strictEqual(res.extraWordsHackDetected, true);
  assert.ok(res.nakulHackAdvice.includes('Extra Words Hack Applied'));
});

test('evaluateAcousticPitch checks pitch frequency for male speaker', () => {
  const bass = engine.evaluateAcousticPitch(105, 'male');
  assert.strictEqual(bass.isOptimal, false);
  assert.strictEqual(bass.zone, 'deep_bass');
  assert.ok(bass.feedback.includes('too low/bass'));

  const optimal = engine.evaluateAcousticPitch(140, 'male');
  assert.strictEqual(optimal.isOptimal, true);
  assert.strictEqual(optimal.zone, 'optimal');
  assert.ok(optimal.feedback.includes('Optimal Pearson Male Pitch'));
});

test('getDailyRoadmapDay and calculateDailyProgress handle 30-day curriculum', () => {
  const mockRoadmap = {
    days: [
      {
        day: 1,
        title: 'Day 1: Acoustic Foundation',
        tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }, { id: 't5' }]
      },
      {
        day: 2,
        title: 'Day 2: Breath Marking',
        tasks: [{ id: 't6' }, { id: 't7' }]
      }
    ]
  };

  const day1 = engine.getDailyRoadmapDay(1, mockRoadmap);
  assert.strictEqual(day1.title, 'Day 1: Acoustic Foundation');

  const progress = engine.calculateDailyProgress(day1.tasks, ['t1', 't2', 't3']);
  assert.strictEqual(progress.completedCount, 3);
  assert.strictEqual(progress.totalCount, 5);
  assert.strictEqual(progress.percent, 60);
  assert.strictEqual(progress.isDayCompleted, false);

  const fullProgress = engine.calculateDailyProgress(day1.tasks, ['t1', 't2', 't3', 't4', 't5']);
  assert.strictEqual(fullProgress.isDayCompleted, true);
  assert.strictEqual(fullProgress.percent, 100);
});

// 6. Reading Evaluators (FIB Dropdown, Drag & Drop, Reorder Paragraphs)
test('evaluateReadingFib scores dropdown blanks and attaches deepFeedback', () => {
  const item = {
    blanks: [
      { id: 1, correct: 'role', options: ['part', 'role', 'function'], deepFeedback: { formula: 'play a vital role in' } },
      { id: 2, correct: 'factors', options: ['factors', 'items'], deepFeedback: { formula: 'lifestyle factors' } },
      { id: 3, correct: 'essential', options: ['essential', 'optional'], deepFeedback: { formula: 'essential for health' } }
    ]
  };

  const perfect = engine.evaluateReadingFib(item, { 1: 'role', 2: 'factors', 3: 'essential' });
  assert.strictEqual(perfect.score, 3);
  assert.strictEqual(perfect.maxScore, 3);
  assert.strictEqual(perfect.percentage, 100);
  assert.strictEqual(perfect.passed, true);
  assert.strictEqual(perfect.blankResults[0].deepFeedback.formula, 'play a vital role in');

  const partial = engine.evaluateReadingFib(item, { 1: 'part', 2: 'factors', 3: 'essential' });
  assert.strictEqual(partial.score, 2);
  assert.strictEqual(partial.blankResults[0].isCorrect, false);
  assert.strictEqual(partial.percentage, 67);
});

test('evaluateReadingDragDrop validates word pool assignments', () => {
  const item = {
    correctAnswers: { blank_1: 'build', blank_2: 'damage' },
    deepFeedback: { blank_1: { correct: 'build' }, blank_2: { correct: 'damage' } }
  };

  const perfect = engine.evaluateReadingDragDrop(item, { blank_1: 'build', blank_2: 'damage' });
  assert.strictEqual(perfect.score, 2);
  assert.strictEqual(perfect.maxScore, 2);
  assert.strictEqual(perfect.percentage, 100);
  assert.strictEqual(perfect.passed, true);

  const wrong = engine.evaluateReadingDragDrop(item, { blank_1: 'destroy', blank_2: 'damage' });
  assert.strictEqual(wrong.score, 1);
  assert.strictEqual(wrong.results.blank_1.isCorrect, false);
  assert.strictEqual(wrong.results.blank_2.isCorrect, true);
});

test('evaluateReorderParagraphs implements Pearson adjacent pairs scoring', () => {
  const item = {
    correctOrder: ['B', 'D', 'A', 'C'],
    deepFeedback: { independentSentence: 'Kalimat B' }
  };

  // Target pairs: B-D, D-A, A-C (3 pairs)
  const perfect = engine.evaluateReorderParagraphs(item, ['B', 'D', 'A', 'C']);
  assert.strictEqual(perfect.score, 3);
  assert.strictEqual(perfect.maxScore, 3);
  assert.strictEqual(perfect.passed, true);
  assert.deepStrictEqual(perfect.matchedPairs, ['B-D', 'D-A', 'A-C']);

  // User order: B, D, C, A -> user pairs: B-D (match), D-C (no), C-A (no) -> score: 1
  const partial = engine.evaluateReorderParagraphs(item, ['B', 'D', 'C', 'A']);
  assert.strictEqual(partial.score, 1);
  assert.strictEqual(partial.maxScore, 3);
  assert.strictEqual(partial.passed, false);
  assert.deepStrictEqual(partial.matchedPairs, ['B-D']);
});

// 7. Writing Evaluators (SWT & Essay)
test('evaluateSummarizeWrittenText enforces single sentence and word limits', () => {
  const item = {
    modelSummary: 'While commercial agriculture produces food, unsustainable practices cause environmental degradation.',
    formulaScaffold: '[Lead clause], while [Main clause].'
  };

  const validText = 'While modern agriculture provides essential sustenance for humanity, unsustainable farming practices cause significant environmental degradation and accelerate biodiversity loss worldwide.';
  const evalValid = engine.evaluateSummarizeWrittenText(item, validText);
  assert.strictEqual(evalValid.sentenceCount, 1);
  assert.strictEqual(evalValid.breakdown.form, 1);
  assert.strictEqual(evalValid.passed, true);
  assert.ok(evalValid.score >= 5);

  // Two sentences (Pearson Fatal Error)
  const twoSentences = 'Modern agriculture provides food. However it damages nature.';
  const evalTwo = engine.evaluateSummarizeWrittenText(item, twoSentences);
  assert.strictEqual(evalTwo.breakdown.form, 0);
  assert.strictEqual(evalTwo.score, 0);
  assert.ok(evalTwo.feedback.some(f => f.includes('Fatal Pearson Error')));

  // Word count > 75 words
  const longText = 'Modern agriculture ' + 'word '.repeat(76) + '.';
  const evalLong = engine.evaluateSummarizeWrittenText(item, longText);
  assert.strictEqual(evalLong.breakdown.form, 0);
  assert.strictEqual(evalLong.score, 0);
});

test('evaluateWriteEssay scores 4 paragraphs, word limit and cohesion', () => {
  const item = {
    nakulScaffold: 'Scaffold structure'
  };

  const p1 = 'In contemporary society, education plays an indispensable role in shaping human destiny. Historically, civilizations have advanced through the systematic transmission of knowledge, ethical values, and technical expertise across generations. Consequently, educational institutions form the bedrock of societal development and cultural preservation. Without structured schooling, modern civilization would struggle to maintain scientific and technological progress in competitive global environments.';
  const p2 = 'Firstly, formal education equips individuals with analytical reasoning, quantitative literacy, and technical proficiency. In modern economies, specialized technological competence and adaptability are paramount for professional advancement. Therefore, learners with robust academic foundations secure prosperous employment prospects in highly competitive vocational marketplaces. Furthermore, structured academic instruction fosters critical problem-solving skills that allow graduates to navigate complex socioeconomic dilemmas effectively.';
  const p3 = 'On the other hand, experiential learning outside academic institutions provides pragmatic wisdom and emotional maturity. Practical immersion in workplace settings teaches resilience, teamwork, and tactical problem-solving that theoretical lectures cannot replicate. Thus, hands-on apprenticeships complement abstract scholarly knowledge by grounding theories in real-world application. Combining vocational practice with theoretical understanding ensures well-rounded competence and rapid occupational adaptability.';
  const p4 = 'In conclusion, both academic curricula and vocational apprenticeships remain undeniably vital for holistic development. While formal schooling provides theoretical principles, practical exposure guarantees real-world readiness. Ultimately, a balanced pedagogical approach combining scholarly instruction and practical immersion empowers learners to attain long-term vocational excellence and personal fulfillment throughout their careers.';

  const fullEssay = [p1, p2, p3, p4].join('\n\n');
  const result = engine.evaluateWriteEssay(item, fullEssay);
  assert.strictEqual(result.paragraphCount, 4);
  assert.strictEqual(result.breakdown.form, 2);
  assert.strictEqual(result.breakdown.structure, 2);
  assert.ok(result.score >= 12);
  assert.strictEqual(result.passed, true);

  // Under 120 words gives form = 0, score = 0
  const shortEssay = 'This is a short essay that fails Pearson minimum limit.';
  const shortResult = engine.evaluateWriteEssay(item, shortEssay);
  assert.strictEqual(shortResult.breakdown.form, 0);
  assert.strictEqual(shortResult.score, 0);
});

// 8. Listening Evaluators (Retell Lecture, SST, Listening FIB, HIW)
test('evaluateRetellLecture checks key noun chunks and fluency', () => {
  const item = {
    keyNounChunks: ['deep learning', 'neural networks', 'image recognition', 'future developments'],
    nakulTemplateSpeech: 'The lecture primarily discussed...'
  };

  const transcript = 'The speaker discussed deep learning and neural networks in modern computer science, highlighting image recognition and future developments.';
  const result = engine.evaluateRetellLecture(item, transcript, { fluency: 4.5, pronunciation: 4.0 });
  assert.strictEqual(result.matchedChunks.length, 4);
  assert.strictEqual(result.breakdown.content, 5);
  assert.strictEqual(result.passed, true);
  assert.ok(result.score >= 13);
});

test('evaluateSummarizeSpokenText enforces 50-70 word target', () => {
  const item = {
    modelSummary: 'The lecture highlighted marine ecosystem protection, asserting that sustainable fisheries prevent coral reef degradation.'
  };

  const goodSummary = 'The speaker highlighted the critical necessity of global marine conservation, asserting that sustainable fisheries actively protect fragile oceanic ecosystems. Furthermore, empirical research clearly demonstrates that reducing industrial chemical pollution prevents catastrophic biodiversity collapse across vulnerable coastal reefs. In conclusion, collective environmental action and stricter regulatory governance remain absolutely imperative for long-term ecological balance.';
  const result = engine.evaluateSummarizeSpokenText(item, goodSummary);
  assert.strictEqual(result.breakdown.form, 2);
  assert.ok(result.score >= 7);
  assert.strictEqual(result.passed, true);

  // Under 40 words gives form = 0, score = 0
  const under40 = 'The lecture was about marine conservation and fish.';
  const shortRes = engine.evaluateSummarizeSpokenText(item, under40);
  assert.strictEqual(shortRes.breakdown.form, 0);
  assert.strictEqual(shortRes.score, 0);
});

test('evaluateListeningFib checks exact spelling and returns spellingTips', () => {
  const item = {
    blanks: [
      { id: 1, correct: 'accommodate', spellingTip: 'Double c and double m' },
      { id: 2, correct: 'phenomenon', spellingTip: 'Singular ending in -on' }
    ]
  };

  const perfect = engine.evaluateListeningFib(item, { 1: 'accommodate', 2: 'phenomenon' });
  assert.strictEqual(perfect.score, 2);
  assert.strictEqual(perfect.percentage, 100);
  assert.strictEqual(perfect.passed, true);

  const typo = engine.evaluateListeningFib(item, { 1: 'acomodate', 2: 'phenomenon' });
  assert.strictEqual(typo.score, 1);
  assert.strictEqual(typo.blankResults[0].isCorrect, false);
  assert.strictEqual(typo.blankResults[0].spellingTip, 'Double c and double m');
});

test('evaluateHighlightIncorrectWords applies Pearson negative marking', () => {
  const item = {
    displayedText: 'Regular physical activity is necessary for improving concentration and decreasing hunger after meals.',
    incorrectWords: [
      { displayed: 'necessary', spoken: 'essential' },
      { displayed: 'hunger', spoken: 'fatigue' }
    ]
  };

  // Words: ['regular'(0), 'physical'(1), 'activity'(2), 'is'(3), 'necessary'(4), 'for'(5), 'improving'(6), 'concentration'(7), 'and'(8), 'decreasing'(9), 'hunger'(10), 'after'(11), 'meals'(12)]
  // Incorrect words are at index 4 ('necessary') and index 10 ('hunger')

  // Case 1: Candidate clicks both errors accurately (indices 4 and 10)
  const perfect = engine.evaluateHighlightIncorrectWords(item, [4, 10]);
  assert.strictEqual(perfect.correctClicks, 2);
  assert.strictEqual(perfect.falseAlarms, 0);
  assert.strictEqual(perfect.netScore, 2);
  assert.strictEqual(perfect.passed, true);

  // Case 2: Candidate clicks 1 correct error (4) and 1 innocent word (0: 'regular')
  // Net score: 1 - 1 = 0 (Negative marking applied!)
  const penalised = engine.evaluateHighlightIncorrectWords(item, [4, 0]);
  assert.strictEqual(penalised.correctClicks, 1);
  assert.strictEqual(penalised.falseAlarms, 1);
  assert.strictEqual(penalised.netScore, 0);
  assert.strictEqual(penalised.negativeMarkingApplied, true);

  // Case 3: More false alarms than correct clicks: score cannot drop below 0
  const floorZero = engine.evaluateHighlightIncorrectWords(item, [0, 1, 2]);
  assert.strictEqual(floorZero.netScore, 0);
  assert.strictEqual(floorZero.falseAlarms, 3);
});

// 9. FiezelPteUi 4-Section Integration
const ui = require('../features/pte/fiezel-pte-ui.js');

test('FiezelPteUi exports all required methods and caches banks', () => {
  const expectedMethods = [
    'mount', 'switchSection', 'switchMode', 'nextItem', 'prevItem', 'retryItem',
    'selectDay', 'toggleTaskComplete', 'launchTask', 'openVoiceStudio',
    'selectRwFibOption', 'checkRwFib', 'assignDdWord', 'clearDdBlank', 'checkReadingDd',
    'moveRoParagraph', 'checkReorder', 'checkSwt', 'checkEssay', 'checkSst',
    'setLfAnswer', 'checkListeningFib', 'toggleHiwWord', 'checkHiw',
    'getState', 'getBanks'
  ];
  expectedMethods.forEach(m => {
    assert.strictEqual(typeof ui[m], 'function', `Missing method: ${m}`);
  });

  const banks = ui.getBanks();
  assert.ok(banks.ra.length >= 5);
  assert.ok(banks.rwFib.length >= 6);
  assert.ok(banks.rDd.length >= 5);
  assert.ok(banks.ro.length >= 5);
  assert.ok(banks.swt.length >= 5);
  assert.ok(banks.essay.length >= 5);
  assert.ok(banks.rl.length >= 5);
  assert.ok(banks.sst.length >= 5);
  assert.ok(banks.lf.length >= 5);
  assert.ok(banks.hiw.length >= 5);
});

test('FiezelPteUi transitions sections and evaluates reading/listening tasks', () => {
  ui.switchSection('reading');
  let st = ui.getState();
  assert.strictEqual(st.section, 'reading');
  assert.strictEqual(st.mode, 'rwFib');

  ui.selectRwFibOption(1, 'reshaped');
  ui.checkRwFib();
  st = ui.getState();
  assert.ok(st.activeDeepFeedback);
  assert.ok(st.activeDeepFeedback.items.length >= 2);

  ui.switchMode('rDd');
  st = ui.getState();
  const firstWord = st.rDdWordPool[0];
  ui.assignDdWord(firstWord);
  st = ui.getState();
  assert.ok(Object.keys(st.rDdAssignments).length >= 1);

  ui.switchSection('listening');
  ui.switchMode('hiw');
  ui.toggleHiwWord(2);
  ui.checkHiw();
  st = ui.getState();
  assert.ok(st.activeDeepFeedback.generalFeedback.length >= 3);

  const mockContainer = { innerHTML: '' };
  ui.mount(mockContainer);
  assert.ok(mockContainer.innerHTML.includes('fz-pte-hub'));
  assert.ok(mockContainer.innerHTML.includes('30-Day Plan'));
  assert.ok(mockContainer.innerHTML.includes('Speaking'));
  assert.ok(mockContainer.innerHTML.includes('Writing'));
  assert.ok(mockContainer.innerHTML.includes('Reading'));
  assert.ok(mockContainer.innerHTML.includes('Listening'));
});

// 30. Handy Human-VAD & Speech Recognition Integration in UI
test('FiezelPteUi HandyHumanVad accurately discriminates human vocal formants and isolates speech', () => {
  const ui = require('../features/pte/fiezel-pte-ui.js');
  assert.ok(ui.HandyHumanVad, 'HandyHumanVad must be accessible on FiezelPteUi');
  const vad = new ui.HandyHumanVad({ threshold: 0.45, prefillFrames: 15, hangoverFrames: 12 });

  // Pure silence rejection
  const silence = new Float32Array(512);
  const silenceScore = vad.scoreFrame512(silence);
  assert.strictEqual(silenceScore.isVoice, false);

  // Impulse click rejection
  const click = new Float32Array(512);
  click[15] = 0.95;
  const clickScore = vad.scoreFrame512(click);
  assert.strictEqual(clickScore.isVoice, false);

  // Vocal formant synthesis (F0 chest voice + F1 vowel + F2 vocal tract formant)
  const voice = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    const t = i / 16000;
    voice[i] = 0.35 * Math.sin(2 * Math.PI * 150 * t) +
               0.25 * Math.sin(2 * Math.PI * 600 * t) +
               0.15 * Math.sin(2 * Math.PI * 1200 * t);
  }
  const voiceScore = vad.scoreFrame512(voice);
  assert.ok(voiceScore.vocalSnrDb > 5);
  assert.ok(voiceScore.pitchCorr > 0.5);
  assert.strictEqual(voiceScore.isVoice, true);

  const activeVad = ui.getHandyVad();
  assert.ok(activeVad, 'Active Handy VAD singleton must be initialized');
});

// 31. True Speech Duration prevents hesitation penalty in Oral Fluency
test('evaluateOralFluency scores 5 (Native-like) using true vocal duration rather than full timer countdown', () => {
  // If student speaks 25 words in 11 seconds of actual voice, WPM = 136 WPM (Score 5: Native-like).
  // If raw timer duration of 40s was used, WPM = 37 WPM (Score 1: Disfluent penalty).
  const engine = require('../features/pte/fiezel-pte-engine.js');
  const rawTimerRes = engine.evaluateOralFluency(40, 25, 0);
  assert.strictEqual(rawTimerRes.score, 1, 'Flawed raw countdown duration causes unfair disfluent score');

  const handyVadTrueRes = engine.evaluateOralFluency(11, 25, 0);
  assert.strictEqual(handyVadTrueRes.score, 5, 'Handy VAD true vocal duration accurately awards Native-like fluency');
  assert.strictEqual(handyVadTrueRes.wpm, 136);
});

// 32. Zero-coercion pronunciation & disfluency penalties
test('evaluatePronunciation preserves zero confidence and evaluateOralFluency penalizes disfluencies', () => {
  const zeroPron = engine.evaluatePronunciation(0);
  assert.strictEqual(zeroPron.score, 0, 'confidenceAvg=0 must NOT be coerced to 0.85');
  assert.strictEqual(zeroPron.label, 'Unintelligible');

  assert.strictEqual(engine.countSpeechDisfluencies('Um, I uh think the the system er works'), 4);
  const smooth = engine.evaluateOralFluency(10, 22, 0, { disfluencyCount: 0 });
  const bumpy = engine.evaluateOralFluency(10, 22, 1, { disfluencyCount: 4 });
  assert.ok(smooth.score > bumpy.score, `Smooth fluency (${smooth.score}) must outscore disfluent speech (${bumpy.score})`);
});

// 33. Retell Lecture computes dynamic fluency, pronunciation, and zero-content gate
test('evaluateRetellLecture computes dynamic acoustic fluency/pronunciation instead of hardcoded 4/5', () => {
  const item = {
    id: 'rl-dyn-test',
    keyPoints: ['solar energy', 'battery storage', 'grid reliability', 'carbon reduction']
  };
  const emptyRes = engine.evaluateRetellLecture(item, '', { durationSec: 2, confidenceAvg: 0 });
  assert.strictEqual(emptyRes.pearsonScore, 10, 'Empty Retell Lecture must score Pearson 10');
  assert.strictEqual(emptyRes.fluency.score, 0);
  assert.strictEqual(emptyRes.pronunciation.score, 0);

  const weakRes = engine.evaluateRetellLecture(
    item,
    'Um uh solar energy is er good and battery storage helps.',
    { durationSec: 28, confidenceAvg: 0.56, pausesCount: 4 }
  );
  const strongRes = engine.evaluateRetellLecture(
    item,
    'The speaker emphasized solar energy expansion paired with advanced battery storage to improve grid reliability and achieve major carbon reduction.',
    { durationSec: 10, confidenceAvg: 0.92, pausesCount: 0 }
  );
  assert.ok(strongRes.fluency.score >= 4 && weakRes.fluency.score < strongRes.fluency.score, 'Retell Lecture fluency must vary with real cadence & disfluencies');
  assert.ok(strongRes.pronunciation.score > weakRes.pronunciation.score, 'Retell Lecture pronunciation must reflect empirical confidence');
  assert.ok(strongRes.pearsonScore > weakRes.pearsonScore + 20);
});

console.log(`\nAll ${passedTests} PTE Academic Engine unit tests PASSED successfully!`);
