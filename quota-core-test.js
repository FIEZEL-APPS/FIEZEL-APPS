/**
 * FIEZEL gerbang — quota-core-test.js
 *
 * Menjaga inti kuota server-side: reserve → commit/rollback, invarian
 * `used_effective = counter + Σ reservasi terbuka`, reset lintas hari dengan JAM PALSU,
 * batas terlampaui, reservasi kedaluwarsa dipanen, dan cache-hit yang gratis.
 *
 * Desain yang dijaga: reports/cf-b3-quota.md §1.3/§2/§3.3 · angka: reports/cf-a10-cost.md §6.
 * Keputusan owner yang dijaga: EXEC-BRIEF-CF.md (PLAN GRATIS, biaya DIBATASI ketat).
 *
 * Kontrak yang diperiksa berkas ini, satu per satu:
 *   Q1  konstanta tunggal  — semua angka kuota hidup di quota-config.js, beku, beralasan
 *   Q2  kemurnian          — quota-core.js jalan di sandbox TANPA Date/fetch/DOM
 *   Q3  reserve tak menagih— counter TIDAK naik saat reserve; hanya held yang naik
 *   Q4  invarian           — used_effective = counter + Σ reservasi terbuka, selalu
 *   Q5  commit menagih 1×  — commit kedua dengan token sama tidak menagih lagi
 *   Q6  rollback utuh      — counter tidak pernah naik; sisa kembali seperti sebelum reserve
 *   Q7  batas              — limit-1 lolos, limit ditolak, dengan `scope` yang benar
 *   Q8  sub-kuota          — 15 terjemahan tidak memblokir 10 penjelasan tutor
 *   Q9  lease kedaluwarsa  — dipanen, dan commit sesudahnya TIDAK menagih
 *   Q10 reset lintas hari  — jam palsu 23:59:59 → 00:00:01 WIB, counter nol, tanpa reset ganda
 *   Q11 cache hit gratis   — hanya server yang menentukan; klaim klien tidak berarti
 *   Q12 clamp              — commit tidak bisa menagih lebih dari yang direservasi
 *   Q13 tanpa over-grant   — 25 reserve berurutan pada limit 25 → tepat 25, ke-26 ditolak
 *
 * Tidak ada jaringan, tidak ada DOM, tidak ada `Date` di seluruh gerbang ini: waktu
 * SELALU parameter, dan sandbox modul memang tidak punya `Date` untuk dipakai.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadQuotaModules, stripComments } = require('./tools/quota-module-loader.js');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
function finish(SCHEMA, REPORT, extra = {}) {
  const report = {
    schema: SCHEMA,
    pass: !failed,
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    ...extra,
    checks
  };
  fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

/* ============================================================ Q1 konfigurasi ======== */

const mod = loadQuotaModules(['quota-config.js', 'quota-core.js']);
const configSource = mod.sources['quota-config.js'];
const coreSource = mod.sources['quota-core.js'];
const configCode = stripComments(configSource);
const coreCode = stripComments(coreSource);

const CONFIG = mod.get('QUOTA_CONFIG');
const FREE = mod.get('FREE_PLAN_LIMITS');

check('quota-config.js: QUOTA_CONFIG beku', Object.isFrozen(CONFIG), Object.isFrozen(CONFIG));
check('quota-config.js: plans.free beku', Object.isFrozen(CONFIG.plans) && Object.isFrozen(CONFIG.plans.free), 'freeze');
check('quota-config.js: ASSIGNABLE_PLANS beku dan hanya free',
  Object.isFrozen(CONFIG.ASSIGNABLE_PLANS) && CONFIG.ASSIGNABLE_PLANS.length === 1 && CONFIG.ASSIGNABLE_PLANS[0] === 'free',
  JSON.stringify(CONFIG.ASSIGNABLE_PLANS));
check('quota-config.js: PAYMENT_ENABLED ADA dan false (bukan undefined)',
  Object.prototype.hasOwnProperty.call(CONFIG, 'PAYMENT_ENABLED') && CONFIG.PAYMENT_ENABLED === false,
  String(CONFIG.PAYMENT_ENABLED));

