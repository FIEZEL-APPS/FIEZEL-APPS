/**
 * FIEZEL — inti lane KESULITAN SOAL GABUNGAN (`fiezel-item-evidence-v1`), sisi server.
 *
 * Braincore langkah 2: kesulitan soal dihitung dari SEMUA murid, bukan per HP. Perangkat
 * (features/brain/fiezel-item-pool.js) mengirim jawaban PERTAMA setiap murid pada setiap
 * soal sebagai [itemId, bucketPrediksi, benar]; berkas ini memvalidasinya, meringkasnya
 * menjadi PENGHITUNG, dan dari penghitung itu menaksir seberapa jauh kesulitan PRIOR
 * setiap soal meleset.
 *
 * MURNI: tanpa D1, tanpa jaringan, tanpa jam internal (waktu selalu argumen). Diuji
 * langsung oleh tests/item-pool-test.js, termasuk simulasi populasi yang membuktikan
 * penaksir gabungan mengalahkan kalibrasi per-HP.
 *
 * PENAKSIR
 * --------
 * Setiap jawaban membawa p0 = peluang benar yang diprediksi perangkat SEBELUM menjawab,
 * dari kemampuan murid itu dan kesulitan PRIOR soal. Kalau prior soal meleset sebesar
 * delta, peluang yang sebenarnya adalah
 *
 *     p(delta) = c + (1-c) * sigmoid(logit(s0) - a*delta),   s0 = (p0-c)/(1-c)
 *
 * dengan a=1.5, c=0.25 (3PL yang sama dengan perangkat). delta ditaksir dengan MAP:
 * log-likelihood binomial per bucket + prior normal, diselesaikan Fisher scoring, dalam
 * DUA TAHAP (estimateItemDifficulty): tahap 1 menaksir PERGESERAN BERSAMA (median) dan
 * seberapa lebar label benar-benar meleset (empirical Bayes); tahap 2 mengerutkan setiap
 * soal ke arah pergeseran bersama itu dengan lebar tersebut.
 *
 * Pergeseran bersama itu (mis. taksiran kemampuan semua perangkat sama-sama terlalu tinggi,
 * sehingga SEMUA soal tampak lebih sulit dengan jumlah yang sama) bukan sifat soal mana pun,
 * jadi ia dikurangkan dari semuanya (pelajaran simulator C6 di FiezelItemCalibration). Yang
 * tersisa adalah deviasi RELATIF — satu-satunya sinyal tentang soal yang bisa dipercaya.
 */

export const ITEM_EVIDENCE_SCHEMA = 'fiezel-item-evidence-v1';
export const ITEM_TABLE_SCHEMA = 'fiezel-item-difficulty-v1';

/* Konstanta yang WAJIB identik dengan features/brain/fiezel-item-pool.js — dikunci
 * tests/item-pool-test.js. Server yang menolak apa yang dikirim perangkat = data hilang
 * diam-diam; perangkat yang menerapkan ambang berbeda = tabel dibaca dengan arti lain. */
export const DISCRIMINATION = 1.5;
export const GUESS_FLOOR = 0.25;
export const P_BUCKETS = 20;
export const SOURCE_RE = /^[A-Za-z0-9]{1,4}(?:[-_][A-Za-z0-9]{1,4}){0,2}[-_][0-9]{2,3}$/;
export const MODES = Object.freeze([
  'apply_form', 'complete_sentence', 'justify_correct', 'recognize_rule', 'recognize_objective',
  'sequence_reasoning', 'identify_misconception', 'recall_memory_cue', 'choose_avoidance',
  'diagnose_distractor_1', 'diagnose_distractor_2', 'diagnose_distractor_3',
  'label_misconception_1', 'label_misconception_2', 'label_misconception_3',
  'repair_distractor_1', 'repair_distractor_2', 'repair_distractor_3',
  'contrast_distractor_1', 'contrast_distractor_2', 'contrast_distractor_3',
  'classify_family', 'locate_decision_cue', 'teach_back', 'mastery_check',
  'cloze_production', 'grammar', 'cloze'
]);

