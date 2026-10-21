#!/usr/bin/env node
'use strict';
/**
 * tests/memory-stamp-test.js — gerbang Stempel Ingatan (m025-565).
 *
 * Stempel Ingatan adalah SATU baris di kotak umpan balik latihan mandiri yang mengucapkan apa
 * yang sudah lama diingat buku besar miskonsepsi: "jebakan ini sudah 3 kali menangkapmu,
 * pertama kali hari Senin". Kalimat seperti itu hanya bernilai kalau BENAR, jadi gerbang ini
 * menjaga empat hal:
 *   A. KEPUTUSAN — setiap jenis stempel lahir dari bukti ledger asli (modul sungguhan, bukan
 *      objek karangan), dan diam saat bukti tidak cukup: tebakan, salah tanpa nama, pengecoh
 *      yang tidak tampil, pujian yang sudah diucapkan di sesi ini.
 *   B. GERBANG MODE — tidak pernah muncul di mode ukur, set ujian, tugas guru, atau saat
 *      benderanya mati.
 *   C. NASKAH — dua bahasa lewat FiezelI18n asli, persona "Fiezel", tanpa placeholder bocor.
 *   D. KABEL & TAMPILAN — dihitung dari percobaan pertama, dirender sesudah cabang MEASURE,
 *      satu baris meta tanpa ikon/animasi, CSS 12px netral.
 */
const __fzRoot = require('path').join(__dirname, '..');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = rel => fs.readFileSync(path.join(__fzRoot, rel), 'utf8').replace(/\r\n/g, '\n');
const APP = read('app.js');
const L = require('../features/brain/fiezel-misconception-ledger.js');
const T = require('../features/brain/fiezel-tutor-brain.js');
const I18N = require('../features/i18n/fiezel-i18n.js');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (error) { fail++; console.error('FAIL - ' + name + '\n    ' + error.message); }
}

// ---- naskah asli, dua bahasa --------------------------------------------------------------
for (const rel of ['features/i18n/copy-id-redesign.js', 'features/i18n/copy-th-redesign.js']) {
  // Sebagian berkas copy membaca `self.FiezelI18n`, sebagian global `FiezelI18n` telanjang.
  const ctx = { self: { FiezelI18n: I18N }, FiezelI18n: I18N };
  vm.createContext(ctx);
  vm.runInContext(read(rel), ctx, { filename: rel });
}

// ---- blok app.js yang diuji, dijalankan di sandbox ----------------------------------------
const START = APP.indexOf('function memoryStampAllowed(');
const END = APP.indexOf('/* ---- Fase 2 (B3): kredibilitas bukti', START);
assert.ok(START > 0 && END > START, 'blok Stempel Ingatan tidak ditemukan di app.js');
const BLOCK = APP.slice(START, END);

const TZ = 'Asia/Jakarta';
const dayKey = ts => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);

function sandbox(opts = {}) {
  const store = { ledger: opts.ledger === undefined ? null : opts.ledger };
  const ctx = {
    self: { FiezelMisconceptionLedger: L },
    FiezelI18n: I18N,
    Intl,
    studyDayKey: ts => dayKey(ts),
    studyTimeZone: () => TZ,
    examLockActive: () => !!opts.examLock,
    uxOn: flag => flag === 'memoryStamp' ? opts.flag !== false : false,
    misconceptionLedgerAvailable: () => true,
    misconceptionLedgerRead: () => store.ledger,
    quizConcept: q => String(q?.lessonSkill || q?.conceptId || q?.skill || q?.type || ''),
    __store: store
  };
  vm.createContext(ctx);
  vm.runInContext(BLOCK, ctx, { filename: 'app.js#memory-stamp' });
  return ctx;
}

const DAY = 86400000;
// Rabu 7 Okt 2026 pukul 19.00 WIB — hari dipilih supaya nama hari bisa diasersikan.
const NOW = Date.parse('2026-10-07T12:00:00Z');
const CONCEPT = 'present_simple_vs_continuous';
const TRAP = 'progressive overuse with stative verb';

