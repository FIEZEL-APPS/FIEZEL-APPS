#!/usr/bin/env node
'use strict';
/**
 * placement-accuracy-test.js — gerbang akurasi tes penempatan FIEZEL
 *
 * KENAPA GERBANG INI ADA. Pemetaan lama akurasi->level (<35% A1, <50% A2, <65% B1, ...)
 * memberi kredit penuh atas tebakan: setiap soal punya 4 opsi, jadi lantai tebakan adalah 25%,
 * dan blueprint tes berat di pangkal (11 dari 25 soal ada di band A1-A2). Akibatnya murid yang
 * hanya menguasai dasar diumumkan B1, dan satu run TEBAKAN ACAK betulan diumumkan A2 (bukti
 * empiris seed 1337, 36%). Level penempatan menempel ke seluruh kurikulum murid sesudahnya,
 * jadi kesalahan di sini bukan kesalahan kosmetik.
 *
 * YANG DIUJI ADALAH PERILAKU, BUKAN ANGKA AMBANG. Pernyataan skoring di-extract dari app.js dan
 * dieksekusi hermetis di `vm` (tanpa DOM, penyimpanan, jaringan, atau boot aplikasi). Ambang
 * 45/60/72/82/92 sengaja TIDAK di-hardcode di sini: kalibrasi boleh berubah, kontraknya tidak.
 *
 * Konvensi mengikuti gerbang yang sudah ada (grammar-unlock-test.js, level-grammar-contract-test.js):
 * Node murni CommonJS, tanpa dependensi npm, sourceBlock() kanonis, checks[] + check(),
 * menulis PLACEMENT-ACCURACY-REPORT.json, dan exit 1 bila ada yang merah.
 *
 * Kegagalan extraction = FAIL, bukan SKIP. Test yang diam-diam hijau karena regexnya tidak
 * menemukan target lebih berbahaya daripada tidak ada test sama sekali.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const checks = [];
let failed = false;
function check(name, ok, details) {
  checks.push({ name, ok: !!ok, details: details || '' });
  if (!ok) failed = true;
}

// Pola kanonis repo (identik di grammar-unlock-test.js dan level-grammar-contract-test.js).
function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

// PRNG deterministik. Math.random() akan membuat CI flaky dan membuat kegagalan tidak bisa
// direproduksi; dengan seed literal tetap, hasil 1000 trial di bawah bit-identik setiap run.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const SEED = 0xF1E2E1;
const RANDOM_TRIALS = 1000;
const GUESS_P = 0.25; // 4 opsi per soal: vocab shuffle([correct, ...pool.slice(0,3)]), grammar exercise.options

// ---------------------------------------------------------------------------
// 1. Extraction
// ---------------------------------------------------------------------------
const sizeMatch = app.match(/const\s+PLACEMENT_SIZE\s*=\s*(\d+)/);
check('PLACEMENT_SIZE is extractable', !!sizeMatch, sizeMatch ? `PLACEMENT_SIZE=${sizeMatch[1]}` : 'const PLACEMENT_SIZE=<n> tidak ditemukan di app.js');
const PLACEMENT_SIZE = sizeMatch ? Number(sizeMatch[1]) : 0;
check('PLACEMENT_SIZE is a sane question count', PLACEMENT_SIZE >= 12 && PLACEMENT_SIZE <= 60,
  `PLACEMENT_SIZE=${PLACEMENT_SIZE}; di bawah 12 soal tidak cukup bukti untuk enam band CEFR`);

// m025-165: baris skoring kini juga mengadopsi hasil placement ke levelTrust (kontrak owner:
// placement adalah bukti), jadi setelah placementDone boleh ada pernyataan lanjutan di blok
// yang sama. Yang diekstrak tetap HANYA pernyataan skoringnya sendiri.
const scoringMatch = app.match(/if\(cfg\.placement\)\{(state\.level=accuracy[^;]+;)state\.placementDone=true[;}]/);
check('Placement scoring statement is extractable', !!scoringMatch,
  scoringMatch ? scoringMatch[1] : 'pola inline di finish quizLoop() berubah — perbarui regex, jangan lemahkan');

const placementLevelSource = sourceBlock('placementLevel');
check('placementLevel() is extractable', /function\s+placementLevel\s*\(/.test(placementLevelSource),
  placementLevelSource ? 'sourceBlock placementLevel ditemukan' : 'helper placementLevel() hilang dari app.js');

const bandLevelSource = sourceBlock('placementBandLevel');
const bandTallySource = sourceBlock('placementBandTally');
const bandPassMatch = app.match(/const\s+PLACEMENT_BAND_PASS\s*=\s*([0-9.]+)/);
const bandMinMatch = app.match(/const\s+PLACEMENT_BAND_MIN_EVIDENCE\s*=\s*(\d+)/);
check('Evidence ladder (placementBandLevel/placementBandTally + thresholds) is extractable',
  /function\s+placementBandLevel\s*\(/.test(bandLevelSource) && /function\s+placementBandTally\s*\(/.test(bandTallySource) && !!bandPassMatch && !!bandMinMatch,
  `bandLevel=${!!bandLevelSource} bandTally=${!!bandTallySource} pass=${bandPassMatch ? bandPassMatch[1] : 'MISSING'} minEvidence=${bandMinMatch ? bandMinMatch[1] : 'MISSING'}`);

// Kalau extraction gagal, sisa test tidak bisa dijalankan secara bermakna. Tetap tulis report
// dan tetap exit 1 — jangan berpura-pura hijau.
if (!scoringMatch || !placementLevelSource || !PLACEMENT_SIZE) {
  const report = { schema: 'fiezel-placement-accuracy-v1', generatedAt: new Date().toISOString(), pass: false, aborted: 'extraction failed', checks };
  fs.writeFileSync(path.join(root, 'PLACEMENT-ACCURACY-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  // process.exit() dan bukan `return`: berkas ini juga harus lolos `node --check` sebagai script
  // biasa (step Syntax di quality.yml), dan return di tingkat atas ilegal di sana.
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Runner hermetis
// ---------------------------------------------------------------------------
/** Menjalankan pernyataan skoring apa adanya atas satu nilai akurasi. */
const scoringFn = new Function('state', 'accuracy', scoringMatch[1] + 'state.placementDone=true;');
function levelForAccuracy(accuracy) {
  const state = {};
  scoringFn(state, accuracy);
  return state;
}
/** placementLevel() dijalankan tanpa `state` global — hanya LEVELS yang dibutuhkannya. */
const placementLevel = vm.runInNewContext(`${placementLevelSource}\nplacementLevel`, { LEVELS, state: null }, { timeout: 1000 });
function levelNameForAccuracy(accuracy) { return placementLevel({ level: levelForAccuracy(accuracy).level }); }

