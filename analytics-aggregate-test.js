/**
 * FIEZEL E4 gerbang — kebenaran angka agregat analytics.
 *
 * Privasi maksimal tidak ada gunanya kalau angkanya salah; owner memesan
 * DUA-DUANYA. Gerbang ini menuntut empat hal yang bisa membuat dashboard bohong:
 *
 *  1. DEDUP DAU benar: satu perangkat dua kali sehari = satu, dua perangkat =
 *     dua, perangkat yang sama di dua hari = satu per hari.
 *  2. WAU/MAU dilaporkan sebagai RENTANG yang benar (batas bawah = DAU
 *     tertinggi, batas atas = jumlah DAU). Satu angka tunggal = mengarang.
 *  3. RETENTION COHORT terhitung per (cohort_day, day_index) dengan n= kohor.
 *  4. ROLLUP IDEMPOTEN: cron Cloudflare bisa jalan dua kali; hasilnya wajib sama.
 *
 * D1 ditiru dengan mesin dalam-memori yang HANYA mengenali pernyataan SQL
 * persis dari `analytics-store-d1.js`. Kalau ada yang mengubah SQL-nya, tiruan
 * ini melempar galat alih-alih diam-diam lulus.
 */
const fs = require('fs');
const path = require('path');

const root = __dirname;
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (!ok) failed = true;
}

/* ==========================================================================
 * Tiruan D1: peta dalam-memori + pencocokan SQL eksak
 * ========================================================================== */
