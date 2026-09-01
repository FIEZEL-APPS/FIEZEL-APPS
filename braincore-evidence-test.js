/**
 * FIEZEL gerbang — lane BUKTI BELAJAR BRAINCORE (fiezel-braincore-evidence-v1).
 *
 * Kontrak yang dibuktikan, satu bab per tuntutan tugas:
 *  A. PRIVASI      — yang keluar perangkat hanya bucket enum; nama murid,
 *                    jawaban, riwayat, dan seluruh localStorage TIDAK IKUT.
 *                    `cohort` acak (bukan turunan identitas) dan BEROTASI.
 *  B. MALFORMED    — field asing / enum salah / batchId absen / hari ngawur /
 *                    batch kebesaran ditolak 4xx, bukan diperbaiki diam-diam.
 *  C. OFFLINE      — tanpa fetch, event TETAP tersimpan di antrean; Braincore
 *                    tidak terganggu dan tidak ada yang hilang.
 *  D. RETRY        — kegagalan jaringan/5xx TIDAK meng-ack; flush berikutnya
 *                    mengirim eventId yang SAMA; Retry-After dihormati.
 *  E. DUPLICATE    — replay penuh = 200 duplicate + NOL perubahan penghitung;
 *                    replay parsial hanya menghitung yang baru; duplikat di
 *                    dalam satu batch ditolak.
 *  F. SERVER FAIL  — D1 melempar / binding absen / flag mati = 202 tanpa tulis
 *                    (bukan 500, bukan 404 yang membuat klien retry selamanya).
 *  G. AGREGASI     — aggregateEvidence + ringkasan Owner Dashboard benar,
 *                    termasuk hitungan murid distinct.
 *  H. ISOLASI      — lane ini tidak menyentuh pipeline analytics/learning:
 *                    database, tabel, rute, dan kill switch berbeda; rute owner
 *                    tidak pernah menyebut tabel yang memuat cohort.
 *  I. PARITAS      — enum klien == enum server (klien yang mengirim nilai yang
 *                    ditolak server akan retry selamanya tanpa ada yang tahu).
 *
 * D1 ditiru dengan pola learning-lane-test.js: hanya SQL persis dari
 * evidence-store-d1.js yang dikenali; SQL lain melempar.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const checks = [];
let failed = false;

function check(name, ok, detail) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL' });
  if (ok) console.log(`ok - ${name}`);
  else { failed = true; console.error(`FAIL - ${name} :: ${String(detail ?? '')}`); }
}

/* ==========================================================================
 * Tiruan D1
 * ========================================================================== */