/** Satu bukti masuk ledger lewat modul ASLI, persis bentuk misconceptionLedgerRecord. */
function catat(ledger, { correct, misconception = TRAP, timing = 'reasoned', sessionId, at }) {
  return L.update(ledger, { concept: CONCEPT, family: 'tense_aspect', misconception: correct ? '' : misconception, correct, timing, sessionId: String(sessionId) }, at);
}
function ev(extra) {
  return Object.assign({ concept: CONCEPT, misconception: TRAP, precision: 'misconception', correct: false, timing: 'reasoned', sessionId: '',
    picked: 'am knowing', shownOptions: [{ text: 'am knowing', name: TRAP }], celebrated: [] }, extra);
}
function putuskan(sb, before, after, e, now) {
  return sb.memoryStampDecide(L, before, after, e, now);
}

// =====================================================================================
// A. KEPUTUSAN
// =====================================================================================
test('A1 salah pertama kali pada jebakan bernama -> "pertama"', () => {
  const sb = sandbox();
  const s1 = NOW - 2 * DAY;
  const after = catat(null, { correct: false, sessionId: s1, at: s1 + 60000 });
  const out = putuskan(sb, null, after, ev({ sessionId: String(s1) }), s1 + 60000);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(out)), { kind: 'pertama', kali: 1, pilihan: 'am knowing' });
});

test('A1b salah tanpa teks pilihan (mis. susun kata) tidak distempel: stempel wajib bisa menyebut pilihannya', () => {
  const sb = sandbox();
  const after = catat(null, { correct: false, sessionId: NOW, at: NOW });
  assert.strictEqual(putuskan(sb, null, after, ev({ picked: '' }), NOW), null);
  assert.strictEqual(putuskan(sb, null, after, ev({ picked: '   ' }), NOW), null);
});

test('A2 berulang di sesi yang sama -> "sesi-ini" dengan hitungan ledger', () => {
  const sb = sandbox();
  const s1 = NOW;
  let led = catat(null, { correct: false, sessionId: s1, at: s1 + 1000 });
  const before = led;
  led = catat(led, { correct: false, sessionId: s1, at: s1 + 90000 });
  const out = putuskan(sb, before, led, ev({ sessionId: String(s1) }), s1 + 90000);
  assert.strictEqual(out.kind, 'sesi-ini');
  assert.strictEqual(out.kali, 2);
});

test('A3 kembali di sesi lain -> "lagi" dengan waktu sesi PERTAMA dan jumlah sesi', () => {
  const sb = sandbox();
  const s1 = NOW - 2 * DAY, s2 = NOW - DAY, s3 = NOW;
  let led = catat(null, { correct: false, sessionId: s1, at: s1 + 1000 });
  led = catat(led, { correct: false, sessionId: s2, at: s2 + 1000 });
  const before = led;
  led = catat(led, { correct: false, sessionId: s3, at: s3 + 1000 });
  const out = putuskan(sb, before, led, ev({ sessionId: String(s3) }), s3 + 1000);
  assert.strictEqual(out.kind, 'lagi');
  assert.strictEqual(out.kali, 3);
  assert.strictEqual(out.sesi, 3);
  assert.strictEqual(out.firstMs, s1, 'tanggal pertama = awal sesi paling tua yang tercatat');
});

test('A4 id sesi yang bukan waktu masuk akal tidak dikarang jadi tanggal', () => {
  const sb = sandbox();
  let led = catat(null, { correct: false, sessionId: 'rusak', at: NOW - DAY });
  led = catat(led, { correct: false, sessionId: NOW + 5 * DAY, at: NOW - 1000 }); // dari masa depan
  const after = catat(led, { correct: false, sessionId: NOW, at: NOW });
  const out = putuskan(sb, led, after, ev({ sessionId: String(NOW) }), NOW);
  assert.strictEqual(out.kind, 'lagi');
  assert.strictEqual(out.firstMs, null);
});

