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
    - features/neural-voice/fiezel-diag-panel.js
    - sw.js
  functions_allowed:
    - pcmDiagnosticMode()
    - analyzeSamples()
    - createPlayer()/play() diagnostic-only branch
    - DIAG_BUILD release marker only
    - SW_REV release marker only
  files_forbidden:
    - NEURAL-VOICE-SOURCE-LOCK.json
    - vendor/supertonic-3/*
    - features/neural-voice/fiezel-supertonic-voice.js
    - features/neural-voice/fiezel-sherpa-vits-adapter.js
    - features/neural-voice/fiezel-neural-voice.js
    - features/neural-voice/fiezel-neural-voice-bootstrap.js
    - fiezel-core-worker.js
objective: >
  Membuat raw-vs-conditioned PCM A/B diagnostic yang mengukur integritas PCM sebelum
  conditioning dan mengisolasi efek conditionSamples(), sebagai evidence untuk milestone
  berikutnya yang akan mengidentifikasi model/vocoder vs playback, tanpa mengubah perilaku
  playback normal.
forbidden_actions:
  - Jangan mengganti model atau vocoder.
  - Jangan mengubah generationSteps, speaker/persona, prosody atau silenceScale.
  - Jangan mengubah kontrak FiezelVoiceRuntime.
  - Jangan mengimplementasikan true PCM streaming/ring buffer pada milestone ini.
  - Jangan mengklaim crackle sudah diperbaiki tanpa bukti perangkat fisik.
  - Jangan mengklaim raw-vs-conditioned A/B sendiri membypass WebAudio; kedua mode masih memakai player yang sama.
  - Pada fiezel-diag-panel.js hanya DIAG_BUILD yang boleh berubah.
  - Pada sw.js hanya SW_REV yang boleh berubah.
done_when:
  - Mode default menjalankan jalur m025-48 yang sama dan tidak menambah sample-scan telemetry.
  - Mode raw melewati conditionSamples() saja; trim/fade/scheduling tetap identik.
  - Mode conditioned menjalankan conditionSamples() seperti produksi sekarang.
  - Diagnostic event mencatat raw/rendered PCM metrics dan source/context sample rate.
  - Automated gate membuktikan pemisahan raw vs conditioned dan default non-regression.
  - A7 release boundary lolos dengan DIAG_BUILD naik tepat +1 dan SW_REV sinkron.
  - CI branch hijau.
evidence_required:
  - Diff hanya pada files_allowed.
  - Output test neural-voice-m026-raw-pcm-ab-test.js.
  - Regression/quality gate hijau.
  - Physical A/B raw vs conditioned pada device yang sama sebelum root-cause status boleh dinaikkan.
```

### Scope amendment setelah verifier A7

Implementasi awal sengaja tidak menyentuh release markers. A7 Automated Release Safety kemudian menolak candidate dengan bukti konkret:

`A7 FAIL: product deploy must increment Diagnostics m025-N exactly +1 (base=47 head=47 expected=48)`

Sesuai protokol, pekerjaan dihentikan sebelum menyentuh file di luar scope. Amendment ini menambahkan hanya dua dependency release-coherence:

- `features/neural-voice/fiezel-diag-panel.js`: `DIAG_BUILD` `m025-47` -> `m025-48`, tanpa perubahan fungsi/panel lain.
- `sw.js`: hanya `SW_REV` diubah ke prefix `m025-48-...`, tanpa perubahan cache policy, fetch handler, COOP/COEP, atau daftar asset.

Amendment ini bukan pelebaran objective; ini remediation wajib agar product change memenuhi verifier A7.

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
    - Menambah filter audio baru sebelum mengetahui karakter raw PCM.
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

Batas inferensi wajib: mode `raw` di sini berarti **raw terhadap `conditionSamples()`**, bukan raw terhadap seluruh output device. Mode `raw` dan `conditioned` sama-sama melewati WebAudio, fade, scheduling, dan output hardware. Karena itu T-026 adalah tahap pengumpulan A/B evidence; keputusan model-vs-playback adalah milestone berikutnya.

## 4. PHYSICAL A/B GATE

Gunakan perangkat, volume, speaker/headphone, teks, voice, dan kondisi baterai yang sama.

1. Jalankan versi branch/deploy dengan `?fiezelPcmMode=raw`.
2. Dengarkan satu teks pendek dan satu teks panjang yang sebelumnya terdengar pecah.
3. Ekspor Diagnostics setelah playback selesai.
4. Ulangi persis dengan `?fiezelPcmMode=conditioned`.
5. Catat penilaian: `bersih`, `sedikit pecah`, atau `pecah berat` untuk masing-masing mode.

Interpretasi yang diizinkan:

- RAW bersih + CONDITIONED pecah -> `conditionSamples()` menjadi tersangka kuat; milestone identifikasi harus mengaudit transformasi conditioning.
- RAW pecah + CONDITIONED jauh lebih bersih -> conditioning membantu; raw PCM memang mengandung anomali yang terukur/terdengar, tetapi shared WebAudio path belum otomatis bebas dari kontribusi.
- RAW pecah + CONDITIONED pecah -> **INCONCLUSIVE model-vs-playback** karena keduanya masih memakai WebAudio. Gunakan telemetry: nonFinite/clipped/impulses pada raw memperkuat hipotesis source PCM; raw metrics bersih memperkuat kebutuhan independent playback reference.
- RAW bersih + CONDITIONED bersih tetapi produksi normal pecah -> fokus milestone identifikasi pada contention/timing/scheduling kondisi produk nyata.
- `sourceSampleRate=44100`, `contextSampleRate!=44100` -> resampling device nyata terkonfirmasi dan harus ikut audit playback.

Tidak boleh menulis `CONFIRMED: vocoder` hanya karena kedua mode terdengar pecah.

## 5. HANDOFF KE MILESTONE BERIKUT

T-026 tidak boleh ditutup sebagai `done` hanya dengan CI. Setelah machine gate hijau, status yang jujur adalah `changed-not-tested` sampai physical A/B masuk.

Setelah physical A/B, buka milestone **identifikasi model vs playback** dengan context injection dari event `pcm_ab_playback`:

- jika conditioning jelas memperburuk output -> audit/repair conditioning lebih dulu;
- jika raw metrics menunjukkan non-finite/clipping/impulse dan gejala raw terdengar -> buat reference comparison untuk model/vocoder;
- jika raw dan conditioned sama-sama pecah namun metrics raw bersih -> buat independent raw-WAV/media playback reference yang mem-bypass FIEZEL WebAudio scheduling agar model-vs-playback dapat diputuskan tanpa tebakan;
- jika ada sample-rate mismatch -> masukkan resampling path sebagai tersangka eksplisit;
- hanya setelah audio integrity tervalidasi lanjut ke `true PCM streaming + ring buffer`;
- setelah long-text stress test lulus baru `Local Qwen` boleh diintegrasikan.

Roadmap tetap:

`raw-PCM A/B diagnostic -> identifikasi model vs playback -> perbaiki audio integrity -> true PCM streaming + ring buffer -> stress test teks panjang -> Local Qwen`
