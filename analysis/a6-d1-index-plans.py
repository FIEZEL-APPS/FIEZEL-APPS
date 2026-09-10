#!/usr/bin/env python3
"""A6/D1 — bukti indeks & ukuran baris untuk kedua database D1 FIEZEL.

NOL JARINGAN. Skema diambil PERSIS dari workers/api/migrations/*.sql, dijalankan
di SQLite lokal (D1 adalah SQLite), lalu:
  1. EXPLAIN QUERY PLAN setiap kueri panas — sebelum dan sesudah 0004_indexes.sql.
  2. Ukuran byte per baris diukur nyata: 20.000 baris sintetis + VACUUM.

Jalankan dari akar repo:  python3 analysis/a6-d1-index-plans.py
Keluaran:                 analysis/a6-d1-index-plans.json
"""
import sqlite3, pathlib, json, os, uuid, hashlib, random

base = pathlib.Path('workers/api/migrations')

def db(files, extra=None):
    p = '/tmp/a6d1-%d.db' % random.randint(0, 10**9)
    c = sqlite3.connect(p)
    for f in files:
        c.executescript(open(base / f).read())
    if extra:
        c.executescript(extra)
    c.commit(); c.execute('VACUUM'); c.commit()
    return c, p, os.path.getsize(p)

def plans(c, qs):
    return [{"kueri": l, "sql": s,
             "plan": [r[3] for r in c.execute("EXPLAIN QUERY PLAN " + s, [1] * s.count('?'))]}
            for l, s in qs]

CORE = [
 ("reserve gate (jalur panas)", "UPDATE quota_daily SET ai_held = ai_held + ?, touched_at = ? WHERE user_id = ? AND day = ? AND ai_used + ai_held + ? <= ?"),
 ("baca baris kuota (denyScope/loadState)", "SELECT * FROM quota_daily WHERE user_id = ? AND day = ?"),
 ("reconcileHeld: user hari ini", "SELECT user_id FROM quota_daily WHERE day = ?"),
 ("retensi quota_daily (batched)", "DELETE FROM quota_daily WHERE rowid IN (SELECT rowid FROM quota_daily WHERE day < ? LIMIT 500)"),
 ("sweep lease kedaluwarsa", "SELECT * FROM quota_reservation WHERE expires_at <= ? ORDER BY expires_at LIMIT ?"),
 ("lease per token (commit/rollback)", "SELECT * FROM quota_reservation WHERE id = ? AND user_id = ?"),
 ("lease per hari (reconcileHeld)", "SELECT * FROM quota_reservation WHERE day = ?"),
 ("lease per user+hari (loadState)", "SELECT * FROM quota_reservation WHERE user_id = ? AND day = ?"),
 ("identity per sub", "SELECT sub, created_at FROM identity WHERE sub = ?"),
 ("identity touch last_seen", "UPDATE identity SET last_seen_day = ? WHERE sub = ? AND last_seen_day <> ?"),
 ("identity per legacy_ref_hmac (klaim)", "SELECT sub FROM identity WHERE legacy_ref_hmac = ?"),
 ("retensi session (batched)", "DELETE FROM session WHERE rowid IN (SELECT rowid FROM session WHERE expires_at < ? LIMIT 500)"),
 ("retensi anon_issue (batched)", "DELETE FROM anon_issue WHERE (day, ip_hmac) IN (SELECT day, ip_hmac FROM anon_issue WHERE day < ? LIMIT 1000)"),
 ("scrub issue_ip_hmac (batched)", "UPDATE identity SET issue_ip_hmac = NULL WHERE rowid IN (SELECT rowid FROM identity WHERE issue_ip_hmac IS NOT NULL AND created_at < ? LIMIT 500)"),
]
STATS = [
 ("baca rentang metrik (dasbor)", "SELECT day, value FROM metrics_daily WHERE metric = ? AND day >= ? AND day <= ? ORDER BY day"),
 ("hitung DAU (rollup)", "SELECT COUNT(*) AS n FROM dau_dedup WHERE day = ?"),
 ("purge dau hari itu (rollup)", "DELETE FROM dau_dedup WHERE day = ?"),
 ("purge dau lama (batched)", "DELETE FROM dau_dedup WHERE (day, token) IN (SELECT day, token FROM dau_dedup WHERE day <= ? LIMIT 1000)"),
 ("purge usage lama", "DELETE FROM usage_daily WHERE day < ?"),
 ("purge retention lama", "DELETE FROM retention_daily WHERE cohort_day < ?"),
 ("baca pepper", "SELECT rotated_at, current, previous FROM pepper_state WHERE id = 1"),
]
AFTER = open(base / '0004_indexes.sql').read()

N = 20000
def bytes_per_row(files, extra, ins, args):
    c, p, b0 = db(files, extra)
    for i in range(N):
        c.execute(ins, args(i))
    c.commit(); c.execute('VACUUM'); c.commit()
    return round((os.path.getsize(p) - b0) / N, 1)

