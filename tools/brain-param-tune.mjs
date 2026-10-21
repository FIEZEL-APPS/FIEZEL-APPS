/**
 * FIEZEL — penyetel angka rumus Braincore DARI DATA (roadmap OWNER langkah 3).
 *
 * "Angka-angka rumus disetel dari data, bukan ditebak." Tiga angka di kepala Braincore
 * ditebak saat ditulis: DISCRIMINATION a = 1.5, GUESS_FLOOR c = 0.25 (IRT), dan paruh-waktu
 * dasar ingatan 1.6 hari (FSRS-lite). Berkas ini mengukurnya dari penghitung anonim jalur
 * gabungan (item_pool_daily, item_pool_probe_daily) dan menghasilkan USULAN — bukan
 * perubahan. Keputusan OWNER yang tercatat di features/brain/fiezel-self-tune.js (FSRS/IRT/BKT
 * tidak bergerak sendiri) tetap berlaku: angka baru masuk lewat PR yang disetujui owner.
 *
 * KENAPA a DAN c DISETEL DENGAN VALIDASI SILANG, BUKAN DITAKSIR "NILAI SEBENARNYA"
 * -------------------------------------------------------------------------------
 * Simulasi (tests/brain-param-tune-test.js) menunjukkan taksiran struktural a/c dari data
 * ber-bucket ini BIAS: gabungan maksimum-likelihood per soal menaikkan a (masalah parameter
 * insidental, 1.5 -> 1.8), dan likelihood marginal masih meleset ~0.15 karena sebaran koreksi
 * soal bukan normal. Dengan ribuan jawaban, galat baku kecil, jadi taksiran yang bias akan
 * MENGUSULKAN perubahan palsu di dunia yang sebenarnya baik-baik saja.
 * Pertanyaan yang benar bukan "berapa a sebenarnya" tetapi "a dan c mana yang MEMPREDIKSI
 * jawaban yang belum dilihat paling baik" — karena itulah gunanya a dan c di Braincore.
 * Maka: hari dibagi genap/ganjil, koreksi soal ditaksir dari satu separuh, log-loss dihitung
 * pada separuh lainnya (dan sebaliknya), untuk setiap kandidat (a, c). Usulan hanya bila
 * perbaikan log-loss terhadap angka sekarang LEBIH DARI NOL pada selang bootstrap 95% (dibagi
 * per soal). Di dunia tanpa masalah, tidak ada kandidat yang lolos — terbukti di gerbang.
 *
 * PARUH-WAKTU INGATAN DARI PROBE RETENSI
 * --------------------------------------
 * Jawaban ulangan biasa mencampur lupa dengan belajar. Probe retensi (3/7/21 hari setelah
 * lesson dikuasai) mengukur tepat "masih ingat?". Model: p = c + (1-c) * q * R^(1/k), R =
 * retrievability yang diprediksi perangkat, q = plafon "masih bisa menerapkan" sesudah
 * dikuasai, k = pengali paruh-waktu (k > 1: murid ingat lebih lama dari perkiraan). Selang
 * k dari bootstrap per HARI.
 *
 * MURNI: tanpa jaringan dan tanpa jam (hari selalu argumen); pengacak bootstrap berbiji tetap.
 */

import {
  DISCRIMINATION, GUESS_FLOOR, P_BUCKETS,
  estimateItemDifficulty, validItemId
} from '../workers/api/evidence/item-pool-core.js';

export const TUNE_SCHEMA = 'fiezel-braincore-tuning-v1';

/** Angka sekarang dan batas kerasnya (salinan FiezelBrainConfig.BOUNDS; paritas dikunci gerbang). */
export const CURRENT = Object.freeze({ discrimination: DISCRIMINATION, guessFloor: GUESS_FLOOR, baseHalfLifeDays: 1.6 });
export const BOUNDS = Object.freeze({
  discrimination: Object.freeze({ min: 0.5, max: 2.5 }),
  guessFloor: Object.freeze({ min: 0.1, max: 0.3 }),
  baseHalfLifeDays: Object.freeze({ min: 0.5, max: 7 })
});

