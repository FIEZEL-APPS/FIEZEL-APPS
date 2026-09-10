#!/usr/bin/env bash
# tools/config-consistency-redproof.sh — BUKTI bahwa tests/config-consistency-test.js bisa MERAH.
#
# Gerbang yang tidak pernah terbukti gagal adalah dekorasi. Skrip ini merusak SATU nilai per
# kasus, menjalankan gerbang, lalu MEMULIHKAN berkas dari git (`git checkout --`) sebelum
# kasus berikutnya. Ia tidak pernah meninggalkan perubahan: setiap kasus memulihkan dirinya,
# dan di akhir skrip `git status --porcelain` untuk berkas terkait harus kosong.
#
# Pakai: bash tools/config-consistency-redproof.sh   (dari akar repo)
set -u
cd "$(dirname "$0")/.."

GATE="tests/config-consistency-test.js"
RUNBOOK="docs/CF-MIGRATION-RUNBOOK.md"
TOML="workers/api/wrangler.toml"
QUOTA="workers/api/quota/quota-config.js"
FLOW=".github/workflows/quality.yml"

restore() { git checkout -- "$RUNBOOK" "$TOML" "$QUOTA" "$FLOW" 2>/dev/null; }

run_case() {
  local name="$1"; shift
  "$@" >/dev/null 2>&1
  node "$GATE" >/tmp/redproof-out.txt 2>&1
  local code=$?
  local first_fail
  first_fail=$(grep -m1 '❌' /tmp/redproof-out.txt | sed 's/^❌ //')
  restore
  if [ "$code" -eq 0 ]; then
    printf '| %s | exit 0 | ❌ TIDAK TERDETEKSI (gerbang buta) |\n' "$name"
    FAILED_PROOF=1
  else
    printf '| %s | exit %s | %s |\n' "$name" "$code" "${first_fail:0:120}"
  fi
}

FAILED_PROOF=0
echo "| Kerusakan yang disuntikkan | Hasil gerbang | Pemeriksaan pertama yang merah |"
echo "|---|---|---|"

run_case 'wrangler AI_LIMIT_PER_DAY 25 -> 20 (naskah diturunkan sepihak)' \
  sed -i 's/^AI_LIMIT_PER_DAY  = "25"/AI_LIMIT_PER_DAY  = "20"/' "$TOML"

run_case 'wrangler TTS_CHARS_PER_DAY 12000 -> 6000 (naskah diturunkan sepihak)' \
  sed -i 's/^TTS_CHARS_PER_DAY = "12000"/TTS_CHARS_PER_DAY = "6000"/' "$TOML"

run_case 'quota-config FREE_AI_DAILY_LIMIT 25 -> 20 (penegakan diturunkan sepihak)' \
  sed -i 's/FREE_AI_DAILY_LIMIT: 25,/FREE_AI_DAILY_LIMIT: 20,/' "$QUOTA"

run_case 'quota-config FREE_TTS_DAILY_CHARS 12000 -> 20000 (penegakan dinaikkan sepihak)' \
  sed -i 's/FREE_TTS_DAILY_CHARS: 12000,/FREE_TTS_DAILY_CHARS: 20000,/' "$QUOTA"

# Suntikan ini memakai python, bukan sed: argumen JSON penuh kutip tunggal/ganda, dan sed yang
# gagal mencocokkan akan diam-diam TIDAK mengubah apa pun — kasus uji yang tidak menyuntik
# apa-apa akan terbaca sebagai "gerbang buta" padahal gerbangnya tidak pernah diuji.
inject_flat_kv() {
  python3 - "$RUNBOOK" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
good = '\'{"flags":{"cfApiEnabled":false,"cfAiEnabled":false,"cfTtsEnabled":false,"cfQuotaEnabled":false,"cfAnalyticsEnabled":false,"cfIdentityEnabled":false},"enabled":{"ai":false,"tts":false,"coach":false,"analytics":false}}\''
bad = '\'{"transport":"off","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}\''
assert good in s, 'contoh KV bersarang tidak ditemukan — skrip bukti perlu diperbarui'
open(p, 'w').write(s.replace(good, bad, 1))
PY
}

run_case 'runbook: kembalikan bentuk KV DATAR {"transport":"off",...}' inject_flat_kv

run_case 'runbook: satu nilai boolean diganti string "off"' \
  sed -i '0,/"cfTtsEnabled":false/s//"cfTtsEnabled":"off"/' "$RUNBOOK"

run_case 'runbook: kunci flag karangan cfCoachEnabled' \
  sed -i '0,/"cfQuotaEnabled":false/s//"cfCoachEnabled":false/' "$RUNBOOK"

run_case 'quality.yml: gerbang dihapus dari daftar' \
  sed -i '/node tests/config-consistency-test.js/d' "$FLOW"

restore
echo
if [ -n "$(git status --porcelain -- "$RUNBOOK" "$TOML" "$QUOTA" "$FLOW")" ]; then
  echo "PERINGATAN: masih ada perubahan tersisa setelah pemulihan — periksa git status."
  exit 2
fi
node "$GATE" >/dev/null 2>&1
BASE=$?
echo "Baseline setelah semua pemulihan: node $GATE exit $BASE (harus 0)"
[ "$BASE" -eq 0 ] && [ "$FAILED_PROOF" -eq 0 ] && echo "BUKTI MERAH: LENGKAP" || echo "BUKTI MERAH: TIDAK LENGKAP"
exit $(( BASE != 0 || FAILED_PROOF != 0 ))
