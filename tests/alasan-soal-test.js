#!/usr/bin/env node
'use strict';
/**
 * tests/alasan-soal-test.js — gerbang Alasan Soal + rekap keputusan Fiezel (m025-577).
 *
 * Alasan Soal adalah SATU baris di atas soal sesi adaptif yang mengucapkan kenapa soal itu
 * dipilih ("Waktunya diulang: terakhir kamu latih 5 hari lalu."), plus rekap di layar hasil
 * ("Yang Fiezel atur untukmu"). Kalimat seperti itu hanya bernilai kalau sebabnya NYATA, jadi
 * gerbang ini menjaga lima hal:
 *   A. KEPUTUSAN — tiap jenis lahir dari cabang yang benar-benar memilih soal itu, dan diam saat
 *      buktinya tidak ada (jadwal belum jatuh tempo, waktu tak terbaca, sasaran cuma nama ranah).
 *   B. DUA DIAM YANG DISENGAJA — probe retensi tidak pernah diberi label (murid yang tahu sedang
 *      diukur mengubah perilakunya), dan jebakan lama tidak pernah diumumkan SEBELUM menjawab
 *      (peringatan mencemari bukti buku besar miskonsepsi; Stempel Ingatan yang bicara sesudahnya).
 *   C. GERBANG MODE — hanya sesi 'adaptive'; mati di mode ukur, ujian, kunci ujian, bendera mati.
 *   D. REKAP — hanya soal yang benar-benar dijawab, prediksi butuh >= 5 soal, paling banyak 3 baris.
 *   E. NASKAH & KABEL — dua bahasa lewat FiezelI18n asli; dihitung sebelum olmProbeConsume;
 *      dirender di kedua posisi stem; rekap di luar lipatan; CSS kontras di gelembung gelap.
 */
const __fzRoot = require('path').join(__dirname, '..');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = rel => fs.readFileSync(path.join(__fzRoot, rel), 'utf8').replace(/\r\n/g, '\n');
const APP = read('app.js');
const I18N = require('../features/i18n/fiezel-i18n.js');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (error) { fail++; console.error('FAIL - ' + name + '\n    ' + error.message); }
}

for (const rel of ['features/i18n/copy-id-redesign.js', 'features/i18n/copy-th-redesign.js']) {
  const ctx = { self: { FiezelI18n: I18N }, FiezelI18n: I18N };
  vm.createContext(ctx);
  vm.runInContext(read(rel), ctx, { filename: rel });
}

const START = APP.indexOf('/* ---- ALASAN SOAL + REKAP KEPUTUSAN');
const END = APP.indexOf('function quizLoop(cfg){', START);
assert.ok(START > 0 && END > START, 'blok Alasan Soal tidak ditemukan di app.js');
const BLOCK = APP.slice(START, END);

const TZ = 'Asia/Jakarta';
const dayKey = ts => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
const DAY = 86400000;
// Rabu 7 Okt 2026 pukul 08.00 WIB.
const NOW = Date.parse('2026-10-07T01:00:00Z');

const NAMES = { be_subject_agreement: 'Subjek dan to be', articles_a_an_the: 'Artikel a, an, dan the', vocab: 'Vocab', reading: 'Membaca' };

function sandbox(opts = {}) {
  const st = opts.state || { vocab: {}, grammar: {}, reading: {}, history: [] };
  const ctx = {
    self: {},
    FiezelI18n: I18N,
    Intl,
    state: st,
    studyDayKey: ts => dayKey(ts),
    examLockActive: () => !!opts.examLock,
    uxOn: flag => flag === 'alasanSoal' ? opts.flag !== false : false,
    quizConcept: q => String(q?.lessonSkill || q?.conceptId || q?.skill || q?.type || ''),
    olmNegotiationRead: () => opts.neg || null,
    retentionProbeDueLessons: () => new Set(opts.probeDue || []),
    retentionFragileLessons: () => new Set(opts.fragile || []),
    friendlySkillName: s => NAMES[s] || s,
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    Date: Object.assign(function () { return new Date(...arguments); }, { now: () => NOW, parse: Date.parse, UTC: Date.UTC })
  };
  ctx.Date.prototype = Date.prototype;
  vm.createContext(ctx);
  vm.runInContext(BLOCK, ctx, { filename: 'app.js#alasan-soal' });
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));
const vocabQ = (id = 'vocab_1') => ({ type: 'vocab', target: id, skill: 'vocab', options: ['a', 'b'], answerIndex: 0 });
const grammarQ = (skill = 'be_subject_agreement') => ({ type: 'grammar', lessonSkill: skill, skill, options: ['is', 'are'], answerIndex: 1 });
const due = (daysAgo, extra = {}) => Object.assign({ total: 3, correct: 2, mastery: 50, nextReview: NOW - 3600e3, lastSeen: NOW - daysAgo * DAY }, extra);

