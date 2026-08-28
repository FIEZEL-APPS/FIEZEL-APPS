'use strict';
/**
 * GERBANG Wave E1: POST /api/learning/events — sisi server lane telemetri
 * belajar (klien: PR #226 fiezel-learning-transport.js / fiezel-learning-events.js;
 * kontrak: BRAIN-TELEMETRY-SCHEMA.md + BRAIN-DATA-PRIVACY.md).
 *
 * Yang dibuktikan DI WORKER YANG BENAR-BENAR DI-BOOT (bukan handler telanjang —
 * pelajaran cors-envelope-test.js: empat lapis pemeriksaan bisa hijau sementara
 * fiturnya mati kalau yang diuji bukan jawaban nyata):
 *
 *   A. Batch valid diterima 202 dan HANYA counter agregat yang tertulis —
 *      lessonId/itemId (wajib ada di kawat, §7 melarangnya di penyimpanan)
 *      tidak muncul di satu baris pun.
 *   B. Idempoten dua lapis: replay batchId yang sama TIDAK mengubah agregat;
 *      eventId yang sama di bawah batchId BARU juga TIDAK; campuran lama+baru
 *      hanya menghitung yang baru.
 *   C. ID stabil / timestamp presisi / PII ditolak 400 DENGAN nol tulis.
 *   D. Batas ukuran ditegakkan: > 20 event = 413, body > 8 KB = 413.
 *   E. FAIL-CLOSED: D1 galat = 503 (bukan 2xx bohong, bukan hitung tanpa dedup);
 *      binding hilang = 503; flag off = 202 {disabled:true} tanpa sentuh D1.
 *   F. Rem laju anon: jendela penuh = 429 amplop konstan, nol tulis.
 *   G. CORS selaras cors-envelope-test.js: allow-origin untuk origin sah,
 *      TIDAK untuk origin asing.
 *   H. Purge TTL opportunistik benar-benar menghapus baris dedup kedaluwarsa.
 */

const path = require('path');
const boot = require(path.join(__dirname, 'tools/cf-worker-boot.js'));

let pass = 0;
const fails = [];
function check(nama, kondisi, detail) {
  if (kondisi) { pass += 1; return; }
  fails.push({ nama, detail: detail === undefined ? null : String(detail) });
}

const SCHEMA = 'fiezel-learning-event-v1';
const ORIGIN_ASING = 'https://penyerang.example';