export const GATE = Object.freeze({
  MIN_ITEM_ANSWERS: 3000,     // jawaban-pertama di jendela sebelum a/c boleh diusulkan
  MIN_PROBE_ANSWERS: 600,     // jawaban probe sebelum paruh-waktu boleh diusulkan
  MIN_STEP_A: 0.1,
  MIN_STEP_C: 0.02,
  MIN_LOG_K: Math.log(1.15),  // perubahan paruh-waktu < 15% tidak berarti
  BOOTSTRAP: 400
});

/** Grid kandidat, di DALAM batas keras. */
export const GRID = Object.freeze({
  a: Object.freeze([1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]),
  c: Object.freeze([0.15, 0.175, 0.2, 0.225, 0.25, 0.275, 0.3])
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const L0 = Float64Array.from({ length: P_BUCKETS }, (_, pb) => {
  const s0 = Math.min(0.98, Math.max(0.02, ((pb + 0.5) / P_BUCKETS - GUESS_FLOOR) / (1 - GUESS_FLOOR)));
  return Math.log(s0 / (1 - s0));
});

function percentile(sorted, q) {
  if (!sorted.length) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i];
}

/**
 * Baris jendela per LIPATAN: [{ fold 0|1, item_id, pb, n, k }] (SQL.selectItemPoolWindowByFold).
 * Mengembalikan log-loss held-out per soal untuk kandidat (a, c).
 */
function heldOutLoss(foldRows, a, c) {
  const link = { r: a / DISCRIMINATION, c };
  const perItem = new Map();
  let total = 0;
  for (const train of [0, 1]) {
    const est = estimateItemDifficulty(foldRows[train], { link });
    const map = new Map(est.items.map((x) => [x.itemId, x.map]));
    for (const row of foldRows[1 - train]) {
      const d = map.has(row.item_id) ? map.get(row.item_id) : est.median;
      const s = 1 / (1 + Math.exp(-link.r * (L0[row.pb] - DISCRIMINATION * d)));
      const p = Math.min(1 - 1e-9, Math.max(1e-9, c + (1 - c) * s));
      const loss = -(row.k * Math.log(p) + (row.n - row.k) * Math.log(1 - p));
      total += loss;
      perItem.set(row.item_id, (perItem.get(row.item_id) || 0) + loss);
    }
  }
  return { total, perItem };
}

/** Pisahkan baris ke dua lipatan dan buang yang tidak sah. */
export function splitFolds(rows) {
  const folds = [[], []];
  for (const r of Array.isArray(rows) ? rows : []) {
    const f = Number(r && r.fold), pb = Number(r && r.pb), n = Number(r && r.n), k = Number(r && r.k);
    if ((f !== 0 && f !== 1) || !validItemId(r.item_id) || !Number.isInteger(pb) || pb < 0 || pb >= P_BUCKETS) continue;
    if (!(n > 0) || !(k >= 0) || k > n) continue;
    folds[f].push({ item_id: r.item_id, pb, n, k });
  }
  return folds;
}

/**
 * Validasi silang a/c. Mengembalikan { n, best: {a, c}, gain, ci: [lo, hi], candidates }.
 * gain = log-loss angka sekarang - log-loss kandidat terbaik (positif = kandidat lebih baik);
 * ci = selang bootstrap 95% gain, dibagi PER SOAL (soal adalah unit yang saling bebas).
 */
export function cvTuneLink(foldRowsRaw, opts = {}) {
  const foldRows = Array.isArray(foldRowsRaw) && foldRowsRaw.length === 2 && Array.isArray(foldRowsRaw[0])
    ? foldRowsRaw : splitFolds(foldRowsRaw);
  const n = foldRows[0].concat(foldRows[1]).reduce((s, r) => s + r.n, 0);
  const gridA = opts.gridA || GRID.a, gridC = opts.gridC || GRID.c;
  const base = heldOutLoss(foldRows, CURRENT.discrimination, CURRENT.guessFloor);
  let best = { a: CURRENT.discrimination, c: CURRENT.guessFloor, ...base };
  const candidates = [];
  for (const a of gridA) {
    for (const c of gridC) {
      if (a === CURRENT.discrimination && c === CURRENT.guessFloor) continue;
      const loss = heldOutLoss(foldRows, a, c);
      candidates.push({ a, c, loss: Math.round(loss.total * 10) / 10 });
      if (loss.total < best.total - 1e-9) best = { a, c, ...loss };
    }
  }
  const ids = [...base.perItem.keys()];
  const diffs = ids.map((id) => base.perItem.get(id) - (best.perItem.get(id) || 0));
  const rnd = mulberry32(opts.seed || 20260927);
  const boots = [];
  const B = opts.bootstrap || GATE.BOOTSTRAP;
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (let i = 0; i < ids.length; i++) s += diffs[Math.floor(rnd() * ids.length)];
    boots.push(s);
  }
  boots.sort((x, y) => x - y);
  const gain = base.total - best.total;
  return {
    n,
    items: ids.length,
    best: { a: best.a, c: best.c },
    gain: Math.round(gain * 100) / 100,
    ci: ids.length ? [Math.round(percentile(boots, 0.025) * 100) / 100, Math.round(percentile(boots, 0.975) * 100) / 100] : [0, 0],
    candidates
  };
}

