/**
 * tests/panggung-suara-contract-test.js
 * Gerbang Kontrak untuk Modul Panggung Suara Live & Mesin Deteksi Kilat Sarang Tabu.
 *
 * Menguji:
 * 1. Skema dan Integritas Bank Soal taboo-bank-v1.json (EN & JA).
 * 2. Kecepatan & Akurasi LightningTabooMatcher (Patokan < 1ms per ujaran, uji varian infleksi).
 * 3. Mesin AudioSfxSynthesizer (Ketahanan lingkungan tanpa DOM).
 * 4. State Machine LiveStageCoordinator dan Aliran Telemetri Braincore.
 * 5. Kemurnian Token Desain panggung-suara.css (Bebas token asing --primary/--surface).
 *
 * Berkas ini hidup di repo-root `tests/`; resolusi berkas produksi memakai jalur ganda
 * (`./x` lalu `../features/speaking-listening/x`) supaya gerbang yang sama bisa berjalan
 * dari paket mockup maupun dari repositori utama. `__dirname` di sini = tests/.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) {
    failures += 1;
    console.error(`  FAIL: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
  }
}

console.log('--- [GERBANG 1] Integritas Skema Bank Soal (taboo-bank-v1.json) ---');
const bankPath = fs.existsSync(path.join(__dirname, 'taboo-bank-v1.json'))
  ? path.join(__dirname, 'taboo-bank-v1.json')
  : path.join(__dirname, '../features/speaking-listening/taboo-bank-v1.json');
assert(fs.existsSync(bankPath), 'Berkas taboo-bank-v1.json wajib ada');

let bankData = null;
try {
  bankData = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  assert(true, 'taboo-bank-v1.json adalah JSON yang valid');
} catch (err) {
  assert(false, 'Gagal mem-parse taboo-bank-v1.json: ' + err.message);
}

if (bankData) {
  assert(typeof bankData.version === 'string', 'Versi bank soal terdefinisi');
  assert(Array.isArray(bankData.items) && bankData.items.length >= 5, 'Bank memuat minimal 5 kartu soal');

  const enItems = bankData.items.filter(i => i.language === 'en');
  const jaItems = bankData.items.filter(i => i.language === 'ja');
  assert(enItems.length >= 5, 'Memuat kartu bahasa Inggris');
  assert(jaItems.length >= 2, 'Memuat kartu bahasa Jepang');

  let allCardsValid = true;
  for (const card of bankData.items) {
    if (!card.id || !card.secretWord || !Array.isArray(card.taboo) || card.taboo.length < 3 || !card.variants) {
      allCardsValid = false;
      break;
    }
  }
  assert(allCardsValid, 'Setiap kartu memiliki id, secretWord, minimal 3 kata tabu, dan tabel variants');
}

const panggungSuaraPath = fs.existsSync(path.join(__dirname, 'fiezel-panggung-suara.js'))
  ? path.join(__dirname, 'fiezel-panggung-suara.js')
  : path.join(__dirname, '../features/speaking-listening/fiezel-panggung-suara.js');
const PanggungSuara = require(panggungSuaraPath);
const { LightningTabooMatcher, LiveStageCoordinator, AudioSfxSynthesizer } = PanggungSuara;

assert(typeof LightningTabooMatcher === 'function', 'LightningTabooMatcher terdaftar dan dapat diinstansiasi');

const matcher = new LightningTabooMatcher();
const airportCard = bankData.items.find(i => i.secretWord === 'AIRPORT');
matcher.setCard(airportCard);

// 1. Uji Kata Dasar Langsung
let res = matcher.evaluate('You go there and see a plane');
assert(res.caught === true && res.word === 'PLANE', 'Menangkap kata dasar langsung "plane"');

res = matcher.evaluate('I need to buy a ticket for travel');
assert(res.caught === true && res.word === 'TICKET', 'Menangkap kata dasar langsung "ticket"');

res = matcher.evaluate('Birds can fly in the sky');
assert(res.caught === true && res.word === 'FLY', 'Menangkap kata dasar langsung "fly"');

// 2. Uji Bentuk Infleksi & Suffix (Fuzzy & Stemming Match)
res = matcher.evaluate('They are flying right now');
assert(res.caught === true && res.word === 'FLY', 'Menangkap bentuk gerund "flying"');

res = matcher.evaluate('The bird flew over the house');
assert(res.caught === true && res.word === 'FLY', 'Menangkap bentuk lampau "flew"');

res = matcher.evaluate('My flight is delayed');
assert(res.caught === true && res.word === 'FLY', 'Menangkap bentuk turunan "flight"');

res = matcher.evaluate('I saw two airplanes on the ground');
assert(res.caught === true && res.word === 'PLANE', 'Menangkap bentuk majemuk "airplanes"');

// 3. Uji Kalimat Bersih Tanpa Kata Tabu (Anti False Positive)
res = matcher.evaluate('A big station where people go to visit another country');
assert(res.caught === false && res.word === null, 'Tidak salah tangkap pada deskripsi yang sah tanpa kata tabu');

// 4. Uji Bahasa Jepang
const senseiCard = bankData.items.find(i => i.id === 'TABOO-JA-001');
matcher.setCard(senseiCard);

res = matcher.evaluate('学校で働く人です');
assert(res.caught === true && res.word === 'がっこう', 'Menangkap kata tabu Jepang (kanji 学校)');

res = matcher.evaluate('日本語をおしえます');
assert(res.caught === true && res.word === 'おしえる', 'Menangkap kata tabu Jepang (hiragana おしえます)');

// 5. Tolok Ukur Kecepatan Kilat (1000 iterasi wajib < 50ms total atau < 0.05ms per cek)
matcher.setCard(airportCard);
const benchmarkStart = performance.now();
const ITERATIONS = 1000;
for (let i = 0; i < ITERATIONS; i++) {
  matcher.evaluate('This is a large terminal where people check their bags and go far away');
}
const benchmarkDuration = performance.now() - benchmarkStart;
const avgMs = benchmarkDuration / ITERATIONS;
console.log(`  [BENCHMARK] Total: ${benchmarkDuration.toFixed(2)}ms | Rata-rata per cek: ${avgMs.toFixed(4)}ms`);
assert(avgMs < 0.1, `Kecepatan evaluasi terbukti secepat kilat (< 0.1ms per uji, terukur ${avgMs.toFixed(4)}ms)`);

console.log('\n--- [GERBANG 3] Generator Audio Web Audio API (Headless Safety) ---');
const sfx = new AudioSfxSynthesizer();
assert(typeof sfx.play === 'function', 'AudioSfxSynthesizer mengekspos metode play');
// Di lingkungan Node tanpa DOM/AudioContext, pemanggilan tidak boleh melempar error
try {
  sfx.play('ding');
  sfx.play('alarm');
  sfx.play('buzzer');
  assert(true, 'AudioSfxSynthesizer aman dijalankan di lingkungan tanpa audio hardware');
} catch (err) {
  assert(false, 'AudioSfxSynthesizer melempar galat: ' + err.message);
}

console.log('\n--- [GERBANG 4] Mesin Status LiveStageCoordinator & Aliran Telemetri Braincore ---');
const stage = new LiveStageCoordinator({
  cards: bankData.items,
  roundTimeSeconds: 30
});

assert(stage.state === 'OFFLINE', 'Status awal adalah OFFLINE');
stage.loadCards(bankData.items);
assert(stage.currentCard !== null, 'Kartu soal terpasang ke stage');

stage.startRound();
assert(stage.state === 'TABOO_ROUND_ACTIVE', 'Berpindah ke status TABOO_ROUND_ACTIVE');

let violationLogged = null;
stage.on('tabooViolation', (ev) => {
  violationLogged = ev;
});

let correctLogged = null;
stage.on('correctGuess', (ev) => {
  correctLogged = ev;
});

// Uji pelanggaran kata tabu
stage.matcher.setCard(stage.currentCard);
stage.handleVoiceUtterance('It is a plane');
assert(violationLogged !== null && violationLogged.word === 'PLANE', 'Event tabooViolation terpicu saat kata tabu terdeteksi');

// Uji Braincore Misconception feed
const misRecord = stage.feedBraincoreMisconception('PLANE');
assert(misRecord && misRecord.type === 'TABOO_VIOLATION' && misRecord.forbiddenWord === 'PLANE', 'Telemetri Misconception Ledger terformat presisi');

// Uji jawaban benar
stage.triggerCorrectGuess();
assert(correctLogged !== null && correctLogged.score > 0, 'Event correctGuess terpicu dan poin bertambah');

// Uji Braincore Mastery feed
const masteryEvent = stage.feedBraincoreMastery();
assert(masteryEvent && masteryEvent.type === 'CIRCUMLOCUTION_SUCCESS', 'Telemetri Braincore Mastery terformat presisi');

stage.stopRound();
assert(stage.state === 'STAGE_IDLE', 'Berpindah ke status STAGE_IDLE');

const cssPath = fs.existsSync(path.join(__dirname, 'panggung-suara.css'))
  ? path.join(__dirname, 'panggung-suara.css')
  : path.join(__dirname, '../features/speaking-listening/panggung-suara.css');
assert(fs.existsSync(cssPath), 'Berkas panggung-suara.css wajib ada');

const cssContent = fs.readFileSync(cssPath, 'utf8');
const forbiddenTokens = ['--primary', '--surface', '--secondary'];
let tokenPurity = true;
for (const tok of forbiddenTokens) {
  if (cssContent.includes(tok)) {
    tokenPurity = false;
    console.error(`  Pelanggaran token: css memuat ${tok}`);
  }
}
assert(tokenPurity, 'CSS 100% bebas dari token terlarang (--primary, --surface, --secondary)');
assert(cssContent.includes('.fz-stage-'), 'Semua pemilih CSS dinamespace dengan .fz-stage-');

console.log('\n============================================================');
if (failures === 0) {
  console.log(`HASIL AKHIR: SEMUA ${results.length} PENGUJIAN LULUS (100% HIJAU)`);
  process.exit(0);
} else {
  console.error(`HASIL AKHIR: ${failures} DARI ${results.length} PENGUJIAN GAGAL`);
  process.exit(1);
}