test('A5 tebakan (<1,8 dtk) tidak pernah distempel, salah maupun benar', () => {
  const sb = sandbox();
  let led = catat(null, { correct: false, sessionId: NOW - DAY, at: NOW - DAY });
  led = catat(led, { correct: false, sessionId: NOW - DAY, at: NOW - DAY + 1 });
  const salah = catat(led, { correct: false, timing: 'guess', sessionId: NOW, at: NOW });
  assert.strictEqual(putuskan(sb, led, salah, ev({ timing: 'guess', sessionId: String(NOW) }), NOW), null);
  const benar = catat(led, { correct: true, sessionId: NOW, at: NOW });
  assert.strictEqual(putuskan(sb, led, benar, ev({ correct: true, timing: 'guess', sessionId: String(NOW) }), NOW), null);
});

test('A6 salah tanpa nama (unclassified / presisi skill) tidak disebut "jebakan yang sama"', () => {
  const sb = sandbox();
  const name = 'unclassified:grammar';
  let led = L.update(null, { concept: CONCEPT, misconception: name, correct: false, sessionId: '1', timing: 'reasoned' }, NOW - DAY);
  const after = L.update(led, { concept: CONCEPT, misconception: name, correct: false, sessionId: '2', timing: 'reasoned' }, NOW);
  assert.strictEqual(putuskan(sb, led, after, ev({ misconception: name, precision: 'skill' }), NOW), null);
  assert.strictEqual(putuskan(sb, led, after, ev({ misconception: name, precision: 'misconception' }), NOW), null);
  const bernama = catat(null, { correct: false, sessionId: NOW, at: NOW });
  assert.strictEqual(putuskan(sb, null, bernama, ev({ precision: 'item' }), NOW), null, 'presisi item belum menamai jebakan');
});

test('A7 benar padahal pengecoh jebakan (>=2 kali) tampil -> "lolos", sekali per sesi', () => {
  const sb = sandbox();
  let led = catat(null, { correct: false, sessionId: NOW - 3 * DAY, at: NOW - 3 * DAY });
  led = catat(led, { correct: false, sessionId: NOW - 2 * DAY, at: NOW - 2 * DAY });
  const after = catat(led, { correct: true, sessionId: NOW, at: NOW });
  const celebrated = [];
  const out = putuskan(sb, led, after, ev({ correct: true, sessionId: String(NOW), celebrated }), NOW);
  assert.strictEqual(out.kind, 'lolos');
  assert.strictEqual(out.kali, 2);
  assert.strictEqual(out.pilihan, 'am knowing', 'lolos menyebut pengecoh yang tampil, bukan jawaban benar');
  assert.ok(out.trap.endsWith('::' + TRAP));
  const lagi = putuskan(sb, after, catat(after, { correct: true, sessionId: NOW, at: NOW + 1 }), ev({ correct: true, sessionId: String(NOW), celebrated: [out.trap] }), NOW + 1);
  assert.strictEqual(lagi, null, 'pujian yang sama tidak diulang dalam satu sesi');
});

test('A8 "lolos" diam bila pengecohnya tidak tampil atau jebakannya baru sekali', () => {
  const sb = sandbox();
  let led = catat(null, { correct: false, sessionId: NOW - 3 * DAY, at: NOW - 3 * DAY });
  led = catat(led, { correct: false, sessionId: NOW - 2 * DAY, at: NOW - 2 * DAY });
  const after = catat(led, { correct: true, sessionId: NOW, at: NOW });
  assert.strictEqual(putuskan(sb, led, after, ev({ correct: true, shownOptions: [{ text: 'knew', name: 'pengecoh lain' }] }), NOW), null);
  const sekali = catat(null, { correct: false, sessionId: NOW - DAY, at: NOW - DAY });
  assert.strictEqual(putuskan(sb, sekali, catat(sekali, { correct: true, sessionId: NOW, at: NOW }), ev({ correct: true }), NOW), null);
});

