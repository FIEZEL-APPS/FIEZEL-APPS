-- ============================================================================
-- FIEZEL — migrasi 0017: indeks pencarian teman terbalik (b, a, since_day)
-- DATABASE TUJUAN: `fiezel-core` (binding CORE_DB).
--
--   cd workers/api
--   wrangler d1 execute fiezel-core --remote --file=migrations/0017_social_friend_idx.sql
--
-- Menambahkan indeks untuk mempercepat kueri tepi teman masuk di social_friend:
-- SELECT a, since_day FROM social_friend WHERE b = ?1 LIMIT 200
-- ============================================================================

-- DIPAKAI OLEH: workers/api/route-social.js friendEdges()
--   'SELECT a, since_day FROM social_friend WHERE b = ?1 LIMIT 200'
CREATE INDEX IF NOT EXISTS idx_social_friend_b ON social_friend (b, a, since_day);