// =====================================================================================
// A. KEPUTUSAN
// =====================================================================================
test('A1 jatuh tempo -> "lupa" dengan selisih HARI BELAJAR, bukan jam', () => {
  const sb = sandbox();
  assert.deepStrictEqual(plain(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5) })), { kind: 'lupa', hari: 5 });
  // 23.00 WIB kemarin = 9 jam lalu, tetapi hari belajarnya kemarin.
  const kemarin23 = Date.parse('2026-10-06T16:00:00Z');
  assert.deepStrictEqual(plain(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(0, { lastSeen: kemarin23 }) })), { kind: 'lupa', hari: 1 });
  assert.deepStrictEqual(plain(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(0, { lastSeen: NOW - 3600e3 }) })), { kind: 'lupa', hari: 0 });
});

test('A2 belum jatuh tempo / belum pernah dilatih / waktu tak terbaca -> diam, tidak dikarang', () => {
  const sb = sandbox();
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5, { nextReview: NOW + DAY }) }), null);
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5, { total: 0 }) }), null);
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5, { nextReview: 0 }) }), null);
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5, { lastSeen: 0 }) }), null);
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: due(5, { lastSeen: NOW + DAY }) }), null, 'masa depan');
  assert.strictEqual(sb.alasanSoalDecide(vocabQ(), { now: NOW, bucket: null }), null);
});

test('A3 urutan sebab: ukur-ulang > produksi > lupa > fokus', () => {
  const sb = sandbox();
  const ctx = { now: NOW, bucket: due(3), fokusSkill: 'be_subject_agreement', fokusNama: 'Subjek dan to be' };
  assert.strictEqual(sb.alasanSoalDecide(grammarQ(), Object.assign({}, ctx, { probeHit: true })).kind, 'ukur-ulang');
  assert.strictEqual(sb.alasanSoalDecide({ type: 'cloze', skill: 'be_subject_agreement' }, ctx).kind, 'produksi');
  assert.strictEqual(sb.alasanSoalDecide(grammarQ(), ctx).kind, 'lupa', 'jadwal ingatan lebih kuat sebabnya daripada fokus');
  assert.deepStrictEqual(plain(sb.alasanSoalDecide(grammarQ(), Object.assign({}, ctx, { bucket: null }))), { kind: 'fokus', materi: 'Subjek dan to be' });
});

test('A4 fokus: aturan cocok sama dengan skor +14 buildAdaptivePool, tanpa skill kosong yang cocok ke segalanya', () => {
  const sb = sandbox();
  assert.ok(sb.alasanSoalCocokFokus(grammarQ('be_subject_agreement'), 'be_subject_agreement'));
  assert.ok(sb.alasanSoalCocokFokus(grammarQ('be_subject_agreement_negative'), 'be_subject_agreement'), 'includes seperti kolam');
  assert.ok(!sb.alasanSoalCocokFokus({ type: 'grammar', skill: '' }, 'be_subject_agreement'), "''.includes = true untuk semua string");
  assert.ok(!sb.alasanSoalCocokFokus(grammarQ('articles_a_an_the'), 'be_subject_agreement'));
  assert.ok(!sb.alasanSoalCocokFokus(grammarQ('be'), 'be_subject_agreement'), 'potongan pendek tidak dihitung cocok');
  assert.strictEqual(sb.alasanSoalDecide(grammarQ(), { now: NOW, fokusSkill: 'be_subject_agreement', fokusNama: '' }), null, 'tanpa nama terbaca: diam');
});