/** Tangga bukti per band dijalankan hermetis dengan konstanta hasil extract. */
const ladder = vm.runInNewContext(
  `${bandTallySource}\n${bandLevelSource}\n({tally:placementBandTally,level:placementBandLevel})`,
  { LEVELS, PLACEMENT_BAND_PASS: bandPassMatch ? Number(bandPassMatch[1]) : 1, PLACEMENT_BAND_MIN_EVIDENCE: bandMinMatch ? Number(bandMinMatch[1]) : 99 },
  { timeout: 1000 }
);

// Blueprint band diambil dari app.js supaya simulasi memakai komposisi soal yang SEBENARNYA.
const blueprintMatch = app.match(/const\s+PLACEMENT_BLUEPRINT\s*=\s*(\{[^;]+\})/);
const blueprint = blueprintMatch ? vm.runInNewContext(`(${blueprintMatch[1]})`, {}, { timeout: 1000 }) : null;
check('PLACEMENT_BLUEPRINT is extractable', !!blueprint, blueprintMatch ? 'blueprint band terbaca' : 'const PLACEMENT_BLUEPRINT tidak ditemukan');
const bandSizes = {};
let blueprintTotal = 0;
for (const level of LEVELS) {
  const slot = blueprint && blueprint[level] ? blueprint[level] : {};
  bandSizes[level] = Object.values(slot).reduce((sum, n) => sum + (Number(n) || 0), 0);
  blueprintTotal += bandSizes[level];
}
check('Blueprint band sizes add up to PLACEMENT_SIZE', blueprintTotal === PLACEMENT_SIZE,
  `blueprint=${blueprintTotal} vs PLACEMENT_SIZE=${PLACEMENT_SIZE}; band ${JSON.stringify(bandSizes)}`);

