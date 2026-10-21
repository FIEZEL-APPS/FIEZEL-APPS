-- 0001_identity.sql — skema identitas & sesi fiezel-api (cf-b2 §4).
--
-- PRINSIP: D1 = fakta identitas yang JARANG berubah. Penghitung yang sering
-- berubah (kuota) TIDAK boleh tinggal di tabel ini — D1 single-threaded per
-- database, dan menaruh counter di sini akan menyerialisasi seluruh login di
-- belakang pemakaian AI.
--
-- PLAN GRATIS: `last_seen_day` ditulis maksimum SEKALI per sub per hari.
-- Jangan pernah menambah kolom yang perlu ditulis setiap request.
--
-- DAFTAR KERAS yang TIDAK BOLEH ditambahkan ke tabel ini (bab 29):
-- nama/nama panggilan/email/sekolah/umur, IP mentah, User-Agent, bahasa,
-- resolusi, zona waktu presisi, uuid Puter mentah, jawaban/riwayat/transkrip AI,
-- password atau token apa pun. Kolom baru = butuh persetujuan owner + satu baris
-- di dokumen data yang dikumpulkan.

CREATE TABLE IF NOT EXISTS identity (
  sub               TEXT    PRIMARY KEY,                    -- UUIDv4 acak, diterbitkan SERVER
  created_at        INTEGER NOT NULL,                       -- epoch ms, jam server
  last_seen_day     TEXT    NOT NULL,                       -- 'YYYY-MM-DD' WIB (cf-c1 K15)
  class             TEXT    NOT NULL DEFAULT 'visitor',     -- 'visitor'|'learner'|'auth'
  plan              TEXT    NOT NULL DEFAULT 'free',        -- 'free'|'plus' (pembayaran MATI)
  kid               INTEGER NOT NULL DEFAULT 2,             -- versi secret penanda fz_id
  account_id        TEXT,                                   -- NULL sampai klaim; 'p:<hmac>' transisi
  legacy_ref_hmac   TEXT,                                   -- HMAC(uuid Puter, PEPPER); DI-DROP saat Puter dicabut
  issue_ip_hmac     TEXT,                                   -- HMAC(ip, salt harian); DI-NULL-kan cron <= 24 jam
  turnstile_at      INTEGER,                                -- NULL = belum pernah lolos
  revoked_at        INTEGER                                 -- "lupakan perangkat ini"
);

-- UNIQUE: satu akun Puter tidak boleh terikat ke dua identitas. Ini yang membuat
-- klaim kedua dari perangkat lain MENGADOPSI sub yang sudah ada, bukan membuat
-- identitas (dan kuota) baru.
CREATE UNIQUE INDEX IF NOT EXISTS ux_identity_legacy  ON identity(legacy_ref_hmac) WHERE legacy_ref_hmac IS NOT NULL;
CREATE        INDEX IF NOT EXISTS ix_identity_account ON identity(account_id)      WHERE account_id      IS NOT NULL;
CREATE        INDEX IF NOT EXISTS ix_identity_seen    ON identity(last_seen_day);

CREATE TABLE IF NOT EXISTS session (
  sid          TEXT    PRIMARY KEY,        -- 128-bit acak, opaque, TANPA klaim di dalamnya
  sub          TEXT    NOT NULL REFERENCES identity(sub) ON DELETE CASCADE,
  issued_at    INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,           -- sliding, maksimum issued_at + 30 hari (absolut)
  refreshed_at INTEGER,
  rotated_from TEXT,                       -- sid sebelumnya: deteksi replay
  revoked_at   INTEGER
);
CREATE INDEX IF NOT EXISTS ix_session_sub     ON session(sub);
CREATE INDEX IF NOT EXISTS ix_session_expires ON session(expires_at);

-- Lapis 2 penahan reset identitas: rem penerbitan identitas anonim per hari per
-- IP ter-HMAC. Salt dirotasi harian, jadi ember ini TIDAK bisa dipakai melacak
-- orang antar hari — itu batasnya, dan itu memang tujuannya.
CREATE TABLE IF NOT EXISTS anon_issue (
  day     TEXT    NOT NULL,
  ip_hmac TEXT    NOT NULL,
  issued  INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (day, ip_hmac)
) WITHOUT ROWID;
