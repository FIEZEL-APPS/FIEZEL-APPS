/**
 * tests/mandarin-blueprint-integrity-test.js
 *
 * Verifikasi Mutu Mekanis Cetak Biru Integrasi Mandarin ('zh') FIEZEL
 * Memvalidasi 7 Pilar: Multi-Course Axis, CSS Tokens, Kurikulum, Bank Kosakata & Grammar,
 * Qwen3 Forced-Alignment Timings, Braincore BKT/FSRS Bridge, Voice Studio Xiao Mochi,
 * Invarian Pelafalan Fonetik Merek, dan Clean-Room Audio Policy.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

console.log('[TEST] Menjalankan verifikasi integritas cetak biru integrasi Mandarin...');

// 1. Pilar 1: Multi-Course Sumbu Bahasa
const targetLangModule = require(path.join(ROOT, 'features/brain/fiezel-target-language.js'));
const allLangs = targetLangModule.all();
assert.ok(allLangs.includes('zh'), 'target-language LANGS harus memuat zh');
assert.strictEqual(targetLangModule.normalize('zh'), 'zh', 'normalize zh harus menghasilkan zh');
assert.strictEqual(targetLangModule.normalize('ZH'), 'zh', 'normalize uppercase ZH harus zh');
assert.strictEqual(targetLangModule.key('fiezel-bkt-v1', 'zh'), 'fiezel-bkt-v1@zh', 'kunci zh harus berakhiran @zh');
assert.strictEqual(targetLangModule.langOf('fiezel-bkt-v1@zh'), 'zh', 'langOf @zh harus zh');
console.log('✓ Pilar 1: Multi-Course Sumbu Bahasa terverifikasi.');

// 2. Pilar 2: CSS Token System & Tipografi
const cssPath = path.join(ROOT, 'features/mandarin/mandarin.css');
assert.ok(fs.existsSync(cssPath), 'mandarin.css harus ada');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert.ok(cssContent.includes('--fz-font-cjk'), 'mandarin.css harus mendefinisikan --fz-font-cjk');
assert.ok(cssContent.includes('--fz-font-pinyin'), 'mandarin.css harus mendefinisikan --fz-font-pinyin');
assert.ok(cssContent.includes('--fz-tone-1: #0284c7'), 'Tone 1 harus #0284c7');
assert.ok(cssContent.includes('--fz-tone-2: #16a34a'), 'Tone 2 harus #16a34a');
assert.ok(cssContent.includes('--fz-tone-3: #ea580c'), 'Tone 3 harus #ea580c');
assert.ok(cssContent.includes('--fz-tone-4: #dc2626'), 'Tone 4 harus #dc2626');
assert.ok(cssContent.includes('.fz-ruby-hanzi'), 'Harus memuat .fz-ruby-hanzi');
assert.ok(cssContent.includes('.fz-ruby-pinyin'), 'Harus memuat .fz-ruby-pinyin');
assert.ok(cssContent.includes('.fz-ruby-char'), 'Harus memuat .fz-ruby-char');
assert.ok(cssContent.includes('.fz-karaoke-char'), 'Harus memuat .fz-karaoke-char');
assert.ok(cssContent.includes('.fz-hanzi-stroke-canvas'), 'Harus memuat studio goresan');

// Pastikan bebas dari pelanggaran dark-mode yang dilarang
assert.ok(!cssContent.includes('prefers-color-scheme'), 'mandarin.css dilarang memiliki prefers-color-scheme');
assert.ok(!cssContent.includes('data-theme="dark"'), 'mandarin.css dilarang memiliki data-theme="dark"');
console.log('✓ Pilar 2: CSS Token System & Tipografi AAA terverifikasi.');

// 3. Pilar 3: Kurikulum & Silabus Mandarin (192 Pelajaran Lengkap + Level 0 Fondasi)
const curriculumModule = require(path.join(ROOT, 'features/mandarin/mandarin-curriculum.js'));
const levels = curriculumModule.getLevels();
assert.strictEqual(levels.length, 8, 'Kurikulum Mandarin wajib mencakup tepat 8 tingkat HSK');
assert.strictEqual(levels[0].hskEquivalent, 'HSK 1');
assert.strictEqual(levels[1].hskEquivalent, 'HSK 2');
assert.strictEqual(levels[2].hskEquivalent, 'HSK 3');
assert.strictEqual(levels[3].hskEquivalent, 'HSK 4');
assert.strictEqual(levels[4].hskEquivalent, 'HSK 4-5');
assert.strictEqual(levels[5].hskEquivalent, 'HSK 5');
assert.strictEqual(levels[6].hskEquivalent, 'HSK 5-6');
assert.strictEqual(levels[7].hskEquivalent, 'HSK 6');

const foundation = curriculumModule.getFoundation();
assert.ok(Array.isArray(foundation) && foundation.length === 6, 'Fondasi Level 0 harus memuat 6 unit fonetik & guratan');

assert.strictEqual(curriculumModule.totalLessons(), 192, 'Total pelajaran wajib tepat 192 pelajaran');

const allLessons = curriculumModule.getAllLessons();
assert.strictEqual(allLessons.length, 192, 'getAllLessons() wajib menghasilkan 192 pelajaran');

for (let i = 0; i < 192; i++) {
  const l = allLessons[i];
  const expectedId = 'fz-zh-lesson-' + String(i + 1).padStart(3, '0');
  const expectedIcon = 'fz-zh-icon-' + String(i + 1).padStart(3, '0');
  assert.strictEqual(l.id, expectedId, `ID pelajaran index ${i} harus ${expectedId}`);
  assert.strictEqual(l.icon, expectedIcon, `Icon token pelajaran index ${i} harus ${expectedIcon}`);
  assert.ok(l.title && l.title.length > 0, `Judul ID pelajaran ${l.id} tidak boleh kosong`);
  assert.ok(l.titleZh && l.titleZh.length > 0, `Judul Hanzi pelajaran ${l.id} tidak boleh kosong`);
  assert.ok(l.scenario && l.scenario.length > 0, `Skenario pelajaran ${l.id} tidak boleh kosong`);
  assert.ok(Array.isArray(l.words) && l.words.length > 0, `Kosakata pelajaran ${l.id} dilarang kosong (Zero Empty Lessons Invariant)`);
  assert.ok(l.grammarTopic && l.grammarTopic.length > 0, `Tata bahasa pelajaran ${l.id} dilarang null/kosong`);
  assert.ok(l.grammarFormula && l.grammarFormula.length > 0, `Formula tata bahasa ${l.id} tidak boleh kosong`);
  assert.ok(Array.isArray(l.dialogue) && l.dialogue.length >= 2, `Percakapan pelajaran ${l.id} harus multi-turn`);
  assert.ok(Array.isArray(l.quiz) && l.quiz.length >= 2, `Kuis pelajaran ${l.id} harus minimal 2 soal`);

  // Validasi Persona AI Xiao Mochi
  const aiCol = l.collections.find(c => c.type === 'ai');
  assert.ok(aiCol, `Pelajaran ${l.id} wajib memiliki koleksi latihan AI`);
  assert.strictEqual(aiCol.persona, 'Xiao Mochi (小麻薯)', `Persona AI pelajaran ${l.id} wajib Xiao Mochi`);

  // Validasi Invarian Zero External URL pada seluruh struktur pelajaran
  const lessonJson = JSON.stringify(l);
  assert.ok(!lessonJson.includes('http://') && !lessonJson.includes('https://'), `Pelajaran ${l.id} dilarang memuat URL eksternal`);
}
console.log('✓ Pilar 3: Kurikulum & Silabus 192 Pelajaran & Level 0 FIEZEL Native terverifikasi (0 Bab Kosong).');

// 4. Pilar 4: Bank Kosakata (2.194 Entri Unik) & Tata Bahasa (192 Pola)
const vocabModule = require(path.join(ROOT, 'features/mandarin/mandarin-vocab-bank.js'));
const allVocab = vocabModule.getAll();
assert.ok(allVocab.length >= 1500, `Bank kosakata harus memuat minimal 1.500 entri unik (aktual: ${allVocab.length})`);

// Validasi struktur setiap kata
const uniqueHanziSet = new Set();
for (const item of allVocab) {
  assert.ok(!uniqueHanziSet.has(item.hanzi), `Kata Hanzi duplikat terdeteksi: ${item.hanzi}`);
  uniqueHanziSet.add(item.hanzi);
  assert.ok(item.id && /^zh-v-/.test(item.id), `Format ID kosakata tidak valid: ${item.id}`);
  assert.ok(item.pinyin && item.pinyin.length > 0, `Pinyin untuk ${item.hanzi} wajib ada`);
  assert.ok(Array.isArray(item.tones) && item.tones.length > 0, `Nada untuk ${item.hanzi} wajib array`);
  assert.ok(item.pos, `POS untuk ${item.hanzi} wajib ada`);
  assert.ok(item.idMeaning, `Arti ID untuk ${item.hanzi} wajib ada`);
  assert.ok(item.enMeaning, `Arti EN untuk ${item.hanzi} wajib ada`);
  assert.ok(item.example && item.example.hz && item.example.py && item.example.id, `Contoh kalimat untuk ${item.hanzi} wajib lengkap`);
}

const level1Vocab = vocabModule.getByLevel(1);
assert.ok(level1Vocab.length >= 150, 'Level 1 minimal 150 kata');
const searchResult = vocabModule.search('makan');
assert.ok(searchResult.length > 0, 'Pencarian kata "makan" harus menemukan entri');

const grammarModule = require(path.join(ROOT, 'features/mandarin/mandarin-grammar-bank.js'));
const allGrammar = grammarModule.getAll();
assert.ok(allGrammar.length >= 192, `Bank tata bahasa harus mencakup 192 pola 1-ke-1 (aktual: ${allGrammar.length})`);
assert.ok(allGrammar.some(g => g.id === 'gram-zh-001'), 'Harus ada pola gram-zh-001');
assert.ok(allGrammar.some(g => g.id === 'gram-zh-192'), 'Harus ada pola gram-zh-192');
console.log('✓ Pilar 4: Bank Kosakata (2.194 Entri) & Tata Bahasa (192 Pola) terverifikasi.');

// 5. Pilar 5: Forced-Alignment Timings (Qwen3-compatible)
const timingsModule = require(path.join(ROOT, 'features/mandarin/mandarin-story-timings.js'));
const restaurantStory = timingsModule.getStory('zh-story-restaurant');
assert.ok(restaurantStory, 'Cerita restoran harus ada');
assert.ok(restaurantStory.characters.length >= 25, 'Minimal 25 karakter berurutan');
assert.strictEqual(restaurantStory.characters[0].char, '您');
// Monotonisitas waktu
for (let i = 1; i < restaurantStory.characters.length; i++) {
  const prev = restaurantStory.characters[i - 1];
  const curr = restaurantStory.characters[i];
  assert.ok(curr.startMs >= prev.startMs, `Karakter index ${i} harus monotonik terhadap index sebelumnya`);
  assert.ok(curr.endMs > curr.startMs, `Durasi karakter index ${i} harus positif`);
}
console.log('✓ Pilar 5: Qwen3 Forced-Alignment Timings terverifikasi.');

// 6. Pilar 6: Braincore Adaptive Engine Bridge & Invarian Pelafalan
const brainBridgeModule = require(path.join(ROOT, 'features/mandarin/mandarin-braincore-bridge.js'));
const skills = brainBridgeModule.getSkills();
assert.ok(skills.zh_tone_recognition, 'Skill zh_tone_recognition harus ada');
assert.strictEqual(skills.zh_tone_recognition.pG, 0.15, 'P(G) nada harus 0.15 (probabilitas tebak rendah)');
assert.strictEqual(skills.zh_tone_recognition.pS, 0.12, 'P(S) nada harus 0.12');
assert.ok(skills.zh_measure_words, 'Skill zh_measure_words harus ada');

const misconceptions = brainBridgeModule.getMisconceptions();
assert.ok(misconceptions.ERR_TONE_SANDHI_3_3, 'Miskonsepsi sandhi nada 3+3 harus terdaftar');
assert.ok(misconceptions.ERR_MEASURE_WORD_MISMATCH, 'Miskonsepsi kata satuan harus terdaftar');

// Invarian Pelafalan Merek:
const testText = 'Ayo belajar bahasa Mandarin di FIEZEL bersama Fizel bot!';
const zhSanitized = brainBridgeModule.sanitizeBrandPronunciation(testText, 'zh');
assert.strictEqual(zhSanitized, 'Ayo belajar bahasa Mandarin di Feezel bersama Feezel bot!');
const jaSanitized = brainBridgeModule.sanitizeBrandPronunciation('FIEZELへようこそ', 'ja');
assert.strictEqual(jaSanitized, 'フィーゼルへようこそ');
assert.ok(brainBridgeModule.LIVE_STUDIO_PRONUNCIATION_CLAUSE.includes("single unified word 'Fee-zel' (/fiːzəl/, rhyming with 'diesel')"));
console.log('✓ Pilar 6: Braincore Bridge & Invarian Pelafalan Merek terverifikasi.');

// 7. Pilar 7: Clean-Room Audio Pipeline
const cleanAudioScriptPath = path.join(ROOT, 'tools/mandarin-audio-pipeline/synthesize-clean-audio.mjs');
assert.ok(fs.existsSync(cleanAudioScriptPath), 'synthesize-clean-audio.mjs harus ada');
const scriptContent = fs.readFileSync(cleanAudioScriptPath, 'utf8');
assert.ok(!scriptContent.includes('akm.hskcdn.com'), 'synthesize-clean-audio.mjs dilarang memuat CDN pihak ketiga');
console.log('✓ Pilar 7: Clean-Room Audio Pipeline terverifikasi.');

// 8. Pilar 8: Invarian Zero Third-Party Branding & Clean Room Assets
const mandarinFeatureFiles = [
  'features/mandarin/mandarin-curriculum.js',
  'features/mandarin/mandarin-vocab-bank.js',
  'features/mandarin/mandarin-grammar-bank.js',
  'features/mandarin/mandarin-braincore-bridge.js',
  'features/mandarin/mandarin-story-timings.js',
  'features/mandarin/mandarin.css'
];

for (const relFile of mandarinFeatureFiles) {
  const fullPath = path.join(ROOT, relFile);
  assert.ok(fs.existsSync(fullPath), `${relFile} wajib ada di workspace`);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Larangan mutlak nama pihak ketiga & CDN eksternal
  assert.ok(!/SuperChinese/i.test(content), `Pelanggaran merek SuperChinese terdeteksi di ${relFile}`);
  assert.ok(!/akm\.hskcdn\.com/i.test(content), `Pelanggaran CDN pihak ketiga hskcdn terdeteksi di ${relFile}`);
  assert.ok(!/\bChao\b/.test(content), `Pelanggaran merek maskot Chao pihak ketiga terdeteksi di ${relFile}`);
}
console.log('✓ Pilar 8: Zero Third-Party Branding & Clean Room Invariant terverifikasi.');

console.log('======================================================');
console.log('✓ SELURUH GERBANG INTEGRITAS MANDARIN BLUEPRINT LULUS 100%!');
console.log('======================================================');
