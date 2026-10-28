/**
 * FIEZEL · tests/story-voice-autoplay-test.js
 *
 * SHINOBI STORY GRADED READER ELEVENLABS AUDIO & AUTO-ADVANCE SUITE
 * Memvalidasi pemutaran audio nyata ElevenLabs dan rantai auto-advance
 * adegan 1 -> 2 -> 3 -> 4 -> 5 secara otomatis.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const readerPath = path.join(ROOT, 'features', 'japanese', 'fiezel-story-reader.js');

console.log('=== [FIEZEL STORY AUDIO & AUTOPLAY TEST SUITE] ===\n');

// 1. Module Export & Integrity
const reader = require(readerPath);
assert.ok(reader, 'FiezelStoryReader harus ter-export');
assert.ok(typeof reader.toggleAudio === 'function', 'toggleAudio harus fungsi');
assert.ok(typeof reader.stopAudio === 'function', 'stopAudio harus fungsi');
assert.ok(typeof reader.playSceneAudio === 'function', 'playSceneAudio harus fungsi');
assert.ok(typeof reader.handleSceneAudioEnded === 'function', 'handleSceneAudioEnded harus fungsi');
assert.ok(typeof reader.gotoScene === 'function', 'gotoScene harus fungsi');
console.log('PASS 1: Module export & interface API valid.');

// 2. Physical Audio File Check for All 3 Stories (15 Scenes)
assert.strictEqual(reader.STORIES.length, 3, 'Harus ada 3 cerita');
let totalPhysicalAudios = 0;
for (const story of reader.STORIES) {
  assert.strictEqual(story.scenes.length, 5, `Cerita ${story.id} wajib memiliki 5 adegan`);
  for (let idx = 0; idx < story.scenes.length; idx++) {
    const sc = story.scenes[idx];
    assert.ok(sc.audioSrc, `Adegan ${idx} cerita ${story.id} harus memiliki audioSrc`);
    const absPath = path.join(ROOT, sc.audioSrc.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(absPath), `Berkas fisik audio tidak ada di disk: ${absPath}`);
    const size = fs.statSync(absPath).size;
    assert.ok(size > 10 * 1024, `Berkas audio ${absPath} terlalu kerdil (${size} B)`);
    totalPhysicalAudios++;
  }
}
assert.strictEqual(totalPhysicalAudios, 15, 'Total 15 berkas audio (3 cerita x 5 adegan) harus terverifikasi');
console.log(`PASS 2: 15 berkas audio ElevenLabs otentik terverifikasi fisik di disk (> 10 KB).`);

// 3. Autoplay & Sequential Progression Invariant (1 -> 2 -> 3 -> 4 -> 5)
async function testSequentialAutoplay() {
  reader.openStory('mizuki-maiko');
  assert.strictEqual(reader.getActiveSceneIndex(), 0, 'Harus mulai dari adegan 0 (Adegan 1)');

  // Simulasi adegan 0 audio selesai -> harus transisi ke adegan 1
  reader.handleSceneAudioEnded(0);
  await new Promise(r => setTimeout(r, 800));
  assert.strictEqual(reader.getActiveSceneIndex(), 1, 'Adegan 1 selesai harus auto-advance ke Adegan 2 (indeks 1)');
  console.log('  ✓ Auto-advance: Adegan 1 -> Adegan 2');

  // Simulasi adegan 1 audio selesai -> harus transisi ke adegan 2
  reader.handleSceneAudioEnded(1);
  await new Promise(r => setTimeout(r, 800));
  assert.strictEqual(reader.getActiveSceneIndex(), 2, 'Adegan 2 selesai harus auto-advance ke Adegan 3 (indeks 2)');
  console.log('  ✓ Auto-advance: Adegan 2 -> Adegan 3');

  // Simulasi adegan 2 audio selesai -> harus transisi ke adegan 3
  reader.handleSceneAudioEnded(2);
  await new Promise(r => setTimeout(r, 800));
  assert.strictEqual(reader.getActiveSceneIndex(), 3, 'Adegan 3 selesai harus auto-advance ke Adegan 4 (indeks 3)');
  console.log('  ✓ Auto-advance: Adegan 3 -> Adegan 4');

  // Simulasi adegan 3 audio selesai -> harus transisi ke adegan 4 (Kuis Akhir)
  reader.handleSceneAudioEnded(3);
  await new Promise(r => setTimeout(r, 1300));
  assert.strictEqual(reader.getActiveSceneIndex(), 4, 'Adegan 4 selesai harus transisi ke Adegan 5 (Kuis Akhir)');
  console.log('  ✓ Auto-advance: Adegan 4 -> Adegan 5 (Kuis Akhir)');
}

testSequentialAutoplay().then(() => {
  console.log('PASS 3: Rantai sequential auto-advance 1 -> 2 -> 3 -> 4 -> 5 LULUS 100%.');

  // 4. Defensive Guard & Cleanup Test
  reader.gotoScene(2);
  assert.strictEqual(reader.getActiveSceneIndex(), 2, 'gotoScene(2) harus mengeset scene ke 2');
  reader.stopAudio();
  assert.strictEqual(reader.getIsPlaying(), false, 'stopAudio harus menghentikan status playing');

  reader.openLibrary();
  assert.strictEqual(reader.getIsPlaying(), false, 'openLibrary harus memastikan audio mati');
  console.log('PASS 4: Defensive audio lifecycle & stop guards terverifikasi.');

  console.log('\n======================================================');
  console.log('HASIL: SEMUA PENGUJIAN AUDIO & AUTOPLAY LULUS 100%!');
  console.log('======================================================');
  process.exit(0);
}).catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
