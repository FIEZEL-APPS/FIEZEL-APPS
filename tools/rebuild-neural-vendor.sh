#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$ROOT/NEURAL-VOICE-SOURCE-LOCK.json"
OUT_DIR="${FIEZEL_VENDOR_REPRO_OUT:-$ROOT/.vendor-repro}"
WORK_DIR="${FIEZEL_VENDOR_REPRO_WORK:-$(mktemp -d)}"
KEEP_WORK="${FIEZEL_VENDOR_REPRO_KEEP_WORK:-0}"

cleanup() {
  if [[ "$KEEP_WORK" != "1" ]]; then rm -rf "$WORK_DIR"; fi
}
trap cleanup EXIT

read_lock() {
  node -e "const x=require(process.argv[1]); const p=process.argv[2].split('.'); let v=x; for(const k of p)v=v[k]; if(v==null)process.exit(2); process.stdout.write(String(v));" "$LOCK" "$1"
}

PROVIDER_REPO="$(read_lock provider.repository)"
PROVIDER_COMMIT="$(read_lock provider.commit)"
EXPECTED_SHA="$(read_lock runtime.bundle.sha256)"
EXPECTED_SIZE="$(read_lock runtime.bundle.sizeBytes)"
PHONEMIZER_VERSION="$(read_lock dependencies.phonemizer)"
COMMITTED_BUNDLE="$ROOT/$(read_lock runtime.bundle.path)"

if [[ "$PROVIDER_REPO" != "hexgrad/kokoro" ]]; then
  echo "REPRO FAIL: unexpected provider repository: $PROVIDER_REPO" >&2
  exit 1
fi
if [[ "$PHONEMIZER_VERSION" != "1.2.1" ]]; then
  echo "REPRO FAIL: unexpected phonemizer lock: $PHONEMIZER_VERSION" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/kokoro.web.js" "$OUT_DIR/repro-report.txt" "$OUT_DIR/diff-summary.txt"

COMMITTED_SHA="$(sha256sum "$COMMITTED_BUNDLE" | awk '{print $1}')"
COMMITTED_SIZE="$(stat -c '%s' "$COMMITTED_BUNDLE")"
if [[ "$COMMITTED_SHA" != "$EXPECTED_SHA" || "$COMMITTED_SIZE" != "$EXPECTED_SIZE" ]]; then
  echo "REPRO FAIL: committed vendor does not match NEURAL-VOICE-SOURCE-LOCK.json" >&2
  echo "expected sha=$EXPECTED_SHA size=$EXPECTED_SIZE" >&2
  echo "actual   sha=$COMMITTED_SHA size=$COMMITTED_SIZE" >&2
  exit 1
fi

echo "[repro] cloning $PROVIDER_REPO@$PROVIDER_COMMIT"
git clone --quiet "https://github.com/${PROVIDER_REPO}.git" "$WORK_DIR/kokoro"
git -C "$WORK_DIR/kokoro" checkout --quiet "$PROVIDER_COMMIT"

cd "$WORK_DIR/kokoro/kokoro.js"
npm ci --ignore-scripts

INSTALLED_PHONEMIZER="$(node -p "require('./node_modules/phonemizer/package.json').version")"
if [[ "$INSTALLED_PHONEMIZER" != "$PHONEMIZER_VERSION" ]]; then
  echo "REPRO FAIL: npm lock resolved phonemizer=$INSTALLED_PHONEMIZER expected=$PHONEMIZER_VERSION" >&2
  exit 1
fi

# FIEZEL source lock records this deterministic repair for Node 24 builds.
python3 - <<'PY'
from pathlib import Path
p = Path('rollup.config.js')
s = p.read_text()
needle = 'terser({ format: { comments: false } })'
replacement = 'terser({ maxWorkers: 1, format: { comments: false } })'
if s.count(needle) != 1:
    raise SystemExit(f'REPRO FAIL: expected exactly one Kokoro terser anchor, got {s.count(needle)}')
p.write_text(s.replace(needle, replacement))
PY

