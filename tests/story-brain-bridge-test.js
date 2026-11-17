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

// Setup real Braincore modules & scoped storage (NO fake lowercase/invented mocks)
const _store = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem: function (k, v) { _store[k] = String(v); },
  removeItem: function (k) { delete _store[k]; },
  clear: function () { for (var k in _store) delete _store[k]; }
};
global.FiezelMasteryBKT = require(path.join(__dirname, '..', 'features', 'brain', 'fiezel-mastery-bkt.js'));
global.FiezelMisconceptionLedger = require(path.join(__dirname, '..', 'features', 'brain', 'fiezel-misconception-ledger.js'));
global.sideStateKey = function (base) { return base + '@ja'; };

const Bridge = require(path.join(__dirname, '..', 'features', 'japanese', 'fiezel-story-brain-bridge.js'));

console.log('--- TEST FIEZEL STORY BRAIN BRIDGE ---');

// Test 1: Timezone & Local Date
const tz = Bridge.getTimezone();
assert.ok(typeof tz === 'string' && tz.length > 0, 'Timezone harus berupa string yang sah');
const dateStr = Bridge.getLocalDateStr();
assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');
console.log('PASS 1: Timezone & Local Date format valid (' + tz + ', ' + dateStr + ')');

// Test 2: Word Interaction (Preserves Japanese chars + drives real FiezelMasteryBKT under scoped key)
const wordEvent = Bridge.recordWordInteraction({
  ja: '着物',
  reading: 'きもの',
  id: 'baju kimono tradisional'
}, { isLookup: false });

assert.strictEqual(wordEvent.schema, Bridge.SCHEMA);
assert.strictEqual(wordEvent.ja, '着物');
assert.strictEqual(wordEvent.wordKey, 'vocab_着物');
assert.strictEqual(wordEvent.isMastered, false);
assert.ok(wordEvent.pLt > 0.2 && wordEvent.pLt <= 1, 'Real FiezelMasteryBKT must increase pLt above prior 0.2 (got ' + wordEvent.pLt + ')');
assert.strictEqual(wordEvent.timezone, tz);
assert.strictEqual(wordEvent.activityDate, dateStr);
const storedWordBkt = JSON.parse(_store['fiezel-mastery-bkt-v1@ja']);
assert.strictEqual(storedWordBkt.schema, 'fiezel-mastery-bkt-v1');
assert.strictEqual(storedWordBkt.lessons['vocab_着物'].n, 1, 'Word interaction must write real BKT entry under scoped key');
console.log('PASS 2: Word interaction telemetri valid dengan FiezelMasteryBKT nyata');

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

// Test 5: Telemetri Kognitif BKT, OLM & Ledger NYATA pada jawaban BENAR maupun SALAH
global.localStorage.clear();
// 5A. Tanpa host callback, bridge WAJIB menulis ke real FiezelMasteryBKT dan real FiezelMisconceptionLedger (scoped)
const offlineWrongQuiz = {
  id: 'story-n5-test-q-offline',
  questionJapanese: 'テスト',
  options: [
    { text: 'Salah', misconceptionId: 'particle_wa_confuse', failWhy: 'Keliru partikel' },
    { text: 'Benar', isCorrect: true }
  ],
  answerIndex: 1
};
const offlineWrongRes = Bridge.evaluateStoryQuiz(offlineWrongQuiz, 0);
assert.strictEqual(offlineWrongRes.ok, false);
assert.strictEqual(offlineWrongRes.telemetryEmitted, true);
const bktOffline = JSON.parse(_store['fiezel-mastery-bkt-v1@ja']);
assert.strictEqual(bktOffline.lessons['reading_story-n5-test-q-offline'].n, 1, 'Jawaban salah WAJIB dicatat BKT nyata');
assert.ok(bktOffline.lessons['reading_story-n5-test-q-offline'].L < 0.2, 'Jawaban salah harus menurunkan p(L)');
const ledgerOffline = JSON.parse(_store['fiezel-misconception-ledger-v1@ja']);
assert.ok(
  ledgerOffline && ledgerOffline.entries && ledgerOffline.entries['reading_story-n5-test-q-offline::particle_wa_confuse'],
  'FiezelMisconceptionLedger.update wajib mencatat entri miskonsepsi saat salah'
);

// 5B. Dengan kontrak callback host app.js nyata (tolak argumen string pada bktRecord!)
let bktCalls = [];
let masteryCalls = [];
let ledgerCalls = [];
global.bktRecord = function (payload, ok, kappa) {
  assert.ok(payload && typeof payload === 'object' && typeof payload.lessonSkill === 'string', 'bktRecord wajib menerima objek {lessonSkill, skill}');
  bktCalls.push({ payload, ok, kappa });
};
global.updateMastery = function (bucket, key, ok) {
  assert.strictEqual(typeof bucket, 'string', 'bucket wajib string');
  assert.strictEqual(typeof key, 'string', 'key wajib string');
  assert.strictEqual(typeof ok, 'boolean', 'ok wajib boolean');
  masteryCalls.push({ bucket, key, ok });
};
global.misconceptionLedgerRecord = function (session, q, diag, ok) {
  ledgerCalls.push({ session, q, diag, ok });
};

const evalWrongHost = Bridge.evaluateStoryQuiz(qData, 0);
assert.strictEqual(evalWrongHost.ok, false);
assert.strictEqual(bktCalls.length, 1, 'bktRecord WAJIB terpanggil meski jawaban SALAH');
assert.strictEqual(bktCalls[0].ok, false);
assert.strictEqual(masteryCalls.length, 1, 'updateMastery WAJIB terpanggil meski jawaban SALAH');
assert.strictEqual(masteryCalls[0].ok, false);
assert.strictEqual(ledgerCalls.length, 1);
assert.strictEqual(ledgerCalls[0].diag.misconception, 'age_off_by_one');

const evalTelemetry = Bridge.evaluateStoryQuiz(qData, 1);
assert.strictEqual(evalTelemetry.ok, true);
assert.strictEqual(bktCalls.length, 2, 'bktRecord WAJIB terpanggil saat jawaban kuis benar');
assert.strictEqual(bktCalls[1].ok, true, 'bktRecord harus mencatat ok: true');
assert.strictEqual(bktCalls[1].payload.lessonSkill, 'reading_story-n5-maiko-q1');
assert.strictEqual(masteryCalls.length, 2, 'updateMastery WAJIB terpanggil saat jawaban kuis benar');
assert.strictEqual(masteryCalls[1].ok, true, 'updateMastery harus mencatat ok: true');
assert.strictEqual(masteryCalls[1].bucket, 'reading');
assert.strictEqual(ledgerCalls.length, 2);
assert.strictEqual(ledgerCalls[1].ok, true);
delete global.bktRecord; delete global.updateMastery; delete global.misconceptionLedgerRecord;
console.log('PASS 5: Saluran telemetri BKT, OLM, dan Ledger NYATA (benar + salah) terverifikasi');

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