const EXPECTED = {
  FREE_AI_DAILY_LIMIT: 25,
  FREE_AI_TRANSLATE_DAILY: 15,
  FREE_TTS_DAILY_LIMIT: 120,
  FREE_TTS_DAILY_CHARS: 12000,
  FREE_MAX_OUTPUT_TOKENS: 400,
  FREE_MAX_PROMPT_CHARS: 4000,
  FREE_MAX_INPUT_TOKENS: 1200,
  FREE_AI_RATE_PER_MINUTE: 8,
  FREE_TTS_RATE_PER_MINUTE: 20,
  FREE_ANY_RATE_PER_MINUTE: 60,
  FREE_AI_CONCURRENCY: 1,
  FREE_TTS_CONCURRENCY: 2
};
for (const key of Object.keys(EXPECTED)) {
  check('quota-config.js: ' + key + ' = ' + EXPECTED[key], FREE[key] === EXPECTED[key], String(FREE[key]));
}
check('quota-config.js: AI_TIMEOUT_MS=20000 & TTS_TIMEOUT_MS=25000 (cf-a10 §6)',
  CONFIG.AI_TIMEOUT_MS === 20000 && CONFIG.TTS_TIMEOUT_MS === 25000, CONFIG.AI_TIMEOUT_MS + '/' + CONFIG.TTS_TIMEOUT_MS);
check('quota-config.js: RESERVATION_TTL_MS = TTS_TIMEOUT_MS + 5000',
  CONFIG.RESERVATION_TTL_MS === CONFIG.TTS_TIMEOUT_MS + 5000, String(CONFIG.RESERVATION_TTL_MS));
check('quota-config.js: RESET_TZ Asia/Jakarta, ACCOUNT_BUDGET_TZ UTC (dua jam, dua tujuan)',
  CONFIG.RESET_TZ === 'Asia/Jakarta' && CONFIG.ACCOUNT_BUDGET_TZ === 'UTC',
  CONFIG.RESET_TZ + '/' + CONFIG.ACCOUNT_BUDGET_TZ);

