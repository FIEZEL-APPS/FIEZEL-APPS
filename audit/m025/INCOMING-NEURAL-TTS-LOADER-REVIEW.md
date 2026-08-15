# Incoming neural-tts-loader.js review

Date: 2026-08-15
Baseline reviewed: production `main` at m024 / `708f3b4376b225b9fbe8f988d6c78844bb22f403`

## Decision

Do **not** integrate the submitted loader as-is into m025.

It contains useful ideas, but the current FIEZEL runtime already implements the important thread-capability decision more safely, and the submitted fallback path would introduce new failure modes on this repository.

## Useful ideas to retain

1. The capability predicate `SharedArrayBuffer available && crossOriginIsolated === true` is a reasonable signal for whether a threaded WASM runtime may be used.
2. Initialization and inference/playback timeouts should remain distinct concepts.
3. A loader/fallback layer should produce explicit diagnostics identifying which WASM/thread policy was attempted.

These ideas are already broadly aligned with the m025 observability goals.

## Why the submitted implementation is not directly compatible

### 1. The proposed single-thread WASM asset does not exist in FIEZEL

Submitted default:

`/vendor/kokoro-js/wasm/ort-wasm-simd.jsep.wasm`

Current FIEZEL vendor directory contains only:

- `ort-wasm-simd-threaded.jsep.mjs`
- `ort-wasm-simd-threaded.jsep.wasm`

Therefore the proposed single-thread fallback URL would fail unless a new vendor artifact and matching runtime glue were added and source-locked.

### 2. FIEZEL already runs the current ORT bundle in single-thread mode

The current bootstrap obtains `kokoro.env.backends.onnx.wasm` and applies:

- `numThreads = 1` when Apple standalone or `crossOriginIsolated !== true`;
- `proxy = true` for Apple standalone;
- explicit `wasm_policy` diagnostics.

This avoids requiring a second WASM file. Replacing this with a new loader does not currently provide a demonstrated advantage.

### 3. The submitted timeout can create overlapping initialization attempts

The loader races `initFn()` against a timeout. If the timeout wins, the original initialization promise is not cancelled. The loader can then immediately call `initFn()` again for its single-thread fallback while the first initialization is still running.

That is specifically unsafe for the current Kokoro/ONNX path because it can create duplicate model/session initialization and extra memory pressure.

FIEZEL m024 intentionally keeps one shared `backendInitPromise`: a caller timeout limits waiting time but does not discard the backend task, and retries adopt the same in-flight initialization.

Do not regress this invariant.

### 4. Ten seconds is not a justified Apple initialization deadline

The incoming loader defaults initialization to 10 seconds. FIEZEL currently separates initialization from inference and uses a 20-second caller wait for initialization. The target Apple PWA is already known to be slower under single-thread/proxy conditions.

No evidence currently supports reducing the initialization wait to 10 seconds.

### 5. This loader does not address the proven m024 neural defect

The high-priority m025 defect is not merely choosing threaded vs single-threaded initialization. The current outer neural timeout still wraps `local.speak()`, which includes generation and playback. The required fix is generation-only timeout semantics inside the voice service plus preserved stage diagnostics.

Adding this loader would not fix that issue.

## m025 disposition

SKIP as production code for the first m025 candidate.

Optionally reuse only the capability predicate as a test/helper concept if it improves readability, but do not add a new loader abstraction unless later device evidence proves the existing ORT `numThreads=1` policy itself is broken.

## Reconsider only if all of these become true

- a validated single-thread ORT `.mjs` + `.wasm` pair is added to the vendored/source-locked assets;
- a behavioral test proves the current `threaded` artifact with `numThreads=1` fails where the true single-thread artifact succeeds;
- fallback cannot create two concurrent ONNX/Kokoro initialization tasks;
- initialization timeout remains separate from generation timeout;
- device diagnostics demonstrate that WASM binary selection, rather than generation/playback control flow, is the remaining root cause.

Until then, this loader is useful reference material, not an m025 dependency.