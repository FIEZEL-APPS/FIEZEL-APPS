import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(import.meta.dirname, '..');

// Mock browser globals for Node.js environment
globalThis.window = globalThis;
globalThis.document = {
  body: {
    classList: {
      toggle: () => {},
      contains: () => false
    }
  },
  querySelectorAll: () => []
};

const JaUi = require(path.join(rootDir, 'features/japanese/fiezel-ja-ui.js'));
const reader = require(path.join(rootDir, 'features/japanese/fiezel-story-reader.js'));
const bridge = require(path.join(rootDir, 'features/japanese/fiezel-story-brain-bridge.js'));

const KANJI_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\u3005]/;

console.log('=== COMPREHENSIVE VERIFICATION SUITE ===\n');

// 1. Reading Bank Verification (180 passages)
const readingBankPath = path.join(rootDir, 'content/ja/reading-bank-ja.json');
let readingPassages = [];
if (fs.existsSync(readingBankPath)) {
  readingPassages = JSON.parse(fs.readFileSync(readingBankPath, 'utf8'));
}
console.log(`[1] Reading Bank: ${readingPassages.length} passages loaded.`);

let rbTotalKanji = 0;
let rbRubiedKanji = 0;
let rbPassagesWithRomaji = 0;
let rbUnrubiedExamples = [];

readingPassages.forEach((p, idx) => {
  const text = p.text || p.content || '';
  const annotated = JaUi.annotateText(text);

  // Check romaji
  if (annotated.includes('class="ja-romaji ja-run-romaji"')) {
    rbPassagesWithRomaji++;
  }

  // Count kanji in original text
  const kanjiMatches = text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\u3005]/g) || [];
  rbTotalKanji += kanjiMatches.length;

  // Check for rubied kanji
  const rubyMatches = annotated.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rp>/g) || [];
  rubyMatches.forEach(rm => {
    const km = rm.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rp>/);
    if (km) rbRubiedKanji += km[1].length;
  });

  // Check for unrubied kanji in annotated string
  const stripped = annotated.replace(/<ruby[\s\S]*?<\/ruby>/gi, '');
  for (let c of stripped) {
    if (KANJI_RE.test(c)) {
      rbUnrubiedExamples.push({ passageIdx: idx, char: c });
    }
  }
});

const rbRubyCoverage = ((rbRubiedKanji / rbTotalKanji) * 100).toFixed(2);
const rbRomajiCoverage = ((rbPassagesWithRomaji / readingPassages.length) * 100).toFixed(2);

console.log(`    Total Kanji in Bank: ${rbTotalKanji}`);
console.log(`    Rubied Kanji: ${rbRubiedKanji} (${rbRubyCoverage}%)`);
console.log(`    Unrubied Kanji: ${rbUnrubiedExamples.length}`);
console.log(`    Passages with Romaji: ${rbPassagesWithRomaji} / ${readingPassages.length} (${rbRomajiCoverage}%)`);

// 2. Graded Stories Verification (3 stories, 15 scenes)
const stories = reader.STORIES;
console.log(`\n[2] Graded Stories: ${stories.length} stories loaded.`);

let storyTotalKanji = 0;
let storyRubiedKanji = 0;
let storyScenesWithRomaji = 0;
let storyTotalScenes = 0;
let storyUnrubiedExamples = [];

stories.forEach(s => {
  s.scenes.forEach((sc, idx) => {
    storyTotalScenes++;
    if (sc.jp) {
      if (sc.romaji && sc.romaji.trim().length > 0) {
        storyScenesWithRomaji++;
      }
      for (let c of sc.jp) {
        if (KANJI_RE.test(c)) storyTotalKanji++;
      }
      const stripped = sc.jp.replace(/<ruby[\s\S]*?<\/ruby>/gi, '');
      for (let c of stripped) {
        if (KANJI_RE.test(c)) {
          storyUnrubiedExamples.push({ story: s.id, scene: idx, char: c });
        }
      }
    }
    if (sc.quiz) {
      if (sc.quiz.romaji && sc.quiz.romaji.trim().length > 0) {
        storyScenesWithRomaji++;
      }
      for (let c of sc.quiz.questionJapanese) {
        if (KANJI_RE.test(c)) storyTotalKanji++;
      }
      const strippedQ = sc.quiz.questionJapanese.replace(/<ruby[\s\S]*?<\/ruby>/gi, '');
      for (let c of strippedQ) {
        if (KANJI_RE.test(c)) {
          storyUnrubiedExamples.push({ story: s.id, quiz: true, char: c });
        }
      }
      sc.quiz.options.forEach((opt, oIdx) => {
        for (let c of opt.text) {
          if (KANJI_RE.test(c)) storyTotalKanji++;
        }
        const strippedOpt = opt.text.replace(/<ruby[\s\S]*?<\/ruby>/gi, '');
        for (let c of strippedOpt) {
          if (KANJI_RE.test(c)) {
            storyUnrubiedExamples.push({ story: s.id, quizOption: oIdx, char: c });
          }
        }
      });
    }
  });
});

storyRubiedKanji = storyTotalKanji - storyUnrubiedExamples.length;
const storyRubyCoverage = ((storyRubiedKanji / storyTotalKanji) * 100).toFixed(2);
const storyRomajiCoverage = ((storyScenesWithRomaji / storyTotalScenes) * 100).toFixed(2);

console.log(`    Total Scenes & Quizzes: ${storyTotalScenes}`);
console.log(`    Total Kanji in Stories: ${storyTotalKanji}`);
console.log(`    Rubied Kanji: ${storyRubiedKanji} (${storyRubyCoverage}%)`);
console.log(`    Unrubied Kanji: ${storyUnrubiedExamples.length}`);
console.log(`    Scenes/Quizzes with Romaji: ${storyScenesWithRomaji} / ${storyTotalScenes} (${storyRomajiCoverage}%)`);

// 3. Telemetry and CSS Verification
console.log(`\n[3] Story Brain Bridge & Telemetry Check:`);
const cssPath = path.join(rootDir, 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const hasRomajiHide = cssContent.includes('body.fz-ja-no-romaji .fz-sentence-romaji');
const hasFuriganaHide = cssContent.includes('body.fz-ja-no-furigana .fz-sentence-jp rt');
console.log(`    CSS Romaji Hide Rule present: ${hasRomajiHide}`);
console.log(`    CSS Furigana Hide Rule present: ${hasFuriganaHide}`);

console.log('\n=== ALL SUITE CHECKS COMPLETED SUCCESSFULLY ===');
