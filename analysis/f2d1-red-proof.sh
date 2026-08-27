#!/usr/bin/env bash
# F2/D1 — BUKTI GERBANG MASIH BISA MERAH.
#
# Gerbang yang hanya bisa hijau tidak membuktikan apa pun. Skrip ini menyuntikkan
# tiga cacat satu per satu, menunjukkan gerbang MERAH untuk masing-masing, lalu
# MEMULIHKAN repo ke keadaan semula (git checkout / rm) dan menunjukkan hijau lagi.
#
# Jalankan dari akar repo:  bash analysis/f2d1-red-proof.sh
set -u
cd "$(dirname "$0")/.."
GATE=d1-schema-contract-test.js

say() { printf '\n=== %s ===\n' "$1"; }
status() { node "$GATE" >/tmp/f2d1-gate.out 2>/tmp/f2d1-gate.err; echo "exit=$?"; tail -4 /tmp/f2d1-gate.err; }

say "0. BASELINE (harus LULUS)"
status

# --------------------------------------------------------------------------
say "1. TABEL PALSU: kode memakai tabel yang tidak punya migrasi (harus MERAH)"
cat > workers/api/red-proof-fake-table.js <<'JS'
// SUNTIKAN UJI SEMENTARA — dihapus oleh analysis/f2d1-red-proof.sh
export const FAKE_SQL = 'SELECT day FROM ghost_table WHERE day = ?1';
JS
status
node -e '
const r = require("./D1-SCHEMA-CONTRACT-REPORT.json");
const c = r.checks.find((x) => x.name === "setiap_tabel_yang_dipakai_kode_ada_di_migrasi");
console.log("cek:", c.name, "ok=", c.ok, JSON.stringify(c.details.tanpa_migrasi));
'
rm -f workers/api/red-proof-fake-table.js

# --------------------------------------------------------------------------
say "2. MIGRASI TIDAK TERDAFTAR: berkas .sql baru tanpa perintah di MIGRATIONS.md (harus MERAH)"
cat > workers/api/migrations/0005_red_proof.sql <<'SQL'
-- SUNTIKAN UJI SEMENTARA — dihapus oleh analysis/f2d1-red-proof.sh
CREATE TABLE IF NOT EXISTS red_proof_ghost (day TEXT NOT NULL);
SQL
status
node -e '
const r = require("./D1-SCHEMA-CONTRACT-REPORT.json");
const c = r.checks.find((x) => x.name === "semua_berkas_migrasi_terbaca");
console.log("cek:", c.name, "ok=", c.ok, "tidak_terpetakan=", JSON.stringify(c.details.tidak_terpetakan));
'
echo "-- pembanding skema juga harus KELUAR 2 (bukan membandingkan skema separuh):"
echo '[]' | node tools/d1-schema-check.mjs --db core >/dev/null 2>/tmp/f2d1-checker.err; echo "checker exit=$?"; cat /tmp/f2d1-checker.err
rm -f workers/api/migrations/0005_red_proof.sql

# --------------------------------------------------------------------------
say "3. INDEKS TANPA KUERI: kembalikan idx_cron_run_job_day + klaim komentar BOHONG (harus MERAH)"
python3 - <<'PY'
import io
p = 'workers/api/migrations/0003_cron.sql'
s = io.open(p, encoding='utf-8').read()
inject = (
    "-- DIPAKAI OLEH: cron-status.js (KLAIM PALSU untuk uji merah)\n"
    "--   'SELECT job FROM cron_run WHERE job = ?1 ORDER BY started_at'\n"
    "CREATE INDEX IF NOT EXISTS idx_cron_run_job_day ON cron_run(job, day);\n\n"
)
marker = "-- Jalur panas ringkasan owner"
s = s.replace(marker, inject + marker, 1)
io.open(p, 'w', encoding='utf-8').write(s)
PY
status
node -e '
const r = require("./D1-SCHEMA-CONTRACT-REPORT.json");
const c = r.checks.find((x) => x.name === "setiap_indeks_baru_punya_kueri_yang_memakainya");
console.log("cek:", c.name, "ok=", c.ok, JSON.stringify(c.details.tanpa_bukti, null, 1));
'
git checkout -- workers/api/migrations/0003_cron.sql

# --------------------------------------------------------------------------
say "4. PULIH: repo kembali bersih (harus LULUS lagi)"
status
git status --porcelain workers/api d1-schema-contract-test.js tools || true
