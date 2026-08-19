# FIEZEL 5.19.0 — M028.2 Seam / Buffer Integrity Handoff

Status: CLAIMED / IMPLEMENTATION IN PROGRESS

Baseline: `main@5338ada261f8541a11929f36147df1b1cb12438a` (M028.1 production).
Branch: `agent/m0282-seam-buffer-integrity`.

## CONTEXT-INJECTION

OWNER physical retest on m025-50 standalone Safari reports:
- Audiobook: pause unchanged; crack remains at word/sentence endings; speech sounds cut, without stable rhythm/intonation.
- Listening: same pause/crack/cut cadence.
- Classroom: blackout fixed and rollback fixed, but speech is English by M028.1 safety rollback; same pause/crack/cut cadence remains.
- Indonesian audio verification/settings: severe stuck-screen bug.
- `50.txt` confirms `diagBuild=m025-50`, standalone=true, base neural runtime ready/cached/audible, repeated Supertonic generation success at 44.1kHz, and `ID_VOICE_NOT_READY` for Indonesian.

## Evidence-backed failure model

1. M028 Apple AudioWorklet applies a natural fade-in/fade-out to every completed PCM chunk. Normal speech boundaries are therefore forced toward zero even though the model already emitted its own tail. This matches the OWNER report that endings sound cut/cracked.
2. m025-50 trace contains short Apple chunks under the 80-character cap. Several transitions have the next generation complete after the prior PCM's nominal duration, leaving structural inference underrun windows despite successful generation.
3. Sentence-at-a-time rendering resets Supertonic context at each chunk and then reconstructs cadence with scheduler seams. Until true incremental PCM exists, physical continuity takes priority over first-word latency.
4. M028.1 Indonesian prepare guard intentionally avoids a second WASM worker but leaves Indonesian generation `ready=false`. Consumers must treat shared bundle/base-runtime verification as a terminal preparation state without falsely claiming Indonesian generation readiness.

## Scope lock — amended before each new mutation class

Allowed runtime scope:
- `features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js`: Apple standalone stream/hard-chunk policy **and** bounded Apple AudioWorklet message wrapper. The wrapper may zero ordinary `enqueue` edge fades but must pass explicit `clear`/cancel fades unchanged.
- `features/neural-voice/fiezel-m0281-runtime-guard.js`: Indonesian preparation/verification status contract only; no second-worker initialization.
- `features/neural-voice/fiezel-voice-bundle-gate.js` only if focused evidence proves it can remain locked after shared verification.
- focused M028.2 regression test(s).
- `.github/workflows/quality.yml` only to register focused tests.
- `features/neural-voice/fiezel-diag-panel.js` release marker only.
- `sw.js` release marker only; no new shell asset is required because the repaired prebootstrap layer is already part of the shell.
- this handoff artifact; Control Bus comments.

Implementation note: a temporary unreferenced `features/neural-voice/fiezel-m0282-audioedge-hotfix.js` staging file was created after the first scope amendment, but it was never wired into `index.html` or production load order. It will be removed before candidate verification. The edge logic is co-located in the already-loaded prebootstrap hotfix to reduce release surface. Therefore `index.html` remains unchanged.

Explicitly NOT modifying the large base `fiezel-web-audio-player.js` in this hotfix. The wrapper targets the exact affected production path: Apple standalone AudioWorklet. The legacy AudioBufferSource rollback path remains unchanged and is not claimed fixed by M028.2.

Forbidden:
- `vendor/supertonic-3/*`
- model/source-lock replacement
- `generationSteps` changes
- persona tuning, pitch tuning, speaker/SID changes
- Puter/Core/Auth/Push changes
- true incremental PCM streaming / ring buffer implementation
- Local Qwen work
- re-enable a second Supertonic worker merely to make Indonesian `ready=true`
- claim Indonesian neural speech is generation-ready when only shared assets/base runtime are verified
- claim physical audio PASS from machine tests

## Intended bounded repair

A. Apple standalone audio integrity rollback:
- when Supertonic requests sentence streaming on Apple standalone, override it to non-sentence-streamed bounded chunks;
- raise Apple hard chunk cap to 128 chars (existing core maximum), reducing independent inference boundaries and giving prefetch longer audible lead;
- keep non-Apple policy unchanged and keep service-level serialization.

B. Apple worklet edge integrity:
- ordinary `enqueue`: `fadeInFrames=0`, `fadeOutFrames=0`, preserving model-native PCM edges;
- explicit `clear`/cancel: preserve the existing bounded fade-out unchanged;
- preserve FiezelWebAudioPlayer public contract and shared runtime ownership.

C. Indonesian verification:
- expose explicit `sharedBundlePrepared`, `sharedRuntimeReady`, `verificationComplete`, `generationDeferred`, and `preparationOwner` state;
- keep `ready` truthful (no second Indonesian service == no Indonesian generation-ready claim);
- `prepare()` must resolve terminally from the verified shared runtime when assets/base runtime are ready, without invoking original Indonesian initializer;
- mandatory bundle UI must not remain locked solely because Indonesian generation is intentionally deferred.

## Machine gates

- focused test proves Apple service request becomes `streamSentences=false`, `appleHardChunkChars=128`; non-Apple remains unchanged.
- worklet wrapper rewrites only ordinary enqueue edge fades to zero; `clear.fadeOutFrames` is unchanged.
- wrapper is Apple-standalone-only and preserves the exact player object returned by the base implementation.
- Indonesian prepare resolves without invoking original Indonesian prepare/initializer; `ready` remains false while verification fields truthfully report shared preparation/base readiness.
- existing voice-bundle gate already keys completion on `prepared`, so it must remain terminal with the M028.2 status contract; change it only if focused test disproves this.
- existing M028/M028.1 tests remain green except assertions explicitly superseded by this handoff.
- exact release marker coherence plus Quality, Safari, A6/A7, A9-A14, MASTER Authority all PASS on exact head.

## Physical exit boundary

After deployment OWNER must retest Audiobook, Listening, Classroom, and Indonesian verification. Required outcomes are reported separately: pause, crack, cadence/intonation, Classroom blackout/rollback, and Settings stuck state. Machine-green does not equal audio PASS.

M029 true PCM streaming/ring buffer and Local Qwen stay FROZEN until M028.2 physical evidence is returned.