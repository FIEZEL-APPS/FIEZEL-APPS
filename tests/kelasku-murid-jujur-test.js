'use strict';
/**
 * Gerbang KELASKU MURID JUJUR (temuan role play murid, 2026-10-05).
 *
 * J1  tidak ada isi karangan di panel tugas murid: label "LESSON 12 & 13", "Bobot nilai 15%",
 *     "soal adaptif", tugas contoh fiktif, hitungan `|| 2` / `|| 1`, pengumuman guru karangan
 * J2  label tugas lahir dari keterampilan sebenarnya (area bank soal)
 * J3  layar hasil menyebut status kiriman yang sebenarnya (terkirim / mengirim / menunggu sinyal)
 * J4  soal menyimak: tombol Dengarkan, naskah baru terlihat sesudah menjawab
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
const hub = read('features/class-hub/fiezel-class-hub.js');
const kode = hub.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const tests = [];
const check = (name, fn) => tests.push([name, fn]);

check('J1 tidak ada isi karangan di panel tugas murid', () => {
  for (const s of ['LESSON 12 & 13', 'Bobot nilai', 'soal-adaptif-bobot', 'A1 FOOD & DRINK', 'Makanan & Minuman Sehat', 'Present Simple & Daily Routine', 'Perkenalan Diri (Self Intro)', 'tuntaskan Present Simple', 'Diposting 2 jam lalu', 'Nilai 90 (18/20 benar)']) {
    assert.ok(!kode.includes(s), 'masih ada: ' + s);
  }
  assert.ok(/segmenBar\(seg, kerjakan\.length, terlewat\.length, selesai\.length\)/.test(kode), 'hitungan segmen memakai angka nyata');
  assert.ok(!/\(total \|\| 3\)|nK != null \? nK : 2|nS != null \? nS : 1/.test(kode), 'hitungan cadangan palsu');
  assert.ok(/var ann = teacherAnnouncement\(\);\s*if \(!ann \|\| !ann\.text\) return '';/.test(kode), 'sapaan guru hanya bila guru benar-benar menulis');
});

check('J2 label tugas dari keterampilan sebenarnya', () => {
  global.self = global;
  const B = require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
  assert.ok(/function areaTugas\(a\)/.test(kode) && /RB\.SKILLS\[k\]/.test(kode), 'areaTugas membaca SKILLS bank soal');
  for (const [k, area] of [['past_tense', 'grammar'], ['tka_inferensial', 'reading'], ['listening_detail', 'listening'], ['vocab_a2', 'vocabulary']]) assert.strictEqual(B.SKILLS[k].area, area, k);
  for (const [area, label] of [['grammar', 'TATA BAHASA'], ['reading', 'MEMBACA'], ['listening', 'MENYIMAK'], ['vocabulary', 'KOSAKATA']]) assert.ok(kode.includes("area === '" + area + "' ? t('sekolah.area-" + area + "', '" + label + "')"), area);
});

check('J3 layar hasil menyebut status kiriman yang sebenarnya', async () => {
  const store = {};
  global.window = global;
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
  global.document = { getElementById: () => null, addEventListener() {}, removeEventListener() {}, body: { classList: { add() {}, remove() {} } } };
  global.addEventListener = () => {};
  const ev = []; global.dispatchEvent = (e) => ev.push(e.type); global.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
  global.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  store['fiezel-onboarding-v1'] = JSON.stringify({ name: 'Rina', classCode: 'FZ-AB2C3D' });
  require(path.join(__fzRoot, 'features/teacher/fiezel-teacher-store.js'));
  require(path.join(__fzRoot, 'features/learner-flow/fiezel-learner-flow.js'));
  const LF = global.FiezelLearnerFlow, TS = global.FiezelTeacherStore;
  let jawab = Promise.reject(new Error('offline')); jawab.catch(() => {});
  TS.reportToClass = () => jawab;
  LF.recordAssignmentResult({ id: 'tg-1', skill: 'past_tense', title: 'PR', results: [{ correct: true, skill: 'past_tense', itemId: 'q' }] });
  assert.strictEqual(LF.resultStatus('tg-1'), 'mengirim', 'laporan masih berangkat');
  await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(LF.resultStatus('tg-1'), 'menunggu', 'kiriman gagal = menunggu sinyal, bukan "dikirim"');
  assert.ok(ev.includes('fiezel:class-report'), 'layar hasil diberi kabar');
  jawab = Promise.resolve({ ok: true });
  LF.pushToClass(); await new Promise((r) => setTimeout(r, 0));
  assert.strictEqual(LF.resultStatus('tg-1'), 'terkirim');
  assert.ok(/statusKirim\(res\)/.test(kode) && /class-result-menunggu/.test(kode) && /r\.result = \{ id: a\.id,/.test(kode), 'layar hasil memakai status kiriman');
  assert.ok(/addEventListener\('fiezel:class-report'/.test(kode), 'layar hasil diperbarui saat kiriman selesai');
});

check('J4 soal menyimak: tombol Dengarkan, naskah sesudah menjawab', () => {
  assert.ok(/konteksSoal\(item, r\)/.test(kode), 'runner memakai konteksSoal');
  assert.ok(/data-ch="dengar"/.test(kode) && /case 'dengar':/.test(kode) && /FiezelVoiceSay\.say\(it\.context, \{ suppressSubtitles: true \}\)/.test(kode));
  assert.ok(/r && r\.revealed \? '<details class="ch-transcript" open>/.test(kode), 'naskah hanya sesudah jawaban terungkap');
  assert.ok(/class-dengar-tanpa-suara/.test(kode), 'tanpa mesin suara: naskah tampil dengan catatan jujur');
});

(async () => {
  let pass = 0, fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
  }
  console.log(`\nkelasku-murid-jujur-test: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
