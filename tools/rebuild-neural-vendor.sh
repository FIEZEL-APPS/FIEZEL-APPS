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
PHONEMIZER_REPO="$(read_lock dependencies.phonemizerRepository)"
PHONEMIZER_COMMIT="$(read_lock dependencies.phonemizerCommit)"
COMMITTED_BUNDLE="$ROOT/$(read_lock runtime.bundle.path)"
INTEGRATION_PATCH_REL="$(read_lock provider.sourcePatches.0.path)"
INTEGRATION_PATCH_EXPECTED_SHA="$(read_lock provider.sourcePatches.0.sha256)"
INTEGRATION_PATCH="$ROOT/$INTEGRATION_PATCH_REL"
SAFARI_PATCH_REL="$(read_lock dependencies.phonemizerSafariPatch.path)"
SAFARI_PATCH_EXPECTED_SHA="$(read_lock dependencies.phonemizerSafariPatch.sha256)"
SAFARI_PATCH_BASE="$(read_lock dependencies.phonemizerSafariPatch.baseCommit)"
SAFARI_PATCH_HEAD="$(read_lock dependencies.phonemizerSafariPatch.headCommit)"
SAFARI_PATCH="$ROOT/$SAFARI_PATCH_REL"

if [[ "$PROVIDER_REPO" != "hexgrad/kokoro" ]]; then
  echo "REPRO FAIL: unexpected provider repository: $PROVIDER_REPO" >&2
  exit 1
fi
if [[ "$PHONEMIZER_VERSION" != "1.2.1" || "$PHONEMIZER_REPO" != "xenova/phonemizer.js" ]]; then
  echo "REPRO FAIL: unexpected phonemizer provenance: version=$PHONEMIZER_VERSION repo=$PHONEMIZER_REPO" >&2
  exit 1
fi
if [[ "$SAFARI_PATCH_BASE" != "$PHONEMIZER_COMMIT" ]]; then
  echo "REPRO FAIL: Safari patch base must equal pinned phonemizer commit" >&2
  exit 1
fi
if [[ ! -f "$INTEGRATION_PATCH" ]]; then
  echo "REPRO FAIL: source-locked FIEZEL Kokoro integration patch is missing: $INTEGRATION_PATCH_REL" >&2
  exit 1
fi
PATCH_SHA="$(sha256sum "$INTEGRATION_PATCH" | awk '{print $1}')"
if [[ "$PATCH_SHA" != "$INTEGRATION_PATCH_EXPECTED_SHA" ]]; then
  echo "REPRO FAIL: FIEZEL integration patch hash differs from source lock" >&2
  echo "expected=$INTEGRATION_PATCH_EXPECTED_SHA actual=$PATCH_SHA" >&2
  exit 1
fi
if [[ ! -f "$SAFARI_PATCH" ]]; then
  echo "REPRO FAIL: source-locked Safari phonemizer patch is missing: $SAFARI_PATCH_REL" >&2
  exit 1
fi
SAFARI_PATCH_SHA="$(sha256sum "$SAFARI_PATCH" | awk '{print $1}')"
if [[ "$SAFARI_PATCH_SHA" != "$SAFARI_PATCH_EXPECTED_SHA" ]]; then
  echo "REPRO FAIL: Safari phonemizer patch hash differs from source lock" >&2
  echo "expected=$SAFARI_PATCH_EXPECTED_SHA actual=$SAFARI_PATCH_SHA" >&2
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

echo "[repro] replaying source-locked FIEZEL Kokoro integration patch"
git -C "$WORK_DIR/kokoro" apply --check "$INTEGRATION_PATCH"
git -C "$WORK_DIR/kokoro" apply "$INTEGRATION_PATCH"

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

# Source-derived phonemizer override + narrowly scoped upstream Safari compatibility
# patch. Both are hash-locked and applied against the exact pinned phonemizer commit.
OVERRIDE="$ROOT/vendor/kokoro-js/source-overrides/phonemizer.js"
if [[ -f "$OVERRIDE" ]]; then
  echo "[repro] applying source-derived phonemizer override from $PHONEMIZER_REPO@$PHONEMIZER_COMMIT"
  git clone --quiet "https://github.com/${PHONEMIZER_REPO}.git" "$WORK_DIR/phonemizer"
  git -C "$WORK_DIR/phonemizer" checkout --quiet "$PHONEMIZER_COMMIT"
  echo "[repro] applying Safari ReadableStream compatibility patch source-derived from upstream head $SAFARI_PATCH_HEAD"
  git -C "$WORK_DIR/phonemizer" apply --check "$SAFARI_PATCH"
  git -C "$WORK_DIR/phonemizer" apply "$SAFARI_PATCH"
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
  echo "phonemizerRepository=$PHONEMIZER_REPO"
  echo "phonemizerCommit=$PHONEMIZER_COMMIT"
  echo "integrationPatch=$INTEGRATION_PATCH_REL"
  echo "integrationPatchSha256=$PATCH_SHA"
  echo "safariPatch=$SAFARI_PATCH_REL"
  echo "safariPatchSha256=$SAFARI_PATCH_SHA"
  echo "safariPatchBase=$SAFARI_PATCH_BASE"
  echo "safariPatchHead=$SAFARI_PATCH_HEAD"
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
