/**
 * FIEZEL · workers/api/quota/quota-config.js
 *
 * SATU-SATUNYA tempat angka kuota hidup (bab 10: "jangan sebarkan angka quota ke banyak
 * file"). Desain: reports/cf-b3-quota.md §2. Angka: reports/cf-a10-cost.md §6.
 *
 * ATURAN BERKAS INI, ditegakkan gerbang `quota-core-test.js`:
 *   - TANPA `import` / `require`  → tidak bisa menarik state dari mana pun
 *   - TANPA `Date.now()`          → tidak ada waktu tersembunyi; waktu selalu parameter
 *   - TANPA `env` / `globalThis`  → nilainya sama di test dan di produksi
 *   - `Object.freeze` berlapis    → tidak ada jalur kode yang bisa menaikkan kuota diam-diam
 *
 * KONTEKS OWNER (EXEC-BRIEF-CF.md): PLAN GRATIS + biaya DIBATASI KETAT. Semua angka di
 * bawah adalah plafon konservatif, bukan target. Plafon biaya terhitung per pengguna
 * per hari = US$0,1855 (cf-a10 §6), yaitu 12.000 char × US$15/1M + 25 × (1.200 in + 400 out).
 */

/**
 * Zona waktu tetap yang BOLEH dipakai sistem. Hanya offset tetap (Indonesia tanpa DST),
 * sehingga tidak pernah ada hari 23/25 jam — satu kelas bug yang lenyap by construction.
 * Nilai dari klien TIDAK PERNAH masuk tabel ini (cf-b3 §7 baris 6).
 */
export const FIXED_ZONE_OFFSET_MINUTES = Object.freeze({
  'Asia/Jakarta': 420, // UTC+7, tanpa DST
  UTC: 0
});

export const FREE_PLAN_LIMITS = Object.freeze({
  // ALASAN (cf-a10 §6): profil sedang butuh 3,3 permintaan AI/hari aktif, profil berat 11,8.
  // 25 = 7,6× profil sedang, ±2× profil berat. Menggantikan AI_RATE_LIMIT_PER_HOUR=40 yang
  // secara matematis membolehkan 960/hari (fiezel-core-worker.js:8).
  FREE_AI_DAILY_LIMIT: 25,

  // ALASAN (cf-a10 §6): terjemahan = 24 dari 40 permintaan AI profil sedang (60%). Ini
  // SUB-KUOTA DI DALAM FREE_AI_DAILY_LIMIT, bukan tambahan: satu terjemahan menaikkan
  // ai DAN aiTranslate. Tujuannya melindungi jatah penjelasan tutor yang nilai
  // pedagogisnya lebih tinggi per permintaan (cf-b3 §3.3).
  FREE_AI_TRANSLATE_DAILY: 15,

  // ALASAN (cf-a10 §6): 3,75× kebutuhan harian profil sedang (32 panggilan). Dihitung
  // per CACHE-MISS, bukan per tekan tombol — replay aset yang sudah ada selalu gratis.
  // Menutup 1 sesi listening 20 item + 1 bab buku (±35 kalimat) + 40 kata kosakata/hari.
  FREE_TTS_DAILY_LIMIT: 120,

  // ALASAN (cf-a10 §6): 4,3× kebutuhan harian sedang (2.809 char). WAJIB berdampingan
  // dengan batas panggilan karena satu skrip C2 (438 char) 12× lebih mahal dari satu
  // kata kosakata (6,7 char). Plafon biaya: 12.000 × US$15/1M = US$0,18/hari.
  FREE_TTS_DAILY_CHARS: 12000,

  // ALASAN (cf-a10 §6): keluaran nyata terpanjang = coach ≈375 token, penjelasan kuis
  // ≈219. 400 tidak memotong satu pun permukaan yang ada, tapi menutup cleanAiOutput
  // yang memotong di 6.000 char ≈1.875 token (fiezel-core-worker.js:111) — 4,7× lebih besar.
  FREE_MAX_OUTPUT_TOKENS: 400,

  // ALASAN (cf-a10 §6): prompt terukur terbesar = 1.361 char (penjelasan kosakata) →
  // ruang 3×. Memangkas batas 12.000 char hari ini (fiezel-core-worker.js:447) jadi 1/3.
  // Divalidasi SERVER setelah normalisasi; klaim panjang dari klien diabaikan (cf-b3 §7 #8).
  FREE_MAX_PROMPT_CHARS: 4000,

  // ALASAN (cf-a10 §6): 4.000 char ÷ ≈4 char/token = 1.000, + ruang system prompt
  // (overhead tetap terukur 1.395 char ≈ 349 token).
  FREE_MAX_INPUT_TOKENS: 1200,

  // ALASAN (cf-a10 §6): penjelasan dibaca 20-60 detik; >8/menit bukan pola belajar manusia.
  FREE_AI_RATE_PER_MINUTE: 8,

  // ALASAN (cf-a10 §6): narasi buku ±1 kalimat/3-5 detik + 1 prefetch → ≤20/menit cukup;
  // di atas itu berarti skrip, bukan murid.
  FREE_TTS_RATE_PER_MINUTE: 20,

  // ALASAN (cf-b3 §2.1): pagar lintas endpoint per pengguna supaya endpoint murah
  // (/api/quota, /api/activity) tidak menjadi jalur DoS di plan gratis.
  FREE_ANY_RATE_PER_MINUTE: 60,

  // ALASAN (cf-b3 §2.1): satu murid = satu modal penjelasan (app.js:5237). >1 hanya
  // berarti tab paralel atau skrip.
  FREE_AI_CONCURRENCY: 1,

  // ALASAN (cf-b3 §2.1): library prefetch SATU kalimat ke depan
  // (fiezel-library-ui.js:162-171) → 1 aktif + 1 prefetch = 2. Kebutuhan terbukti,
  // bukan kelonggaran.
  FREE_TTS_CONCURRENCY: 2
});

