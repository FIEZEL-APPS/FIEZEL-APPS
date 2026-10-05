'use strict';
/**
 * Gerbang JALUR MEMBACA TKA (R3, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * T1  tiga keterampilan TKA terdaftar dengan rumusan tujuan; 16 soal tiap level
 * T2  TKA TIDAK masuk SKILL_ORDER: tes diagnostik tetap 5 soal, rencana harian tidak berubah
 * T3  setiap soal sah: 4 pilihan unik, kunci dalam rentang, penjelasan tidak menunjuk kunci,
 *     id lolos pola pengenal sinkron, teks bacaan tersedia
 * T4  kunci tersebar rata di A–D (soal ujian tidak boleh bisa ditebak dari posisi)
 * T5  soal evaluatif selalu menanyakan fakta/opini
 * T6  pickFresh untuk TKA hanya menghasilkan soal TKA (bukan soal past tense hasil template)
 * T7  sambungan: kartu & tombol murid, pilihan tugas guru, peta kesiapan tanpa prediksi nilai
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
global.self = global;
const B = require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0, fail = 0;
function check(name, fn) { try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); } }
const TKA = ['tka_tekstual', 'tka_inferensial', 'tka_evaluatif'];
const all = TKA.flatMap((k) => B.itemsFor(k));

check('T1 tiga keterampilan TKA, 16 soal per level', () => {
  assert.deepStrictEqual(B.TKA_ORDER, TKA);
  for (const k of TKA) {
    assert.ok(B.SKILLS[k] && B.SKILLS[k].objective && B.SKILLS[k].area === 'reading', k);
    assert.strictEqual(B.itemsFor(k).length, 16, k);
  }
});

check('T2 TKA di luar SKILL_ORDER; diagnostik tetap 5', () => {
  for (const k of TKA) assert.ok(B.SKILL_ORDER.indexOf(k) === -1, k);
  assert.strictEqual(B.diagnosticSet({ seed: 3 }).length, 5);
});

check('T3 setiap soal sah', () => {
  const ID_RE = /^[A-Za-z0-9._:@#-]{1,80}$/;
  for (const q of all) {
    assert.ok(ID_RE.test(q.id), 'id ' + q.id);
    assert.strictEqual(q.options.length, 4, q.id);
    assert.strictEqual(new Set(q.options).size, 4, 'pilihan kembar ' + q.id);
    assert.ok(q.answer >= 0 && q.answer < 4, q.id);
    assert.ok(!Object.prototype.hasOwnProperty.call(q.why || {}, q.answer) && !Object.prototype.hasOwnProperty.call(q.why || {}, String(q.answer)), 'why menunjuk kunci ' + q.id);
    assert.ok(q.context && q.context.length > 120 && q.contextKind === 'passage', 'bacaan ' + q.id);
    assert.ok(B.byId(q.id) === q || B.byId(q.id).id === q.id, 'byId ' + q.id);
  }
});

check('T4 kunci tersebar rata', () => {
  const cnt = [0, 0, 0, 0];
  all.forEach((q) => cnt[q.answer]++);
  assert.ok(Math.max(...cnt) - Math.min(...cnt) <= 4, JSON.stringify(cnt));
});

check('T5 soal evaluatif menanyakan fakta/opini', () => {
  for (const q of B.itemsFor('tka_evaluatif')) assert.ok(/OPINION|FACT/.test(q.prompt), q.id);
});

check('T6 pickFresh TKA hanya soal TKA', () => {
  for (const k of TKA) {
    const got = B.pickFresh(k, 20, { seed: 9 });
    assert.strictEqual(got.length, 20);
    assert.ok(got.every((q) => q.skill === k), k);
  }
});

check('T7 sambungan murid & guru', () => {
  const lf = read('features/learner-flow/fiezel-learner-flow.js');
  for (const s of ['tkaMarkup(st)', "case 'start-tka'", 'data-lf="start-tka"', 'bukan prediksi nilai TKA']) assert.ok(lf.includes(s), s);
  assert.ok(!/peluang lulus|prediksi skor/i.test(lf.slice(lf.indexOf('function tkaMarkup'), lf.indexOf('function startTka'))), 'peta kesiapan tidak boleh memprediksi nilai');
  assert.ok(read('features/teacher/fiezel-teacher-store.js').includes("TKA_SKILLS = ['tka_tekstual', 'tka_inferensial', 'tka_evaluatif']"));
  assert.ok(read('features/teacher/fiezel-teacher-shell.js').includes('.concat(T.TKA_SKILLS || [])'));
  assert.ok(read('features/class-hub/fiezel-class-hub.js').includes('TS.SKILL_ORDER.concat(TS.TKA_SKILLS || [])'));
});

console.log(`\ntka-membaca-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
