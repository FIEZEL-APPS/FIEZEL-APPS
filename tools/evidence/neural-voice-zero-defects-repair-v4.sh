#!/usr/bin/env bash
set -euo pipefail

V3="${1:?v3 repair script required}"
V2="${2:?v2 repair script required}"
LISTENING_TEMPLATE="${3:?listening timeout test template required}"
WORK=/tmp/neural-voice-zero-defects-repair-v2-build-flex.sh
cp "$V2" "$WORK"

python - "$WORK" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()

def one(old,new,label):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s=s.replace(old,new,1)

# Product candidate can lag main while evidence is running. Reconstruct it on current main,
# carrying only the target branch's commits since the real merge-base. This gives A11 a
# candidate that contains origin/main while preserving the audited multi-chunk work.
one(
    'git checkout -B repair "origin/$TARGET"\ntest "$(git rev-parse HEAD)" = "$EXPECTED"',
    '''PRODUCT_SHA="$(git rev-parse "origin/$TARGET")"
test "$PRODUCT_SHA" = "$EXPECTED"
PRODUCT_BASE="$(git merge-base origin/main "origin/$TARGET")"
mapfile -t PRODUCT_COMMITS < <(git rev-list --reverse "$PRODUCT_BASE".."origin/$TARGET")
test "${#PRODUCT_COMMITS[@]}" -gt 0
git checkout -B repair origin/main
for commit in "${PRODUCT_COMMITS[@]}"; do
  git cherry-pick "$commit"
done
# A11 invariant before repair: candidate ancestry must already include current main.
git merge-base --is-ancestor origin/main HEAD''',
    'rebase product candidate onto current main')

one(
    'test "$BUILD" = "m025-213"',
    '[[ "$BUILD" =~ ^m[0-9]+-[0-9]+$ ]]',
    'monotonic build assertion')

p.write_text(s)
PY

bash "$V3" "$WORK" "$LISTENING_TEMPLATE"