export const QUOTA_CONFIG = Object.freeze({
  SCHEMA: 'fiezel-quota-config-v1',

  // ALASAN (bab 34 + cf-b3 §2.1): DIPERTAHANKAN sebagai bidang bernilai false, BUKAN
  // dihapus — preseden core-config.js:5-15. Pembaca harus membaca keputusan, bukan
  // `undefined`. Selama false: tidak ada harga, tidak ada checkout, tidak ada upgradeUrl.
  PAYMENT_ENABLED: false,

  // ALASAN (bab 34): penegakan di tingkat DATA. Bentuk 'plus' sengaja TIDAK ada di
  // berkas ini; tidak ada jalur kode yang bisa menetapkan plan selain 'free'.
  ASSIGNABLE_PLANS: Object.freeze(['free']),

  // ALASAN (cf-b3 §3.2): satu zona tetap untuk SEMUA pengguna. `preferences.timeZone`
  // hidup di localStorage (app.js:153) dan bisa ditulis satu baris dari devtools; kalau
  // batas hari mengikutinya, mengganti tz = mereset kuota sesuka hati. UTC juga ditolak
  // karena 00:00 UTC = 07:00 WIB, tepat di jam belajar pagi.
  RESET_TZ: 'Asia/Jakarta',
  WIB_OFFSET_MINUTES: 420,

  // ALASAN (cf-a10 §2): jatah neuron Cloudflare reset "daily at 00:00 UTC" — jam yang
  // BERBEDA dari kuota murid. Dua jam, dua tujuan, keduanya dinamai supaya tidak tertukar.
  ACCOUNT_BUDGET_TZ: 'UTC',

  // ALASAN (cf-a11 §3.4): jatah gratis Workers AI PER AKUN, bukan per pengguna. Pada
  // aura-1 = 7.333 char/hari untuk SELURUH akun. Tanpa lapis ini "kuota per-pengguna"
  // adalah teater karena satu penyalah-guna mengeringkan AI untuk semua orang.
  ACCOUNT_DAILY_NEURON_BUDGET: 10000,

  // ALASAN (cf-a11 Risiko #2): pada 85% jatah akun, permintaan non-kritikal dijawab
  // 503 service_degraded (BUKAN 429 kuota) supaya sisa jatah tersisa untuk jalur kritis.
  ACCOUNT_BUDGET_SOFT_STOP: 0.85,

  // ALASAN (cf-b3 §2.1): TTS_TIMEOUT_MS + 5.000 margin. Ini batas atas waktu satu slot
  // kuota bisa "hilang" bila Worker mati di antara reserve dan commit. Lease kedaluwarsa
  // = rollback otomatis, jadi kegagalan default-nya berpihak ke murid.
  RESERVATION_TTL_MS: 30000,

  // ALASAN (cf-a10 §6): di bawah FIEZEL_AI_TIMEOUT_MS=30000 klien (app.js:5130) supaya
  // SERVER yang memutus lebih dulu dan slot kuota dilepas rapi, bukan menggantung.
  AI_TIMEOUT_MS: 20000,

  // ALASAN (cf-a10 §6): selaras CALL_TIMEOUT_MS=25000 (fiezel-puter-voice.js:52).
  // Timeout 35.000 ms di jalur listening (addon:383) harus DITURUNKAN ke angka ini —
  // cf-a10 menyebutnya "kelewat longgar dan harus diturunkan agar tidak menahan slot kuota".
  TTS_TIMEOUT_MS: 25000,

  // ALASAN (cf-b3 §5.2): pepper harian, sehingga HMAC(pepper, ip) tidak bisa dihubungkan
  // antar hari. IP mentah tidak pernah disimpan ke D1/KV/log (bab 29 + bab 31).
  IP_HASH_PEPPER_ROTATION_H: 24,

  // ALASAN (cf-b3 §1.4 + EXEC-BRIEF butir 2): jalur bebas-Durable-Object. D1 tidak punya
  // lease, jadi sweep reservasi kedaluwarsa dijalankan cron. Periode 60 s = jendela
  // kebocoran slot maksimum di jalur free-tier-safe.
  RESERVATION_SWEEP_INTERVAL_MS: 60000,

  // ALASAN (cf-b3 §4.1): ambang state 'low' pada respons /api/quota. 20% sisa = satu
  // sinyal untuk naskah UX; server mengirim FAKTA + copyKey, bukan kalimat.
  LOW_REMAINING_RATIO: 0.2,

  plans: Object.freeze({
    // Hanya 'free'. ASSIGNABLE_PLANS di atas menutup sisanya di tingkat data.
    free: FREE_PLAN_LIMITS
  })
});