export const ITEM_POOL_LIMITS = Object.freeze({
  MAX_BODY_BYTES: 24 * 1024,
  MAX_EVENTS: 10,
  MAX_ITEMS_PER_EVENT: 60,
  DAY_WINDOW: 56,          // hari jawaban paling tua yang diterima (== OUTBOX_DAYS perangkat == WINDOW_DAYS)
  DEDUP_TTL_DAYS: 60,      // eventId harus hidup lebih lama dari jendela kirim ulang (56 hari), atau kiriman ulang terhitung dua kali
  RETENTION_DAYS: 120,     // penghitung harian; jendela penaksir 56 hari + ruang
  RATE_WINDOW_MS: 60000,
  RATE_PER_WINDOW: 20
});

export const ESTIMATOR = Object.freeze({
  WINDOW_DAYS: 56,         // jawaban 8 minggu terakhir
  WEAK_TAU: 2.0,           // tahap 1: prior nyaris datar, supaya median & sebaran tidak terkerut
  TAU_MIN: 0.15,           // tahap 2: SD prior empirical-Bayes dijepit ke [0.15, 0.8]
  TAU_MAX: 0.8,
  TAU_FALLBACK: 0.3,       // dipakai bila soal berbukti cukup < RECENTER_MIN_ITEMS
  BOUND: 1.0,              // |koreksi| dijepit ke satu tingkat CEFR
  ITERATIONS: 12,
  MIN_N: 20,               // jawaban-pertama (= murid) minimum agar diterbitkan
  RECENTER_MIN_ITEMS: 5,   // median dari < 5 soal belum mewakili drift bersama
  PUBLISH_DEAD_ZONE: 0.2   // |koreksi| sekecil ini lebih mungkin derau daripada sinyal
});

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MODE_SET = new Set(MODES);

export function validItemId(id) {
  if (typeof id !== 'string' || id.length > 80) return false;
  const parts = id.split(':');
  return parts.length === 2 && SOURCE_RE.test(parts[0]) && MODE_SET.has(parts[1]);
}

function dayKey(ms) { return new Date(ms).toISOString().slice(0, 10); }

/**
 * Validasi amplop. STRUKTUR yang rusak (skema, batchId, eventId, jumlah event) = 400/413,
 * karena itu bug klien yang harus terlihat. ISI yang tidak sah (item asing, bucket di luar
 * rentang, hari di luar jendela 56 hari) dibuang diam-diam dan dihitung di `dropped`: perangkat
 * yang lebih tua dari daftar MODES tidak boleh macet mengulang satu batch selamanya.
 */
export function normalizeItemEnvelope(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'bad_body' };
  if (body.schema !== ITEM_EVIDENCE_SCHEMA) return { ok: false, reason: 'bad_schema' };
  if (!UUID_RE.test(String(body.batchId || ''))) return { ok: false, reason: 'bad_batch_id' };
  const allowed = new Set(['schema', 'batchId', 'events']);
  for (const k of Object.keys(body)) if (!allowed.has(k)) return { ok: false, reason: 'unknown_field', field: k };
  if (!Array.isArray(body.events) || body.events.length === 0) return { ok: false, reason: 'no_events' };
  if (body.events.length > ITEM_POOL_LIMITS.MAX_EVENTS) return { ok: false, reason: 'too_many_events' };

  const today = dayKey(now);
  const oldest = dayKey(now - ITEM_POOL_LIMITS.DAY_WINDOW * 86400000);
  const events = [];
  let dropped = 0;
  const seenIds = new Set();
  for (let i = 0; i < body.events.length; i++) {
    const ev = body.events[i];
    if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return { ok: false, reason: 'bad_event', index: i };
    for (const k of Object.keys(ev)) if (k !== 'eventId' && k !== 'day' && k !== 'items') return { ok: false, reason: 'unknown_field', field: k, index: i };
    if (!UUID_RE.test(String(ev.eventId || '')) || seenIds.has(ev.eventId)) return { ok: false, reason: 'bad_event_id', index: i };
    seenIds.add(ev.eventId);
    if (!Array.isArray(ev.items) || ev.items.length > ITEM_POOL_LIMITS.MAX_ITEMS_PER_EVENT) return { ok: false, reason: 'bad_items', index: i };
    const day = String(ev.day || '');
    if (!DAY_RE.test(day) || day < oldest || day > today) { dropped += ev.items.length; events.push({ eventId: ev.eventId, day: null, items: [] }); continue; }
    const items = [];
    const inEvent = new Set();
    for (const r of ev.items) {
      const ok = Array.isArray(r) && r.length === 3 && validItemId(r[0]) &&
        Number.isInteger(r[1]) && r[1] >= 0 && r[1] < P_BUCKETS && (r[2] === 0 || r[2] === 1) &&
        !inEvent.has(r[0]);
      if (!ok) { dropped++; continue; }
      inEvent.add(r[0]);
      items.push([r[0], r[1], r[2]]);
    }
    events.push({ eventId: ev.eventId, day, items });
  }
  return { ok: true, envelope: { batchId: body.batchId, events }, dropped };
}

