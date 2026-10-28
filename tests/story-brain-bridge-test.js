#!/usr/bin/env node
/**
 * tests/story-brain-bridge-test.js
 *
 * Verifikasi gerbang mutu untuk FiezelStoryBrainBridge:
 * 1. Schema & Invarian Ekstraksi Kata (BKT Integration)
 * 2. Zero-Loss Input & Anti-Ghost Answer pada Kuis Cerita
 * 3. Misconception Ledger Tracking saat Jawaban Salah
 * 4. Timezone & Local Date Hardening
 * 5. Ruby Markup Rendering
 */
'use strict';
const assert = require('assert');
const path = require('path');
const Bridge = require(path.join(__dirname, '..', 'features', 'japanese', 'fiezel-story-brain-bridge.js'));

console.log('--- TEST FIEZEL STORY BRAIN BRIDGE ---');

// Test 1: Timezone & Local Date
const tz = Bridge.getTimezone();
assert.ok(typeof tz === 'string' && tz.length > 0, 'Timezone harus berupa string yang sah');
const dateStr = Bridge.getLocalDateStr();
assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
console.log('PASS 1: Timezone & Local Date format valid (' + tz + ', ' + dateStr + ')');

// Test 2: Word Interaction
const wordEvent = Bridge.recordWordInteraction({
  ja: '着物',
  reading: 'きもの',
  id: 'baju kimono tradisional'
}, { isLookup: true });

assert.strictEqual(wordEvent.schema, Bridge.SCHEMA);
assert.strictEqual(wordEvent.ja, '着物');
assert.strictEqual(wordEvent.wordKey, 'vocab___');
assert.strictEqual(wordEvent.isMastered, false);
assert.ok(wordEvent.pLt >= 0 && wordEvent.pLt <= 1);
assert.strictEqual(wordEvent.timezone, tz);
assert.strictEqual(wordEvent.activityDate, dateStr);
console.log('PASS 2: Word interaction telemetri valid');

// Test 3: Zero-Loss Input & Anti-Ghost Answer Evaluation
const qData = {
  id: 'story-n5-maiko-q1',
  questionJapanese: 'ミズキさんは 何歳ですか。',
  options: [
    { id: 1, text: '16歳', misconceptionId: 'age_off_by_one' },
    { id: 2, text: '17歳' },
    { id: 3, text: '18歳' }
  ],
  answerIndex: 1,
  explain: 'Di cerita disebutkan Mizuki wa juunana-sai (17 tahun).'
};

// Kasus A: Jawaban Murid Benar
const evalCorrect = Bridge.evaluateStoryQuiz(qData, 1);
assert.strictEqual(evalCorrect.ok, true, 'Jawaban murid harus dinilai benar');
assert.strictEqual(evalCorrect.userSelectedIndex, 1);
assert.strictEqual(evalCorrect.targetIndex, 1);
assert.strictEqual(evalCorrect.misconceptionId, null);
console.log('PASS 3A: Evaluasi jawaban benar valid');

// Kasus B: Jawaban Murid Salah (Anti-Ghost: mencatat persis apa yang dipilih murid)
const evalWrong = Bridge.evaluateStoryQuiz(qData, 0);
assert.strictEqual(evalWrong.ok, false, 'Jawaban murid harus dinilai salah');
assert.strictEqual(evalWrong.userSelectedIndex, 0);
assert.strictEqual(evalWrong.userSelectedText, '16歳', 'Harus mencatat teks aktual murid');
assert.strictEqual(evalWrong.targetText, '17歳', 'Harus mencatat teks target');
assert.strictEqual(evalWrong.misconceptionId, 'age_off_by_one', 'Harus mencatat miskonsepsi yang sesuai');
console.log('PASS 3B: Anti-Ghost Answer & Misconception Ledger record valid');

// Test 4: Ruby Markup Rendering
const tokens = [
  { kanji: '京都', furigana: 'きょうと', meaning: 'Kyoto' },
  'の',
  { kanji: '道', furigana: 'みち', meaning: 'jalan' },
  'を歩きます。'
];
const renderedHtml = Bridge.renderRubySentence(tokens);
assert.ok(renderedHtml.includes('<ruby class="fz-story-token" data-word="京都"'), 'Harus memuat tag ruby dengan data-word');
assert.ok(renderedHtml.includes('<rt>きょうと</rt>'), 'Harus memuat furigana di tag rt');
assert.ok(renderedHtml.includes('<span class="fz-story-plain">の</span>'), 'Harus memuat token biasa');
console.log('PASS 4: Render Ruby Markup interaktif valid');