/**
 * Bentuk limit yang dipakai quota-core.js. Diturunkan dari konstanta di atas supaya
 * quota-core TIDAK perlu tahu nama konstanta owner-facing, dan supaya tetap ada tepat
 * satu sumber angka.
 */
export const FREE_BUCKET_LIMITS = Object.freeze({
  ai: FREE_PLAN_LIMITS.FREE_AI_DAILY_LIMIT,
  aiTranslate: FREE_PLAN_LIMITS.FREE_AI_TRANSLATE_DAILY,
  ttsCalls: FREE_PLAN_LIMITS.FREE_TTS_DAILY_LIMIT,
  ttsChars: FREE_PLAN_LIMITS.FREE_TTS_DAILY_CHARS
});

export const QUOTA_BUCKETS = Object.freeze(['ai', 'aiTranslate', 'ttsCalls', 'ttsChars']);

/**
 * Satuan tiap bucket untuk skema respons `fiezel-quota-v1` (cf-b3 §4.1). Bahasa Inggris
 * dan bersifat mesin: server TIDAK PERNAH mengirim prosa Indonesia (naskah tinggal di
 * features/quota/quota-copy.js, dipilih lewat copyKey).
 */
export const QUOTA_BUCKET_UNITS = Object.freeze({
  ai: 'request',
  aiTranslate: 'request',
  ttsCalls: 'render',
  ttsChars: 'character'
});

/** Sub-kuota → induknya. aiTranslate menaikkan ai juga (cf-b3 §3.3). */
export const QUOTA_BUCKET_PARENT = Object.freeze({
  aiTranslate: 'ai'
});

export default QUOTA_CONFIG;