u = lambda i: str(uuid.uuid4())
h = lambda i: hashlib.sha256(str(i).encode()).hexdigest()
QD = "INSERT INTO quota_daily(user_id,day,ai_used,ai_held,tts_chars_used,seq,committed,denied,rolled_back,reaped,touched_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)"
QDa = lambda i: (u(i), '2026-08-27', 18, 0, 5400, 22, 20, 2, 1, 1, 1756300000000)
QR = "INSERT INTO quota_reservation(id,user_id,day,bucket,charges_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)"
QRa = lambda i: (u(i), u(i), '2026-08-27', 'tts', '{"ttsCalls":1,"ttsChars":438}', 1756300000000, 1756300030000)

size = {
 "quota_daily (indeks day — sebelum 0004)": bytes_per_row(['0001_quota.sql'], None, QD, QDa),
 "quota_daily (indeks day,user_id — sesudah 0004)": bytes_per_row(['0001_quota.sql'], "DROP INDEX idx_quota_daily_day; CREATE INDEX idx_quota_daily_day_user ON quota_daily(day,user_id);", QD, QDa),
 "quota_reservation (3 indeks — sebelum 0004)": bytes_per_row(['0001_quota.sql'], None, QR, QRa),
 "quota_reservation (2 indeks — sesudah 0004)": bytes_per_row(['0001_quota.sql'], "CREATE INDEX idx_quota_reservation_day_user ON quota_reservation(day,user_id); DROP INDEX idx_quota_reservation_day; DROP INDEX idx_quota_reservation_user_day;", QR, QRa),
 "identity": bytes_per_row(['0001_identity.sql'], None, "INSERT INTO identity(sub,created_at,last_seen_day,class,plan,kid,legacy_ref_hmac,issue_ip_hmac) VALUES(?,?,?,?,?,?,?,?)", lambda i: (u(i), 1756300000000, '2026-08-27', 'learner', 'free', 2, h(i), h(i)[:32])),
 "session": bytes_per_row(['0001_identity.sql'], None, "INSERT INTO session(sid,sub,issued_at,expires_at) VALUES(?,?,?,?)", lambda i: (h(i)[:32], u(i), 1756300000000, 1756300000000 + 2592000000)),
 "anon_issue": bytes_per_row(['0001_identity.sql'], None, "INSERT INTO anon_issue(day,ip_hmac,issued) VALUES(?,?,?)", lambda i: ('2026-08-27', h(i)[:32], 3)),
 "dau_dedup": bytes_per_row(['0002_analytics.sql'], None, "INSERT INTO dau_dedup(day,token) VALUES(?,?)", lambda i: ('2026-08-27', h(i)[:32])),
 "metrics_daily (+idx_metrics_metric)": bytes_per_row(['0002_analytics.sql'], None, "INSERT INTO metrics_daily(day,metric,value) VALUES(?,?,?)", lambda i: ('2026-08-%02d' % (1 + i % 28), 'ai_calls_%d' % i, 12345)),
 "usage_daily": bytes_per_row(['0002_analytics.sql'], None, "INSERT INTO usage_daily(day,bucket,count) VALUES(?,?,?)", lambda i: ('2026-08-%02d' % (1 + i % 28), 'lesson_domain:grammar_%d' % i, 123)),
 "retention_daily (+idx_retention_cohort)": bytes_per_row(['0002_analytics.sql'], None, "INSERT INTO retention_daily(cohort_day,day_index,count) VALUES(?,?,?)", lambda i: ('2026-08-%02d' % (1 + i % 28), i, 45)),
}

c1, _, _ = db(['0001_identity.sql', '0001_quota.sql'])
c2, _, _ = db(['0001_identity.sql', '0001_quota.sql'], AFTER)
c3, _, _ = db(['0002_analytics.sql'])
rep = {
 "schema": "fiezel-a6-d1-index-plans-v1",
 "cara_reproduksi": "python3 analysis/a6-d1-index-plans.py (SQLite lokal, nol jaringan)",
 "catatan": "D1 adalah SQLite, jadi EXPLAIN QUERY PLAN di sini adalah bukti STRUKTURAL (indeks mana yang dipakai), bukan bukti latensi produksi.",
 "sqlite_version": sqlite3.sqlite_version,
 "fiezel-core (sebelum 0004)": plans(c1, CORE),
 "fiezel-core (sesudah 0004)": plans(c2, CORE),
 "fiezel-stats (tidak diubah 0004)": plans(c3, STATS),
 "byte_per_baris_terukur_20000_baris_sesudah_VACUUM": size,
}
json.dump(rep, open('analysis/a6-d1-index-plans.json', 'w'), indent=1, ensure_ascii=False)
scans = [p["kueri"] for p in rep["fiezel-core (sesudah 0004)"] + rep["fiezel-stats (tidak diubah 0004)"]
         if any('SCAN' in x for x in p["plan"])]
print("kueri tanpa indeks pendukung (SCAN):", scans or "tidak ada")
print(json.dumps(size, indent=1, ensure_ascii=False))
