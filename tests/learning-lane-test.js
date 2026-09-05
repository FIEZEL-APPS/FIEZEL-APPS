const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL gerbang — lane telemetri belajar (fiezel-learning-event-v1).
 *
 * Kontrak yang dibuktikan (docs/BRAIN-TELEMETRY-SCHEMA.md, docs/BRAIN-DATA-PRIVACY.md §7):
 *  1. SKEMA KETAT: enum tertutup persis, field asing/teks bebas/timestamp
 *     presisi/ID stabil DITOLAK 400 — bukan dibuang diam-diam.
 *  2. IDEMPOTEN: replay batch penuh tidak mengubah SATU penghitung pun
 *     (200 duplicate); replay parsial hanya menghitung event baru (§5.1).
 *  3. RATE LIMIT: batch ke-61 dalam satu jam dari IP yang sama ditolak 429.
 *  4. KILL SWITCH: LEARNING_ENABLED != 'on' -> 202 {disabled:true}, nol tulis.
 *  5. NOL ID STABIL: tabel dedup hanya berisi UUID acak + day; agregat hanya
 *     berisi dimensi enum; tanpa binding D1 jawabannya 202, bukan 500.
 *  6. Salinan migrasi 0007 byte-identik (learning/migrations/ vs migrations/).
 *
 * D1 ditiru dengan pola tests/analytics-dedup-test.js: hanya SQL persis dari
 * learning-store-d1.js yang dikenali; SQL lain melempar.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __fzRoot;
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', detail: ok ? undefined : String(detail ?? '') });
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

/* ==========================================================================
 * Tiruan D1 — hanya tiga SQL learning-store-d1.js yang dikenali
 * ========================================================================== */
