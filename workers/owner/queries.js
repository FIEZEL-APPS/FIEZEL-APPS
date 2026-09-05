// FIEZEL — SQL dashboard owner. HANYA AGREGAT, dan HANYA atas skema yang BENAR-BENAR ADA.
//
// ============================================================================================
// OTORITAS BENTUK TABEL: BERKAS MIGRASI, BUKAN KOMENTAR DI BERKAS INI
// ============================================================================================
// Versi berkas ini sebelum paket D2 ditulis untuk `metrics_daily` bentuk LEBAR (30+ kolom:
// `visitors`, `dau`, `wau`, `tts_cache_hits`, …) plus tabel `retention_cohort` dan `cost_daily`.
// Tidak satu pun dari itu ada. Cacatnya tersembunyi karena tabelnya kosong: semua panel
// berbunyi "pengukuran tidak tersedia" dan itu terlihat sama dengan "belum ada data".
//
// Bentuk NYATA (workers/api/migrations/0001_quota.sql + 0002_analytics.sql, keduanya SUDAH
// jalan di produksi; `tests/analytics-privacy-test.js` mengunci database analytics pada TEPAT LIMA
// tabel di bawah dan larangan itu benar — makin banyak tabel makin banyak permukaan identitas):
//
//   metrics_daily(day TEXT, metric TEXT, value INTEGER)              PK (day, metric)
//   usage_daily(day TEXT, bucket TEXT, count INTEGER)                PK (day, bucket)
//   retention_daily(cohort_day TEXT, day_index INTEGER, count INT)   PK (cohort_day, day_index)
//   dau_dedup(day TEXT, token TEXT)                                  PK (day, token)   <- TERLARANG di sini
//   pepper_state(id, rotated_at, current, previous)                                    <- TERLARANG di sini
//
// Bentuk PANJANG, bukan lebar. Konsekuensi keras: setiap agregasi WAJIB menyaring
// `WHERE metric = ?` atau `metric IN (...)`. Tidak ada kolom `dau`; ada BARIS `metric='dau'`.
//
// ============================================================================================
// KONTRAK PRIVASI (EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL", otoritas)
// ============================================================================================
//   1. Dari lima tabel yang ada, berkas ini hanya boleh menyentuh TIGA yang murni agregat:
//      `metrics_daily`, `usage_daily`, `retention_daily`. `dau_dedup` (token per-perangkat) dan
//      `pepper_state` (bahan rahasia HMAC) DILARANG disebut di sini sama sekali. Dashboard
//      membaca DAU dari baris agregat yang sudah dibekukan rollup — ia tidak pernah menghitung
//      ulang dari token perangkat.
//      Catatan koreksi: gerbang lama melarang `usage_daily` karena `reports/cf-b5-analytics.md`
//      §2.1 memuat varian per-orang bertabel sama (kunci penunjuk akun + hari). Varian itu
//      SENGAJA TIDAK DIBUAT (0002_analytics.sql peringatan #2). Yang benar-benar ada PK-nya
//      (day, bucket) dan `bucket` berenum tertutup — nol identitas. Membacanya sah, dan
//      tanpanya angka error AI/TTS dan penolakan kuota tidak bisa dipecah sama sekali.
//   2. TIDAK ADA kolom identitas per-orang yang disebut di sini.
//   3. TIDAK ADA pernyataan tulis. Semua SELECT; ditegakkan penjaga di bawah + gerbang test.
//   4. TIDAK ADA tabel di luar lima yang diizinkan, dan khususnya TIDAK ADA usulan `cost_daily`.
//      Biaya per hari yang bisa diaudit MEMANG tidak terukur dari data yang kita simpan; itu
//      dinyatakan apa adanya di UNMEASURABLE di bawah, bukan ditutup dengan tabel baru.
//
// Semua rentang tanggal dan setiap nama metrik yang berubah-ubah masuk sebagai parameter
// terikat (?1, ?2, ?3). Daftar `IN (...)` disusun dari konstanta di berkas ini, bukan dari
// masukan permintaan.
//
// ============================================================================================
// INDEKS: apa yang dipakai, dan apa yang TIDAK diasumsikan
// ============================================================================================
// `0002_analytics.sql` sudah jalan di produksi dan membawa `idx_metrics_metric(metric, day)` —
// itulah indeks yang melayani setiap kueri `WHERE metric = ?` / `metric IN (...)` di bawah,
// serta `idx_retention_cohort(day_index, cohort_day)`. `usage_daily` dan sisa jalur `day`
// tertutup PRIMARY KEY masing-masing.
// `0004_indexes.sql` BELUM diterapkan di produksi, dan berkas itu untuk `fiezel-core` SAJA
// (headernya: "JANGAN dijalankan di fiezel-stats"). NOL kueri di berkas ini membutuhkannya.

