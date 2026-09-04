/**
 * Gerbang uji lane telemetri belajar (Lane B):
 *   features/telemetry/fiezel-learning-events.js
 *   features/telemetry/fiezel-learning-queue.js
 *   features/telemetry/fiezel-learning-transport.js
 *
 * Yang dibuktikan di sini adalah JANJI desain, bukan detail implementasi:
 *  1. builder menolak semua jalur kebocoran (free text, timestamp, ID stabil);
 *  2. antrean selamat dari "reload" (persist sebelum upload);
 *  3. retry ambigu TIDAK menggandakan event (eventId sama, ack-sebelum-hapus);
 *  4. batas keras antrean (jumlah/byte/umur, drop-oldest);
 *  5. opt-out purge total;
 *  6. offline tidak pernah melempar ke pemanggil;
 *  7. batch tidak pernah melanggar LIMITS server (20 event / 8 KB).
 */
'use strict';

const assert = require('assert');
const Events = require('./features/telemetry/fiezel-learning-events.js');
const Queue = require('./features/telemetry/fiezel-learning-queue.js');
const Transport = require('./features/telemetry/fiezel-learning-transport.js');

let okCount = 0;
function ok(msg) { okCount++; console.log('ok - ' + msg); }

// rng deterministik untuk eventId yang bisa direproduksi di test.
function seededRng(seed) { return Transport.mulberry32(seed); }

const DAY_MS = 86400000;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function buildValid(overrides, ctxOverrides) {
  const payload = Object.assign({
    domain: 'grammar',
    lessonId: 'gram.tenses.simple_present',
    itemId: 'item-042',
    mode: 'apply_form',
    correct: true,
    responseTimeBucket: '2-5s',
    predictedBucket: '0.75-0.85',
    reviewGapBucket: '7-14d',
    hint: false,
    decisionReason: 'brain3_optimal_challenge'
  }, overrides || {});
  const ctx = Object.assign({ studyDay: 12, rng: seededRng(7) }, ctxOverrides || {});
  return Events.buildEvent('answer_outcome', payload, ctx);
}

