# FIEZEL 5.19.0 — M027 Model vs Playback Handoff

Tanggal: 2026-08-19 WIB
Task: T-027
Branch: `agent/m027-model-vs-playback`
Baseline: `main` @ `4c746b81871222162cb22f831be445a5ba04facd`
Status: `in_progress`

## OWNER OVERRIDE / EVIDENCE ACCEPTANCE

OWNER memerintahkan pada 2026-08-19 agar diagnostics capture yang sudah dikirim + diagnosis langsung OWNER dipakai sebagai evidence final untuk melewati physical RAW-vs-CONDITIONED gate M026. Tidak boleh meminta A/B tambahan sebagai syarat masuk M027.

Diagnosis OWNER yang wajib dibawa apa adanya:

- delayed: sedang;
- suara pecah: parah;
- naturalness: kurang;
- human-likeness: kurang terdengar seperti human voice;
- Classroom delayed: parah;
- Classroom pecah: parah;
- Classroom naturalness: sangat buruk / ekstrem;
- emosi: tidak ada.

Diagnostics capture yang diterima menunjukkan build `m025-48`, app `5.19.0`, standalone Safari 26.5, engine `supertonic-3`, model `supertonic-3-int8-2026-05-11`, worker `wasm-simd-worker`, `crossOriginIsolated=false`, dan output 44.1 kHz.

Contoh latency inference dari capture:

- 77 karakter: generation ~4585 ms;
- 48 karakter: generation ~2928 ms;
- 78 karakter: generation ~4097 ms;
- 23 karakter: generation ~1714 ms;
- Classroom menggunakan hard chunk cap 80 karakter dan dapat membentuk 4 chunk.

Event-loop watchdog tetap sekitar 250–251 ms pada checkpoint 250 ms, sehingga delay yang tercatat tidak konsisten dengan main-thread freeze; generation model adalah bottleneck yang terukur.

## ROOT-CAUSE CONTEXT

```yaml
root_cause_context:
  latency:
    status: CONFIRMED
    location: inference/generation path
    evidence: owner diagnostics shows multi-second generation per short chunk while watchdog remains on schedule
  expressiveness:
    status: CONFIRMED_ARCHITECTURE_LIMITATION
    evidence: current adapter maps emotion labels to delivery speed/pitch heuristics; worker request has no neural emotion/style conditioning
  crackle_static:
    status: OWNER_CONFIRMED_PRODUCT_FAILURE
    source_location: UNRESOLVED_MODEL_VS_PLAYBACK
  naturalness:
    status: OWNER_CONFIRMED_PRODUCT_FAILURE
  classroom:
    status: OWNER_CONFIRMED_SEVERE_FAILURE
```

## SCOPE-LOCK

```yaml
task_id: T-027
assigned_to: agent-5/coordinator
objective: >
  Memisahkan crackle/static source PCM/model-vocoder dari WebAudio scheduling/playback,
  menggunakan reference path independen, tanpa mengubah default production playback.
files_allowed:
  - FIEZEL-5.19.0-M027-MODEL-VS-PLAYBACK-HANDOFF.md
  - features/neural-voice/fiezel-web-audio-player.js
  - neural-voice-m027-model-vs-playback-test.js
  - .github/workflows/quality.yml
  - features/neural-voice/fiezel-diag-panel.js   # release marker only if A7 requires
  - sw.js                                        # release marker only if A7 requires
files_forbidden:
  - vendor/supertonic-3/*
  - NEURAL-VOICE-SOURCE-LOCK.json
  - features/neural-voice/fiezel-sherpa-vits-adapter.js
  - features/neural-voice/fiezel-supertonic-voice.js
  - features/neural-voice/fiezel-neural-voice.js
  - features/neural-voice/fiezel-neural-voice-bootstrap.js
  - fiezel-core-worker.js
forbidden_actions:
  - Jangan mengganti model/vocoder pada T-027.
  - Jangan menurunkan generationSteps.
  - Jangan menambah filter audio spekulatif.
  - Jangan membuat worker/model instance kedua.
  - Jangan mengimplementasikan true PCM streaming/ring buffer pada T-027.
  - Jangan memulai Local Qwen.
  - Jangan mengubah kontrak FiezelVoiceRuntime.
```

## IMPLEMENTATION TARGET

T-027 akan menambah reference playback yang **tidak menggunakan WebAudio scheduling FIEZEL** untuk satu raw PCM result. Reference harus membuat WAV PCM16 secara lokal dan memutarnya melalui native media element/Blob URL. Ini mem-bypass `AudioBufferSourceNode`, `conditionSamples()`, queue scheduling, gain ramps, dan continuous chunk scheduler.

Default production path tetap tidak berubah. Reference hanya aktif melalui explicit diagnostic mode.

Interpretasi:

- reference WAV bersih sementara production WebAudio pecah -> playback pipeline dominan;
- reference WAV juga pecah -> source/model-vocoder PCM dominan atau sudah rusak sebelum player;
- keduanya pecah tetapi berbeda karakter -> mixed failure;
- reference tidak boleh dianggap evidence emosi; expressiveness sudah dipisahkan sebagai limitation interface/model path.

## DONE WHEN

- reference WAV conversion deterministic dan bounded;
- native media reference path opt-in saja;
- default `createPlayer()` API tetap kompatibel;
- no model/worker/source-lock changes;
- focused M027 test PASS;
- full Quality Gate PASS;
- A6/A7 PASS;
- Safari gate PASS bila workflow terpicu;
- handoff mencatat bahwa owner override M026 adalah intentional, bukan missing evidence.

## ROADMAP LOCK

`M027 model-vs-playback -> M028 audio integrity repair -> M029 true PCM streaming/ring buffer -> long-text stress -> Local Qwen`
