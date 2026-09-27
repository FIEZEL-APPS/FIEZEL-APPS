#!/usr/bin/env node
/**
 * tests/item-pool-test.js — GERBANG: KESULITAN SOAL DIHITUNG DARI SEMUA MURID (Braincore langkah 2).
 *
 * Roadmap OWNER langkah 2: "Tingkat kesulitan soal dihitung dari semua murid, bukan per HP."
 * FiezelItemCalibration (N=1) mengakui di kepalanya sendiri bahwa satu perangkat tidak bisa
 * memisahkan kesulitan soal dari kemampuan murid. Jalur baru:
 *   perangkat  features/brain/fiezel-item-pool.js  — jawaban-PERTAMA per soal, tanpa pengenal;
 *   server     workers/api/evidence/item-pool-*.js — penghitung harian + penaksir dua tahap;
 *   app.js     itemPoolObserve/Flush/RefreshTable/Effective — sambungan, guarded.
 *
 * YANG DIKUNCI
 *   M1-M9  modul perangkat: hanya jawaban pertama, ID tertutup, kuota, penyangga 56 hari, tabel;
 *   S1-S4  validasi server: struktur rusak = 400/413, isi asing dibuang diam-diam;
 *   E1-E5  penaksir: memulihkan meleset-label, pergeseran bersama terhapus, MENGALAHKAN
 *          kalibrasi per-HP pada dunia yang sama, dan RED: versi satu-tahap lebih buruk;
 *   D1-D4  D1 sungguhan (node:sqlite dari migrasi 0015): dedup, penghitung, tabel, purge;
 *   R1-R3  rute: saklar mati = 202 disabled / tabel kosong; hidup = tulis + baca;
 *   P1-P4  privasi: tanpa kolom penghubung, tanpa cookie, tanpa tabel lane lain, amplop tertutup;
 *   K1     paritas konstanta perangkat <-> server;
 *   A1-A5  app.js sungguhan (vm): catat, penempatan, kirim (disabled/ok/400/5xx), terapkan tabel;
 *   CI     gerbang terdaftar di quality.yml.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const { pathToFileURL } = require('url');
const root = __fzRoot;
const Pool = require(path.join(root, 'features/brain/fiezel-item-pool.js'));
const Cal = require(path.join(root, 'features/brain/fiezel-item-calibration.js'));

let failures = 0, checks = 0;
async function test(name, fn) {
  checks++;
  try { await fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e)); }
}
const plain = (v) => JSON.parse(JSON.stringify(v));
const DAY = 86400000;
const NOW = Date.parse('2026-09-27T10:00:00Z');
let uuidN = 0;
const uuid = () => { uuidN++; const h = uuidN.toString(16).padStart(12, '0'); return '00000000-0000-4000-8000-' + h; };

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P3 = (th, b) => 0.25 + 0.75 / (1 + Math.exp(-1.5 * (th - b)));

/**
 * Dunia sintetis: 30% soal meleset label +/-0.8, taksiran kemampuan SEMUA perangkat bias +0.2
 * dan berderau 0.3 (persis penyakit yang tidak bisa dilihat satu perangkat). Setiap murid
 * menjawab 40 soal di pitanya. rowsFirst = jawaban PERTAMA (yang dikirim jalur gabungan).
 */
function world(seed, { learners = 200, items = 240, bias = 0.2, mis = 0.3, off = 0.8, reps = 10, withLocal = false } = {}) {
  const r = rng(seed);
  const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const it = [];
  for (let i = 0; i < items; i++) {
    const prior = 1 + r() * 4;
    const err = r() < mis ? (r() < 0.5 ? -off : off) : 0;
    it.push({ id: 'PR-' + String(100 + i).padStart(3, '0') + ':apply_form', prior, err, b: prior + err });
  }
  const rows = [];
  let localSq = 0, localN = 0;
  for (let l = 0; l < learners; l++) {
    const th = 3 + g(), est = th + bias + 0.3 * g();
    const cand = it.filter((x) => Math.abs(x.prior - est) < 1.5);
    const mine = [];
    for (let j = 0; j < 40 && cand.length; j++) mine.push(cand.splice(Math.floor(r() * cand.length), 1)[0]);
    for (const x of mine) rows.push({ item_id: x.id, pb: Pool.bucketOf(P3(est, x.prior)), n: 1, k: r() < P3(th, x.b) ? 1 : 0 });
    if (withLocal) {
      let st = null;
      for (let rep = 0; rep < reps; rep++) for (const x of mine) st = Cal.observe(st, { itemId: x.id, priorDifficulty: x.prior, ability: est, ok: r() < P3(th, x.b), kappa: 1 }, rep * DAY);
      for (const x of mine) { localSq += (Cal.effective(st, x.id, x.prior).difficulty - x.b) ** 2; localN++; }
    }
  }
  return { it, rows, localRmse: localN ? Math.sqrt(localSq / localN) : null };
}
function rmse(it, table) {
  let s = 0, sp = 0;
  for (const x of it) { const e = table.items[x.id]; s += (x.prior + (e ? e.d : 0) - x.b) ** 2; sp += (x.prior - x.b) ** 2; }
  return { pooled: Math.sqrt(s / it.length), prior: Math.sqrt(sp / it.length) };
}

/* D1 palsu = SQLite sungguhan dari DDL migrasi (pola ai-legacy-spend-gate-test.js). */
function makeD1(files) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  for (const f of files) {
    const clean = fs.readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    for (const stmt of clean.split(';')) { const t = stmt.trim(); if (t) db.exec(t); }
  }
  const norm = (v) => (v === undefined ? null : v);
  return {
    _raw: db,
    prepare(sql) {
      let params = [];
      const api = {
        bind(...a) { params = a.map(norm); return api; },
        async run() { return { success: true, meta: db.prepare(sql).run(...params) }; },
        async all() { return { results: db.prepare(sql).all(...params) }; },
        async first() { return db.prepare(sql).all(...params)[0] || null; }
      };
      return api;
    },
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; }
  };
}
const MIG = path.join(root, 'workers/api/migrations/0015_item_pool.sql');
const MIG16 = path.join(root, 'workers/api/migrations/0016_item_pool_probe.sql');