test('A9 "jinak" muncul TEPAT sekali, pada jawaban yang membuat jebakan aktif turun ke <=0.3', () => {
  const sb = sandbox();
  // Jadikan aktif sungguhan: 3 bukti dari 2 sesi, belief >= 0.7 (gerbang modul sendiri).
  let led = catat(null, { correct: false, sessionId: NOW - 10 * DAY, at: NOW - 10 * DAY });
  led = catat(led, { correct: false, sessionId: NOW - 9 * DAY, at: NOW - 9 * DAY });
  led = catat(led, { correct: false, sessionId: NOW - 9 * DAY, at: NOW - 9 * DAY + 1 });
  assert.strictEqual(L.active(led, NOW - 9 * DAY + 2).length, 1, 'prasyarat: jebakan aktif');
  const kinds = [];
  let t = NOW;
  for (let i = 0; i < 12; i++) {
    const after = catat(led, { correct: true, sessionId: NOW, at: t });
    const out = putuskan(sb, led, after, ev({ correct: true, sessionId: String(NOW), celebrated: [] }), t);
    kinds.push(out ? out.kind : '-');
    led = after; t += 1000;
  }
  assert.strictEqual(kinds.filter(k => k === 'jinak').length, 1, 'urutan: ' + kinds.join(','));
  const at = kinds.indexOf('jinak');
  assert.ok(kinds.slice(0, at).every(k => k === 'lolos'), 'sebelum jinak: masih "lolos"');
  assert.ok(kinds.slice(at + 1).every(k => k === '-'), 'sesudah jinak: tidak ada pujian "lolos" lagi');
});

test('A10 ledger kosong/korup dan masukan rusak tidak pernah melempar', () => {
  const sb = sandbox();
  for (const bad of [null, undefined, 'x', 42, { entries: null }, { schema: 'asing', entries: {} }]) {
    assert.strictEqual(putuskan(sb, bad, bad, ev({}), NOW), null);
  }
  assert.strictEqual(sb.memoryStampDecide(null, null, catat(null, { correct: false, sessionId: 1, at: NOW }), ev({}), NOW), null);
  assert.strictEqual(putuskan(sb, null, catat(null, { correct: false, sessionId: 1, at: NOW }), ev({ concept: '' }), NOW), null);
});

test('A11 hanya pengecoh yang TAMPIL dan bukan kunci jawaban yang dihitung', () => {
  const sb = sandbox();
  const q = { options: ['am knowing', 'know', 'knew'], answerIndex: 1,
    optionMisconceptions: { 'am knowing': TRAP, know: 'tidak mungkin', knew: 'tense lampau', 'had known': 'tidak tampil' } };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(sb.memoryStampShownOptions(q))),
    [{ text: 'am knowing', name: TRAP }, { text: 'knew', name: 'tense lampau' }]);
  assert.deepStrictEqual(Array.from(sb.memoryStampShownOptions({ options: ['a'] })), []);
});

// =====================================================================================
// B. GERBANG MODE
// =====================================================================================
test('B1 latihan mandiri: stempel diizinkan', () => {
  const sb = sandbox();
  for (const cfg of [{ type: 'adaptive' }, { type: 'grammar' }, { type: 'quick' }, { type: 'reading' }]) {
    assert.strictEqual(sb.memoryStampAllowed(cfg, false), true, JSON.stringify(cfg));
  }
});

test('B2 mode ukur, set ujian, tugas guru, dan bendera mati: TIDAK PERNAH', () => {
  const sb = sandbox();
  const tolak = [
    [{ type: 'adaptive' }, true],                                  // MEASURE dari quizLoop
    [{ type: 'adaptive', placement: true }, false],
    [{ type: 'placement' }, false],
    [{ type: 'level-exam', noHints: true }, false],
    [{ type: 'level-exam' }, false],
    [{ type: 'grammar-skip', noHints: true }, false],
    [{ type: 'reading', examKind: 'reading_exam' }, false],
    [null, false]
  ];
  for (const [cfg, measure] of tolak) assert.strictEqual(sb.memoryStampAllowed(cfg, measure), false, JSON.stringify(cfg) + ' measure=' + measure);
  assert.strictEqual(sandbox({ examLock: true }).memoryStampAllowed({ type: 'adaptive' }, false), false, 'kunci ujian (termasuk tugas guru)');
  assert.strictEqual(sandbox({ flag: false }).memoryStampAllowed({ type: 'adaptive' }, false), false, 'bendera memoryStamp mati');
});

