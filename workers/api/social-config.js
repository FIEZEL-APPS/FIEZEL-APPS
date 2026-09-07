/**
 * FIEZEL · workers/api/social-config.js
 *
 * SATU-SATUNYA tempat angka & enum lapisan sosial hidup (pola `quota/quota-config.js`,
 * bab 10: "jangan sebarkan angka ke banyak file"). Desain: FIEZEL-ONLINE-SOCIAL-SFX-SPEC.md
 * §2 (identitas/profil), §3 (undangan/sorakan), §4 (Poin Bukti + anti-cheat).
 *
 * ATURAN BERKAS INI, ditegakkan gerbang `tests/social-schema-contract-test.js`
 * (cermin aturan `tests/quota-core-test.js` atas quota-config):
 *   - TANPA impor apa pun          → tidak bisa menarik state dari mana pun
 *   - TANPA pembacaan jam          → waktu selalu parameter di pemakainya
 *   - TANPA env / global           → nilainya sama di test dan di produksi
 *   - `Object.freeze` berlapis     → tidak ada jalur kode yang bisa menaikkan
 *                                    nilai PB / melonggarkan cap diam-diam
 *
 * KEPUTUSAN PENAMAAN YANG WAJIB DIBACA: pengenal publik dinamai `handle`, BUKAN
 * `username`. Alasannya keras, bukan selera: `schema.js` PII_FORBIDDEN_KEYS
 * (dan pemindai gerbang `tests/cf-api-contract-test.js` §11) MELARANG kunci `username`
 * muncul di body respons mana pun. Daftar beku itu tidak dilonggarkan demi fitur
 * baru — fitur baru yang menyesuaikan diri. `handle` adalah pseudonim yang
 * dibuat khusus (spec §2.3: "nama samaran/handle tanpa PII"), bukan nama akun.
 */

/** Aturan handle (pengenal publik pseudonim). Spek tugas: 3-20 char, a-z 0-9 _. */
export const HANDLE_RULES = Object.freeze({
  // Huruf pertama alfabet (spec §2.3), sisanya a-z 0-9 _, total 3-20.
  // Huruf BESAR tidak pernah disimpan: input di-lowercase SEBELUM validasi,
  // sehingga keunikan case-insensitive gratis (kunci PK selalu lowercase).
  PATTERN: /^[a-z][a-z0-9_]{2,19}$/,
  MIN: 3,
  MAX: 20,
  // Deret >= 6 digit ditolak: pola nomor HP sebagai handle = PII (spec §2.3).
  MAX_DIGIT_RUN: 5,
  // Substring terlarang: peniruan + kata kasar ID/EN. Enum TERTUTUP di server,
  // konsisten disiplin "tanpa teks bebas" analytics. Perluasan butuh owner.
  BLOCKLIST: Object.freeze([
    'fiezel', 'admin', 'official', 'owner', 'moderator', 'modmin', 'staff',
    'support', 'system', 'root', 'sysop',
    'anjing', 'bangsat', 'babi', 'kontol', 'memek', 'ngentot', 'jancok',
    'goblok', 'tolol', 'bajingan', 'perek', 'lonte',
    'fuck', 'shit', 'bitch', 'cunt', 'nigger', 'asshole', 'dick'
  ])
});

