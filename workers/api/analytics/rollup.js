/**
 * FIEZEL E4 — rollup harian analytics (cron).
 *
 * Cron: 00:05 WIB (= 17:05 UTC hari sebelumnya). Satu jalan, urutannya penting:
 *   1. hitung DAU hari itu dari `dau_dedup`  -> metrics_daily('dau')
 *   2. hitung batas WAU/MAU dari metrik harian (lihat catatan kejujuran di bawah)
 *   2b. pagar kewarasan: 0 token + `usage_daily` terisi -> `collection_ok=0`
 *   3. HAPUS `dau_dedup` hari itu (dan sisa hari lama, jaring pengaman)
 *   4. rotasi pepper bila jatuh tempo (pepper dua putaran lalu hilang permanen)
 *   5. purge retensi: usage_daily > 90 hari, retention_daily > 400 hari
 *
 * IDEMPOTEN. Cron Cloudflare bisa berjalan dua kali; rollup ini memakai tulis
 * nilai (bukan increment) dan `DELETE` yang aman diulang, jadi menjalankannya
 * lima kali menghasilkan angka yang sama dengan sekali.
 *   - `dau` ditulis MONOTON (`setMetricAtLeast`): sumbernya `dau_dedup` sengaja
 *     dihapus, jadi jalan kedua akan menghitung 0. Menulisnya apa adanya akan
 *     menimpa DAU 312 menjadi 0. Monoton juga benar untuk event yang datang
 *     terlambat: angka boleh bertambah, tidak boleh mundur.
 *   - `wau_*`/`mau_*` diturunkan dari `dau` yang sudah stabil, jadi hasilnya
 *     sama di setiap jalan.
 *   - `collection_ok` (A3) dihitung dari nilai `dau` yang SUDAH TERSIMPAN, bukan
 *     dari hitungan jalan ini, supaya jalan kedua (yang selalu menghitung 0
 *     karena tokennya sudah dihapus) tidak menuduh pengumpulan rusak.
 * Satu-satunya urutan yang tidak boleh dibalik: DAU dihitung SEBELUM purge.
 *
 * ==========================================================================
 * KEJUJURAN WAU/MAU — jangan dihapus, jangan dipoles.
 * ==========================================================================
 * Token pengunjung dirotasi tiap 24 jam dan pepper lama dihapus. Itulah yang
 * membuat produk ini tidak bisa melacak orang lintas hari — dan konsekuensinya
 * jujur: SATU angka WAU/MAU yang ter-dedup lintas hari TIDAK BISA dihitung.
 * Yang bisa dihitung, dan itu yang ditulis:
 *   wau_lower = max(DAU harian 7 hari)   -> batas BAWAH (pasti minimal sebanyak ini)
 *   wau_upper = jumlah(DAU harian 7 hari)-> batas ATAS (perangkat yang datang
 *                                           beberapa hari terhitung berkali-kali)
 *   mau_lower / mau_upper -> idem untuk 30 hari
 * Angka sesungguhnya ada di antara keduanya. Untuk memperkirakan di mana,
 * pakai `retention_daily` (D1/D7/D30) yang memang dirancang lintas-hari secara
 * agregat. Menuliskan satu angka WAU tunggal seolah pasti = mengarang.
 */

import { rotatePepperDue, rotatePepper, newPepper } from './analytics-core.js';
import {
  countDauTokens, countUsageRows, setMetric, setMetricAtLeast, readMetricRange,
  purgeDauDedup, purgeDauDedupOlderThan, purgeUsageOlderThan, purgeRetentionOlderThan,
  purgeBatchDedupOlderThan,
  readPepperState, writePepperState
} from './analytics-store-d1.js';

