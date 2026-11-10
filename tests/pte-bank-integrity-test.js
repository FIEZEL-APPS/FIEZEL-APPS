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
  'pte-templates.json'
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

// 6. Validate Universal Templates
test('Validate pte-templates.json schema', () => {
  const data = JSON.parse(fs.readFileSync(path.join(contentDir, 'pte-templates.json'), 'utf8'));
  assert.ok(data.templates);
  assert.ok(data.templates.describe_image);
  assert.ok(data.templates.retell_lecture);
  assert.ok(data.templates.summarize_written_text);
  assert.ok(data.templates.write_essay);
  assert.ok(data.templates.describe_image.text.includes('The given image represents'));
});

console.log(`\nAll ${passedTests} PTE Bank Integrity tests PASSED successfully!`);
