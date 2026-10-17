-- ============================================================================
-- FIEZEL — migrasi 0018: bucket kuota SENDIRI untuk Ngobrol AI (aiChat)
-- DATABASE TUJUAN: `fiezel-core` (binding CORE_DB).
--
--   cd workers/api
--   wrangler d1 execute fiezel-core --remote --file=migrations/0018_quota_ai_chat.sql
--
-- URUTAN DEPLOY WAJIB: terapkan berkas ini SEBELUM men-deploy Worker yang memuat
-- `COLUMN.aiChat` (quota/quota-store-d1.js). `reconcileHeld()` menulis `ai_chat_held`
-- untuk setiap murid; Worker baru di atas database lama membuat rekonsiliasi gagal.
--
-- Alasan (keputusan owner 17 Okt 2026, reports/audit-ngobrol-ai-2026-10-17.md):
-- satu giliran ngobrol = satu permintaan AI, jadi chat tidak boleh memakan jatah
-- `ai` (25/hari) milik penjelasan tutor. Batasnya FREE_AI_CHAT_DAILY di quota-config.js.
-- Sekali jalan: SQLite tidak punya `ADD COLUMN IF NOT EXISTS`, jadi menjalankan ulang
-- berkas ini menolak dengan "duplicate column" dan tidak mengubah apa pun.
-- ============================================================================

-- DIPAKAI OLEH: workers/api/quota/quota-store-d1.js COLUMN.aiChat
ALTER TABLE quota_daily ADD COLUMN ai_chat_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE quota_daily ADD COLUMN ai_chat_held INTEGER NOT NULL DEFAULT 0;