# Optional source-derived phonemizer override. It is intentionally absent on
# the current baseline; m025-4 may add it only after baseline reproduction PASS.
OVERRIDE="$ROOT/vendor/kokoro-js/source-overrides/phonemizer.js"
if [[ -f "$OVERRIDE" ]]; then
  PHONEMIZER_COMMIT="6835144b7ee9043129222549c1ed2f6a27216278"
  echo "[repro] applying source-derived phonemizer override from $PHONEMIZER_COMMIT"
  git clone --quiet https://github.com/xenova/phonemizer.js.git "$WORK_DIR/phonemizer"
  git -C "$WORK_DIR/phonemizer" checkout --quiet "$PHONEMIZER_COMMIT"
  cp "$OVERRIDE" "$WORK_DIR/phonemizer/src/phonemizer.js"
  cd "$WORK_DIR/phonemizer"
  npm ci --ignore-scripts
  python3 - <<'PY'
from pathlib import Path
p = Path('rollup.config.js')
s = p.read_text()
needle = 'const plugins = [commonjs(), terser()];'
replacement = 'const plugins = [commonjs(), terser({ maxWorkers: 1 })];'
if s.count(needle) != 1:
    raise SystemExit(f'REPRO FAIL: expected exactly one phonemizer terser anchor, got {s.count(needle)}')
p.write_text(s.replace(needle, replacement))
PY
  npm run build
  cp "$WORK_DIR/phonemizer/dist/phonemizer.js" "$WORK_DIR/kokoro/kokoro.js/node_modules/phonemizer/dist/phonemizer.js"
  cd "$WORK_DIR/kokoro/kokoro.js"
fi

npm run build
cp dist/kokoro.web.js "$OUT_DIR/kokoro.web.js"

BUILT_SHA="$(sha256sum "$OUT_DIR/kokoro.web.js" | awk '{print $1}')"
BUILT_SIZE="$(stat -c '%s' "$OUT_DIR/kokoro.web.js")"
{
  echo "provider=$PROVIDER_REPO"
  echo "providerCommit=$PROVIDER_COMMIT"
  echo "node=$(node --version)"
  echo "npm=$(npm --version)"
  echo "phonemizer=$INSTALLED_PHONEMIZER"
  echo "expectedSha256=$EXPECTED_SHA"
  echo "expectedSize=$EXPECTED_SIZE"
  echo "committedSha256=$COMMITTED_SHA"
  echo "committedSize=$COMMITTED_SIZE"
  echo "builtSha256=$BUILT_SHA"
  echo "builtSize=$BUILT_SIZE"
  echo "sizeDelta=$((BUILT_SIZE - COMMITTED_SIZE))"
} | tee "$OUT_DIR/repro-report.txt"

if [[ "$BUILT_SHA" != "$EXPECTED_SHA" || "$BUILT_SIZE" != "$EXPECTED_SIZE" ]] || ! cmp -s "$OUT_DIR/kokoro.web.js" "$COMMITTED_BUNDLE"; then
  python3 - "$COMMITTED_BUNDLE" "$OUT_DIR/kokoro.web.js" "$OUT_DIR/diff-summary.txt" <<'PY'
from pathlib import Path
import sys

committed = Path(sys.argv[1]).read_bytes()
built = Path(sys.argv[2]).read_bytes()
out = Path(sys.argv[3])
limit = min(len(committed), len(built))
prefix = 0
while prefix < limit and committed[prefix] == built[prefix]:
    prefix += 1
suffix = 0
while suffix < limit - prefix and committed[-1-suffix] == built[-1-suffix]:
    suffix += 1

def snippet(data, center, radius=320):
    start = max(0, center - radius)
    end = min(len(data), center + radius)
    return data[start:end].decode('utf-8', errors='backslashreplace').replace('\n', '\\n')

lines = [
    f'committedBytes={len(committed)}',
    f'builtBytes={len(built)}',
    f'lengthDelta={len(built)-len(committed)}',
    f'commonPrefixBytes={prefix}',
    f'commonSuffixBytes={suffix}',
    f'committedChangedSpan={prefix}:{len(committed)-suffix}',
    f'builtChangedSpan={prefix}:{len(built)-suffix}',
    '',
    '--- committed around first divergence ---',
    snippet(committed, prefix),
    '',
    '--- rebuilt around first divergence ---',
    snippet(built, prefix),
    '',
    '--- committed around end divergence ---',
    snippet(committed, max(prefix, len(committed)-suffix)),
    '',
    '--- rebuilt around end divergence ---',
    snippet(built, max(prefix, len(built)-suffix)),
]
out.write_text('\n'.join(lines), encoding='utf-8')
print('\n'.join(lines[:7]))
PY
  echo "REPRO FAIL: clean-room build differs from the locked committed bundle" >&2
  exit 1
fi

echo "FIEZEL neural vendor clean-room reproduction: PASS"