/** Fisher scoring (logit q, ln k) untuk p = c + (1-c) q R^(1/k). */
function fitMemoryOnce(cells, c) {
  let u = Math.log(0.85 / 0.15), phi = 0;
  for (let it = 0; it < 60; it++) {
    const q = 1 / (1 + Math.exp(-u)), inv = Math.exp(-phi);
    let g0 = 0, g1 = 0, i00 = 1e-9, i01 = 0, i11 = 1e-9;
    for (const cell of cells) {
      const Rk = Math.exp(cell.lnR * inv);
      const p = Math.min(1 - 1e-9, Math.max(1e-9, c + (1 - c) * q * Rk));
      const du = (1 - c) * Rk * q * (1 - q);
      const dphi = (1 - c) * q * Rk * cell.lnR * (-inv);
      const w = (cell.k - cell.n * p) / (p * (1 - p)), v = cell.n / (p * (1 - p));
      g0 += w * du; g1 += w * dphi;
      i00 += v * du * du; i01 += v * du * dphi; i11 += v * dphi * dphi;
    }
    const det = i00 * i11 - i01 * i01;
    if (!(Math.abs(det) > 1e-12)) break;
    const su = (i11 * g0 - i01 * g1) / det, sp = (-i01 * g0 + i00 * g1) / det;
    const nu = Math.min(8, Math.max(-4, u + Math.max(-1, Math.min(1, su))));
    const nphi = Math.min(Math.log(5), Math.max(Math.log(0.2), phi + Math.max(-0.5, Math.min(0.5, sp))));
    const done = Math.abs(nu - u) < 1e-7 && Math.abs(nphi - phi) < 1e-7;
    u = nu; phi = nphi;
    if (done) break;
  }
  return { q: 1 / (1 + Math.exp(-u)), k: Math.exp(phi) };
}

/**
 * Paruh-waktu dari baris probe [{ day, rb, n, k }]. Mengembalikan { n, days, k, q, ci }.
 * ci = selang bootstrap 95% k, dibagi per HARI.
 */
export function fitProbeMemory(rows, opts = {}) {
  const c = Number.isFinite(opts.c) ? opts.c : CURRENT.guessFloor;
  const byDay = new Map();
  let n = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const rb = Number(r && r.rb), rn = Number(r && r.n), rk = Number(r && r.k);
    if (!Number.isInteger(rb) || rb < 0 || rb >= P_BUCKETS || !(rn > 0) || !(rk >= 0) || rk > rn) continue;
    const R = Math.min(0.99, Math.max(0.01, (rb + 0.5) / P_BUCKETS));
    const cell = { lnR: Math.log(R), n: rn, k: rk };
    const day = String(r.day || '');
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(cell);
    n += rn;
  }
  const all = [].concat(...byDay.values());
  if (!n) return { n: 0, days: 0, k: 1, q: null, ci: [null, null] };
  const fit = fitMemoryOnce(all, c);
  const days = [...byDay.keys()];
  const rnd = mulberry32(opts.seed || 7);
  const ks = [];
  const B = opts.bootstrap || 200;
  for (let b = 0; b < B; b++) {
    const bag = [];
    for (let i = 0; i < days.length; i++) bag.push(...byDay.get(days[Math.floor(rnd() * days.length)]));
    ks.push(fitMemoryOnce(bag, c).k);
  }
  ks.sort((x, y) => x - y);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  return { n, days: days.length, k: r3(fit.k), q: r3(fit.q), ci: [r3(percentile(ks, 0.025)), r3(percentile(ks, 0.975))] };
}