export const RETENTION_DAYS = Object.freeze({
  USAGE_DAILY: 90,      // dimensi pemakaian: cukup untuk D30, tidak lebih
  RETENTION_DAILY: 400, // kohor: cukup untuk satu tahun penuh + margin
  DAU_DEDUP: 1,         // token harian: satu hari, itu saja
  BATCH_DEDUP: 2        // kunci idempotensi batch: hanya selama jendela retry (48 jam)
});

const DAY_MS = 86400000;

/* -------------------------------------------------------------------------- */
/* Pembantu tanggal (murni)                                                    */
/* -------------------------------------------------------------------------- */

export function dayKey(ms) {
  return new Date(Number(ms)).toISOString().slice(0, 10);
}

export function shiftDay(day, deltaDays) {
  const t = Date.parse(`${day}T00:00:00Z`);
  return dayKey(t + deltaDays * DAY_MS);
}

/** Daftar `n` hari yang berakhir di `day` (inklusif), urut naik. */
export function dayWindow(day, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDay(day, -i));
  return out;
}

/* -------------------------------------------------------------------------- */
/* Perhitungan murni (diuji langsung oleh tests/analytics-aggregate-test.js)         */
/* -------------------------------------------------------------------------- */

/**
 * DAU dari baris token: jumlah token UNIK pada hari itu.
 * Token sudah unik per (day, token) karena PRIMARY KEY, tapi fungsi ini tetap
 * men-dedup supaya benar juga saat dipanggil atas data batch mentah.
 */
export function computeDauFromTokens(rows, day) {
  const seen = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || r.day !== day || !r.token) continue;
    seen.add(r.token);
  }
  return seen.size;
}

/**
 * Batas WAU/MAU dari DAU harian.
 * @param {Array<{day:string,value:number}>} dauRows
 * @param {string} day hari terakhir jendela
 * @param {number} windowDays 7 untuk WAU, 30 untuk MAU
 * @returns {{lower:number, upper:number, days:number, coverage:number}}
 */
export function computeWauMauBounds(dauRows, day, windowDays) {
  const window = new Set(dayWindow(day, windowDays));
  const values = (Array.isArray(dauRows) ? dauRows : [])
    .filter(r => r && window.has(r.day))
    .map(r => Math.max(0, Math.trunc(Number(r.value) || 0)));
  const lower = values.length ? Math.max(...values) : 0;
  const upper = values.reduce((a, b) => a + b, 0);
  return { lower, upper, days: values.length, coverage: windowDays ? values.length / windowDays : 0 };
}

/**
 * Retensi kohor dari baris agregat.
 * @returns {Array<{cohort_day:string, day_index:number, count:number, rate:number|null}>}
 * `rate` = count / count(day_index=0) untuk kohor yang sama; null bila ukuran
 * kohor belum diketahui. Ukuran kohor (n=) WAJIB ikut ditampilkan di dashboard;
 * persentase tanpa n= adalah cara paling mudah menipu diri sendiri.
 */