/** UUID deterministik untuk uji (bentuknya sah, isinya berurut). */
function uid(n) {
  return `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
}
function bid(n) {
  return `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, '0')}`;
}

function answerEvent(n, payloadOver = {}, eventOver = {}) {
  return Object.assign({
    schema: SCHEMA,
    eventId: uid(n),
    eventType: 'answer_outcome',
    studyDay: 12,
    contentVersion: 'grammar-pack-2026.08',
    payload: Object.assign({
      domain: 'grammar',
      lessonId: 'gram.simple-present',
      itemId: 'sp-001',
      mode: 'recognize_rule',
      correct: true,
      responseTimeBucket: '2-5s',
      predictedBucket: '0.65-0.75'
    }, payloadOver)
  }, eventOver);
}

function summaryEvent(n, payloadOver = {}) {
  return {
    schema: SCHEMA,
    eventId: uid(n),
    eventType: 'session_summary',
    studyDay: 12,
    payload: Object.assign({
      domain: 'grammar',
      level: 'A2',
      planned: 10,
      answered: 8,
      completed: true,
      durationBucket: '5-15m',
      policy: 'brain3_daily_mix'
    }, payloadOver)
  };
}

function snapshot(db, tableName) {
  return JSON.stringify(
    db._rows(tableName).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  );
}

async function bootLearning(workerMod, vars) {
  const booted = boot.bootWorker(workerMod, { vars: Object.assign({ LEARNING_ENABLED: 'on' }, vars || {}) });
  await boot.prepareDb(booted);
  await boot.applyMigration(booted.stats, 'migrations/0007_learning_events.sql');
  return booted;
}

async function main() {
  const workerMod = await boot.loadWorker();
  const booted = await bootLearning(workerMod);
  const post = (body, opt = {}) => booted.call('POST', '/api/learning/events', Object.assign({ body }, opt));

  /* ---------------------------------------------------------- A. sukses --- */
  const batch1 = { schema: SCHEMA, batchId: bid(1), events: [
    answerEvent(1),
    answerEvent(2, { mode: 'mastery_check', correct: false, responseTimeBucket: '10-30s', hint: true }),
    summaryEvent(3)
  ] };
  const r1 = await post(batch1);
  check('A1 batch valid dijawab 202 {ok, accepted:3}',
    r1.status === 202 && r1.json && r1.json.ok === true && r1.json.accepted === 3, JSON.stringify(r1.json) + ' status=' + r1.status);

  const daily1 = booted.stats._rows('learning_daily');
  const find = (rows, type, dim, val) => rows.find((r) => r.event_type === type && r.dim === dim && r.val === val);
  check('A2 agregat _events answer_outcome = 2',
    Number((find(daily1, 'answer_outcome', '_events', 'all') || {}).n) === 2, JSON.stringify(daily1));
  check('A3 agregat mode terisi per nilai enum',
    Number((find(daily1, 'answer_outcome', 'mode', 'recognize_rule') || {}).n) === 1 &&
    Number((find(daily1, 'answer_outcome', 'mode', 'mastery_check') || {}).n) === 1, JSON.stringify(daily1));
  check('A4 session_summary dibucket server (planned 10 -> q6-12, answered 8 -> q6-12)',
    Number((find(daily1, 'session_summary', 'plannedBucket', 'q6-12') || {}).n) === 1 &&
    Number((find(daily1, 'session_summary', 'answeredBucket', 'q6-12') || {}).n) === 1, JSON.stringify(daily1));
  check('A5 studyDay dibucket (12 -> sd8-30), angka mentah tidak disimpan',
    Boolean(find(daily1, 'answer_outcome', 'studyDayBucket', 'sd8-30')) &&
    !daily1.some((r) => r.dim === 'studyDay' || r.val === '12'), JSON.stringify(daily1));
  check('A6 KONTRAK §7: lessonId/itemId TIDAK menyentuh penyimpanan (dim maupun val)',
    !daily1.some((r) => /lesson|item/i.test(String(r.dim)) || String(r.val).includes('sp-001') || String(r.val).includes('gram.simple-present')),
    JSON.stringify(daily1));
  check('A7 dedup terisi: 1 batch + 3 event',
    booted.stats._rows('learning_batch_dedup').length === 1 &&
    booted.stats._rows('learning_event_dedup').length === 3);

  /* ------------------------------------------------- B. replay idempoten --- */
  const aggAfterA = snapshot(booted.stats, 'learning_daily');

  const r2 = await post(batch1); // batchId sama, isi sama = retry pasca timeout
  check('B1 replay batchId sama dijawab 200 {duplicate:true, accepted:0}',
    r2.status === 200 && r2.json && r2.json.duplicate === true && r2.json.accepted === 0, JSON.stringify(r2.json) + ' status=' + r2.status);
  check('B2 replay batch TIDAK mengubah satu pun counter agregat',
    snapshot(booted.stats, 'learning_daily') === aggAfterA);

  const r3 = await post({ schema: SCHEMA, batchId: bid(2), events: [answerEvent(1), answerEvent(2, { mode: 'mastery_check', correct: false, responseTimeBucket: '10-30s', hint: true })] });
  check('B3 eventId lama di bawah batchId BARU: 200, accepted 0, duplicate:true',
    r3.status === 200 && r3.json && r3.json.accepted === 0 && r3.json.duplicate === true, JSON.stringify(r3.json) + ' status=' + r3.status);
  check('B4 agregat tetap tidak berubah setelah replay lintas-batch',
    snapshot(booted.stats, 'learning_daily') === aggAfterA);

  const r4 = await post({ schema: SCHEMA, batchId: bid(3), events: [answerEvent(1), answerEvent(4, { mode: 'teach_back' })] });
  check('B5 campuran lama+baru: hanya yang baru dihitung (accepted 1, deduped 1)',
    r4.status === 202 && r4.json && r4.json.accepted === 1 && r4.json.deduped === 1, JSON.stringify(r4.json));
  check('B6 counter _events naik TEPAT 1 (2 -> 3)',
    Number((find(booted.stats._rows('learning_daily'), 'answer_outcome', '_events', 'all') || {}).n) === 3);

  const r5 = await post({ schema: SCHEMA, events: [answerEvent(4)] }); // tanpa batchId (bentuk transport PR #226 hari ini)
  check('B7 tanpa batchId pun idempoten via dedup eventId',
    r5.status === 200 && r5.json && r5.json.accepted === 0 && r5.json.duplicate === true, JSON.stringify(r5.json) + ' status=' + r5.status);

  /* ------------------------------------- C. ID stabil / waktu presisi / PII --- */
  const aggBeforeC = snapshot(booted.stats, 'learning_daily');
  const dedupBeforeC = snapshot(booted.stats, 'learning_event_dedup');

  const tolakan = [
    ['C1 installId di payload', { schema: SCHEMA, events: [answerEvent(90, { installId: 'abc' })] }, 'forbidden_field'],
    ['C2 userId di event', { schema: SCHEMA, events: [answerEvent(91, {}, { userId: 'u-1' })] }, 'forbidden_field'],
    ['C3 timestamp presisi di event', { schema: SCHEMA, events: [answerEvent(92, {}, { ts: 1756400000000 })] }, 'forbidden_field'],
    ['C4 timestamp di amplop', { schema: SCHEMA, timestamp: 1756400000000, events: [answerEvent(93)] }, 'forbidden_field'],
    ['C5 teks bebas (answerText) di payload', { schema: SCHEMA, events: [answerEvent(94, { answerText: 'saya pikir b' })] }, 'forbidden_field'],
    ['C6 kunci asing tak dikenal ditolak (bukan dibuang diam-diam)', { schema: SCHEMA, events: [answerEvent(95, { lessonTitle: 'Simple Present' })] }, 'foreign_field'],
    ['C7 eventId bukan UUID (kunci idempotensi cacat)', { schema: SCHEMA, events: [answerEvent(96, {}, { eventId: 'install-1234' })] }, 'bad_event_id'],
    ['C8 batchId bukan UUID', { schema: SCHEMA, batchId: 'device-777', events: [answerEvent(97)] }, 'bad_batch_id'],
    ['C9 nilai di luar enum tertutup', { schema: SCHEMA, events: [answerEvent(98, { mode: 'guess_random' })] }, 'invalid_field'],
    ['C10 skema asing = fail-closed', { schema: 'fiezel-learning-event-v99', events: [answerEvent(99)] }, 'bad_schema'],
    ['C11 eventId ganda DI DALAM satu batch = bug klien', { schema: SCHEMA, events: [answerEvent(88), answerEvent(88)] }, 'duplicate_event_id']
  ];
  for (const [nama, body, err] of tolakan) {
    const r = await post(body);
    check(`${nama} -> 400 ${err}`,
      r.status === 400 && r.json && r.json.ok === false && r.json.error === err,
      `status=${r.status} json=${JSON.stringify(r.json)}`);
  }
  check('C12 seluruh penolakan = NOL tulis (agregat & dedup tak tersentuh)',
    snapshot(booted.stats, 'learning_daily') === aggBeforeC &&
    snapshot(booted.stats, 'learning_event_dedup') === dedupBeforeC);

  /* ----------------------------------------------------- D. batas ukuran --- */
  const banyak = { schema: SCHEMA, events: [] };
  for (let i = 0; i < 21; i++) banyak.events.push(answerEvent(200 + i));
  const rBanyak = await post(banyak);
  check('D1 21 event -> 413 too_many_events',
    rBanyak.status === 413 && rBanyak.json && rBanyak.json.error === 'too_many_events', `status=${rBanyak.status}`);

  // Body > 8 KB tapi < cap luar mw-guard 16 KB: JSON-nya sah, byte-nya kebesaran.
  const gemuk = JSON.stringify({ schema: SCHEMA, events: [answerEvent(300)] }) + ' '.repeat(9 * 1024);
  const rGemuk = await post(gemuk);
  check('D2 body > 8 KB -> 413 too_large (diukur byte nyata, bukan content-length saja)',
    rGemuk.status === 413 && rGemuk.json && rGemuk.json.error === 'too_large', `status=${rGemuk.status} json=${JSON.stringify(rGemuk.json)}`);
  check('D3 batas ukuran = NOL tulis',
    snapshot(booted.stats, 'learning_daily') === aggBeforeC);

  /* ------------------------------------------------------ E. fail-closed --- */
  // E-a: D1 melempar di tengah jalan (galat runtime, tabel hilang, dsb).
  const origPrepare = booted.stats.prepare.bind(booted.stats);
  booted.stats.prepare = (sql) => {
    if (/learning_/i.test(String(sql))) throw new Error('D1_ERROR simulasi galat');
    return origPrepare(sql);
  };
  const rGalat = await post({ schema: SCHEMA, batchId: bid(9), events: [answerEvent(400)] });
  booted.stats.prepare = origPrepare;
  check('E1 D1 galat -> 503 unavailable (FAIL-CLOSED, bukan 2xx bohong)',
    rGalat.status === 503 && rGalat.json && rGalat.json.error === 'unavailable', `status=${rGalat.status} json=${JSON.stringify(rGalat.json)}`);
  check('E2 batch yang gagal TIDAK terkubur di dedup (retry klien masih bisa dihitung)',
    !booted.stats._rows('learning_batch_dedup').some((r) => r.batch_id === bid(9)) &&
    !booted.stats._rows('learning_event_dedup').some((r) => r.event_id === uid(400)));

  // E-b: binding D1 tidak ada sama sekali.
  const tanpaDb = boot.bootWorker(workerMod, { vars: { LEARNING_ENABLED: 'on', STATS_DB: null, ANALYTICS: null } });
  const rTanpaDb = await tanpaDb.call('POST', '/api/learning/events', { body: { schema: SCHEMA, events: [answerEvent(1)] } });
  check('E3 binding D1 hilang -> 503 (bukan 202 yang membuat klien meng-ack ke ruang hampa)',
    rTanpaDb.status === 503, `status=${rTanpaDb.status} json=${JSON.stringify(rTanpaDb.json)}`);

  // E-c: flag mati = jawab sopan TANPA menyentuh D1 (pola ANALYTICS_ENABLED).
  const mati = await bootLearning(workerMod, { LEARNING_ENABLED: 'off' });
  const rMati = await mati.call('POST', '/api/learning/events', { body: { schema: SCHEMA, events: [answerEvent(1)] } });
  check('E4 LEARNING_ENABLED=off -> 202 {disabled:true} dan nol baris',
    rMati.status === 202 && rMati.json && rMati.json.disabled === true &&
    mati.stats._rows('learning_daily').length === 0, `status=${rMati.status} json=${JSON.stringify(rMati.json)}`);

  /* --------------------------------------------------------- F. rem laju --- */
  {
    const segar = await bootLearning(workerMod);
    const util = await boot.importApiModule('util-hmac.js');
    const nowMs = Number(segar.env.TEST_CLOCK_MS);
    // Replika PERSIS ipHmacOf route-learning.js: salt fallback + indeks hari + 'noip'
    // (harness tidak mengirim cf-connecting-ip). Kalau rumusnya digeser diam-diam,
    // baris pra-isi ini tidak akan kena dan F1 memerah — itu disengaja.
    const hash = util.truncate128(await util.hmacHex('fiezel-learning-rate-v1', Math.floor(nowMs / 86400000) + '|noip'));
    const win = new Date(nowMs).toISOString().slice(0, 13);
    await segar.stats.prepare('INSERT INTO learning_rate (win, ip_hmac, batches) VALUES (?1, ?2, ?3)').bind(win, hash, 60).run();

    const rRem = await segar.call('POST', '/api/learning/events', { body: { schema: SCHEMA, events: [answerEvent(1)] } });
    check('F1 jendela penuh (60 batch/jam) -> 429 amplop konstan',
      rRem.status === 429 && rRem.json && rRem.json.error === 'rate_limited' && rRem.json.retryAfter === 900 &&
      Object.keys(rRem.json).sort().join(',') === 'error,ok,retryAfter',
      `status=${rRem.status} json=${JSON.stringify(rRem.json)}`);
    check('F2 penolakan rem = NOL tulis (counter tetap 60, dedup kosong)',
      Number(segar.stats._rows('learning_rate')[0].batches) === 60 &&
      segar.stats._rows('learning_event_dedup').length === 0);
    check('F3 429 membawa retry-after konstan', rRem.headers.get('retry-after') === '900');
  }

  /* -------------------------------------------------------------- G. CORS --- */
  const rCorsSah = await post({ schema: SCHEMA, batchId: bid(20), events: [answerEvent(500)] });
  check('G1 origin sah mendapat access-control-allow-origin (selaras cors-envelope-test.js)',
    rCorsSah.headers.get('access-control-allow-origin') === boot.ORIGIN,
    `allow-origin=${rCorsSah.headers.get('access-control-allow-origin')}`);
  const rCorsAsing = await post({ schema: SCHEMA, batchId: bid(21), events: [answerEvent(501)] }, { origin: ORIGIN_ASING });
  check('G2 origin asing TIDAK mendapat izin CORS',
    rCorsAsing.headers.get('access-control-allow-origin') !== ORIGIN_ASING,
    `allow-origin=${rCorsAsing.headers.get('access-control-allow-origin')}`);

  /* --------------------------------------------------------- H. purge TTL --- */
  await booted.stats.prepare('INSERT INTO learning_event_dedup (event_id, day) VALUES (?1, ?2)')
    .bind(uid(999), '2020-01-01').run();
  await booted.stats.prepare('INSERT INTO learning_daily (day, event_type, dim, val, n) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind('2020-01-01', 'answer_outcome', '_events', 'all', 5).run();
  await post({ schema: SCHEMA, batchId: bid(30), events: [answerEvent(600)] });
  check('H1 purge opportunistik menghapus dedup kedaluwarsa (janji TTL 7 hari ditepati)',
    !booted.stats._rows('learning_event_dedup').some((r) => r.day === '2020-01-01'));
  check('H2 purge menghapus agregat lebih tua dari retensi 90 hari',
    !booted.stats._rows('learning_daily').some((r) => r.day === '2020-01-01'));

  /* ------------------------------------------------------------- selesai --- */
  const total = pass + fails.length;
  for (const f of fails) console.log(`FAIL  ${f.nama}${f.detail ? ` :: ${f.detail}` : ''}`);
  console.log(`\nFIEZEL learning-events endpoint gate: ${pass}/${total} assert PASS`);
  if (fails.length) { console.log(`${fails.length} assert MERAH`); process.exit(1); }
  process.exit(0);
}

main().catch((e) => {
  console.log('learning-events endpoint gate MELEDAK:', e && e.stack ? e.stack : e);
  process.exit(1);
});
