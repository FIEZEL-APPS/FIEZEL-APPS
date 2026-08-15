#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/NEURAL-VOICE-SOURCE-LOCK.json"
OVERRIDE_REL="vendor/kokoro-js/source-overrides/phonemizer.js"
OVERRIDE="$ROOT/$OVERRIDE_REL"
OUT="$ROOT/.vendor-repro/kokoro.web.js"
BOOT="$ROOT/features/neural-voice/fiezel-neural-voice-bootstrap.js"
BUNDLE_REL="$(node -e "const x=require(process.argv[1]);process.stdout.write(x.runtime.bundle.path)" "$LOCK")"
BUNDLE="$ROOT/$BUNDLE_REL"

if [[ ! -f "$OVERRIDE" ]]; then
  echo "CANDIDATE FAIL: missing source-derived phonemizer override: $OVERRIDE_REL" >&2
  exit 1
fi

rm -rf "$ROOT/.vendor-repro"
set +e
bash "$ROOT/tools/rebuild-neural-vendor.sh"
FIRST_STATUS=$?
set -e

# A changed source override is expected to make the first verification fail because
# the committed vendor still represents the previous source lock. The important
# condition is that a complete rebuilt candidate exists.
if [[ ! -f "$OUT" ]]; then
  echo "CANDIDATE FAIL: rebuild did not produce $OUT (status=$FIRST_STATUS)" >&2
  exit 1
fi

NEW_SHA="$(sha256sum "$OUT" | awk '{print $1}')"
NEW_SIZE="$(stat -c '%s' "$OUT")"
OVERRIDE_SHA="$(sha256sum "$OVERRIDE" | awk '{print $1}')"

cp "$OUT" "$BUNDLE"
node - "$LOCK" "$OVERRIDE_REL" "$OVERRIDE_SHA" "$NEW_SHA" "$NEW_SIZE" <<'NODE'
const fs=require('fs');
const [lockPath,overridePath,overrideSha,bundleSha,bundleSize]=process.argv.slice(2);
const lock=JSON.parse(fs.readFileSync(lockPath,'utf8'));
lock.dependencies.phonemizerSourceOverride={
  path:overridePath,
  sha256:overrideSha,
  sourceRepository:lock.dependencies.phonemizerRepository,
  sourceCommit:lock.dependencies.phonemizerCommit,
  purpose:'m025-4 phase-only eSpeak lifecycle diagnostics; no prompt, phoneme, token, or external error-message payloads'
};
lock.runtime.bundle.sha256=bundleSha;
lock.runtime.bundle.sizeBytes=Number(bundleSize);
fs.writeFileSync(lockPath,JSON.stringify(lock,null,2)+'\n');
NODE

python3 - "$BOOT" "$NEW_SIZE" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); size=sys.argv[2]; s=p.read_text()
pattern=r"\{path:'vendor/kokoro-js/kokoro\.web\.js\?nv=m025-4',bytes:\d+\}"
replacement="{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-4',bytes:"+size+"}"
new,count=re.subn(pattern,replacement,s,count=1)
if count!=1:
    raise SystemExit(f'CANDIDATE FAIL: expected one m025-4 bootstrap vendor-size anchor, got {count}')
p.write_text(new)
PY

# The accepted candidate must immediately reproduce from source and the updated lock.
rm -rf "$ROOT/.vendor-repro"
bash "$ROOT/tools/rebuild-neural-vendor.sh"

echo "FIEZEL neural vendor candidate accepted from source"
echo "bundleSha256=$NEW_SHA"
echo "bundleSize=$NEW_SIZE"
echo "phonemizerOverrideSha256=$OVERRIDE_SHA"