'use strict';

/* ============================ Katalog metrik yang TERBUKTI DITULIS ========================= */
// Setiap nama di bawah dibuktikan ada penulisnya di jalur server. Berkas dan barisnya ditulis
// di sebelahnya, dan `tests/d1-schema-contract-test.js` MEMBACA berkas penulis itu lalu memerah kalau
// satu nama pun tidak ditemukan di sana. Nama metrik yang tidak pernah ditulis siapa pun =
// panel yang selamanya kosong, dan itu jenis kekosongan yang paling menyesatkan: ia terlihat
// persis seperti "belum ada murid".

// Penulis metrik: increment per event (analytics-core.js `aggregate()`), disimpan lewat
// `SQL.upsertMetric` di analytics-store-d1.js:35.
const METRIC_WRITER_EVENTS = 'workers/api/analytics/analytics-core.js';
// Penulis metrik: rollup harian (nilai, bukan increment) lewat `setMetric`/`setMetricAtLeast`.
const METRIC_WRITER_ROLLUP = 'workers/api/analytics/rollup.js';

// ALIRAN: boleh dijumlahkan lintas hari.
const FLOW_METRICS = Object.freeze({
  events_total: METRIC_WRITER_EVENTS + ':333',
  app_open: METRIC_WRITER_EVENTS + ':337',
  app_open_with_identity: METRIC_WRITER_EVENTS + ':339',
  day_active_reports: METRIC_WRITER_EVENTS + ':343',
  sessions: METRIC_WRITER_EVENTS + ':352',
  sessions_ended: METRIC_WRITER_EVENTS + ':358',
  sessions_completed: METRIC_WRITER_EVENTS + ':359',
  session_answers: METRIC_WRITER_EVENTS + ':360',
  lessons_started: METRIC_WRITER_EVENTS + ':365',
  lessons_completed: METRIC_WRITER_EVENTS + ':370',
  answers: METRIC_WRITER_EVENTS + ':375',
  answers_ok: METRIC_WRITER_EVENTS + ':376',
  new_users: METRIC_WRITER_EVENTS + ':388',
  ai_calls: METRIC_WRITER_EVENTS + ':393',
  ai_tokens_in: METRIC_WRITER_EVENTS + ':396',
  ai_success: METRIC_WRITER_EVENTS + ':400',
  ai_tokens_out: METRIC_WRITER_EVENTS + ':401',
  ai_failure: METRIC_WRITER_EVENTS + ':406',
  tts_calls: METRIC_WRITER_EVENTS + ':411',
  tts_success: METRIC_WRITER_EVENTS + ':416',
  tts_cache_hits: METRIC_WRITER_EVENTS + ':417',
  tts_cache_misses: METRIC_WRITER_EVENTS + ':418',
  tts_chars_rendered: METRIC_WRITER_EVENTS + ':420',
  tts_failure: METRIC_WRITER_EVENTS + ':424',
  quota_exhausted: METRIC_WRITER_EVENTS + ':429',
  breaker_trips: METRIC_WRITER_EVENTS + ':434',
  breaker_recoveries: METRIC_WRITER_EVENTS + ':439',
});

