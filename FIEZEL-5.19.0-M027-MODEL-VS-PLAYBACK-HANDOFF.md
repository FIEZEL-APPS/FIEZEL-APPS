# FIEZEL 5.19.0 — M027 Model vs Playback Handoff

Tanggal: 2026-08-19 WIB  
Task: T-027  
Branch: `agent/m027-model-vs-playback`  
Baseline: `main` @ `4c746b81871222162cb22f831be445a5ba04facd`  
Status: `done-by-owner-override / classified`

## 1. OWNER OVERRIDE / EVIDENCE ACCEPTANCE

OWNER memerintahkan pada 2026-08-19 agar diagnostics capture yang sudah dikirim + diagnosis langsung OWNER dipakai sebagai evidence final dan tidak ada lagi permintaan physical RAW-vs-CONDITIONED A/B.

Diagnosis OWNER yang menjadi acceptance evidence:

- delayed: sedang;
- suara pecah: parah;
- naturalness: kurang;
- human-likeness: kurang terdengar seperti human voice;
- Classroom delayed: parah;
- Classroom pecah: parah;
- Classroom naturalness: sangat buruk / ekstrem;
- emosi: tidak ada.

Keputusan ini adalah owner override yang disengaja, bukan evidence yang terlupa.

## 2. FACTS DARI DIAGNOSTICS OWNER

Capture menunjukkan:

- build `m025-48`, app `5.19.0`;
- standalone Safari 26.5;
- engine `supertonic-3`;
- model `supertonic-3-int8-2026-05-11`;
- backend `wasm-simd-worker`;
- `crossOriginIsolated=false`;
- sample rate engine 44.1 kHz;
- hard chunk cap 80 karakter.

Latency generation yang tercatat antara lain:

- 77 karakter: ~4585 ms;
- 48 karakter: ~2928 ms;
- 78 karakter: ~4097 ms;
- 23 karakter: ~1714 ms.

Event-loop watchdog tetap sekitar 250–251 ms pada checkpoint 250 ms. Maka latency produksi yang terlihat pada capture berada terutama pada inference/generation, bukan main-thread freeze.

Capture OWNER tidak berisi event `pcm_ab_playback`, `nonFinite`, atau `contextSampleRate`. Karena itu lokasi crackle **tidak boleh difalsifikasi sebagai confirmed vocoder atau confirmed WebAudio**.

## 3. SOURCE AUDIT

Audit source menemukan:

1. `deliveryFor()` memakai label emosi untuk mengubah delivery rate; worker generation menerima `sid`, `speed`, `lang`, `numSteps`, dan `silenceScale`. Tidak ada neural emotion/style embedding yang dikirim ke model.
2. Saat `usePitchContour=false`, `phrasePitch` dicatat di diagnostics tetapi tidak diterapkan ke PCM. Dengan demikian label `opening`, `settling`, `carrying`, `closing` bukan expressive neural conditioning.
3. Persona hanya mempunyai dua register terpilih: `sid 2` (ajar) dan `sid 5` (hype). Penjelasan panjang umumnya tetap pada register ajar.
4. Repo hanya mengandung model Supertonic INT8 untuk duration predictor, text encoder, vector estimator, dan vocoder. Tidak ada full-precision substrate yang bisa diaktifkan tanpa menambah aset baru.
5. Supertonic wrapper membuat worker/adapter terpisah per bahasa walaupun bundle model sama, sehingga Classroom bilingual dapat menambah memory/lifecycle pressure.

## 4. ROOT-CAUSE CLASSIFICATION

```yaml
root_cause_context:
  latency:
    status: CONFIRMED
    location: inference_generation
    severity: owner_medium_general_owner_severe_classroom
  expressiveness:
    status: CONFIRMED_ARCHITECTURE_LIMITATION
    mechanism: heuristic_speed_and_register_not_neural_emotion_conditioning
  naturalness:
    status: OWNER_CONFIRMED_PRODUCT_FAILURE
    likely_contributors:
      - int8_model_quality_ceiling
      - limited_two_register_persona
      - no_neural_style_conditioning
  crackle_static:
    status: OWNER_CONFIRMED_PRODUCT_FAILURE
    source_location: UNRESOLVED_MODEL_VS_PLAYBACK
    progression: AUTHORIZED_BY_OWNER_WITHOUT_MORE_AB
  classroom:
    status: OWNER_CONFIRMED_SEVERE_FAILURE
    likely_contributors:
      - multi_second_generation_per_chunk
      - hard_chunk_80
      - separate_language_workers
      - same_non_expressive_voice_interface
```

## 5. M027 DECISION

T-027 tidak menambah runtime diagnostic baru karena OWNER secara eksplisit melarang requirement tes tambahan dan memerintahkan lanjut ke roadmap berikutnya.

Keputusan teknis yang dibawa ke M028:

- Jangan menambah filter spekulatif.
- Jangan mengklaim crackle source sudah diketahui.
- Perbaiki playback integrity secara defensif sambil mengurangi first-speech latency.
- Pertahankan `generationSteps=4`.
- Jangan membuat model instance kedua baru; justru kurangi duplicate bilingual worker bila aman.
- Naturalness/emotion tidak boleh ditandai selesai hanya dengan playback repair; itu memerlukan model/interface-quality work terpisah.

## 6. M028 ENTRY CONTEXT

```yaml
next_task: T-028
milestone: M028_AUDIO_INTEGRITY_REPAIR
entry_authorized_by: OWNER
objective: >
  Repair audio integrity dan latency dari substrate sekarang secara rollback-safe,
  tanpa menyamarkan limitation naturalness/emotion sebagai sudah selesai.
required_context:
  owner_crackle: severe
  owner_classroom_crackle: severe
  owner_classroom_delay: severe
  inference_latency: confirmed
  expressiveness_interface_limit: confirmed
  crackle_source: unresolved_but_nonblocking_by_owner_order
forbidden_initially:
  - generationSteps_below_4
  - speculative_filters
  - second_model_instance
  - Local_Qwen
```

## 7. ROADMAP LOCK

`M027 classified -> M028 audio integrity repair -> M029 true PCM streaming/ring buffer -> long-text stress -> model-quality/expressiveness repair -> Local Qwen`