test('A5 jembatan: sasaran yang cuma nama RANAH atau id mentah bukan "fokus"', () => {
  const sb = sandbox();
  const q = { type: 'vocab', target: 'x', skill: 'vocab' };
  assert.strictEqual(sb.alasanSoalForQuestion(q, { policy: { targetSkill: 'vocab' } }, NOW), null, '"Fokus hari ini: Vocab" tidak mengatakan apa pun');
  assert.strictEqual(sb.alasanSoalForQuestion({ type: 'reading', target: 'r9', skill: 'reading_detail' }, { policy: { targetSkill: 'reading' } }, NOW), null, 'ranah bernama manusiawi ("Membaca") tetap bukan fokus lesson');
  assert.strictEqual(sb.alasanSoalForQuestion(grammarQ('present_raw_id'), { policy: { targetSkill: 'present_raw_id' } }, NOW), null, 'id mentah bukan nama');
  assert.deepStrictEqual(plain(sb.alasanSoalForQuestion(grammarQ(), { policy: { targetSkill: 'be_subject_agreement' } }, NOW)), { kind: 'fokus', materi: 'Subjek dan to be' });
});

test('A6 jembatan membaca ember ingatan dengan kunci yang SAMA dengan record()', () => {
  const st = { vocab: { vocab_9: due(4) }, grammar: { articles_a_an_the: due(2) }, reading: { r1: due(6) }, history: [] };
  const sb = sandbox({ state: st });
  assert.deepStrictEqual(plain(sb.alasanSoalForQuestion(vocabQ('vocab_9'), {}, NOW)), { kind: 'lupa', hari: 4 });
  assert.deepStrictEqual(plain(sb.alasanSoalForQuestion(grammarQ('articles_a_an_the'), {}, NOW)), { kind: 'lupa', hari: 2 });
  assert.deepStrictEqual(plain(sb.alasanSoalForQuestion({ type: 'reading', target: 'r1', skill: 'reading_detail' }, {}, NOW)), { kind: 'lupa', hari: 6 });
  assert.strictEqual(sb.alasanSoalForQuestion({ type: 'listening', target: 'vocab_9' }, {}, NOW), null, 'listening tidak punya ember ulangan di record()');
});

test('A7 probe sanggahan OLM terbaca dari antrean (remaining > 0) untuk konsep soal ini', () => {
  const neg = { probeQueue: [{ claimId: 'c1', skill: 'be_subject_agreement', remaining: 2 }, { claimId: 'c2', skill: 'articles_a_an_the', remaining: 0 }] };
  const sb = sandbox({ neg });
  assert.strictEqual(sb.alasanSoalForQuestion(grammarQ('be_subject_agreement'), {}, NOW).kind, 'ukur-ulang');
  assert.strictEqual(sb.alasanSoalForQuestion(grammarQ('articles_a_an_the'), {}, NOW), null, 'antrean habis = bukan probe lagi');
});

// =====================================================================================
// B. DUA DIAM YANG DISENGAJA
// =====================================================================================
test('B1 probe retensi (jatuh tempo maupun rapuh) TIDAK diberi label apa pun, juga bukan "lupa"/"fokus"', () => {
  for (const opts of [{ probeDue: ['be_subject_agreement'] }, { fragile: ['be_subject_agreement'] }]) {
    const st = { vocab: {}, grammar: { be_subject_agreement: due(9) }, reading: {}, history: [] };
    const sb = sandbox(Object.assign({ state: st }, opts));
    assert.strictEqual(sb.alasanSoalForQuestion(grammarQ(), { policy: { targetSkill: 'be_subject_agreement' } }, NOW), null, JSON.stringify(opts));
    for (const type of ['token-order', 'video-grammar', 'cloze']) {
      const q = { type, lessonSkill: 'be_subject_agreement', skill: 'be_subject_agreement' };
      assert.strictEqual(sb.alasanSoalForQuestion(q, { policy: { targetSkill: 'be_subject_agreement' } }, NOW), null, type + ' ' + JSON.stringify(opts));
    }
  }
});