export function computeRetentionRates(rows) {
  const sizes = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (r && Number(r.day_index) === 0) sizes.set(r.cohort_day, Math.trunc(Number(r.count) || 0));
  }
  return (Array.isArray(rows) ? rows : []).map(r => {
    const size = sizes.get(r.cohort_day) || 0;
    const count = Math.trunc(Number(r.count) || 0);
    return {
      cohort_day: r.cohort_day,
      day_index: Number(r.day_index),
      count,
      cohort_size: size,
      rate: size > 0 ? count / size : null
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Job cron                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * runDailyRollup(db, opts) -> ringkasan.
 *
 * @param {object} db binding D1 `fiezel-analytics` (BUKAN database kuota)
 * @param {{now?:number, day?:string, pepper?:string}} opts
 */
export async function runDailyRollup(db, opts = {}) {
  const now = Number(opts.now) || Date.now();
  // Default: hari yang baru saja selesai.
  const day = opts.day || dayKey(now - DAY_MS);
  const summary = {
    day, dau: 0, wau: null, mau: null, purged: [], pepperRotated: false,
    collectionOk: true, usageRows: 0, ranAt: now
  };

  // 1. DAU dari token harian — HARUS sebelum purge.
  const dau = await countDauTokens(db, day);
  summary.dau = dau;
  await setMetricAtLeast(db, day, 'dau', dau);

  // 2. Batas WAU/MAU dari metrik harian yang sudah tersimpan (dibaca SETELAH
  //    dau hari ini ditulis, supaya jendela 7/30 hari memuat hari ini juga).
  const from30 = shiftDay(day, -29);
  const dauRows = await readMetricRange(db, 'dau', from30, day);

  // 2b. PAGAR KEWARASAN (A3). Nol yang jujur dan nol yang menyesatkan terlihat
  //     sama di dashboard, dan hanya satu di antaranya berarti sistemnya rusak:
  //       - hari benar-benar sepi   -> 0 token DAN 0 baris `usage_daily`;
  //       - pengumpulan token rusak -> 0 token TAPI `usage_daily` hari itu terisi.
  //     Kasus kedua berarti event `day_active` tidak pernah sampai (klien tidak
  //     mengirim `visitor_token`, atau `applyAggregate` gagal separuh), dan
  //     menuliskan DAU=0 di sana adalah mengarang angka. Yang ditulis adalah
  //     penanda `collection_ok=0`; dashboard WAJIB menolak menampilkan DAU hari
  //     itu sebagai fakta.
  //
  //     Formulanya sengaja memakai nilai TERSIMPAN, bukan `dau` hasil hitung
  //     jalan ini. Alasannya idempotensi: pada jalan kedua `dau_dedup` sudah
  //     terhapus, jadi hitungan pasti 0 sementara `usage_daily` masih terisi.
  //     Formula naif akan membalik `collection_ok` 1 -> 0 hanya karena rollup
  //     dijalankan dua kali, dan pagar yang menuduh dirinya sendiri lebih buruk
  //     daripada tidak ada pagar.
  const usageRowsToday = await countUsageRows(db, day);
  const storedDau = Math.max(0, Math.trunc(Number(
    (dauRows.find((r) => r && r.day === day) || {}).value
  ) || 0));
  const collectionOk = !(dau === 0 && usageRowsToday > 0 && storedDau === 0);
  summary.collectionOk = collectionOk;
  summary.usageRows = usageRowsToday;
  await setMetric(db, day, 'collection_ok', collectionOk ? 1 : 0);

  const wau = computeWauMauBounds(dauRows, day, 7);
  const mau = computeWauMauBounds(dauRows, day, 30);
  summary.wau = wau;
  summary.mau = mau;
  await setMetric(db, day, 'wau_lower', wau.lower);
  await setMetric(db, day, 'wau_upper', wau.upper);
  await setMetric(db, day, 'mau_lower', mau.lower);
  await setMetric(db, day, 'mau_upper', mau.upper);
  // Penanda kejujuran: dashboard wajib membaca ini dan menampilkan rentang,
  // bukan satu angka. 1 = angka ini adalah rentang, bukan hitungan pasti.
  await setMetric(db, day, 'wau_mau_is_estimate', 1);

  // 3. HAPUS token harian. Tanpa langkah ini, kontrak privasi bohong.
  await purgeDauDedup(db, day);
  await purgeDauDedupOlderThan(db, day);
  summary.purged.push('dau_dedup');

  // 4. Rotasi pepper bila jatuh tempo.
  //
  // Sesudah inisialisasi malas (`ensurePepperState`, dipakai jalur
  // `GET /api/usage/pepper`), state di sini biasanya SUDAH ada dengan
  // `rotated_at` = awal jendela cron terakhir. Umurnya pada cron berikutnya
  // karena itu tepat 24 jam -> `rotatePepperDue` true -> rotasi terjadi tepat
  // waktu, tanpa hari yang terlewat dan tanpa rotasi tengah hari. Rollup TETAP
  // satu-satunya tempat rotasi terjadi; inisialisasi tidak pernah dilaporkan
  // sebagai `pepperRotated`.
  //
  // Kalau state masih benar-benar kosong saat cron jalan (mis. tidak ada satu
  // pun murid membuka aplikasi sebelum 00:05 WIB), jalur di bawah tetap membuat
  // pepper pertama. Pada kasus itu "membuat" dan "merotasi" jatuh di instan yang
  // sama (batas jendela), jadi pelaporannya tidak menyesatkan.
  const state = await readPepperState(db);
  if (rotatePepperDue(now, state && state.rotated_at)) {
    const next = rotatePepper(state, now, opts.pepper || newPepper());
    await writePepperState(db, next);
    summary.pepperRotated = true;
    // Setelah tulis ini, pepper dua putaran lalu tidak ada lagi di mana pun:
    // baris pepper_state hanya memuat `current` + satu `previous`. `writePepper`
    // menimpa KETIGA kolom sekaligus (`ON CONFLICT ... SET rotated_at, current,
    // previous`), jadi nilai lama tidak tertinggal di kolom mana pun dan tidak
    // ada tabel arsip pepper di skema. Ditegakkan `tests/cron-contract-test.js` (c)
    // dan `tests/analytics-privacy-test.js`.
  }

  // 5. Purge retensi.
  await purgeUsageOlderThan(db, shiftDay(day, -RETENTION_DAYS.USAGE_DAILY));
  summary.purged.push('usage_daily');
  await purgeRetentionOlderThan(db, shiftDay(day, -RETENTION_DAYS.RETENTION_DAILY));
  summary.purged.push('retention_daily');

  // 6. Purge kunci dedup batch yang jendela retry-nya (48 jam) sudah lewat.
  //    batch_id memang acak (bukan identitas), tapi janji "tidak disimpan
  //    lebih lama dari jendela retry" tetap ditepati di sini — pola yang sama
  //    dengan purge dau_dedup. Dibungkus try/catch karena tabel `batch_dedup`
  //    lahir di migrasi 0003: pada database yang belum menjalankan migrasi itu
  //    (atau tiruan D1 lama di gerbang), kegagalan purge dedup TIDAK boleh
  //    ikut mematikan rollup metrik — DAU yang gagal ditulis jauh lebih mahal
  //    daripada purge yang tertunda satu hari.
  try {
    await purgeBatchDedupOlderThan(db, shiftDay(day, -RETENTION_DAYS.BATCH_DEDUP));
    summary.purged.push('batch_dedup');
  } catch (err) {
    summary.batchDedupPurgeError = String((err && err.message) || err);
  }

  return summary;
}

/**
 * Pemasangan cron di `workers/api/index.js` (JANGAN diedit dari paket kerja ini;
 * instruksi ada di reports/exec-e4-analytics.md):
 *
 *   import { scheduledAnalytics } from './analytics/rollup.js';
 *   export default {
 *     fetch: app.fetch,
 *     scheduled: (event, env, ctx) => ctx.waitUntil(scheduledAnalytics(event, env, ctx))
 *   };
 *
 * wrangler.toml:  [triggers] crons = ["5 17 * * *"]   # 00:05 WIB
 */
export async function scheduledAnalytics(event, env, ctx) {
  if (String((env && env.ANALYTICS_ENABLED) || 'off') !== 'on') return { skipped: 'flag_off' };
  const db = (env && (env.ANALYTICS_DB || env.DB_ANALYTICS)) || null;
  if (!db) return { skipped: 'no_binding' };
  const now = (event && event.scheduledTime) || Date.now();
  return runDailyRollup(db, { now });
}

export default {
  runDailyRollup, scheduledAnalytics,
  computeDauFromTokens, computeWauMauBounds, computeRetentionRates,
  dayKey, shiftDay, dayWindow, RETENTION_DAYS
};
