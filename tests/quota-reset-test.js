/**
 * FIEZEL gerbang — tests/quota-reset-test.js
 *
 * Satu pertanyaan: **kapan hari kuota berganti?** Jawaban yang dijaga berkas ini:
 * pukul 00:00 **Asia/Jakarta (WIB)** untuk kuota murid — BUKAN UTC, dan BUKAN zona yang
 * dikirim klien. Desain: reports/cf-b3-quota.md §3.2.
 *
 * ALASAN keputusannya, yang justru diuji di sini:
 *   - `preferences.timeZone` hidup di localStorage (app.js:153) dan bisa ditulis satu baris
 *     dari devtools. Kalau batas hari mengikutinya, mengganti tz = mereset kuota sesuka
 *     hati — lubang manipulasi termurah di seluruh sistem.
 *   - UTC ditolak bukan karena salah teknis: 00:00 UTC = **07:00 WIB**, tepat di jam
 *     belajar pagi. Reset di tengah sesi membuat naskah "AI balik besok" bohong 2× sehari.
 *   - Indonesia tanpa DST ⇒ offset tetap +07:00 tidak pernah menghasilkan hari 23/25 jam.
 *
 * Satu pengecualian yang jujur dan ikut dijaga: anggaran neuron **tingkat akun** WAJIB
 * memakai hari **UTC**, karena Cloudflare mereset jatah gratisnya "daily at 00:00 UTC"
 * (cf-a10 §2). Dua jam, dua tujuan — dan gerbang ini memastikan keduanya tidak tertukar.
 *
 * R1  batas hari WIB       — 23:59:59 WIB dan 00:00:01 WIB adalah dua hari berbeda
 * R2  00:00 UTC bukan reset— 07:00 WIB tidak mereset kuota murid
 * R3  akun memang UTC      — hari anggaran akun BERGANTI di 00:00 UTC
 * R4  tz klien tak berarti — zona apa pun dari klien menghasilkan hari yang sama
 * R5  resetAt              — selalu 00:00 WIB berikutnya, > now, ≤ now+86.400.000
 * R6  lazy, tanpak ganda   — dua permintaan sehari tidak mereset dua kali; tanpa penjadwal
 * R7  tanpa DST            — 400 hari berurutan berjarak tepat 86.400.000 ms
 * R8  tanpa Date.now()     — modul keputusan tidak punya jam sendiri
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs = require('fs');
const path = require('path');
const { loadQuotaModules, stripComments } = require('../tools/quota-module-loader.js');

const root = __fzRoot;
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

const mod = loadQuotaModules(['quota-config.js', 'quota-core.js']);
const CONFIG = mod.get('QUOTA_CONFIG');
const dayKeyFor = mod.get('dayKeyFor');
const dayKeyForQuota = mod.get('dayKeyForQuota');
const dayKeyForAccountBudget = mod.get('dayKeyForAccountBudget');
const resetAtForQuota = mod.get('resetAtForQuota');
const createState = mod.get('createState');
const reserve = mod.get('reserve');
const commit = mod.get('commit');
const snapshot = mod.get('snapshot');
const rolloverIfNeeded = mod.get('rolloverIfNeeded');

const WIB = 7 * 3600000;
const LIMITS = { ai: 25, aiTranslate: 15, ttsCalls: 120, ttsChars: 12000 };
const wib = (y, m, d, hh, mm, ss) => Date.UTC(y, m, d, hh, mm, ss) - WIB;   // jam palsu WIB → epoch ms

/* ============================================================ R1 batas hari ========= */

const late = wib(2026, 7, 27, 23, 59, 59);
const early = wib(2026, 7, 28, 0, 0, 1);
check('R1 23:59:59 WIB = 2026-08-27', dayKeyForQuota(late) === '2026-08-27', dayKeyForQuota(late));
check('R1 00:00:01 WIB = 2026-08-28 (hari BERGANTI)', dayKeyForQuota(early) === '2026-08-28', dayKeyForQuota(early));
check('R1 pergantian tepat pada 17:00:00 UTC (= 00:00 WIB), bukan sedetik sebelumnya',
  dayKeyForQuota(Date.UTC(2026, 7, 27, 16, 59, 59, 999)) === '2026-08-27' &&
  dayKeyForQuota(Date.UTC(2026, 7, 27, 17, 0, 0, 0)) === '2026-08-28',
  dayKeyForQuota(Date.UTC(2026, 7, 27, 17, 0, 0, 0)));

