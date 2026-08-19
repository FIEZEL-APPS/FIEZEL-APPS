# FIEZEL 5.19.0 — M028.2 Seam / Buffer Integrity Handoff

Status: CLAIMED / IMPLEMENTATION NOT STARTED

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

1. M028 player sends a natural fade-in and fade-out for every PCM chunk. The worklet therefore drives every chunk tail toward zero and the following head up from zero. That is destructive at natural word/sentence endings and matches the OWNER report that endings sound cut/cracked.
2. m025-50 trace contains short Apple chunks under the 80-character cap. For several requests, the next chunk's generation completes after the prior chunk's nominal PCM duration, leaving an inference underrun window before the next chunk can begin. This is a structural sentence-buffering problem, not a model-download failure.
3. Sentence-at-a-time rendering resets Supertonic context at every chunk and then adds scheduler-controlled seams. For this emergency integrity rollback, continuity/intonation takes priority over first-word latency until true incremental PCM streaming exists.
4. M028.1 Indonesian prepare guard bypasses Indonesian initialization to avoid a second WASM worker, but its returned `ready` remains tied to the uninitialized Indonesian service. The UI/diagnostic can therefore remain `prepared=true` / `ready=false` indefinitely.

## Scope lock

Allowed runtime scope:
- `features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js`: Apple standalone integrity rollback only (sentence-streaming policy / hard-chunk policy).
- `features/neural-voice/fiezel-web-audio-player.js`: natural-edge playback envelope only; cancellation fade remains intact.
- `features/neural-voice/fiezel-m0281-runtime-guard.js`: Indonesian verification/status state-machine only; no second-worker initialization.
- `features/neural-voice/fiezel-voice-bundle-gate.js` only if needed to make preparation/verification terminal and non-stuck without claiming Indonesian generation readiness.
- focused new M028.2 regression test(s).
- `.github/workflows/quality.yml` only to register focused tests.
- `features/neural-voice/fiezel-diag-panel.js` release marker only.
- `sw.js` release marker / shell coherence only.
- this handoff artifact; Control Bus comments.

Forbidden:
- `vendor/supertonic-3/*`
- model/source-lock replacement
- `generationSteps` changes
- persona tuning, pitch tuning, speaker/SID changes
- Puter/Core/Auth/Push changes
- true incremental PCM streaming / ring buffer implementation (M029 remains frozen)
- Local Qwen work
- re-enable a second Supertonic worker merely to make Indonesian `ready=true`
- claim Indonesian neural speech is verified when only shared assets/base runtime are verified
- claim physical audio PASS from machine tests

## Intended bounded repair

A. Apple standalone audio integrity rollback:
- disable sentence-at-a-time streaming for Supertonic service creation on Apple standalone;
- use a larger bounded hard chunk so multiple short sentences/clauses are rendered together, reducing independent-generation boundaries and providing enough PCM lead for prefetch;
- keep non-Apple policy unchanged.

B. Playback edge integrity:
- do not apply a natural fade-to-zero to ordinary completed PCM; preserve model output through the final sample;
- keep fade-out for explicit stop/cancel only;
- preserve public player API exactly `play/stop/warm/close`.

C. Indonesian verification:
- separate `shared assets/base runtime verified` from `Indonesian generation ready`;
- preparation/verification must always settle and release any blocking UI;
- do not start a second Indonesian Supertonic worker in this hotfix.

## Machine gates

- focused test demonstrates Apple service is no longer sentence-streamed and uses the bounded integrity chunk policy; non-Apple remains unchanged.
- worklet enqueue for ordinary playback receives zero natural fade-out; cancellation still carries a bounded fade-out.
- legacy AudioBufferSource path does not schedule natural fade-to-zero on ordinary completion.
- Indonesian prepare/verification resolves terminally without starting original Indonesian initializer; status does not falsely claim generation readiness.
- voice bundle/settings gate cannot remain locked solely because shared assets are already prepared while Indonesian generation is intentionally deferred.
- existing M028/M028.1 regression tests remain green except assertions explicitly superseded by this handoff.
- exact release marker coherence plus Quality, Safari, A6/A7, A9-A14, MASTER Authority all PASS on exact head.

## Physical exit boundary

After deployment OWNER must retest Audiobook, Listening, Classroom, and Indonesian verification. Required outcomes are reported separately: pause, crack, cadence/intonation, Classroom blackout/rollback, and Settings stuck state. Machine-green does not equal audio PASS.

M029 true PCM streaming/ring buffer and Local Qwen stay FROZEN until M028.2 physical evidence is returned.