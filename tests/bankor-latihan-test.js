'use strict';
/**
 * tests/bankor-latihan-test.js — GERBANG: BANKOR MENYALA DI LATIHAN MANDIRI MURID.
 *
 * Sampai m025-278 BANKOR hanya hidup di jalur tugas guru; latihan mandiri murid masih
 * memilih butir dengan pickFresh + `st.seen`, yaitu daftar "sudah pernah tampil" yang
 * tidak tahu apa-apa tentang BENAR atau SALAH. Akibatnya butir yang murid jawab salah
 * kemarin punya peluang yang sama persis dengan butir yang sudah ia kuasai — latihan
 * yang terasa adaptif tetapi sebetulnya acak.
 *
 * Yang dijaga berkas ini adalah penyambungannya, bukan mesinnya (mesin diuji di
 * tests/question-allocator-test.js). Lima perilaku diuji dengan MENJALANKAN alur
 * latihan yang sebenarnya — mount, pilih tujuan, diagnostic, rencana, kerjakan lesson —
 * lewat DOM palsu, bukan dengan memanggil fungsi dalam secara langsung. Alasannya:
 * penyambungan yang putus tetap membuat unit test hijau; yang merah hanyalah alur.
 *
 *   P1 alokator yang memilih   — set butir lesson = keluaran FiezelQuestionAllocator
 *                                untuk kolam + ingatan yang sama, bukan pickFresh.
 *   P2 jawaban jadi ingatan    — tiap jawaban tercatat di st.qmem dengan hasilnya.
 *   P3 ingatan bertahan        — tersimpan di localStorage 'fiezel-learner-flow-v1'
 *                                dan terbaca lagi setelah halaman dimuat ulang.
 *   P4 salah kembali lebih cepat— butir yang dijawab SALAH lebih diprioritaskan pada
 *                                sesi berikutnya daripada yang dijawab benar.
 *   P5 seed = identitas murid   — dua murid dapat urutan berbeda, murid yang sama dapat
 *                                urutan yang sama; jam tidak menentukan pilihan.
 *
 * Dua batas ikut dijaga karena keduanya mudah dilanggar tanpa terlihat:
 *   - set MANUAL dari guru (block.itemIds) tidak boleh disentuh alokator;
 *   - `st.seen` TIDAK dimigrasikan ke ingatan soal (itu akan menanam bukti palsu:
 *     "pernah tampil" bukan "pernah dijawab benar").
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* ---------------------------------------------------------------- panggung palsu --- */

