#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${1:-$ROOT/vendor/kokoro-js/kokoro.web.js}"
OUT="${2:-$ROOT/.vendor-repro/materialized-m0255-kokoro.web.js}"
DELTA_B64="$ROOT/vendor/kokoro-js/source-patches/m0254-to-m0255-kokoro.web.zst.b64"

BASE_SHA256='2551a7e181b2359b6148a2f1b842f75537639ad5f46071b3db48483bb9762d61'
BASE_SIZE='2136409'
DELTA_SHA256='09cc82d3a3f3c78ee41e4bc4f60b592b6528b36a8281f0c38e26447aaa8be7bd'
DELTA_SIZE='2638'
TARGET_SHA256='f4329122c16919d170cb88d071b7d22066a4567d4f76feec2d3273412be145ad'
TARGET_SIZE='2136684'

fail() { printf 'm025-5 materialize FAIL: %s\n' "$*" >&2; exit 1; }
sha256_file() { sha256sum "$1" | awk '{print $1}'; }
size_file() { stat -c '%s' "$1"; }

command -v zstd >/dev/null 2>&1 || fail 'zstd CLI is required for deterministic --patch-from reconstruction'
command -v node >/dev/null 2>&1 || fail 'node is required to decode the committed base64 transport delta'
[[ -f "$BASE" ]] || fail "base runtime not found: $BASE"
[[ -f "$DELTA_B64" ]] || fail "transport delta not found: $DELTA_B64"

base_sha="$(sha256_file "$BASE")"
base_size="$(size_file "$BASE")"
[[ "$base_sha" == "$BASE_SHA256" ]] || fail "base SHA drift: expected $BASE_SHA256 got $base_sha"
[[ "$base_size" == "$BASE_SIZE" ]] || fail "base size drift: expected $BASE_SIZE got $base_size"

mkdir -p "$(dirname "$OUT")"
tmp_delta="$(mktemp)"
trap 'rm -f "$tmp_delta"' EXIT

node - "$DELTA_B64" "$tmp_delta" <<'NODE'
const fs = require('fs');
const [src, out] = process.argv.slice(2);
const text = fs.readFileSync(src, 'utf8').replace(/\s+/g, '');
fs.writeFileSync(out, Buffer.from(text, 'base64'));
NODE

delta_sha="$(sha256_file "$tmp_delta")"
delta_size="$(size_file "$tmp_delta")"
[[ "$delta_sha" == "$DELTA_SHA256" ]] || fail "delta SHA drift: expected $DELTA_SHA256 got $delta_sha"
[[ "$delta_size" == "$DELTA_SIZE" ]] || fail "delta size drift: expected $DELTA_SIZE got $delta_size"

rm -f "$OUT"
zstd -q -d --patch-from="$BASE" "$tmp_delta" -o "$OUT"

target_sha="$(sha256_file "$OUT")"
target_size="$(size_file "$OUT")"
[[ "$target_sha" == "$TARGET_SHA256" ]] || fail "materialized SHA drift: expected $TARGET_SHA256 got $target_sha"
[[ "$target_size" == "$TARGET_SIZE" ]] || fail "materialized size drift: expected $TARGET_SIZE got $target_size"

node - "$OUT" <<'NODE'
const fs = require('fs');
const bundle = fs.readFileSync(process.argv[2], 'utf8');
const count = needle => bundle.split(needle).length - 1;
const asyncGuards = count('ReadableStream.prototype[Symbol.asyncIterator]');
const releaseLocks = count('releaseLock()');
if (asyncGuards !== 2) throw new Error(`expected 2 explicit async-iterator guards, got ${asyncGuards}`);
if (releaseLocks !== 1) throw new Error(`expected 1 releaseLock() occurrence, got ${releaseLocks}`);
if (!bundle.includes('ReadableStream.prototype[Symbol.asyncIterator]=async function*()')) throw new Error('missing async-generator assignment');
if (!bundle.includes('this.getReader()')) throw new Error('missing getReader() path');
NODE

printf 'm025-5 materialize PASS\nbaseSha256=%s\nbaseSize=%s\ndeltaSha256=%s\ndeltaSize=%s\ntargetSha256=%s\ntargetSize=%s\noutput=%s\n' \
  "$base_sha" "$base_size" "$delta_sha" "$delta_size" "$target_sha" "$target_size" "$OUT"