// =====================================================================================
// C. NASKAH
// =====================================================================================
function teks(sb, s, now) { return sb.memoryStampText(s, now); }

test('C1 naskah Indonesia untuk setiap jenis, tanpa placeholder bocor', () => {
  I18N.setLocale('id');
  const sb = sandbox();
  const P = 'am knowing';
  const rows = [
    [{ kind: 'pertama', kali: 1, pilihan: P }, /^Fiezel mencatat jebakan di balik “am knowing”\. Kalau muncul lagi, Fiezel akan ingat\.$/],
    [{ kind: 'sesi-ini', kali: 2, pilihan: P }, /^Jebakan di balik “am knowing” sudah 2 kali menangkapmu di sesi ini\.$/],
    [{ kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: NOW - DAY }, /^Ketemu lagi\. Jebakan di balik “am knowing” sudah 3 kali menangkapmu, pertama kali kemarin\.$/],
    [{ kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: NOW - 2 * DAY }, /pertama kali hari Senin\.$/],
    [{ kind: 'lagi', kali: 4, pilihan: P, sesi: 3, firstMs: Date.parse('2026-09-21T03:00:00Z') }, /pertama kali tanggal 21 Sep\.$/],
    [{ kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: NOW - 3600000 }, /pertama kali tadi, di sesi sebelumnya\.$/],
    [{ kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: null }, /sudah 3 kali menangkapmu, di 2 sesi berbeda\.$/],
    [{ kind: 'lolos', kali: 2, pilihan: P }, /^Jebakan di balik “am knowing” sudah 2 kali menangkapmu\. Kali ini kamu tidak terpancing\.$/],
    [{ kind: 'jinak', kali: 3 }, /^Menurut catatan Fiezel, jebakan yang dulu 3 kali menangkapmu di materi ini kini sudah jinak\.$/]
  ];
  for (const [s, re] of rows) {
    const out = teks(sb, s, NOW);
    assert.match(out, re, JSON.stringify(s) + ' -> ' + out);
    assert.ok(!/[{}]/.test(out), 'placeholder bocor: ' + out);
  }
  assert.strictEqual(teks(sb, null, NOW), '');
  assert.strictEqual(teks(sb, { kind: 'tak-dikenal', pilihan: P }, NOW), '');
  assert.strictEqual(teks(sb, { kind: 'pertama', kali: 1 }, NOW), '', 'tanpa pilihan: diam, bukan "jebakan di balik “”"');
  const panjang = teks(sb, { kind: 'pertama', kali: 1, pilihan: 'She has been   working here since she moved to Bandung last year' }, NOW);
  const kutip = /“([^”]*)”/.exec(panjang);
  assert.ok(kutip && kutip[1].length <= 40 && kutip[1].endsWith('\u2026') && kutip[1].startsWith('She has been working here'),
    'pilihan panjang dipotong (<=40 karakter, spasi dirapikan): ' + panjang);
});

