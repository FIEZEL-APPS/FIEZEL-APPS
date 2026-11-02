/**
 * tests/story-timings-integrity-test.js
 *
 * Verifikasi Mutu Mekanis & Integritas Data Forced-Alignment Cerita Dokkai N5
 * Memastikan 100% kepatuhan format skema timing per karakter milidetik.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const TIMINGS_FILE = path.join(__dirname, '../features/japanese/story-timings.json');

function runTest() {
  console.log('[TEST] Menjalankan verifikasi integritas data forced-alignment cerita...');
  assert.ok(fs.existsSync(TIMINGS_FILE), 'Berkas story-timings.json wajib ada di features/japanese/');

  const data = JSON.parse(fs.readFileSync(TIMINGS_FILE, 'utf8'));
  assert.strictEqual(data.schema_version, '1.0.0', 'schema_version wajib 1.0.0');
  assert.ok(data.stories, 'data.stories wajib ada');

  const requiredStories = ['mizuki-maiko', 'asakusa-neko', 'shinkansen-trip'];
  let totalScenesVerified = 0;
  let totalCharsVerified = 0;

  for (const storyId of requiredStories) {
    const story = data.stories[storyId];
    assert.ok(story, `Cerita ${storyId} wajib ada di dalam data`);
    assert.strictEqual(story.scenes.length, 5, `Cerita ${storyId} wajib memiliki tepat 5 adegan`);

    for (let i = 0; i < story.scenes.length; i++) {
      const sc = story.scenes[i];
      assert.strictEqual(sc.scene_idx, i, `Index adegan wajib ${i}`);
      assert.ok(sc.audio_duration_ms > 0, `Durasi audio adegan ${i} wajib > 0 ms`);
      assert.ok(Array.isArray(sc.char_timings), `char_timings adegan ${i} wajib array`);
      assert.ok(sc.char_timings.length > 0, `char_timings adegan ${i} wajib tidak kosong`);

      for (let c = 0; c < sc.char_timings.length; c++) {
        const item = sc.char_timings[c];
        assert.ok(typeof item.char === 'string' && item.char.length > 0, `Karakter ke-${c} wajib string`);
        assert.ok(typeof item.start_ms === 'number' && item.start_ms >= 0, `start_ms karakter ke-${c} wajib >= 0`);
        assert.ok(typeof item.end_ms === 'number' && item.end_ms > item.start_ms, `end_ms (${item.end_ms}) karakter ke-${c} wajib > start_ms (${item.start_ms})`);
        assert.ok(item.end_ms <= sc.audio_duration_ms, `end_ms (${item.end_ms}) karakter ke-${c} tidak boleh melebihi durasi audio (${sc.audio_duration_ms})`);

        if (c > 0) {
          const prev = sc.char_timings[c - 1];
          assert.ok(item.start_ms >= prev.start_ms, `Karakter ke-${c} (${item.char}) wajib monotonik terhadap karakter sebelumnya`);
        }
        totalCharsVerified++;
      }
      totalScenesVerified++;
    }
  }

  console.log(`✓ SUKSES: ${totalScenesVerified} adegan cerita terverifikasi (${totalCharsVerified} karakter perataan waktu presisi).`);
}

runTest();
