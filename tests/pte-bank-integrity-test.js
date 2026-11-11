/**
 * FIEZEL · tests/pte-bank-integrity-test.js
 * Schema & Data Integrity Validation for all PTE Academic Content Banks.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '..', 'content', 'pte');
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

console.log('--- Testing FIEZEL PTE Bank Integrity ---');

// 1. Files existence & JSON validity
const expectedFiles = [
  'pte-read-aloud.json',
  'pte-repeat-sentence.json',
  'pte-describe-image.json',
  'pte-write-dictation.json',
  'pte-templates.json',
  'pte-daily-roadmap.json',
  'pte-reading-fib.json',
  'pte-reading-drag-drop.json',
  'pte-reorder-paragraphs.json',
  'pte-summarize-written-text.json',
  'pte-essay-writing.json',
  'pte-retell-lecture.json',
  'pte-summarize-spoken-text.json',
  'pte-listening-fib.json',
  'pte-highlight-incorrect-words.json'
];

expectedFiles.forEach(file => {
  test(`File ${file} exists and is valid JSON`, () => {
    const filePath = path.join(contentDir, file);
    assert.strictEqual(fs.existsSync(filePath), true, `Missing file: ${filePath}`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    assert.ok(data && typeof data === 'object', `File content is not an object: ${file}`);
  });
});

// 2. Validate Read Aloud bank
test('Validate pte-read-aloud.json items schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-read-aloud.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.strictEqual(data.items.length >= 5, true);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.text, `Item ${item.id} missing text`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.strictEqual(typeof item.prepTimeSec, 'number');
    assert.strictEqual(typeof item.recordTimeSec, 'number');
    assert.ok(item.chunking, `Item ${item.id} missing chunking`);
    assert.ok(item.chunking.includes('//'), `Item ${item.id} chunking must contain '//' breath marks`);
    assert.strictEqual(Array.isArray(item.keywords), true);
    assert.strictEqual(item.keywords.length >= 3, true);
  });
});

// 3. Validate Repeat Sentence bank
test('Validate pte-repeat-sentence.json items schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-repeat-sentence.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.strictEqual(data.items.length >= 8, true);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.sentence, `Item ${item.id} missing sentence`);
    assert.strictEqual(typeof item.wordCount, 'number');
    assert.strictEqual(typeof item.audioDurationSec, 'number');
    assert.strictEqual(Array.isArray(item.keyContentWords), true);
    assert.strictEqual(item.keyContentWords.length >= 2, true);
  });
});

// 4. Validate Describe Image bank
test('Validate pte-describe-image.json items schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-describe-image.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.strictEqual(data.items.length >= 4, true);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.topic, `Item ${item.id} missing topic`);
    assert.ok(item.highPoint, `Item ${item.id} missing highPoint`);
    assert.ok(item.lowPoint, `Item ${item.id} missing lowPoint`);
    assert.strictEqual(Array.isArray(item.keywords), true);
    assert.strictEqual(item.keywords.length >= 4, true);
    assert.ok(item.svg, `Item ${item.id} missing svg markup`);
    assert.ok(item.svg.startsWith('<svg'), `Item ${item.id} svg must start with <svg`);
  });
});

// 5. Validate Write from Dictation bank
test('Validate pte-write-dictation.json items schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-write-dictation.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.strictEqual(data.items.length >= 8, true);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.sentence, `Item ${item.id} missing sentence`);
    assert.strictEqual(Array.isArray(item.tokens), true);
    assert.strictEqual(item.tokens.length >= 5, true);
    if (item.spellingChallenges) {
      assert.strictEqual(Array.isArray(item.spellingChallenges), true);
      item.spellingChallenges.forEach(c => {
        assert.ok(c.word, `Challenge in ${item.id} missing word`);
        assert.strictEqual(Array.isArray(c.commonErrors), true);
      });
    }
  });
});

// 6. Validate Universal & Nakul Templates
test('Validate pte-templates.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-templates.json'), 'utf8'));
  assert.ok(data.templates);
  assert.ok(data.templates.describe_image);
  assert.ok(data.templates.retell_lecture);
  assert.ok(data.templates.summarize_written_text);
  assert.ok(data.templates.write_essay);
  assert.ok(data.templates.summarize_spoken_text);
  assert.ok(data.templates.write_from_dictation);
  assert.strictEqual(data.templates.describe_image.id, 'di_nakul_v1');
  assert.strictEqual(data.templates.describe_image.target_duration_sec, 26);
  assert.ok(data.templates.describe_image.text.includes('The given image represents'));
  assert.strictEqual(data.templates.write_from_dictation.id, 'wfd_extra_words_v1');
});

// 7. Validate 30-Day Guided Daily Roadmap
test('Validate pte-daily-roadmap.json 30-day curriculum schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-daily-roadmap.json'), 'utf8'));
  assert.strictEqual(data.targetScore, 42);
  assert.strictEqual(data.totalDays, 30);
  assert.strictEqual(Array.isArray(data.weeks), true);
  assert.strictEqual(data.weeks.length, 4);
  assert.strictEqual(Array.isArray(data.days), true);
  assert.strictEqual(data.days.length, 30);

  data.days.forEach((dayItem, idx) => {
    assert.strictEqual(dayItem.day, idx + 1);
    assert.ok(dayItem.title, `Day ${idx + 1} missing title`);
    assert.ok(dayItem.focus, `Day ${idx + 1} missing focus`);
    assert.ok(dayItem.nakulSecret, `Day ${idx + 1} missing nakulSecret`);
    assert.strictEqual(typeof dayItem.targetMinutes, 'number');
    assert.strictEqual(Array.isArray(dayItem.tasks), true);
    assert.strictEqual(dayItem.tasks.length, 5, `Day ${idx + 1} must have 5 Big 4 + Kawan Bicara tasks`);

    const taskTypes = dayItem.tasks.map(t => t.type);
    assert.ok(taskTypes.includes('read_aloud'));
    assert.ok(taskTypes.includes('repeat_sentence'));
    assert.ok(taskTypes.includes('describe_image'));
    assert.ok(taskTypes.includes('write_from_dictation'));
    assert.ok(taskTypes.includes('kawan_bicara'));
  });
});

// 8. Validate Reading & Writing FIB (Dropdown) bank
test('Validate pte-reading-fib.json schema and deep feedback', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-reading-fib.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 6);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.text, `Item ${item.id} missing text`);
    assert.strictEqual(Array.isArray(item.blanks), true);
    assert.ok(item.blanks.length >= 2, `Item ${item.id} must have >= 2 blanks`);

    item.blanks.forEach(b => {
      assert.ok(b.id, `Blank in ${item.id} missing id`);
      assert.ok(b.correct, `Blank ${b.id} missing correct answer`);
      assert.strictEqual(Array.isArray(b.options), true);
      assert.ok(b.options.length >= 3, `Blank ${b.id} must have >= 3 options`);
      assert.ok(b.options.includes(b.correct), `Blank ${b.id} options must include correct answer`);
      assert.ok(b.deepFeedback, `Blank ${b.id} missing deepFeedback`);
      assert.ok(b.deepFeedback.formula, `Blank ${b.id} missing deepFeedback.formula`);
      assert.ok(b.deepFeedback.grammarRule, `Blank ${b.id} missing deepFeedback.grammarRule`);
      assert.ok(b.deepFeedback.collocation || b.deepFeedback.linkingWordType, `Blank ${b.id} missing deepFeedback.collocation or linkingWordType`);
      assert.ok(b.deepFeedback.distractorAnalysis, `Blank ${b.id} missing deepFeedback.distractorAnalysis`);
      assert.ok(b.deepFeedback.translation, `Blank ${b.id} missing deepFeedback.translation`);
    });
  });
});

// 9. Validate Reading FIB (Drag & Drop) bank
test('Validate pte-reading-drag-drop.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-reading-drag-drop.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.text, `Item ${item.id} missing text`);
    assert.strictEqual(Array.isArray(item.wordPool), true);
    assert.ok(item.wordPool.length >= 4);
    assert.ok(item.correctAnswers && typeof item.correctAnswers === 'object');
    assert.ok(item.deepFeedback && typeof item.deepFeedback === 'object');
  });
});

// 10. Validate Re-order Paragraphs bank
test('Validate pte-reorder-paragraphs.json schema and clues', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-reorder-paragraphs.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.strictEqual(Array.isArray(item.correctOrder), true);
    assert.ok(item.correctOrder.length >= 3);
    assert.strictEqual(Array.isArray(item.paragraphs), true);
    assert.strictEqual(item.paragraphs.length, item.correctOrder.length);
    assert.ok(item.deepFeedback, `Item ${item.id} missing deepFeedback`);
    assert.ok(item.deepFeedback.independentSentence, `Item ${item.id} missing independentSentence`);
    assert.strictEqual(Array.isArray(item.deepFeedback.pairingClues), true);
    assert.ok(item.deepFeedback.pairingClues.length >= 2);
  });
});

// 11. Validate Summarize Written Text bank
test('Validate pte-summarize-written-text.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-summarize-written-text.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.text, `Item ${item.id} missing source text`);
    assert.ok(item.formulaScaffold, `Item ${item.id} missing formulaScaffold`);
    assert.ok(item.modelSummary, `Item ${item.id} missing modelSummary`);
    assert.ok(item.deepFeedback, `Item ${item.id} missing deepFeedback`);
  });
});

// 12. Validate Write Essay bank
test('Validate pte-essay-writing.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-essay-writing.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.prompt, `Item ${item.id} missing prompt`);
    assert.ok(item.fourParagraphPlan, `Item ${item.id} missing fourParagraphPlan`);
    assert.ok(item.nakulScaffold, `Item ${item.id} missing nakulScaffold`);
  });
});

// 13. Validate Retell Lecture bank
test('Validate pte-retell-lecture.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-retell-lecture.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.audioTranscript, `Item ${item.id} missing audioTranscript`);
    assert.strictEqual(Array.isArray(item.keyNounChunks), true);
    assert.ok(item.keyNounChunks.length >= 3);
    assert.ok(item.nakulTemplateSpeech, `Item ${item.id} missing nakulTemplateSpeech`);
  });
});

// 14. Validate Summarize Spoken Text bank
test('Validate pte-summarize-spoken-text.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-summarize-spoken-text.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.audioTranscript, `Item ${item.id} missing audioTranscript`);
    assert.ok(item.modelSummary, `Item ${item.id} missing modelSummary`);
    assert.strictEqual(typeof item.modelWordCount, 'number');
  });
});

// 15. Validate Listening FIB bank
test('Validate pte-listening-fib.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-listening-fib.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.audioTranscript, `Item ${item.id} missing audioTranscript`);
    assert.ok(item.displayedText, `Item ${item.id} missing displayedText`);
    assert.strictEqual(Array.isArray(item.blanks), true);
    assert.ok(item.blanks.length >= 2);
    item.blanks.forEach(b => {
      assert.ok(b.id, `Blank in ${item.id} missing id`);
      assert.ok(b.correct, `Blank in ${item.id} missing correct`);
      assert.ok(b.spellingTip, `Blank in ${item.id} missing spellingTip`);
    });
  });
});

// 16. Validate Highlight Incorrect Words bank
test('Validate pte-highlight-incorrect-words.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-highlight-incorrect-words.json'), 'utf8'));
  assert.strictEqual(Array.isArray(data.items), true);
  assert.ok(data.items.length >= 5);

  data.items.forEach((item, idx) => {
    assert.ok(item.id, `Item ${idx} missing id`);
    assert.ok(item.title, `Item ${item.id} missing title`);
    assert.ok(item.audioTranscript, `Item ${item.id} missing audioTranscript`);
    assert.ok(item.displayedText, `Item ${item.id} missing displayedText`);
    assert.strictEqual(Array.isArray(item.incorrectWords), true);
    assert.ok(item.incorrectWords.length >= 2);
    item.incorrectWords.forEach(w => {
      assert.ok(w.displayed, `Error in ${item.id} missing displayed word`);
      assert.ok(w.spoken, `Error in ${item.id} missing spoken word`);
    });
  });
});

console.log(`\nAll ${passedTests} PTE Bank Integrity tests PASSED successfully!`);
