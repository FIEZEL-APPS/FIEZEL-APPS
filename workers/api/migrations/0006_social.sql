-- 0006_social.sql — skema lapisan SOSIAL fiezel-api (profil pseudonim, undangan
-- teman, sorakan, leaderboard Poin Bukti). Database tujuan: fiezel-core
-- (binding CORE_DB). Desain: FIEZEL-ONLINE-SOCIAL-SFX-SPEC.md §2-§5.
--
-- KENAPA fiezel-core DAN BUKAN DATABASE BARU: token CI yang dipakai jalur
-- deploy TIDAK punya izin `wrangler d1 create`. Membuat database ketiga adalah
-- keputusan owner + kredensial owner; sampai itu terjadi, tabel sosial hidup di
-- fiezel-core bersama identitas & kuota (per-user, HALAL) — dan TETAP HARAM di
-- fiezel-stats (analytics agregat, lihat larangan di bawah).
--
-- PENERAPAN: token CI juga TIDAK bisa menjalankan `wrangler d1 execute --remote`.
-- Karena itu runtime punya `ensureSocialSchema()` (workers/api/social-schema.js)
-- yang menerapkan DDL YANG SAMA secara idempoten lewat binding CORE_DB pada
-- permintaan sosial pertama per isolate. Berkas ini tetap SUMBER RESMI skema;
-- gerbang `social-schema-contract-test.js` menegakkan keduanya setara
-- pernyataan-per-pernyataan (ternormalisasi). Owner tetap DIANJURKAN
-- menjalankan berkas ini secara remote (perintah di MIGRATIONS.md) supaya skema
-- terpasang tanpa menunggu permintaan pertama.
--
-- DAFTAR KERAS yang DIWARISI UTUH dari 0001_identity.sql (bab 29) dan
-- 0002_analytics.sql — TIDAK BOLEH ditambahkan ke tabel mana pun di berkas ini:
--   * nama asli/nama panggilan/email/sekolah/umur/nomor HP, IP mentah,
--     User-Agent, bahasa, resolusi, zona waktu presisi, uuid Puter mentah,
--     jawaban/riwayat/transkrip, password/token/secret apa pun;
--   * kolom teks BEBAS antar pengguna dalam bentuk apa pun (sorakan = enum
--     tertutup `sticker`; tidak ada kolom pesan);
--   * kolom penghubung ke dunia analytics (visitor token/pepper) — DILARANG
--     JOIN sosial<->analytics; pemisahan database membuatnya mustahil fisik.
-- `handle` dan `display_name` adalah PSEUDONIM tersanitasi (blocklist + pola
-- anti-PII di social-config.js), satu-satunya teks yang boleh tampil publik.
-- Kolom baru = butuh persetujuan owner + satu baris di dokumen data.
--
-- GRANULARITAS WAKTU = HARI ('YYYY-MM-DD' WIB, pola studyDayWib). TANPA jam,
-- TANPA "online sekarang" — presence real-time dilarang spec §3.3/§5.5.
--
-- PLAN GRATIS: penghitung yang sering berubah (social_counter, rank_week)
-- ditulis lewat gerbang atomik `UPDATE ... WHERE ... <= cap` (pola
-- quota-store-d1.js), 1-2 tulis per batch; TANPA indeks tambahan — semua kueri
-- panas dilayani PRIMARY KEY (indeks tanpa kueri = baris tertulis sia-sia).

-- Profil FIEZEL (lapis L2 di atas identitas fz_id). `sub` = kunci yang sama
-- dengan tabel identity; TIDAK ada FK CASCADE lintas paket supaya migrasi ini
-- bisa diterapkan runtime tanpa urutan ketat.
CREATE TABLE IF NOT EXISTS social_profile (
  sub                 TEXT    PRIMARY KEY,               -- dari cookie fz_id ber-HMAC, TIDAK PERNAH dari body
  handle              TEXT    NOT NULL,                  -- pseudonim publik lowercase; keunikan di social_handle
  display_name        TEXT,                              -- maks 20 char tersanitasi (DISPLAY_RULES)
  avatar_id           INTEGER NOT NULL DEFAULT 0,        -- slot preset 0..15, TANPA upload foto
  flags               INTEGER NOT NULL DEFAULT 1,        -- bitmask PROFILE_FLAGS (default: friendsVisible saja)
  band                TEXT,                              -- chip level CEFR enum ('A1'..'C2') / NULL
  streak_days         INTEGER NOT NULL DEFAULT 0,        -- dihitung SERVER dari evidence hari-bermakna
  last_meaningful_day TEXT,                              -- 'YYYY-MM-DD' WIB, granularitas HARI
  created_day         TEXT    NOT NULL                   -- 'YYYY-MM-DD' WIB
);