/**
 * Hasil penaksiran -> usulan yang LOLOS gerbang + alasan untuk yang tertahan (supaya "tidak ada
 * usulan" bukan kotak hitam). Tidak mengubah apa pun.
 */
export function propose(link, memory) {
  const proposals = [];
  const held = [];
  const clamp = (v, b) => Math.min(b.max, Math.max(b.min, v));
  if (!link || link.n < GATE.MIN_ITEM_ANSWERS) {
    held.push({ param: 'discrimination+guessFloor', reason: 'insufficient_data', n: link ? link.n : 0, need: GATE.MIN_ITEM_ANSWERS });
  } else if (!(link.ci[0] > 0)) {
    held.push({ param: 'discrimination+guessFloor', reason: 'no_significant_gain', gain: link.gain, ci: link.ci, best: link.best });
  } else {
    const dA = Math.abs(link.best.a - CURRENT.discrimination), dC = Math.abs(link.best.c - CURRENT.guessFloor);
    if (dA >= GATE.MIN_STEP_A) proposals.push({ param: 'discrimination', from: CURRENT.discrimination, to: clamp(link.best.a, BOUNDS.discrimination), evidence: { gain: link.gain, ci: link.ci, n: link.n } });
    if (dC >= GATE.MIN_STEP_C) proposals.push({ param: 'guessFloor', from: CURRENT.guessFloor, to: clamp(link.best.c, BOUNDS.guessFloor), evidence: { gain: link.gain, ci: link.ci, n: link.n } });
    if (dA < GATE.MIN_STEP_A && dC < GATE.MIN_STEP_C) held.push({ param: 'discrimination+guessFloor', reason: 'change_too_small', best: link.best });
  }
  if (!memory || memory.n < GATE.MIN_PROBE_ANSWERS) {
    held.push({ param: 'baseHalfLifeDays', reason: 'insufficient_data', n: memory ? memory.n : 0, need: GATE.MIN_PROBE_ANSWERS });
  } else if (!(memory.ci[0] > 1 || memory.ci[1] < 1)) {
    held.push({ param: 'baseHalfLifeDays', reason: 'current_within_ci', k: memory.k, ci: memory.ci });
  } else if (Math.abs(Math.log(memory.k)) < GATE.MIN_LOG_K) {
    held.push({ param: 'baseHalfLifeDays', reason: 'change_too_small', k: memory.k });
  } else {
    proposals.push({
      param: 'baseHalfLifeDays', from: CURRENT.baseHalfLifeDays,
      to: Math.round(clamp(CURRENT.baseHalfLifeDays * memory.k, BOUNDS.baseHalfLifeDays) * 100) / 100,
      evidence: { k: memory.k, ci: memory.ci, n: memory.n }
    });
  }
  return { proposals, held };
}

/** Satu pintu: baris lipatan + baris probe -> laporan penyetelan lengkap. */
export function tune(foldRows, probeRows, opts = {}) {
  const link = cvTuneLink(foldRows, opts);
  const memory = fitProbeMemory(probeRows, opts);
  const { proposals, held } = propose(link, memory);
  return { schema: TUNE_SCHEMA, day: opts.day || null, current: CURRENT, link, memory, proposals, held };
}

