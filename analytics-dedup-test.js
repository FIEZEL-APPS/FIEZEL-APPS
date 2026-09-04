/**
 * FIEZEL gerbang — idempotensi batch analytics (dedup batchId).
 *
 * Temuan council yang ditutup gerbang ini (model-council-gpt_5_6_sol.md §4.3,
 * model-council-claude_opus_5_0.md §1.3): agregasi bersifat increment, jadi
 * retry klien setelah timeout ambigu menaikkan SEMUA penghitung dua kali, dan
 * `retention_ping` (tanpa token) bisa di-replay untuk menggelembungkan kohor.
 *
 * Yang dituntut:
 *  1. Replay batch yang SAMA PERSIS (batchId sama) tidak mengubah agregat
 *     APA PUN — metrics_daily, usage_daily, retention_daily, dau_dedup —
 *     dan dijawab 200 duplicate, bukan diproses ulang.
 *  2. retention_ping dengan batchId tidak lagi replayable.
 *  3. Batch TANPA batchId tetap diterima (kompatibilitas mundur) dan tetap
 *     berperilaku lama (increment tiap kiriman).
 *  4. batchId kadaluarsa (lewat jendela retry 48 jam) dipurge oleh rollup
 *     harian — kunci dedup tidak boleh hidup lebih lama dari jendela retry.
 *  5. batchId yang bentuknya bukan UUID acak ditolak 400 (tidak ada ruang
 *     menyelipkan ID stabil/teks bebas).
 *
 * D1 ditiru dengan pola yang sama seperti analytics-aggregate-test.js:
 * hanya SQL persis dari analytics-store-d1.js yang dikenali; SQL lain melempar.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

/* ==========================================================================
 * Tiruan D1 (pola analytics-aggregate-test.js + tabel batch_dedup)
 * ========================================================================== */
