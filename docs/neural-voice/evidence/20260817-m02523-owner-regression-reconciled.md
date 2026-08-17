# m025-23 owner regression reconciliation

Source artifacts supplied by OWNER on 2026-08-17:

- `23.txt` — SHA-256 `d1ccb5c1d8401e76e7160d19e32256cf412d2a0e6922afdf1c4c3cdede185ec3`, 67,439 bytes.
- `Laporan Final FIEZEL Neural Voice m025-10 ke m025-23.pdf` — SHA-256 `bafa07b019d79a522c387a5721de9ec09a8447803d2c009f3dcf463797ef3002`, 10,011 bytes.

The raw diagnostic is archived losslessly in this evidence branch as `20260817-m02523-owner-raw-diagnostic.txt.gz.b64`.

## Physical classification

m025-23 is **PHYSICAL FAIL / REGRESSION** for Neural Voice. Do not request repeated OWNER testing on this build.

Raw m025-23 facts:

- `diagBuild=m025-23`, installed standalone, Safari 26.5, `crossOriginIsolated=false`.
- Real m025-22 WASM proxy binding is active: `policy=apple-standalone-single-thread-proxy-worker`, `numThreads=1`, `proxy=true`, `readBack=true`.
- WebGPU is available but intentionally suppressed; configured backend remains `wasm/q8`.
- Adapter/model initialization completed in ~14.279 s; full init ~14.370 s.
- First request used 14 chunks of <=80 chars. Chunk 0 tokenizer resolved in 6 ms with 82 tokens.
- Model invocation dispatched asynchronously (`adapter_model_dispatched` in 2 ms), demonstrating the proxy worker changed the event-loop behavior.
- The 30 s generation timer now actually fires: `generate_timeout` at 30,023 ms, followed by `voice_service_error=neural_generation_timeout` and `speak_fallback` at ~30,050 ms.
- Browser speech synthesis then runs, so the requested Kokoro neural voice is not delivered.
- After the timeout, the runtime circuit is latched open. The retained diagnostic contains 12 `prepared_activation_click` attempts and 14 `ensure_ready_error(code=circuit_open)` records before a page lifecycle reset/rebootstrap.

## Source-level mechanism confirmed

This is not merely a generic 'proxy worker is slower' observation. The stronger source-backed explanation is:

1. Before proxy isolation, long synchronous WASM inference starved the document event loop, so the JS generation timeout could not reliably fire while inference was blocking.
2. m025-22/m025-23 moves model execution behind ORT proxy-worker dispatch. The document event loop is responsive enough for the existing 30 s `Promise.race` timeout to fire while inference is still running.
3. `features/neural-voice/fiezel-neural-voice.js` throws `neural_generation_timeout` when the race timer wins but does not terminate the underlying model promise; the inference remains active until it resolves/rejects later.
4. `features/neural-voice/fiezel-neural-voice-bootstrap.js` treats every service error except `neural_generation_busy` as circuit-opening. Therefore `neural_generation_timeout` permanently sets `circuitOpen=true` for the page context.
5. `ensureReady()` immediately rejects while `circuitOpen` is true. The persisted-ready UX explicit activation click calls `ensureReady()` again, so repeated clicks cannot recover.
6. `release()` clears service/adapter/error fields but does **not** clear `circuitOpen`/`lastFallbackReason`. In practice the captured recovery coincides with a new bootstrap/page context, not an in-place circuit cooldown.

This creates the m025-23 regression: worker isolation made the timeout enforceable, but timeout/circuit semantics were not redesigned for an asynchronously running inference backend.

## Reconciliation against the supplied PDF recommendations

The report is correct that m025-23 regressed from 'slow neural output' to timeout/fallback and that the circuit breaker is operationally stuck.

Do not apply the report's remaining prescriptions blindly:

- **Do not restore WebGPU-first automatically.** m025-20 already physically failed stability/audio fidelity on installed Apple PWA. Any future WebGPU lane needs isolated compatibility proof first.
- **Do not claim cross-origin isolation is the sole root cause.** `crossOriginIsolated=false` prevents threaded WASM, but current evidence independently proves both slow raw inference and timeout/circuit semantics.
- **Do not claim the model is reinitialized for every same-page utterance.** The adapter retains `instancePromise`; repeated `adapter_instance_ready` across page/bootstrap lifecycles is not evidence of per-request reload.
- **Do not simply raise timeout as the final fix.** A longer hard timeout would hide the functional regression temporarily while preserving very poor latency. The immediate repair must first make timeout/circuit behavior safe for proxy-worker execution, then performance acceleration remains a separate open requirement.

## Required next repair contract

Before another OWNER trial:

1. Regression-first test: an Apple proxy-worker generation exceeding the 30 s budget must not permanently brick the neural runtime.
2. `neural_generation_timeout` must be treated as transient/recoverable, not a permanent circuit-open condition.
3. Do not allow a retry to start a concurrent inference while the timed-out worker task is still active; preserve explicit single-flight/fail-closed behavior.
4. Decide explicit proxy-worker budget semantics: either a soft over-budget detector that still awaits neural completion, or real cancellation/worker termination if the backend supports it. Do not pretend a JS timer cancels ORT computation.
5. Browser fallback must not silently masquerade as successful Neural Voice; expose an explicit user-visible degraded/fallback state.
6. Preserve voice, default speed, local/offline routing, model bytes, Puter/Auth, cache data, and no automatic WebGPU promotion.
7. All Quality + Authority + A6 + A7 gates must pass on the same candidate SHA before deployment.
8. Only then permit exactly one bounded installed-Apple-PWA acceptance. No cache wipe/reinstall/repeated attempts.

Performance issue #39 remains OPEN even after P0 circuit/timeout recovery: raw on-device inference still requires a separate acceleration solution.