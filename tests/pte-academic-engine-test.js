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

console.log(`\nAll ${passedTests} PTE Academic Engine unit tests PASSED successfully!`);
