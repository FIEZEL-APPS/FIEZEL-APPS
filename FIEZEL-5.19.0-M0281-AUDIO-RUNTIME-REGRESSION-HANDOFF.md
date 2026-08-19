# FIEZEL 5.19.0 — M028.1 Emergency Audio/Runtime Regression Handoff

Status: CLAIMED / IMPLEMENTATION NOT STARTED

Baseline tree: M028 production plus two empty-tree control-plane cleanup commits. Runtime content is unchanged from deployed M028 before this claim.

## OWNER context injection

Production evidence `Gagal 49.txt` + OWNER physical report on 2026-08-19:
- audible pause near comma / period across Audiobook, Listening, and Classroom;
- crackling at the end of words / sentences;
- Classroom is extreme: rollback/fallback behavior and blackout;
- blackout observed while preparing Indonesian voice.

Machine evidence in the supplied diagnostic contains repeated `neural_generation_busy`, `TTS request superseded`, and fallback events; Indonesian voice is also reported as package downloaded while runtime is not ready.

## Scope lock

Allowed runtime scope:
- `features/neural-voice/fiezel-neural-voice.js`
- `features/neural-voice/fiezel-web-audio-player.js`
- `features/neural-voice/fiezel-pcm-renderer-worklet.js`
- `features/neural-voice/fiezel-sherpa-vits-adapter.js`
- `features/neural-voice/fiezel-supertonic-voice.js`
- `features/neural-voice/fiezel-neural-voice-bootstrap.js`
- `features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js`
- `features/tutor-classroom/fiezel-tutor-v3.js` only if preparation/speech arbitration requires it
- focused M028.1 regression tests
- `.github/workflows/quality.yml` only to register focused tests
- `features/neural-voice/fiezel-diag-panel.js` release marker only
- `sw.js` release marker / shell-asset coherence only
- `TASKS-LEDGER.json` reconciliation only
- this handoff artifact

Forbidden:
- `vendor/supertonic-3/*`
- neural model/source lock replacement
- `generationSteps` change
- persona or voice identity retuning
- Puter/Core/Auth/Push changes
- true incremental PCM streaming / ring-buffer M029 work
- Local Qwen work
- claim that WebKit blackout root cause is confirmed without direct crash evidence
- claim physical PASS from machine tests

## Root-cause hypotheses to verify before patching

1. Apple 32-character hard slices are synthesized as sentence-terminal units because prosody appends terminal punctuation to unpunctuated slices; explicit `gapAfter` then adds another seam pause.
2. M028 renderer applies fade-in and natural fade-out to every queued PCM chunk, creating repeated amplitude dips at tiny chunk boundaries.
3. `speak()` invalidates older calls by incrementing a global generation token, while the new call can immediately fail `activeInference` as busy; both requests can therefore lose.
4. Supertonic ownership is duplicated: bootstrap owns an English worker while `FiezelSupertonicVoice` may own per-language workers. Preparing Indonesian after English may create another large WASM/model instance.
5. Classroom Indonesian wrapper may route Indonesian subtitle text through the English base runtime before Indonesian readiness.
6. Bootstrap lifecycle `release()` must terminate any adapter worker it owns; dropping the reference without adapter release can leak a worker across reinitialization.

## Exit gates

- no artificial sentence terminalization at internal hard split;
- no per-internal-chunk natural fade dip for continuous playback;
- overlapping speech requests serialize/cancel deterministically without double failure;
- one Supertonic worker/model instance serves both `en` and `id` on the primary product path;
- preparing Indonesian while English runtime exists does not instantiate a second Supertonic worker;
- Classroom never sends Indonesian subtitle text to an English-generation path;
- lifecycle release terminates owned worker(s);
- Quality, Safari neural gate, A6/A7, A9-A14, MASTER Authority pass on exact head;
- deployment verification probes production bytes.

M029 remains FROZEN until M028.1 is deployed and OWNER receives a retest build.