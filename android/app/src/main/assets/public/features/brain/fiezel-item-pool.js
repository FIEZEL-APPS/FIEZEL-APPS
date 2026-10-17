/**
 * FIEZEL Item Pool — kesulitan soal dari SEMUA murid, bukan per HP (Braincore langkah 2).
 *
 * MASALAH YANG DIPERBAIKI
 * -----------------------
 * FiezelItemCalibration mengoreksi kesulitan soal dari jawaban murid, tetapi hanya dari
 * SATU murid di SATU perangkat. Kepalanya sendiri mengakui batasnya: di N=1, kemampuan
 * murid dan kesulitan soal diestimasi dari pertandingan yang sama, jadi model tidak bisa
 * membedakan "murid ini pintar" dari "soal ini mudah" — karena itu koreksinya dijepit
 * +/-0.6, dipusatkan median, dan diberi dead zone 0.3. Pagar itu menghentikan kerusakan,
 * tetapi tidak menciptakan informasi yang memang tidak ada di satu perangkat.
 *
 * Informasi itu ada di POPULASI: soal yang dijawab puluhan murid berkemampuan berbeda
 * memisahkan kesulitan soal dari kemampuan murid, karena galat taksiran kemampuan
 * masing-masing murid saling meniadakan. Modul ini adalah sisi PERANGKAT dari jalur itu:
 *
 *   1. observe()  — mencatat JAWABAN PERTAMA murid pada setiap soal (benar/salah +
 *                   peluang benar yang diprediksi SEBELUM menjawab, dari kesulitan PRIOR);
 *   2. seal()/envelope()/ack()/defer() — mengemas catatan itu untuk dikirim, sekali
 *                   jalan, dengan eventId acak supaya kiriman ulang dide-dup server;
 *   3. healTable()/effective() — membaca tabel kesulitan gabungan dari server dan
 *                   menerapkannya ke soal.
 *   4. observeProbe() (Braincore langkah 3) — hasil PROBE RETENSI (3/7/21 hari setelah
 *                   lesson dikuasai) sebagai penghitung [bucket retrievability -> n, benar]
 *                   per hari, tanpa ID soal/lesson, untuk menyetel paruh-waktu ingatan.
 * Penaksirnya (Fisher scoring per soal + pemusatan median) dan penyetel angka rumus berjalan
 * di GitHub Actions (tools/item-pool-job.mjs, tools/brain-param-tune.mjs), memakai inti yang
 * sama dengan server: workers/api/evidence/item-pool-core.js. Konstanta yang harus sama di
 * kedua sisi (termasuk PARAM_VERSION di amplop) dikunci tests/item-pool-test.js.
 *
 * KENAPA HANYA JAWABAN PERTAMA
 * ----------------------------
 * (a) Statistik: jawaban kedua dan seterusnya pada soal yang sama sudah dipengaruhi umpan
 *     balik jawaban pertama — itu mengukur BELAJAR, bukan kesulitan. (b) Pagar kontribusi:
 *     satu murid = paling banyak satu jawaban per soal, jadi "20 jawaban" di server berarti
 *     20 murid, bukan satu murid rajin yang mengulang 20 kali — penyakit N=1 yang sama
 *     dengan nama lain. Tanpa pengenal apa pun, inilah satu-satunya cara menghitung murid.
 *
 * APA YANG KELUAR DARI PERANGKAT (dan apa yang TIDAK)
 * ---------------------------------------------------
 * Per soal: [itemId, bucket prediksi 0..19, benar 0/1] dan HARI UTC jawaban. itemId lolos
 * hanya bila bentuknya ID templat konten (SOURCE_RE, mis. 'PR-101', 'b4_002',
 * 'JP-N4-PF-01') + mode dari daftar TERTUTUP (MODES) — bukan teks bebas, jadi tidak ada
 * jalan bagi nama atau jawaban murid untuk menumpang. TIDAK ADA pengenal murid, cohort,
 * installId, timestamp presisi, teks soal, atau pilihan jawaban. Server hanya menyimpan
 * PENGHITUNG (hari, soal, bucket, n, benar).
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, waktu SELALU
 * argumen (nowMs), pengacak eventId disuntikkan pemanggil. State korup = state kosong.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelItemPool = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-item-pool-v1';              // state lokal di perangkat
  var EVIDENCE_SCHEMA = 'fiezel-item-evidence-v1'; // amplop kiriman ke server
  var TABLE_SCHEMA = 'fiezel-item-difficulty-v1';  // tabel gabungan dari server

  /* Parameter 3PL yang SAMA dengan FiezelCoreBrain/FiezelItemCalibration — server
   * membalik bucket prediksi ke logit memakai angka ini, jadi keduanya wajib sepakat. */
  var DISCRIMINATION = 1.5;
  var GUESS_FLOOR = 0.25;
  var P_BUCKETS = 20;

  /* Bentuk ID templat konten: 1-3 segmen alfanumerik <= 4 karakter + nomor 2-3 digit.
   * Mencakup PR-101, TA-001, b4_002, A1-007, JP-AD-101, JP-N4-PF-01. Item fallback
   * ('fallback:generic', 'taxonomy:family') dan lesson milik guru yang bentuknya lain
   * sengaja TIDAK lolos: mereka bukan soal bank bersama. */
  var SOURCE_RE = /^[A-Za-z0-9]{1,4}(?:[-_][A-Za-z0-9]{1,4}){0,2}[-_][0-9]{2,3}$/;
  /* Mode latihan yang sah (GRAMMAR_PRACTICE_MODES di app.js + cloze + cadangan tipe). */
  var MODES = Object.freeze([
    'apply_form', 'complete_sentence', 'justify_correct', 'recognize_rule', 'recognize_objective',
    'sequence_reasoning', 'identify_misconception', 'recall_memory_cue', 'choose_avoidance',
    'diagnose_distractor_1', 'diagnose_distractor_2', 'diagnose_distractor_3',
    'label_misconception_1', 'label_misconception_2', 'label_misconception_3',
    'repair_distractor_1', 'repair_distractor_2', 'repair_distractor_3',
    'contrast_distractor_1', 'contrast_distractor_2', 'contrast_distractor_3',
    'classify_family', 'locate_decision_cue', 'teach_back', 'mastery_check',
    'cloze_production', 'grammar', 'cloze'
  ]);

  /* Braincore langkah 3: versi konstanta yang membentuk bucket prediksi. Server membuang
   * kiriman versi lain (bucket dengan a/c/paruh-waktu berbeda tidak bisa dibaca bersama).
   * WAJIB identik dengan PARAM_VERSION di workers/api/evidence/item-pool-core.js. */
  var PARAM_VERSION = 'a1.5-c0.25-h1.6';

  var LIMITS = Object.freeze({
    MAX_SEEN: 5000,             // soal yang pernah dijawab; penuh = berhenti berkontribusi
    MAX_PENDING_PER_DAY: 120,   // soal BARU per hari yang dicatat; lebih = diabaikan
    MAX_BUFFERED_ITEMS: 3000,   // total catatan belum terkirim (tertunda + outbox), ~90 KB
    MAX_ITEMS_PER_EVENT: 60,    // satu event = satu potongan satu hari
    MAX_EVENTS_PER_BATCH: 10,
    MAX_OUTBOX_EVENTS: 120,
    /* 56 hari = jendela penaksir server (ESTIMATOR.WINDOW_DAYS): catatan yang lebih tua tidak
     * akan pernah ikut ditaksir, jadi tidak ada gunanya disimpan — dan selama itu perangkat
     * MENAHAN catatannya bila server belum dinyalakan, supaya jawaban-pertama murid yang
     * terkumpul sebelum owner menyalakan lane tidak terbuang (soalnya sudah ditandai terlihat
     * dan tidak akan pernah menghasilkan jawaban-pertama lagi). */
    OUTBOX_DAYS: 56,
    /* Probe retensi (langkah 3): paling banyak 50 jawaban probe per bucket per hari (batas
     * server PROBE_LIMITS.MAX_PROBE_N) — lebih dari itu bukan pemakaian yang wajar. */
    MAX_PROBE_N: 50
  });

  var APPLY = Object.freeze({
    MIN_N: 20,                  // jawaban-pertama (= murid) minimum sebelum koreksi diterapkan
    BOUND: 1.0,                 // |koreksi| <= satu tingkat CEFR
    DIFF_MIN: 0.5,              // rentang FiezelItemPrior (CLAMP_MIN/CLAMP_MAX)
    DIFF_MAX: 6.9,
    TABLE_MAX_AGE_DAYS: 14      // tabel lebih tua dari ini dianggap basi dan diabaikan
  });

  var DAY_MS = 86400000;
  var DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  function isFiniteNumber(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function dayOf(nowMs) { return new Date(isFiniteNumber(nowMs) && nowMs >= 0 ? nowMs : 0).toISOString().slice(0, 10); }
  function dayMs(day) { var t = Date.parse(day + 'T00:00:00Z'); return isFinite(t) ? t : NaN; }

  /** itemId sah = '<SOURCE_RE>:<MODES>' dengan TEPAT satu titik dua. */
  function validItemId(id) {
    if (typeof id !== 'string' || id.length > 80) return false;
    var parts = id.split(':');
    if (parts.length !== 2) return false;
    return SOURCE_RE.test(parts[0]) && MODES.indexOf(parts[1]) !== -1;
  }

  function bucketOf(p) {
    if (!isFiniteNumber(p)) return -1;
    return Math.min(P_BUCKETS - 1, Math.max(0, Math.floor(clamp(p, 0, 1) * P_BUCKETS)));
  }

  function buffered(st) {
    var n = 0;
    for (var day in st.pending) if (hasOwn(st.pending, day)) n += Object.keys(st.pending[day]).length;
    for (var i = 0; i < st.outbox.length; i++) n += st.outbox[i].items.length;
    return n;
  }

  function emptyState() { return { schema: SCHEMA, seen: {}, pending: {}, probes: {}, outbox: [], nextTryAt: 0, attempt: 0 }; }

  /** State korup/asing -> state kosong; field yang rusak dibuang satu per satu. */
  function healState(raw) {
    var st = emptyState();
    if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA) return st;
    var seen = raw.seen && typeof raw.seen === 'object' ? raw.seen : {};
    var n = 0;
    for (var id in seen) {
      if (!hasOwn(seen, id) || !validItemId(id)) continue;
      if (n >= LIMITS.MAX_SEEN) break;
      st.seen[id] = 1; n++;
    }
    var pending = raw.pending && typeof raw.pending === 'object' ? raw.pending : {};
    for (var day in pending) {
      if (!hasOwn(pending, day) || !DAY_RE.test(day)) continue;
      var bag = pending[day], clean = {}, k = 0;
      if (!bag || typeof bag !== 'object') continue;
      for (var item in bag) {
        if (!hasOwn(bag, item) || !validItemId(item)) continue;
        var row = bag[item];
        if (!Array.isArray(row) || row.length !== 2) continue;
        var pb = row[0], ok = row[1];
        if (!(pb >= 0 && pb < P_BUCKETS && pb === Math.floor(pb)) || (ok !== 0 && ok !== 1)) continue;
        if (k >= LIMITS.MAX_PENDING_PER_DAY) break;
        clean[item] = [pb, ok]; k++;
      }
      if (k) st.pending[day] = clean;
    }
    var probes = raw.probes && typeof raw.probes === 'object' ? raw.probes : {};
    for (var pday in probes) {
      if (!hasOwn(probes, pday) || !DAY_RE.test(pday)) continue;
      var pbag = probes[pday], pclean = {}, any = false;
      if (!pbag || typeof pbag !== 'object') continue;
      for (var rbKey in pbag) {
        if (!hasOwn(pbag, rbKey)) continue;
        var rb = Number(rbKey), cell = pbag[rbKey];
        if (!(rb >= 0 && rb < P_BUCKETS && rb === Math.floor(rb)) || !Array.isArray(cell) || cell.length !== 2) continue;
        var pn = cell[0], pk = cell[1];
        if (!(pn >= 1 && pn <= LIMITS.MAX_PROBE_N && pn === Math.floor(pn)) || !(pk >= 0 && pk <= pn && pk === Math.floor(pk))) continue;
        pclean[rb] = [pn, pk]; any = true;
      }
      if (any) st.probes[pday] = pclean;
    }
    var outbox = Array.isArray(raw.outbox) ? raw.outbox : [];
    for (var i = 0; i < outbox.length && st.outbox.length < LIMITS.MAX_OUTBOX_EVENTS; i++) {
      var ev = healEvent(outbox[i]);
      if (ev) st.outbox.push(ev);
    }
    st.nextTryAt = isFiniteNumber(raw.nextTryAt) && raw.nextTryAt >= 0 ? raw.nextTryAt : 0;
    st.attempt = isFiniteNumber(raw.attempt) && raw.attempt >= 0 ? Math.min(20, Math.floor(raw.attempt)) : 0;
    return st;
  }

  function healEvent(ev) {
    if (!ev || typeof ev !== 'object' || !UUID_RE.test(String(ev.eventId || '')) || !DAY_RE.test(String(ev.day || ''))) return null;
    var items = [];
    var src = Array.isArray(ev.items) ? ev.items : [];
    for (var i = 0; i < src.length && items.length < LIMITS.MAX_ITEMS_PER_EVENT; i++) {
      var r = src[i];
      if (!Array.isArray(r) || r.length !== 3 || !validItemId(r[0])) continue;
      if (!(r[1] >= 0 && r[1] < P_BUCKETS && r[1] === Math.floor(r[1])) || (r[2] !== 0 && r[2] !== 1)) continue;
      items.push([r[0], r[1], r[2]]);
    }
    var probes = [];
    var psrc = Array.isArray(ev.probes) ? ev.probes : [];
    for (var j = 0; j < psrc.length && probes.length < P_BUCKETS; j++) {
      var q = psrc[j];
      if (!Array.isArray(q) || q.length !== 3) continue;
      if (!(q[0] >= 0 && q[0] < P_BUCKETS && q[0] === Math.floor(q[0]))) continue;
      if (!(q[1] >= 1 && q[1] <= LIMITS.MAX_PROBE_N && q[1] === Math.floor(q[1])) || !(q[2] >= 0 && q[2] <= q[1] && q[2] === Math.floor(q[2]))) continue;
      probes.push([q[0], q[1], q[2]]);
    }
    if (!items.length && !probes.length) return null;
    var out = { eventId: ev.eventId, day: ev.day, items: items };
    if (probes.length) out.probes = probes;
    return out;
  }

  /**
   * Satu jawaban. Dicatat HANYA bila ini jawaban pertama murid pada soal itu, itemId sah,
   * dan prediksi prior tersedia. Mengembalikan { state, recorded, reason }.
   * `pPrior` = peluang benar SAAT PENYAJIAN dari kesulitan PRIOR (bukan yang sudah
   * dikoreksi) — kalau yang dikirim nilai terkoreksi, penaksir server mengejar dirinya sendiri.
   */
  function observe(state, input, nowMs) {
    var st = healState(state);
    var itemId = input && input.itemId;
    if (!validItemId(itemId)) return { state: st, recorded: false, reason: 'invalid_item' };
    if (typeof (input && input.ok) !== 'boolean') return { state: st, recorded: false, reason: 'no_outcome' };
    if (hasOwn(st.seen, itemId)) return { state: st, recorded: false, reason: 'not_first_exposure' };
    if (Object.keys(st.seen).length >= LIMITS.MAX_SEEN) return { state: st, recorded: false, reason: 'seen_full' };
    // Penyangga penuh (server lama tidak menjawab): soal tetap ditandai terlihat supaya jawaban
    // yang sudah dilatih tidak pernah menyamar sebagai jawaban pertama; datanya saja yang hilang.
    if (buffered(st) >= LIMITS.MAX_BUFFERED_ITEMS) { st.seen[itemId] = 1; return { state: st, recorded: false, reason: 'buffer_full' }; }
    var pb = bucketOf(input && input.pPrior);
    // Tanpa prediksi (tes penempatan, kemampuan belum yakin) jawaban ini TIDAK dikirim,
    // tetapi soalnya TETAP ditandai terlihat: jawaban berikutnya pada soal ini bukan lagi
    // jawaban pertama, dan mencatatnya nanti sebagai "pertama" berarti mengirim bukti
    // yang sudah dilatih.
    if (pb < 0) { st.seen[itemId] = 1; return { state: st, recorded: false, reason: 'seen_without_prediction' }; }
    var day = dayOf(nowMs);
    var bag = st.pending[day] || (st.pending[day] = {});
    // Kuota harian penuh: soal ini TIDAK ditandai terlihat, supaya jawaban pertamanya di
    // hari lain masih bisa dicatat. Menandainya berarti membuang data tanpa mengirimnya.
    if (Object.keys(bag).length >= LIMITS.MAX_PENDING_PER_DAY) return { state: st, recorded: false, reason: 'day_full' };
    st.seen[itemId] = 1;
    bag[itemId] = [pb, input.ok ? 1 : 0];
    return { state: st, recorded: true, reason: 'recorded' };
  }

  /**
   * Braincore langkah 3: satu jawaban PROBE RETENSI (jawaban pertama pada lesson yang sudah
   * dikuasai setelah probe 3/7/21 harinya jatuh tempo). `rProbe` = retrievability yang
   * DIPREDIKSI model ingatan saat soal disajikan. Yang disimpan hanya penghitung
   * [bucket R -> n, benar] per hari — tanpa ID soal atau lesson. Probe tidak memakai aturan
   * "jawaban pertama per soal": setiap probe memang satu pengukuran tersendiri.
   */
  function observeProbe(state, input, nowMs) {
    var st = healState(state);
    var rb = bucketOf(input && input.rProbe);
    if (rb < 0) return { state: st, recorded: false, reason: 'no_prediction' };
    if (typeof (input && input.ok) !== 'boolean') return { state: st, recorded: false, reason: 'no_outcome' };
    var day = dayOf(nowMs);
    var bag = st.probes[day] || (st.probes[day] = {});
    var cell = bag[rb] || [0, 0];
    if (cell[0] >= LIMITS.MAX_PROBE_N) return { state: st, recorded: false, reason: 'bucket_full' };
    bag[rb] = [cell[0] + 1, cell[1] + (input.ok ? 1 : 0)];
    return { state: st, recorded: true, reason: 'recorded' };
  }

  /**
   * Pindahkan catatan tertunda ke outbox sebagai event bereventId (dipotong per
   * MAX_ITEMS_PER_EVENT). eventId dibuat SEKALI di sini dan ikut setiap kiriman ulang,
   * sehingga respons yang hilang di jalan tidak menjadi hitungan ganda di server.
   * `uuidFn` gagal (tanpa CSPRNG) = catatan tetap tertunda, tidak ada yang hilang.
   */
  function seal(state, nowMs, uuidFn) {
    var st = healState(state);
    var cutoff = dayOf((isFiniteNumber(nowMs) ? nowMs : 0) - LIMITS.OUTBOX_DAYS * DAY_MS);
    st.outbox = st.outbox.filter(function (ev) { return ev.day >= cutoff; });
    var dayset = {};
    Object.keys(st.pending).forEach(function (d) { dayset[d] = 1; });
    Object.keys(st.probes).forEach(function (d) { dayset[d] = 1; });
    var days = Object.keys(dayset).sort();
    for (var d = 0; d < days.length; d++) {
      var day = days[d];
      if (day < cutoff) { delete st.pending[day]; delete st.probes[day]; continue; }
      var rows = [];
      var bag = st.pending[day] || {};
      for (var item in bag) if (hasOwn(bag, item)) rows.push([item, bag[item][0], bag[item][1]]);
      var probeRows = [];
      var pbag = st.probes[day] || {};
      for (var rbKey in pbag) if (hasOwn(pbag, rbKey)) probeRows.push([Number(rbKey), pbag[rbKey][0], pbag[rbKey][1]]);
      var chunks = [];
      for (var i = 0; i < rows.length; i += LIMITS.MAX_ITEMS_PER_EVENT) chunks.push(rows.slice(i, i + LIMITS.MAX_ITEMS_PER_EVENT));
      if (!chunks.length) chunks.push([]);
      if (st.outbox.length + chunks.length > LIMITS.MAX_OUTBOX_EVENTS) break;
      var events = [];
      for (var c = 0; c < chunks.length; c++) {
        var id = typeof uuidFn === 'function' ? String(uuidFn() || '') : '';
        if (!UUID_RE.test(id)) return st;
        var ev = { eventId: id, day: day, items: chunks[c] };
        // Probe hari itu menumpang di event PERTAMA hari itu (satu kali, bukan per potongan).
        if (c === 0 && probeRows.length) ev.probes = probeRows;
        if (ev.items.length || ev.probes) events.push(ev);
      }
      Array.prototype.push.apply(st.outbox, events);
      delete st.pending[day];
      delete st.probes[day];
    }
    return st;
  }

  /** Ada kiriman yang boleh dicoba sekarang? */
  function due(state, nowMs) {
    var st = healState(state);
    return st.outbox.length > 0 && (isFiniteNumber(nowMs) ? nowMs : 0) >= st.nextTryAt;
  }

  /** Amplop kiriman (paling banyak MAX_EVENTS_PER_BATCH event) atau null. */
  function envelope(state, batchId) {
    var st = healState(state);
    if (!st.outbox.length || !UUID_RE.test(String(batchId || ''))) return null;
    return {
      schema: EVIDENCE_SCHEMA,
      batchId: String(batchId),
      pv: PARAM_VERSION,
      events: st.outbox.slice(0, LIMITS.MAX_EVENTS_PER_BATCH).map(function (ev) {
        var out = { eventId: ev.eventId, day: ev.day, items: ev.items.map(function (r) { return r.slice(); }) };
        if (ev.probes && ev.probes.length) out.probes = ev.probes.map(function (r) { return r.slice(); });
        return out;
      })
    };
  }

  /** Server mengonfirmasi: event-event ini selesai. Backoff direset. */
  function ack(state, eventIds) {
    var st = healState(state);
    var gone = {};
    (Array.isArray(eventIds) ? eventIds : []).forEach(function (id) { gone[String(id)] = 1; });
    st.outbox = st.outbox.filter(function (ev) { return !gone[ev.eventId]; });
    st.nextTryAt = 0;
    st.attempt = 0;
    return st;
  }

  /**
   * Belum terkirim (offline, 5xx, server belum dinyalakan): simpan, coba lagi nanti.
   * `ms` eksplisit dipakai apa adanya; tanpa itu backoff 1 jam x 2^attempt, plafon 24 jam.
   */
  function defer(state, nowMs, ms) {
    var st = healState(state);
    var now = isFiniteNumber(nowMs) ? nowMs : 0;
    var wait = isFiniteNumber(ms) && ms > 0 ? ms : Math.min(24 * 3600000, 3600000 * Math.pow(2, st.attempt));
    st.attempt = Math.min(20, st.attempt + 1);
    st.nextTryAt = now + wait;
    return st;
  }

  /** Tabel gabungan dari server -> bentuk tervalidasi, atau tabel kosong. */
  function healTable(raw, nowMs) {
    var out = { schema: TABLE_SCHEMA, day: null, items: {} };
    if (!raw || typeof raw !== 'object' || raw.schema !== TABLE_SCHEMA) return out;
    if (!DAY_RE.test(String(raw.day || ''))) return out;
    var age = ((isFiniteNumber(nowMs) ? nowMs : 0) - dayMs(raw.day)) / DAY_MS;
    if (!(age <= APPLY.TABLE_MAX_AGE_DAYS)) return out;
    out.day = raw.day;
    var items = raw.items && typeof raw.items === 'object' ? raw.items : {};
    for (var id in items) {
      if (!hasOwn(items, id) || !validItemId(id)) continue;
      var e = items[id];
      if (!e || !isFiniteNumber(e.d) || !isFiniteNumber(e.n) || e.n < 0) continue;
      out.items[id] = { d: clamp(e.d, -APPLY.BOUND, APPLY.BOUND), n: Math.floor(e.n) };
    }
    return out;
  }

  /**
   * Kesulitan efektif dari tabel gabungan: prior + koreksi populasi, HANYA bila soal itu
   * sudah dijawab >= MIN_N murid. Selain itu prior apa adanya (applied:false) — pemanggil
   * lalu boleh jatuh ke kalibrasi lokal N=1.
   */
  function effective(table, itemId, priorDifficulty) {
    var prior = isFiniteNumber(priorDifficulty) ? priorDifficulty : 0;
    var t = table && typeof table === 'object' && table.items ? table : null;
    var e = t && typeof itemId === 'string' && hasOwn(t.items, itemId) ? t.items[itemId] : null;
    if (!e || !isFiniteNumber(e.d) || !isFiniteNumber(e.n)) return { difficulty: prior, n: 0, applied: false, rationale: 'brain3_item_pool_no_entry' };
    if (e.n < APPLY.MIN_N) return { difficulty: prior, n: e.n, applied: false, rationale: 'brain3_item_pool_insufficient' };
    var d = clamp(e.d, -APPLY.BOUND, APPLY.BOUND);
    return {
      difficulty: clamp(prior + d, APPLY.DIFF_MIN, APPLY.DIFF_MAX),
      n: e.n,
      applied: true,
      rationale: 'brain3_item_pool_applied'
    };
  }

  /** Ringkasan diagnostik (tanpa isi soal). */
  function summary(state) {
    var st = healState(state);
    var pending = 0;
    for (var day in st.pending) if (hasOwn(st.pending, day)) pending += Object.keys(st.pending[day]).length;
    var queued = 0;
    st.outbox.forEach(function (ev) { queued += ev.items.length; });
    return { seen: Object.keys(st.seen).length, pending: pending, queued: queued, nextTryAt: st.nextTryAt };
  }

  return {
    SCHEMA: SCHEMA,
    EVIDENCE_SCHEMA: EVIDENCE_SCHEMA,
    PARAM_VERSION: PARAM_VERSION,
    TABLE_SCHEMA: TABLE_SCHEMA,
    DISCRIMINATION: DISCRIMINATION,
    GUESS_FLOOR: GUESS_FLOOR,
    P_BUCKETS: P_BUCKETS,
    SOURCE_RE: SOURCE_RE,
    MODES: MODES,
    LIMITS: LIMITS,
    APPLY: APPLY,
    validItemId: validItemId,
    bucketOf: bucketOf,
    healState: healState,
    observe: observe,
    observeProbe: observeProbe,
    seal: seal,
    due: due,
    envelope: envelope,
    ack: ack,
    defer: defer,
    healTable: healTable,
    effective: effective,
    summary: summary
  };
});
