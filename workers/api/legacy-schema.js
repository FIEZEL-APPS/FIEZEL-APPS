/**
 * workers/api/legacy-schema.js — DDL runtime tabel warisan Puter (SLOT 5).
 *
 * Menerapkan DDL dari migrations/0014_legacy_puter.sql secara idempoten
 * (CREATE TABLE IF NOT EXISTS) ke binding CORE_DB saat isolate pertama berjalan,
 * mirip dengan workers/api/social-schema.js.
 */

export const LEGACY_TABLES = Object.freeze([
  'push_subscriptions',
  'brain_attempts',
  'policy_outcomes',
  'feedback',
  'evolution_ledger'
]);

export const LEGACY_DDL = Object.freeze([
  'CREATE TABLE IF NOT EXISTS push_subscriptions (' +
    ' sub TEXT NOT NULL PRIMARY KEY,' +
    ' endpoint TEXT NOT NULL,' +
    ' keys_p256dh TEXT NOT NULL,' +
    ' keys_auth TEXT NOT NULL,' +
    ' learner_name TEXT DEFAULT "",' +
    ' activity TEXT DEFAULT "{}",' +
    ' last_push_at INTEGER DEFAULT 0,' +
    ' last_push_day TEXT DEFAULT "",' +
    ' last_push_status TEXT DEFAULT "",' +
    ' reminder_evidence TEXT DEFAULT "[]",' +
    ' created_at INTEGER NOT NULL,' +
    ' updated_at INTEGER NOT NULL' +
    ' )',
  'CREATE TABLE IF NOT EXISTS brain_attempts (' +
    ' sub TEXT NOT NULL,' +
    ' attempt_id TEXT NOT NULL,' +
    ' data TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' PRIMARY KEY (sub, attempt_id)' +
    ' )',
  'CREATE TABLE IF NOT EXISTS policy_outcomes (' +
    ' sub TEXT NOT NULL,' +
    ' outcome_id TEXT NOT NULL,' +
    ' data TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL,' +
    ' PRIMARY KEY (sub, outcome_id)' +
    ' )',
  'CREATE TABLE IF NOT EXISTS feedback (' +
    ' id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    ' sub TEXT NOT NULL,' +
    ' kind TEXT NOT NULL DEFAULT "feedback",' +
    ' data TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL' +
    ' )',
  'CREATE TABLE IF NOT EXISTS evolution_ledger (' +
    ' id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    ' entry TEXT NOT NULL,' +
    ' created_at INTEGER NOT NULL' +
    ' )'
]);

const ENSURED = new WeakMap();

export function ensureLegacySchema(db) {
  if (!db || typeof db.prepare !== 'function') {
    return Promise.resolve(false);
  }
  let pending = ENSURED.get(db);
  if (!pending) {
    pending = (async () => {
      for (const statement of LEGACY_DDL) {
        await db.prepare(statement).run();
      }
      return true;
    })();
    ENSURED.set(db, pending);
    pending.catch(() => ENSURED.delete(db));
  }
  return pending;
}
