# FIEZEL Roadmap

Status: **5.18.0 SPEAKING/LISTENING + LOCAL NEURAL VOICE SOURCE CLOSURE PASS / real-device promotion pending**.

## Completed milestones

1–15. Baseline learning OS, Core/AI, evidence/policy/outcome, Content QA, Guarded Content Patch, Shadow/Canary, Promotion, Canonical Adoption, Evidence Attestation, Production Evidence Origin, dan controlled Operator Rehearsal — SOURCE DONE.

16. **5.18 Speaking + Listening Skills Lab — SOURCE DONE:** 72 reviewed seed items A1–C2, isolated bounded evidence, audio-before-answer gate, target-concept Speaking scoring, raw media persistence forbidden.

17. **5.18 Local Neural Voice closure — SOURCE/ASSET DONE:** patched Kokoro.js 1.2.1, local q8 model, six voices, local ONNX Runtime Web/WASM, immutable checksums, explicit 119 MB warmup, browser fallback, dan zero paid/remote inference policy.

## Required next gate

**Real-device promotion proof** pada perangkat target:

1. cold initialization berhasil;
2. peak memory tidak menutup tab;
3. time-to-first-audio dan repeat latency dicatat;
4. audio unlock setelah user gesture berhasil;
5. stop/interruption dan navigasi cleanup berhasil;
6. offline synthesis berhasil setelah warmup;
7. network trace menunjukkan tidak ada cross-origin model, voice, atau inference request;
8. service-worker upgrade tidak mencampur runtime/model version lama.

Roadmap sesudah gate perangkat dijabarkan dalam `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`: repository reconciliation, Device Readiness, Personal Learning Journey, Unified Skills Evidence, Academic and Scholarship Readiness, Safe Content Evolution, lalu Reliability and Multi-Device Continuity. Milestone hilir tidak boleh dipakai untuk melewati gate hulu.

## Other owner boundary

Production origin/rehearsal tetap menunggu signed aggregate production evidence, operator-controlled public trust policy, dan real owner review. Private signing key harus tetap berada pada HSM/KMS/exporter operator.

## Invariants

- Raw audio, raw transcript, dan raw dictation tidak disimpan.
- Speaking score tidak boleh disebut pronunciation score.
- Neural assets besar hanya di-cache setelah explicit user action.
- Tidak ada paid inference, vendor API key, atau remote neural inference.
- Canonical `fiezel-v4-state`, content IDs, backend namespace, attribution, dan Core protocol 1.7 dipertahankan.
- Tone tetap natural untuk Gen Alpha / anak Indonesia, aman, ringkas, dan tidak menggurui.
- Synthetic test evidence tidak boleh diklaim sebagai production evidence atau real-device proof.