test('C2 naskah Thai untuk setiap jenis: aksara Thai, nama hari/tanggal th-TH', () => {
  I18N.setLocale('th');
  try {
    const sb = sandbox();
    const P = 'am knowing';
    const kemarin = teks(sb, { kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: NOW - DAY }, NOW);
    assert.match(kemarin, /^เจออีกแล้ว กับดักเบื้องหลัง “am knowing” จับคุณได้ 3 ครั้งแล้ว ครั้งแรกคือเมื่อวานนี้$/, kemarin);
    const senin = teks(sb, { kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: NOW - 2 * DAY }, NOW);
    assert.match(senin, /ครั้งแรกคือวันจันทร์$/, senin);
    const tanggal = teks(sb, { kind: 'lagi', kali: 4, pilihan: P, sesi: 3, firstMs: Date.parse('2026-09-21T03:00:00Z') }, NOW);
    assert.match(tanggal, /ครั้งแรกคือวันที่ 21 ก\.ย\.$/, tanggal);
    for (const s of [{ kind: 'pertama', kali: 1, pilihan: P }, { kind: 'sesi-ini', kali: 2, pilihan: P }, { kind: 'lagi', kali: 3, pilihan: P, sesi: 2, firstMs: null }, { kind: 'lolos', kali: 2, pilihan: P }, { kind: 'jinak', kali: 3 }]) {
      const out = teks(sb, s, NOW);
      assert.ok(/[฀-๿]/.test(out), 'harus ber-aksara Thai: ' + out);
      assert.ok(!/[{}]/.test(out), 'placeholder bocor: ' + out);
      assert.ok(!/\b(jebakan|kali|sesi|kemarin)\b/i.test(out.replace(P, '')), 'sisa Indonesia: ' + out);
    }
  } finally { I18N.setLocale('id'); }
});

test('C3 persona "Fiezel" (bukan Paw), tanpa istilah mesin, tanpa tanda pisah', () => {
  const src = read('features/i18n/copy-id-redesign.js') + read('features/i18n/copy-th-redesign.js');
  const nilai = [...src.matchAll(/'stempel\.[a-z-]+':\s*'([^']*)'/g)].map(m => m[1]);
  assert.strictEqual(nilai.length, 20, '10 kunci x 2 bahasa, ketemu ' + nilai.length);
  for (const v of nilai) {
    assert.ok(!/\bpaw\b/i.test(v), 'persona harus Fiezel: ' + v);
    assert.ok(!/[—–]/.test(v), 'tanpa tanda pisah: ' + v);
    assert.ok(!/BKT|FSRS|ledger|algoritma|miskonsepsi|probabilitas|AI\b/i.test(v), 'istilah mesin: ' + v);
  }
  assert.ok(nilai.some(v => /Fiezel/.test(v)), 'persona Fiezel dipakai');
});

// =====================================================================================
// D. KABEL END-TO-END + TAMPILAN
// =====================================================================================
test('D1 ujung ke ujung dengan Tutor Brain asli: diagnosis -> ledger -> stempel', () => {
  I18N.setLocale('id');
  const sb = sandbox();
  const q = { type: 'grammar', lessonSkill: CONCEPT, options: ['am knowing', 'know', 'knew'], answerIndex: 1,
    optionMisconceptions: { 'am knowing': TRAP, knew: 'tense lampau' } };
  const cfg = { type: 'adaptive' };
  const jawab = (session, pick, at) => {
    const d = T.record(session, { correct: pick === 1, chosenOption: q.options[pick], optionMisconceptions: q.optionMisconceptions,
      skill: 'grammar', concept: CONCEPT, ms: 6000, now: at, scored: true });
    const before = sb.__store.ledger;
    sb.__store.ledger = L.update(before, { concept: CONCEPT, family: 'tense_aspect', misconception: String(d.misconception || ''),
      correct: pick === 1, timing: String(d.timing || ''), sessionId: String(session.startedAt) }, at);
    return sb.memoryStampForAnswer(before, q, d, pick === 1, session, cfg, pick);
  };
  const sesi1 = T.createSession({ now: NOW - 2 * DAY });
  assert.strictEqual(jawab(sesi1, 0, NOW - 2 * DAY + 5000).kind, 'pertama');
  const sesi2 = T.createSession({ now: NOW });
  const kedua = jawab(sesi2, 0, NOW + 5000);
  assert.strictEqual(kedua.kind, 'lagi');
  assert.strictEqual(sb.memoryStampText(kedua, NOW + 5000), 'Ketemu lagi. Jebakan di balik “am knowing” sudah 2 kali menangkapmu, pertama kali hari Senin.');
  const lolos = jawab(sesi2, 1, NOW + 60000);
  assert.strictEqual(lolos.kind, 'lolos');
  assert.strictEqual(lolos.pilihan, 'am knowing');
  assert.deepStrictEqual(Array.from(cfg.__memoryStampCelebrated), [lolos.trap], 'pujian dicatat per sesi di cfg');
  assert.strictEqual(jawab(sesi2, 1, NOW + 120000), null, 'tidak diulang di sesi yang sama');
});

