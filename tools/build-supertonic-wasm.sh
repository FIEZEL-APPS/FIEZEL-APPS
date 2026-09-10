#!/usr/bin/env bash
# m025-42: rebuild vendor/supertonic-3/ from source.
#
# Produces the WASM runtime FIEZEL ships for both Indonesian and English speech. The
# model files themselves are copied straight from the sherpa-onnx release tarball; only
# the runtime (.js/.wasm) is compiled here.
#
# Two intentional deviations from upstream's build-wasm-simd-tts.sh, both applied by
# this script and both load-bearing:
#
#   1. NO --preload-file. Upstream bakes the model into a single .data package; for this
#      model that package is 145 MB, which is over the 100 MB per-file limit of the git
#      remote we deploy from. Instead the seven model files are shipped as ordinary
#      static assets and written into MEMFS by vendor/supertonic-3/sherpa-onnx-tts.worker.js.
#   2. 'FS' is added to EXPORTED_RUNTIME_METHODS, because (1) requires the worker to
#      write those files into the WASM filesystem itself.
#
# Prerequisites: emsdk 4.0.23, cmake >= 3.13, python3, ~10 GB free disk.
#
# Usage:  tools/build-supertonic-wasm.sh /path/to/workdir
set -euo pipefail

WORK="${1:-/tmp/fiezel-supertonic-build}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SHERPA_TAG="v1.13.6"
MODEL_ARCHIVE="sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2"
MODEL_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODEL_ARCHIVE}"

mkdir -p "$WORK"
cd "$WORK"

# --- 1. sources -------------------------------------------------------------------
[ -d sherpa-onnx ] || git clone --depth 1 --branch "$SHERPA_TAG" https://github.com/k2-fsa/sherpa-onnx.git
[ -f "$MODEL_ARCHIVE" ] || curl -fL -O "$MODEL_URL"
[ -d "${MODEL_ARCHIVE%.tar.bz2}" ] || tar xf "$MODEL_ARCHIVE"
MODEL_DIR="$WORK/${MODEL_ARCHIVE%.tar.bz2}"

# --- 2. emsdk ---------------------------------------------------------------------
[ -d emsdk ] || git clone https://github.com/emscripten-core/emsdk.git
(cd emsdk && ./emsdk install 4.0.23 && ./emsdk activate 4.0.23)
# shellcheck disable=SC1091
source "$WORK/emsdk/emsdk_env.sh"
export EMSCRIPTEN="$(dirname "$(command -v emcc)")"

# --- 3. assets --------------------------------------------------------------------
# The CMake guard only recognises tokens.txt / lm_flow.int8.onnx as proof that assets
# were staged; Supertonic has neither, so tts.json is accepted as well. The files are
# still staged because sherpa's build expects the directory to exist.
cd sherpa-onnx
mkdir -p wasm/tts/assets
cp "$MODEL_DIR"/{duration_predictor.int8.onnx,text_encoder.int8.onnx,vector_estimator.int8.onnx,vocoder.int8.onnx,tts.json,unicode_indexer.bin,voice.bin} wasm/tts/assets/

python3 - <<'PY'
import re
p = 'wasm/tts/CMakeLists.txt'
s = open(p).read()

guard_old = '''if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/tokens.txt" AND
   NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/lm_flow.int8.onnx")'''
guard_new = '''if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/tokens.txt" AND
   NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/lm_flow.int8.onnx" AND
   NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/assets/tts.json")'''
if guard_old in s:
    s = s.replace(guard_old, guard_new)

# Deviation 1: ship the model as plain assets, not as a 145 MB .data package.
s = re.sub(r'string\(APPEND MY_FLAGS "--preload-file [^"]*"\)\n', '', s)
# Deviation 2: the worker needs FS to write those assets into MEMFS.
s = s.replace("'addFunction','removeFunction'", "'addFunction','removeFunction','FS'")
open(p, 'w').write(s)
print('wasm/tts/CMakeLists.txt patched (no preload, FS exported)')
PY

# --- 4. build ---------------------------------------------------------------------
export SHERPA_ONNX_IS_USING_BUILD_WASM_SH=ON
./build-wasm-simd-tts.sh

# --- 5. vendor --------------------------------------------------------------------
OUT="$WORK/sherpa-onnx/build-wasm-simd-tts/install/bin/wasm/tts"
DEST="$REPO/vendor/supertonic-3"
mkdir -p "$DEST/provenance"
cp "$OUT/sherpa-onnx-wasm-main-tts.js"   "$DEST/"
cp "$OUT/sherpa-onnx-wasm-main-tts.wasm" "$DEST/"
cp "$OUT/sherpa-onnx-tts.js"             "$DEST/"
cp "$MODEL_DIR"/{duration_predictor.int8.onnx,text_encoder.int8.onnx,vector_estimator.int8.onnx,vocoder.int8.onnx,tts.json,unicode_indexer.bin,voice.bin} "$DEST/"
cp "$MODEL_DIR/LICENSE" "$DEST/LICENSE"
# sherpa-onnx-tts.worker.js is FIEZEL-authored (see deviation 1) and is NOT overwritten.

# --- 6. record what was produced ---------------------------------------------------
( cd "$DEST" && sha256sum ./*.js ./*.wasm ./*.onnx ./*.bin ./tts.json > provenance/SHA256SUMS.txt )
echo
echo "Vendored to $DEST:"
( cd "$DEST" && ls -l --block-size=1 ./*.js ./*.wasm ./*.onnx ./*.bin ./tts.json | awk '{printf "%12s  %s\n", $5, $9}' )
echo
echo "Declared byte counts live in features/neural-voice/fiezel-supertonic-voice.js and"
echo "features/neural-voice/fiezel-neural-voice-bootstrap.js; update them if sizes moved,"
echo "then run: node neural-voice-m02532-indonesian-optional-test.js"
