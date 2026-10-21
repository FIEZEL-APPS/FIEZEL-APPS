'use strict';
/**
 * Gerbang PAKET TUGAS OFFLINE (R6, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * Masalah yang dijaga: satu laporan ke guru membawa paling banyak 8 tugas dan dulu dikirim
 * sebagai keadaan terbaru yang MENIMPA laporan sebelumnya. Murid yang menyelesaikan 12 tugas
 * tanpa sinyal kehilangan 4 hasil paling lama — gurunya tidak pernah menerimanya.
 *
 * O1  server: mergeAssign menggabungkan, hasil selesai tidak dikalahkan status "sedang", batas tersimpan
 * O2  murid: 12 tugas selesai offline -> kotak keluar 12, laporan pertama membawa 8 yang paling lama
 * O3  kiriman sukses melepas yang terkirim saja dan menjadwalkan kiriman berikutnya (di atas lantai 15 dtk)
 * O4  kiriman kedua menghabiskan sisa; semua 12 hasil tersimpan di server lewat penggabungan
 * O5  kiriman gagal tidak melepas apa pun
 * O6  status untuk murid: tugas tersimpan + hasil menunggu sinyal; sambungan ke tampilan
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

(async () => {
  const core = await import(path.join(__fzRoot, 'workers/api/teacher/class-sync-core.js'));

  await check('O1 mergeAssign: gabung, selesai menang, batas tersimpan', () => {
    const m = core.mergeAssign([{ id: 'a', at: 1, c: 3, t: 5 }, { id: 'b', at: 2, s: 1 }], [{ id: 'a', at: 9, s: 1 }, { id: 'b', at: 3, c: 4, t: 4 }, { id: 'c', at: 4, c: 1, t: 2 }]);
    assert.deepStrictEqual(m.map((x) => x.id), ['a', 'b', 'c']);
    assert.strictEqual(m[0].t, 5, 'hasil selesai tidak ditimpa status sedang dikerjakan');
    assert.strictEqual(m[1].t, 4, 'hasil selesai menggantikan status sedang dikerjakan');
    const banyak = Array.from({ length: 50 }, (_, i) => ({ id: 'x' + i, at: i, c: 1, t: 1 }));
    const cap = core.mergeAssign(banyak.slice(0, 30), banyak.slice(30));
    assert.strictEqual(cap.length, core.LIMITS.ASSIGN_STORED_MAX);
    assert.strictEqual(cap[cap.length - 1].id, 'x49', 'yang terbaru dipertahankan');
    assert.strictEqual(core.mergeAssign(undefined, undefined), undefined);
    const route = fs.readFileSync(path.join(__fzRoot, 'workers/api/route-class-sync.js'), 'utf8');
    assert.ok(/r\.report\.assign = mergeAssign\(prevAssign, r\.report\.assign\)/.test(route), 'rute laporan memakai penggabungan');
  });

  // DOM-stub minimal seperti gerbang learner-flow lain.
  const store = {};
  globalThis.window = globalThis;
  globalThis.self = globalThis;
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
  globalThis.document = { getElementById: () => null, addEventListener() {}, removeEventListener() {}, body: { classList: { add() {}, remove() {} } } };
  globalThis.addEventListener = () => {};
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
  store['fiezel-onboarding-v1'] = JSON.stringify({ name: 'Rina', classCode: 'FZ-AB2C3D' });
  require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
  require(path.join(__fzRoot, 'features/teacher/fiezel-teacher-store.js'));
  require(path.join(__fzRoot, 'features/learner-flow/fiezel-learner-flow.js'));
  const LF = globalThis.FiezelLearnerFlow, TS = globalThis.FiezelTeacherStore;

  const kiriman = [];
  let jawab = { ok: false, error: 'offline' };
  TS.reportToClass = (p) => { kiriman.push(p); return Promise.resolve(jawab); };
  const tersimpan = []; // laporan yang tersimpan di server (digabung seperti rute asli)
  let serverAssign;

  await check('O2 12 tugas selesai offline: semua masuk kotak keluar, laporan bawa 8 paling lama', async () => {
    store[LF.ASSIGN_KEY] = JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ id: 'tg-' + i, title: 'Tugas ' + i, skills: ['past_tense'], itemIds: [], minutes: 5 })));
    for (let i = 0; i < 12; i++) LF.recordAssignmentResult({ id: 'tg-' + i, skill: 'past_tense', title: 'Tugas ' + i, results: [{ correct: true, skill: 'past_tense', itemId: 'q' }, { correct: i % 2 === 0, skill: 'past_tense', itemId: 'q2', chosen: 1 }] });
    await tick();
    assert.strictEqual(LF._state().assignOutbox.length, 12);
    const last = kiriman[kiriman.length - 1];
    assert.strictEqual(last.assign.length, 8);
    assert.deepStrictEqual(last.assign.map((x) => x.id), ['tg-0', 'tg-1', 'tg-2', 'tg-3', 'tg-4', 'tg-5', 'tg-6', 'tg-7']);
  });

  await check('O5 kiriman gagal tidak melepas apa pun', async () => {
    LF.pushToClass(); await tick();
    assert.strictEqual(LF._state().assignOutbox.length, 12);
    assert.ok(!LF._drainPending());
  });

  await check('O3 kiriman sukses melepas yang terkirim dan menjadwalkan kiriman berikutnya', async () => {
    jawab = { ok: true };
    const n0 = kiriman.length;
    LF.pushToClass(); await tick();
    const p = kiriman[n0];
    serverAssign = core.mergeAssign(serverAssign, p.assign); tersimpan.push(p);
    assert.deepStrictEqual(LF._state().assignOutbox.map((x) => x.id), ['tg-8', 'tg-9', 'tg-10', 'tg-11']);
    assert.ok(LF._drainPending(), 'sisa antrean dijadwalkan');
    const src = fs.readFileSync(path.join(__fzRoot, 'features/learner-flow/fiezel-learner-flow.js'), 'utf8');
    const ms = Number((src.match(/OUTBOX_DRAIN_MS = (\d+)/) || [])[1]);
    assert.ok(ms >= core.LIMITS.LEARNER_MIN_INTERVAL_MS, 'jeda antarkiriman di atas lantai server: ' + ms);
  });

  await check('O4 kiriman kedua menghabiskan sisa; server menyimpan 12 hasil', async () => {
    const n0 = kiriman.length;
    LF.pushToClass(); await tick();
    const p = kiriman[n0];
    assert.deepStrictEqual(p.assign.slice(0, 4).map((x) => x.id), ['tg-8', 'tg-9', 'tg-10', 'tg-11']);
    serverAssign = core.mergeAssign(serverAssign, p.assign);
    assert.strictEqual(LF._state().assignOutbox.length, 0);
    assert.strictEqual(serverAssign.filter((x) => x.t > 0).length, 12, 'tidak ada hasil yang hilang');
  });

  await check('O6 status murid dan sambungan tampilan', () => {
    store[LF.ASSIGN_KEY] = JSON.stringify([{ id: 'baru', title: 'Baru', skills: ['past_tense'], itemIds: [], minutes: 5 }]);
    LF._state().assignOutbox = [{ id: 'z', at: 1, c: 1, t: 1 }];
    assert.deepStrictEqual(Object.assign({}, LF.offlineStatus(), { lastOkAt: 0 }), { pending: 1, lastOkAt: 0, saved: 1 });
    const src = fs.readFileSync(path.join(__fzRoot, 'features/learner-flow/fiezel-learner-flow.js'), 'utf8');
    assert.ok(/html \+= offlineMarkup\(\);/.test(src), 'status tampil di rencana murid');
    assert.ok(/outboxAdd\(st, hasilTugas\)/.test(src) && /outboxAdd\(s, entry\)/.test(src), 'kedua jalur selesai-tugas mengisi kotak keluar');
    assert.ok(fs.readFileSync(path.join(__fzRoot, 'features/i18n/copy-id-sekolah.js'), 'utf8').includes("'sekolah.offline-menunggu'"));
  });

  console.log(`\npaket-offline-test: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