async function testEventsBuilder() {
  // --- Jalur sukses ---
  const r = buildValid();
  assert.strictEqual(r.ok, true, 'build valid harus ok');
  assert.strictEqual(r.event.schema, 'fiezel-learning-event-v1');
  assert.strictEqual(r.event.eventType, 'answer_outcome');
  assert.strictEqual(r.event.studyDay, 12);
  assert.ok(UUID_V4_RE.test(r.event.eventId), 'eventId harus UUIDv4: ' + r.event.eventId);
  assert.ok(r.rationale.indexOf('brain3_') === 0, 'rationale berprefix brain3_');
  assert.strictEqual(typeof r.confidence, 'number');
  ok('builder: event valid dibangun dengan schema + UUIDv4 + rationale brain3_');

  // Determinisme: rng seed sama -> eventId sama (kunci reproduksibilitas test).
  const a = buildValid({}, { rng: seededRng(99) });
  const b = buildValid({}, { rng: seededRng(99) });
  assert.strictEqual(a.event.eventId, b.event.eventId, 'rng seeded harus deterministik');
  // Default crypto: tanpa rng tetap jalan di Node (crypto global ada).
  const c = buildValid({}, { rng: undefined });
  assert.ok(c.ok && UUID_V4_RE.test(c.event.eventId), 'fallback crypto harus jalan');
  assert.notStrictEqual(a.event.eventId, c.event.eventId);
  ok('builder: eventId deterministik dengan rng seeded, default crypto tersedia');

  // Tidak ada timestamp presisi / ID stabil di keluaran.
  const flat = JSON.stringify(a.event).toLowerCase();
  for (const kata of ['timestamp', 'installid', 'userid', 'sessionid', '"ts"', '"time"', 'date']) {
    assert.strictEqual(flat.indexOf(kata), -1, 'event tidak boleh memuat ' + kata);
  }
  assert.ok(Object.isFrozen(a.event) && Object.isFrozen(a.event.payload), 'event harus beku');
  ok('builder: keluaran bebas timestamp presisi dan ID stabil, objek dibekukan');

  // --- Penolakan ---
  assert.strictEqual(Events.buildEvent('mouse_moved', {}, { studyDay: 1 }).reason, 'unknown_type');
  assert.strictEqual(buildValid({ favoriteColor: 'blue' }).reason, 'unknown_field');
  assert.strictEqual(buildValid({ timestamp: 1770000000000 }).reason, 'forbidden_field');
  assert.strictEqual(buildValid({ installId: 'abc' }).reason, 'forbidden_field');
  assert.strictEqual(buildValid({ answerText: 'She go to school' }).reason, 'forbidden_field');
  ok('builder: tipe tak dikenal, field asing, dan field terlarang DITOLAK');

  // Free text tidak bisa lolos lewat field ID (pola sempit) maupun enum.
  assert.strictEqual(buildValid({ lessonId: 'she goes to school every day' }).reason, 'invalid_field');
  assert.strictEqual(buildValid({ mode: 'essay bebas' }).reason, 'invalid_field');
  assert.strictEqual(buildValid({ responseTimeBucket: '3.217s' }).reason, 'invalid_field');
  assert.strictEqual(buildValid({ decisionReason: 'karena murid terlihat bosan' }).reason, 'invalid_field');
  ok('builder: free text tidak lolos lewat ID/enum/kode rationale');

  // Domain tertutup grammar-only (temuan council: konten lain terkontaminasi).
  assert.strictEqual(buildValid({ domain: 'listening' }).reason, 'invalid_field');
  assert.deepStrictEqual(Array.from(Events.ENUMS.DOMAINS), ['grammar']);
  ok('builder: domain adalah enum tertutup beranggota grammar saja');

  // studyDay wajib dan harus bulat; ctx asing ditolak.
  assert.strictEqual(buildValid({}, { studyDay: undefined }).reason, 'bad_study_day');
  assert.strictEqual(buildValid({}, { studyDay: 3.5 }).reason, 'bad_study_day');
  assert.strictEqual(buildValid({}, { extraCtx: 1 }).reason, 'unknown_ctx_field');
  const noReq = buildValid({ correct: undefined });
  assert.strictEqual(noReq.reason, 'missing_field');
  ok('builder: studyDay divalidasi, ctx asing dan field wajib hilang DITOLAK');

  // session_summary ikut disiplin yang sama.
  const s = Events.buildEvent('session_summary', {
    domain: 'grammar', level: 'A2', planned: 10, answered: 9, completed: true, durationBucket: '5-15m'
  }, { studyDay: 12, rng: seededRng(3) });
  assert.strictEqual(s.ok, true);
  assert.strictEqual(Events.buildEvent('session_summary', {
    domain: 'grammar', level: 'A2', planned: 10, answered: 9, completed: true,
    durationBucket: '5-15m', note: 'anak hebat'
  }, { studyDay: 12, rng: seededRng(3) }).reason, 'forbidden_field');
  ok('builder: session_summary valid diterima, field naratif ditolak');

  // Helper bucket konsisten dengan enum.
  assert.strictEqual(Events.bucketResponseTime(1500), '<2s');
  assert.strictEqual(Events.bucketResponseTime(31000), '>=30s');
  assert.strictEqual(Events.bucketGapDays(10), '7-14d');
  assert.strictEqual(Events.bucketPrediction(0.8), '0.75-0.85');
  assert.strictEqual(Events.bucketAttempts(3), '2-3');
  assert.strictEqual(Events.bucketDurationMinutes(7), '5-15m');
  assert.strictEqual(Events.bucketResponseTime(-1), null);
  ok('builder: helper bucket memetakan nilai mentah ke enum tertutup');
}

// Pabrik event valid unik untuk uji antrean/transport.
function makeEvent(i, seed) {
  const r = buildValid({ itemId: 'item-' + i }, { rng: seededRng(seed !== undefined ? seed : 1000 + i) });
  assert.ok(r.ok, 'event pabrik harus valid');
  return r.event;
}

