# Owner evidence archive — m025-21 report, reconciled

Status: EVIDENCE ONLY — DO NOT MERGE INTO PRODUCT RUNTIME AS A PERFORMANCE CHANGE.

This file archives and reconciles the owner-supplied final report covering m025-10, m025-12, m025-16, and m025-21. The original attachment is a 3-page PDF titled `Laporan Final FIEZEL Neural Voice m025-10 ke m025-21.pdf`.

Original attachment integrity:
- PDF SHA-256: `cab330aaa40b74f79d923b715a1732274b7d5ac06745ae5476a5e1bdf8056130`
- PDF size: `10444` bytes
- Raw m025-21 diagnostic TXT SHA-256: `8132dd0cb86e4ea710b14f34a72467e760384ff3feec97495c78bee0adf85a4a`
- Raw diagnostic TXT size: `61418` bytes

## What the owner report says

The report states that across m025-10, m025-12, m025-16, and m025-21, `crossOriginIsolated` stayed false while observed first-chunk latency worsened. Its table records approximately 17.6 s for m025-10, 14.9 s for m025-12, 17.1 s for m025-16, and 93.6 s for m025-21. It calls out m025-21 as the worst observed build.

For m025-21 specifically, the report highlights:
- `webgpuAvailable: true` while the configured backend is WASM and `autoWebGpuSuppressed: true`.
- `rollbackBuild: "m025-21"`.
- configured `generationTimeoutMs: 30000` while generation completed after roughly 95.5 s rather than being interrupted.
- repeated `bootstrap_loaded` / `init_start` activity in the same captured diagnostic history.

The report proposes, in order: enabling WebGPU, enabling cross-origin isolation, caching the model instance across requests, enforcing timeout cancellation, improving background recovery, and documenting rollback rationale.

## Reconciliation against repository history and physical evidence

Several report observations are valid evidence, but some causal statements and recommendations are superseded or stronger than the data supports.

### 1. WebGPU availability is confirmed; blanket re-enable is NOT authorized

The m025-21 raw diagnostic confirms `webgpuAvailable: true`, `configuredDevice: "wasm"`, and `autoWebGpuSuppressed: true`.

However, this suppression is intentional rollback behavior, not an unexplained omission. m025-20 was the WebGPU-first q8 experiment. On physical Apple standalone acceptance, the owner reported a blackout/ejection from the installed PWA into Safari/browser followed by automatic app re-entry. m025-20 was therefore classified as a physical stability failure and rolled back in m025-21.

Conclusion: do **not** blindly re-enable WebGPU. Any future WebGPU work must first isolate the m025-20 failure boundary and demonstrate stability without repeated owner trials.

### 2. `crossOriginIsolated: false` is confirmed, but it is not proven as the sole root cause

The report calls cross-origin isolation the core root cause. The raw data proves the condition (`false`), and it explains why threaded WASM / `SharedArrayBuffer` paths are unavailable.

It does **not** by itself prove that lack of cross-origin isolation is the sole cause of the 10–90 s model inference latency. Earlier device evidence also showed direct WASM model execution starving the document/main event loop. The current m025-22 repair therefore targets the actual ORT WASM proxy-worker binding rather than claiming COOP/COEP alone will solve raw inference time.

### 3. The capture does not prove "model is reinitialized every request"

The diagnostic contains repeated `bootstrap_loaded` and multiple full `init_start` sequences. That is strong evidence of repeated document/bootstrap lifecycle activity and expensive re-initialization after those reload/re-entry boundaries.

It is not sufficient to conclude that every speech request inside one stable document creates a new model instance. The repeated initialization is separated by new bootstrap/page lifecycle sequences. Treat "no model cache between requests" as an unproven hypothesis unless a same-document second-request trace shows a second `adapter_instance_start` without a new bootstrap/reload boundary.

### 4. Timeout is an over-budget detector, not a preemptive cancel in m025-21

The raw diagnostic confirms `timeoutMs: 30000` and `generate_completed_over_budget` after 95.480 s. This is a real UX problem.

Because m025-21 performs heavy model execution in direct WASM and can block the event loop, a JS timer / `Promise.race` alone cannot reliably interrupt the computation while the main thread is blocked. Real cancellation would require backend-supported abortability or worker/session termination semantics. Do not implement a cosmetic timer and claim cancellation.

### 5. Background/lifecycle findings remain relevant, but this capture also shows recovery activity

The capture includes repeated bootstrap/page-show events and a later `background_ready_start` → `background_ready` sequence. That means the specific capture contains at least one successful automatic readiness recovery after a lifecycle transition.

Earlier physical failures after backgrounding remain valid historical evidence, but they should not be rewritten as "this m025-21 capture never recovered".

### 6. Rollback rationale is documented in GitHub history

m025-21 is the safety rollback of the m025-20 Apple WebGPU attempt after the physical blackout/ejection failure. Future masters should use PR / issue history instead of treating `rollbackBuild` as unexplained.

## Current production boundary after this evidence was received

Production has advanced beyond the attached report:
- m025-22 merged to `main@09d56662ec7b5f81a164c432e6af8eb3188fd1fa`.
- m025-22 exposes the real pinned Transformers/ORT WASM environment through the FIEZEL Kokoro facade and applies Apple standalone `numThreads=1`, `proxy=true` with readback before session creation.
- m025-22 deliberately does not auto-promote WebGPU.
- m025-22 machine gates are green; physical Apple latency/stability acceptance remains the authority for whether the change actually helps the installed PWA.

## Master instructions

1. Do not regress to m025-20/WebGPU-first merely because the attached report ranks WebGPU first; that recommendation predates the documented physical m025-20 stability failure.
2. Do not claim cross-origin isolation is the proven sole root cause.
3. Do not claim model-per-request reinitialization unless a same-document trace proves it.
4. Do not ask the owner to clear cache, wipe site data, reinstall, or repeatedly reproduce.
5. Keep the physical acceptance bounded: one installed-Apple-PWA run after machine-clean deployment.
6. For m025-22 acceptance, inspect `wasm_policy` first. Expected Apple standalone evidence is real WASM env readback with `numThreads=1`, `proxy=true`, then compare event-loop watchdog behavior and model/generate latency against m025-21.
7. If m025-22 removes blackout/UI starvation but raw model latency remains high, classify responsiveness and inference throughput separately; proxy-worker isolation is not a claim of raw inference acceleration.
