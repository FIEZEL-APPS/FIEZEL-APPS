/**
 * FIEZEL · tests/content-integrity-gate.js
 *
 * AUTOMATED CONTENT INTEGRITY & ANTI-STUB QUALITY GATE
 *
 * Gerbang Mutu Mutlak:
 * 1. Anti-Island Check: Seluruh modul fitur di features/japanese/ WAJIB terhubung ke index.html.
 * 2. Numeric Volume Check: Seluruh katalog cerita Graded Readers WAJIB memenuhi batas kuantitatif:
 *    - Minimal 3 cerita utuh (bukan 1 sampel stub).
 *    - Minimal 5 adegan per cerita (4 adegan naratif + 1 kuis diagnostik).
 *    - Minimal 2 kalimat / 3 token interaktif per adegan naratif.
 *    - Kuis memiliki >= 3 pilihan jawaban dengan distractor misconceptionId & failWhy.
 * 3. Real Asset Purity Check: Seluruh ilustrasi adegan harus berupa aset SVG/file fisik valid > 100 bytes.
 * 4. Offline Sync Hardening: app.js harus mengikat timezone dan syncAttempts.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

console.log('=== [FIEZEL CONTENT INTEGRITY & ANTI-STUB GATE] ===\n');

// -------------------------------------------------------------
// GATE 1: Anti-Island Monolith Verification
// -------------------------------------------------------------
console.log('--- GATE 1: Anti-Island Monolith Verification ---');
const indexHtmlPath = path.join(ROOT, 'index.html');
assert.ok(fs.existsSync(indexHtmlPath), 'index.html harus ada di root');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const japaneseFeaturesDir = path.join(ROOT, 'features', 'japanese');
if (fs.existsSync(japaneseFeaturesDir)) {
  const jsFiles = fs.readdirSync(japaneseFeaturesDir).filter(f => f.endsWith('.js'));
  assert.ok(jsFiles.length >= 2, 'Direktori features/japanese minimal berisi 2 modul fitur');

  for (const jsFile of jsFiles) {
    const relativeScript = `./features/japanese/${jsFile}`;
    const altScript = `features/japanese/${jsFile}`;
    const isLinked = indexHtml.includes(relativeScript) || indexHtml.includes(altScript);
    assert.ok(isLinked, `[Anti-Island Violation] File fitur ${jsFile} TIDAK terhubung di index.html!`);
    console.log(`  ✓ Terhubung di index.html: ${jsFile}`);
  }
}
console.log('PASS: Gate 1 (Anti-Island Monolith Verification) Lulus 100%.\n');

// -------------------------------------------------------------
// GATE 2: Numeric Definition of Done (Volume & Pedagogy)
// -------------------------------------------------------------
console.log('--- GATE 2: Numeric Definition of Done (Volume & Pedagogy) ---');
const readerModulePath = path.join(ROOT, 'features', 'japanese', 'fiezel-story-reader.js');
assert.ok(fs.existsSync(readerModulePath), 'Modul fiezel-story-reader.js harus ada');

const reader = require(readerModulePath);
assert.ok(reader && Array.isArray(reader.STORIES), 'Katalog reader.STORIES harus berupa array');

const MIN_STORIES = 3;
assert.ok(
  reader.STORIES.length >= MIN_STORIES,
  `[Stub Violation] Jumlah cerita (${reader.STORIES.length}) kurang dari ambang batas minimum (${MIN_STORIES})!`
);
console.log(`  ✓ Volume Cerita: ${reader.STORIES.length} judul cerita (Min target: ${MIN_STORIES})`);

for (const story of reader.STORIES) {
  assert.ok(story.id && story.title && story.level, `Cerita ${story.id} harus memiliki id, title, dan level`);
  assert.ok(Array.isArray(story.scenes), `Cerita ${story.id} harus memiliki array scenes`);
  assert.strictEqual(
    story.scenes.length,
    5,
    `[Scene Volume Violation] Cerita ${story.id} memiliki ${story.scenes.length} adegan (Wajib tepat 5 adegan: 4 naratif + 1 kuis)!`
  );

  // 4 Adegan Narasi
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const sc = story.scenes[sIdx];
    assert.ok(sc.title && sc.jp && sc.id, `Adegan ${sIdx} cerita ${story.id} harus memiliki title, jp, dan id`);
    assert.ok(
      sc.jp.length >= 20,
      `[Stub Text Violation] Adegan ${sIdx} cerita ${story.id} terlalu pendek (${sc.jp.length} karakter)`
    );
    const tokenMatches = sc.jp.match(/<ruby/g);
    assert.ok(
      tokenMatches && tokenMatches.length >= 2,
      `[Pedagogical Violation] Adegan ${sIdx} cerita ${story.id} harus memiliki minimal 2 token <ruby>`
    );
  }

  // 1 Adegan Kuis
  const quizScene = story.scenes[4];
  assert.strictEqual(quizScene.isQuiz, true, `Adegan ke-5 cerita ${story.id} harus isQuiz: true`);
  assert.ok(quizScene.quiz, `Adegan ke-5 cerita ${story.id} harus memiliki objek quiz`);
  const q = quizScene.quiz;
  assert.ok(q.questionJapanese && q.stem, `Kuis cerita ${story.id} harus memiliki questionJapanese dan stem`);
  assert.ok(Array.isArray(q.options) && q.options.length >= 3, `Kuis cerita ${story.id} harus memiliki >= 3 pilihan`);
  assert.strictEqual(typeof q.answerIndex, 'number', `Kuis cerita ${story.id} harus memiliki answerIndex bertipe number`);

  // Validasi Distractor Misconception Ledger
  for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
    const opt = q.options[oIdx];
    if (oIdx === q.answerIndex) {
      assert.strictEqual(opt.isCorrect, true, `Pilihan jawaban benar ${story.id} indeks ${oIdx} harus isCorrect: true`);
    } else {
      assert.ok(
        opt.misconceptionId && opt.failWhy,
        `[Pedagogical Violation] Distractor salah kuis ${story.id} pilihan ${oIdx} WAJIB memiliki misconceptionId & failWhy!`
      );
    }
  }
  console.log(`  ✓ Terverifikasi Penuh: ${story.id} (5 Adegan, BKT Tokens, Misconception Distractors)`);
}
console.log('PASS: Gate 2 (Numeric Volume & Pedagogical Integrity) Lulus 100%.\n');

// -------------------------------------------------------------
// GATE 3: Real Asset Purity (Zero-Stub Artwork)
// -------------------------------------------------------------
console.log('--- GATE 3: Real Asset Purity (Zero-Stub Artwork) ---');
for (const story of reader.STORIES) {
  for (let sIdx = 0; sIdx < story.scenes.length; sIdx++) {
    const sc = story.scenes[sIdx];
    const art = sc.image || sc.svgArt;
    assert.ok(art && typeof art === 'string', `Adegan ${sIdx} cerita ${story.id} harus memiliki image/svgArt non-empty`);
    assert.ok(
      art.includes('<svg') && art.includes('</svg>'),
      `[Artwork Violation] Adegan ${sIdx} cerita ${story.id} harus memuat markup SVG valid`
    );
    assert.ok(
      art.length >= 150,
      `[Artwork Violation] Ilustrasi adegan ${sIdx} cerita ${story.id} terlalu kerdil (${art.length} bytes)`
    );
  }
}
// Gate 3b: Anti-Duplicate Artwork — tiap adegan naratif WAJIB punya ilustrasi BERBEDA.
// (Celah yang pernah lolos: 5 adegan memakai SVG identik = "gambarnya cuma 1".)
const crypto = require('crypto');
let totalScenes = 0;
for (const story of reader.STORIES) {
  const hashes = new Set();
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const sc = story.scenes[sIdx];
    const key = sc.imageSrc ? 'file:' + sc.imageSrc : 'svg:' + (sc.image || sc.svgArt);
    hashes.add(crypto.createHash('sha1').update(key).digest('hex'));
    totalScenes++;
  }
  assert.ok(
    hashes.size >= 4,
    `[Duplicate Artwork Violation] Cerita ${story.id} hanya punya ${hashes.size} ilustrasi unik untuk 4 adegan naratif (wajib 4 berbeda)!`
  );
  console.log(`  ✓ ${story.id}: ${hashes.size}/4 ilustrasi adegan unik`);
}

// Gate 3c: Real Raster File — bila imageSrc dipakai, berkas WAJIB ada di disk & > 10 KB.
for (const story of reader.STORIES) {
  for (const sc of story.scenes) {
    if (!sc.imageSrc) continue;
    const abs = path.join(ROOT, sc.imageSrc.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(abs), `[Asset Violation] Berkas ${sc.imageSrc} (${story.id}) tidak ada di disk!`);
    const size = fs.statSync(abs).size;
    assert.ok(size > 10 * 1024, `[Asset Violation] Berkas ${sc.imageSrc} terlalu kecil (${size} B)`);
  }
}

// Gate 3d: Real Pedagogical Audio Pipeline — seluruh 15 adegan (1-4 naratif + 5 kuis) WAJIB memiliki audioSrc berkas fisik nyata di disk > 10 KB.
let totalAudios = 0;
for (const story of reader.STORIES) {
  for (let sIdx = 0; sIdx < story.scenes.length; sIdx++) {
    const sc = story.scenes[sIdx];
    assert.ok(sc.audioSrc, `[Audio Violation] Adegan ${sIdx} cerita ${story.id} tidak memiliki audioSrc!`);
    const absAudio = path.join(ROOT, sc.audioSrc.replace(/^\.\//, ''));
    assert.ok(fs.existsSync(absAudio), `[Audio Violation] Berkas audio ${sc.audioSrc} (${story.id}) TIDAK ADA di disk!`);
    const size = fs.statSync(absAudio).size;
    assert.ok(size > 10 * 1024, `[Audio Violation] Berkas audio ${sc.audioSrc} terlalu kerdil (${size} B)`);
    totalAudios++;
  }
}
console.log(`  ✓ ${totalAudios} berkas audio narasi (ElevenLabs AI Voice Studio) terverifikasi fisik di disk (> 10 KB).`);
console.log(`  ✓ ${totalScenes} adegan naratif terverifikasi (SVG valid, unik, berkas raster nyata bila dipakai).`);
console.log('PASS: Gate 3 (Real Asset Purity) Lulus 100%.\n');

// -------------------------------------------------------------
// GATE 4: Offline Sync Hardening Verification
// -------------------------------------------------------------
console.log('--- GATE 4: Offline Sync Hardening Verification ---');
const appJsPath = path.join(ROOT, 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

assert.ok(
  appJs.includes('timezone:st.timezone||tz') || appJs.includes('timezone:tz'),
  '[Offline Hardening] brainSyncWrite/Flush harus mencatat timezone'
);
assert.ok(
  appJs.includes('syncAttempts:Number(st.syncAttempts)') || appJs.includes('syncAttempts:currentAttempts'),
  '[Offline Hardening] brainSyncWrite/Flush harus mengelola counter syncAttempts'
);
console.log('  ✓ brainSyncWrite & brainSyncFlush mengikat timezone dan syncAttempts counter.');
console.log('PASS: Gate 4 (Offline Sync Hardening) Lulus 100%.\n');

console.log('====================================================');
console.log('HASIL AKHIR: 4 DARI 4 GERBANG INTEGRITAS KONTEN LULUS (100% HIJAU)');
console.log('====================================================');
process.exit(0);