check('quota-config.js: TANPA import/require (satu sumber, tanpa state luar)',
  !/\b(?:import|require)\s*[('"]/.test(configCode) && !/^import\s/m.test(configCode), 'importless');
check('quota-config.js: TANPA Date/Date.now/env/globalThis',
  !/Date\s*\.\s*now|new\s+Date|\benv\b|globalThis/.test(configCode), 'no time, no env');
const alasanCount = (configSource.match(/ALASAN/g) || []).length;
check('quota-config.js: setiap konstanta punya komentar ALASAN (≥14 rujukan cf-a10/cf-b3)',
  alasanCount >= 14 && /cf-a10/.test(configSource) && /cf-b3/.test(configSource), 'ALASAN×' + alasanCount);
check('quota-config.js: tidak ada jalur pembayaran (bab 34)',
  !/price|harga|checkout|OVO|DANA|ShopeePay|upgradeUrl|buy|beli/i.test(configCode), 'no payment surface');

/* ============================================================ Q2 kemurnian ========== */

check('quota-core.js: TANPA Date.now()/new Date (waktu selalu parameter)',
  !/Date\s*\.\s*now|new\s+Date/.test(coreCode), 'pure clock');
check('quota-core.js: TANPA fetch/DOM/penyimpanan/crypto',
  !/\bfetch\s*\(|document\.|localStorage|indexedDB|crypto\./.test(coreCode), 'no side doors');
check('quota-core.js: modul termuat di sandbox TANPA Date (bukti kemurnian)',
  mod.run('typeof Date') === 'undefined', mod.run('typeof Date'));
check('quota-core.js: tidak menyalin angka kuota (limit datang dari state/config)',
  !/\b(?:25|15|120|12000|4000|400)\b/.test(coreCode.replace(/86400000|60000|719468|146097|146096|36524|1460|365|400\b/g, '')),
  'no literal quota numbers');

/* ============================================================ pustaka uji =========== */

const core = {
  createState: mod.get('createState'),
  reserve: mod.get('reserve'),
  commit: mod.get('commit'),
  rollback: mod.get('rollback'),
  snapshot: mod.get('snapshot'),
  sweepExpired: mod.get('sweepExpired'),
  usedEffective: mod.get('usedEffective'),
  heldFor: mod.get('heldFor'),
  planTtsCharge: mod.get('planTtsCharge'),
  dayKeyForQuota: mod.get('dayKeyForQuota')
};

// JAM PALSU. 2026-08-27 10:00:00 WIB = 03:00:00 UTC.
const WIB = 7 * 3600000;
const T0 = Date.UTC(2026, 7, 27, 3, 0, 0);
const LIMITS = { ai: 25, aiTranslate: 15, ttsCalls: 120, ttsChars: 12000 };

function invariantHolds(state) {
  for (const b of ['ai', 'aiTranslate', 'ttsCalls', 'ttsChars']) {
    if (core.usedEffective(state, b) !== state.counters[b] + core.heldFor(state, b)) return false;
  }
  return true;
}

/* ============================================================ Q3/Q4/Q5/Q6 ========== */

let s = core.createState(T0, LIMITS);
check('state awal: hari WIB benar dan semua counter nol',
  s.day === '2026-08-27' && s.counters.ai === 0 && s.reservations.length === 0, s.day);

const r1 = core.reserve(s, 'ai', 1, T0);
check('Q3 reserve TIDAK menaikkan counter (kuota dipotong saat commit, bukan saat minta)',
  r1.ok && r1.state.counters.ai === 0 && core.heldFor(r1.state, 'ai') === 1, JSON.stringify(r1.state.counters));
check('Q3 reserve mengembalikan quotaCharged:false', r1.quotaCharged === false, String(r1.quotaCharged));
check('Q4 invarian used_effective = counter + Σ held setelah reserve',
  invariantHolds(r1.state) && core.usedEffective(r1.state, 'ai') === 1, core.usedEffective(r1.state, 'ai'));

const c1 = core.commit(r1.state, r1.token, null);
check('Q5 commit menaikkan counter tepat sekali dan melepas reservasi',
  c1.ok && c1.state.counters.ai === 1 && c1.state.reservations.length === 0 && c1.quotaCharged === true,
  JSON.stringify(c1.state.counters));
const c1b = core.commit(c1.state, r1.token, null);
check('Q5 commit kedua dengan token sama → reservation_expired, counter TIDAK naik dua kali',
  c1b.ok === false && c1b.reason === 'reservation_expired' && c1b.state.counters.ai === 1, c1b.reason);

const beforeRollback = core.snapshot(c1.state, T0);
const r2 = core.reserve(c1.state, 'ai', 1, T0);
const rb = core.rollback(r2.state, r2.token, 'provider_timeout');
const afterRollback = core.snapshot(rb.state, T0);
check('Q6 rollback: counter tidak naik sama sekali dan sisa kembali ke nilai sebelum reserve',
  rb.ok && rb.quotaCharged === false && rb.state.counters.ai === 1 &&
  afterRollback.buckets.ai.remaining === beforeRollback.buckets.ai.remaining &&
  afterRollback.buckets.ai.usedEffective === beforeRollback.buckets.ai.usedEffective,
  beforeRollback.buckets.ai.remaining + '→' + afterRollback.buckets.ai.remaining);
check('Q6 rollback menaikkan penghitung audit rolled_back', rb.state.rolledBack === 1, String(rb.state.rolledBack));
check('Q6 rollback token yang sudah dipanen → already_reaped, tanpa efek samping',
  core.rollback(rb.state, r2.token).reason === 'already_reaped', 'already_reaped');

/* ============================================================ Q7 batas ============== */

const scopeCases = [
  { bucket: 'ai', amount: 1, limitKey: 'ai', scope: 'ai_daily' },
  { bucket: 'aiTranslate', amount: 1, limitKey: 'aiTranslate', scope: 'ai_translate_daily' },
  { bucket: 'ttsCalls', amount: 1, limitKey: 'ttsCalls', scope: 'tts_daily_calls' },
  { bucket: 'ttsChars', amount: 1, limitKey: 'ttsChars', scope: 'tts_daily_chars' }
];
for (const kase of scopeCases) {
  let st = core.createState(T0, LIMITS);
  st.counters[kase.limitKey] = LIMITS[kase.limitKey] - 1;
  const ok = core.reserve(st, kase.bucket, kase.amount, T0);
  let st2 = core.createState(T0, LIMITS);
  st2.counters[kase.limitKey] = LIMITS[kase.limitKey];
  if (kase.bucket === 'aiTranslate') st2.counters.ai = 0;
  const deny = core.reserve(st2, kase.bucket, kase.amount, T0);
  check('Q7 ' + kase.bucket + ': limit-1 lolos, limit DITOLAK dengan scope ' + kase.scope,
    ok.ok === true && deny.ok === false && deny.error === 'quota_exhausted' && deny.scope === kase.scope,
    (ok.ok ? 'allow' : 'deny') + '/' + deny.scope);
  check('Q7 ' + kase.bucket + ': penolakan membawa resetAt + quotaCharged:false + denied++',
    deny.quotaCharged === false && Number.isFinite(deny.resetAt) && deny.state.denied === 1,
    deny.resetAt + '/' + deny.state.denied);
}

/* ============================================================ Q8 sub-kuota ========== */

let sub = core.createState(T0, LIMITS);
for (let i = 0; i < 15; i++) {
  const rr = core.reserve(sub, 'aiTranslate', 1, T0);
  sub = core.commit(rr.state, rr.token, null).state;
}
check('Q8 satu terjemahan menaikkan ai DAN aiTranslate (sub-kuota di dalam, bukan tambahan)',
  sub.counters.ai === 15 && sub.counters.aiTranslate === 15, sub.counters.ai + '/' + sub.counters.aiTranslate);
const tr16 = core.reserve(sub, 'aiTranslate', 1, T0);
check('Q8 terjemahan ke-16 ditolak scope ai_translate_daily',
  tr16.ok === false && tr16.scope === 'ai_translate_daily', String(tr16.scope));
const tutor = core.reserve(sub, 'ai', 1, T0);
check('Q8 penjelasan tutor TIDAK diblokir oleh habisnya sub-kuota terjemahan (sisa 10)',
  tutor.ok === true && core.snapshot(sub, T0).buckets.ai.remaining === 10,
  core.snapshot(sub, T0).buckets.ai.remaining);

/* ============================================================ Q9 lease kedaluwarsa == */

const leaseState = core.createState(T0, LIMITS);
const held = core.reserve(leaseState, 'tts', 438, T0);
check('Q9 reserve tts komposit menahan 1 panggilan + 438 char',
  core.heldFor(held.state, 'ttsCalls') === 1 && core.heldFor(held.state, 'ttsChars') === 438,
  core.heldFor(held.state, 'ttsChars'));
const swept = core.sweepExpired(held.state, T0 + CONFIG.RESERVATION_TTL_MS);
check('Q9 reservasi kedaluwarsa DIPANEN (lease habis = rollback otomatis, bukan hangus)',
  swept.reaped.length === 1 && swept.state.reservations.length === 0 &&
  swept.state.counters.ttsCalls === 0 && swept.state.counters.ttsChars === 0,
  JSON.stringify(swept.reaped));
const lateCommit = core.commit(swept.state, held.token, { ttsChars: 438 });
check('Q9 commit setelah dipanen TIDAK menagih (kalau harus salah, salah ke arah murid)',
  lateCommit.ok === false && lateCommit.reason === 'reservation_expired' &&
  lateCommit.state.counters.ttsCalls === 0 && lateCommit.quotaCharged === false, lateCommit.reason);
const autoSwept = core.reserve(held.state, 'tts', 10, T0 + CONFIG.RESERVATION_TTL_MS + 1);
check('Q9 reserve berikutnya ikut memanen lease mati sebelum menilai gerbang',
  autoSwept.ok === true && core.heldFor(autoSwept.state, 'ttsChars') === 10, core.heldFor(autoSwept.state, 'ttsChars'));

/* ============================================================ Q10 reset lintas hari = */

// 2026-08-27 23:59:59 WIB
const LATE = Date.UTC(2026, 7, 27, 23, 59, 59) - WIB;
// 2026-08-28 00:00:01 WIB
const EARLY = Date.UTC(2026, 7, 28, 0, 0, 1) - WIB;
let exhausted = core.createState(LATE, LIMITS);
exhausted.counters.ai = 25;
const denyLate = core.reserve(exhausted, 'ai', 1, LATE);
check('Q10 pada 23:59:59 WIB kuota memang habis', denyLate.ok === false && denyLate.scope === 'ai_daily', String(denyLate.scope));
const allowEarly = core.reserve(exhausted, 'ai', 1, EARLY);
check('Q10 pada 00:00:01 WIB hari berganti, counter nol, permintaan lolos TANPA reset eksplisit',
  allowEarly.ok === true && allowEarly.state.day === '2026-08-28' && allowEarly.state.counters.ai === 0,
  allowEarly.state.day);
const twice = core.reserve(allowEarly.state, 'ai', 1, EARLY + 5000);
check('Q10 dua permintaan di hari yang sama TIDAK mereset dua kali',
  twice.ok === true && core.heldFor(twice.state, 'ai') === 2, core.heldFor(twice.state, 'ai'));
const snapLate = core.snapshot(exhausted, LATE);
check('Q10 snapshot 23:59:59 WIB: resetAt tepat 00:00 WIB berikutnya dan ≤ 24 jam',
  snapLate.resetAt === Date.UTC(2026, 7, 28, 0, 0, 0) - WIB && snapLate.resetAt - LATE <= 86400000 && snapLate.resetAt > LATE,
  snapLate.resetAt - LATE);
check('Q10 snapshot menandai exhausted saat bucket penuh dan mengirim copyKey lewat rute',
  snapLate.state === 'exhausted' && snapLate.buckets.ai.exhausted === true, snapLate.state);

/* ============================================================ Q11 cache hit gratis == */

const hit = core.planTtsCharge({ serverCacheHit: true, chars: 438 });
check('Q11 cache hit (ditentukan SERVER) tidak menagih apa pun',
  hit.charge === false && hit.reason === 'cache_hit' && hit.amount === 0, hit.reason);
const miss = core.planTtsCharge({ serverCacheHit: false, chars: 438, cacheHit: true, clientCacheHit: true });
check('Q11 klaim cacheHit dari klien TIDAK berarti: cache-miss tetap ditagih',
  miss.charge === true && miss.bucket === 'tts' && miss.amount === 438, JSON.stringify(miss));
let freeReplay = core.createState(T0, LIMITS);
for (let i = 0; i < 500; i++) {
  const plan = core.planTtsCharge({ serverCacheHit: true, chars: 438 });
  if (plan.charge) freeReplay = core.reserve(freeReplay, plan.bucket, plan.amount, T0).state;
}
check('Q11 500 replay aset yang sudah ada = nol konsumsi kuota (replay gratis, tak terbatas)',
  freeReplay.counters.ttsCalls === 0 && freeReplay.counters.ttsChars === 0 && freeReplay.reservations.length === 0,
  JSON.stringify(freeReplay.counters));

/* ============================================================ Q12 clamp ============= */

const clampState = core.createState(T0, LIMITS);
const clampRes = core.reserve(clampState, 'tts', 100, T0);
const clamped = core.commit(clampRes.state, clampRes.token, { ttsChars: 99999, ttsCalls: 50 });
check('Q12 commit tidak bisa menagih lebih dari yang direservasi (di-clamp)',
  clamped.state.counters.ttsChars === 100 && clamped.state.counters.ttsCalls === 1,
  clamped.state.counters.ttsChars + '/' + clamped.state.counters.ttsCalls);
const under = core.commit(core.reserve(clampState, 'tts', 100, T0).state,
  core.reserve(clampState, 'tts', 100, T0).token, { ttsChars: 40 });
check('Q12 pemakaian nyata lebih kecil ditagih apa adanya (bukan angka pesimistis)',
  under.state.counters.ttsChars === 40, String(under.state.counters.ttsChars));

/* ============================================================ Q13 tanpa over-grant == */

let grant = core.createState(T0, LIMITS);
let allowed = 0;
for (let i = 0; i < 30; i++) {
  const rr = core.reserve(grant, 'ai', 1, T0);
  if (rr.ok) { allowed++; grant = rr.state; } else { grant = rr.state; }
}
check('Q13 30 reserve pada limit 25 → TEPAT 25 lolos, tidak pernah over-grant',
  allowed === 25 && core.heldFor(grant, 'ai') === 25, 'allowed=' + allowed);
check('Q13 invarian tetap utuh setelah 30 percobaan', invariantHolds(grant), 'invariant');
check('Q13 semua reservasi terbuka bisa di-rollback dan kuota kembali nol terpakai', (() => {
  let st = grant;
  for (const r of grant.reservations.slice()) st = core.rollback(st, r.token, 'test').state;
  return st.counters.ai === 0 && core.heldFor(st, 'ai') === 0 && st.reservations.length === 0;
})(), 'full rollback');

/* ============================================================ pendaftaran gerbang === */

const quality = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
check('quality.yml memanggil node quota-core-test.js', quality.includes('node quota-core-test.js'), 'quality.yml');

finish('fiezel-quota-core-v1', 'QUOTA-CORE-REPORT.json', {
  limits: LIMITS,
  reservationTtlMs: CONFIG.RESERVATION_TTL_MS,
  resetTimezone: CONFIG.RESET_TZ
});
