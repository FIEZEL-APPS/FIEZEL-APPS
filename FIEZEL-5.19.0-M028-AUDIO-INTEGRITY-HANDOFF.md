# FIEZEL 5.19.0 — M028 Audio Integrity Repair Handoff

Tanggal: 2026-08-19 WIB
Task: T-028
Branch: `agent/m028-audio-integrity-repair`
Baseline: `main` @ `eb2278e3a6aed4b711c84dc2cb706218cc39492b`
Status: `in_progress`

## 1. CONTEXT INJECTION WAJIB

M028 dimulai dari M027 dan diagnostics OWNER. Tidak boleh mengulang diagnosis dari nol.

```yaml
owner_evidence:
  general_delay: medium
  general_crackle: severe
  naturalness: poor
  human_likeness: poor
  classroom_delay: severe
  classroom_crackle: severe
  classroom_naturalness: extreme_failure
  perceived_emotion: none
technical_context:
  inference_latency: CONFIRMED
  crackle_source: UNRESOLVED_MODEL_VS_PLAYBACK
  expressiveness_interface_limit: CONFIRMED
  engine: supertonic-3-int8-2026-05-11
  generation_steps: 4
  backend: wasm-simd-worker
  cross_origin_isolated: false
```

Owner memerintahkan diagnostics tersebut cukup dan roadmap dilanjutkan tanpa physical A/B tambahan.

## 2. DATA-DRIVEN LATENCY DECISION

Capture OWNER memberi contoh:

- 18 chars -> ~1490 ms generation;
- 23 chars -> ~1714 ms;
- 48 chars -> ~2928 ms;
- 77 chars -> ~4585 ms;
- 78 chars -> ~4097 ms.

Hard cap produksi saat ini 80 karakter. M028 menurunkan Apple standalone hard cap default menjadi **32 karakter** untuk menurunkan time-to-first-audio. Capture juga menunjukkan generation tetap lebih cepat daripada durasi PCM pada contoh yang terlihat, sehingga next-chunk prefetch masih punya peluang mengejar playback setelah chunk pertama mulai.

## 3. SCOPE-LOCK

```yaml
task_id: T-028
objective: >
  Mengurangi crackle/dropout dari renderer dan menurunkan first-speech latency
  pada Apple standalone tanpa mengganti model dan tanpa true inference streaming.
files_allowed:
  - FIEZEL-5.19.0-M028-AUDIO-INTEGRITY-HANDOFF.md
  - features/neural-voice/fiezel-pcm-renderer-worklet.js
  - features/neural-voice/fiezel-web-audio-player.js
  - features/neural-voice/fiezel-neural-voice.js
  - neural-voice-m028-audio-integrity-test.js
  - .github/workflows/quality.yml
  - sw.js
  - features/neural-voice/fiezel-diag-panel.js
files_forbidden:
  - vendor/supertonic-3/*
  - NEURAL-VOICE-SOURCE-LOCK.json
  - features/neural-voice/fiezel-sherpa-vits-adapter.js
  - features/neural-voice/fiezel-supertonic-voice.js
  - features/neural-voice/fiezel-neural-voice-bootstrap.js
  - fiezel-core-worker.js
forbidden_actions:
  - Jangan mengganti model/vocoder.
  - Jangan menurunkan generationSteps di bawah 4.
  - Jangan menambah filter waveform spekulatif.
  - Jangan membuat model/worker inference kedua baru.
  - Jangan mengimplementasikan callback PCM incremental dari TTS worker.
  - Jangan mengubah kontrak FiezelVoiceRuntime.
  - Jangan memulai Local Qwen.
```

## 4. IMPLEMENTATION PLAN

### Renderer

Tambahkan AudioWorklet mono PCM renderer yang persistent per AudioContext:

`full generated chunk -> conditionSamples -> worklet queue -> audio render thread -> destination`

M028 **belum true streaming**. PCM baru masuk setelah satu generation chunk selesai. M029 nanti akan mengirim frame incremental ke renderer yang sama.

Renderer wajib:

- hanya dipilih pada Apple standalone jika AudioWorklet tersedia;
- fallback otomatis ke legacy `AudioBufferSourceNode` bila addModule/node gagal;
- context sample-rate mismatch -> fallback legacy, agar M028 tidak menambah resampler baru;
- queue tetap bounded oleh existing service `SCHEDULE_DEPTH=2`;
- fade-in/end dilakukan di worklet untuk mencegah step discontinuity;
- stop/close tetap aman;
- public player API tetap tepat `{ play, stop, warm, close }`.

### Chunk policy

Apple standalone hard cap default:

`80 -> 32 chars`

Non-Apple behavior tidak berubah.

## 5. DONE WHEN

- worklet module terdaftar dan bisa menerima full Float32 PCM chunk;
- worklet output tidak membutuhkan main-thread per-render scheduling;
- fallback legacy teruji;
- sample-rate mismatch fail-safe ke legacy;
- Apple chunk plan default <=32 karakter;
- default non-Apple chunk policy tidak berubah;
- player public API tidak berubah;
- worklet masuk service-worker shell asset list;
- DIAG_BUILD/SW_REV naik sesuai A7 release boundary;
- focused M028 test PASS;
- full Quality Gate PASS;
- A6/A7 PASS;
- Safari acceptance PASS bila workflow terpicu.

## 6. NON-GOALS / HONEST STATUS

M028 tidak mengklaim:

- source crackle sudah dipastikan model atau playback;
- naturalness/human-likeness sudah selesai;
- neural emotion sudah ada;
- long-text true streaming sudah selesai.

Roadmap berikut tetap:

`M028 renderer + latency repair -> M029 true PCM streaming -> stress test long text -> model-quality/expressiveness repair -> Local Qwen`
