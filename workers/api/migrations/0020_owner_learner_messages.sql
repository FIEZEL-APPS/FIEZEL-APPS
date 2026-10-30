-- 0020_owner_learner_messages.sql: Sistem pesan 2-arah antara Owner dan Murid + lampiran GEM
-- Database tujuan: fiezel-core (CORE_DB)
CREATE TABLE IF NOT EXISTS owner_learner_message (
  id TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  sender TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  gem_amount INTEGER NOT NULL DEFAULT 0,
  gem_grant_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  reply_to_id TEXT,
  created_at INTEGER NOT NULL
);

-- DIPAKAI OLEH: workers/api/route-learner-messages.js getLearnerMessages()
--   'SELECT id, sub, sender, title, content, gem_amount, is_read, reply_to_id, created_at FROM owner_learner_message WHERE sub = ?1 ORDER BY created_at ASC'
CREATE INDEX IF NOT EXISTS ix_owner_msg_sub_created ON owner_learner_message (sub, created_at);

-- DIPAKAI OLEH: workers/api/route-learner-messages.js getUnreadOwnerMessageCount()
--   'SELECT COUNT(*) AS c FROM owner_learner_message WHERE sub = ?1 AND is_read = 0 AND sender = ?2'
CREATE INDEX IF NOT EXISTS ix_owner_msg_unread ON owner_learner_message (sub, is_read, sender);
