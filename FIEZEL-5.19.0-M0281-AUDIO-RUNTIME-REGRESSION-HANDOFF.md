# FIEZEL 5.19.0 — M028.1 Emergency Audio/Runtime Regression Handoff

Status: IMPLEMENTED / MACHINE VERIFICATION PENDING

Baseline tree: M028 production plus two empty-tree control-plane cleanup commits. Runtime content was unchanged from deployed M028 before this claim.

## OWNER context injection

Production evidence `Gagal 49.txt` + OWNER physical report on 2026-08-19:
- audible pause near comma / period across Audiobook, Listening, and Classroom;
- crackling at the end of words / sentences;
- Classroom is extreme: rollback/fallback behavior and blackout;
- blackout observed while preparing Indonesian voice.

Machine evidence in the supplied diagnostic contains repeated `neural_generation_busy`, `TTS request superseded`, and fallback events; Indonesian voice is also reported as package downloaded while runtime is not ready.

## Scope lock

Allowed runtime scope:
- neural chunk/seam classification and scheduling policy
- speech-request arbitration before the existing single-flight engine
- Supertonic preparation/worker ownership safety
- Classroom neural routing safety rollback
- focused M028.1 regression tests
- `neural-voice-m028-audio-integrity-test.js` only for the superseded release-marker assertion (`m025-49 -> m025-50`); all M028 runtime assertions remain immutable
- `.github/workflows/quality.yml` only to register focused tests
- `index.html` only to load the two bounded hotfix layers
- `features/neural-voice/fiezel-diag-panel.js` release marker only
- `sw.js` release marker / shell-asset coherence only
- `TASKS-LEDGER.json` reconciliation only
- this handoff artifact

Implemented runtime files are additive hotfix layers:
- `features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js`
- `features/neural-voice/fiezel-m0281-runtime-guard.js`

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

## Evidence-backed failure model

1. Apple standalone used 32-character hard slices. For scheduler classification the old path called `prosody.punctuate()` on every previous slice; an internal unpunctuated slice therefore received an invented terminal mark and a sentence-size gap.
2. A new `speak()` could supersede the previous request while the engine was still occupied, then itself fail `neural_generation_busy`, producing the observed old-request-superseded + new-request-busy double failure.
3. Base bootstrap owns a Supertonic worker while the Indonesian Supertonic capability can initialize another per-language service. Preparing Indonesian after the shared bundle was already cached therefore carried a second-instance risk on WebKit.
4. Classroom's Indonesian wrapper could substitute Indonesian subtitle text into the speech path and, when Indonesian runtime was not actually ready, fall through to the base engine; the supplied trace shows repeated English/Indonesian voice contention and transient fallbacks.
5. The OWNER-reported blackout is treated as a real physical symptom, but the diagnostic does not prove an operating-system/WebKit process kill. M028.1 therefore removes the highest-risk duplicate initialization path without labeling the blackout root cause as confirmed.

The M028 worklet per-chunk fade remains a residual hypothesis for any crackle that survives this hotfix. M028.1 does not modify the player/worklet because the current evidence first supports seam classification and arbitration faults; changing both at once would destroy attribution.

## Implemented bounded rollback

- Apple standalone hard slice default: `32 -> 80` chars. This reduces artificial seam count while staying below the earlier long-slice pressure profile.
- Internal hard-split seams: no invented terminal punctuation for scheduler classification; an unpunctuated internal seam gets `0ms`. Explicit source punctuation still uses the existing prosody gap table.
- Speech requests: serialized at the voice-service boundary before entering the existing single-flight engine. Explicit `stop()` remains the cancellation authority; a second ordinary `speak()` no longer causes the previous request and itself to fail together.
- Indonesian preparation: when the shared base neural bundle is already prepared/cached, `FiezelIndonesianVoice.prepare()` no longer starts the separate Indonesian Supertonic initializer.
- Classroom safety rollback: while Classroom is active, speech temporarily uses the captured stable English neural runtime with the original English teaching text, `lang: en-US`, and `allowFallback:false`. Indonesian tutor subtitles remain visible.

This is deliberately **not** a final multilingual architecture. M028.1 does not claim one worker dynamically serves both English and Indonesian generation. The immediate safety invariant is narrower: the Classroom hotfix keeps one stable neural worker active and prevents `Siapkan paket Indonesia` from starting a second Supertonic worker when the shared bundle is already available. A true one-worker multilingual design remains a later architecture task after physical stability is restored.

## Machine exit gates

- focused regression proves Apple emergency policy is 80 chars;
- internal unpunctuated seam classification is `0ms`, while explicit punctuation retains the normal prosody gap;
- simultaneous speech requests enter the inner engine serially (`maxActive === 1`);
- shared prepared bundle does not invoke the original Indonesian prepare/initializer;
- Classroom guard preserves original English teaching text and does not invoke Indonesian speech during the emergency rollback;
- load order: seam/arbitration hotfix before bootstrap; runtime guard after audibility wrapper and before tutor override;
- exact release boundary `DIAG_BUILD m025-50` + `SW_REV m025-50-audio-runtime-regression-20260819-1`;
- Quality, Safari neural gate, A6/A7, A9-A14, and MASTER Authority pass on exact head;
- deployment verification probes live production bytes after merge.

## Physical exit boundary

Machine-green and deployment do not equal audio success. After production deploy OWNER must retest Audiobook, Listening, Classroom, and the voice-package preparation flow. Any surviving end-word/end-sentence crackle becomes the entry evidence for the next bounded repair, with the M028 worklet seam fade as the first residual playback hypothesis.

M029 true incremental PCM streaming and Local Qwen remain FROZEN until M028.1 is deployed and OWNER receives this retest build.