/** Menirukan pipeline penuh: jawaban per band -> tangga bukti + plafon akurasi -> nama level. */
function levelForAnswers(answers) {
  const bands = ladder.tally(answers);
  const bandLevel = ladder.level(bands);
  const correct = answers.filter(a => a.ok).length;
  const accuracy = Math.round(correct / Math.max(1, answers.length) * 100);
  const state = { placementBandLevel: bandLevel };
  scoringFn(state, accuracy);
  return { level: placementLevel({ level: state.level }), bands, bandLevel, accuracy, correct };
}
/** Satu peserta simulasi: peluang benar ditentukan per band. */
function simulate(rand, probForBand) {
  const answers = [];
  for (const level of LEVELS) for (let i = 0; i < bandSizes[level]; i++) answers.push({ level, ok: rand() < probForBand(level) });
  return answers;
}

// ---------------------------------------------------------------------------
// 3. P1–P5 — kontrak dari desain-test-baru.md §1
// ---------------------------------------------------------------------------

// P1. Selalu-salah harus mendarat A1. Tidak ada tafsir lain yang jujur untuk 0 dari 25.
const zero = levelForAccuracy(0);
check('P1 always-wrong lands on A1 and marks the test done',
  placementLevel({ level: zero.level }) === 'A1' && zero.placementDone === true,
  `level=${zero.level} (${placementLevel({ level: zero.level })}), placementDone=${zero.placementDone}`);

// P2. Sempurna harus mencapai band teratas (C1 atau C2). Tes yang tidak bisa memberi nilai
// tertinggi kepada jawaban sempurna adalah tes yang menghukum penguasaan.
const perfectName = levelNameForAccuracy(100);
check('P2 perfect score reaches C1 or above', LEVELS.indexOf(perfectName) >= 4, `accuracy 100 -> ${perfectName}`);

// P3. Tebakan acak murni. p=0,25 karena setiap soal punya 4 opsi.
//
// Statistiknya, dengan n=25 dan p=0,25 (mean 6,25, sd 2,17): mencapai di atas A2 lewat plafon
// akurasi menuntut sekitar 15 dari 25 benar (P ~ 3e-5 per trial), sementara tangga bukti
// menuntut LULUS band A1 (4 dari 6, P ~ 3,8%) DAN A2 (4 dari 5, P ~ 1,6%) lebih dulu -
// sekitar 0,06% bila digabung. Dua jaring itu harus tembus bersamaan. Batas 1% dari 1000 trial
// karena itu memberi margin sangat lebar, dan B2+ (butuh ~18 dari 25 benar DAN lulus tiga band)
// aman diasumsikan nol. Seed tetap membuat angka-angka ini identik di setiap run.
const rand = mulberry32(SEED);
const distribution = Object.fromEntries(LEVELS.map(l => [l, 0]));
const randomLevels = [];
for (let trial = 0; trial < RANDOM_TRIALS; trial++) {
  const result = levelForAnswers(simulate(rand, () => GUESS_P));
  distribution[result.level]++;
  randomLevels.push(LEVELS.indexOf(result.level));
}
const aboveA2 = randomLevels.filter(i => i > 1).length;
const atB2OrAbove = randomLevels.filter(i => i >= 3).length;
const sortedLevels = randomLevels.slice().sort((a, b) => a - b);
const medianLevel = LEVELS[sortedLevels[Math.floor(sortedLevels.length / 2)]];
check('P3a pure guessing exceeds A2 in at most 1% of trials', aboveA2 <= RANDOM_TRIALS * 0.01,
  `${aboveA2}/${RANDOM_TRIALS} trial (${(aboveA2 / RANDOM_TRIALS * 100).toFixed(2)}%) di atas A2; distribusi ${JSON.stringify(distribution)}`);