// Reset LINTAS HARI dengan jam palsu, dari state yang benar-benar habis.
let st = createState(late, LIMITS);
st.counters.ai = 25;
st.counters.ttsCalls = 120;
st.counters.ttsChars = 12000;
const denyLate = reserve(st, 'ai', 1, late);
check('R1 kuota habis pada 23:59:59 WIB memang ditolak', denyLate.ok === false && denyLate.scope === 'ai_daily', String(denyLate.scope));
const allowEarly = reserve(st, 'ai', 1, early);
check('R1 pada 00:00:01 WIB semua bucket kembali nol dan permintaan lolos (reset LAZY)',
  allowEarly.ok === true && allowEarly.state.counters.ai === 0 &&
  allowEarly.state.counters.ttsCalls === 0 && allowEarly.state.counters.ttsChars === 0,
  JSON.stringify(allowEarly.state.counters));

/* ============================================================ R2/R3 dua jam ========= */

const midnightUtc = Date.UTC(2026, 7, 28, 0, 0, 0);            // = 07:00 WIB
const beforeUtcMidnight = Date.UTC(2026, 7, 27, 23, 59, 59);   // = 06:59:59 WIB
check('R2 00:00 UTC (=07:00 WIB) TIDAK mengganti hari kuota murid',
  dayKeyForQuota(beforeUtcMidnight) === dayKeyForQuota(midnightUtc) && dayKeyForQuota(midnightUtc) === '2026-08-28',
  dayKeyForQuota(beforeUtcMidnight) + '→' + dayKeyForQuota(midnightUtc));

let mid = createState(beforeUtcMidnight, LIMITS);
mid.counters.ai = 25;
const denyAcrossUtc = reserve(mid, 'ai', 1, midnightUtc);
check('R2 kuota murid TIDAK pulih saat 00:00 UTC (jam belajar pagi tidak diganggu reset)',
  denyAcrossUtc.ok === false && denyAcrossUtc.scope === 'ai_daily' && denyAcrossUtc.state.counters.ai === 25,
  String(denyAcrossUtc.state.counters.ai));
check('R3 hari ANGGARAN AKUN memang berganti di 00:00 UTC (dipaksa Cloudflare, cf-a10 §2)',
  dayKeyForAccountBudget(beforeUtcMidnight) === '2026-08-27' && dayKeyForAccountBudget(midnightUtc) === '2026-08-28',
  dayKeyForAccountBudget(beforeUtcMidnight) + '→' + dayKeyForAccountBudget(midnightUtc));
check('R3 dua jam berbeda pada waktu yang sama (bukti keduanya tidak tertukar)',
  dayKeyForQuota(midnightUtc) !== dayKeyForAccountBudget(beforeUtcMidnight) &&
  CONFIG.RESET_TZ === 'Asia/Jakarta' && CONFIG.ACCOUNT_BUDGET_TZ === 'UTC',
  CONFIG.RESET_TZ + ' vs ' + CONFIG.ACCOUNT_BUDGET_TZ);

/* ============================================================ R4 tz klien =========== */

const hostileZones = ['Etc/GMT+12', 'Pacific/Kiritimati', 'America/Los_Angeles', 'UTC-12', '', null, undefined, 0, {}, 'Asia/Tokyo'];
let sameDay = true;
for (const tz of hostileZones) if (dayKeyFor(late, tz) !== '2026-08-27') sameDay = false;
check('R4 zona apa pun yang datang dari klien menghasilkan hari WIB yang sama',
  sameDay, 'zones=' + hostileZones.length);
check('R4 dayKeyForQuota() tidak MENERIMA parameter zona (tidak ada tombol untuk digeser)',
  dayKeyForQuota.length === 1, 'arity=' + dayKeyForQuota.length);
check('R4 hanya UTC dan Asia/Jakarta yang dikenal; sisanya jatuh ke RESET_TZ',
  dayKeyFor(midnightUtc, 'UTC') === '2026-08-28' && dayKeyFor(midnightUtc, 'Asia/Tokyo') === dayKeyForQuota(midnightUtc),
  dayKeyFor(midnightUtc, 'UTC'));
let tzSpoof = createState(late, LIMITS);
tzSpoof.counters.ai = 25;
// Klien menyetel tz ekstrem lalu meminta lagi pada detik yang sama: tidak ada reset.
const spoofed = reserve(Object.assign({}, tzSpoof, { tz: 'Etc/GMT+12', timeZone: 'Etc/GMT+12' }), 'ai', 1, late);
check('R4 menyuntik tz ke dalam state pun tidak menambah satu pun reset',
  spoofed.ok === false && spoofed.scope === 'ai_daily', String(spoofed.scope));

/* ============================================================ R5 resetAt ============ */

check('R5 resetAt pada 23:59:59 WIB = 00:00:00 WIB berikutnya',
  resetAtForQuota(late) === wib(2026, 7, 28, 0, 0, 0), resetAtForQuota(late));
