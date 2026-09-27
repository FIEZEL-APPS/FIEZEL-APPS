#!/usr/bin/env node
/**
 * tests/brain-param-tune-test.js — GERBANG: ANGKA RUMUS DISETEL DARI DATA (Braincore langkah 3).
 *
 * Roadmap OWNER langkah 3: "Angka-angka rumus disetel dari data, bukan ditebak."
 * tools/brain-param-tune.mjs mengusulkan a (ketajaman soal), c (peluang tebak), dan
 * paruh-waktu ingatan dasar dari penghitung anonim; tools/item-pool-job.mjs menjalankannya di
 * GitHub Actions bersama pembangunan tabel kesulitan soal (dipindah dari cron Worker: 10 ms CPU).
 *
 * YANG DIKUNCI
 *   T1  dunia TANPA masalah (juga dengan taksiran kemampuan berderau): NOL usulan;
 *   T2  a/c yang memang meleset: usulan ke arah yang benar;
 *   T3  paruh-waktu: murid ingat 1.5x lebih lama -> usulan naik; ingatan sesuai -> tidak ada;
 *   T4  RED: tanpa gerbang selang bootstrap, dunia berderau AKAN mengusulkan perubahan palsu;
 *   T5  angka sekarang & batas = FiezelBrainConfig + FiezelCoreBrain (paritas);
 *   T6  CODE_SITES menunjuk tempat angka itu benar-benar ditulis;
 *   J1-J3 job: D1 sungguhan (node:sqlite, migrasi 0015+0016) -> tabel ditulis, laporan
 *          berbahasa Indonesia; saklar mati = keluar sukses tanpa menyentuh apa pun;
 *   W1  workflow: terjadwal + manual, contents:read saja, rahasia hanya di langkah job;
 *   P1-P4 probe: perangkat mengagregasi tanpa ID, server menerima/menolak, versi konstanta lama
 *          dibuang, kolom 0016 tanpa penghubung;
 *   A1  app.js: draw() memberi retrievability probe, record() mencatatnya;
 *   CI  gerbang terdaftar di quality.yml.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), assert = require('assert');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const root = __fzRoot;

let failures = 0, checks = 0;
async function test(name, fn) {
  checks++;
  try { await fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n    ') : e)); }
}
const plain = (v) => JSON.parse(JSON.stringify(v));

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const P3 = (a, c, th, b) => c + (1 - c) / (1 + Math.exp(-a * (th - b)));

/**
 * Dunia sintetis. Perangkat SELALU memprediksi dengan a=1.5, c=0.25 (angka sekarang); dunia
 * sebenarnya memakai aT/cT. 30% soal meleset label +/-0.8, taksiran kemampuan bias +0.2
 * (+ derau opsional). Probe: 3/7/21 hari, stabilitas prediksi ~4 hari, ingatan sebenarnya
 * kT x lebih lama, plafon "masih bisa" q ~ U(0.8, 1).
 */
