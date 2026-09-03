-- 0011_auth_roles.sql — skema AKUN, PERAN, UNDANGAN GURU, dan lapisan sosial
-- lanjutan (permintaan teman, notifikasi, langganan push). Database tujuan:
-- fiezel-core (binding CORE_DB), alasan yang sama dengan 0006_social.sql: token
-- CI tidak punya izin `wrangler d1 create`, jadi tabel per-pengguna hidup di
-- fiezel-core bersama identitas & kuota — dan TETAP HARAM di fiezel-stats.
--
-- PENERAPAN: token CI juga tidak bisa `wrangler d1 execute --remote`. Runtime
-- punya `ensureAuthSchema()` (workers/api/auth-schema.js) yang menerapkan DDL
-- YANG SAMA secara idempoten. Berkas ini TETAP SUMBER RESMI; gerbang
-- `auth-schema-contract-test.js` menegakkan keduanya setara pernyataan-per-
-- pernyataan (ternormalisasi).
--
-- ==========================================================================
-- KATA SANDI, DAN KENAPA IA TIDAK MELANGGAR DAFTAR KERAS BAB 29
-- ==========================================================================
-- Kepala 0001_identity.sql melarang "password atau token apa pun" DI TABEL
-- `identity`. Larangan itu tidak dicabut: `identity` tetap bersih. Kredensial
-- hidup di `auth_credential` yang TERPISAH, dan pemisahan itu berguna nyata —
-- jalur panas yang membaca identitas tidak pernah menyeret kolom hash ikut,
-- jadi hash tidak singgah di jalur log/telemetri mana pun.
--
-- Yang disimpan BUKAN kata sandi melainkan turunan PBKDF2-HMAC-SHA256 ber-salt
-- 210.000 iterasi (workers/api/auth/password-core.js). Kata sandi mentah tidak
-- pernah ditulis ke kolom, log, atau analytics mana pun.
--
-- TIDAK ADA KOLOM EMAIL — dan itu mengikat. Login memakai `login_handle`
-- (pseudonim, aturan sanitasi yang sama dengan `social_handle`). Email ada di
-- daftar keras PII bab 29 dan FIEZEL dipakai anak-anak. Menambahkannya demi
-- "pemulihan kata sandi" adalah keputusan owner tersendiri, bukan sesuatu yang
-- boleh diselundupkan lewat paket kerja ini. Konsekuensi yang diterima sadar:
-- murid yang lupa kata sandi butuh reset lewat guru/owner.
--
-- DAFTAR KERAS yang DIWARISI UTUH dari 0001_identity.sql dan 0006_social.sql
-- dan TIDAK BOLEH ditambahkan ke tabel mana pun di berkas ini: nama asli murid,
-- email, sekolah murid, umur, nomor HP, IP mentah, User-Agent, jawaban/riwayat/
-- transkrip, dan KOLOM TEKS BEBAS ANTAR PENGGUNA dalam bentuk apa pun.
--   * `notification` karena itu menyimpan `kind` (enum) + `actor_sub`, TANPA
--     kolom pesan. Naskahnya dirakit KLIEN dari i18n. Satu kolom `message TEXT`
--     akan menjadi saluran pesan tak termoderasi antar anak dalam satu rilis.
--   * `teacher_name`/`institution` DIIZINKAN karena itu teks yang diketik OWNER
--     tentang orang dewasa yang ia rekrut — bukan PII murid.
--
-- UNDANGAN GURU disimpan sebagai `code_hash` (sha256), TIDAK PERNAH teks. Token
-- undangan adalah kredensial: siapa pun yang membacanya menjadi guru, jadi dump
-- D1 tidak boleh cukup untuk memakainya. Statusnya (ACTIVE/USED/EXPIRED/REVOKED)
-- DITURUNKAN dari kolom waktu, bukan disimpan: status tersimpan yang butuh cron
-- untuk jadi benar akan berbohong setiap kali cron telat.

CREATE TABLE IF NOT EXISTS auth_account (
  sub TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'learner',
  login_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  institution_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_account_handle ON auth_account(login_handle);

CREATE TABLE IF NOT EXISTS auth_login_handle (
  handle TEXT PRIMARY KEY,
  sub TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS auth_credential (
  sub TEXT PRIMARY KEY,
  pass_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER
);

CREATE TABLE IF NOT EXISTS teacher_invite (
  code_hash TEXT PRIMARY KEY,
  teacher_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  used_at INTEGER,
  used_by TEXT,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS teacher_profile (
  sub TEXT PRIMARY KEY,
  teacher_name TEXT NOT NULL,
  institution TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  activated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_request (
  from_sub TEXT NOT NULL,
  to_sub TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_day TEXT NOT NULL,
  resolved_day TEXT,
  PRIMARY KEY (from_sub, to_sub)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS ix_friend_request_to ON friend_request(to_sub, status);

CREATE TABLE IF NOT EXISTS notification (
  id TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_sub TEXT,
  ref_id TEXT,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER
);

CREATE INDEX IF NOT EXISTS ix_notification_sub ON notification(sub, created_at);

CREATE TABLE IF NOT EXISTS push_subscription (
  endpoint_hash TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_push_subscription_sub ON push_subscription(sub);