function stage(opts) {
  const o = opts || {};
  const store = o.store || {};
  globalThis.window = globalThis;
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
  globalThis.location = { href: 'https://example.test/' };
  globalThis.document = { getElementById: () => null, addEventListener() {}, removeEventListener() {} };
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  globalThis.storedSocialHandle = () => o.handle || null;

  require('../features/learner-flow/fiezel-review-bank.js');
  require('../features/brain/fiezel-item-prior.js');
  require('../features/brain/fiezel-question-memory.js');
  require('../features/brain/fiezel-question-allocator.js');
  delete require.cache[require.resolve('../features/learner-flow/fiezel-learner-flow.js')];
  require('../features/learner-flow/fiezel-learner-flow.js');

  const LF = globalThis.FiezelLearnerFlow;
  const handlers = {};
  const el = {
    innerHTML: '',
    addEventListener(t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
    querySelector: () => null
  };
  const click = (attrs) => {
    const b = { disabled: false, getAttribute: (k) => (k in attrs ? attrs[k] : null) };
    b.closest = (sel) => (sel === '[data-lf]' ? b : null);
    (handlers.click || []).forEach((fn) => fn({ target: b, preventDefault() {} }));
  };
  LF.mount(el, { toast() {}, go() {}, afterRender() {} });
  return { LF, el, click, store, state: () => LF._state() };
}

/** Kerjakan satu lesson penuh; `answer(i)` memutuskan pilihan untuk butir ke-i. */
function doLesson(s, blockId, answer) {
  s.click({ 'data-lf': 'start-lesson', 'data-block': blockId });
  const L = s.state().activeLesson;
  assert.ok(L, 'lesson tidak terbuka untuk blok ' + blockId);
  const ids = L.itemIds.slice();
  const Bank = globalThis.FiezelReviewBank;
  for (let i = 0; i < ids.length; i++) {
    const item = Bank.byId(ids[i]);
    const benar = answer(i, item);
    // Dua percobaan supaya butir selalu tuntas walau jawaban pertama sengaja salah.
    s.click({ 'data-lf': 'lesson-answer', 'data-choice': String(benar ? item.answer : (item.answer + 1) % item.options.length) });
    if (!s.state().activeLesson) break;
    if (!s.state().activeLesson.revealed) {
      s.click({ 'data-lf': 'lesson-answer', 'data-choice': String(item.answer) });
    }
    s.click({ 'data-lf': 'lesson-next' });
    if (!s.state().activeLesson) break;
  }
  return ids;
}

/** Sampai ke rencana hari ini: tujuan -> 5 soal diagnostic -> rencana. */
function toPlan(s) {
  s.click({ 'data-lf': 'goal', 'data-goal': 'school' });
  s.click({ 'data-lf': 'start-diagnostic' });
  for (let i = 0; i < 5; i++) {
    s.click({ 'data-lf': 'diag-answer', 'data-choice': '0' });
    s.click({ 'data-lf': 'diag-next' });
  }
  s.click({ 'data-lf': 'to-plan' });
  const st = s.state();
  assert.ok(st.plan && st.plan.blocks.length, 'rencana hari ini tidak terbentuk');
  return st.plan;
}

/* ------------------------------------------------------------------ P1 · alokator --- */

test('P1 · butir lesson datang dari alokator BANKOR, bukan dari pickFresh', () => {
  const s = stage({ handle: 'murid-p1' });
  const plan = toPlan(s);
  const blok = plan.blocks.filter((b) => !b.itemIds)[0];
  assert.ok(blok, 'rencana tidak punya blok yang butirnya dipilih sistem');

  const stSebelum = JSON.parse(JSON.stringify(s.state()));
  s.click({ 'data-lf': 'start-lesson', 'data-block': blok.id });
  const dipakai = s.state().activeLesson.itemIds;

  const A = globalThis.FiezelQuestionAllocator, M = globalThis.FiezelQuestionMemory;
  const harusnya = A.allocate({
    pool: globalThis.FiezelReviewBank.itemsFor(blok.skill),
    memory: stSebelum.qmem && stSebelum.qmem.schema === M.SCHEMA ? stSebelum.qmem : M.emptyMemory(),
    count: blok.count,
    nowMs: Date.now(),
    seed: 'murid-p1'
  }).items.map((it) => it.id);

  assert.deepStrictEqual(dipakai, harusnya,
    'set lesson tidak sama dengan keputusan alokator — penyambungannya putus');
});

/* -------------------------------------------------------- P2 · jawaban jadi ingatan --- */

test('P2 · setiap jawaban tercatat di ingatan soal dengan hasil benar/salah-nya', () => {
  const s = stage({ handle: 'murid-p2' });
  const plan = toPlan(s);
  const blok = plan.blocks.filter((b) => !b.itemIds)[0];
  const M = globalThis.FiezelQuestionMemory;
  assert.ok(!s.state().qmem || Object.keys(s.state().qmem.items || {}).length === 0,
    'ingatan sudah terisi sebelum satu soal pun dikerjakan');

  const ids = doLesson(s, blok.id, (i) => i % 2 === 0);   // genap benar, ganjil salah
  const mem = s.state().qmem;
  assert.ok(mem && mem.schema === M.SCHEMA, 'ingatan soal tidak berbentuk memory yang sah');
  for (let i = 0; i < ids.length; i++) {
    const row = mem.items[ids[i]];
    assert.ok(row, 'butir ' + ids[i] + ' dijawab tetapi tidak masuk ingatan');
  }
  const benar = ids.filter((id, i) => i % 2 === 0);
  const salah = ids.filter((id, i) => i % 2 === 1);
  benar.forEach((id) => assert.ok(mem.items[id].ok > 0, id + ': dijawab benar tetapi tidak tercatat benar'));
  salah.forEach((id) => assert.ok(mem.items[id].no > 0 || mem.items[id].ok === 0,
    id + ': dijawab salah tetapi tercatat seolah benar'));
});

/* --------------------------------------------------------- P3 · ingatan bertahan --- */

test('P3 · ingatan ikut tersimpan ke localStorage dan terbaca lagi setelah muat ulang', () => {
  const store = {};
  const s = stage({ handle: 'murid-p3', store: store });
  const plan = toPlan(s);
  const blok = plan.blocks.filter((b) => !b.itemIds)[0];
  const ids = doLesson(s, blok.id, () => true);

  const disimpan = JSON.parse(store['fiezel-learner-flow-v1']);
  assert.ok(disimpan.qmem && disimpan.qmem.items, 'ingatan tidak ikut ke localStorage');
  ids.forEach((id) => assert.ok(disimpan.qmem.items[id], 'butir ' + id + ' hilang saat disimpan'));

  // Muat ulang halaman: panggung baru, penyimpanan yang sama.
  const s2 = stage({ handle: 'murid-p3', store: store });
  const mem2 = s2.state().qmem;
  ids.forEach((id) => assert.ok(mem2 && mem2.items[id], 'butir ' + id + ' hilang setelah muat ulang'));
});

/* ------------------------------------------------- P4 · yang salah kembali lebih cepat --- */

test('P4 · butir yang dijawab SALAH lebih diprioritaskan daripada yang dijawab benar', () => {
  const s = stage({ handle: 'murid-p4' });
  const plan = toPlan(s);
  const blok = plan.blocks.filter((b) => !b.itemIds)[0];
  const ids = doLesson(s, blok.id, (i) => i % 2 === 0);
  const salah = ids.filter((id, i) => i % 2 === 1);
  const benar = ids.filter((id, i) => i % 2 === 0);
  assert.ok(salah.length && benar.length, 'lesson terlalu pendek untuk membedakan');

  const M = globalThis.FiezelQuestionMemory, mem = s.state().qmem;
  const nanti = Date.now() + 2 * 86400000;   // dua hari kemudian: keduanya sudah lewat masa 'baru saja tampil'
  const p = (id) => M.priorityOf(M.stateOf(mem, id, nanti));
  const pSalahTerendah = Math.min.apply(null, salah.map(p));
  const pBenarTertinggi = Math.max.apply(null, benar.map(p));
  assert.ok(pSalahTerendah > pBenarTertinggi,
    'butir salah (' + pSalahTerendah + ') tidak diutamakan di atas butir benar (' + pBenarTertinggi + ')');
});

/* ------------------------------------------------------------ P5 · seed = murid --- */

test('P5 · urutan ditentukan identitas murid, bukan jam: beda murid beda set, murid sama set sama', () => {
  const jalankan = (handle) => {
    const s = stage({ handle: handle, store: {} });
    const plan = toPlan(s);
    const blok = plan.blocks.filter((b) => !b.itemIds)[0];
    s.click({ 'data-lf': 'start-lesson', 'data-block': blok.id });
    return s.state().activeLesson.itemIds.join(',');
  };
  const a1 = jalankan('murid-a'), a2 = jalankan('murid-a'), b1 = jalankan('murid-b');
  assert.strictEqual(a1, a2, 'murid yang sama mendapat set berbeda — hasilnya tidak bisa diputar ulang');
  assert.notStrictEqual(a1, b1, 'dua murid berbeda mendapat set identik — seed tidak dari identitas mereka');
});

/* -------------------------------------------------------------------- dua batas --- */

test('batas · set MANUAL dari guru dipakai apa adanya, alokator tidak menyentuhnya', () => {
  const s = stage({ handle: 'murid-manual' });
  toPlan(s);
  const st = s.state();
  const manual = globalThis.FiezelReviewBank.pick('past_tense', 4, 3).map((x) => x.id);
  st.plan.blocks.unshift({ id: 'manual-1', kind: 'Tugas', skill: 'past_tense', title: 'Pilihan guru', minutes: 5, count: 4, itemIds: manual });
  s.click({ 'data-lf': 'start-lesson', 'data-block': 'manual-1' });
  assert.deepStrictEqual(s.state().activeLesson.itemIds, manual,
    'set manual guru diubah — itu membatalkan keputusan pengajaran');
});

test('batas · st.seen TIDAK dimigrasikan jadi ingatan soal (bukti palsu tidak ditanam)', () => {
  const src = fs.readFileSync(path.join(__fzRoot, 'features/learner-flow/fiezel-learner-flow.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  assert.ok(!/recordAttempt\s*\([^)]*\bseen\b/.test(src) && !/\bst\.seen\b[^;]*recordAttempt/.test(src),
    'ada jalur yang menyuapkan st.seen ke ingatan soal');
  const s = stage({ handle: 'murid-seen', store: { 'fiezel-learner-flow-v1': JSON.stringify({ schema: 'fiezel-learner-flow-v1', seen: { past_tense: ['pt-1', 'pt-2'] } }) } });
  const mem = s.state().qmem;
  assert.ok(!mem || !mem.items || Object.keys(mem.items).length === 0,
    'st.seen berubah jadi ingatan soal — "pernah tampil" dicatat seolah "pernah dijawab"');
});

let failures = 0;
for (const [n, fn] of tests) {
  try { fn(); console.log('ok - ' + n); }
  catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); }
}
console.log('\nBankorLatihan: ' + (failures ? 'FAIL (' + failures + ' kegagalan)' : 'PASS'));
process.exit(failures ? 1 : 0);