// Test 5: Telemetri Kognitif BKT & OLM pada Jawaban Benar
let bktCalls = [];
let masteryCalls = [];
global.bktRecord = function (payload, ok, kappa) {
  bktCalls.push({ payload, ok, kappa });
};
global.updateMastery = function (bucket, key, ok) {
  masteryCalls.push({ bucket, key, ok });
};

const evalTelemetry = Bridge.evaluateStoryQuiz(qData, 1);
assert.strictEqual(evalTelemetry.ok, true);
assert.ok(bktCalls.length > 0, 'bktRecord WAJIB terpanggil saat jawaban kuis benar');
assert.strictEqual(bktCalls[0].ok, true, 'bktRecord harus mencatat ok: true');
assert.strictEqual(bktCalls[0].payload.lessonSkill, 'reading_story-n5-maiko-q1');
assert.ok(masteryCalls.length > 0, 'updateMastery WAJIB terpanggil saat jawaban kuis benar');
assert.strictEqual(masteryCalls[0].ok, true, 'updateMastery harus mencatat ok: true');
assert.strictEqual(masteryCalls[0].bucket, 'reading');
console.log('PASS 5: Saluran telemetri BKT (bktRecord) dan OLM (updateMastery) terverifikasi');

// Test 6: Invarian Zero-Praise & failWhy pada Jawaban Salah (Rule 4)
const wrongQuizData = {
  id: 'story-n5-test-q2',
  questionJapanese: 'テストの<ruby>質問<rt>しつもん</rt></ruby>',
  options: [
    { text: '選択肢A', misconceptionId: 'distractor_concept_a', failWhy: 'Alasan kegagalan A spesifik' },
    { text: '選択肢B', isCorrect: true }
  ],
  answerIndex: 1
};
const evalWrongWithFail = Bridge.evaluateStoryQuiz(wrongQuizData, 0);
assert.strictEqual(evalWrongWithFail.ok, false);
assert.strictEqual(evalWrongWithFail.misconceptionId, 'distractor_concept_a');
assert.strictEqual(evalWrongWithFail.failWhy, 'Alasan kegagalan A spesifik');
// Haram memuji jawaban salah
assert.ok(!evalWrongWithFail.explain.toLowerCase().includes('bagus'), 'Haram memuji jawaban salah');
console.log('PASS 6: Invarian Zero-Praise & failWhy tracking terverifikasi');

// Test 7: Furigana Presisi & Kuis pada Katalog Cerita (Mizuki, Asakusa, Shinkansen)
const readerPath = path.join(__dirname, '..', 'features', 'japanese', 'fiezel-story-reader.js');
const Reader = require(readerPath);
const expectedStories = ['mizuki-maiko', 'asakusa-neko', 'shinkansen-trip'];

for (const storyId of expectedStories) {
  const story = Reader.STORIES.find(s => s.id === storyId);
  assert.ok(story, 'Cerita ' + storyId + ' harus ada');
  const quizScene = story.scenes[4];
  assert.strictEqual(quizScene.isQuiz, true, storyId + ' adegan 5 harus isQuiz: true');
  assert.ok(quizScene.quiz, storyId + ' harus memiliki objek quiz');
  const q = quizScene.quiz;
  assert.ok(q.questionJapanese.includes('<ruby>') && q.questionJapanese.includes('<rt>'), storyId + ' questionJapanese harus memiliki furigana <ruby>');
  for (let idx = 0; idx < q.options.length; idx++) {
    const opt = q.options[idx];
    assert.ok(opt.text.includes('<ruby>') && opt.text.includes('<rt>'), storyId + ' opsi ' + idx + ' harus memiliki furigana <ruby> (' + opt.text + ')');
    if (idx === q.answerIndex) {
      assert.strictEqual(opt.isCorrect, true);
    } else {
      assert.ok(opt.misconceptionId, storyId + ' opsi salah ' + idx + ' harus ada misconceptionId');
      assert.ok(opt.failWhy, storyId + ' opsi salah ' + idx + ' harus ada failWhy');
    }
  }
}
console.log('PASS 7: Seluruh 3 cerita memiliki kuis diagnostik dan furigana merata pada soal dan opsi');

// Test 8: Verifikasi Furigana Toggle CSS
const fs = require('fs');
const cssPath = path.join(__dirname, '..', 'style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert.ok(
  cssContent.includes('.fz-story-reader-wrap.hide-furigana rt') &&
  cssContent.includes('display: none !important;'),
  'style.css harus mendefinisikan .fz-story-reader-wrap.hide-furigana rt { display: none !important; }'
);
console.log('PASS 8: CSS rule toggle furigana (.hide-furigana rt { display: none !important; }) aktif');

console.log('\nSEMUA PENGUJIAN STORY BRAIN BRIDGE: 100% LULUS (HIJAU).');
