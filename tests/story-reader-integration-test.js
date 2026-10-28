#!/usr/bin/env node
/**
 * tests/story-reader-integration-test.js
 *
 * Verifikasi Integrasi Storyboard Cerita N5 (Anti-Island Invariant):
 * 1. Pendaftaran skrip di index.html
 * 2. Pendaftaran rute dan handler di app.js
 * 3. Kelengkapan 3 judul cerita berjenjang N5 (Mizuki, Asakusa, Shinkansen)
 * 4. Struktur multi-scene per cerita (5 adegan lengkap dengan gambar dan kuis)
 * 5. Ketahanan timezone & syncAttempts di brainSyncWrite & brainSyncFlush
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');
const Reader = require(path.join(rootDir, 'features', 'japanese', 'fiezel-story-reader.js'));

console.log('--- TEST FIEZEL STORY READER INTEGRATION ---');

// 1. Script Registration in index.html
assert.ok(indexHtml.includes('features/japanese/fiezel-story-brain-bridge.js'), 'index.html harus memuat fiezel-story-brain-bridge.js');
assert.ok(indexHtml.includes('features/japanese/fiezel-story-reader.js'), 'index.html harus memuat fiezel-story-reader.js');
console.log('PASS 1: Skrip bridge dan reader terdaftar di index.html');

// 2. VALID_VIEWS & Routing in app.js
assert.ok(appJs.includes("'story'") && appJs.includes("'news'"), 'app.js harus memuat view story dan news');
assert.ok(appJs.includes('japaneseStoryView'), 'app.js harus mendefinisikan japaneseStoryView');
assert.ok(appJs.includes('japaneseNewsView'), 'app.js harus mendefinisikan japaneseNewsView');
assert.ok(appJs.includes('ja-story-card'), 'app.js latihanCards harus memuat kartu cerita Jepang');
console.log('PASS 2: View routing dan kartu latihan terintegrasi di app.js');

// 3. Offline Sync Hardening in app.js
assert.ok(appJs.includes('timezone:st.timezone||tz') || appJs.includes('timezone:tz'), 'brainSyncWrite/Flush harus mencatat timezone');
assert.ok(appJs.includes('syncAttempts:Number(st.syncAttempts)'), 'brainSyncWrite harus mencatat syncAttempts');
assert.ok(appJs.includes('syncAttempts:currentAttempts'), 'brainSyncFlush harus mengirim syncAttempts');
console.log('PASS 3: Timezone & syncAttempts offline sync hardening aktif di app.js');

// 4. Kelengkapan 3 Judul Cerita N5
assert.ok(Array.isArray(Reader.STORIES) && Reader.STORIES.length >= 3, 'Harus tersedia minimal 3 cerita');
const storyIds = Reader.STORIES.map(s => s.id);
assert.ok(storyIds.includes('mizuki-maiko'), 'Harus ada cerita Mizuki no Maiko');
assert.ok(storyIds.includes('asakusa-neko'), 'Harus ada cerita Asakusa no Neko');
assert.ok(storyIds.includes('shinkansen-trip'), 'Harus ada cerita Shinkansen Trip');
console.log('PASS 4: 3 Judul Graded Readers N5 lengkap (' + storyIds.join(', ') + ')');

// 5. Struktur Multi-Scene (5 Adegan per Cerita)
for (const story of Reader.STORIES) {
  assert.ok(Array.isArray(story.scenes) && story.scenes.length === 5, story.id + ' harus memiliki 5 adegan lengkap');
  for (let i = 0; i < 4; i++) {
    const sc = story.scenes[i];
    assert.ok(sc.title && sc.image && sc.jp && sc.id, story.id + ' scene ' + i + ' harus lengkap title, image, jp, id');
    assert.ok(sc.jp.includes('<ruby'), story.id + ' scene ' + i + ' harus memuat token <ruby> interaktif');
  }
  const quizScene = story.scenes[4];
  assert.strictEqual(quizScene.isQuiz, true, story.id + ' scene 4 harus berupa kuis');
  assert.ok(quizScene.quiz && Array.isArray(quizScene.quiz.options) && quizScene.quiz.options.length >= 3, story.id + ' kuis harus memiliki minimal 3 opsi');
  assert.strictEqual(typeof quizScene.quiz.answerIndex, 'number', story.id + ' answerIndex kuis harus bertipe number');
}
console.log('PASS 5: Seluruh cerita memiliki 5 adegan lengkap dengan gambar dan kuis');

console.log('\nSEMUA GERBANG INTEGRASI STORY READER: 100% LULUS (HIJAU).');