/** Event -> baris penghitung { day, item_id, pb, n, k } (satu baris per kombinasi). */
export function aggregateItemRows(events) {
  const map = new Map();
  for (const ev of Array.isArray(events) ? events : []) {
    if (!ev || !ev.day) continue;
    for (const [itemId, pb, k] of ev.items || []) {
      const key = ev.day + '|' + itemId + '|' + pb;
      const row = map.get(key) || { day: ev.day, item_id: itemId, pb, n: 0, k: 0 };
      row.n += 1;
      row.k += k;
      map.set(key, row);
    }
  }
  return [...map.values()];
}

function bucketCenter(pb) { return (pb + 0.5) / P_BUCKETS; }
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

/**
 * MAP delta satu soal dari bucket-bucketnya: [{ pb, n, k }]. Mengembalikan
 * { delta, se, n } — delta POSITIF = soal lebih SULIT dari prior-nya.
 */
export function estimateItemDelta(buckets, opts = {}) {
  const a = DISCRIMINATION, c = GUESS_FLOOR;
  const tau = opts.tau || ESTIMATOR.TAU;
  const bound = opts.bound || ESTIMATOR.BOUND;
  const mu = Number.isFinite(opts.mu) ? opts.mu : 0;
  const rows = [];
  let n = 0;
  for (const b of Array.isArray(buckets) ? buckets : []) {
    const bn = Number(b.n) || 0, bk = Number(b.k) || 0;
    if (bn <= 0) continue;
    // Bucket di bawah lantai tebakan (p0 < c) tidak mungkin dari 3PL ini; s0 dijepit
    // supaya logit tetap terhingga, bukan dibuang (jawabannya tetap bukti yang sah).
    const s0 = Math.min(0.98, Math.max(0.02, (bucketCenter(b.pb) - c) / (1 - c)));
    rows.push({ l0: Math.log(s0 / (1 - s0)), n: bn, k: Math.min(bn, Math.max(0, bk)) });
    n += bn;
  }
  if (!n) return { delta: mu, se: tau, n: 0 };
  let delta = mu;
  let info = 1 / (tau * tau);
  for (let it = 0; it < (opts.iterations || ESTIMATOR.ITERATIONS); it++) {
    let score = -(delta - mu) / (tau * tau);
    info = 1 / (tau * tau);
    for (const r of rows) {
      const s = sigmoid(r.l0 - a * delta);
      const p = Math.min(1 - 1e-9, Math.max(1e-9, c + (1 - c) * s));
      const dp = -(1 - c) * a * s * (1 - s);           // dp/d(delta)
      score += (r.k - r.n * p) * dp / (p * (1 - p));
      info += r.n * dp * dp / (p * (1 - p));
    }
    const next = Math.max(-bound, Math.min(bound, delta + score / info));
    if (Math.abs(next - delta) < 1e-6) { delta = next; break; }
    delta = next;
  }
  return { delta, se: 1 / Math.sqrt(info), n };
}

/**
 * Semua soal dari baris jendela [{ item_id, pb, n, k }] -> taksiran terpusat, DUA TAHAP.
 *
 * Tahap 1 — taksiran LEMAH per soal (prior nyaris datar). Median soal berbukti cukup =
 *   pergeseran BERSAMA (bias taksiran kemampuan semua perangkat), dan sebaran di sekitar
 *   median dikurangi rata-rata galat baku^2 = varians meleset-label yang SEBENARNYA
 *   (empirical Bayes, metode momen).
 * Tahap 2 — MAP per soal dengan prior N(median, tau^2) dari tahap 1, lalu koreksi yang
 *   diterbitkan = delta - median.
 *
 * KENAPA DUA TAHAP (temuan simulasi, dikunci tests/item-pool-test.js E5): SD prior yang
 * DIPATOK selalu salah di salah satu dunia. tau=0.5 menggeser soal yang labelnya benar
 * saat sebagian besar label memang benar (galat 0.258 vs 0.217 dua tahap); tau=0.3
 * mengerutkan terlalu keras saat banyak label meleset (0.451 vs 0.367). tau yang DIBACA dari
 * sebaran data mengikuti dunia yang sebenarnya, dan di setiap dunia yang diuji ia paling
 * jauh 0.006 dari pilihan patokan terbaik untuk dunia itu. Mengerutkan ke arah pergeseran
 * bersama (bukan ke 0) juga membuat median yang dikurangkan adalah bias yang sebenarnya,
 * bukan bias yang ikut terkerut.
 *
 * Mengembalikan { items: [{ itemId, delta, raw, se, n }], median, tau, cohort }.
 */
