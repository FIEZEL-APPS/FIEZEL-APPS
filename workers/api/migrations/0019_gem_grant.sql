-- 0019_gem_grant.sql: Injeksi & klaim reward GEM per-murid dari server
-- Database tujuan: fiezel-core (CORE_DB)
CREATE TABLE IF NOT EXISTS gem_grant (
  id TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  granted_by TEXT NOT NULL DEFAULT 'admin',
  created_at INTEGER NOT NULL,
  claimed_at INTEGER
);

-- DIPAKAI OLEH: workers/api/route-gem-grant.js routeGemsClaim()
--   'SELECT id, amount, reason, created_at FROM gem_grant WHERE sub = ?1 AND claimed_at IS NULL ORDER BY created_at ASC'
CREATE INDEX IF NOT EXISTS ix_gem_grant_sub_unclaimed ON gem_grant (sub, claimed_at);
