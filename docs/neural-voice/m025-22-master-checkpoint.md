# m025-22 MASTER checkpoint

Status at checkpoint creation: **machine repair/audit closure reached on the pre-checkpoint payload; physical Apple acceptance remains PENDING.**

This file is the durable handoff for the next MASTER. Do not infer physical latency success from machine gates.

## Refs and release identity

- Repository: `fitrajft-ux/FIEZEL-APPS`
- Performance lane: issue `#39`
- MASTER bus: issue `#12`
- Base production at candidate construction: `main@4c1f7e015a245157d5bfd7c49d8d0adfc291f338` (m025-21 Apple WebGPU rollback)
- Candidate branch: `master/perf39-real-wasm-proxy-m02522`
- Pre-checkpoint payload head with full Quality PASS: `8ae2845c2e7ab252d69f329fe110d306fd547c8d`
- DIAG_BUILD: `m025-22`
- SW_REV: `m025-22-real-wasm-proxy-20260817-1`

Refetch branch HEAD before every mutation; the checkpoint commit itself advances the branch beyond the pre-checkpoint payload head above.

## Problem and chosen repair

Physical m025-20 WebGPU-first did not satisfy user-visible latency. m025-21 rolled back automatic WebGPU routing. The source-proven m025-17 behavior showed model inference and event-loop watchdog delay occupying essentially the same 10–16 s interval, so m025-22 repairs the actual worker boundary rather than changing timeout/chunk/voice/model.

The earlier m025-18 worker attempt was invalid for the pinned facade because it assumed `env.backends.onnx.wasm`. The pinned FIEZEL Kokoro facade did not expose that shape. m025-22 source-patches the pinned Kokoro build to expose the real Transformers/ORT WASM environment as `env.wasmEnv`, then applies Apple standalone `numThreads=1` + `proxy=true` before Kokoro creates the ONNX session.

Apple standalone detection covers both `navigator.standalone===true` and `(display-mode: standalone)`. Bootstrap is fail-closed if the real WASM env is unavailable or the Apple proxy policy cannot be read back. The adapter reports effective policy/readback telemetry.

Automatic WebGPU promotion remains suppressed. Configured `wasm/q8` remains the backend. Local/offline routing remains enforced.

## Source/runtime integrity

Pinned dependency family remains unchanged:

- Kokoro JS `1.2.1`
- `@huggingface/transformers` `3.5.1`
- `onnxruntime-web` `1.22.0-dev.20250409-89f8206ba4`
- existing local q8 model and voices

Promoted deterministic runtime bundle:

- path: `vendor/kokoro-js/kokoro.web.js`
- sha256: `91d849dc97a2e43edab1e576721792211bc240da4d086591d42b5356959dc32f`
- size: `2136728` bytes

Source integration patch:

- path: `vendor/kokoro-js/source-overrides/fiezel-integration.patch`
- sha256: `a8a8163ecde6216685a09a52861e373d33b8be67031d675be31f9c50390f3444`

Source lock intentionally states:

- candidate `m025-22`
- state `MACHINE_VERIFIED / PHYSICAL_PENDING`
- `sourceAndAssetClosure=PASS`
- `realDeviceGate=PENDING`
- `productionClaim=false`

Historical m025-5 Apple physical evidence is preserved separately in the source lock and must not be misrepresented as m025-22 acceptance.

## Machine evidence

- Expected RED Quality: `31988377543`
- Actual-browser WASM env/readback audit: `31989178039`
- Successful final candidate closure workflow: `31989719576`
- Candidate Actions artifact:
  - id `9274919039`
  - name `m025-22-final-closure-34ee9cd0a4e1165ac31c46aac60c44005c858e75`
  - ZIP digest `sha256:4a74853fbb6ffa9e05a99966d8333ee6ffc0b0bb5f0f4ef74ca3d9cceb607943`
- Quality after fail-closed physical-gate + real-facade fixture repair: `31990232752` PASS on `2b4c22bf87e44fcf780c37c81f61f0ccdaf06c84`
- Exact pre-checkpoint payload Quality: `31990378822` PASS on `8ae2845c2e7ab252d69f329fe110d306fd547c8d`

