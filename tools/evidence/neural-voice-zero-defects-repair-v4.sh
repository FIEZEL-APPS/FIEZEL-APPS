#!/usr/bin/env bash
set -euo pipefail

V3="${1:?v3 repair script required}"
V2="${2:?v2 repair script required}"
LISTENING_TEMPLATE="${3:?listening timeout test template required}"
WORK=/tmp/neural-voice-zero-defects-repair-v2-build-flex.sh
cp "$V2" "$WORK"

python - "$WORK" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
s=p.read_text()
old='test "$BUILD" = "m025-213"'
if s.count(old) != 1:
    raise SystemExit(f'legacy fixed-build assertion count={s.count(old)}')
# Build ownership is monotonic and main can advance while an isolated repair is being audited.
# Validate the release token shape; bump-build.mjs --check already verifies cross-file coherence.
s=s.replace(old, '[[ "$BUILD" =~ ^m[0-9]+-[0-9]+$ ]]', 1)
p.write_text(s)
PY

bash "$V3" "$WORK" "$LISTENING_TEMPLATE"