test('B2 jebakan lama tidak pernah diumumkan sebelum menjawab: blok tidak membaca buku besar, naskah tidak punya kuncinya', () => {
  assert.ok(!/misconceptionLedger|FiezelMisconceptionLedger|ledger\./.test(BLOCK.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'kode blok tidak boleh membaca ledger');
  const src = read('features/i18n/copy-id-redesign.js') + read('features/i18n/copy-th-redesign.js');
  assert.ok(!/'alasan\.(jebakan|trap|retensi|ingatan)/.test(src), 'tidak ada kunci alasan untuk jebakan/retensi');
  const kinds = new Set([...BLOCK.matchAll(/kind:'([a-z-]+)'/g)].map(m => m[1]));
  assert.deepStrictEqual([...kinds].sort(), ['fokus', 'lupa', 'produksi', 'ukur-ulang']);
});

// =====================================================================================
// C. GERBANG MODE
// =====================================================================================
test('C1 hanya sesi adaptif, dan mati di setiap mode ukur / ujian / bendera mati', () => {
  const sb = sandbox();
  assert.strictEqual(sb.alasanSoalAllowed({ type: 'adaptive' }, false), true);
  for (const [cfg, measure, why] of [
    [{ type: 'adaptive' }, true, 'MEASURE'],
    [{ type: 'adaptive', placement: true }, false, 'placement'],
    [{ type: 'adaptive', noHints: true }, false, 'noHints'],
    [{ type: 'adaptive', examKind: 'reading' }, false, 'examKind'],
    [{ type: 'level' }, false, 'latihan level: soal jatuh tempo muncul karena acak'],
    [{ type: 'grammar' }, false, 'lesson grammar'],
    [{ type: 'vocab' }, false, 'review kosakata'],
    [{ type: 'level-exam' }, false, 'ujian'],
    [{ type: 'placement' }, false, 'placement'],
    [null, false, 'tanpa cfg']
  ]) assert.strictEqual(sb.alasanSoalAllowed(cfg, measure), false, why);
  assert.strictEqual(sandbox({ examLock: true }).alasanSoalAllowed({ type: 'adaptive' }, false), false, 'kunci ujian aktif');
  assert.strictEqual(sandbox({ flag: false }).alasanSoalAllowed({ type: 'adaptive' }, false), false, 'bendera mati');
});

test('C2 serve: fokus hanya SEKALI per sesi, semua soal tersaji masuk log, gerbang mati = tanpa jejak', () => {
  const sb = sandbox();
  const cfg = { type: 'adaptive', policy: { targetSkill: 'be_subject_agreement' } };
  const q1 = grammarQ(), q2 = grammarQ(), q3 = vocabQ();
  sb.alasanSoalServe(q1, cfg, false);
  sb.alasanSoalServe(q2, cfg, false);
  sb.alasanSoalServe(q3, cfg, false);
  assert.strictEqual(q1.__alasanShow, true);
  assert.strictEqual(q2.__alasan.kind, 'fokus', 'tetap tercatat untuk rekap');
  assert.strictEqual(q2.__alasanShow, false, 'kalimat yang sama tidak diulang');
  assert.strictEqual(q3.__alasan, null);
  assert.strictEqual(cfg.__alasanLog.length, 3, 'soal tanpa alasan juga dicatat (rekap prediksi butuh semua)');
  const ukur = { type: 'level-exam' }, q4 = grammarQ();
  q4.__alasan = { kind: 'basi' }; q4.__alasanShow = true;
  sb.alasanSoalServe(q4, ukur, true);
  assert.strictEqual(q4.__alasan, null, 'sisa sesi lain dibersihkan');
  assert.strictEqual(q4.__alasanShow, false);
  assert.strictEqual(ukur.__alasanLog, undefined);
});

test('C3 tag: gerbang ditanya ulang saat render, teks di-escape, tanpa <span> (kontras gelembung gelap)', () => {
  I18N.setLocale('id');
  const sb = sandbox();
  const cfg = { type: 'adaptive' };
  const q = vocabQ();
  q.__alasan = { kind: 'lupa', hari: 5 }; q.__alasanShow = true;
  const html = sb.alasanSoalTag(q, cfg, false);
  assert.match(html, /^<p class="quiz-alasan" data-testid="quiz-alasan" data-alasan="lupa" title="Kenapa soal ini muncul"><i class="fz-i" data-fz-icon="paw" aria-hidden="true"><\/i>Waktunya diulang: terakhir kamu latih 5 hari lalu\.<\/p>$/, html);
  assert.ok(!/<span/.test(html), 'span di dalam .card p terkunci abu oleh mobile-edge-fit.css');
  assert.strictEqual(sb.alasanSoalTag(q, cfg, true), '', 'MEASURE saat render');
  assert.strictEqual(sb.alasanSoalTag(q, { type: 'grammar' }, false), '');
  assert.strictEqual(sb.alasanSoalTag(Object.assign({}, q, { reviewOf: 'x' }), cfg, false), '', 'tag ulangan lesson sudah bicara');
  assert.strictEqual(sb.alasanSoalTag(Object.assign({}, q, { __alasanShow: false }), cfg, false), '');
  const jahat = grammarQ(); jahat.__alasan = { kind: 'fokus', materi: '<img src=x onerror=alert(1)>' }; jahat.__alasanShow = true;
  assert.ok(!/<img/.test(sb.alasanSoalTag(jahat, cfg, false)), 'nama materi di-escape');
});

// =====================================================================================
// D. REKAP
// =====================================================================================
function sesi(rows) {
  // rows: [{kind, materi?, p?, ok?, answered?}]
  const log = [], history = [];
  rows.forEach((r, i) => {
    const q = { __alasan: r.kind ? { kind: r.kind, materi: r.materi } : null, __predicted: r.p === undefined ? null : r.p };
    if (r.answered !== false) { q.__attemptId = 'a' + i; history.push({ attemptId: 'a' + i, ok: !!r.ok }); }
    log.push(q);
  });
  return { log, history };
}

test('D1 hanya soal yang BENAR-BENAR dijawab dihitung; satu attemptId dihitung sekali', () => {
  const sb = sandbox();
  const { log, history } = sesi([{ kind: 'lupa' }, { kind: 'lupa', answered: false }, { kind: 'fokus', materi: 'Artikel' }, {}]);
  log.push(log[0]);
  const m = plain(sb.alasanRekapModel(log, history));
  assert.deepStrictEqual(m.counts, { lupa: 1, fokus: 1 });
  assert.strictEqual(m.fokusNama, 'Artikel');
  assert.strictEqual(m.prediksi, null);
});

test('D2 perkiraan butuh >= 5 soal berprediksi; arah atas / pas / bawah dari percobaan pertama', () => {
  const sb = sandbox();
  const empat = sesi([0.8, 0.8, 0.8, 0.8].map(p => ({ p, ok: true })));
  assert.strictEqual(sb.alasanRekapModel(empat.log, empat.history), null, 'empat angka bukan perkiraan');
  const lima = (oks) => { const s = sesi([0.7, 0.7, 0.7, 0.7, 0.7].map((p, i) => ({ p, ok: oks[i] }))); return plain(sb.alasanRekapModel(s.log, s.history)).prediksi; };
  assert.deepStrictEqual(lima([1, 1, 1, 1, 1]), { perkiraan: 4, total: 5, skor: 5, arah: 'atas' });
  assert.deepStrictEqual(lima([1, 1, 1, 1, 0]), { perkiraan: 4, total: 5, skor: 4, arah: 'pas' });
  assert.deepStrictEqual(lima([1, 0, 1, 0, 0]), { perkiraan: 4, total: 5, skor: 2, arah: 'bawah' });
  const rusak = sesi([0.7, 0.7, 2, NaN, null, 0.7, 0.7, 0.7].map(p => ({ p, ok: true })));
  assert.strictEqual(plain(sb.alasanRekapModel(rusak.log, rusak.history)).prediksi.total, 5, 'prediksi di luar 0..1 / NaN / null tidak dihitung');
});

test('D3 baris: paling banyak dua "yang diatur" (urutan sebab) + satu perkiraan', () => {
  I18N.setLocale('id');
  const sb = sandbox();
  const lines = sb.alasanRekapLines({ counts: { 'ukur-ulang': 1, produksi: 2, fokus: 3, lupa: 4 }, fokusNama: 'Artikel a, an, dan the', prediksi: { perkiraan: 7, total: 10, skor: 8, arah: 'atas' } });
  assert.deepStrictEqual(Array.from(lines), [
    '4 soal diulang sesuai jadwal ingatanmu',
    '3 soal fokus pada Artikel a, an, dan the',
    'Perkiraan Fiezel: sekitar 7 dari 10 soal benar di percobaan pertama. Kamu 8, di atas perkiraan.'
  ]);
  assert.deepStrictEqual(Array.from(sb.alasanRekapLines(null)), []);
  assert.deepStrictEqual(Array.from(sb.alasanRekapLines({ counts: { fokus: 2 }, fokusNama: '' })), [], 'fokus tanpa nama tidak ditulis');
});

test('D4 markup rekap: gerbang mode, kosong saat tidak ada baris', () => {
  I18N.setLocale('id');
  const s = sesi([{ kind: 'lupa', p: 0.6, ok: true }, { kind: 'lupa', p: 0.6 }, { p: 0.6, ok: true }, { p: 0.6 }, { p: 0.6, ok: true }]);
  const sb = sandbox({ state: { vocab: {}, grammar: {}, reading: {}, history: s.history } });
  const html = sb.alasanRekapMarkup({ type: 'adaptive', __alasanLog: s.log });
  assert.match(html, /^<section class="result-alasan" data-testid="result-alasan" aria-label="Ringkasan keputusan Fiezel di sesi ini"><b class="result-alasan-head">/);
  assert.match(html, /<li>2 soal diulang sesuai jadwal ingatanmu<\/li><li>Perkiraan Fiezel: sekitar 3 dari 5 soal benar di percobaan pertama\. Kamu 3, tepat sesuai perkiraan\.<\/li><\/ul><\/section>$/);
  assert.strictEqual(sb.alasanRekapMarkup({ type: 'level', __alasanLog: s.log }), '');
  assert.strictEqual(sb.alasanRekapMarkup({ type: 'adaptive', __alasanLog: [] }), '');
});

// =====================================================================================
// E. NASKAH & KABEL
// =====================================================================================
test('E1 naskah dua bahasa untuk setiap jenis: tanpa placeholder bocor, th ber-aksara Thai', () => {
  const sb = sandbox();
  const contoh = [{ kind: 'lupa', hari: 5 }, { kind: 'lupa', hari: 1 }, { kind: 'lupa', hari: 0 }, { kind: 'fokus', materi: 'Artikel' }, { kind: 'produksi' }, { kind: 'ukur-ulang' }];
  for (const loc of ['id', 'th']) {
    I18N.setLocale(loc);
    try {
      const semua = contoh.map(a => sb.alasanSoalText(a));
      semua.push(...sb.alasanRekapLines({ counts: { lupa: 2, fokus: 2, produksi: 1, 'ukur-ulang': 1 }, fokusNama: 'Artikel', prediksi: null }));
      for (const arah of ['atas', 'pas', 'bawah']) semua.push(...sb.alasanRekapLines({ counts: {}, prediksi: { perkiraan: 7, total: 10, skor: 6, arah } }));
      for (const t of semua) {
        assert.ok(t && !/[{}]/.test(t), loc + ' placeholder bocor / kosong: ' + t);
        if (loc === 'th') assert.ok(/[฀-๿]/.test(t), 'harus ber-aksara Thai: ' + t);
      }
      assert.strictEqual(new Set(semua.slice(0, 3)).size, 3, loc + ': hari ini / kemarin / N hari = tiga kalimat');
    } finally { I18N.setLocale('id'); }
  }
  assert.strictEqual(sb.alasanSoalText(null), '');
  assert.strictEqual(sb.alasanSoalText({ kind: 'jebakan' }), '', 'jenis tak dikenal: diam');
  assert.strictEqual(sb.alasanSoalText({ kind: 'fokus' }), '', 'fokus tanpa nama: diam');
});

test('E2 persona "Fiezel", tanpa istilah mesin, tanpa persentase, tanpa tanda pisah', () => {
  const src = read('features/i18n/copy-id-redesign.js') + read('features/i18n/copy-th-redesign.js');
  const nilai = [...src.matchAll(/'(?:alasan|rekap)\.[a-z-]+':\s*'([^']*)'/g)].map(m => m[1]);
  assert.strictEqual(nilai.length, 32, '16 kunci x 2 bahasa, ketemu ' + nilai.length);
  for (const v of nilai) {
    assert.ok(!/\bpaw\b/i.test(v), 'persona harus Fiezel: ' + v);
    assert.ok(!/[—–%]/.test(v), 'tanpa tanda pisah / persen: ' + v);
    assert.ok(!/BKT|FSRS|IRT|ledger|algoritma|probabilitas|braincore|\bAI\b/i.test(v), 'istilah mesin: ' + v);
  }
});

test('E3 kabel draw(): alasan dihitung SETELAH soal dipilih dan SEBELUM olmProbeConsume', () => {
  const pick = APP.indexOf("q=(cfg.placement||cfg.preserveOrder)?remaining[0]:(tutorPick(");
  const serve = APP.indexOf('try{alasanSoalServe(q,cfg,MEASURE)}catch{}', pick);
  const consume = APP.indexOf('if(!cfg.placement)try{olmProbeConsume(q)}catch{}', pick);
  assert.ok(pick > 0 && serve > pick && consume > serve, 'urutan pick -> serve -> consume');
  assert.strictEqual((APP.match(/alasanSoalServe\(/g) || []).length, 2, 'satu definisi + satu pemanggil');
});

test('E4 tag dirender di KEDUA posisi stem (gelembung Pau dan kartu biasa)', () => {
  assert.strictEqual((APP.match(/\$\{quizReviewTag\(q\)\}\$\{alasanSoalTag\(q,cfg,MEASURE\)\}<h2 class="question" id="quizStem">/g) || []).length, 2);
});

test('E5 rekap di layar hasil berada DI LUAR lipatan Detail, hanya hasil ringkas', () => {
  assert.match(APP, /const alasanRekap=compactResult\?alasanRekapMarkup\(cfg\):'';\n\s*const detailsMarkup=\(compactResult\?summaryPeek\+alasanRekap:''\)\+/);
});

test('E6 CSS: label tenang 12px, kontras terang di gelembung gelap, teks rekap tidak memakai --muted pucat', () => {
  const style = read('style.css');
  const base = /\.quiz-alasan\{([^}]*)\}/.exec(style);
  assert.ok(base && /font-size:12px/.test(base[1]) && !/animation|transition/.test(base[1]), 'aturan dasar .quiz-alasan');
  assert.match(style, /html body #app \.quiz-bubble p\.quiz-alasan\{color:#CBD5E1 !important;-webkit-text-fill-color:#CBD5E1 !important\}/);
  assert.match(style, /html body #app \.result-alasan li\{color:#4B5563 !important\}/);
  assert.match(style, /:lang\(th\) \.quiz-alasan\{font-size:13px/);
});

test('E7 bendera alasanSoal terdaftar di sumber dan salinan app.js', () => {
  const flags = require('../fiezel-ux-flags.js');
  assert.strictEqual(flags.DEFAULTS.alasanSoal, true);
  assert.match(APP, /const UX_FALLBACK_FLAGS=\{[^}]*alasanSoal:true[^}]*\}/);
  assert.match(BLOCK, /return uxOn\('alasanSoal'\);/);
});

console.log('\nAlasan Soal: ' + pass + '/' + (pass + fail) + ' PASS');
if (fail) process.exit(1);