let resetOk = true;
for (let i = 0; i < 24 * 60; i++) {
  const t = wib(2026, 7, 27, 0, 0, 0) + i * 60000;
  const r = resetAtForQuota(t);
  if (!(r > t && r - t <= 86400000)) resetOk = false;
  if (dayKeyForQuota(r) === dayKeyForQuota(t)) resetOk = false;      // resetAt sudah hari berikutnya
  if (dayKeyForQuota(r - 1) !== dayKeyForQuota(t)) resetOk = false;  // dan 1 ms sebelumnya masih hari ini
}
check('R5 untuk 1.440 titik waktu dalam sehari: now < resetAt ≤ now+24 jam, dan tepat di batas hari',
  resetOk, '1440 titik');
const snapLate = snapshot(createState(late, LIMITS), late);
check('R5 snapshot mengirim resetAt + resetTimezone eksplisit (klien tidak menebak)',
  snapLate.resetAt === resetAtForQuota(late) && snapLate.resetTimezone === 'Asia/Jakarta' && snapLate.day === '2026-08-27',
  snapLate.resetTimezone);

/* ============================================================ R6 lazy =============== */

let lazy = createState(wib(2026, 7, 27, 8, 0, 0), LIMITS);
const a = reserve(lazy, 'ai', 1, wib(2026, 7, 27, 8, 0, 0));
const committedA = commit(a.state, a.token, null).state;
const b = reserve(committedA, 'ai', 1, wib(2026, 7, 27, 22, 0, 0));
check('R6 dua permintaan di hari WIB yang sama TIDAK mereset dua kali (counter bertahan)',
  b.ok === true && b.state.counters.ai === 1 && b.state.day === '2026-08-27', b.state.counters.ai);
check('R6 rolloverIfNeeded mengembalikan state YANG SAMA bila hari belum berganti (nol tulis)',
  rolloverIfNeeded(committedA, wib(2026, 7, 27, 23, 59, 59)) === committedA, 'identity');
check('R6 rolloverIfNeeded baru membuat hari baru saat memang berganti',
  rolloverIfNeeded(committedA, early).day === '2026-08-28', rolloverIfNeeded(committedA, early).day);
const coreCode = stripComments(mod.sources['quota-core.js']);
check('R6 tidak ada penjadwal/alarm di jalur reset (lazy by day-string, hemat 1 tulis/pengguna/hari)',
  !/setAlarm|setTimeout|setInterval|scheduled/.test(coreCode), 'no scheduler');

/* ============================================================ R7 tanpa DST ========== */

let dstOk = true;
let prev = null;
for (let i = 0; i < 400; i++) {
  const t = wib(2026, 0, 1, 12, 0, 0) + i * 86400000;
  const r = resetAtForQuota(t);
  if (prev !== null && r - prev !== 86400000) dstOk = false;
  prev = r;
}
check('R7 400 hari berurutan: jarak antar reset TEPAT 86.400.000 ms (Indonesia tanpa DST)',
  dstOk, '400 hari');
const knownDays = [
  [Date.UTC(2026, 0, 1, 0, 0, 0), '2026-01-01'],     // 07:00 WIB 1 Jan
  [Date.UTC(2025, 11, 31, 17, 0, 0), '2026-01-01'],  // tepat 00:00 WIB tahun baru
  [Date.UTC(2025, 11, 31, 16, 59, 59), '2025-12-31'],
  [Date.UTC(2028, 1, 29, 5, 0, 0), '2028-02-29'],    // tahun kabisat
  [Date.UTC(2026, 11, 31, 17, 0, 0), '2027-01-01']
];
let civilOk = true;
for (const [t, expected] of knownDays) if (dayKeyForQuota(t) !== expected) civilOk = false;
check('R7 aritmetika hari sipil benar tanpa objek Date (termasuk kabisat & lintas tahun)',
  civilOk, knownDays.map(([t]) => dayKeyForQuota(t)).join(','));

/* ============================================================ R8 tanpa jam sendiri == */

check('R8 quota-core.js tidak memanggil Date.now()/new Date sama sekali',
  !/Date\s*\.\s*now|new\s+Date/.test(coreCode), 'no hidden clock');
check('R8 modul termuat di sandbox yang bahkan TIDAK punya Date',
  mod.run('typeof Date') === 'undefined', mod.run('typeof Date'));
const storeCode = stripComments(require('fs').readFileSync(
  path.join(root, 'workers', 'api', 'quota', 'quota-store-d1.js'), 'utf8'));
check('R8 quota-store-d1.js juga menerima `now` sebagai parameter, bukan membaca jam',
  !/Date\s*\.\s*now|new\s+Date/.test(storeCode), 'store pure clock');

const quality = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
check('quality.yml memanggil node tests/quota-reset-test.js', quality.includes('node tests/quota-reset-test.js'), 'quality.yml');

finish('fiezel-quota-reset-v1', 'QUOTA-RESET-REPORT.json', {
  resetTimezone: CONFIG.RESET_TZ,
  accountBudgetTimezone: CONFIG.ACCOUNT_BUDGET_TZ,
  wibOffsetMinutes: CONFIG.WIB_OFFSET_MINUTES
});