function makeDb(SQL) {
  const t = {
    metrics: new Map(),   // 'day|metric' -> value
    usage: new Map(),     // 'day|bucket' -> count
    retention: new Map(), // 'cohort|idx'  -> count
    dau: new Set(),       // 'day|token'
    batches: new Map(),   // batch_id -> day (baris tabel batch_dedup)
    pepper: null
  };

  function exec(sql, params) {
    switch (sql) {
      case SQL.upsertMetric: {
        const k = `${params[0]}|${params[1]}`;
        t.metrics.set(k, (t.metrics.get(k) || 0) + params[2]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.setMetric:
        t.metrics.set(`${params[0]}|${params[1]}`, params[2]);
        return { results: [], meta: { changes: 1 } };
      case SQL.setMetricMax: {
        const k = `${params[0]}|${params[1]}`;
        t.metrics.set(k, Math.max(t.metrics.get(k) ?? -Infinity, params[2]));
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.upsertUsage: {
        const k = `${params[0]}|${params[1]}`;
        t.usage.set(k, (t.usage.get(k) || 0) + params[2]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.upsertRetention: {
        const k = `${params[0]}|${params[1]}`;
        t.retention.set(k, (t.retention.get(k) || 0) + params[2]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.insertDauToken:
        t.dau.add(`${params[0]}|${params[1]}`);
        return { results: [], meta: { changes: 1 } };
      case SQL.countDauTokens:
        return { results: [{ n: [...t.dau].filter(k => k.startsWith(`${params[0]}|`)).length }], meta: { changes: 0 } };
      // [REBASE-20260828] rollup fase-3 main menambah pagar kewarasan countUsageRows
      // (bedakan "hari sepi" vs "pengumpulan token rusak"). Kunci usage di tiruan
      // ini berbentuk `${day}|${bucket}` — hitung baris per hari, bukan orang.
      case SQL.countUsageRows:
        return { results: [{ n: [...t.usage.keys()].filter(k => k.startsWith(`${params[0]}|`)).length }], meta: { changes: 0 } };
      case SQL.purgeDauDay:
        for (const k of [...t.dau]) if (k.startsWith(`${params[0]}|`)) t.dau.delete(k);
        return { results: [], meta: { changes: 0 } };
      case SQL.purgeDauOlderThan:
        for (const k of [...t.dau]) if (k.split('|')[0] <= params[0]) t.dau.delete(k);
        return { results: [], meta: { changes: 0 } };
      case SQL.readMetricRange: {
        const out = [];
        for (const [k, v] of t.metrics) {
          const [day, metric] = k.split('|');
          if (metric === params[0] && day >= params[1] && day <= params[2]) out.push({ day, value: v });
        }
        out.sort((a, b) => (a.day < b.day ? -1 : 1));
        return { results: out, meta: { changes: 0 } };
      }
      case SQL.purgeUsageOlderThan:
        for (const k of [...t.usage.keys()]) if (k.split('|')[0] < params[0]) t.usage.delete(k);
        return { results: [], meta: { changes: 0 } };
      case SQL.purgeRetentionOlderThan:
        for (const k of [...t.retention.keys()]) if (k.split('|')[0] < params[0]) t.retention.delete(k);
        return { results: [], meta: { changes: 0 } };
      case SQL.readPepper:
        return { results: t.pepper ? [t.pepper] : [], meta: { changes: 0 } };
      case SQL.writePepper:
        t.pepper = { rotated_at: params[0], current: params[1], previous: params[2] };
        return { results: [], meta: { changes: 1 } };
      // --- tabel batch_dedup (migrasi 0003) ---
      case SQL.selectBatchId: {
        const day = t.batches.get(params[0]);
        return { results: day === undefined ? [] : [{ day }], meta: { changes: 0 } };
      }
      case SQL.insertBatchId: {
        if (t.batches.has(params[0])) return { results: [], meta: { changes: 0 } }; // OR IGNORE
        t.batches.set(params[0], params[1]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.purgeBatchDedupOlderThan: {
        for (const [id, day] of [...t.batches]) if (day < params[0]) t.batches.delete(id);
        return { results: [], meta: { changes: 0 } };
      }
      default:
        throw new Error(`SQL tak dikenal oleh tiruan D1:\n${sql}`);
    }
  }

  return {
    tables: t,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() { return exec(sql, params); },
            async all() { return exec(sql, params); },
            async first() { return exec(sql, params).results[0] || null; }
          };
        },
        async run() { return exec(sql, []); },
        async all() { return exec(sql, []); },
        async first() { return exec(sql, []).results[0] || null; }
      };
    },
    async batch(stmts) { for (const s of stmts) await s.run(); }
  };
}

/** Potret SEMUA tabel agregat — bukan cuma DAU. */
const snapshot = db => JSON.stringify({
  metrics: [...db.tables.metrics].sort(),
  usage: [...db.tables.usage].sort(),
  retention: [...db.tables.retention].sort(),
  dau: [...db.tables.dau].sort()
});

/* ==========================================================================
 * Permintaan HTTP tiruan (pola analytics-server-only-test.js)
 * ========================================================================== */
let ipCounter = 0;
function makeRequest(body, opts = {}) {
  const ip = opts.ip || `198.51.100.${(ipCounter++ % 250) + 1}`;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Map([['cf-connecting-ip', ip], ['content-type', 'application/json']]);
  headers.set('content-length', String(Buffer.byteLength(text)));
  return {
    method: 'POST',
    url: 'https://api.fiezel.my.id/api/usage/events',
    headers: { get: k => (headers.has(k.toLowerCase()) ? headers.get(k.toLowerCase()) : null) },
    async text() { return text; }
  };
}

(async () => {
  const store = await import('./workers/api/analytics/analytics-store-d1.js');
  const route = await import('./workers/api/analytics/route-events.js');
  const rollup = await import('./workers/api/analytics/rollup.js');

  const SCHEMA = route.SCHEMA_ID;
  const NOW = Date.parse('2026-08-27T10:00:00Z');
  const HARI = '2026-08-27';
  const tok = seed => seed.repeat(32).slice(0, 32);

  // waitUntil harus benar-benar dieksekusi supaya agregat tertulis.
  const pending = [];
  const ctx = { waitUntil(p) { pending.push(p); } };
  const flush = () => Promise.all(pending.splice(0));

  const db = makeDb(store.SQL);
  const ENV = { ANALYTICS_ENABLED: 'on', RATE_SALT: 'salt-dedup-uji', ANALYTICS_DB: db };
  const parse = async res => ({ status: res.status, body: JSON.parse(await res.text()) });

  const B1 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const B2 = '9b2d7c44-1f6e-4a2b-8c3d-5e6f70819202';
  const B3 = 'aa11bb22-cc33-4d44-8e55-ff6677889900';

  /* =====================================================================
   * 1. Batch kaya (SEMUA jenis agregat: metrics, usage, dau) + replay
   * ===================================================================== */
  const batchKaya = {
    schema: SCHEMA,
    batchId: B1,
    events: [
      { name: 'app_open', day: HARI, visitor_token: tok('a'), has_identity: false, platform: 'android' },
      { name: 'day_active', day: HARI, visitor_token: tok('a'), attempts_bucket: '5-9', platform: 'android' },
      { name: 'day_active', day: HARI, visitor_token: tok('b'), attempts_bucket: '30+', platform: 'desktop' },
      { name: 'session_ended', day: HARI, mode: 'lesson', level: 'B1', completed: true, answered: 12, duration_bucket: '2-10m' },
      { name: 'lesson_completed', day: HARI, domain: 'grammar', level: 'B1' },
      { name: 'question_answered', day: HARI, domain: 'grammar', level: 'B1', ok: true },
      { name: 'question_answered', day: HARI, domain: 'grammar', level: 'B1', ok: false },
      { name: 'retention_ping', day: HARI, cohort_day: '2026-08-01', day_index: 7 }
    ]
  };

  const r1 = await parse(await route.handleEvents(makeRequest(batchKaya), ENV, ctx, NOW));
  await flush();
  const snap1 = snapshot(db);
  check('Batch pertama dengan batchId diterima 202 dan diagregasi',
    r1.status === 202 && r1.body.accepted === 8 && db.tables.metrics.size > 0, JSON.stringify(r1));
  check('Agregat pertama memuat metrics, usage, retention, dan dau sekaligus',
    db.tables.metrics.size > 0 && db.tables.usage.size > 0 && db.tables.retention.size > 0 && db.tables.dau.size === 2,
    snap1);

  // Replay SAMA PERSIS (retry klien setelah timeout ambigu).
  const r2 = await parse(await route.handleEvents(makeRequest(batchKaya), ENV, ctx, NOW + 5000));
  await flush();
  check('Replay dijawab 200 duplicate (bukan 202, bukan error)',
    r2.status === 200 && r2.body.ok === true && r2.body.duplicate === true, JSON.stringify(r2));
  check('Replay TIDAK mengubah agregat APA PUN (metrics+usage+retention+dau identik)',
    snapshot(db) === snap1, `${snap1}\n---\n${snapshot(db)}`);

  // Replay ketiga, satu jam kemudian, IP lain: tetap duplikat.
  const r3 = await parse(await route.handleEvents(makeRequest(batchKaya, { ip: '203.0.113.5' }), ENV, ctx, NOW + 3600000));
  await flush();
  check('Replay dari IP lain / jam lain tetap tertahan (dedup by batchId, bukan by IP)',
    r3.status === 200 && r3.body.duplicate === true && snapshot(db) === snap1, JSON.stringify(r3));

  // Verifikasi nilai metrik konkret tidak berlipat.
  check('Penghitung answers tetap 2 (bukan 4/6) setelah dua replay',
    db.tables.metrics.get(`${HARI}|answers`) === 2, String(db.tables.metrics.get(`${HARI}|answers`)));
  check('Penghitung kohor retention tetap 1 setelah dua replay',
    db.tables.retention.get('2026-08-01|7') === 1, String(db.tables.retention.get('2026-08-01|7')));

  /* =====================================================================
   * 2. retention_ping dengan batchId tidak lagi replayable
   * ===================================================================== */
  const ping = { schema: SCHEMA, batchId: B2, pings: [{ cohort_day: '2026-08-10', day_index: 1 }] };
  const p1 = await parse(await route.handleRetention(makeRequest(ping), ENV, ctx, NOW));
  await flush();
  const p2 = await parse(await route.handleRetention(makeRequest(ping), ENV, ctx, NOW + 60000));
  await flush();
  check('retention_ping pertama diterima 202', p1.status === 202 && p1.body.accepted === 1, JSON.stringify(p1));
  check('Replay retention_ping dijawab 200 duplicate', p2.status === 200 && p2.body.duplicate === true, JSON.stringify(p2));
  check('Penghitung kohor D1 tetap 1 setelah replay ping',
    db.tables.retention.get('2026-08-10|1') === 1, String(db.tables.retention.get('2026-08-10|1')));

  // Bentuk envelope tunggal (tanpa `pings`) juga boleh membawa batchId.
  const pingTunggal = { schema: SCHEMA, batchId: B3, cohort_day: '2026-08-10', day_index: 7 };
  const p3 = await parse(await route.handleRetention(makeRequest(pingTunggal), ENV, ctx, NOW));
  await flush();
  const p4 = await parse(await route.handleRetention(makeRequest(pingTunggal), ENV, ctx, NOW));
  await flush();
  check('Envelope ping tunggal + batchId diterima (batchId bukan foreign_field)',
    p3.status === 202, JSON.stringify(p3));
  check('Replay envelope ping tunggal juga tertahan',
    p4.status === 200 && p4.body.duplicate === true && db.tables.retention.get('2026-08-10|7') === 1, JSON.stringify(p4));

  /* =====================================================================
   * 3. Kompatibilitas mundur: batch TANPA batchId tetap jalan
   * ===================================================================== */
  const tanpaId = {
    schema: SCHEMA,
    events: [{ name: 'question_answered', day: HARI, domain: 'reading', level: 'A2', ok: true }]
  };
  const t1 = await parse(await route.handleEvents(makeRequest(tanpaId), ENV, ctx, NOW));
  await flush();
  const t2 = await parse(await route.handleEvents(makeRequest(tanpaId), ENV, ctx, NOW));
  await flush();
  check('Batch tanpa batchId tetap diterima 202 (klien lama tidak rusak)',
    t1.status === 202 && t2.status === 202, JSON.stringify([t1.status, t2.status]));
  check('Tanpa batchId, perilaku lama dipertahankan: dua kiriman = dua increment',
    db.tables.usage.get(`${HARI}|answer_domain:reading`) === 2, String(db.tables.usage.get(`${HARI}|answer_domain:reading`)));
  check('processClientBatch tanpa batchId mengembalikan batchId null',
    route.processClientBatch(tanpaId, NOW).batchId === null, JSON.stringify(route.processClientBatch(tanpaId, NOW).batchId));

  /* =====================================================================
   * 4. Validasi bentuk batchId (tidak ada ruang untuk ID stabil/teks bebas)
   * ===================================================================== */
  const bentukJahat = [
    'install-1234',                          // turunan identitas
    '2026-08-27T10:00:00Z',                  // turunan waktu
    'abcd', '',                              // terlalu pendek
    'zf2504e0-4f89-41d3-9a0c-0305e82c3301',  // bukan hex
    tok('a')                                 // 32 hex tanpa tanda hubung (mirip visitor_token!)
  ];
  for (const jelek of bentukJahat) {
    const res = await parse(await route.handleEvents(makeRequest(Object.assign({}, tanpaId, { batchId: jelek })), ENV, ctx, NOW));
    check(`batchId bentuk salah ditolak 400 bad_batch_id: ${JSON.stringify(jelek)}`,
      res.status === 400 && res.body.error === 'bad_batch_id', JSON.stringify(res));
  }
  const nonString = await parse(await route.handleEvents(makeRequest(Object.assign({}, tanpaId, { batchId: 12345 })), ENV, ctx, NOW));
  check('batchId bukan string ditolak 400 bad_batch_id', nonString.status === 400 && nonString.body.error === 'bad_batch_id', JSON.stringify(nonString));
  check('batchId huruf besar dinormalisasi (bukan dua kunci berbeda)',
    route.normalizeBatchId(B1.toUpperCase()).value === B1, JSON.stringify(route.normalizeBatchId(B1.toUpperCase())));

  /* =====================================================================
   * 5. markBatchSeen: kontrak lapis penyimpanan
   * ===================================================================== */
  const dbM = makeDb(store.SQL);
  check('markBatchSeen: kunci baru -> true (agregasi boleh jalan)', (await store.markBatchSeen(dbM, B1, HARI)) === true);
  check('markBatchSeen: kunci sama -> false (duplikat)', (await store.markBatchSeen(dbM, B1, HARI)) === false);
  check('markBatchSeen: kunci lain -> true', (await store.markBatchSeen(dbM, B2, HARI)) === true);
  check('Tabel dedup hanya menyimpan (batch_id, day) — tidak ada isi batch',
    [...dbM.tables.batches.entries()].every(([id, day]) => route.BATCH_ID_PATTERN.test(id) && /^\d{4}-\d{2}-\d{2}$/.test(day)),
    JSON.stringify([...dbM.tables.batches]));

  /* =====================================================================
   * 6. Purge: kunci kadaluarsa dihapus rollup; setelah purge, replay lama
   *    diperlakukan sebagai batch baru (jendela retry memang sudah lewat)
   * ===================================================================== */
  const dbP = makeDb(store.SQL);
  await store.markBatchSeen(dbP, B1, '2026-08-20'); // jauh melewati jendela 48 jam
  await store.markBatchSeen(dbP, B2, '2026-08-25'); // tepat di batas dalam jendela
  await store.markBatchSeen(dbP, B3, HARI);         // masih segar
  const NOW_ROLLUP = Date.parse('2026-08-28T17:05:00Z');
  const ringkasan = await rollup.runDailyRollup(dbP, { now: NOW_ROLLUP, day: HARI, pepper: 'q'.repeat(64) });
  check('Rollup harian melaporkan purge batch_dedup', ringkasan.purged.includes('batch_dedup'), JSON.stringify(ringkasan.purged));
  check('Kunci dedup kadaluarsa (lewat jendela retry 48 jam) benar-benar dipurge',
    !dbP.tables.batches.has(B1), JSON.stringify([...dbP.tables.batches]));
  check('Kunci dedup di dalam jendela retry TIDAK ikut terhapus',
    dbP.tables.batches.has(B2) && dbP.tables.batches.has(B3), JSON.stringify([...dbP.tables.batches]));
  check('Umur kunci dedup dikunci di 2 hari (RETENTION_DAYS.BATCH_DEDUP)',
    rollup.RETENTION_DAYS.BATCH_DEDUP === 2 && route.LIMITS.BATCH_ID_TTL_DAYS === 2,
    JSON.stringify({ rollup: rollup.RETENTION_DAYS.BATCH_DEDUP, route: route.LIMITS.BATCH_ID_TTL_DAYS }));
  check('Setelah kadaluarsa, batchId lama diterima lagi sebagai batch baru (jendela retry sudah tutup)',
    (await store.markBatchSeen(dbP, B1, '2026-08-28')) === true);

  // Rollup pada database yang belum punya tabel batch_dedup (migrasi 0003
  // belum jalan / tiruan D1 lama) TIDAK boleh gagal total.
  const dbTua = makeDb(store.SQL);
  const purgeAsli = store.SQL.purgeBatchDedupOlderThan;
  const dbTanpaBatch = {
    prepare(sql) {
      if (sql === purgeAsli) throw new Error('D1_UNKNOWN_TABLE: batch_dedup');
      return dbTua.prepare(sql);
    },
    batch: dbTua.batch.bind(dbTua),
    tables: dbTua.tables
  };
  const ringkasanTua = await rollup.runDailyRollup(dbTanpaBatch, { now: NOW_ROLLUP, day: HARI, pepper: 'q'.repeat(64) });
  check('Rollup tetap selesai saat tabel batch_dedup belum ada (migrasi 0003 belum jalan)',
    typeof ringkasanTua.batchDedupPurgeError === 'string' && !ringkasanTua.purged.includes('batch_dedup') &&
    ringkasanTua.purged.includes('usage_daily') && ringkasanTua.purged.includes('retention_daily'),
    JSON.stringify(ringkasanTua));

  /* =====================================================================
   * 7. Dedup harus terjadi SEBELUM agregasi dijadwalkan, dan flag OFF aman
   * ===================================================================== */
  const dbUrut = makeDb(store.SQL);
  const envUrut = { ANALYTICS_ENABLED: 'on', RATE_SALT: 'salt-urut', ANALYTICS_DB: dbUrut };
  const bOrder = { schema: SCHEMA, batchId: B2, events: [{ name: 'question_answered', day: HARI, domain: 'grammar', level: 'B1', ok: true }] };
  await route.handleEvents(makeRequest(bOrder), envUrut, ctx, NOW);
  // JANGAN flush dulu: kirim replay sementara agregasi pertama masih antre.
  const rSebelum = await parse(await route.handleEvents(makeRequest(bOrder), envUrut, ctx, NOW));
  await flush();
  check('Replay yang tiba sebelum agregasi pertama selesai pun tetap tertahan (dedup ditulis sinkron)',
    rSebelum.status === 200 && rSebelum.body.duplicate === true && dbUrut.tables.metrics.get(`${HARI}|answers`) === 1,
    JSON.stringify({ rSebelum, answers: dbUrut.tables.metrics.get(`${HARI}|answers`) }));

  const off = await parse(await route.handleEvents(makeRequest(batchKaya), { ANALYTICS_ENABLED: 'off' }, ctx, NOW));
  check('Flag OFF: batch ber-batchId tetap dijawab diam 202 tanpa menyentuh apa pun',
    off.status === 202 && off.body.disabled === true, JSON.stringify(off));

  // Tanpa binding D1, dedup tidak mungkin — batch tetap diterima (bukan 500).
  const tanpaDb = await parse(await route.handleEvents(makeRequest(batchKaya), { ANALYTICS_ENABLED: 'on', RATE_SALT: 's' }, ctx, NOW));
  check('Tanpa binding D1, batch ber-batchId tetap dijawab 202 (analytics diam, tidak error)',
    tanpaDb.status === 202, JSON.stringify(tanpaDb));

  /* ===================================================================== */
  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'analytics-dedup',
    counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'ANALYTICS-DEDUP-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`AnalyticsDedup: ${report.status === 'PASS' ? 'PASS' : 'FAIL'}`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
