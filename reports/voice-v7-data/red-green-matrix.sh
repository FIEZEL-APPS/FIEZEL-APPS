#!/usr/bin/env bash
# Matriks merah/hijau untuk assert BARU di tests/voice-callsite-prefetch-test.js (c9, c10, f1-f9).
#
# Cara kerjanya: setiap mutasi merusak SATU perilaku di features/library/fiezel-library-ui.js,
# lalu tes dijalankan. Assert yang diharapkan merah harus benar-benar merah, dan sesudah
# berkas dipulihkan seluruh tes harus hijau lagi. Assert yang tidak pernah bisa merah bukan
# gerbang, itu hiasan.
set -u
cd "$(dirname "$0")/../.." || exit 1
LIB=features/library/fiezel-library-ui.js
BAK=/tmp/lib-red-green.bak
cp "$LIB" "$BAK"

run_case() {
  local name="$1"; local expect="$2"; shift 2
  cp "$BAK" "$LIB"
  "$@"
  local out; out=$(node tests/voice-callsite-prefetch-test.js 2>&1)
  local failed; failed=$(printf '%s\n' "$out" | grep '^FAIL' | sed 's/^FAIL - \([a-z0-9]*\) .*/\1/' | tr '\n' ' ')
  local verdict="MERAH SESUAI HARAPAN"
  case " $failed " in *" $expect "*) ;; *) verdict="TIDAK MERAH - ASSERT INI BUKAN GERBANG" ;; esac
  printf '%-6s | mutasi: %-52s | gagal: %-22s | %s\n' "$expect" "$name" "${failed:-(tidak ada)}" "$verdict"
  cp "$BAK" "$LIB"
}

edit() { python3 - "$@" <<'PY'
import sys, re
path, mode, pat, rep = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src = open(path).read()
if mode == 'del':
    new = re.sub(re.escape(pat) + r'[^\n]*\n', '', src, count=1)
else:
    new = src.replace(pat, rep, 1)
assert new != src, 'mutasi tidak kena: ' + pat
open(path, 'w').write(new)
PY
}

echo "=== MATRIKS MERAH/HIJAU assert baru V7 ==="
run_case "kelonggaran dinaikkan ke 1,20 s"              c9  edit $LIB sub 'var BOUNDARY_SLACK_S = 0.80;' 'var BOUNDARY_SLACK_S = 1.20;'
run_case "anggaran dipaku di blok pembuka (tangga mati)"      c10 edit $LIB sub 'return Math.min(BLOCK_MAX_CHARS, budget);' 'return LEAD_BLOCK_CHARS;'
run_case "kursor kirim maju ke block.from, bukan .to"   f1  edit $LIB sub 'dispatchedThrough = block.to;' 'dispatchedThrough = block.from;'
run_case "penjaga lompatan urutan dihapus"              f2  edit $LIB del 'if (block.from !== dispatchedThrough + 1)' x
run_case "penjaga replay dihapus"                       f3  edit $LIB del 'if (block.from <= dispatchedThrough)' x
run_case "penjaga penghenti dihapus (narrating/token)"  f4  edit $LIB del 'if (!narrating || token !== narrationToken) { dispatchRejects.stopped++;' x
run_case "penjaga penghenti dihapus (token lama lolos)" f5  edit $LIB del 'if (!narrating || token !== narrationToken) { dispatchRejects.stopped++;' x
run_case "penjaga prefetch-terlambat dihapus"           f6  edit $LIB del 'if (index != null && Number(index) <= dispatchedThrough)' x
run_case "prefetch menganggur tidak cek token lagi"     f7  edit $LIB del 'if (!narrating || token !== narrationToken || !session) return;' x
run_case "narrate() memanggil speak() langsung"         f8  edit $LIB sub 'var speaking = dispatchBlock(block, token);' 'var speaking = dispatchBlock(block, token); if (!speaking && false) speak(block.text);'
run_case "stopNarration tidak mereset kursor kirim"     f9  edit $LIB del 'resetDispatchCursor(null);' x

cp "$BAK" "$LIB"
echo "--- pulih: seluruh tes harus hijau lagi ---"
node tests/voice-callsite-prefetch-test.js 2>&1 | tail -1