test('D2 kabel quizLoop: dihitung di percobaan pertama, dari potret ledger SEBELUM tutorObserve', () => {
  assert.match(APP, /const stampOn=memoryStampAllowed\(cfg,MEASURE\),stampBefore=stampOn\?misconceptionLedgerRead\(\):null;\n\s*const decision=tutorObserve\(tutor,q,j,ok,ms,\{remaining:remaining\.length,scored:true\}\);\n\s*q\.__memoryStamp=stampOn\?memoryStampForAnswer\(stampBefore,q,decision\.diagnosis,ok,tutor,cfg,j\):null;/);
  assert.strictEqual((APP.match(/memoryStampForAnswer\(/g) || []).length, 2, 'satu definisi + satu pemanggil (percobaan pertama saja)');
});

test('D3 render: sesudah cabang MEASURE, tepat di bawah vonis, satu baris tanpa ikon', () => {
  const at = APP.indexOf('const stampHtml=');
  assert.ok(at > 0, 'stampHtml tidak ditemukan');
  const measureReturn = APP.lastIndexOf('if(MEASURE){', at);
  assert.ok(measureReturn > 0 && APP.slice(measureReturn, at).includes('return;'), 'cabang MEASURE harus kembali sebelum stempel dirakit');
  assert.ok(APP.slice(APP.lastIndexOf('\n', at - 200), at).includes('memoryStampAllowed(cfg,MEASURE)'), 'gerbang ditanya ulang saat render');
  assert.match(APP, /<b>\$\{verdictTitle\}<\/b><\/div>\$\{stampHtml\}<p>/, 'stempel duduk tepat di bawah judul vonis');
  const tpl = APP.slice(at, APP.indexOf('\n', at));
  assert.match(tpl, /<div class="feedback-stamp" data-testid="memory-stamp" data-stamp="\$\{esc\(q\.__memoryStamp\.kind\)\}">\$\{esc\(stampText\)\}<\/div>/);
  assert.ok(!/data-lucide|<svg|<i /.test(tpl), 'tanpa ikon');
});

test('D4 CSS: 12px, netral, tanpa animasi/transisi/latar/bar', () => {
  const style = read('style.css');
  const clay = read('features/ui/fiezel-tactile-clay.css');
  const base = /\.feedback-stamp\{([^}]*)\}/.exec(style);
  assert.ok(base, 'aturan dasar .feedback-stamp di style.css');
  assert.match(base[1], /font-size:12px/);
  assert.match(base[1], /color:var\(--muted\)/);
  const sheet = /#feedback \.feedback-stamp \{([^}]*)\}/.exec(clay);
  assert.ok(sheet, 'aturan #feedback .feedback-stamp di lembar tactile-clay (pemenang kaskade)');
  assert.match(sheet[1], /font-size: 12px !important/);
  assert.match(sheet[1], /color: #94A3B8 !important/);
  const semua = [style, clay].map(src => [...src.matchAll(/[^{}]*feedback-stamp[^{}]*\{([^}]*)\}/g)].map(m => m[1]).join('\n')).join('\n');
  assert.ok(!/animation|transition|background|border|box-shadow|transform/.test(semua), 'stempel harus tenang: ' + semua);
});

test('D5 bendera memoryStamp terdaftar di sumber dan salinan app.js', () => {
  const flags = require('../fiezel-ux-flags.js');
  assert.strictEqual(flags.DEFAULTS.memoryStamp, true);
  assert.match(APP, /const UX_FALLBACK_FLAGS=\{[^}]*memoryStamp:true[^}]*\}/);
  assert.match(APP, /return uxOn\('memoryStamp'\);/);
});

console.log('\nStempel Ingatan: ' + pass + '/' + (pass + fail) + ' PASS');
if (fail) process.exit(1);