// KEADAAN HARIAN: nilai per hari yang TIDAK boleh dijumlahkan lintas hari. `dau` adalah stok
// harian; menjumlahkannya menghitung satu perangkat berkali-kali. `wau_*`/`mau_*` sengaja
// sepasang batas, bukan satu angka: token perangkat dirotasi tiap 24 jam dan pepper lama
// dihapus, jadi dedup lintas hari MUSTAHIL secara struktural (rollup.js baris 27-42).
const DAILY_STATE_METRICS = Object.freeze({
  dau: METRIC_WRITER_ROLLUP + ':159',
  collection_ok: METRIC_WRITER_ROLLUP + ':189',
  wau_lower: METRIC_WRITER_ROLLUP + ':195',
  wau_upper: METRIC_WRITER_ROLLUP + ':196',
  mau_lower: METRIC_WRITER_ROLLUP + ':197',
  mau_upper: METRIC_WRITER_ROLLUP + ':198',
  wau_mau_is_estimate: METRIC_WRITER_ROLLUP + ':201',
});

// Metrik yang digambar sebagai garis tren. `collection_ok` WAJIB ikut supaya hari yang gagal
// dikumpulkan digambar PUTUS, bukan diinterpolasi.
const SERIES_METRICS = Object.freeze([
  'dau', 'new_users', 'answers', 'ai_calls', 'tts_calls', 'collection_ok',
]);

// Bucket `usage_daily` yang dipakai. `bucket` berbentuk 'dimensi:nilai' berenum tertutup;
// daftar nilainya adalah ERR_CODES / QUOTA_KINDS di analytics-core.js.
const USAGE_BUCKETS = Object.freeze({
  'ai_err:429': METRIC_WRITER_EVENTS + ':407',
  'ai_err:timeout': METRIC_WRITER_EVENTS + ':407',
  'ai_err:4xx': METRIC_WRITER_EVENTS + ':407',
  'ai_err:5xx': METRIC_WRITER_EVENTS + ':407',
  'ai_err:other': METRIC_WRITER_EVENTS + ':407',
  'tts_err:429': METRIC_WRITER_EVENTS + ':425',
  'tts_err:timeout': METRIC_WRITER_EVENTS + ':425',
  'tts_err:4xx': METRIC_WRITER_EVENTS + ':425',
  'tts_err:5xx': METRIC_WRITER_EVENTS + ':425',
  'tts_err:other': METRIC_WRITER_EVENTS + ':425',
  'quota:ai': METRIC_WRITER_EVENTS + ':430',
  'quota:tts': METRIC_WRITER_EVENTS + ':430',
  'quota:translate': METRIC_WRITER_EVENTS + ':430',
  'quota:gem': METRIC_WRITER_EVENTS + ':430',
});

// Offset retensi yang dibaca. 0 WAJIB ikut: ia SATU-SATUNYA sumber ukuran kohor (n=), karena
// `retention_daily` tidak punya kolom `cohort_size` — itu diturunkan dari baris `day_index = 0`
// kohor yang sama (pola yang sama dipakai rollup.js computeRetentionRates()).
const RETENTION_OFFSETS = Object.freeze([0, 1, 7, 30]);