-- Buku keunikan handle: PK = klaim atomik. INSERT kedua atas handle yang sama
-- gagal UNIQUE -> 409, tanpa read-then-write yang bisa balapan.
CREATE TABLE IF NOT EXISTS social_handle (
  handle TEXT PRIMARY KEY,                               -- selalu lowercase (validasi menolak selain a-z0-9_)
  sub    TEXT NOT NULL
) WITHOUT ROWID;

-- Kode undangan server-minted, SINGLE-USE (mandat tugas), TTL hari.
-- Klaim pemakaian = UPDATE atomik `WHERE used_by IS NULL` (anti-replay,
-- pola jti tiket klaim yang dipindah ke D1 karena jalur panas dilarang tulis KV).
CREATE TABLE IF NOT EXISTS social_invite (
  code        TEXT    PRIMARY KEY,                       -- 8 char Crockford base32 tanpa 0/O/1/I
  sub         TEXT    NOT NULL,                          -- pengundang
  created_day TEXT    NOT NULL,
  expires_day TEXT    NOT NULL,                          -- created + 7 hari
  used_by     TEXT,                                      -- NULL = masih hidup; terisi = kode mati
  used_day    TEXT
);

-- Pertemanan dua arah disimpan DUA baris (a->b dan b->a) supaya daftar teman
-- satu pengguna terjawab PRIMARY KEY prefix tanpa OR dan tanpa indeks kedua.
CREATE TABLE IF NOT EXISTS social_friend (
  a         TEXT NOT NULL,
  b         TEXT NOT NULL,
  since_day TEXT NOT NULL,
  PRIMARY KEY (a, b)
) WITHOUT ROWID;

-- Penghitung ber-cap generik (pola quota_daily): period = 'YYYY-MM-DD' untuk
-- cap harian ATAU 'YYYY-MM-DD' Senin-pekan untuk cap mingguan; kind = enum
-- sumber PB / 'cheer:<sub>' / '_batches'. Cap ditegakkan ATOMIK:
-- UPDATE ... SET cnt = cnt + ?x WHERE ... AND cnt + ?x <= cap.
CREATE TABLE IF NOT EXISTS social_counter (
  sub    TEXT    NOT NULL,
  period TEXT    NOT NULL,
  kind   TEXT    NOT NULL,
  cnt    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub, period, kind)
) WITHOUT ROWID;

-- Poin Bukti per pekan WIB (Senin 'YYYY-MM-DD'). TANPA angka seumur hidup
-- (anti XP inflasi, audit §19.5). hidden=1 = "Mode privat" seketika.
CREATE TABLE IF NOT EXISTS rank_week (
  sub       TEXT    NOT NULL,
  week      TEXT    NOT NULL,
  pb        INTEGER NOT NULL DEFAULT 0,
  hidden    INTEGER NOT NULL DEFAULT 0,
  cohort_id TEXT,
  PRIMARY KEY (sub, week)
) WITHOUT ROWID;

-- Kohor liga mingguan (maks 20 anggota). Diisi malas (lazy) saat papan liga
-- pertama diminta pengguna yang opt-in — token CI tidak bisa memasang cron baru.
CREATE TABLE IF NOT EXISTS social_cohort (
  id   TEXT    PRIMARY KEY,
  week TEXT    NOT NULL,
  cnt  INTEGER NOT NULL DEFAULT 0
);

-- Feed milestone teman: HANYA enum kind + hari (tanpa teks bebas, tanpa jam).
-- Retensi pendek (14 hari) — SQL purge ber-WHERE didokumentasikan di
-- MIGRATIONS.md; belum ada cron khusus (jujur: purge menunggu paket cron owner).
CREATE TABLE IF NOT EXISTS milestone_feed (
  sub  TEXT NOT NULL,
  day  TEXT NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY (sub, day, kind)
) WITHOUT ROWID;

-- Sorakan yang DITERIMA (untuk feed penerima). sticker = enum tertutup 6 nilai;
-- TIDAK ADA kolom teks. Jatah kirim 5/hari/teman ditegakkan di social_counter.
CREATE TABLE IF NOT EXISTS cheer_feed (
  sub_to   TEXT    NOT NULL,
  day      TEXT    NOT NULL,
  sub_from TEXT    NOT NULL,
  sticker  TEXT    NOT NULL,
  cnt      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (sub_to, day, sub_from, sticker)
) WITHOUT ROWID;

-- Anti-replay evidence batch: jti klien sekali pakai (pola claim:jti, tapi di
-- D1 dan BUKAN KV — jalur panas dilarang menulis KV, batas 1.000 tulis/hari).
-- PK (sub, jti): pengguna lain tidak bisa "membakar" jti orang lain.
CREATE TABLE IF NOT EXISTS rank_jti (
  sub TEXT NOT NULL,
  jti TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (sub, jti)
) WITHOUT ROWID;