/** Display name: pendek, tersanitasi, TANPA URL/email/deret digit panjang. */
export const DISPLAY_RULES = Object.freeze({
  MAX: 20,
  // Huruf (unicode), angka, spasi, dan tanda baca ringan. Tanpa emoji berlebih,
  // tanpa karakter kontrol — divalidasi pemakai lewat pola ini.
  PATTERN: /^[\p{L}\p{N} ._'-]{1,20}$/u,
  MAX_DIGIT_RUN: 5
});

/** Avatar = slot preset saja (spec §2.3): id 0..15, TANPA upload foto. */
export const AVATAR_MAX_ID = 15;

/**
 * Bitmask kolom `social_profile.flags`. Default AMAN (spec §2.4 layar 3):
 * teman boleh lihat progres = opt-out; liga global = opt-IN; sembunyi papan = off.
 */
export const PROFILE_FLAGS = Object.freeze({
  FRIENDS_VISIBLE: 1, // teman boleh melihat presence belajarku
  LEAGUE_OPT_IN: 2,   // ikut papan liga kohor global (default TIDAK)
  BOARD_HIDDEN: 4     // "Mode privat": hilang dari SEMUA papan seketika
});

/**
 * Kode undangan teman (spec §3.2, diadaptasi mandat tugas: SINGLE-USE).
 * Server-minted; alfabet Crockford base32 TANPA 0/O/1/I; ruang 30^8 ≈ 6,6e11.
 */
export const INVITE_RULES = Object.freeze({
  CODE_LEN: 8,
  ALPHABET: '23456789ABCDEFGHJKMNPQRSTVWXYZ',
  TTL_DAYS: 7,
  MAX_ACTIVE_PER_USER: 3,
  // SINGLE-USE (mandat tugas; spec awal 10 pemakaian). Pemakaian = klaim atomik
  // `UPDATE ... WHERE used_by IS NULL` — pola gerbang kuota, bukan read-then-write.
  SINGLE_USE: true
});

/** Batas pertemanan per akun (spec §3.2 butir 5). */
export const FRIENDS_MAX = 50;

/**
 * Batas permintaan teman MASUK yang boleh menggantung untuk satu murid.
 *
 * Ada dua alasan, dan yang kedua yang penting: (1) murid tidak perlu memilah
 * ratusan kartu "Terima/Tolak", dan (2) jumlah baris `social_friend` yang
 * menunjuk ke satu murid jadi TERBATAS (FRIENDS_MAX + REQUESTS_MAX). Batas itu
 * yang membuat route-social.js boleh membaca tepi masuk dengan satu LIMIT dan
 * tetap yakin tidak ada pertemanan sah yang terpotong di luar jendela.
 */
export const REQUESTS_MAX = 50;

/**
 * Sorakan: 6 stiker ENUM TERTUTUP, NOL teks bebas (spec §3.3). Nilai adalah
 * token mesin; label/emoji hidup di frontend. Sorakan TIDAK bernilai poin.
 */
export const CHEER_STICKERS = Object.freeze(['clap', 'fire', 'gem', 'target', 'sunrise', 'finish']);
export const CHEER_PER_FRIEND_PER_DAY = 5;

/** Band CEFR yang boleh muncul sebagai chip level. Enum tertutup. */
export const LEVEL_BANDS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/**
 * TABEL POIN BUKTI (spec §4.1) — DIBEKUKAN. Server menghitung PB dari event
 * bukti ber-cap; tidak ada satu pun angka skor dari klien yang dipercaya.
 * `period`: 'day' = cap per hari WIB, 'week' = cap per pekan WIB (Senin).
 */
export const PB_RULES = Object.freeze({
  meaningful_day: Object.freeze({ pb: 10, cap: 1, period: 'day' }),   // konsistensi > volume
  daily_target: Object.freeze({ pb: 15, cap: 1, period: 'day' }),     // ring harian penuh
  lesson_mastered: Object.freeze({ pb: 25, cap: 3, period: 'day' }),  // "Dikuasai" PERTAMA KALI saja
  srs_review: Object.freeze({ pb: 2, cap: 20, period: 'day' }),       // supply dibatasi jadwal SRS
  exam_passed: Object.freeze({ pb: 150, cap: 1, period: 'day' }),     // cooldown 24 jam sudah ada di ujian
  book_finished: Object.freeze({ pb: 40, cap: 1, period: 'week' }),   // membaca utuh
  weekly_mission: Object.freeze({ pb: 50, cap: 1, period: 'week' })   // loop mingguan yang ada
});

/** Event bukti yang juga menjadi milestone feed (enum, retensi pendek). */
export const MILESTONE_KINDS = Object.freeze(['exam_passed', 'book_finished', 'weekly_mission']);

/**
 * Gerbang kewajaran evidence batch (spec §4.4.2, angka meminjam pola LIMITS
 * analytics + DAY_SKEW): yang melampaui DIBUANG DIAM-DIAM (tanpa oracle).
 */
export const EVIDENCE_RULES = Object.freeze({
  MAX_EVENTS_PER_BATCH: 20,   // pola LIMITS analytics: batch maks 20 event
  MAX_COUNT_PER_EVENT: 20,    // count di-clamp; >20/menit ≈ skrip, bukan murid
  MAX_BATCHES_PER_DAY: 40,    // murid rajin sync belasan kali/hari; 40 = plafon skrip
  DAY_SKEW_DAYS: 2,           // toleransi offline (pola DAY_SKEW_DAYS kuota)
  JTI_PATTERN: /^[A-Za-z0-9_-]{8,64}$/ // pola jti tiket klaim (route-auth.js)
});

/** Kohor liga mingguan: maks 20 profil; papan liga disembunyikan bila < 3. */
export const COHORT_RULES = Object.freeze({
  MAX_MEMBERS: 20,
  MIN_VISIBLE: 3
});

/**
 * Spesifikasi gerbang flag fitur sosial — dieksekusi `featureAllowedFrom()`
 * (feature-gate.js) dengan baris tabel ini, BUKAN mesin keputusan baru.
 * Tiga sakelar AND: FEATURE_SOCIAL='on' (wrangler) + enabled.social (KV) +
 * flags.cfSocialEnabled (KV). Fail-CLOSED: flag tak terbaca = tolak.
 */
export const SOCIAL_FEATURE_SPEC = Object.freeze({
  name: 'social',
  varName: 'FEATURE_SOCIAL',
  killKey: 'social',
  flagKey: 'cfSocialEnabled',
  reasons: Object.freeze({
    featureVarOff: 'social_feature_var_off',
    flagsUnreadable: 'social_flags_unreadable',
    killSwitch: 'social_kill_switch',
    flagOff: 'social_flag_off'
  })
});

export const SOCIAL_CONFIG = Object.freeze({
  SCHEMA: 'fiezel-social-config-v1',
  HANDLE_RULES,
  DISPLAY_RULES,
  AVATAR_MAX_ID,
  PROFILE_FLAGS,
  INVITE_RULES,
  FRIENDS_MAX,
  REQUESTS_MAX,
  CHEER_STICKERS,
  CHEER_PER_FRIEND_PER_DAY,
  LEVEL_BANDS,
  PB_RULES,
  MILESTONE_KINDS,
  EVIDENCE_RULES,
  COHORT_RULES,
  SOCIAL_FEATURE_SPEC
});

export default SOCIAL_CONFIG;