function world(seed, { learners = 300, items = 240, aT = 1.5, cT = 0.25, bias = 0.2, noise = 0, kT = 1, probes = 1500 } = {}) {
  const r = rng(seed);
  const g = () => { const u = r() || 1e-9, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const it = [];
  for (let i = 0; i < items; i++) { const prior = 1 + r() * 4; const err = r() < 0.3 ? (r() < 0.5 ? -0.8 : 0.8) : 0; it.push({ id: 'PR-' + String(100 + i).padStart(3, '0') + ':apply_form', prior, b: prior + err }); }
  const agg = new Map();
  for (let l = 0; l < learners; l++) {
    const th = 3 + g(), est = th + bias + noise * g();
    const cand = it.filter((x) => Math.abs(x.prior - est) < 1.5);
    for (let j = 0; j < 40 && cand.length; j++) {
      const x = cand.splice(Math.floor(r() * cand.length), 1)[0];
      const pb = Math.min(19, Math.floor(P3(1.5, 0.25, est, x.prior) * 20));
      const fold = Math.floor(r() * 2), key = fold + '|' + x.id + '|' + pb;
      const o = agg.get(key) || { fold, item_id: x.id, pb, n: 0, k: 0 };
      o.n++; o.k += r() < P3(aT, cT, th, x.b) ? 1 : 0; agg.set(key, o);
    }
  }
  const pr = new Map();
  for (let i = 0; i < probes; i++) {
    const off = [3, 7, 21][i % 3] + r() * 2;
    const h = Math.exp(Math.log(4) + 0.8 * ((r() + r() + r()) - 1.5));
    const R = Math.pow(2, -off / h), Rt = Math.pow(2, -off / (kT * h)), q = 0.8 + 0.2 * r();
    const y = r() < cT + (1 - cT) * q * Rt ? 1 : 0;
    const rb = Math.min(19, Math.floor(R * 20)), day = '2026-10-' + String(1 + Math.floor(r() * 28)).padStart(2, '0');
    const key = day + '|' + rb, o = pr.get(key) || { day, rb, n: 0, k: 0 };
    o.n++; o.k += y; pr.set(key, o);
  }
  return { foldRows: [...agg.values()], probeRows: [...pr.values()] };
}

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
    async batch(list) { const out = []; for (const s of list) out.push(await s.run()); return out; },
    /** Antarmuka klien job ({ query }) di atas SQLite yang sama. */
    client() {
      return {
        async query(sql, params = []) {
          const st = db.prepare(sql);
          if (/^\s*select/i.test(sql)) return st.all(...params.map(norm)).map((r) => ({ ...r }));
          st.run(...params.map(norm));
          return [];
        }
      };
    }
  };
}
const MIG15 = path.join(root, 'workers/api/migrations/0015_item_pool.sql');
const MIG16 = path.join(root, 'workers/api/migrations/0016_item_pool_probe.sql');

