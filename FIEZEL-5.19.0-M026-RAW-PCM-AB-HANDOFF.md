# FIEZEL 5.19.0 — M026 Raw PCM A/B Diagnostic Handoff

Tanggal: 2026-08-19 WIB
Task: T-026
Branch: `agent/m026-raw-pcm-ab-diagnostic`
Baseline: `main` @ `d27046c` (merge m025-48)
Status milestone: machine verification pending CI; physical-device evidence required before root-cause promotion.

## 1. SCOPE-LOCK

```yaml
task_id: T-026
assigned_to: agent-5 (coordinator, current session)
scope:
  files_allowed:
    - TASKS-LEDGER.json
    - features/neural-voice/fiezel-web-audio-player.js
    - neural-voice-m026-raw-pcm-ab-test.js
    - .github/workflows/quality.yml
    - FIEZEL-5.19.0-M026-RAW-PCM-AB-HANDOFF.md
  functions_allowed:
    - pcmDiagnosticMode()
    - analyzeSamples()
    - createPlayer()/play() diagnostic-only branch
  files_forbidden:
    - NEURAL-VOICE-SOURCE-LOCK.json
    - vendor/supertonic-3/*
    - features/neural-voice/fiezel-supertonic-voice.js
    - features/neural-voice/fiezel-sherpa-vits-adapter.js
    - features/neural-voice/fiezel-neural-voice.js
    - features/neural-voice/fiezel-neural-voice-bootstrap.js
    - fiezel-core-worker.js
objective: >
  Membuat A/B diagnostic yang dapat membedakan apakah crackle/static sudah ada pada
  raw PCM keluaran vocoder atau muncul/bertambah pada conditioning/WebAudio playback,
  tanpa mengubah perilaku playback normal.
forbidden_actions:
  - Jangan mengganti model atau vocoder.
  - Jangan mengubah generationSteps, speaker/persona, prosody atau silenceScale.
  - Jangan mengubah kontrak FiezelVoiceRuntime.
  - Jangan mengimplementasikan true PCM streaming/ring buffer pada milestone ini.
  - Jangan mengklaim crackle sudah diperbaiki tanpa bukti perangkat fisik.
done_when:
  - Mode default menjalankan jalur m025-48 yang sama dan tidak menambah sample-scan telemetry.
  - Mode raw melewati conditionSamples() saja; trim/fade/scheduling tetap identik.
  - Mode conditioned menjalankan conditionSamples() seperti produksi sekarang.
  - Diagnostic event mencatat raw/rendered PCM metrics dan source/context sample rate.
  - Automated gate membuktikan pemisahan raw vs conditioned dan default non-regression.
  - CI branch hijau.
evidence_required:
  - Diff hanya pada files_allowed.
  - Output test neural-voice-m026-raw-pcm-ab-test.js.
  - Regression/quality gate hijau.
  - Untuk menentukan root cause: dua hasil listening pada device yang sama, raw dan conditioned.
```

## 2. ROOT-CAUSE CONTEXT

```yaml
root_cause_context:
  status: SUSPECTED
  summary: >
    Owner masih mendengar neural voice pecah/static seperti radio tanpa sinyal setelah m025-48.
    Belum diketahui apakah cacat sudah ada pada PCM Supertonic INT8 atau muncul/bertambah
    pada conditioning, resampling, WebAudio scheduling, atau starvation playback.
  evidence: >
    m025-48 telah menambah playback latencyHint=playback, request AudioContext 44.1 kHz,
    PCM conditioning untuk non-finite/DC/impulse/headroom, dan deferred diagnostics writes.
    Namun laporan m025-48 sendiri masih menyatakan physical device gate PENDING; keluhan owner
    setelah merge adalah bukti bahwa machine verification belum menutup gejala perangkat.
  previously_attempted_fixes:
    - attempt: m025-45 fade-in/fade-out + guard clipping
      result: Menghilangkan mekanisme click tertentu, tetapi tidak menutup static/crackle owner.
    - attempt: m025-48 conditioning + deeper AudioContext buffer + 44.1 kHz preference
      result: Machine-verified; physical listening masih gagal menurut owner.
  do_not_repeat:
    - Menambah filter audio baru sebelum mengetahui raw PCM sudah rusak atau belum.
    - Menurunkan generationSteps di bawah 4 untuk mengejar performa.
    - Menambah worker/model instance kedua pada iOS.
```

## 3. DESAIN A/B

Normal, tanpa parameter:

`Supertonic PCM -> trim bila seam -> conditionSamples -> WebAudio`

A/B raw:

`?fiezelPcmMode=raw`

`Supertonic PCM -> trim bila seam -> BYPASS conditionSamples -> WebAudio`

A/B conditioned:

`?fiezelPcmMode=conditioned`

`Supertonic PCM -> trim bila seam -> conditionSamples -> WebAudio`

Kedua mode diagnostik mencatat event `phase: "pcm_ab_playback"` dengan:

- `diagnosticMode`
- `sourceSampleRate`
- `contextSampleRate`
- `resamplingExpected`
- `trimmed`
- `raw.samples/finite/nonFinite/clipped/peak/rms/mean/impulses`
- `rendered.samples/finite/nonFinite/clipped/peak/rms/mean/impulses`

Tidak ada raw audio, teks pelajaran, prompt, atau rekaman pengguna yang disimpan oleh telemetry ini.

## 4. PHYSICAL A/B GATE

Gunakan perangkat, volume, speaker/headphone, teks, voice, dan kondisi baterai yang sama.

1. Jalankan versi branch/deploy dengan `?fiezelPcmMode=raw`.
2. Dengarkan satu teks pendek dan satu teks panjang yang sebelumnya terdengar pecah.
3. Ekspor Diagnostics setelah playback selesai.
4. Ulangi persis dengan `?fiezelPcmMode=conditioned`.
5. Catat penilaian: `bersih`, `sedikit pecah`, atau `pecah berat` untuk masing-masing mode.

Interpretasi:

- RAW pecah + CONDITIONED pecah -> sumber utama berada sebelum conditioning; fokus milestone berikut pada model/vocoder/generation output.
- RAW bersih + CONDITIONED pecah -> conditioning adalah tersangka utama.
- RAW bersih + CONDITIONED bersih tetapi produksi normal pecah -> fokus pada resource contention/timing/playback scheduling di kondisi produk nyata.
- RAW pecah, CONDITIONED jauh lebih bersih -> conditioning membantu tetapi sumber cacat tetap berada pada raw inference.
- `sourceSampleRate=44100`, `contextSampleRate!=44100` -> resampling device nyata dan harus ikut investigasi playback.

## 5. HANDOFF KE MILESTONE BERIKUT

T-026 tidak boleh ditutup sebagai `done` hanya dengan CI. Karena objective akhirnya adalah identifikasi crackle pada device, setelah CI hijau status yang jujur adalah `changed-not-tested` atau `blocked` sampai physical A/B masuk.

Setelah physical A/B:

- jika raw PCM terbukti cacat -> buat task baru untuk `audio integrity / vocoder reference A/B`;
- jika raw PCM bersih -> buat task baru untuk `playback integrity / underrun & scheduling instrumentation`;
- hanya setelah audio integrity tervalidasi lanjut ke `true PCM streaming + ring buffer`;
- setelah long-text stress test lulus baru `Local Qwen` boleh diintegrasikan.

Roadmap tetap:

`raw-PCM A/B diagnostic -> identifikasi model vs playback -> perbaiki audio integrity -> true PCM streaming + ring buffer -> stress test teks panjang -> Local Qwen`