async function testQueueReloadSurvival() {
  const idb = Queue.createMemoryIdb();
  const q1 = Queue.makeQueue({ idb });
  const now = 100 * DAY_MS;
  for (let i = 0; i < 3; i++) {
    const res = await q1.put(makeEvent(i), now);
    assert.strictEqual(res.ok, true);
  }
  // "Reload": instance queue BARU di atas storage yang SAMA — tanpa state memori.
  const q2 = Queue.makeQueue({ idb });
  const batch = await q2.peekBatch(10, now);
  assert.strictEqual(batch.length, 3, 'event harus selamat dari reload');
  assert.strictEqual(batch[0].event.payload.itemId, 'item-0', 'urutan tertua-dulu dipertahankan');
  ok('queue: event persist dan selamat dari reload (instance baru, storage sama)');

  // peekBatch TIDAK menghapus; hanya ack yang menghapus.
  const again = await q2.peekBatch(10, now);
  assert.strictEqual(again.length, 3, 'peek tidak boleh menghapus');
  const ackRes = await q2.ack([batch[0].eventId]);
  assert.strictEqual(ackRes.removed, 1);
  assert.strictEqual((await q2.peekBatch(10, now)).length, 2, 'hanya ID yang di-ack yang hilang');
  ok('queue: peek tanpa hapus; hanya ID yang di-ack yang dihapus');
}

async function testQueueLimits() {
  // Batas jumlah: pakai plafon kecil supaya test cepat, semantik sama.
  const idb = Queue.makeQueue ? Queue.createMemoryIdb() : null;
  const q = Queue.makeQueue({ idb, limits: { MAX_EVENTS: 50 } });
  const now = 200 * DAY_MS;
  let lastDrop = [];
  for (let i = 0; i < 55; i++) {
    const res = await q.put(makeEvent(i), now);
    assert.strictEqual(res.ok, true);
    lastDrop = res.droppedIds;
  }
  const st = await q.stats(now);
  assert.strictEqual(st.count, 50, 'plafon jumlah harus ditegakkan');
  assert.ok(lastDrop.length > 0, 'drop-oldest harus dilaporkan');
  const remaining = await q.peekBatch(60, now);
  assert.strictEqual(remaining[0].event.payload.itemId, 'item-5', 'yang dibuang harus yang TERTUA');
  assert.strictEqual(remaining[remaining.length - 1].event.payload.itemId, 'item-54', 'yang terbaru bertahan');
  ok('queue: plafon jumlah ditegakkan dengan drop-oldest (tertua dibuang, terbaru selamat)');

  // Batas byte: plafon kecil -> total byte tidak pernah melampaui.
  const qb = Queue.makeQueue({ idb: Queue.createMemoryIdb(), limits: { MAX_BYTES: 2000 } });
  for (let i = 0; i < 20; i++) await qb.put(makeEvent(i), now);
  const stb = await qb.stats(now);
  assert.ok(stb.bytes <= 2000, 'total byte <= plafon, aktual ' + stb.bytes);
  assert.ok(stb.count < 20 && stb.count > 0, 'sebagian tertua terbuang demi plafon byte');
  ok('queue: plafon byte ditegakkan dengan drop-oldest');

  // Event tunggal melebihi plafon total ditolak di pintu.
  const rejected = await qb.put(Object.assign({}, makeEvent(0), { eventId: 'x'.repeat(3000) }), now);
  assert.strictEqual(rejected.ok, false);
  assert.strictEqual(rejected.reason, 'event_too_large');
  ok('queue: event tunggal yang mustahil muat ditolak eksplisit');

  // Batas umur 45 hari: maju 46 hari -> event basi dibuang saat peek.
  const qa = Queue.makeQueue({ idb: Queue.createMemoryIdb() });
  await qa.put(makeEvent(1), 10 * DAY_MS);
  await qa.put(makeEvent(2), 50 * DAY_MS);
  const fresh = await qa.peekBatch(10, 56 * DAY_MS); // event-1 umur 46 hari: basi.
  assert.strictEqual(fresh.length, 1);
  assert.strictEqual(fresh[0].event.payload.itemId, 'item-2');
  ok('queue: retensi 45 hari ditegakkan (event basi dibuang, tanpa jam internal)');
}

async function testOptOutPurge() {
  const idb = Queue.createMemoryIdb();
  const q = Queue.makeQueue({ idb });
  const now = 300 * DAY_MS;
  for (let i = 0; i < 10; i++) await q.put(makeEvent(i), now);
  assert.strictEqual((await q.stats(now)).count, 10);
  const res = await q.purge();
  assert.strictEqual(res.ok, true);
  assert.strictEqual((await q.stats(now)).count, 0, 'purge harus total');
  assert.strictEqual((await q.peekBatch(10, now)).length, 0);
  // Storage-nya sendiri juga kosong — bukan sekadar "disembunyikan".
  assert.strictEqual((await idb.getAll()).length, 0, 'opt-out: tidak ada sisa di storage');
  ok('queue: opt-out purge mengosongkan antrean DAN storage secara total');
}