function makeDb(SQL) {
  const t = {
    daily: new Map(), // 'day|event|dim' -> n
    dedup: new Map()  // event_id -> { batch_id, day }
  };

  function exec(sql, params) {
    switch (sql) {
      case SQL.upsertLearningDaily: {
        const k = `${params[0]}|${params[1]}|${params[2]}`;
        t.daily.set(k, (t.daily.get(k) || 0) + params[3]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.insertLearningEventId: {
        if (t.dedup.has(params[0])) return { results: [], meta: { changes: 0 } }; // OR IGNORE
        t.dedup.set(params[0], { batch_id: params[1], day: params[2] });
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.purgeLearningDedupOlderThan: {
        let n = 0;
        for (const [id, row] of [...t.dedup]) if (row.day < params[0]) { t.dedup.delete(id); n += 1; }
        return { results: [], meta: { changes: n } };
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
        }
      };
    }
  };
}

/** Potret SEMUA penghitung — idempotensi diuji terhadap seluruh tabel. */
const snapshot = db => JSON.stringify([...db.tables.daily].sort());

/* ==========================================================================
 * Permintaan HTTP tiruan (pola tests/analytics-dedup-test.js)
 * ========================================================================== */
let ipCounter = 0;
function makeRequest(body, opts = {}) {
  const ip = opts.ip || `203.0.113.${(ipCounter++ % 250) + 1}`;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Map([['cf-connecting-ip', ip], ['content-type', 'application/json']]);
  headers.set('content-length', String(Buffer.byteLength(text)));
  return {
    method: 'POST',
    url: 'https://api.fiezel.my.id/api/learning/events',
    headers: { get: k => (headers.has(k.toLowerCase()) ? headers.get(k.toLowerCase()) : null) },
    async text() { return text; }
  };
}

const uuid = () => crypto.randomUUID();

(async () => {
  const core = await import('../workers/api/learning/learning-core.js');
  const store = await import('../workers/api/learning/learning-store-d1.js');
  const route = await import('../workers/api/learning/route-learning-events.js');

  const NOW = Date.parse('2026-08-29T10:00:00Z');
  const HARI = '2026-08-29';

  // waitUntil harus benar-benar dieksekusi supaya agregat tertulis.
  const pending = [];
  const ctx = { waitUntil(p) { pending.push(p); } };
  const flush = () => Promise.all(pending.splice(0));

  const parse = async res => ({ status: res.status, body: JSON.parse(await res.text()) });
  const handle = (db, body, opts = {}) => route.handleLearningEvents(
    makeRequest(body, opts),
    Object.assign({ LEARNING_ENABLED: 'on', RATE_SALT: 'salt-learning-uji', LEARNING_DB: db }, opts.env || {}),
    ctx, opts.now || NOW
  );

  const answer = extra => Object.assign({
    eventId: uuid(),
    type: 'answer_outcome',
    studyDay: 12,
    payload: {
      domain: 'grammar', level: 'A2', mode: 'adaptive', skillBucket: 'tense-past',
      correct: true, predictedBucket: 'p60-80', responseTimeBucket: 's2-5',
      attemptBucket: 'a1', reviewGapBucket: 'd1-3', hintUsed: false,
      decisionReason: 'weak_skill'
    }
  }, extra);
  const summary = extra => Object.assign({
    eventId: uuid(),
    type: 'session_summary',
    studyDay: 12,
    payload: {
      domain: 'grammar', level: 'A2', policyId: 'core-brain-v3-default',
      plannedBucket: 'q6-12', answeredBucket: 'q6-12', completed: true,
      accuracyBucket: 'p60-80', durationBucket: 'm5-15'
    }
  }, extra);
  const envelope = (events, extra) => Object.assign({
    schema: core.LEARNING_SCHEMA_ID,
    batchId: uuid(),
    appBuild: 'm025-186',
    brainBundle: 'brain-v3',
    contentVersion: 'grammar-templates@2026-08',
    day: HARI,
    events
  }, extra);

  /* =====================================================================
   * 0. Salinan migrasi byte-identik + migrasi tanpa DELETE/DROP
   * ===================================================================== */
  const migA = fs.readFileSync(path.join(root, 'workers/api/learning/migrations/0007_learning.sql'));
  const migB = fs.readFileSync(path.join(root, 'workers/api/migrations/0007_learning.sql'));
  check('salinan migrasi 0007 byte-identik (learning/migrations vs migrations)', migA.equals(migB));
  const migSql = migA.toString('utf8').replace(/--[^\n]*/g, '');
  check('migrasi 0007 tanpa DELETE/DROP/ALTER', !/\b(DELETE|DROP|ALTER|TRUNCATE)\b/i.test(migSql));
  // DDL dedup hanya boleh tiga kolom yang dijanjikan.
  const dedupDdl = /CREATE TABLE IF NOT EXISTS learning_dedup \(([\s\S]*?)\)/.exec(migSql);
  const dedupCols = dedupDdl[1].split(',').map(s => s.trim().split(/\s+/)[0])
    .filter(c => c && !/^PRIMARY$/i.test(c));
  check('tabel learning_dedup hanya kolom event_id, batch_id, day',
    JSON.stringify(dedupCols.sort()) === JSON.stringify(['batch_id', 'day', 'event_id']),
    JSON.stringify(dedupCols));

  /* =====================================================================
   * 1. Kill switch: default mati, dan mati = nol tulis
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const r = await parse(await handle(db, envelope([answer()]), { env: { LEARNING_ENABLED: 'off' } }));
    check('LEARNING_ENABLED=off -> 202 {disabled:true}', r.status === 202 && r.body.disabled === true, JSON.stringify(r));
    await flush();
    check('LEARNING_ENABLED=off -> nol baris tertulis', db.tables.daily.size === 0 && db.tables.dedup.size === 0);
    const r2 = await parse(await handle(db, envelope([answer()]), { env: { LEARNING_ENABLED: undefined } }));
    check('LEARNING_ENABLED absen -> tetap mati (fail-closed)', r2.status === 202 && r2.body.disabled === true, JSON.stringify(r2));

    const wrangler = fs.readFileSync(path.join(root, 'workers/api/wrangler.toml'), 'utf8');
    check('wrangler.toml men-default-kan LEARNING_ENABLED = "off"', /^LEARNING_ENABLED = "off"$/m.test(wrangler));
    check('wrangler.toml punya binding LEARNING_DB -> fiezel-learning',
      /binding\s*=\s*"LEARNING_DB"/.test(wrangler) && /database_name\s*=\s*"fiezel-learning"/.test(wrangler));
  }

  /* =====================================================================
   * 2. Tanpa binding D1 -> 202 diam, bukan 500
   * ===================================================================== */
  {
    const r = await parse(await handle(null, envelope([answer()])));
    check('tanpa LEARNING_DB -> 202 (lane diam), bukan 500', r.status === 202 && r.body.disabled === true, JSON.stringify(r));
  }

  /* =====================================================================
   * 3. Skema ketat: setiap penolakan wajib 400/413 dengan alasan yang tepat
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const reject = async (name, body, wantStatus, wantError) => {
      const r = await parse(await handle(db, body));
      check(name, r.status === wantStatus && r.body.error === wantError,
        `status=${r.status} error=${r.body.error}`);
    };

    await reject('skema tak dikenal ditolak 400 bad_schema',
      envelope([answer()], { schema: 'fiezel-learning-event-v2' }), 400, 'bad_schema');
    await reject('batchId absen ditolak 400 bad_batch_id (WAJIB, bukan opsional)',
      (() => { const e = envelope([answer()]); delete e.batchId; return e; })(), 400, 'bad_batch_id');
    await reject('batchId bukan UUID v4 ditolak 400 bad_batch_id',
      envelope([answer()], { batchId: 'siswa-kelas-7a-batch-001' }), 400, 'bad_batch_id');
    await reject('field asing di amplop (installId) ditolak 400 foreign_field',
      envelope([answer()], { installId: 'abc' }), 400, 'foreign_field');
    await reject('timestamp presisi di event (`at`) ditolak 400 foreign_field',
      envelope([answer({ at: 1756454400000 })]), 400, 'foreign_field');
    await reject('ID stabil di event (userId) ditolak 400 foreign_field',
      envelope([answer({ userId: 'u-123' })]), 400, 'foreign_field');
    await reject('ID konten di payload (lessonId) ditolak 400 foreign_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload, { lessonId: 'past_simple_regular_forms' }); return e; })()]),
      400, 'foreign_field');
    await reject('teks bebas di enum (skillBucket) ditolak 400 invalid_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload, { skillBucket: 'catatan guru: anak ini lemah past tense' }); return e; })()]),
      400, 'invalid_field');
    await reject('nilai di luar enum (level C2) ditolak 400 invalid_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload, { level: 'C2' }); return e; })()]),
      400, 'invalid_field');
    await reject('domain selain grammar ditolak 400 invalid_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload, { domain: 'listening' }); return e; })()]),
      400, 'invalid_field');
    await reject('skor kontinu di field boolean (correct=0.82) ditolak 400 invalid_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload, { correct: 0.82 }); return e; })()]),
      400, 'invalid_field');
    await reject('field wajib hilang (mode) ditolak 400 missing_field',
      envelope([(() => { const e = answer(); e.payload = Object.assign({}, e.payload); delete e.payload.mode; return e; })()]),
      400, 'missing_field');
    await reject('tipe event tak dikenal ditolak 400 unknown_type',
      envelope([answer({ type: 'page_view' })]), 400, 'unknown_type');
    await reject('eventId bukan UUID v4 ditolak 400 bad_event_id',
      envelope([answer({ eventId: 'event-000001' })]), 400, 'bad_event_id');
    await reject('studyDay pecahan ditolak 400 bad_study_day',
      envelope([answer({ studyDay: 12.5 })]), 400, 'bad_study_day');
    await reject('eventId kembar dalam satu batch ditolak 400 duplicate_event_id',
      (() => { const e = answer(); return envelope([e, Object.assign({}, e)]); })(), 400, 'duplicate_event_id');
    await reject('`day` di luar ±2 hari ditolak 400 day_out_of_range',
      envelope([answer()], { day: '2026-08-01' }), 400, 'day_out_of_range');
    await reject('batch kosong ditolak 400 no_events', envelope([]), 400, 'no_events');
    await reject('batch 21 event ditolak 413 too_many_events',
      envelope(Array.from({ length: 21 }, () => answer())), 413, 'too_many_events');

    // Body > 8 KB ditolak SEBELUM JSON.parse.
    const gemuk = await parse(await handle(db, JSON.stringify(envelope([answer()])) + ' '.repeat(9000)));
    check('body > 8 KB ditolak 413 too_large', gemuk.status === 413 && gemuk.body.error === 'too_large', JSON.stringify(gemuk));

    await flush();
    check('semua penolakan skema -> nol baris tertulis', db.tables.daily.size === 0 && db.tables.dedup.size === 0,
      `daily=${db.tables.daily.size} dedup=${db.tables.dedup.size}`);
  }

  /* =====================================================================
   * 4. Jalur sukses + replay idempoten (penuh dan parsial)
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const e1 = answer();
    const e2 = summary();
    const batch = envelope([e1, e2]);

    const r1 = await parse(await handle(db, batch));
    await flush();
    check('batch sah diterima 202 accepted=2', r1.status === 202 && r1.body.accepted === 2, JSON.stringify(r1));
    check('confidenceBucket opsional: absen tetap diterima', db.tables.daily.size > 0);

    const potret = snapshot(db);
    check('agregat berisi dimensi enum yang diharapkan',
      db.tables.daily.get(`${HARI}|answer_outcome|total`) === 1 &&
      db.tables.daily.get(`${HARI}|answer_outcome|skill:tense-past`) === 1 &&
      db.tables.daily.get(`${HARI}|answer_outcome|predicted_hit:p60-80`) === 1 &&
      db.tables.daily.get(`${HARI}|session_summary|policy_accuracy:core-brain-v3-default:p60-80`) === 1,
      snapshot(db));

    // Replay PENUH: batch yang sama persis dikirim ulang (retry setelah timeout).
    const r2 = await parse(await handle(db, batch));
    await flush();
    check('replay batch penuh dijawab 200 duplicate', r2.status === 200 && r2.body.duplicate === true, JSON.stringify(r2));
    check('replay batch penuh tidak mengubah SATU penghitung pun', snapshot(db) === potret);

    // Replay PARSIAL (§5.1): batch BARU membawa 1 event lama + 1 event baru.
    const e3 = answer();
    const r3 = await parse(await handle(db, envelope([e1, e3])));
    await flush();
    check('replay parsial hanya menghitung event baru (accepted=1)', r3.status === 202 && r3.body.accepted === 1, JSON.stringify(r3));
    check('replay parsial menaikkan total tepat +1',
      db.tables.daily.get(`${HARI}|answer_outcome|total`) === 2, snapshot(db));

    // Nol ID stabil di penyimpanan: dedup hanya UUID+day, agregat hanya enum.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    const dedupBersih = [...db.tables.dedup].every(([id, row]) =>
      UUID_RE.test(id) && UUID_RE.test(row.batch_id) && /^\d{4}-\d{2}-\d{2}$/.test(row.day) &&
      Object.keys(row).length === 2);
    check('tabel dedup hanya berisi UUID acak + day', dedupBersih);
    const dimBersih = [...db.tables.daily.keys()].every(k =>
      !UUID_RE.test(k.split('|')[2]) && k.split('|').length === 3);
    check('tabel agregat tidak memuat eventId/batchId', dimBersih);

    // Purge TTL 7 hari: baris lama hilang, baris segar selamat.
    db.tables.dedup.set(uuid(), { batch_id: uuid(), day: '2026-08-20' });
    const purged = await store.purgeLearningDedup(db, HARI);
    check('purge dedup menghapus baris > 7 hari dan menyisakan yang segar',
      purged === 1 && [...db.tables.dedup.values()].every(r => r.day >= '2026-08-22'),
      `purged=${purged}`);
  }

  /* =====================================================================
   * 5. Rate limit: batch ke-61 dari IP yang sama dalam satu jam -> 429
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const IP = '198.51.100.77';
    let last = null;
    for (let i = 0; i < 61; i += 1) {
      last = await parse(await handle(db, envelope([answer()]), { ip: IP }));
      if (i < 60 && last.status === 429) break;
    }
    check('batch ke-61 dari IP yang sama ditolak 429', last.status === 429 && last.body.error === 'rate_limited', JSON.stringify(last));
    const lain = await parse(await handle(db, envelope([answer()]), { ip: '198.51.100.78' }));
    check('IP lain tidak ikut terkena rem', lain.status === 202, JSON.stringify(lain));
    await flush();
  }

  /* =====================================================================
   * 6. Sumber kode: nol fallback binding + rute terdaftar di wiring
   * ===================================================================== */
  {
    // Komentar boleh MENJELASKAN kenapa fallback tidak ada; yang dilarang
    // adalah KODE yang membacanya. Maka komentar dibuang sebelum dipindai.
    const routeSrc = fs.readFileSync(path.join(root, 'workers/api/learning/route-learning-events.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    check('route hanya membaca env.LEARNING_DB (tanpa fallback STATS_DB/CORE_DB)',
      /env\.LEARNING_DB/.test(routeSrc) && !/STATS_DB|CORE_DB|ANALYTICS_DB/.test(routeSrc));
    const wiring = fs.readFileSync(path.join(root, 'workers/api/route-wiring.js'), 'utf8');
    check('route-wiring mendaftarkan registerLearningRoutes',
      /registerLearningRoutes\(collector\(routes, wrapLearning\)\)/.test(wiring));
  }

  /* ===================================================================== */
  const n = checks.length;
  const bad = checks.filter(c => c.status === 'FAIL');
  console.log(`\n${n - bad.length}/${n} pemeriksaan lulus`);
  if (failed) { console.error('LearningLane: FAIL'); process.exit(1); }
  console.log('LearningLane: PASS');
})().catch(e => { console.error('LearningLane: FAIL (exception)', e); process.exit(1); });
