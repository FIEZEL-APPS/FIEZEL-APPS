/**
 * FIEZEL gerbang — LOCAL-FIRST (Fase 2 / Phase L).
 *
 * KLAIMNYA: Braincore tetap bekerja tanpa internet, tanpa server, tanpa telemetri, dan saat
 * kuota AI habis. Telemetri TIDAK PERNAH boleh menjadi syarat untuk belajar.
 *
 * KENAPA GERBANG INI MENJALANKAN, BUKAN MEMBACA. Membuktikannya dengan grep — "tidak ada kata
 * fetch di features/brain/" — adalah pembuktian yang sama lemahnya dengan uji manifest berongga
 * dari Fase A: ia menguji teks, bukan perilaku. Ketergantungan jaringan bisa masuk lewat modul
 * lain, lewat global yang diasumsikan ada, atau lewat sesuatu yang cuma meledak saat dipanggil.
 *
 * Karena itu §2 memuat modul Braincore ke dalam sandbox VM yang SAMA SEKALI TIDAK PUNYA
 * jaringan, storage, DOM, maupun jam — bukan yang dimatikan, melainkan yang tidak pernah ada —
 * lalu menjalankan satu sesi belajar penuh di dalamnya. Kalau ada satu saja sentuhan jaringan,
 * ia melempar ReferenceError dan gerbang ini merah dengan menyebut namanya.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const BRAIN_DIR = path.join(__dirname, 'features', 'brain');
const BRAIN_FILES = fs.readdirSync(BRAIN_DIR).filter((f) => f.endsWith('.js')).sort();

/* ========================================================================================
 * §1 — TRIPWIRE TEKS (cepat, dan sengaja BUKAN bukti utama)
 * ===================================================================================== */
test('§1 tidak satu pun modul Braincore menyebut API jaringan atau penyimpanan', () => {
  const tersangka = [];
  for (const f of BRAIN_FILES) {
    const src = fs.readFileSync(path.join(BRAIN_DIR, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const t of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'navigator.',
                     'localStorage', 'sessionStorage', 'indexedDB', 'document.']) {
      if (src.indexOf(t) !== -1) tersangka.push(f + ' -> ' + t);
    }
  }
  assert.deepStrictEqual(tersangka, [], 'modul Braincore menyentuh dunia luar: ' + tersangka.join(', '));
});

/* ========================================================================================
 * §2 — BUKTI DENGAN MENJALANKAN: satu sesi belajar penuh di dunia tanpa jaringan
 *
 * Sandbox di bawah TIDAK memuat fetch, XMLHttpRequest, navigator, localStorage, document,
 * WebSocket, maupun Date.now. Bukan dimatikan — tidak ada. Menyentuhnya = ReferenceError.
 * ===================================================================================== */
function duniaTanpaJaringan() {
  const sandbox = {
    module: { exports: {} }, exports: {},
    console: { log() {}, warn() {}, error() {} },
    Math: Math, JSON: JSON, Object: Object, Array: Array, String: String,
    Number: Number, Boolean: Boolean, Error: Error, isFinite: isFinite,
    isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, RegExp: RegExp
    // TIDAK ADA: fetch, XMLHttpRequest, WebSocket, navigator, localStorage,
    // sessionStorage, indexedDB, document, window, Date, setTimeout, process.
  };
  sandbox.globalThis = sandbox;
  return vm.createContext(sandbox);
}

/** Muat satu modul UMD Braincore ke dalam konteks tanpa-jaringan dan kembalikan ekspornya. */
function muatDiSandbox(ctx, file) {
  const src = fs.readFileSync(path.join(BRAIN_DIR, file), 'utf8');
  ctx.module = { exports: {} };
  ctx.exports = ctx.module.exports;
  vm.runInContext(src, ctx, { filename: file });
  return ctx.module.exports;
}

test('§2 SETIAP modul Braincore bisa dimuat di dunia tanpa jaringan, storage, DOM, dan jam', () => {
  const ctx = duniaTanpaJaringan();
  const gagal = [];
  for (const f of BRAIN_FILES) {
    try { muatDiSandbox(ctx, f); }
    catch (e) { gagal.push(f + ': ' + (e && e.message ? e.message : String(e))); }
  }
  assert.deepStrictEqual(gagal, [],
    'modul ini menuntut sesuatu dari dunia luar hanya untuk DIMUAT: ' + gagal.join(' | '));
});