async function testAmbiguousRetryNoDuplicate() {
  const idb = Queue.createMemoryIdb();
  const q = Queue.makeQueue({ idb });
  const now = 400 * DAY_MS;
  for (let i = 0; i < 5; i++) await q.put(makeEvent(i), now);

  // Server palsu yang MENERIMA batch lalu koneksi "putus" sebelum respons sampai
  // (kasus retry ambigu). Ia mencatat semua eventId yang pernah diterimanya.
  const serverSeen = [];
  let mode = 'ambiguous';
  const fetchFn = (url, init) => {
    const body = JSON.parse(init.body);
    assert.strictEqual(body.schema, 'fiezel-learning-event-v1');
    for (const ev of body.events) serverSeen.push(ev.eventId);
    if (mode === 'ambiguous') return Promise.reject(new Error('socket hangup'));
    return Promise.resolve({ status: 200 });
  };

  // Percobaan 1: server menerima, klien tidak tahu -> TIDAK boleh ada ack.
  const r1 = await Transport.flush(q, { fetchFn, nowMs: now, seed: 42 });
  assert.strictEqual(r1.ok, false);
  assert.strictEqual(r1.ackedCount, 0, 'respons ambigu tidak boleh meng-ack');
  assert.strictEqual((await q.stats(now)).count, 5, 'event tetap di antrean untuk retry');
  const firstSend = serverSeen.slice();

  // Percobaan 2 (retry): sukses. eventId yang dikirim HARUS sama persis.
  mode = 'ok';
  const r2 = await Transport.flush(q, { fetchFn, nowMs: now, seed: 42 });
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(r2.ackedCount, 5);
  const secondSend = serverSeen.slice(firstSend.length);
  assert.deepStrictEqual(secondSend, firstSend, 'retry mengirim eventId yang SAMA');
  // Dedup server: id unik = 5 walau server "menerima" 10 kiriman.
  assert.strictEqual(new Set(serverSeen).size, 5, 'dedup by eventId: tidak ada event baru tercipta');
  assert.strictEqual((await q.stats(now)).count, 0, 'setelah ack antrean bersih');
  ok('transport: retry ambigu mengirim ulang eventId sama — dedup server mungkin, tanpa duplikasi');
}

async function testOfflineNonBlocking() {
  const idb = Queue.createMemoryIdb();
  const q = Queue.makeQueue({ idb });
  const now = 500 * DAY_MS;
  for (let i = 0; i < 4; i++) await q.put(makeEvent(i), now);

  // fetch melempar sinkron — kasus terburuk; flush tetap tidak boleh reject.
  const r = await Transport.flush(q, {
    fetchFn: () => { throw new Error('offline'); },
    nowMs: now,
    seed: 7
  });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.rationale, 'brain3_lt_transport_offline_requeue');
  assert.ok(typeof r.nextRetryInMs === 'number' && r.nextRetryInMs > 0, 'jadwal retry diberikan');
  assert.strictEqual((await q.stats(now)).count, 4, 'offline: semua event tetap antre');
  ok('transport: offline tidak melempar dan tidak memblokir — event antre ulang');

  // Tanpa fetchFn sama sekali (lingkungan tanpa jaringan): tetap senyap.
  const r2 = await Transport.flush(q, { nowMs: now });
  assert.strictEqual(r2.rationale, 'brain3_lt_transport_no_fetch');
  assert.strictEqual((await q.stats(now)).count, 4);
  ok('transport: tanpa fetch yang di-inject pun flush senyap, antrean utuh');

  // Backoff seeded: deterministik untuk (seed, attempt) sama; eksponensial + plafon.
  const d1 = Transport.backoffDelayMs(3, { seed: 42 });
  const d2 = Transport.backoffDelayMs(3, { seed: 42 });
  assert.strictEqual(d1, d2, 'jitter seeded harus deterministik');
  assert.ok(d1 >= 4000 && d1 <= 8000, 'attempt 3: dalam [base*8*0.5, base*8], aktual ' + d1);
  assert.ok(Transport.backoffDelayMs(30, { seed: 1 }) <= Transport.BACKOFF.MAX_MS, 'plafon 15 menit');
  assert.notStrictEqual(Transport.backoffDelayMs(3, { seed: 43 }), d1, 'seed beda -> jitter beda');
  ok('transport: backoff eksponensial + jitter SEEDED deterministik dengan plafon');

  // Retry-After menang atas backoff.
  const r3 = await Transport.flush(q, {
    fetchFn: () => Promise.resolve({ status: 429, headers: { get: (k) => (k === 'retry-after' ? '7' : null) } }),
    nowMs: now,
    seed: 7
  });
  assert.strictEqual(r3.nextRetryInMs, 7000, 'Retry-After 7s harus dihormati persis');
  assert.strictEqual(r3.rationale, 'brain3_lt_transport_retry_after');
  assert.strictEqual((await q.stats(now)).count, 4, '429: tidak ada ack');
  ok('transport: header Retry-After dihormati dan mengalahkan backoff');
}