check('P3b pure guessing never reaches B2 or above', atB2OrAbove === 0, `${atB2OrAbove}/${RANDOM_TRIALS} trial mencapai B2+`);
check('P3c median outcome of pure guessing is A1', medianLevel === 'A1', `median=${medianLevel}`);

// P4. Monotonik. Akurasi yang lebih tinggi tidak boleh pernah menghasilkan level lebih rendah,
// dan levelnya harus selalu integer 1..6 (placementLevel() mengindeks LEVELS dengannya).
let previous = 0;
const monotonicIssues = [];
for (let accuracy = 0; accuracy <= 100; accuracy++) {
  const level = levelForAccuracy(accuracy).level;
  if (!Number.isInteger(level) || level < 1 || level > LEVELS.length) monotonicIssues.push(`accuracy ${accuracy} -> level ${level} bukan integer 1..${LEVELS.length}`);
  if (level < previous) monotonicIssues.push(`accuracy ${accuracy} turun dari level ${previous} ke ${level}`);
  previous = level;
}
check('P4 accuracy->level mapping is monotonic and integer-bounded', monotonicIssues.length === 0,
  monotonicIssues.length ? monotonicIssues.slice(0, 6).join('; ') : 'naik monoton 0..100, selalu integer dalam rentang LEVELS');

// P5. Batas bawah aman: state rusak/kosong tidak boleh melempar atau menghasilkan level hantu.
const lowerBounds = [0, NaN, -3, undefined, null, 'abc'].map(level => {
  try { return { level, name: placementLevel({ level }) }; } catch (e) { return { level, name: `THREW:${e.message}` }; }
});
check('P5 placementLevel() clamps broken level values to A1', lowerBounds.every(r => r.name === 'A1'),
  lowerBounds.map(r => `${String(r.level)}->${r.name}`).join(', '));

// ---------------------------------------------------------------------------
// 4. Kontrak tambahan: pemula realistis, dan gerbang integritas jalur placement
// ---------------------------------------------------------------------------

// Alasan utama perbaikan ini ada: pemula yang HANYA benar di soal A1/A2 (dan menebak sisanya)
// harus mendarat A1 atau A2. Rumus lama memetakannya ke B1 pada 60,8% run (recon §c).
const beginnerRand = mulberry32(SEED ^ 0x5A5A);
const beginnerDistribution = Object.fromEntries(LEVELS.map(l => [l, 0]));
for (let trial = 0; trial < RANDOM_TRIALS; trial++) {
  const answers = simulate(beginnerRand, level => (level === 'A1' || level === 'A2' ? 0.95 : GUESS_P));
  beginnerDistribution[levelForAnswers(answers).level]++;
}
const beginnerMisplaced = LEVELS.slice(2).reduce((sum, l) => sum + beginnerDistribution[l], 0);
check('Realistic beginner (only A1/A2 correct) lands on A1 or A2 in at least 95% of trials',
  beginnerMisplaced <= RANDOM_TRIALS * 0.05,
  `${beginnerMisplaced}/${RANDOM_TRIALS} trial mendarat di atas A2; distribusi ${JSON.stringify(beginnerDistribution)}`);