(async () => {
  const core = await import(pathToFileURL(path.join(root, 'workers/api/evidence/item-pool-core.js')).href);
  const store = await import(pathToFileURL(path.join(root, 'workers/api/evidence/item-pool-store-d1.js')).href);
  const route = await import(pathToFileURL(path.join(root, 'workers/api/evidence/route-item-pool.js')).href);
  const wiring = fs.readFileSync(path.join(root, 'workers/api/route-wiring.js'), 'utf8');

  /* ------------------------------------------------------------ modul perangkat */
  await test('M1 · hanya JAWABAN PERTAMA per soal yang dicatat', () => {
    let r = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: true }, NOW);
    assert.strictEqual(r.recorded, true);
    r = Pool.observe(r.state, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: false }, NOW + DAY);
    assert.strictEqual(r.recorded, false); assert.strictEqual(r.reason, 'not_first_exposure');
    assert.deepStrictEqual(plain(r.state.pending), { '2026-09-27': { 'PR-101:apply_form': [14, 1] } });
  });
  await test('M2 · ID di luar pola/daftar mode ditolak (tidak ada teks bebas yang bisa menumpang)', () => {
    for (const bad of ['fallback:generic:apply_form', 'taxonomy:family:classify_family', 'Budi Santoso:apply_form', 'PR-101:free_text', 'PR-101', 'PR-101:apply_form:x', 'ABCDE-101:apply_form']) {
      assert.strictEqual(Pool.validItemId(bad), false, bad);
    }
    for (const good of ['PR-101:apply_form', 'TA-001:cloze_production', 'b4_002:cloze_production', 'JP-AD-101:complete_sentence', 'JP-N4-PF-01:repair_distractor_2']) {
      assert.strictEqual(Pool.validItemId(good), true, good);
    }
  });
  await test('M3 · tanpa prediksi: tidak dikirim, tetapi soal ditandai terlihat (jawaban kedua bukan "pertama")', () => {
    let r = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: NaN, ok: true }, NOW);
    assert.strictEqual(r.reason, 'seen_without_prediction');
    assert.deepStrictEqual(plain(r.state.pending), {});
    r = Pool.observe(r.state, { itemId: 'PR-101:apply_form', pPrior: 0.6, ok: true }, NOW + DAY);
    assert.strictEqual(r.reason, 'not_first_exposure');
  });
  await test('M4 · kuota harian penuh TIDAK membakar soal (jawaban pertamanya masih bisa dicatat besok)', () => {
    let st = null;
    for (let i = 0; i < Pool.LIMITS.MAX_PENDING_PER_DAY; i++) st = Pool.observe(st, { itemId: 'PR-' + String(i).padStart(3, '0') + ':apply_form', pPrior: 0.5, ok: true }, NOW).state;
    let r = Pool.observe(st, { itemId: 'TA-001:apply_form', pPrior: 0.5, ok: true }, NOW);
    assert.strictEqual(r.reason, 'day_full');
    r = Pool.observe(r.state, { itemId: 'TA-001:apply_form', pPrior: 0.5, ok: true }, NOW + DAY);
    assert.strictEqual(r.recorded, true);
  });
  await test('M5 · seal memberi eventId SEKALI; kiriman ulang membawa eventId yang sama', () => {
    let st = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: true }, NOW).state;
    st = Pool.seal(st, NOW, uuid);
    const e1 = Pool.envelope(st, uuid());
    st = Pool.defer(st, NOW);
    assert.strictEqual(Pool.due(st, NOW), false, 'backoff tidak dihormati');
    st = Pool.seal(st, NOW + 2 * 3600000, uuid);
    const e2 = Pool.envelope(st, uuid());
    assert.strictEqual(e1.events[0].eventId, e2.events[0].eventId);
    assert.deepStrictEqual(Object.keys(e1).sort(), ['batchId', 'events', 'pv', 'schema']);
    assert.strictEqual(e1.pv, core.PARAM_VERSION, 'versi konstanta perangkat berbeda dari server');
    assert.deepStrictEqual(Object.keys(e1.events[0]).sort(), ['day', 'eventId', 'items']);
    st = Pool.ack(st, [e2.events[0].eventId]);
    assert.strictEqual(st.outbox.length, 0);
  });
  await test('M6 · tanpa CSPRNG (uuid gagal) catatan tetap tertunda, tidak hilang', () => {
    let st = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: true }, NOW).state;
    st = Pool.seal(st, NOW, () => '');
    assert.strictEqual(st.outbox.length, 0);
    assert.strictEqual(Object.keys(st.pending).length, 1);
  });
  await test('M7 · catatan DITAHAN sampai 56 hari (server belum menyala), yang lebih tua dibuang saat seal', () => {
    let kept = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: true }, NOW - 50 * DAY).state;
    kept = Pool.seal(kept, NOW, uuid);
    assert.strictEqual(kept.outbox.length, 1, 'catatan 50 hari dibuang padahal masih di jendela penaksir');
    let st = Pool.observe(null, { itemId: 'PR-101:apply_form', pPrior: 0.7, ok: true }, NOW - 60 * DAY).state;
    st = Pool.seal(st, NOW, uuid);
    assert.strictEqual(st.outbox.length, 0);
    assert.deepStrictEqual(plain(st.pending), {});
  });
  await test('M9 · penyangga penuh: soal tetap ditandai terlihat, catatannya tidak disimpan', () => {
    let st = { schema: Pool.SCHEMA, seen: {}, pending: {}, outbox: [], nextTryAt: 0, attempt: 0 };
    for (let e = 0; e < Pool.LIMITS.MAX_BUFFERED_ITEMS / Pool.LIMITS.MAX_ITEMS_PER_EVENT; e++) {
      st.outbox.push({ eventId: uuid(), day: '2026-09-20', items: Array.from({ length: Pool.LIMITS.MAX_ITEMS_PER_EVENT }, (_, i) => ['PR-' + String(i).padStart(3, '0') + ':apply_form', 10, 1]) });
    }
    const r = Pool.observe(st, { itemId: 'TA-001:apply_form', pPrior: 0.5, ok: true }, NOW);
    assert.strictEqual(r.reason, 'buffer_full');
    assert.ok(r.state.seen['TA-001:apply_form']);
    assert.deepStrictEqual(plain(r.state.pending), {});
  });
  await test('M8 · tabel: di bawah 20 murid tidak diterapkan; koreksi dijepit; tabel basi diabaikan', () => {
    const t = Pool.healTable({ schema: Pool.TABLE_SCHEMA, day: '2026-09-26', items: { 'PR-101:apply_form': { d: 0.6, n: 25 }, 'PR-102:apply_form': { d: 0.6, n: 19 }, 'PR-103:apply_form': { d: 5, n: 40 }, 'Budi:apply_form': { d: 1, n: 99 } } }, NOW);
    assert.strictEqual(Pool.effective(t, 'PR-101:apply_form', 3).difficulty, 3.6);
    assert.strictEqual(Pool.effective(t, 'PR-102:apply_form', 3).applied, false);
    assert.strictEqual(Pool.effective(t, 'PR-103:apply_form', 3).difficulty, 4);
    assert.ok(!('Budi:apply_form' in t.items));
    const stale = Pool.healTable({ schema: Pool.TABLE_SCHEMA, day: '2026-08-01', items: { 'PR-101:apply_form': { d: 0.6, n: 25 } } }, NOW);
    assert.strictEqual(Pool.effective(stale, 'PR-101:apply_form', 3).applied, false);
  });

  /* ------------------------------------------------------------ validasi server */
  const goodBody = () => ({ schema: 'fiezel-item-evidence-v1', batchId: uuid(), events: [{ eventId: uuid(), day: '2026-09-27', items: [['PR-101:apply_form', 14, 1], ['PR-102:apply_form', 9, 0]] }] });
  await test('S1 · amplop sah diterima', () => {
    const r = core.normalizeItemEnvelope(goodBody(), NOW);
    assert.strictEqual(r.ok, true); assert.strictEqual(r.dropped, 0);
    assert.strictEqual(r.envelope.events[0].items.length, 2);
  });
  await test('S2 · struktur rusak = 400/413 (field asing, skema salah, eventId ganda, terlalu banyak event)', () => {
    const extra = goodBody(); extra.cohort = 'abcdef0123456789';
    assert.strictEqual(route.processItemEvidenceBatch(extra, NOW).status, 400);
    const evExtra = goodBody(); evExtra.events[0].userId = 'x';
    assert.strictEqual(route.processItemEvidenceBatch(evExtra, NOW).status, 400);
    const bad = goodBody(); bad.schema = 'fiezel-braincore-evidence-v1';
    assert.strictEqual(route.processItemEvidenceBatch(bad, NOW).status, 400);
    const dup = goodBody(); dup.events.push({ ...dup.events[0] });
    assert.strictEqual(route.processItemEvidenceBatch(dup, NOW).status, 400);
    const many = goodBody(); for (let i = 0; i < 10; i++) many.events.push({ eventId: uuid(), day: '2026-09-27', items: [] });
    assert.strictEqual(route.processItemEvidenceBatch(many, NOW).status, 413);
  });
  await test('S3 · isi asing dibuang diam-diam, bukan menolak batch (klien lama tidak macet)', () => {
    const b = goodBody();
    b.events[0].items.push(['Budi Santoso:apply_form', 3, 1], ['PR-103:apply_form', 25, 1], ['PR-104:apply_form', 3, 2], ['PR-101:apply_form', 4, 0]);
    const r = core.normalizeItemEnvelope(b, NOW);
    assert.strictEqual(r.ok, true); assert.strictEqual(r.dropped, 4);
    assert.strictEqual(r.envelope.events[0].items.length, 2);
  });
  await test('S4 · hari di luar jendela 56 hari (atau di masa depan) dibuang', () => {
    const inside = goodBody(); inside.events[0].day = '2026-08-05';
    assert.strictEqual(core.normalizeItemEnvelope(inside, NOW).dropped, 0, 'catatan yang ditahan perangkat 53 hari ditolak');
    const b = goodBody(); b.events[0].day = '2026-07-15';
    const r = core.normalizeItemEnvelope(b, NOW);
    assert.strictEqual(r.ok, true); assert.strictEqual(r.dropped, 2);
    assert.strictEqual(core.aggregateItemRows(r.envelope.events).length, 0);
    const f = goodBody(); f.events[0].day = '2026-09-29';
    assert.strictEqual(core.normalizeItemEnvelope(f, NOW).dropped, 2);
  });

  /* ------------------------------------------------------------ penaksir */
  await test('E1 · satu soal: koreksi searah dengan meleset-labelnya (lebih sulit = positif)', () => {
    const r = rng(3), rows = [];
    for (let i = 0; i < 200; i++) { const th = 2 + 2 * r(); rows.push({ pb: Pool.bucketOf(P3(th, 3)), n: 1, k: r() < P3(th, 3.7) ? 1 : 0 }); }
    const est = core.estimateItemDelta(rows, { tau: 2 });
    assert.ok(est.delta > 0.45 && est.delta < 0.95, 'delta ' + est.delta);
    const easy = [];
    for (let i = 0; i < 200; i++) { const th = 2 + 2 * r(); easy.push({ pb: Pool.bucketOf(P3(th, 3)), n: 1, k: r() < P3(th, 2.3) ? 1 : 0 }); }
    const e2 = core.estimateItemDelta(easy, { tau: 2 }).delta;
    assert.ok(e2 < -0.45 && e2 > -0.95, 'soal yang lebih mudah dari labelnya tidak terbaca: ' + e2);
  });
  await test('E2 · pergeseran BERSAMA (bias kemampuan semua perangkat) terbaca sebagai median, bukan sifat soal', () => {
    const { rows } = world(11, { bias: 0.4 });
    const est = core.estimateItemDifficulty(rows);
    assert.ok(Math.abs(est.median - 0.4) < 0.12, 'median ' + est.median);
  });
  await test('E3 · tabel gabungan menurunkan galat kesulitan terhadap prior (3 dunia)', () => {
    for (const seed of [1, 2, 3]) {
      const { it, rows } = world(seed);
      const m = rmse(it, core.buildDifficultyTable(core.estimateItemDifficulty(rows), '2026-09-27'));
      assert.ok(m.pooled < m.prior * 0.8, `seed ${seed}: pooled ${m.pooled.toFixed(3)} vs prior ${m.prior.toFixed(3)}`);
    }
  });
  await test('E4 · jawaban-PERTAMA semua murid MENGALAHKAN kalibrasi per-HP yang melihat 10x lebih banyak jawaban', () => {
    const { it, rows, localRmse } = world(5, { withLocal: true });
    const m = rmse(it, core.buildDifficultyTable(core.estimateItemDifficulty(rows), '2026-09-27'));
    assert.ok(m.pooled < localRmse - 0.05, `pooled ${m.pooled.toFixed(3)} vs per-HP ${localRmse.toFixed(3)}`);
  });
  await test('E5 · RED: SD prior DIPATOK gagal di salah satu dunia; tau empirical-Bayes tidak', () => {
    // Satu tahap = MAP per soal dengan prior N(0, tau) dipatok, lalu median dikurangkan.
    const oneStage = (rows, tau) => {
      const by = new Map();
      for (const r of rows) { const l = by.get(r.item_id) || []; l.push(r); by.set(r.item_id, l); }
      const raw = [...by].map(([id, b]) => ({ id, ...core.estimateItemDelta(b, { tau }) }));
      const big = raw.filter((x) => x.n >= 20).map((x) => x.delta).sort((a, b) => a - b);
      const k = big.length, med = k % 2 ? big[(k - 1) / 2] : (big[k / 2 - 1] + big[k / 2]) / 2;
      return { items: raw.map((x) => ({ itemId: x.id, delta: Math.max(-1, Math.min(1, x.delta - med)), n: x.n })) };
    };
    const avg = (opts) => {
      const out = { two: 0, t5: 0, t3: 0 };
      for (const seed of [1, 2, 3]) {
        const { it, rows } = world(seed, opts);
        out.two += rmse(it, core.buildDifficultyTable(core.estimateItemDifficulty(rows), 'd')).pooled / 3;
        out.t5 += rmse(it, core.buildDifficultyTable(oneStage(rows, 0.5), 'd')).pooled / 3;
        out.t3 += rmse(it, core.buildDifficultyTable(oneStage(rows, 0.3), 'd')).pooled / 3;
      }
      return out;
    };
    const fmt = (o) => Object.entries(o).map(([k, v]) => k + '=' + v.toFixed(3)).join(' ');
    // Dunia A: sedikit label meleset, melesetnya kecil -> tau 0.5 terlalu longgar.
    const a = avg({ mis: 0.1, off: 0.4 });
    assert.ok(a.t5 > a.two + 0.02, 'dunia A tidak membedakan: ' + fmt(a));
    assert.ok(a.two < Math.min(a.t5, a.t3) + 0.015, 'dunia A: dua tahap tertinggal jauh: ' + fmt(a));
    // Dunia B: banyak label meleset -> tau 0.3 terlalu ketat.
    const b = avg({ mis: 0.6 });
    assert.ok(b.t3 > b.two + 0.03, 'dunia B tidak membedakan: ' + fmt(b));
    assert.ok(b.two < Math.min(b.t5, b.t3) + 0.015, 'dunia B: dua tahap tertinggal jauh: ' + fmt(b));
  });

  /* ------------------------------------------------------------ D1 sungguhan */
  const hasSqlite = (() => { try { return typeof require('node:sqlite').DatabaseSync === 'function'; } catch { return false; } })();
  await test('D0 · node:sqlite tersedia (tanpa ini perilaku SQL tidak terukur — harus terlihat)', () => assert.ok(hasSqlite));
  if (hasSqlite) {
    await test('D1 · dedup: eventId yang sama hanya dihitung sekali', async () => {
      const db = makeD1([MIG]);
      const ev = core.normalizeItemEnvelope(goodBody(), NOW).envelope;
      const f1 = await store.markItemPoolEventsSeen(db, ev.events, ev.batchId, '2026-09-27');
      await store.applyItemPoolAggregate(db, f1);
      const f2 = await store.markItemPoolEventsSeen(db, ev.events, ev.batchId, '2026-09-27');
      assert.strictEqual(f1.length, 1); assert.strictEqual(f2.length, 0);
      const rows = db._raw.prepare('SELECT * FROM item_pool_daily ORDER BY item_id').all();
      assert.deepStrictEqual(plain(rows), [{ day: '2026-09-27', item_id: 'PR-101:apply_form', pb: 14, n: 1, k: 1 }, { day: '2026-09-27', item_id: 'PR-102:apply_form', pb: 9, n: 1, k: 0 }]);
    });
    await test('D2 · rebuild tabel dari penghitung sungguhan menerbitkan soal meleset-label, dibaca balik perangkat', async () => {
      const db = makeD1([MIG]);
      const { it, rows } = world(4);
      const agg = new Map();
      for (const r of rows) { const k = r.item_id + '|' + r.pb; const a = agg.get(k) || { item_id: r.item_id, pb: r.pb, n: 0, k: 0 }; a.n++; a.k += r.k; agg.set(k, a); }
      for (const a of agg.values()) await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-10-01', a.item_id, a.pb, a.n, a.k).run();
      const res = await store.rebuildItemPoolTable(db, '2026-10-10');
      assert.ok(res.items > 20, 'terlalu sedikit soal diterbitkan: ' + res.items);
      const table = Pool.healTable(plain(await store.readItemPoolTable(db)), Date.parse('2026-10-10T10:00:00Z'));
      assert.strictEqual(table.day, '2026-10-10');
      const m = rmse(it, table);
      assert.ok(m.pooled < m.prior * 0.8, `pooled ${m.pooled} vs prior ${m.prior}`);
      // Rebuild kedua mengganti UTUH: soal yang hilang dari jendela hilang dari tabel.
      await db.prepare('DELETE FROM item_pool_daily').run();
      await store.rebuildItemPoolTable(db, '2026-10-11');
      assert.strictEqual(Object.keys((await store.readItemPoolTable(db)).items).length, 0);
    });
    await test('D2b · penghitung SEBELUM PARAM_EPOCH_DAY (konstanta lama) tidak ikut ditaksir', async () => {
      const db = makeD1([MIG]);
      for (let i = 0; i < 40; i++) await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-09-20', 'PR-101:apply_form', 14, 1, 0).run();
      const res = await store.rebuildItemPoolTable(db, '2026-10-10');
      assert.strictEqual(res.answers, 0);
      assert.strictEqual(store.estimatorSince('2026-10-10'), core.PARAM_EPOCH_DAY);
      assert.strictEqual(store.estimatorSince('2027-01-10'), '2026-11-15');
    });
    await test('D3 · jendela 56 hari: penghitung lebih tua tidak ikut ditaksir', async () => {
      const db = makeD1([MIG]);
      for (let i = 0; i < 40; i++) await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-10-01', 'PR-101:apply_form', 14, 1, 0).run();
      const res = await store.rebuildItemPoolTable(db, '2026-11-30');
      assert.strictEqual(res.answers, 0);
    });
    await test('D5 · cron Worker HANYA mempurge (tabel dibangun GitHub Actions), saklar apa pun', async () => {
      const W = await import(pathToFileURL(path.join(root, 'workers/api/route-wiring.js')).href);
      const db = makeD1([MIG, MIG16]);
      await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-05-01', 'PR-101:apply_form', 14, 1, 1).run();
      await db.prepare(store.SQL.upsertItemPoolProbeDaily).bind('2026-05-01', 12, 3, 2).run();
      const off = await W.runItemPoolRollup({ EVIDENCE_DB: db }, NOW);
      assert.deepStrictEqual(plain(off), { purge: { dedup: 0, daily: 1, probe: 1 } });
      const on = await W.runItemPoolRollup({ EVIDENCE_DB: db, ITEM_POOL_ENABLED: 'on' }, NOW);
      assert.deepStrictEqual(plain(on), { purge: { dedup: 0, daily: 0, probe: 0 } });
      assert.deepStrictEqual(plain(await W.runItemPoolRollup({}, NOW)), { skipped: 'no_binding' });
      const bare = await W.runItemPoolRollup({ EVIDENCE_DB: makeD1([]) }, NOW);
      assert.ok(bare.purge && bare.purge.error, 'migrasi belum diterapkan harus tertangkap sebagai {error}, bukan melempar');
      const only15 = await W.runItemPoolRollup({ EVIDENCE_DB: makeD1([MIG]) }, NOW);
      assert.deepStrictEqual(plain(only15), { purge: { dedup: 0, daily: 0, probe: null } }, 'tabel probe belum ada tidak boleh menggagalkan purge lainnya');
      assert.ok(!/rebuildItemPoolTable/.test(wiring), 'cron Worker masih membangun tabel (melewati 10 ms CPU)');
    });
    await test('D4 · purge: dedup > 60 hari dan penghitung > 120 hari terhapus, yang baru tetap', async () => {
      const db = makeD1([MIG]);
      await db.prepare(store.SQL.insertItemPoolEventId).bind(uuid(), uuid(), '2026-07-20').run();
      await db.prepare(store.SQL.insertItemPoolEventId).bind(uuid(), uuid(), '2026-08-01').run();
      await db.prepare(store.SQL.insertItemPoolEventId).bind(uuid(), uuid(), '2026-09-25').run();
      await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-05-01', 'PR-101:apply_form', 14, 1, 1).run();
      await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-09-01', 'PR-101:apply_form', 14, 1, 1).run();
      const out = await store.purgeItemPool(db, '2026-09-27');
      assert.deepStrictEqual(out, { dedup: 1, daily: 1, probe: null });
    });

    /* ---------------------------------------------------------- rute */
    const req = (method, body) => new Request('https://api.fiezel.my.id' + (method === 'GET' ? route.ITEM_DIFFICULTY_PATH : route.ITEM_EVIDENCE_PATH), {
      method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.' + (uuidN % 250) }, body: body ? JSON.stringify(body) : undefined
    });
    await test('R1 · saklar MATI (default): POST 202 disabled tanpa tulis, GET tabel kosong', async () => {
      const db = makeD1([MIG]);
      const env = { EVIDENCE_DB: db };
      const p = await route.handleItemEvidence(req('POST', goodBody()), env, null, NOW);
      assert.strictEqual(p.status, 202); assert.strictEqual((await p.json()).disabled, true);
      assert.strictEqual(db._raw.prepare('SELECT COUNT(*) AS c FROM item_pool_dedup').get().c, 0);
      const g = await route.handleItemDifficulty(req('GET'), env);
      const j = await g.json();
      assert.deepStrictEqual(j.items, {}); assert.strictEqual(j.disabled, true);
      assert.match(fs.readFileSync(path.join(root, 'workers/api/wrangler.toml'), 'utf8'), /^ITEM_POOL_ENABLED\s*=\s*"(off|on)"/m);
    });
    await test('R2 · saklar HIDUP: POST menulis; kiriman ulang = 200 duplicate; GET mengembalikan tabel ber-cache', async () => {
      const db = makeD1([MIG]);
      const env = { EVIDENCE_DB: db, ITEM_POOL_ENABLED: 'on' };
      const body = goodBody();
      const waits = [];
      const ctx = { waitUntil: (p) => waits.push(p) };
      const p1 = await route.handleItemEvidence(req('POST', body), env, ctx, NOW);
      await Promise.all(waits);
      assert.strictEqual(p1.status, 202);
      const p2 = await route.handleItemEvidence(req('POST', body), env, ctx, NOW);
      assert.strictEqual(p2.status, 200); assert.strictEqual((await p2.json()).duplicate, true);
      assert.strictEqual(db._raw.prepare('SELECT SUM(n) AS n FROM item_pool_daily').get().n, 2);
      const g = await route.handleItemDifficulty(req('GET'), env);
      assert.match(g.headers.get('cache-control'), /max-age=3600/);
      assert.strictEqual((await g.json()).schema, 'fiezel-item-difficulty-v1');
    });
    await test('R3 · migrasi belum diterapkan: GET tabel kosong (bukan 500), POST 503 (bukan mengaku diterima)', async () => {
      const bare = makeD1([]);
      const env = { EVIDENCE_DB: bare, ITEM_POOL_ENABLED: 'on' };
      const g = await route.handleItemDifficulty(req('GET'), env);
      assert.strictEqual(g.status, 200); assert.deepStrictEqual((await g.json()).items, {});
      const p = await route.handleItemEvidence(req('POST', goodBody()), env, null, NOW);
      assert.strictEqual(p.status, 503);
    });
  }
  await test('R4 · rute terdaftar di route-wiring + cron harian membangun tabel dan mempurge', () => {
    assert.ok(/registerItemPoolRoutes\(collector\(routes, wrapEvidence\)\)/.test(wiring), 'rute tidak dipasang');
    assert.ok(/out\.itemPool = await runItemPoolRollup\(env, at\)/.test(wiring), 'cron tidak memanggil runItemPoolRollup');
  });

  /* ------------------------------------------------------------ privasi */
  await test('P1 · migrasi 0015 tanpa kolom penghubung (cohort/user/install/ip/token/timestamp)', () => {
    const ddl = fs.readFileSync(MIG, 'utf8').split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    const cols = [];
    for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS\s+\w+\s*\(([\s\S]*?)\)\s*WITHOUT ROWID/g)) {
      for (const line of m[1].split('\n')) { const w = line.trim().split(/\s+/)[0]; if (w && w !== 'PRIMARY') cols.push(w.toLowerCase()); }
    }
    assert.deepStrictEqual([...new Set(cols)].sort(), ['batch_id', 'day', 'delta_milli', 'event_id', 'item_id', 'k', 'n', 'pb']);
  });
  await test('P2 · store lane ini tidak menyebut tabel lane lain (terutama evidence_learner_day)', () => {
    const sql = Object.values(store.SQL).join(' ');
    for (const t of store.ITEM_POOL_FORBIDDEN_TABLES) assert.ok(!new RegExp('\\b' + t + '\\b').test(sql), t);
    const tables = new Set((sql.match(/\b(?:FROM|INTO)\s+([a-z_]+)/gi) || []).map((m) => m.split(/\s+/)[1]));
    assert.deepStrictEqual([...tables].sort(), [...store.ITEM_POOL_TABLES].sort());
  });
  await test('P3 · perangkat mengirim/membaca TANPA cookie dan tanpa pengenal', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const at = app.indexOf('function itemPoolFlush(');
    const body = app.slice(at, app.indexOf('function itemPoolSync(', at));
    assert.strictEqual((body.match(/credentials:'omit'/g) || []).length, 2, 'kiriman dan bacaan wajib credentials:omit');
    assert.ok(!/cohort|installId|userName|identity/i.test(body), 'jalur kirim menyebut pengenal');
  });
  await test('P4 · rute server tidak membaca identitas/cookie sama sekali', () => {
    const src = fs.readFileSync(path.join(root, 'workers/api/evidence/route-item-pool.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!/cookie|identity|\.sub\b|authorization/i.test(src), 'rute menyentuh identitas');
  });

  /* ------------------------------------------------------------ paritas */
  await test('K1 · konstanta perangkat == server (skema, 3PL, bucket, pola ID, mode, ambang, batas)', () => {
    assert.strictEqual(Pool.EVIDENCE_SCHEMA, core.ITEM_EVIDENCE_SCHEMA);
    assert.strictEqual(Pool.TABLE_SCHEMA, core.ITEM_TABLE_SCHEMA);
    assert.strictEqual(Pool.DISCRIMINATION, core.DISCRIMINATION);
    assert.strictEqual(Pool.GUESS_FLOOR, core.GUESS_FLOOR);
    assert.strictEqual(Pool.P_BUCKETS, core.P_BUCKETS);
    assert.strictEqual(Pool.SOURCE_RE.source, core.SOURCE_RE.source);
    assert.deepStrictEqual([...Pool.MODES], [...core.MODES]);
    assert.strictEqual(Pool.APPLY.MIN_N, core.ESTIMATOR.MIN_N);
    assert.strictEqual(Pool.APPLY.BOUND, core.ESTIMATOR.BOUND);
    assert.strictEqual(Pool.LIMITS.MAX_ITEMS_PER_EVENT, core.ITEM_POOL_LIMITS.MAX_ITEMS_PER_EVENT);
    assert.strictEqual(Pool.LIMITS.MAX_EVENTS_PER_BATCH, core.ITEM_POOL_LIMITS.MAX_EVENTS);
    assert.strictEqual(Pool.LIMITS.OUTBOX_DAYS, core.ITEM_POOL_LIMITS.DAY_WINDOW);
    assert.strictEqual(core.ITEM_POOL_LIMITS.DAY_WINDOW, core.ESTIMATOR.WINDOW_DAYS);
    assert.ok(core.ITEM_POOL_LIMITS.DEDUP_TTL_DAYS > core.ITEM_POOL_LIMITS.DAY_WINDOW, 'dedup dipurge sebelum jendela kirim ulang habis = hitungan ganda');
    const Brain = require(path.join(root, 'features/brain/fiezel-core-brain.js'));
    assert.ok(Math.abs(Brain.successProbability(3, 3) - P3(3, 3)) < 1e-9, '3PL perangkat berbeda dari asumsi penaksir');
  });
  await test('K2 · MODES mencakup semua mode latihan grammar app.js (mode baru tidak boleh hilang diam-diam)', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const m = app.match(/const GRAMMAR_PRACTICE_MODES=\[([\s\S]*?)\];/);
    const modes = m[1].match(/'([a-z_0-9]+)'/g).map((x) => x.slice(1, -1));
    for (const mode of modes) assert.ok(Pool.MODES.includes(mode), 'mode tanpa jalur gabungan: ' + mode);
  });

  /* ------------------------------------------------------------ app.js sungguhan */
  const store2 = {}, els = {};
  function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} }); }
  const document = { baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } } };
  const localStorage = { getItem: (k) => (Object.prototype.hasOwnProperty.call(store2, k) ? store2[k] : null), setItem: (k, v) => { store2[k] = String(v); }, removeItem: (k) => { delete store2[k]; } };
  localStorage.setItem('fiezel-v4-state', JSON.stringify({ version: '5.19.0', userName: 'Rani', view: 'home', level: 3, placementDone: true, totalAnswered: 0, totalCorrect: 0, totalTimeMs: 0, history: [], wrongAnswers: [], vocab: {}, grammar: {}, reading: {}, daily: { date: '', count: 0, attempts: 0 }, streak: 0, adaptiveReady: true, confidenceHistory: [], learningDays: [], sessionHistory: [], adaptivePolicyMeta: { history: [] }, policyOutcomeMeta: { history: [], queue: [] } }));
  const calls = [];
  let reply = { status: 202, body: { ok: true, accepted: 1 } };
  const fetch = async (u, init) => {
    const url = String(u);
    if (url.startsWith('https://api.fiezel.my.id/')) {
      calls.push({ url, init });
      const r = typeof reply === 'function' ? reply(url, init) : reply;
      return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
    }
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, url.split('/').pop()), 'utf8')) };
  };
  const context = { console: { ...console, warn() {}, error() {} }, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout: () => 0, clearTimeout() {}, setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }, crypto: require('crypto').webcrypto };
  context.window = context; context.self = context; context.FIEZEL_VERSION = '5.19.0';
  context.FIEZEL_CORE_CONFIG = { workerUrl: '', protocolVersion: '1.7', aiGateway: 'core-only', remotePushRequired: true };
  context.window.scrollTo = () => {};
  vm.createContext(context);
  const run = (rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
  run('features/i18n/fiezel-i18n.js');
  for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort()) run('features/i18n/' + n);
  for (const f of ['features/telemetry/fiezel-telemetry-config.js', 'features/brain/fiezel-core-brain.js', 'features/brain/fiezel-item-prior.js', 'features/brain/fiezel-item-calibration.js', 'features/brain/fiezel-item-pool.js']) run(f);
  run('app.js');
  await new Promise((r) => global.setTimeout(r, 50));
  const A = context.__fiezelAudit;
  const poolKey = () => Object.keys(store2).find((k) => k.startsWith('fiezel-item-pool-v1'));
  const q = (src, mode, extra = {}) => ({ type: 'grammar', level: 'B1', sourceId: src, practiceMode: mode, difficulty: 3, ...extra });

  await test('A1 · jawaban grammar dengan prediksi prior -> satu catatan; jawaban kedua tidak', () => {
    assert.strictEqual(A.itemPoolObserve(q('PR-101', 'apply_form', { __predictedPrior: 0.66 }), true), true);
    assert.strictEqual(A.itemPoolObserve(q('PR-101', 'apply_form', { __predictedPrior: 0.66 }), false), false);
    const st = JSON.parse(store2[poolKey()]);
    const day = Object.keys(st.pending)[0];
    assert.deepStrictEqual(plain(st.pending[day]), { 'PR-101:apply_form': [13, 1] });
  });
  await test('A2 · tes penempatan (prediksi null) tidak dikirim tetapi soal ditandai terlihat', () => {
    assert.strictEqual(A.itemPoolObserve(q('PR-102', 'apply_form', { __predictedPrior: null }), true), false);
    const st = JSON.parse(store2[poolKey()]);
    assert.ok(st.seen['PR-102:apply_form']);
    assert.ok(!Object.values(st.pending).some((b) => 'PR-102:apply_form' in b));
  });
  await test('A3 · prediksi prior memakai prior KANONIK dan butuh kemampuan yang cukup yakin', () => {
    const prior = A.itemPoolCanonicalPrior(q('PR-101', 'apply_form'));
    assert.strictEqual(prior, context.FiezelItemPrior.difficultyFor({ level: 'B1', mode: 'apply_form', domain: 'grammar' }));
    assert.strictEqual(A.itemPoolCanonicalPrior({ type: 'vocab', level: 'B1' }), null);
    // State kosong: kemampuan belum yakin -> tidak ada prediksi, jadi tidak ada kiriman.
    assert.strictEqual(A.itemPoolPriorPrediction(q('PR-101', 'apply_form')), null);
  });
  await test('A4 · kirim: disabled -> SIMPAN; 202 -> ack; 400 -> buang; 503 -> backoff', async () => {
    reply = { status: 202, body: { ok: true, accepted: 0, disabled: true } };
    let r = await A.itemPoolFlush(NOW);
    assert.strictEqual(r.disabled, true);
    let st = JSON.parse(store2[poolKey()]);
    assert.strictEqual(st.outbox.length, 1, 'catatan dibuang saat server belum dinyalakan');
    assert.ok(st.nextTryAt >= NOW + 12 * 3600000 - 1);
    const sent = JSON.parse(calls[calls.length - 1].init.body);
    assert.strictEqual(calls[calls.length - 1].init.credentials, 'omit');
    assert.deepStrictEqual(Object.keys(sent).sort(), ['batchId', 'events', 'pv', 'schema']);
    reply = { status: 202, body: { ok: true, accepted: 1 } };
    r = await A.itemPoolFlush(NOW + 13 * 3600000);
    st = JSON.parse(store2[poolKey()]);
    assert.strictEqual(st.outbox.length, 0);
    const again = JSON.parse(calls[calls.length - 1].init.body);
    assert.strictEqual(again.events[0].eventId, sent.events[0].eventId, 'kiriman ulang harus membawa eventId yang sama');
    A.itemPoolObserve(q('PR-103', 'apply_form', { __predictedPrior: 0.5 }), true);
    reply = { status: 503, body: null };
    await A.itemPoolFlush(NOW + 14 * 3600000);
    st = JSON.parse(store2[poolKey()]);
    assert.strictEqual(st.outbox.length, 1); assert.ok(st.nextTryAt > NOW + 14 * 3600000);
    reply = { status: 400, body: { ok: false, error: 'bad_items' } };
    await A.itemPoolFlush(st.nextTryAt + 1);
    assert.strictEqual(JSON.parse(store2[poolKey()]).outbox.length, 0, 'batch cacat diulang selamanya');
  });
  await test('A5 · tabel gabungan diterapkan lewat itemCalibrationEffective; tabel kosong = perilaku lama', async () => {
    const it = q('PR-101', 'apply_form');
    const prior = A.itemPoolCanonicalPrior(it);
    reply = (url) => ({ status: 200, body: { schema: 'fiezel-item-difficulty-v1', day: '2026-09-27', items: { 'PR-101:apply_form': { d: 0.5, n: 44 } } } });
    await A.itemPoolRefreshTable(NOW);
    assert.strictEqual(calls[calls.length - 1].init.credentials, 'omit');
    assert.ok(Math.abs(A.itemCalibrationEffective(it, prior) - (prior + 0.5)) < 1e-9);
    // Dibaca paling sering sekali sehari.
    const before = calls.length;
    await A.itemPoolRefreshTable(NOW + 3600000);
    assert.strictEqual(calls.length, before);
    // Lane dimatikan server: tabel kosong MENGGANTI tabel lama.
    reply = { status: 200, body: { schema: 'fiezel-item-difficulty-v1', day: null, items: {}, disabled: true } };
    await A.itemPoolRefreshTable(NOW + 2 * DAY);
    assert.strictEqual(A.itemCalibrationEffective(it, prior), null);
  });

  await test('W1 · record() mencatat grammar DAN cloze; draw() memberi prediksi prior (bukan saat penempatan)', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const rec = app.slice(app.indexOf('function record(q,ok,ms,selectedIndex){'), app.indexOf('\nfunction ', app.indexOf('function record(q,ok,ms,selectedIndex){') + 10));
    const g = rec.slice(rec.indexOf("if(q.type==='grammar'){"), rec.indexOf("if(q.type==='cloze'){"));
    const c = rec.slice(rec.indexOf("if(q.type==='cloze'){"), rec.indexOf('state.wrongAnswers.push'));
    assert.ok(/itemPoolObserve\(q,ok\)/.test(g), 'jawaban grammar tidak dicatat');
    assert.ok(/itemPoolObserve\(q,ok\)/.test(c), 'jawaban cloze tidak dicatat');
    assert.ok(/q\.__predictedPrior=\(!cfg\.placement&&/.test(app), 'draw() tidak memberi prediksi prior, atau memberi saat penempatan');
    assert.ok(/function braincoreEvidenceObserveSession\(outcome,nowMs=Date\.now\(\)\)\{[^]*?itemPoolSync\(nowMs\);[^]*?if\(!braincoreEvidenceAnyLaneActive\(\)\)return;/.test(app), 'akhir sesi tidak mengirim, atau gerbang lane bukti ikut mematikannya');
    assert.ok(/const pooled=itemPoolEffective\(q\);\s*if\(pooled!=null\)return pooled;/.test(app), 'tabel gabungan tidak diterapkan di itemCalibrationEffective');
  });
  await test('CI · gerbang ini terdaftar di quality.yml', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
    assert.ok(wf.includes('node tests/item-pool-test.js'), 'gate yang tidak berjalan di CI bukan gate');
  });

  console.log('');
  if (failures) { console.error('FIEZEL item pool: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
  console.log('FIEZEL item pool: PASS (' + checks + ' uji · kesulitan soal dari semua murid)');
})().catch((e) => { console.error(e); process.exit(1); });