/* ============================ Yang TIDAK BISA DIUKUR, dan alasannya ======================= */
// Aturan berkas ini: panel yang mustahil dijawab dari lima tabel yang ada TIDAK dikarang
// kuerinya. Ia dihapus, dan alasannya ditulis di sini lalu DICETAK di dashboard. Owner lebih
// butuh tahu batasnya daripada melihat kotak kosong yang ia salah tafsirkan sebagai nol.
const UNMEASURABLE = Object.freeze([
  {
    panel: 'User growth',
    hal: 'Perangkat terdaftar (kumulatif seumur hidup)',
    sebab: 'Jumlah akun hidup hanya ada di tabel identitas database KUOTA (fiezel-core). '
      + 'Tabel itu memakai penunjuk akun nyata dan DILARANG disambungkan ke tabel analytics '
      + '(0002_analytics.sql peringatan #1). Yang bisa: jumlah perangkat baru SEJAK pengumpulan '
      + 'dimulai, sebagai batas bawah.',
  },
  {
    panel: 'User growth',
    hal: 'Pengunjung unik (dedup lintas hari)',
    sebab: 'Token perangkat dirotasi tiap 24 jam dan pepper lama dihapus permanen, jadi token '
      + 'hari-1 tidak bisa disambungkan ke token hari-2 oleh siapa pun — termasuk oleh kita. '
      + 'Yang bisa: jumlah pembukaan aplikasi per hari (bukan orang unik).',
  },
  {
    panel: 'Active users',
    hal: 'WAU/MAU sebagai SATU angka pasti',
    sebab: 'Alasan yang sama: dedup lintas hari mustahil. Yang disimpan adalah sepasang batas '
      + 'bawah/atas per hari, dan dashboard menampilkannya sebagai RENTANG. Satu angka tunggal '
      + 'di sini akan mengarang presisi yang tidak dimiliki datanya.',
  },
  {
    panel: 'Retention',
    hal: 'Kohor yang lebih rinci daripada retention_daily (mis. kurva per perangkat, segmen)',
    sebab: 'retention_daily hanya menyimpan (cohort_day, day_index, count). Kohor yang lebih '
      + 'rinci butuh baris per-perangkat lintas hari — persis yang kontrak privasi larang dan '
      + 'yang rotasi pepper buat mustahil.',
  },
  {
    panel: 'Infrastructure',
    hal: 'Permintaan Worker, objek/byte R2, error backend',
    sebab: 'Angka ini hidup di Cloudflare GraphQL Analytics API (butuh token akun), bukan di '
      + 'lima tabel D1 kita. Tidak ada kueri D1 yang bisa menjawabnya, dan menambah tabel untuk '
      + 'menampungnya melanggar kunci lima tabel.',
  },
  {
    panel: 'Cost estimation',
    hal: 'Biaya per hari yang bisa DIAUDIT (tarif yang berlaku saat itu)',
    sebab: 'Tidak ada tabel `cost_daily`, dan tidak boleh ada: tests/analytics-privacy-test.js '
      + 'mengunci database ini pada lima tabel. Volume penggerak biaya (karakter TTS dirender, '
      + 'token AI masuk/keluar) TERUKUR, jadi biaya dihitung ULANG dari kartu tarif di repo '
      + 'setiap kali halaman dirender. Konsekuensi jujur: mengubah tarif mengubah angka bulan '
      + 'lalu juga. Angka ini estimasi, bukan tagihan, dan bukan jejak audit.',
  },
  {
    panel: 'Cost estimation',
    hal: 'Biaya infrastruktur (langganan, kredit gratis)',
    sebab: 'Nilai langganan dan kredit tidak pernah masuk D1 dan tidak boleh dikarang per hari. '
      + 'Ia dibaca owner dari dasbor tagihan Cloudflare.',
  },
  {
    panel: 'Quota exhaustion',
    hal: 'Jumlah PERANGKAT yang kena batas kuota',
    sebab: 'Yang dicatat adalah jumlah PENOLAKAN (event), bukan perangkat unik. Menghitung '
      + 'perangkat unik butuh penunjuk per-perangkat di jalur kuota yang disambungkan ke '
      + 'analytics — dilarang keras. Rasio "porsi perangkat aktif" karena itu juga dihapus.',
  },
  {
    panel: 'AI usage',
    hal: 'Penanda apakah token AI adalah angka nyata atau proksi (karakter ÷ 4)',
    sebab: 'Jalur server menulis `ai_tokens_in`/`ai_tokens_out` tanpa penanda asal-usulnya, jadi '
      + 'dashboard TIDAK BISA tahu hari mana yang memakai proksi. Karena itu peringatan proksi '
      + 'dicetak TANPA SYARAT, bukan hanya saat penandanya menyala — lebih baik selalu '
      + 'mengingatkan daripada diam-diam menampilkan angka proksi sebagai angka pasti.',
  },
  {
    panel: 'Data quality',
    hal: 'Event terlambat (>24 jam)',
    sebab: 'Tidak ada metrik yang ditulis untuk ini di jalur server mana pun; menampilkannya '
      + 'berarti membaca nama metrik yang tidak pernah ada penulisnya.',
  },
]);