function makeDb(SQL, opts = {}) {
  const t = { daily: new Map(), dedup: new Map(), learnerDay: new Set() };
  function exec(sql, params) {
    if (opts.throwOn && opts.throwOn === sql) throw new Error('D1_ERROR: no such table');
    switch (sql) {
      case SQL.upsertEvidenceDaily: {
        const k = `${params[0]}|${params[1]}|${params[2]}`;
        t.daily.set(k, (t.daily.get(k) || 0) + params[3]);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.insertEvidenceEventId: {
        if (t.dedup.has(params[0])) return { results: [], meta: { changes: 0 } };
        t.dedup.set(params[0], { batch_id: params[1], day: params[2] });
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.insertLearnerDay: {
        const k = `${params[0]}|${params[1]}`;
        if (t.learnerDay.has(k)) return { results: [], meta: { changes: 0 } };
        t.learnerDay.add(k);
        return { results: [], meta: { changes: 1 } };
      }
      case SQL.purgeEvidenceDedupOlderThan: {
        let n = 0;
        for (const [id, row] of [...t.dedup]) if (row.day < params[0]) { t.dedup.delete(id); n += 1; }
        return { results: [], meta: { changes: n } };
      }
      case SQL.purgeLearnerDayOlderThan: {
        let n = 0;
        for (const k of [...t.learnerDay]) if (k.split('|')[0] < params[0]) { t.learnerDay.delete(k); n += 1; }
        return { results: [], meta: { changes: n } };
      }
      case SQL.selectEvidenceRange: {
        const rows = [];
        for (const [k, n] of t.daily) {
          const [day, event, dim] = k.split('|');
          if (day >= params[0] && day <= params[1]) rows.push({ day, event, dim, n });
        }
        rows.sort((a, b) => (a.day < b.day ? -1 : 1));
        return { results: rows, meta: { changes: 0 } };
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

const snapshot = db => JSON.stringify([...db.tables.daily].sort());

/* ==========================================================================
 * Permintaan HTTP tiruan
 * ========================================================================== */
let ipCounter = 0;
function makeRequest(body, opts = {}) {
  const ip = opts.ip || `198.51.100.${(ipCounter++ % 250) + 1}`;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Map([['cf-connecting-ip', ip], ['content-type', 'application/json']]);
  headers.set('content-length', String(Buffer.byteLength(text)));
  for (const [k, v] of Object.entries(opts.headers || {})) headers.set(k.toLowerCase(), String(v));
  return {
    method: opts.method || 'POST',
    url: opts.url || 'https://api.fiezel.my.id/api/braincore/evidence',
    headers: { get: k => (headers.has(k.toLowerCase()) ? headers.get(k.toLowerCase()) : null) },
    async text() { return text; }
  };
}

const uuid = () => crypto.randomUUID();
const COHORT = 'a1b2c3d4e5f60718';

(async () => {
  const core = await import('./workers/api/evidence/evidence-core.js');
  const store = await import('./workers/api/evidence/evidence-store-d1.js');
  const route = await import('./workers/api/evidence/route-evidence.js');
  const client = require('./features/telemetry/fiezel-braincore-evidence.js');
  const queueMod = require('./features/telemetry/fiezel-learning-queue.js');
  const transport = require('./features/telemetry/fiezel-learning-transport.js');

  const NOW = Date.parse('2026-09-01T10:00:00Z');
  const HARI = '2026-09-01';

  const pending = [];
  const ctx = { waitUntil(p) { pending.push(p); } };
  const drain = () => Promise.all(pending.splice(0));
  const parse = async res => ({ status: res.status, body: JSON.parse(await res.text()) });
  const handle = (db, body, opts = {}) => route.handleEvidenceEvents(
    makeRequest(body, opts),
    Object.assign({ EVIDENCE_ENABLED: 'on', RATE_SALT: 'salt-evidence-uji', EVIDENCE_DB: db }, opts.env || {}),
    ctx, opts.now || NOW
  );

  const evidenceEvent = extra => Object.assign({
    eventId: uuid(), type: 'learner_evidence', cohort: COHORT,
    payload: {
      level: 'A2', masteryBucket: 'm40-60', masteryTrend: 'up',
      misconceptionBucket: 'mc2-3', misconceptionSkill: 'tense-perfect',
      difficultyCalibration: 'calibrated', calibrationErrorBucket: 'e0-10',
      consistencyBucket: 'c50-75', retentionRiskBucket: 'r30-60',
      evidenceVolumeBucket: 'n21-100', improvementTrend: 'improving'
    }
  }, extra);
  const decisionEvent = extra => Object.assign({
    eventId: uuid(), type: 'braincore_decision', cohort: COHORT,
    payload: {
      level: 'A2', policyId: 'core-brain-v3-default', decision: 'weak_skill',
      outcome: 'positive', recommendation: 'keep_or_progress',
      masteryDeltaBucket: 'd1-10', adherenceBucket: 'a80-100'
    }
  }, extra);
  const envelope = events => ({ schema: core.EVIDENCE_SCHEMA_ID, batchId: uuid(), day: HARI, events });

  /* =====================================================================
   * A. PRIVASI
   * ===================================================================== */
  {
    // Snapshot learner PENUH (bentuk remoteLearnerEvidenceSnapshot) yang memuat
    // hal-hal yang TIDAK BOLEH keluar: nama skill mentah, waktu respons, dsb.
    const snap = {
      schema: 'fiezel-learner-evidence-v1',
      generatedAt: '2026-09-01T10:00:00.000Z',
      behavior: { activeDays14: 9, consistency14d: 64, streakDays: 5, todayAttempts: 12, abandonmentRate: 20, medianResponseMs: 4200, preferredStudyWindow: 'malam' },
      confidence: { evidence: 40, gap: 18 },
      memory: { dueReviews: 7, maxForgettingRisk: 55, highRiskCount: 3 },
      skills: { measured: 30, recurringErrorSkills: 2, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 12, accuracy: 41, errorRate: 59, recurringErrors: 4 }] },
      privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false }
    };
    const input = client.fromSnapshot(snap, { level: 'A2', mastery: 52, masteryDelta: 6, accuracy: 41, improvementDelta: 7 });
    const built = client.buildLearnerEvidenceEvent(Object.assign({ eventId: uuid(), cohort: COHORT }, input));
    check('(A) snapshot learner terproyeksi menjadi event yang sah', built.ok === true, built.reason);
    const json = JSON.stringify(built.event);
    check('(A) nama skill MENTAH tidak ikut keluar (present_perfect -> famili tertutup)',
      !json.includes('present_perfect') && built.event.payload.misconceptionSkill === 'tense-perfect');
    for (const bocor of ['medianResponseMs', 'preferredStudyWindow', 'generatedAt', 'streakDays', 'todayAttempts', 'weakest', 'attempts', 'errorRate']) {
      check(`(A) field '${bocor}' tidak pernah keluar perangkat`, !json.includes(bocor));
    }
    check('(A) tidak ada timestamp presisi di event', !/\d{4}-\d{2}-\d{2}T/.test(json) && !/"at"|"ts"/.test(json));
    // Kunci amplop: hanya empat, dan tidak satu pun berisi nama/identitas.
    check('(A) event hanya punya empat kunci teratas',
      JSON.stringify(Object.keys(built.event).sort()) === JSON.stringify(['cohort', 'eventId', 'payload', 'type']));
    // Cohort: acak, BUKAN turunan apa pun, dan berotasi.
    const hex = n => 'f'.repeat(n);
    const s1 = client.cohortState({ stored: null, nowMs: NOW, randomHex: hex });
    const s2 = client.cohortState({ stored: { cohort: s1.cohort, epoch: s1.epoch }, nowMs: NOW + 86400000, randomHex: hex });
    const s3 = client.cohortState({ stored: { cohort: s1.cohort, epoch: s1.epoch }, nowMs: NOW + 15 * 86400000, randomHex: () => '0'.repeat(16) });
    check('(A) cohort stabil di dalam satu epoch', s2.cohort === s1.cohort && s2.rotated === false);
    check('(A) cohort BEROTASI setelah 14 hari', s3.cohort !== s1.cohort && s3.rotated === true);
    check('(A) cohort tanpa CSPRNG = lane diam (tidak ada cadangan yang bisa ditebak)',
      client.cohortState({ stored: null, nowMs: NOW, randomHex: () => 'bukan-hex' }).cohort === null);
    // Server: cohort tidak pernah menjadi dimensi agregat.
    const rows = core.aggregateEvidence(HARI, [evidenceEvent()].map(e => ({ type: e.type, payload: e.payload, cohort: e.cohort })));
    check('(A) cohort TIDAK PERNAH menjadi dimensi agregat',
      rows.every(r => !r.dim.includes('cohort') && !r.dim.includes(COHORT)));
  }

  /* =====================================================================
   * B. MALFORMED EVIDENCE
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const cases = [
      ['skema salah', Object.assign(envelope([evidenceEvent()]), { schema: 'fiezel-learning-event-v1' }), 400, 'bad_schema'],
      ['batchId absen', (() => { const e = envelope([evidenceEvent()]); delete e.batchId; return e; })(), 400, 'bad_batch_id'],
      ['batchId bukan UUID v4', Object.assign(envelope([evidenceEvent()]), { batchId: 'batch-1' }), 400, 'bad_batch_id'],
      ['hari di luar jendela', Object.assign(envelope([evidenceEvent()]), { day: '2026-01-01' }), 400, 'day_out_of_range'],
      ['field asing di amplop', Object.assign(envelope([evidenceEvent()]), { installId: 'x' }), 400, 'foreign_field'],
      ['field asing di event', envelope([evidenceEvent({ at: NOW })]), 400, 'foreign_field'],
      ['field asing di payload', envelope([evidenceEvent({ payload: Object.assign(evidenceEvent().payload, { learnerName: 'Jahran' }) })]), 400, 'foreign_field'],
      ['nilai di luar enum', envidenceInvalid(), 400, 'invalid_field'],
      ['field wajib hilang', (() => { const e = evidenceEvent(); delete e.payload.masteryTrend; return envelope([e]); })(), 400, 'missing_field'],
      ['cohort salah bentuk', envelope([evidenceEvent({ cohort: 'JAHRAN' })]), 400, 'bad_cohort'],
      ['tipe event tak dikenal', envelope([evidenceEvent({ type: 'answer_outcome' })]), 400, 'bad_type'],
      ['batch kosong', envelope([]), 400, 'no_events']
    ];
    function envidenceInvalid() {
      const e = evidenceEvent();
      e.payload.masteryBucket = 'm999';
      return envelope([e]);
    }
    for (const [label, body, status, error] of cases) {
      const res = await parse(await handle(db, body));
      check(`(B) ${label} -> ${status} ${error}`, res.status === status && res.body.error === error,
        JSON.stringify(res));
    }
    // >20 event: dicek di inti, karena 21 event juga melampaui cap byte dan
    // permintaan HTTP-nya berhenti lebih dulu di 413 too_large (dua pagar yang
    // berbeda, keduanya benar).
    const tooMany = route.processEvidenceBatch(envelope(Array.from({ length: 21 }, () => evidenceEvent())), NOW);
    check('(B) >20 event -> 413 too_many_events', tooMany.status === 413 && tooMany.payload.error === 'too_many_events');
    const tooLarge = await parse(await handle(db, envelope(Array.from({ length: 21 }, () => evidenceEvent()))));
    check('(B) batch kebesaran ditolak sebelum JSON.parse -> 413 too_large',
      tooLarge.status === 413 && tooLarge.body.error === 'too_large');
    const bad = await parse(await handle(db, '{"schema":'));
    check('(B) JSON rusak -> 400 bad_json', bad.status === 400 && bad.body.error === 'bad_json');
    await drain();
    check('(B) NOL baris tertulis dari seluruh payload rusak', db.tables.daily.size === 0);
    // Duplikat DI DALAM satu batch: ditolak, bukan didiamkan.
    const dup = evidenceEvent();
    const dupRes = await parse(await handle(db, envelope([dup, Object.assign({}, dup)])));
    check('(B) eventId kembar di dalam satu batch -> 400 duplicate_event_id',
      dupRes.status === 400 && dupRes.body.error === 'duplicate_event_id');
    // Builder klien menolak payload yang tak terukur, bukan mengarang bucket.
    const kosong = client.buildLearnerEvidenceEvent({ eventId: uuid(), cohort: COHORT });
    check('(B) builder klien menolak keadaan yang belum terukur (tanpa mengarang bucket)',
      kosong.ok === false && String(kosong.reason).startsWith('unmeasured_'));
    check('(B) builder klien menolak eventId yang bukan UUID v4',
      client.buildDecisionEvent({ eventId: 'ev-1', cohort: COHORT }).reason === 'bad_event_id');
    check('(B) builder klien menolak policyId di luar daftar tertutup',
      client.buildDecisionEvent({ eventId: uuid(), cohort: COHORT, policyId: 'eksperimen-lokal' }).reason === 'unknown_policy');
  }

  /* =====================================================================
   * C. OFFLINE — Braincore tetap penuh, bukti menunggu
   * ===================================================================== */
  {
    const idb = queueMod.createMemoryIdb();
    const queue = queueMod.makeQueue({ idb });
    const ev = evidenceEvent();
    const put = await queue.put(ev, NOW);
    check('(C) event tersimpan di antrean lokal tanpa jaringan apa pun', put.ok === true && put.stored === true);
    // flush TANPA fetchFn = lingkungan tanpa jaringan: bukan error, event menunggu.
    const res = await transport.flush(queue, { nowMs: NOW });
    check('(C) flush tanpa fetch tidak melempar dan tidak menghapus apa pun',
      res.ok === false && res.rationale === 'brain3_lt_transport_no_fetch' && (await queue.stats(NOW)).count === 1);
    // Antrean baru di atas storage yang sama (simulasi reload) melihat event lama.
    const queue2 = queueMod.makeQueue({ idb });
    const peek = await queue2.peekBatch(10, NOW);
    check('(C) setelah reload, bukti offline masih ada dengan eventId yang sama',
      peek.length === 1 && peek[0].eventId === ev.eventId);
    // fetch yang melempar (offline sungguhan) -> requeue, backoff diberikan.
    const off = await transport.flush(queue2, {
      fetchFn: async () => { throw new Error('Failed to fetch'); },
      url: 'https://api.fiezel.my.id/api/braincore/evidence', nowMs: NOW, seed: 7,
      batchSchema: core.EVIDENCE_SCHEMA_ID, day: HARI, batchIdFn: uuid
    });
    check('(C) offline sungguhan: antre ulang + jadwal retry, bukan kehilangan',
      off.ok === false && off.rationale === 'brain3_lt_transport_offline_requeue' &&
      off.nextRetryInMs > 0 && (await queue2.stats(NOW)).count === 1);
  }

  /* =====================================================================
   * D. RETRY
   * ===================================================================== */
  {
    const idb = queueMod.createMemoryIdb();
    const queue = queueMod.makeQueue({ idb });
    const ev = evidenceEvent();
    await queue.put(ev, NOW);
    const sent = [];
    const fail500 = async (u, init) => { sent.push(JSON.parse(init.body)); return { status: 500, headers: { get: () => null } }; };
    const r1 = await transport.flush(queue, { fetchFn: fail500, url: '/api/braincore/evidence', nowMs: NOW, seed: 3, attempt: 0, batchSchema: core.EVIDENCE_SCHEMA_ID, day: HARI, batchIdFn: uuid });
    check('(D) 5xx TIDAK meng-ack: event tetap di antrean',
      r1.ok === false && r1.ackedCount === 0 && (await queue.stats(NOW)).count === 1);
    check('(D) 5xx memberi jadwal backoff', r1.nextRetryInMs > 0 && r1.rationale === 'brain3_lt_transport_backoff');
    // Backoff naik seiring percobaan beruntun.
    const r2 = await transport.flush(queue, { fetchFn: fail500, url: '/x', nowMs: NOW, seed: 3, attempt: 3, batchSchema: core.EVIDENCE_SCHEMA_ID, day: HARI, batchIdFn: uuid });
    check('(D) backoff eksponensial: percobaan ke-4 menunggu lebih lama daripada ke-1',
      r2.nextRetryInMs > r1.nextRetryInMs);
    // Retry-After menang atas backoff.
    const r3 = await transport.flush(queue, {
      fetchFn: async () => ({ status: 429, headers: { get: k => (k.toLowerCase() === 'retry-after' ? '120' : null) } }),
      url: '/x', nowMs: NOW, seed: 3, attempt: 5, batchSchema: core.EVIDENCE_SCHEMA_ID, day: HARI, batchIdFn: uuid
    });
    check('(D) Retry-After server menang atas tebakan backoff', r3.nextRetryInMs === 120000);
    // Percobaan berikutnya mengirim eventId yang SAMA.
    let ok = null;
    const r4 = await transport.flush(queue, {
      fetchFn: async (u, init) => { ok = JSON.parse(init.body); return { status: 202, headers: { get: () => null } }; },
      url: '/x', nowMs: NOW, seed: 3, attempt: 6, batchSchema: core.EVIDENCE_SCHEMA_ID, day: HARI, batchIdFn: uuid
    });
    check('(D) retry mengirim eventId yang SAMA (dedup jadi urusan server)',
      ok.events[0].eventId === ev.eventId && sent[0].events[0].eventId === ev.eventId);
    check('(D) hanya 2xx yang menghapus dari antrean',
      r4.ok === true && (await queue.stats(NOW)).count === 0);
    check('(D) amplop retry membawa skema + batchId + day lane bukti',
      ok.schema === core.EVIDENCE_SCHEMA_ID && /^[0-9a-f-]{36}$/.test(ok.batchId) && ok.day === HARI);
  }

  /* =====================================================================
   * E. DUPLICATE EVENT
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const e1 = evidenceEvent(); const e2 = decisionEvent();
    const batch = envelope([e1, e2]);
    const first = await parse(await handle(db, batch)); await drain();
    check('(E) batch pertama diterima 202', first.status === 202 && first.body.accepted === 2);
    const before = snapshot(db);
    const replay = await parse(await handle(db, batch)); await drain();
    check('(E) replay batch PENUH -> 200 duplicate', replay.status === 200 && replay.body.duplicate === true);
    check('(E) replay penuh tidak mengubah SATU penghitung pun', snapshot(db) === before);
    // Replay parsial: satu lama + satu baru -> hanya yang baru dihitung.
    const e3 = evidenceEvent();
    const mixed = { schema: core.EVIDENCE_SCHEMA_ID, batchId: uuid(), day: HARI, events: [e1, e3] };
    const part = await parse(await handle(db, mixed)); await drain();
    check('(E) replay parsial hanya menghitung event baru', part.status === 202 && part.body.accepted === 1);
    const totalEvidence = db.tables.daily.get(`${HARI}|learner_evidence|_:total`);
    check('(E) penghitung learner_evidence = 2 (bukan 3)', totalEvidence === 2, String(totalEvidence));
    // Cohort yang sama, hari yang sama, dua kirim -> tetap SATU murid.
    const learners = db.tables.daily.get(`${HARI}|learners|measured:distinct`);
    check('(E) satu cohort dalam satu hari dihitung sebagai SATU murid', learners === 1, String(learners));
  }

  /* =====================================================================
   * F. KEGAGALAN SERVER / INFRASTRUKTUR
   * ===================================================================== */
  {
    const db = makeDb(store.SQL);
    const off = await parse(await handle(db, envelope([evidenceEvent()]), { env: { EVIDENCE_ENABLED: 'off' } }));
    check('(F) kill switch mati -> 202 {disabled:true} (bukan 404 yang memicu retry abadi)',
      off.status === 202 && off.body.disabled === true);
    const noFlag = await parse(await handle(db, envelope([evidenceEvent()]), { env: { EVIDENCE_ENABLED: undefined } }));
    check('(F) flag tak terbaca = fail-closed (bukan izin)', noFlag.status === 202 && noFlag.body.disabled === true);
    await drain();
    check('(F) nol tulis saat lane mati', db.tables.daily.size === 0);

    const noBind = await parse(await handle(null, envelope([evidenceEvent()])));
    check('(F) binding EVIDENCE_DB absen -> 202 tanpa tulis, bukan 500',
      noBind.status === 202 && noBind.body.disabled === true);

    const sick = makeDb(store.SQL, { throwOn: store.SQL.insertEvidenceEventId });
    const boom = await parse(await handle(sick, envelope([evidenceEvent()])));
    check('(F) D1 melempar (tabel belum dimigrasi) -> 202, bukan 500',
      boom.status === 202 && boom.body.disabled === true);

    // Rate limit: ember lane ini sendiri.
    const rlDb = makeDb(store.SQL);
    const ip = '198.51.100.251';
    let limited = null;
    for (let i = 0; i <= route.LIMITS.RATE_PER_WINDOW; i++) {
      const r = await parse(await handle(rlDb, envelope([evidenceEvent()]), { ip }));
      if (r.status === 429) { limited = i; break; }
    }
    await drain();
    check('(F) rate limit menutup banjir dari satu IP', limited === route.LIMITS.RATE_PER_WINDOW, String(limited));
  }

  /* =====================================================================
   * G. KEBENARAN AGREGASI + RINGKASAN OWNER DASHBOARD
   * ===================================================================== */
  {
    const events = [
      { type: 'learner_evidence', payload: { level: 'A2', masteryBucket: 'm40-60', masteryTrend: 'up', misconceptionBucket: 'mc1', difficultyCalibration: 'calibrated', calibrationErrorBucket: 'e0-10', consistencyBucket: 'c50-75', retentionRiskBucket: 'r30-60', evidenceVolumeBucket: 'n21-100', improvementTrend: 'improving' } },
      { type: 'learner_evidence', payload: { level: 'A2', masteryBucket: 'm60-80', masteryTrend: 'up', misconceptionBucket: 'none', difficultyCalibration: 'too_easy', calibrationErrorBucket: 'e10-20', consistencyBucket: 'c75-100', retentionRiskBucket: 'r0-30', evidenceVolumeBucket: 'n101p', improvementTrend: 'steady' } },
      { type: 'braincore_decision', payload: { level: 'A2', policyId: 'core-brain-v3-default', decision: 'weak_skill', outcome: 'positive', recommendation: 'keep_or_progress', masteryDeltaBucket: 'd1-10', adherenceBucket: 'a80-100' } }
    ];
    const rows = core.aggregateEvidence(HARI, events);
    const get = (event, dim) => (rows.find(r => r.event === event && r.dim === dim) || {}).n;
    check('(G) total per tipe dihitung terpisah',
      get('learner_evidence', '_:total') === 2 && get('braincore_decision', '_:total') === 1);
    check('(G) dimensi yang sama dijumlahkan, yang berbeda dipisah',
      get('learner_evidence', 'masteryTrend:up') === 2 &&
      get('learner_evidence', 'masteryBucket:m40-60') === 1 &&
      get('learner_evidence', 'masteryBucket:m60-80') === 1);
    check('(G) kalibrasi kesulitan terhitung per nilai',
      get('learner_evidence', 'difficultyCalibration:calibrated') === 1 &&
      get('learner_evidence', 'difficultyCalibration:too_easy') === 1);
    check('(G) keputusan + hasil Braincore terhitung',
      get('braincore_decision', 'decision:weak_skill') === 1 &&
      get('braincore_decision', 'outcome:positive') === 1);
    check('(G) jumlah baris = jumlah pasangan unik (tanpa baris hantu)',
      rows.length === new Set(rows.map(r => r.event + '|' + r.dim)).size);
    check('(G) event tak dikenal tidak pernah diagregasi',
      core.aggregateEvidence(HARI, [{ type: 'answer_outcome', payload: { level: 'A2' } }]).length === 0);
    check('(G) agregasi deterministik (urutan stabil)',
      JSON.stringify(core.aggregateEvidence(HARI, events)) === JSON.stringify(rows));

    // Ringkasan dashboard.
    const withLearners = rows.concat([{ day: HARI, event: 'learners', dim: 'measured:distinct', n: 3 }]);
    const sum = route.summarizeEvidenceRows(withLearners, { from: HARI, to: HARI });
    check('(G) ringkasan: jumlah murid terukur', sum.learnersMeasured === 3);
    check('(G) ringkasan: jumlah bukti + keputusan', sum.evidenceCount === 2 && sum.decisionCount === 1);
    check('(G) ringkasan: tren mastery', sum.masteryTrend.up === 2);
    check('(G) ringkasan: tren miskonsepsi', sum.misconception.mc1 === 1 && sum.misconception.none === 1);
    check('(G) ringkasan: kalibrasi kesulitan', sum.difficultyCalibration.calibrated === 1 && sum.difficultyCalibration.too_easy === 1);
    check('(G) ringkasan: keputusan/hasil Braincore', sum.decision.weak_skill === 1 && sum.outcome.positive === 1);
    check('(G) ringkasan: tren perbaikan belajar', sum.improvementTrend.improving === 1 && sum.improvementTrend.steady === 1);
    check('(G) ringkasan: deret harian', sum.days.length === 1 && sum.days[0].day === HARI && sum.days[0].learners === 3);
    const kosong = route.summarizeEvidenceRows([], { from: HARI, to: HARI });
    check('(G) nol baris dibedakan dari nol murid (measured=false)',
      kosong.measured === false && kosong.learnersMeasured === 0);
    check('(G) ringkasan tidak pernah memuat cohort', !JSON.stringify(sum).includes(COHORT));

    // Jalur baca owner: gerbang + bentuk jawaban.
    const db = makeDb(store.SQL);
    await handle(db, envelope([evidenceEvent(), decisionEvent()])); await drain();
    const token = 'token-owner-uji-yang-panjang';
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const mkCtx = headers => ({ request: makeRequest('', { method: 'GET', url: 'https://api.fiezel.my.id/api/owner/braincore-evidence?days=7', headers }), env: { OWNER_TOKEN_HASH: hash, EVIDENCE_DB: db }, now: NOW });
    const denied = await parse(await route.handleOwnerEvidence(mkCtx({})));
    check('(G) rute owner tanpa token -> 403', denied.status === 403 && denied.body.error === 'forbidden_owner');
    const wrong = await parse(await route.handleOwnerEvidence(mkCtx({ 'x-fiezel-owner-token': 'salah' })));
    check('(G) token salah -> 403 dengan bentuk penolakan yang SAMA', wrong.status === 403 && wrong.body.error === 'forbidden_owner');
    const noSecret = await parse(await route.handleOwnerEvidence({ request: mkCtx({}).request, env: { EVIDENCE_DB: db }, now: NOW }));
    check('(G) tanpa OWNER_TOKEN_HASH -> fail-closed 403', noSecret.status === 403);
    const okRes = await parse(await route.handleOwnerEvidence(mkCtx({ 'x-fiezel-owner-token': token })));
    check('(G) owner sah membaca ringkasan agregat',
      okRes.status === 200 && okRes.body.migrated === true && okRes.body.summary.evidenceCount === 1 && okRes.body.summary.decisionCount === 1);
    check('(G) jawaban owner tidak memuat identitas apa pun',
      !JSON.stringify(okRes.body).includes(COHORT) && !/learnerName|userName/.test(JSON.stringify(okRes.body)));
    const noDb = await parse(await route.handleOwnerEvidence({ request: mkCtx({ 'x-fiezel-owner-token': token }).request, env: { OWNER_TOKEN_HASH: hash }, now: NOW }));
    check('(G) belum dimigrasi dibedakan dari nol murid (migrated:false)',
      noDb.status === 200 && noDb.body.migrated === false && noDb.body.summary === null);

    // Purge TTL: cohort yang tidak pernah dipurge adalah identitas.
    const purgeDb = makeDb(store.SQL);
    purgeDb.tables.dedup.set('lama', { batch_id: 'b', day: '2026-08-01' });
    purgeDb.tables.learnerDay.add('2026-08-01|' + COHORT);
    purgeDb.tables.learnerDay.add(HARI + '|' + COHORT);
    const purged = await store.purgeEvidence(purgeDb, HARI);
    check('(G) purge membuang dedup + cohort yang kedaluwarsa, menyisakan yang segar',
      purged.dedup === 1 && purged.learnerDay === 1 && purgeDb.tables.learnerDay.size === 1);
  }

  /* =====================================================================
   * H. ISOLASI TERHADAP PIPELINE YANG SUDAH ADA
   * ===================================================================== */
  {
    const noComment = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const routeSrc = noComment(fs.readFileSync(path.join(root, 'workers/api/evidence/route-evidence.js'), 'utf8'));
    check('(H) rute hanya membaca env.EVIDENCE_DB (tanpa fallback lintas lane)',
      /env\.EVIDENCE_DB/.test(routeSrc) && !/STATS_DB|CORE_DB|ANALYTICS_DB|LEARNING_DB/.test(routeSrc));
    // Dipindai adalah SQL-nya, bukan berkasnya: daftar FORBIDDEN_TABLES sendiri
    // memuat nama-nama itu, dan melarang berkas menyebutnya akan melarang
    // larangannya sendiri ditulis.
    const sqlText = Object.values(store.SQL).join('\n');
    for (const t of store.FORBIDDEN_TABLES) {
      check(`(H) NOL kueri lane bukti menyentuh tabel '${t}'`, !new RegExp('\\b' + t + '\\b').test(sqlText));
    }
    check('(H) seluruh kueri lane bukti hanya menyentuh tiga tabelnya sendiri',
      (sqlText.match(/(?:INTO|FROM)\s+([a-z_]+)/gi) || [])
        .every(m => store.EVIDENCE_TABLES.includes(m.split(/\s+/)[1])));
    // Jalur BACA owner tidak boleh menyentuh tabel yang memuat cohort.
    const ownerSlice = routeSrc.slice(routeSrc.indexOf('handleOwnerEvidence'));
    for (const t of store.OWNER_FORBIDDEN_TABLES) {
      check(`(H) jalur baca owner tidak pernah menyebut '${t}'`, !ownerSlice.includes(t));
    }
    check('(H) kueri baca owner hanya SELECT', /^SELECT/i.test(store.SQL.selectEvidenceRange) && /^SELECT/i.test(store.SQL.selectEvidenceTotals));
    const wiring = fs.readFileSync(path.join(root, 'workers/api/route-wiring.js'), 'utf8');
    check('(H) route-wiring mendaftarkan registerEvidenceRoutes',
      /registerEvidenceRoutes\(collector\(routes, wrapEvidence\)\)/.test(wiring));
    check('(H) lane analytics + learning tetap terdaftar (pipeline lama tidak dirusak)',
      /registerAnalyticsRoutes\(collector\(routes, wrapAnalytics\)\)/.test(wiring) &&
      /registerLearningRoutes\(collector\(routes, wrapLearning\)\)/.test(wiring));
    const schema = fs.readFileSync(path.join(root, 'workers/api/schema.js'), 'utf8');
    check('(H) cap byte terdaftar di schema.js, bukan di handler',
      /'\/api\/braincore\/evidence': 8192/.test(schema));
    const toml = fs.readFileSync(path.join(root, 'workers/api/wrangler.toml'), 'utf8');
    // m025-229: Owner sudah menyelesaikan aktivasi (fiezel-evidence dibuat + migrasi
    // 0008 diterapkan + binding EVIDENCE_DB menempel di worker live + OWNER_TOKEN_HASH
    // & secret owner terpasang, semua diverifikasi lewat dashboard sebelum commit ini),
    // jadi kill switch server sengaja "on" sekarang. Cek yang tersisa: harus salah
    // satu dari dua nilai sah ("off" pra-aktivasi, "on" pasca-aktivasi) — tidak boleh
    // string lain (typo/nilai rusak lolos tanpa terlihat).
    check('(H) EVIDENCE_ENABLED bernilai sah ("off" pra-aktivasi atau "on" pasca-aktivasi)',
      /EVIDENCE_ENABLED\s*=\s*"(off|on)"/.test(toml));
    check('(H) database bukti terpisah dari empat database lain',
      /binding\s*=\s*"EVIDENCE_DB"/.test(toml) && /database_name\s*=\s*"fiezel-evidence"/.test(toml));
    // Komentar `--` menjelaskan kolom terlarang; yang dilarang adalah DDL-nya.
    const mig = fs.readFileSync(path.join(root, 'workers/api/evidence/migrations/0008_evidence.sql'), 'utf8')
      .split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
    for (const kolom of ['user_id', 'install_id', 'learner_name', 'ip_address', 'email']) {
      check(`(H) migrasi tidak punya kolom penghubung '${kolom}'`, !new RegExp('\\b' + kolom + '\\b').test(mig));
    }
    check('(H) migrasi memuat tiga tabel lane bukti',
      store.EVIDENCE_TABLES.every(t => mig.includes('CREATE TABLE IF NOT EXISTS ' + t)));
    // Kill switch klien: lane bukti punya saklarnya SENDIRI, terpisah dari lane
    // learning. m025-229: sama seperti EVIDENCE_ENABLED di atas, mode klien sengaja
    // 'on' pasca-aktivasi — endpoint-nya harus konsisten dengan itu (URL https terisi
    // kalau 'on'/'local' menyala dari sisi mekanisme, kosong kalau benar-benar 'off').
    const cfg = require('./features/telemetry/fiezel-telemetry-config.js').CONFIG;
    check('(H) saklar klien lane bukti terpisah dari lane learning',
      cfg.evidence && ['off', 'local', 'on'].includes(cfg.evidence.mode));
    check('(H) endpoint bukti terisi https kalau mode on, kosong kalau off',
      cfg.evidence.mode === 'on' ? /^https:\/\//.test(cfg.evidence.endpoint) : true);
    check('(H) endpoint bukti kosong kalau mode off (tidak ada URL menggantung tanpa terpakai)',
      cfg.evidence.mode === 'off' ? cfg.evidence.endpoint === '' : true);
    check('(H) saklar lane learning tidak berubah', cfg.mode === 'off');
    // app.js: lane bukti tidak boleh mengubah keputusan belajar.
    const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    check('(H) app.js memanggil lane bukti hanya sebagai observasi akhir sesi',
      /braincoreEvidenceObserveSession\(outcome/.test(appSrc));
    check('(H) app.js menyimpan cohort di kunci localStorage SENDIRI (state belajar tidak disentuh)',
      /EVIDENCE_COHORT_KEY='fiezel-ev-cohort-v1'/.test(appSrc));
  }

  /* =====================================================================
   * I. PARITAS ENUM KLIEN <-> SERVER
   * ===================================================================== */
  {
    const pairs = [
      ['level', client.ENUMS.level, core.EVIDENCE_LEVELS],
      ['skillBucket', client.ENUMS.skillBucket, core.EVIDENCE_SKILL_BUCKETS],
      ['mastery', client.ENUMS.mastery, core.EVIDENCE_MASTERY_BUCKETS],
      ['trend', client.ENUMS.trend, core.EVIDENCE_TRENDS],
      ['misconception', client.ENUMS.misconception, core.EVIDENCE_MISCONCEPTION_BUCKETS],
      ['calibration', client.ENUMS.calibration, core.EVIDENCE_CALIBRATION],
      ['calibrationError', client.ENUMS.calibrationError, core.EVIDENCE_CALIBRATION_ERROR],
      ['consistency', client.ENUMS.consistency, core.EVIDENCE_CONSISTENCY_BUCKETS],
      ['retentionRisk', client.ENUMS.retentionRisk, core.EVIDENCE_RETENTION_RISK],
      ['volume', client.ENUMS.volume, core.EVIDENCE_VOLUME_BUCKETS],
      ['improvement', client.ENUMS.improvement, core.EVIDENCE_IMPROVEMENT],
      ['decision', client.ENUMS.decision, core.EVIDENCE_DECISIONS],
      ['policyId', client.ENUMS.policyId, core.EVIDENCE_POLICY_IDS],
      ['outcome', client.ENUMS.outcome, core.EVIDENCE_OUTCOMES],
      ['recommendation', client.ENUMS.recommendation, core.EVIDENCE_RECOMMENDATIONS],
      ['delta', client.ENUMS.delta, core.EVIDENCE_DELTA_BUCKETS],
      ['adherence', client.ENUMS.adherence, core.EVIDENCE_ADHERENCE_BUCKETS]
    ];
    for (const [name, a, b] of pairs) {
      check(`(I) enum '${name}' identik klien vs server`, JSON.stringify(a) === JSON.stringify(b));
    }
    check('(I) skema klien == skema server', client.SCHEMA === core.EVIDENCE_SCHEMA_ID);
    // Event yang dibangun klien HARUS lolos validasi server, apa adanya.
    const built = client.buildLearnerEvidenceEvent({
      eventId: uuid(), cohort: COHORT, level: 'B1', mastery: 71, masteryDelta: 4,
      misconceptions: 2, misconceptionSkill: 'conditionals', accuracy: 92,
      consistency: 80, retentionRisk: 12, evidenceCount: 55, improvementDelta: 9
    });
    const normalized = core.normalizeEvidenceEvent(built.event);
    check('(I) event bangunan klien lolos validasi server apa adanya', normalized.ok === true, JSON.stringify(normalized));
    const decision = client.buildDecisionEvent({
      eventId: uuid(), cohort: COHORT, level: 'B1', policyId: 'core-brain-v3-default',
      decision: 'due_review', outcome: 'mixed', recommendation: 'adjust', masteryDelta: -2, adherence: 65
    });
    check('(I) event keputusan bangunan klien lolos validasi server',
      core.normalizeEvidenceEvent(decision.event).ok === true);
    check('(I) kalibrasi: akurasi jauh di atas pita = soal terlalu mudah',
      client.bucketCalibration(92) === 'too_easy' && client.bucketCalibrationError(92) === 'e0-10');
    check('(I) kalibrasi: akurasi jauh di bawah pita = soal terlalu sulit',
      client.bucketCalibration(20) === 'too_hard' && client.bucketCalibrationError(20) === 'e40p');
  }

  /* ===================================================================== */
  const n = checks.length;
  const bad = checks.filter(c => c.status === 'FAIL');
  console.log(`\n${n - bad.length}/${n} pemeriksaan lulus`);
  if (failed) { console.error('BraincoreEvidence: FAIL'); process.exit(1); }
  console.log('BraincoreEvidence: PASS');
})().catch(e => { console.error('BraincoreEvidence: FAIL (exception)', e); process.exit(1); });