(async () => {
  const T = await import(pathToFileURL(path.join(root, 'tools/brain-param-tune.mjs')).href);
  const J = await import(pathToFileURL(path.join(root, 'tools/item-pool-job.mjs')).href);
  const core = await import(pathToFileURL(path.join(root, 'workers/api/evidence/item-pool-core.js')).href);
  const store = await import(pathToFileURL(path.join(root, 'workers/api/evidence/item-pool-store-d1.js')).href);
  const route = await import(pathToFileURL(path.join(root, 'workers/api/evidence/route-item-pool.js')).href);
  const Pool = require(path.join(root, 'features/brain/fiezel-item-pool.js'));
  const quick = { bootstrap: 200 };

  await test('T1 · dunia tanpa masalah (juga kemampuan berderau): NOL usulan', () => {
    for (const [seed, opts] of [[3, {}], [5, {}], [3, { noise: 0.3 }], [7, { bias: -0.4 }]]) {
      const w = world(seed, opts);
      const res = T.tune(w.foldRows, w.probeRows, { ...quick, day: '2026-10-30' });
      assert.deepStrictEqual(res.proposals, [], 'usulan palsu di dunia ' + JSON.stringify({ seed, ...opts }) + ': ' + JSON.stringify(res.proposals));
    }
  });
  await test('T2 · a/c yang memang meleset (1.2 / 0.2): usulan turun ke arah yang benar', () => {
    const w = world(3, { aT: 1.2, cT: 0.2 });
    const res = T.tune(w.foldRows, w.probeRows, { ...quick, day: '2026-10-30' });
    const a = res.proposals.find((p) => p.param === 'discrimination'), c = res.proposals.find((p) => p.param === 'guessFloor');
    assert.ok(a && a.to < 1.5 && a.to >= 1.0, 'a tidak diusulkan turun: ' + JSON.stringify(res.proposals));
    assert.ok(c && c.to < 0.25, 'c tidak diusulkan turun: ' + JSON.stringify(res.proposals));
    assert.ok(res.link.ci[0] > 0, 'usulan tanpa perbaikan yang meyakinkan');
  });
  await test('T3 · paruh-waktu: ingat 1.5x lebih lama -> usulan naik; ingatan sesuai -> tidak', () => {
    const up = world(3, { kT: 1.5 });
    const res = T.tune(up.foldRows, up.probeRows, { ...quick, day: '2026-10-30' });
    const h = res.proposals.find((p) => p.param === 'baseHalfLifeDays');
    assert.ok(h && h.to > 1.6 * 1.25 && h.to < 1.6 * 1.8, 'paruh-waktu tidak diusulkan naik dengan benar: ' + JSON.stringify(res.proposals));
    const same = world(3, { kT: 1 });
    const r2 = T.fitProbeMemory(same.probeRows, quick);
    assert.ok(r2.ci[0] <= 1 && r2.ci[1] >= 1, 'selang k dunia tanpa masalah tidak memuat 1: ' + JSON.stringify(r2));
  });
  await test('T4 · RED: tanpa gerbang selang bootstrap, dunia berderau mengusulkan perubahan palsu', () => {
    const w = world(3, { noise: 0.3 });
    const link = T.cvTuneLink(w.foldRows, quick);
    const naive = link.best.a !== 1.5 || link.best.c !== 0.25;
    assert.ok(naive, 'dunia uji tidak lagi membedakan: kandidat terbaik sama dengan angka sekarang');
    assert.ok(!(link.ci[0] > 0), 'selang bootstrap harus memuat 0 di dunia ini: ' + JSON.stringify(link.ci));
    assert.deepStrictEqual(T.propose(link, { n: 0 }).proposals, [], 'gerbang tidak menahan usulan palsu');
  });
  await test('T5 · angka sekarang & batas = FiezelBrainConfig + FiezelCoreBrain', () => {
    const Cfg = require(path.join(root, 'features/brain/fiezel-brain-config.js'));
    const Brain = require(path.join(root, 'features/brain/fiezel-core-brain.js'));
    assert.strictEqual(T.CURRENT.discrimination, Cfg.DEFAULTS.difficulty.discrimination);
    assert.strictEqual(T.CURRENT.guessFloor, Cfg.DEFAULTS.difficulty.guessFloor);
    assert.strictEqual(T.CURRENT.baseHalfLifeDays, Cfg.DEFAULTS.memory.baseHalfLifeDays);
    assert.deepStrictEqual(plain(T.BOUNDS.discrimination), plain(Cfg.BOUNDS.difficulty.discrimination));
    assert.deepStrictEqual(plain(T.BOUNDS.guessFloor), plain(Cfg.BOUNDS.difficulty.guessFloor));
    assert.deepStrictEqual(plain(T.BOUNDS.baseHalfLifeDays), plain(Cfg.BOUNDS.memory.baseHalfLifeDays));
    const p = Brain.successProbability(3, 3);
    assert.ok(Math.abs(p - (T.CURRENT.guessFloor + (1 - T.CURRENT.guessFloor) * 0.5)) < 1e-9, 'lantai tebakan core-brain berbeda');
    for (const a of T.GRID.a) assert.ok(a >= T.BOUNDS.discrimination.min && a <= T.BOUNDS.discrimination.max);
    for (const c of T.GRID.c) assert.ok(c >= T.BOUNDS.guessFloor.min && c <= T.BOUNDS.guessFloor.max);
    assert.strictEqual(core.PARAM_VERSION, 'a' + T.CURRENT.discrimination + '-c' + T.CURRENT.guessFloor + '-h' + T.CURRENT.baseHalfLifeDays, 'PARAM_VERSION tidak mengikuti angka sekarang');
  });
  await test('T6 · CODE_SITES menunjuk tempat angka itu benar-benar ditulis', () => {
    for (const [param, sites] of Object.entries(T.CODE_SITES)) {
      for (const site of sites) {
        const [file, ...names] = site.split(' ');
        const src = fs.readFileSync(path.join(root, file), 'utf8');
        for (const name of names.join(' ').split(/\s*\+\s*/)) {
          const key = name.split('.').pop();
          assert.ok(src.includes(key), param + ': ' + file + ' tidak memuat ' + key);
        }
      }
    }
  });

  const hasSqlite = (() => { try { return typeof require('node:sqlite').DatabaseSync === 'function'; } catch { return false; } })();
  await test('J0 · node:sqlite tersedia', () => assert.ok(hasSqlite));
  if (hasSqlite) {
    await test('J1 · job: penghitung D1 sungguhan -> tabel ditulis + laporan Indonesia', async () => {
      const db = makeD1([MIG15, MIG16]);
      const w = world(4);
      // Taruh setiap sel di hari yang paritasnya sesuai lipatannya (hari genap/ganjil setelah epoch).
      for (const r of w.foldRows) {
        const day = r.fold === 0 ? '2026-10-02' : '2026-10-03';
        await db.prepare(store.SQL.upsertItemPoolDaily).bind(day, r.item_id, r.pb, r.n, r.k).run();
      }
      for (const r of w.probeRows) await db.prepare(store.SQL.upsertItemPoolProbeDaily).bind(r.day, r.rb, r.n, r.k).run();
      const folds = db._raw.prepare(store.SQL.selectItemPoolWindowByFold).all('2026-09-27');
      assert.ok(folds.some((r) => r.fold === 0) && folds.some((r) => r.fold === 1), 'lipatan hari genap/ganjil tidak terbentuk');
      const res = await J.runJob({ client: db.client(), today: '2026-10-30' });
      assert.ok(res.table.published > 20, 'tabel tidak terbit: ' + JSON.stringify(res.table));
      const rows = db._raw.prepare('SELECT COUNT(*) AS c FROM item_pool_table WHERE day = ?').get('2026-10-30').c;
      assert.strictEqual(rows, res.table.published);
      assert.match(res.report, /usulan penyetelan angka rumus/);
      assert.match(res.report, /Tidak ada usulan|Usulan \(butuh persetujuan owner\)/);
      assert.deepStrictEqual(res.tuning.proposals, [], 'dunia tanpa masalah menghasilkan usulan');
    });
    await test('J2 · job: tabel probe belum ada (migrasi 0016 belum diterapkan) tidak menggagalkan tabel', async () => {
      const db = makeD1([MIG15]);
      await db.prepare(store.SQL.upsertItemPoolDaily).bind('2026-10-02', 'PR-101:apply_form', 14, 3, 2).run();
      const res = await J.runJob({ client: db.client(), today: '2026-10-30' });
      assert.strictEqual(res.tuning.memory.n, 0);
      assert.ok(res.tuning.held.some((h) => h.param === 'baseHalfLifeDays' && h.reason === 'insufficient_data'));
    });
  }
  await test('J3 · saklar: hanya ITEM_POOL_ENABLED = "on" yang menjalankan job; "off" keluar sukses tanpa rahasia', () => {
    assert.strictEqual(J.itemPoolFlagOn('ITEM_POOL_ENABLED = "on"\n'), true);
    assert.strictEqual(J.itemPoolFlagOn('ITEM_POOL_ENABLED = "off"\n'), false);
    assert.strictEqual(J.itemPoolFlagOn('# ITEM_POOL_ENABLED = "on"\n'), false);
    const tmp = path.join(require('os').tmpdir(), 'fz-item-pool-off-' + process.pid + '.toml');
    fs.writeFileSync(tmp, 'ITEM_POOL_ENABLED = "off"\n');
    try {
      const run = spawnSync(process.execPath, [path.join(root, 'tools/item-pool-job.mjs'), '--today', '2026-10-30', '--toml', tmp], { encoding: 'utf8', env: { PATH: process.env.PATH } });
      assert.strictEqual(run.status, 0, run.stderr);
      assert.match(run.stdout, /belum "on"/);
    } finally { fs.unlinkSync(tmp); }
    // Saklar "on" tanpa rahasia: GAGAL keras (merah di Actions), bukan diam-diam sukses.
    const on = spawnSync(process.execPath, [path.join(root, 'tools/item-pool-job.mjs'), '--today', '2026-10-30'], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    if (J.itemPoolFlagOn(fs.readFileSync(path.join(root, 'workers/api/wrangler.toml'), 'utf8'))) {
      assert.notStrictEqual(on.status, 0, 'job tanpa rahasia mengaku sukses');
      assert.match(on.stderr, /CLOUDFLARE_API_TOKEN/);
    }
  });
  if (hasSqlite) {
    await test('J5 · migrasi 0016 belum diterapkan: kiriman dengan probe TIDAK menghilangkan hitungan soal', async () => {
      const db = makeD1([MIG15]);
      const ev = [{ eventId: '00000000-0000-4000-8000-000000000333', day: '2026-10-05', items: [['PR-101:apply_form', 14, 1]], probes: [[12, 2, 1]] }];
      const n = await store.applyItemPoolAggregate(db, ev);
      assert.strictEqual(n, 1);
      assert.strictEqual(db._raw.prepare('SELECT SUM(n) AS n FROM item_pool_daily').get().n, 1);
    });
  }
  await test('J4 · rencana tulis menolak nilai yang tidak sah (tidak ada SQL dari data mentah)', () => {
    assert.throws(() => store.tableWritePlan({ items: { "PR-101:apply_form'); DROP TABLE x;--": { d: 0.3, n: 30 } } }, '2026-10-30'));
    assert.throws(() => store.tableWritePlan({ items: { 'PR-101:apply_form': { d: 'x', n: 30 } } }, '2026-10-30'));
    const plan = store.tableWritePlan({ items: { 'PR-101:apply_form': { d: -0.35, n: 44 } } }, '2026-10-30');
    assert.match(plan[0].sql, /\('PR-101:apply_form',-350,44,'2026-10-30'\)/);
  });

  await test('W1 · workflow: terjadwal + manual, contents:read saja, rahasia hanya di langkah job', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/braincore-item-pool.yml'), 'utf8');
    assert.match(wf, /schedule:\s*\n\s*- cron:/);
    assert.match(wf, /workflow_dispatch:/);
    assert.match(wf, /permissions:\s*\n\s*contents: read\s*\n/);
    assert.ok(!/pull-requests:\s*write|contents:\s*write|issues:\s*write/.test(wf), 'workflow meminta izin tulis');
    assert.match(wf, /node tools\/item-pool-job\.mjs/);
    assert.strictEqual((wf.match(/secrets\.CLOUDFLARE_API_TOKEN/g) || []).length, 1);
  });

  await test('P1 · perangkat: probe teragregasi per hari [bucket R -> n, benar], tanpa ID soal/lesson', () => {
    let st = null;
    const t = Date.parse('2026-10-05T08:00:00Z');
    st = Pool.observeProbe(st, { rProbe: 0.62, ok: true }, t).state;
    st = Pool.observeProbe(st, { rProbe: 0.63, ok: false }, t + 60000).state;
    st = Pool.observeProbe(st, { rProbe: 0.31, ok: true }, t + 120000).state;
    assert.deepStrictEqual(plain(st.probes), { '2026-10-05': { 12: [2, 1], 6: [1, 1] } });
    let n = 0;
    st = Pool.seal(st, t + 3600000, () => '00000000-0000-4000-8000-' + String(++n).padStart(12, '0'));
    const env = Pool.envelope(st, '00000000-0000-4000-8000-999999999999');
    assert.strictEqual(env.pv, core.PARAM_VERSION);
    assert.deepStrictEqual(plain(env.events[0].probes).sort((a, b) => a[0] - b[0]), [[6, 1, 1], [12, 2, 1]]);
    assert.ok(!JSON.stringify(env).match(/lesson|skill|:apply_form/), 'amplop probe membawa identitas soal');
  });
  await test('P2 · server: probe sah diterima; baris cacat dibuang; versi konstanta lama dibuang seluruhnya', () => {
    const NOW = Date.parse('2026-10-05T10:00:00Z');
    const body = (extra = {}) => ({ schema: 'fiezel-item-evidence-v1', batchId: '00000000-0000-4000-8000-000000000abc', ...extra, events: [{ eventId: '00000000-0000-4000-8000-000000000def', day: '2026-10-05', items: [], probes: [[12, 2, 1], [6, 1, 1], [25, 1, 1], [7, 1, 2]] }] });
    const ok = core.normalizeItemEnvelope(body({ pv: core.PARAM_VERSION }), NOW);
    assert.strictEqual(ok.ok, true); assert.strictEqual(ok.dropped, 2);
    assert.deepStrictEqual(plain(core.aggregateProbeRows(ok.envelope.events)).sort((a, b) => a.rb - b.rb), [{ day: '2026-10-05', rb: 6, n: 1, k: 1 }, { day: '2026-10-05', rb: 12, n: 2, k: 1 }]);
    const legacy = core.normalizeItemEnvelope(body(), NOW);
    assert.strictEqual(legacy.staleVersion, false, 'kiriman m025-377 tanpa pv harus dibaca sebagai versi pertama');
    const stale = core.normalizeItemEnvelope(body({ pv: 'a1.2-c0.2-h1.6' }), NOW);
    assert.strictEqual(stale.ok, true); assert.strictEqual(stale.staleVersion, true);
    assert.strictEqual(core.aggregateProbeRows(stale.envelope.events).length + core.aggregateItemRows(stale.envelope.events).length, 0);
    assert.strictEqual(route.processItemEvidenceBatch(body({ pv: 5 }), NOW).status, 400);
  });
  if (hasSqlite) {
    await test('P3 · rute: probe masuk ke item_pool_probe_daily lewat POST sungguhan', async () => {
      const db = makeD1([MIG15, MIG16]);
      const req = new Request('https://api.fiezel.my.id' + route.ITEM_EVIDENCE_PATH, {
        method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '198.51.100.7' },
        body: JSON.stringify({ schema: 'fiezel-item-evidence-v1', batchId: '00000000-0000-4000-8000-000000000111', pv: core.PARAM_VERSION, events: [{ eventId: '00000000-0000-4000-8000-000000000222', day: '2026-10-05', items: [['PR-101:apply_form', 14, 1]], probes: [[12, 2, 1]] }] })
      });
      const waits = [];
      const res = await route.handleItemEvidence(req, { EVIDENCE_DB: db, ITEM_POOL_ENABLED: 'on' }, { waitUntil: (p) => waits.push(p) }, Date.parse('2026-10-05T10:00:00Z'));
      await Promise.all(waits);
      assert.strictEqual(res.status, 202);
      assert.deepStrictEqual(plain(db._raw.prepare('SELECT day, rb, n, k FROM item_pool_probe_daily').all()), [{ day: '2026-10-05', rb: 12, n: 2, k: 1 }]);
    });
  }
  await test('P4 · migrasi 0016: kolom hanya day, rb, n, k (tanpa penghubung)', () => {
    const ddl = fs.readFileSync(MIG16, 'utf8').split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    const body = /CREATE TABLE IF NOT EXISTS item_pool_probe_daily\s*\(([\s\S]*?)\)\s*WITHOUT ROWID/.exec(ddl)[1];
    const cols = body.split('\n').map((l) => l.trim().split(/\s+/)[0]).filter((w) => w && w !== 'PRIMARY');
    assert.deepStrictEqual(cols.sort(), ['day', 'k', 'n', 'rb']);
    const md = fs.readFileSync(path.join(root, 'workers/api/migrations/MIGRATIONS.md'), 'utf8');
    assert.match(md, /wrangler d1 execute fiezel-evidence --remote --file=migrations\/0016_item_pool_probe\.sql/);
  });

  await test('A1 · app.js: draw() memberi retrievability probe (bukan saat penempatan), record() mencatatnya', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    assert.match(app, /q\.__probeR=\(!cfg\.placement&&q\.type==='grammar'\)\?itemPoolProbePrediction\(q\):null/);
    const rec = app.slice(app.indexOf('function record(q,ok,ms,selectedIndex){'), app.indexOf("if(q.type==='cloze'){", app.indexOf('function record(q,ok,ms,selectedIndex){')));
    assert.match(rec, /itemPoolObserveProbe\(q,ok\)/);
    const fn = app.slice(app.indexOf('function itemPoolProbePrediction(q){'), app.indexOf('function itemPoolObserveProbe('));
    assert.match(fn, /Number\(h\.at\)>=latest/, 'probe yang sudah terjawab ikut dihitung lagi');
    assert.ok(!/credentials:'include'/.test(fn));
  });

  await test('CI · gerbang ini terdaftar di quality.yml', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/quality.yml'), 'utf8');
    assert.ok(wf.includes('node tests/brain-param-tune-test.js'), 'gate yang tidak berjalan di CI bukan gate');
  });

  console.log('');
  if (failures) { console.error('FIEZEL brain param tune: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
  console.log('FIEZEL brain param tune: PASS (' + checks + ' uji · angka rumus disetel dari data)');
})().catch((e) => { console.error(e); process.exit(1); });