function makeDb(SQL) {
  const t = {
    metrics: new Map(),   // 'day|metric' -> value
    usage: new Map(),     // 'day|bucket' -> count
    retention: new Map(), // 'cohort|idx'  -> count
    dau: new Set(),       // 'day|token'
    pepper: null
  };
  const stats = { statements: 0, deletes: 0 };

  function exec(sql, params) {
    stats.statements++;
    switch (sql) {
      case SQL.upsertMetric: {
        const k = `${params[0]}|${params[1]}`;
        t.metrics.set(k, (t.metrics.get(k) || 0) + params[2]);
        return { results: [] };
      }
      case SQL.setMetric:
        t.metrics.set(`${params[0]}|${params[1]}`, params[2]);
        return { results: [] };
      case SQL.setMetricMax: {
        const k = `${params[0]}|${params[1]}`;
        t.metrics.set(k, Math.max(t.metrics.get(k) ?? -Infinity, params[2]));
        return { results: [] };
      }
      case SQL.upsertUsage: {
        const k = `${params[0]}|${params[1]}`;
        t.usage.set(k, (t.usage.get(k) || 0) + params[2]);
        return { results: [] };
      }
      case SQL.upsertRetention: {
        const k = `${params[0]}|${params[1]}`;
        t.retention.set(k, (t.retention.get(k) || 0) + params[2]);
        return { results: [] };
      }
      case SQL.insertDauToken:
        t.dau.add(`${params[0]}|${params[1]}`); // OR IGNORE = himpunan
        return { results: [] };
      case SQL.countDauTokens:
        return { results: [{ n: [...t.dau].filter(k => k.startsWith(`${params[0]}|`)).length }] };
      case SQL.purgeDauDay:
        stats.deletes++;
        for (const k of [...t.dau]) if (k.startsWith(`${params[0]}|`)) t.dau.delete(k);
        return { results: [] };
      case SQL.purgeDauOlderThan:
        stats.deletes++;
        for (const k of [...t.dau]) if (k.split('|')[0] <= params[0]) t.dau.delete(k);
        return { results: [] };
      case SQL.readMetricRange: {
        const out = [];
        for (const [k, v] of t.metrics) {
          const [day, metric] = k.split('|');
          if (metric === params[0] && day >= params[1] && day <= params[2]) out.push({ day, value: v });
        }
        out.sort((a, b) => (a.day < b.day ? -1 : 1));
        return { results: out };
      }
      case SQL.purgeUsageOlderThan:
        stats.deletes++;
        for (const k of [...t.usage.keys()]) if (k.split('|')[0] < params[0]) t.usage.delete(k);
        return { results: [] };
      case SQL.purgeRetentionOlderThan:
        stats.deletes++;
        for (const k of [...t.retention.keys()]) if (k.split('|')[0] < params[0]) t.retention.delete(k);
        return { results: [] };
      case SQL.readPepper:
        return { results: t.pepper ? [t.pepper] : [] };
      case SQL.writePepper:
        t.pepper = { rotated_at: params[0], current: params[1], previous: params[2] };
        return { results: [] };
      default:
        throw new Error(`SQL tak dikenal oleh tiruan D1:\n${sql}`);
    }
  }

  return {
    tables: t,
    stats,
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

const snapshot = db => JSON.stringify({
  metrics: [...db.tables.metrics].sort(),
  usage: [...db.tables.usage].sort(),
  retention: [...db.tables.retention].sort(),
  dau: [...db.tables.dau].sort()
});

const tok = seed => seed.repeat(32).slice(0, 32);

(async () => {
  const core = await import('./workers/api/analytics/analytics-core.js');
  const store = await import('./workers/api/analytics/analytics-store-d1.js');
  const rollup = await import('./workers/api/analytics/rollup.js');

  const A = tok('a'), B = tok('b'), C = tok('c');

  /* =====================================================================
   * 1. DEDUP DAU
   * ===================================================================== */
  const ev = (name, day, extra = {}) => Object.assign({ name, day }, extra);

  const agg1 = core.aggregate([
    ev('day_active', '2026-08-25', { visitor_token: A, attempts_bucket: '5-9', platform: 'android' }),
    ev('day_active', '2026-08-25', { visitor_token: A, attempts_bucket: '10-29', platform: 'android' }),
    ev('day_active', '2026-08-25', { visitor_token: B, attempts_bucket: '30+', platform: 'desktop' }),
    ev('day_active', '2026-08-26', { visitor_token: A, attempts_bucket: '5-9', platform: 'android' })
  ]);
  const d25 = agg1.dau.filter(r => r.day === '2026-08-25');
  const d26 = agg1.dau.filter(r => r.day === '2026-08-26');
  check('Satu perangkat dua kali sehari terhitung satu', d25.length === 2 && new Set(d25.map(r => r.token)).size === 2, JSON.stringify(d25));
  check('Dua perangkat berbeda terhitung dua', new Set(d25.map(r => r.token)).size === 2, JSON.stringify(d25));
  check('Perangkat sama di hari berbeda terhitung sekali per hari', d26.length === 1 && d26[0].token === A, JSON.stringify(d26));
  check('Laporan day_active tetap dihitung apa adanya (tidak sama dengan DAU)',
    agg1.metrics['2026-08-25'].day_active_reports === 3, JSON.stringify(agg1.metrics['2026-08-25']));
  check('Dimensi attempts_bucket masuk usage_daily',
    agg1.usage['2026-08-25']['attempts:5-9'] === 1 && agg1.usage['2026-08-25']['attempts:30+'] === 1,
    JSON.stringify(agg1.usage['2026-08-25']));

  // Dedup lapis kedua di basis data: INSERT OR IGNORE.
  const dbDedup = makeDb(store.SQL);
  await store.applyAggregate(dbDedup, agg1);
  await store.applyAggregate(dbDedup, agg1); // batch terkirim dua kali (retry klien)
  check('Kirim ulang batch tidak menggandakan token DAU',
    await store.countDauTokens(dbDedup, '2026-08-25') === 2,
    String(await store.countDauTokens(dbDedup, '2026-08-25')));

  check('computeDauFromTokens men-dedup token duplikat',
    rollup.computeDauFromTokens([{ day: 'd', token: A }, { day: 'd', token: A }, { day: 'd', token: B }, { day: 'x', token: C }], 'd') === 2);

  /* =====================================================================
   * 2. WAU / MAU sebagai RENTANG
   * ===================================================================== */
  const dauRows = [
    { day: '2026-08-20', value: 10 },
    { day: '2026-08-21', value: 12 },
    { day: '2026-08-22', value: 9 },
    { day: '2026-08-23', value: 20 },
    { day: '2026-08-24', value: 11 },
    { day: '2026-08-25', value: 13 },
    { day: '2026-08-26', value: 15 },
    { day: '2026-07-10', value: 999 } // di luar jendela 30 hari: harus diabaikan
  ];
  const wau = rollup.computeWauMauBounds(dauRows, '2026-08-26', 7);
  check('WAU batas bawah = DAU tertinggi dalam 7 hari', wau.lower === 20, JSON.stringify(wau));
  check('WAU batas atas = jumlah DAU 7 hari', wau.upper === 10 + 12 + 9 + 20 + 11 + 13 + 15, JSON.stringify(wau));
  check('WAU batas bawah <= batas atas', wau.lower <= wau.upper);
  check('Jendela WAU tepat 7 hari dan cakupan penuh', wau.days === 7 && wau.coverage === 1, JSON.stringify(wau));

  const mau = rollup.computeWauMauBounds(dauRows, '2026-08-26', 30);
  check('MAU mengabaikan hari di luar jendela 30 hari', mau.upper === wau.upper, JSON.stringify(mau));
  check('MAU melaporkan cakupan < 1 saat data belum penuh', mau.days === 7 && mau.coverage < 1, JSON.stringify(mau));

  const kosong = rollup.computeWauMauBounds([], '2026-08-26', 7);
  check('Tanpa data, WAU = 0 (bukan NaN)', kosong.lower === 0 && kosong.upper === 0, JSON.stringify(kosong));

  check('dayWindow menghasilkan 7 hari berurutan yang berakhir di hari itu',
    rollup.dayWindow('2026-08-26', 7).join(',') === '2026-08-20,2026-08-21,2026-08-22,2026-08-23,2026-08-24,2026-08-25,2026-08-26',
    rollup.dayWindow('2026-08-26', 7).join(','));

  /* =====================================================================
   * 3. RETENTION COHORT
   * ===================================================================== */
  const aggRet = core.aggregate([
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-01', day_index: 0 }),
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-01', day_index: 0 }),
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-01', day_index: 0 }),
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-01', day_index: 1 }),
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-01', day_index: 7 }),
    ev('retention_ping', '2026-08-26', { cohort_day: '2026-08-02', day_index: 0 })
  ]);
  check('Retention dikelompokkan per (cohort_day, day_index)',
    aggRet.retention['2026-08-01']['0'] === 3 && aggRet.retention['2026-08-01']['1'] === 1 && aggRet.retention['2026-08-01']['7'] === 1,
    JSON.stringify(aggRet.retention));
  check('Kohor berbeda tidak tercampur', aggRet.retention['2026-08-02']['0'] === 1, JSON.stringify(aggRet.retention));
  check('retention_ping tidak menyumbang token DAU (tidak ada token di dalamnya)', aggRet.dau.length === 0);

  const rates = rollup.computeRetentionRates([
    { cohort_day: '2026-08-01', day_index: 0, count: 100 },
    { cohort_day: '2026-08-01', day_index: 1, count: 45 },
    { cohort_day: '2026-08-01', day_index: 7, count: 20 },
    { cohort_day: '2026-08-05', day_index: 7, count: 5 } // kohor tanpa D0
  ]);
  const d1 = rates.find(r => r.cohort_day === '2026-08-01' && r.day_index === 1);
  const d7 = rates.find(r => r.cohort_day === '2026-08-01' && r.day_index === 7);
  const yatim = rates.find(r => r.cohort_day === '2026-08-05');
  check('Rate D1 = 45/100', Math.abs(d1.rate - 0.45) < 1e-9, JSON.stringify(d1));
  check('Rate D7 = 20/100', Math.abs(d7.rate - 0.20) < 1e-9, JSON.stringify(d7));
  check('Ukuran kohor (n=) selalu ikut dilaporkan', d1.cohort_size === 100 && d7.cohort_size === 100, JSON.stringify(d1));
  check('Kohor tanpa D0 melaporkan rate null, bukan persentase palsu', yatim.rate === null, JSON.stringify(yatim));

  /* =====================================================================
   * 4. Agregat event lain (biaya & operasional)
   * ===================================================================== */
  const aggOps = core.aggregate([
    ev('ai_request', '2026-08-26', { task: 'explain', model: 'granite-micro', prompt_tokens_est: 120 }),
    ev('ai_success', '2026-08-26', { task: 'explain', model: 'granite-micro', out_tokens: 300, latency_bucket: '1-3s' }),
    ev('ai_failure', '2026-08-26', { task: 'explain', code: 'timeout', latency_bucket: '10s+' }),
    ev('tts_success', '2026-08-26', { engine: 'melotts', cache: 'hit', chars_rendered: 0, latency_bucket: '<1s' }),
    ev('tts_success', '2026-08-26', { engine: 'melotts', cache: 'miss', chars_rendered: 850, latency_bucket: '1-3s' }),
    ev('quota_exhausted', '2026-08-26', { kind: 'ai' }),
    ev('circuit_opened', '2026-08-26', { module: 'ai', reason: 'timeout', failures: 5 }),
    ev('question_answered', '2026-08-26', { domain: 'grammar', level: 'B1', ok: true }),
    ev('question_answered', '2026-08-26', { domain: 'grammar', level: 'B1', ok: false })
  ]);
  const m = aggOps.metrics['2026-08-26'];
  check('ai_tokens_out dijumlahkan, bukan dihitung', m.ai_tokens_out === 300, JSON.stringify(m));
  check('tts_chars_rendered hanya menjumlahkan cache-miss (dasar biaya)', m.tts_chars_rendered === 850, JSON.stringify(m));
  check('cache hit dan miss dihitung terpisah', m.tts_cache_hits === 1 && m.tts_cache_misses === 1, JSON.stringify(m));
  check('answers vs answers_ok terpisah', m.answers === 2 && m.answers_ok === 1, JSON.stringify(m));
  check('breaker_trips terhitung', m.breaker_trips === 1, JSON.stringify(m));
  check('quota_exhausted terhitung + dimensi kuota', m.quota_exhausted === 1 && aggOps.usage['2026-08-26']['quota:ai'] === 1, JSON.stringify(aggOps.usage));

  const merged = core.mergeAggregate(agg1, aggOps);
  check('mergeAggregate menjumlahkan metrik tanpa menggandakan token',
    merged.metrics['2026-08-26'].ai_tokens_out === 300 && merged.dau.filter(r => r.day === '2026-08-26').length === 1,
    JSON.stringify(merged.dau));

  /* =====================================================================
   * 5. ROLLUP IDEMPOTEN
   * ===================================================================== */
  const db = makeDb(store.SQL);
  // Siapkan riwayat DAU 7 hari + token hari yang akan di-rollup.
  for (const r of dauRows.slice(0, 6)) await store.setMetric(db, r.day, 'dau', r.value);
  const HARI_ROLLUP = '2026-08-26';
  await store.applyAggregate(db, core.aggregate([
    ev('day_active', HARI_ROLLUP, { visitor_token: A, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: A, attempts_bucket: '10-29' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: B, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: C, attempts_bucket: '30+' })
  ]));
  await store.writePepperState(db, { rotated_at: Date.parse('2026-08-25T17:05:00Z'), current: 'p'.repeat(64), previous: null });

  const NOW = Date.parse('2026-08-27T17:05:00Z');
  const run1 = await rollup.runDailyRollup(db, { now: NOW, day: HARI_ROLLUP, pepper: 'q'.repeat(64) });
  const snap1 = snapshot(db);

  check('Rollup menghitung DAU = jumlah token unik hari itu', run1.dau === 3, JSON.stringify(run1));
  check('Rollup menulis metrics_daily.dau', db.tables.metrics.get(`${HARI_ROLLUP}|dau`) === 3, JSON.stringify([...db.tables.metrics]));
  check('Rollup MENGHAPUS dau_dedup hari itu',
    [...db.tables.dau].filter(k => k.startsWith(`${HARI_ROLLUP}|`)).length === 0, JSON.stringify([...db.tables.dau]));
  check('Rollup menulis rentang WAU (lower & upper), bukan satu angka',
    db.tables.metrics.get(`${HARI_ROLLUP}|wau_lower`) === 20 && db.tables.metrics.get(`${HARI_ROLLUP}|wau_upper`) > 20,
    `${db.tables.metrics.get(`${HARI_ROLLUP}|wau_lower`)} / ${db.tables.metrics.get(`${HARI_ROLLUP}|wau_upper`)}`);
  check('Rollup menandai WAU/MAU sebagai estimasi', db.tables.metrics.get(`${HARI_ROLLUP}|wau_mau_is_estimate`) === 1);
  check('Rollup merotasi pepper saat jatuh tempo', run1.pepperRotated === true, JSON.stringify(run1));
  check('Pepper lama pindah ke previous, bukan diarsipkan', db.tables.pepper.previous === 'p'.repeat(64) && db.tables.pepper.current === 'q'.repeat(64), JSON.stringify(db.tables.pepper));
  check('Rollup melakukan purge usage_daily & retention_daily',
    run1.purged.includes('usage_daily') && run1.purged.includes('retention_daily'), JSON.stringify(run1.purged));

  // Jalankan lagi persis sama: cron Cloudflare bisa memicu dua kali.
  const run2 = await rollup.runDailyRollup(db, { now: NOW, day: HARI_ROLLUP, pepper: 'q'.repeat(64) });
  check('Rollup kedua tidak mengubah state sama sekali (idempoten)', snapshot(db) === snap1, `${snap1}\n---\n${snapshot(db)}`);
  check('Rollup kedua tidak menggandakan DAU (tetap 3 di metrics_daily)',
    db.tables.metrics.get(`${HARI_ROLLUP}|dau`) === 3, String(db.tables.metrics.get(`${HARI_ROLLUP}|dau`)));
  check('Rollup kedua melaporkan DAU 0 dari token (sudah dipurge) tanpa menimpa metrik jadi 0',
    run2.dau === 0 && db.tables.metrics.get(`${HARI_ROLLUP}|dau`) === 3,
    JSON.stringify({ run2dau: run2.dau, metric: db.tables.metrics.get(`${HARI_ROLLUP}|dau`) }));

  // Event yang datang terlambat (backfill offline) HARUS bisa menaikkan DAU,
  // tetapi tidak boleh menurunkannya. Ini sisi lain dari tulis monoton.
  await store.applyAggregate(db, core.aggregate([
    ev('day_active', HARI_ROLLUP, { visitor_token: A, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: B, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: C, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: tok('d'), attempts_bucket: '5-9' })
  ]));
  const run3 = await rollup.runDailyRollup(db, { now: NOW, day: HARI_ROLLUP, pepper: 'q'.repeat(64) });
  check('Event terlambat menaikkan DAU (3 -> 4), tidak menurunkannya',
    run3.dau === 4 && db.tables.metrics.get(`${HARI_ROLLUP}|dau`) === 4,
    JSON.stringify({ run3dau: run3.dau, metric: db.tables.metrics.get(`${HARI_ROLLUP}|dau`) }));
  check('Rollup kedua tidak merotasi pepper lagi di jam yang sama', run2.pepperRotated === false, JSON.stringify(run2));

  // Purge lintas hari: token hari lama yang terlewat harus tersapu.
  const dbLama = makeDb(store.SQL);
  await store.applyAggregate(dbLama, core.aggregate([
    ev('day_active', '2026-08-20', { visitor_token: A, attempts_bucket: '5-9' }),
    ev('day_active', HARI_ROLLUP, { visitor_token: B, attempts_bucket: '5-9' })
  ]));
  await rollup.runDailyRollup(dbLama, { now: NOW, day: HARI_ROLLUP, pepper: 'r'.repeat(64) });
  check('Token hari-hari lama yang terlewat purge ikut tersapu', dbLama.tables.dau.size === 0, JSON.stringify([...dbLama.tables.dau]));

  check('scheduledAnalytics diam saat flag mati',
    JSON.stringify(await rollup.scheduledAnalytics({}, { ANALYTICS_ENABLED: 'off' }, null)) === '{"skipped":"flag_off"}');
  check('scheduledAnalytics diam saat binding D1 belum ada',
    JSON.stringify(await rollup.scheduledAnalytics({}, { ANALYTICS_ENABLED: 'on' }, null)) === '{"skipped":"no_binding"}');

  const report = {
    status: failed ? 'NOT READY' : 'PASS',
    gate: 'analytics-aggregate',
    counts: { pass: checks.filter(c => c.status === 'PASS').length, fail: checks.filter(c => c.status === 'FAIL').length },
    checks
  };
  fs.writeFileSync(path.join(root, 'ANALYTICS-AGGREGATE-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