async function testBatchLimits() {
  // 45 event -> batch 20/20/5 (selaras LIMITS route-events.js).
  assert.strictEqual(Transport.LIMITS.MAX_EVENTS_PER_BATCH, 20);
  assert.strictEqual(Transport.LIMITS.MAX_BODY_BYTES, 8 * 1024);
  const entries = [];
  for (let i = 0; i < 45; i++) {
    const ev = makeEvent(i);
    entries.push({ eventId: ev.eventId, event: ev });
  }
  const made = Transport.makeBatches(entries);
  assert.deepStrictEqual(made.batches.map((b) => b.eventIds.length), [20, 20, 5]);
  for (const b of made.batches) {
    assert.ok(b.bytes <= 8192, 'body batch <= 8KB, aktual ' + b.bytes);
    const parsed = JSON.parse(b.body);
    assert.strictEqual(parsed.schema, 'fiezel-learning-event-v1');
    assert.strictEqual(parsed.events.length, b.eventIds.length);
  }
  ok('transport: 45 event terbelah 20/20/5, tiap body <= 8 KB dengan schema batch');

  // Event "gemuk" (ID panjang legal 64 char) -> batas byte membelah sebelum batas 20.
  const fat = [];
  for (let i = 0; i < 30; i++) {
    const ev = makeEvent(i);
    // Salin manual (event asli beku) dengan lessonId maksimal legal.
    const clone = JSON.parse(JSON.stringify(ev));
    clone.payload.lessonId = ('L' + String(i) + '.').padEnd(64, 'x');
    fat.push({ eventId: clone.eventId, event: clone });
  }
  const madeFat = Transport.makeBatches(fat);
  let totalFat = 0;
  for (const b of madeFat.batches) {
    assert.ok(b.bytes <= 8192, 'batch gemuk tetap <= 8KB, aktual ' + b.bytes);
    totalFat += b.eventIds.length;
  }
  assert.strictEqual(totalFat, 30, 'tidak ada event hilang saat pembelahan byte');
  ok('transport: batas byte 8 KB tidak pernah dilanggar dan tidak menghilangkan event');

  // Event tunggal > 8KB: dilaporkan oversized, tidak dibatch.
  const monster = { eventId: 'monster-1', event: { schema: 'fiezel-learning-event-v1', eventId: 'monster-1', blob: 'z'.repeat(9000) } };
  const madeMonster = Transport.makeBatches([monster]);
  assert.strictEqual(madeMonster.batches.length, 0);
  assert.deepStrictEqual(madeMonster.oversizedIds, ['monster-1']);
  ok('transport: event yang mustahil muat dilaporkan oversized, bukan menyumbat antrean');
}

async function main() {
  await testEventsBuilder();
  await testQueueReloadSurvival();
  await testQueueLimits();
  await testOptOutPurge();
  await testAmbiguousRetryNoDuplicate();
  await testOfflineNonBlocking();
  await testBatchLimits();
  console.log('# total ' + okCount + ' pemeriksaan');
  console.log('LearningTelemetry: PASS');
}

main().catch((err) => {
  console.error('LearningTelemetry: FAIL');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