The checkpoint commit must receive its own exact-head Quality PASS before PR promotion.

## Repair/audit loop findings

1. **Physical gate invariant was stale.** An old test required physical PASS even though m025-22 had not been accepted on a real Apple standalone PWA. It was repaired to fail closed: machine closure may be PASS while `realDeviceGate=PENDING` and `productionClaim=false`.
2. **Audibility proxy fixture fabricated the obsolete facade.** `neural-voice-audibility-test.js` still built `backends:{onnx:{wasm}}`; it now uses `wasmEnv: wasm` and explicitly injects the VM runtime into the adapter probe so standalone detection is exercised in the same runtime object.
3. **Device-hotfix invariants were stale.** Assertions expecting direct/default m025-5 behavior were advanced to the m025-22 real-proxy contract.
4. **Temporary repair/promotion workflows were scaffolding only.** They were removed after use; do not carry branch-only CI repair machinery into the PR payload.
5. **Node-only getter failure was not browser evidence.** A direct Node module import exercised a different global/runtime context and produced a false negative. The actual headless-browser audit is the relevant machine proof.
6. **`numThreads` does not need to pre-exist as an own property.** The valid contract is to assign/read back `numThreads=1` before session creation; a test that required `'numThreads' in wasm` before assignment was invalid.

## Explicit non-changes

Do not attribute this candidate to any of the following; m025-22 did not intentionally change them:

- Puter/Auth/security flow
- COOP/COEP policy
- neural chunk size
- neural generation timeout
- voice selection/default speed
- model bytes/model format
- Transformers/ORT/Kokoro version family
- paid/remote inference
- cache/site-data cleanup or reinstall behavior

## Current diff scope at pre-checkpoint payload

Compared with `main`, the intended payload was limited to:

- `.github/workflows/quality.yml`
- `NEURAL-VOICE-SOURCE-LOCK.json`
- `features/neural-voice/fiezel-diag-panel.js`
- `features/neural-voice/fiezel-kokoro-adapter.js`
- `features/neural-voice/fiezel-neural-voice-bootstrap.js`
- `neural-voice-audibility-test.js`
- `neural-voice-device-hotfix-test.js`
- `neural-voice-m02522-real-wasm-proxy-test.js`
- `neural-voice-m0255-promotion-test.js`
- `neural-voice-test.js`
- `sw.js`
- `vendor/kokoro-js/kokoro.web.js`
- `vendor/kokoro-js/source-overrides/fiezel-integration.patch`

plus this checkpoint document after creation. Re-run `main...HEAD` compare before opening the PR and reject unexpected repair scaffolding.

## Next MASTER sequence

1. Refetch exact branch HEAD after this checkpoint commit.
2. Require exact-head FIEZEL Quality Gate SUCCESS. If any gate fails, inspect the first exact failing assertion and continue the repair/audit loop; do not paper over failures.
3. Re-audit `main...HEAD`: no temporary repair workflow/script, DIAG/SW coherence, exact source-lock/runtime hash and size, and only intended files.
4. Open PR `master/perf39-real-wasm-proxy-m02522 -> main` with physical state explicitly PENDING.
5. Require exact PR-head Quality + A6/A7 + MASTER Authority SUCCESS. Loop repair if any fail.
6. Merge only the exact verified PR head.
7. Require post-merge exact-SHA Quality + Pages + MASTER Authority SUCCESS.
8. Record merge SHA and post-merge run IDs in issues `#39` and `#12` rather than creating a bookkeeping-only production commit.
9. Only after all machine/deployment gates pass, request exactly one bounded installed-Apple-PWA physical acceptance run. Do not clear cache/site data or reinstall unless evidence specifically requires it.
10. Physical acceptance must verify `diagBuild=m025-22`, Apple standalone capability, effective `wasm_policy` with `proxy=true`, `numThreads=1`, truthful backend/timing telemetry, and real user-visible latency. If latency still fails, mark the physical gate failed and route the measured stage rather than changing timeout/chunk blindly.

## Stop condition

Machine gates passing is necessary but not sufficient to claim the latency issue fixed. `productionClaim` stays false until the real Apple standalone physical gate is accepted.