export function estimateItemDifficulty(rows, opts = {}) {
  const byItem = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !validItemId(r.item_id)) continue;
    const pb = Number(r.pb);
    if (!Number.isInteger(pb) || pb < 0 || pb >= P_BUCKETS) continue;
    const list = byItem.get(r.item_id) || [];
    list.push({ pb, n: Number(r.n) || 0, k: Number(r.k) || 0 });
    byItem.set(r.item_id, list);
  }
  const minN = opts.minN || ESTIMATOR.MIN_N;
  const bound = opts.bound || ESTIMATOR.BOUND;
  const weakBound = bound + 0.5;
  const weak = [];
  for (const [itemId, buckets] of byItem) {
    const est = estimateItemDelta(buckets, { tau: ESTIMATOR.WEAK_TAU, bound: weakBound, iterations: opts.iterations });
    weak.push({ itemId, buckets, raw: est.delta, se: est.se, n: est.n });
  }
  const big = weak.filter((x) => x.n >= minN);
  const sorted = big.map((x) => x.raw).sort((x, y) => x - y);
  const k = sorted.length;
  const enough = k >= (opts.recenterMinItems || ESTIMATOR.RECENTER_MIN_ITEMS);
  const median = enough ? (k % 2 ? sorted[(k - 1) / 2] : (sorted[k / 2 - 1] + sorted[k / 2]) / 2) : 0;
  let tau = ESTIMATOR.TAU_FALLBACK;
  if (opts.tau) tau = opts.tau;
  else if (enough) {
    const spread = big.reduce((sum, x) => sum + (x.raw - median) ** 2, 0) / Math.max(1, k - 1);
    const noise = big.reduce((sum, x) => sum + x.se * x.se, 0) / k;
    tau = Math.sqrt(Math.min(ESTIMATOR.TAU_MAX ** 2, Math.max(ESTIMATOR.TAU_MIN ** 2, spread - noise)));
  }
  const items = weak.map((x) => {
    const est = estimateItemDelta(x.buckets, { tau, mu: median, bound: weakBound, iterations: opts.iterations });
    return {
      itemId: x.itemId,
      delta: Math.max(-bound, Math.min(bound, est.delta - median)),
      raw: x.raw,
      se: est.se,
      n: x.n
    };
  });
  return { items, median, tau, cohort: k };
}

/** Taksiran -> tabel yang diterbitkan (hanya soal dengan bukti cukup & koreksi berarti). */
export function buildDifficultyTable(estimate, day, opts = {}) {
  const minN = opts.minN || ESTIMATOR.MIN_N;
  const dead = opts.deadZone === undefined ? ESTIMATOR.PUBLISH_DEAD_ZONE : opts.deadZone;
  const items = {};
  for (const x of (estimate && estimate.items) || []) {
    if (x.n < minN || Math.abs(x.delta) < dead) continue;
    items[x.itemId] = { d: Math.round(x.delta * 100) / 100, n: x.n };
  }
  return { schema: ITEM_TABLE_SCHEMA, day: DAY_RE.test(String(day || '')) ? day : null, items };
}

export default {
  ITEM_EVIDENCE_SCHEMA,
  ITEM_TABLE_SCHEMA,
  DISCRIMINATION,
  GUESS_FLOOR,
  P_BUCKETS,
  SOURCE_RE,
  MODES,
  ITEM_POOL_LIMITS,
  ESTIMATOR,
  validItemId,
  normalizeItemEnvelope,
  aggregateItemRows,
  estimateItemDelta,
  estimateItemDifficulty,
  buildDifficultyTable
};