test('§2 satu sesi belajar penuh MENGHASILKAN KEPUTUSAN di dunia tanpa jaringan', () => {
  const ctx = duniaTanpaJaringan();
  const BKT = muatDiSandbox(ctx, 'fiezel-mastery-bkt.js');
  const Cred = muatDiSandbox(ctx, 'fiezel-evidence-credibility.js');
  const Tutor = muatDiSandbox(ctx, 'fiezel-tutor-brain.js');
  const Core = muatDiSandbox(ctx, 'fiezel-core-brain.js');
  const Prior = muatDiSandbox(ctx, 'fiezel-item-prior.js');

  let bkt = { schema: BKT.SCHEMA, lessons: {} };
  const sesi = Tutor.createSession({ now: 0, baselineMs: 0 });
  const keputusan = [];
  for (let i = 0; i < 10; i++) {
    const benar = i % 3 !== 0;
    // Waktu DISUNTIKKAN — tidak ada jam di dunia ini, dan itu memang syaratnya.
    const now = (i + 1) * 60000;
    const w = Cred.weigh({ timing: 7000, learnerLevel: 'A2' });
    bkt = BKT.update(bkt, { lesson: 'past-simple', correct: benar, weight: w.kappa }, now);
    const d = Tutor.record(sesi, { correct: benar, skill: 'past-simple', concept: 'past-simple', ms: 7000, now: now });
    const m = Tutor.decideMove(sesi, d, { remaining: 10 - i, mastery: BKT.mastery(bkt, 'past-simple').L });
    keputusan.push(m.move);
  }
  assert.strictEqual(keputusan.length, 10, 'sesi tidak selesai di dunia tanpa jaringan');
  assert.ok(keputusan.every((k) => typeof k === 'string' && k.length > 0),
    'ada keputusan kosong: ' + JSON.stringify(keputusan));
  assert.ok(new Set(keputusan).size > 1,
    'seluruh keputusan sama — mesin berjalan tetapi tidak lagi membeda-bedakan');
  assert.ok(BKT.mastery(bkt, 'past-simple').n === 10,
    'keadaan murid tidak terakumulasi tanpa jaringan');
  assert.ok(isFinite(Prior.difficultyFor({ level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40 })),
    'prior kesulitan tidak terhitung tanpa jaringan');
  assert.ok(isFinite(Core.successProbability(2, 3)), 'model inti tidak berhitung tanpa jaringan');
});

/* ========================================================================================
 * §3 — TELEMETRI BUKAN SYARAT BELAJAR
 * ===================================================================================== */
test('§3 skema bukti tidak punya jalur kirim, jadi ia tidak bisa menjadi syarat apa pun', () => {
  const src = fs.readFileSync(path.join(BRAIN_DIR, 'fiezel-braincore-evidence.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const t of ['fetch', 'sendBeacon', 'WebSocket', 'upload', 'queue', 'flush', 'http']) {
    assert.ok(src.toLowerCase().indexOf(t.toLowerCase()) === -1,
      'modul bukti menyebut "' + t + '" — ia mulai bisa menuntut jaringan');
  }
});

test('§3 jalur belajar inti TIDAK menyentuh kuota AI', () => {
  // Kuota adalah milik asisten AI (aiTask/Cloudflare), bukan milik kuis. Kalau nama kuota
  // muncul di fungsi yang mencatat jawaban atau memutuskan soal berikutnya, belajar bisa
  // berhenti hanya karena kuota habis — dan itulah yang dilarang fase ini.
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const inti = ['function bktRecord', 'function tutorObserve', 'function itemCalibrationObserve',
                'function affectObserve'];
  for (const nama of inti) {
    const i = app.indexOf(nama);
    if (i === -1) continue;                       // fungsi berganti nama: §4 yang menangkapnya
    const badan = app.slice(i, i + 1400);
    assert.ok(!/quota/i.test(badan),
      nama + ' menyebut kuota — jalur belajar mulai bergantung pada kuota AI');
  }
});

test('§4 titik sambung yang dirujuk gerbang ini masih ada di app.js', () => {
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  for (const nama of ['function bktRecord', 'function tutorObserve', 'function itemCalibrationObserve']) {
    assert.ok(app.indexOf(nama) !== -1,
      nama + ' tidak ada lagi di app.js — §3 diam-diam berhenti memeriksa apa pun');
  }
});

test('§4 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-local-first-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

console.log('     ' + BRAIN_FILES.length + ' modul Braincore diuji di dunia tanpa jaringan/storage/DOM/jam');
console.log(failures === 0 ? 'BraincoreLocalFirst: PASS' : 'BraincoreLocalFirst: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