// Murid yang benar sampai B1 harus bisa mencapai B1 - tangga bukti tidak boleh mengunci semua
// orang di A1. Gerbang ini yang menjaga koreksi tebakan tidak berubah jadi hukuman buta.
const solidRand = mulberry32(SEED ^ 0x1234);
const solidDistribution = Object.fromEntries(LEVELS.map(l => [l, 0]));
for (let trial = 0; trial < RANDOM_TRIALS; trial++) {
  const answers = simulate(solidRand, level => (LEVELS.indexOf(level) <= 2 ? 0.95 : GUESS_P));
  solidDistribution[levelForAnswers(answers).level]++;
}
check('Learner solid through B1 is placed at B1 in the majority of trials', solidDistribution.B1 >= RANDOM_TRIALS * 0.5,
  `distribusi ${JSON.stringify(solidDistribution)}`);

// Tangga harus berhenti di band pertama yang gagal, bukan meloncatinya.
const gapAnswers = [];
for (const level of LEVELS) for (let i = 0; i < bandSizes[level]; i++) gapAnswers.push({ level, ok: level !== 'A2' });
const gapResult = levelForAnswers(gapAnswers);
check('Evidence ladder stops at the first failed band (A1 pass, A2 fail => A1)', gapResult.level === 'A1',
  `benar semua kecuali A2 -> ${gapResult.level} (bandLevel=${gapResult.bandLevel}, accuracy=${gapResult.accuracy})`);

// Placement tidak boleh disudahi lewat exit-dini "breathe": level yang ditulis dari 7 soal
// pertama adalah level yang dihitung dari potongan tes termudah.
const breatheMatch = app.match(/if\(answer\.breathe&&![A-Za-z_$][\w$]*(&&[^)]*)?\)/);
check('Breathe early-exit is disabled for placement', !!breatheMatch && /!cfg\.placement/.test(breatheMatch[0]),
  breatheMatch ? breatheMatch[0] : 'tawaran breathe tidak ditemukan di app.js');

// Urutan soal placement harus berjenjang deterministik, bukan hasil pilihan adaptif
// targetSuccess 0,8 (yang menyodorkan soal termudah lebih dulu ke murid ability rendah).
check('Placement question order is graded, not adaptive',
  /if\(cfg\.placement\)questions=questions\.sort\(/.test(app) && /cfg\.placement\|\|cfg\.preserveOrder\)\?remaining\[0\]/.test(app),
  'placement harus mengurutkan soal per difficulty dan mengambil remaining[0], bukan tutorPick()');

// Layar hasil harus MENYEBUT level akhirnya, bukan hanya persentase.
const finishSource = sourceBlock('finishQuiz');
check('Result screen names the final CEFR level', /placementLevelName/.test(finishSource) && /placementLevel\(\)/.test(finishSource),
  finishSource ? 'finishQuiz menghitung dan menampilkan nama level placement' : 'finishQuiz tidak ditemukan');

// ---------------------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------------------
const report = {
  schema: 'fiezel-placement-accuracy-v1',
  generatedAt: new Date().toISOString(),
  pass: !failed,
  config: {
    placementSize: PLACEMENT_SIZE,
    bandSizes,
    guessProbability: GUESS_P,
    randomTrials: RANDOM_TRIALS,
    seed: `0x${SEED.toString(16).toUpperCase()}`,
    bandPass: bandPassMatch ? Number(bandPassMatch[1]) : null,
    bandMinEvidence: bandMinMatch ? Number(bandMinMatch[1]) : null
  },
  randomGuessing: { distribution, aboveA2, atB2OrAbove, median: medianLevel },
  realisticBeginner: { distribution: beginnerDistribution, misplacedAboveA2: beginnerMisplaced },
  solidThroughB1: { distribution: solidDistribution },
  accuracySweep: Object.fromEntries([0, 20, 35, 44, 45, 50, 59, 60, 71, 72, 81, 82, 91, 92, 100].map(a => [a, levelNameForAccuracy(a)])),
  checks
};
fs.writeFileSync(path.join(root, 'PLACEMENT-ACCURACY-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
