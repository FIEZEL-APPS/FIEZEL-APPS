'use strict';
const __fzRoot = require('path').join(__dirname, '..', '..'); /* m025-254: skrip ini pindah dari akar ke tools/dev/; __dirname dulu BERARTI akar repo. */

/**
 * FIEZEL — deterministic content-integrity repair (m025-149).
 *
 * The incident was not authored by hand: a word-level translation pass ran over
 * already-shipped English content and substituted individual words inside English
 * sentences. It left two signatures in reading-bank.json, both fully deterministic,
 * so the repair is a restore rather than a rewrite:
 *
 *   1. The correct-answer option was translated while the question's own
 *      `meta.answer` kept the pristine English. The renderer trusts `meta.answer`,
 *      finds no matching option, and OVERWRITES a real distractor to compensate --
 *      so every one of these silently destroyed a fourth option at runtime too.
 *      Repair: restore options[correctIndex] from meta.answer.
 *
 *   2. An Indonesian distractor kept an English "of" from its source phrase
 *      ("biografi pribadi of Maya"). Repair: drop the stranded preposition.
 *
 * listening-bank-v1.json carried the same translation damage but is generated, so it
 * is repaired by re-running tools/dev/rebuild-speaking-listening-data.js instead of patched here.
 *
 * Idempotent: running it twice changes nothing. Run with --check to fail instead of
 * writing, which is what CI uses to prove the repair has not regressed.
 */

const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const CHECK_ONLY = process.argv.includes('--check');
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const readingPath = path.join(root, 'reading-bank.json');
const reading = JSON.parse(fs.readFileSync(readingPath, 'utf8'));

const repairs = { answerRestored: 0, strandedPreposition: 0 };
const samples = [];

for (const passage of reading) {
  for (const [i, q] of (passage.qs || []).entries()) {
    const options = Array.isArray(q[1]) ? q[1] : [];
    const correctIndex = q[2];
    const meta = (q[3] && typeof q[3] === 'object') ? q[3] : {};

    // (1) The bank declares the answer twice -- as an index and as text. When they
    // disagree the text is the survivor: it is the only copy the translation pass
    // did not touch, and it is what every downstream explanation quotes.
    if (meta.answer && Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length) {
      if (norm(meta.answer) !== norm(options[correctIndex])) {
        if (samples.length < 3) samples.push(`${passage.id}#${i}: "${options[correctIndex]}" -> "${meta.answer}"`);
        options[correctIndex] = meta.answer;
        repairs.answerRestored++;
      }
    }

    // (2) Stranded English preposition inside an otherwise Indonesian distractor.
    for (const [j, option] of options.entries()) {
      const fixed = String(option).replace(/\bbiografi pribadi of\b/g, 'biografi pribadi');
      if (fixed !== option) {
        options[j] = fixed;
        repairs.strandedPreposition++;
      }
    }
  }
}

const total = repairs.answerRestored + repairs.strandedPreposition;

if (CHECK_ONLY) {
  console.log(JSON.stringify({ mode: 'check', ...repairs, total }, null, 2));
  if (total) {
    console.error(`\nFAIL — ${total} content-integrity defects still present in reading-bank.json.`);
    process.exit(1);
  }
  console.log('\nPASS — reading bank answer relationships are intact.');
  process.exit(0);
}

if (total) fs.writeFileSync(readingPath, JSON.stringify(reading, null, 2) + '\n');
console.log(JSON.stringify({ mode: 'repair', ...repairs, total, written: total > 0 }, null, 2));
for (const s of samples) console.log('  ' + s);
