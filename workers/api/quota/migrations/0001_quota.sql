-- FIEZEL · workers/api/quota/migrations/0001_quota.sql
--
-- DDL kuota untuk jalur D1 free-tier-safe (cf-b3 §1.4, keputusan owner EXEC-BRIEF-CF.md
-- butir 2: PLAN GRATIS dulu). Dua tabel:
--
--   quota_daily        penghitung harian per pengguna (used + held)
--   quota_reservation  LEASE, pengganti manual mekanisme lease Durable Object
--
-- KEJUJURAN: skema ini menegakkan atomisitas lewat SATU pernyataan
-- `UPDATE … WHERE used + held < limit RETURNING …` (lihat quota-store-d1.js). Itu aman
-- karena satu database D1 "is inherently single-threaded, and processes queries one at a
-- time" (https://developers.cloudflare.com/d1/platform/limits/). Yang TIDAK bisa
-- dijanjikan: serializability seketat Durable Object lintas dua pernyataan, dan lease yang
-- dipanen otomatis. Karena itu `quota_reservation` WAJIB dibarengi Cron Trigger yang
-- memanggil `sweepExpiredReservations()` — jendela kebocoran slot = periode cron.
--
-- PRIVASI (bab 29 + KONTRAK ANALYTICS di EXEC-BRIEF-CF.md): tabel ini memakai `user_id`
-- dan DILARANG di-join dengan tabel analytics (yang memakai token harian). Tidak ada
-- kolom penghubung, tidak ada nama murid, tidak ada IP mentah, tidak ada teks prompt.

CREATE TABLE IF NOT EXISTS quota_daily (
  user_id            TEXT    NOT NULL,
  day                TEXT    NOT NULL,             -- 'YYYY-MM-DD' zona Asia/Jakarta (cf-b3 §3.2)

  -- used = sudah TERTAGIH (barang terkirim). held = DITAHAN oleh reservasi terbuka.
  -- Invarian: terpakai_efektif = used + held. Gerbang reserve memakai keduanya.
  ai_used            INTEGER NOT NULL DEFAULT 0,
  ai_held            INTEGER NOT NULL DEFAULT 0,
  ai_translate_used  INTEGER NOT NULL DEFAULT 0,   -- SUB-kuota, DI DALAM ai_used
  ai_translate_held  INTEGER NOT NULL DEFAULT 0,
  tts_calls_used     INTEGER NOT NULL DEFAULT 0,   -- cache-MISS saja; replay selalu gratis
  tts_calls_held     INTEGER NOT NULL DEFAULT 0,
  tts_chars_used     INTEGER NOT NULL DEFAULT 0,
  tts_chars_held     INTEGER NOT NULL DEFAULT 0,

  -- Audit kejujuran tagihan (cf-b3 §1.3). `rolled_back` dan `reaped` adalah bukti bahwa
  -- kegagalan provider tidak dibayar murid; kalau keduanya nol selamanya, itu mencurigakan.
  seq                INTEGER NOT NULL DEFAULT 0,
  committed          INTEGER NOT NULL DEFAULT 0,
  denied             INTEGER NOT NULL DEFAULT 0,
  rolled_back        INTEGER NOT NULL DEFAULT 0,
  reaped             INTEGER NOT NULL DEFAULT 0,
  touched_at         INTEGER NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, day)
);

-- Sweep harian/retensi: buang baris hari lampau tanpa memindai seluruh tabel.
CREATE INDEX IF NOT EXISTS idx_quota_daily_day ON quota_daily(day);

CREATE TABLE IF NOT EXISTS quota_reservation (
  id            TEXT    PRIMARY KEY,               -- dibuat SERVER (crypto.randomUUID), tidak pernah dari klien
  user_id       TEXT    NOT NULL,
  day           TEXT    NOT NULL,
  bucket        TEXT    NOT NULL,                  -- 'ai' | 'aiTranslate' | 'tts' | 'ttsCalls' | 'ttsChars'
  charges_json  TEXT    NOT NULL,                  -- {"ai":1} / {"ttsCalls":1,"ttsChars":438}
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL                   -- created_at + RESERVATION_TTL_MS (30.000 ms)
);

-- Jalur panas cron: DELETE ... WHERE expires_at <= ? ORDER BY expires_at LIMIT n
CREATE INDEX IF NOT EXISTS idx_quota_reservation_expires ON quota_reservation(expires_at);
-- Jalur rekonsiliasi held per pengguna/hari (menutup slot yatim, R1 di quota-store-d1.js)
CREATE INDEX IF NOT EXISTS idx_quota_reservation_user_day ON quota_reservation(user_id, day);
CREATE INDEX IF NOT EXISTS idx_quota_reservation_day ON quota_reservation(day);