/* ============================ SQL ========================================================= */

const inList = (values) => values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
const ALL_METRICS = Object.freeze(
  Object.keys(FLOW_METRICS).concat(Object.keys(DAILY_STATE_METRICS)).sort()
);

const QUERIES = {
  // Jangkar halaman: hari terakhir yang PUNYA baris rollup. Pada tabel kosong ini
  // mengembalikan satu baris berisi NULL (bukan nol baris) — penelepon wajib memperlakukan
  // `day = null` sebagai "belum ada pengukuran", bukan sebagai hari.
  LATEST_DAY: 'SELECT MAX(day) AS day FROM metrics_daily',

  // DATA QUALITY: dasar keputusan keadaan. `days_total` dihitung dari JUMLAH HARI TERROLLUP,
  // bukan dari nilai metrik apa pun — COALESCE(SUM(...),0) membuat "tidak ada baris" dan
  // "nilainya nol" tiba sebagai angka yang sama persis, jadi nilai tidak bisa jadi dasar.
  COLLECTION_START: `SELECT MIN(day) AS day_first_collected, COUNT(DISTINCT day) AS days_total
                       FROM metrics_daily`,

  // Jumlah hari terrollup DI DALAM periode. Sama alasannya: ini, bukan nilai, yang memutuskan
  // `measured` / `no-data` / `no-data-in-period`.
  PERIOD_DAYS: `SELECT COUNT(DISTINCT day) AS days_counted, MIN(day) AS day_from,
                       MAX(day) AS day_to
                  FROM metrics_daily WHERE day BETWEEN ?1 AND ?2`,

  // Total per metrik untuk periode. Bentuk PANJANG: satu baris per metrik, bukan satu baris
  // lebar. `days` per metrik ikut supaya panel bisa membedakan "metrik ini nol" dari "metrik
  // ini tidak punya satu hari pun". Memakai idx_metrics_metric(metric, day).
  PERIOD_TOTALS: `SELECT metric, COALESCE(SUM(value), 0) AS total, COUNT(DISTINCT day) AS days
                    FROM metrics_daily
                   WHERE day BETWEEN ?1 AND ?2 AND metric IN (${inList(ALL_METRICS)})
                   GROUP BY metric ORDER BY metric ASC`,

  // Nilai keadaan pada satu hari (hari rollup terakhir). Hari diikat ?1.
  DAY_METRICS: `SELECT metric, value FROM metrics_daily
                 WHERE day = ?1 AND metric IN (${inList(ALL_METRICS)})
                 ORDER BY metric ASC`,

  // Puncak + rata-rata satu metrik dalam rentang. Nama metrik DIIKAT (?1), bukan disisipkan.
  METRIC_PEAK: `SELECT COUNT(*) AS days, MAX(value) AS peak, AVG(value) AS avg
                  FROM metrics_daily WHERE metric = ?1 AND day BETWEEN ?2 AND ?3`,

  // Hari yang penanda pengumpulannya 0. Dihitung dari BARIS penanda, bukan dari ketiadaan baris.
  BROKEN_DAYS: `SELECT COUNT(*) AS days_broken FROM metrics_daily
                 WHERE metric = ?1 AND value = 0 AND day BETWEEN ?2 AND ?3`,

  // Seri tren, bentuk panjang. Penelepon memutar (pivot) ke satu baris per hari.
  SERIES: `SELECT day, metric, value FROM metrics_daily
            WHERE day BETWEEN ?1 AND ?2 AND metric IN (${inList(SERIES_METRICS)})
            ORDER BY day ASC, metric ASC`,

  // Dimensi pemakaian (error AI/TTS, penolakan kuota per jenis). PK (day, bucket) menutup
  // penyaringan `day BETWEEN`.
  USAGE_TOTALS: `SELECT bucket, COALESCE(SUM(count), 0) AS total, COUNT(DISTINCT day) AS days
                   FROM usage_daily
                  WHERE day BETWEEN ?1 AND ?2 AND bucket IN (${inList(Object.keys(USAGE_BUCKETS))})
                  GROUP BY bucket ORDER BY bucket ASC`,

  // RETENSI per kohor. `day_index = 0` WAJIB ikut karena ia satu-satunya sumber n= (tidak ada
  // kolom ukuran kohor di skema). Memakai idx_retention_cohort(day_index, cohort_day).
  //
  // TIDAK ADA kueri "RETENTION_ROLLUP" yang menjumlahkan lintas kohor di SQL, dan itu disengaja:
  // `SUM(count) GROUP BY day_index` akan memakai jumlah SELURUH kohor sebagai penyebut, padahal
  // kohor berumur 3 hari belum bisa punya baris D30. Penyebutnya jadi terlalu besar dan retensi
  // tampak lebih buruk daripada kenyataan. Karena itu persentase dirakit di kode dari baris
  // per-kohor di bawah, dengan penyebut HANYA kohor yang benar-benar punya pengamatan di offset
  // itu. Satu kueri lebih sedikit, dan angkanya tidak menipu.
  RETENTION: `SELECT cohort_day, day_index, count FROM retention_daily
               WHERE cohort_day BETWEEN ?1 AND ?2 AND day_index IN (${RETENTION_OFFSETS.join(', ')})
               ORDER BY cohort_day DESC, day_index ASC`,
};

