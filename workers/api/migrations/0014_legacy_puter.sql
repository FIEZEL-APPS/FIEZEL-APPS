-- Migrasi 0014: Legacy Puter ke Cloudflare D1
-- Menggantikan penyimpanan Puter KV dengan tabel D1 untuk CORE_DB (fiezel-core)

-- Tabel untuk push_subscriptions (menggantikan fiezel_push_v1_user_<uuid>)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    sub TEXT NOT NULL PRIMARY KEY,
    endpoint TEXT NOT NULL,
    keys_p256dh TEXT NOT NULL,
    keys_auth TEXT NOT NULL,
    learner_name TEXT DEFAULT '',
    activity TEXT DEFAULT '{}',
    last_push_at INTEGER DEFAULT 0,
    last_push_day TEXT DEFAULT '',
    last_push_status TEXT DEFAULT '',
    reminder_evidence TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Tabel untuk brain_attempts (menggantikan fiezel_push_v1_attempts_<uuid>)
CREATE TABLE IF NOT EXISTS brain_attempts (
    sub TEXT NOT NULL,
    attempt_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (sub, attempt_id)
);

-- Tabel untuk policy_outcomes (menggantikan fiezel_push_v1_outcomes_<uuid>)
CREATE TABLE IF NOT EXISTS policy_outcomes (
    sub TEXT NOT NULL,
    outcome_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (sub, outcome_id)
);

-- Tabel untuk feedback (menggantikan fiezel_push_v1_feedback)
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sub TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'feedback',
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Tabel untuk evolution_ledger (menggantikan fiezel_push_v1_evolution_ledger)
CREATE TABLE IF NOT EXISTS evolution_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