const REASON_ID = {
  insufficient_data: 'data belum cukup',
  no_significant_gain: 'angka lain tidak memprediksi lebih baik secara meyakinkan',
  current_within_ci: 'angka sekarang masih di dalam selang kepercayaan',
  change_too_small: 'perubahannya terlalu kecil untuk berarti'
};
const PARAM_ID = {
  discrimination: 'Ketajaman soal (a)',
  guessFloor: 'Peluang tebak (c)',
  baseHalfLifeDays: 'Paruh-waktu ingatan dasar (hari)',
  'discrimination+guessFloor': 'Ketajaman soal (a) + peluang tebak (c)'
};

/** Laporan Markdown berbahasa Indonesia untuk ringkasan job GitHub Actions. */
export function renderReport(result) {
  const lines = ['## Braincore — usulan penyetelan angka rumus', ''];
  lines.push('Hari: `' + (result.day || '-') + '`. Angka sekarang: a = ' + result.current.discrimination +
    ', c = ' + result.current.guessFloor + ', paruh-waktu dasar = ' + result.current.baseHalfLifeDays + ' hari.', '');
  if (result.proposals.length) {
    lines.push('### Usulan (butuh persetujuan owner)', '', '| Angka | Sekarang | Usulan | Bukti |', '|---|---|---|---|');
    for (const p of result.proposals) {
      const ev = p.param === 'baseHalfLifeDays'
        ? 'k = ' + p.evidence.k + ' (95%: ' + p.evidence.ci.join('–') + '), ' + p.evidence.n + ' jawaban probe'
        : 'perbaikan log-loss ' + p.evidence.gain + ' (95%: ' + p.evidence.ci.join('–') + '), ' + p.evidence.n + ' jawaban';
      lines.push('| ' + PARAM_ID[p.param] + ' | ' + p.from + ' | **' + p.to + '** | ' + ev + ' |');
    }
    lines.push('', 'Untuk menerapkan: minta Claude "terapkan usulan penyetelan Braincore" — perubahan masuk lewat PR.', '');
  } else {
    lines.push('**Tidak ada usulan.** Angka sekarang dipertahankan.', '');
  }
  if (result.held.length) {
    lines.push('### Tertahan', '');
    for (const h of result.held) {
      const extra = h.reason === 'insufficient_data' ? ' (' + h.n + ' dari ' + h.need + ' jawaban)' : '';
      lines.push('- ' + PARAM_ID[h.param] + ': ' + (REASON_ID[h.reason] || h.reason) + extra);
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** Letak angka di kode — daftar yang HARUS diubah bersama oleh PR penyetelan (dikunci gerbang). */
export const CODE_SITES = Object.freeze({
  discrimination: Object.freeze([
    'features/brain/fiezel-core-brain.js DISCRIMINATION',
    'features/brain/fiezel-item-calibration.js DISCRIMINATION',
    'features/brain/fiezel-item-pool.js DISCRIMINATION + PARAM_VERSION',
    'features/brain/fiezel-brain-config.js DEFAULTS.difficulty.discrimination',
    'workers/api/evidence/item-pool-core.js DISCRIMINATION + PARAM_VERSION + PARAM_EPOCH_DAY'
  ]),
  guessFloor: Object.freeze([
    'features/brain/fiezel-core-brain.js GUESS_FLOOR',
    'features/brain/fiezel-item-calibration.js GUESS_FLOOR',
    'features/brain/fiezel-item-pool.js GUESS_FLOOR + PARAM_VERSION',
    'features/brain/fiezel-brain-config.js DEFAULTS.difficulty.guessFloor',
    'workers/api/evidence/item-pool-core.js GUESS_FLOOR + PARAM_VERSION + PARAM_EPOCH_DAY'
  ]),
  baseHalfLifeDays: Object.freeze([
    'features/brain/fiezel-core-brain.js BASE_HALF_LIFE_DAYS',
    'features/brain/fiezel-brain-config.js DEFAULTS.memory.baseHalfLifeDays',
    'features/brain/fiezel-item-pool.js PARAM_VERSION',
    'workers/api/evidence/item-pool-core.js PARAM_VERSION + PARAM_EPOCH_DAY'
  ])
});

export default { TUNE_SCHEMA, CURRENT, BOUNDS, GATE, GRID, splitFolds, cvTuneLink, fitProbeMemory, propose, tune, renderReport, CODE_SITES };