/* ============================ Penjaga di dalam berkas ===================================== */

// 1. Baca-saja. D1 belum punya binding read-only sungguhan, jadi read-only ditegakkan di
//    lapisan kode + gerbang test — dinyatakan apa adanya di README, bukan disembunyikan.
const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|replace|attach|pragma)\b/i;

// 2. Hanya tiga tabel agregat. `dau_dedup` dan `pepper_state` ADA di database ini tetapi
//    TERLARANG di sini; apa pun di luar lima tabel tidak boleh disebut sama sekali.
const ALLOWED_TABLES = Object.freeze(['metrics_daily', 'usage_daily', 'retention_daily']);
const FORBIDDEN_TABLES = Object.freeze([
  'dau_dedup', 'pepper_state', 'cost_daily', 'retention_cohort',
  'quota_daily', 'quota_reservation', 'identity', 'session', 'daily_active',
]);

for (const [key, sql] of Object.entries(QUERIES)) {
  if (WRITE_WORDS.test(sql)) throw new Error('SQL owner harus baca-saja: ' + key);
  for (const table of FORBIDDEN_TABLES) {
    if (new RegExp('\\b' + table + '\\b').test(sql)) {
      throw new Error('SQL owner menyentuh tabel terlarang ' + table + ': ' + key);
    }
  }
  const referenced = [...sql.matchAll(/\bFROM\s+([A-Za-z_]\w*)/gi)].map((m) => m[1]);
  for (const table of referenced) {
    if (!ALLOWED_TABLES.includes(table)) {
      throw new Error('SQL owner membaca tabel di luar daftar izin (' + table + '): ' + key);
    }
  }
}

export {
  QUERIES,
  FLOW_METRICS, DAILY_STATE_METRICS, SERIES_METRICS, USAGE_BUCKETS, RETENTION_OFFSETS,
  ALL_METRICS, ALLOWED_TABLES, FORBIDDEN_TABLES, UNMEASURABLE,
  METRIC_WRITER_EVENTS, METRIC_WRITER_ROLLUP,
};
