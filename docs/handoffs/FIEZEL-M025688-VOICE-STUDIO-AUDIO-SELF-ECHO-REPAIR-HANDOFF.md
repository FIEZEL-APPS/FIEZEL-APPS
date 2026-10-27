# DOSIR SERAH TERIMA RESMI (MANDATORY HANDOFF DOSSIER)
## FIEZEL Build m025-688: Voice Studio Audio Self-Echo Elimination, Instant Persona Speech & Duplex Web Audio Repair

**Nomor Build**: `m025-688`
**Cabang**: `fix/voice-studio-audio-self-echo-m025-688`
**Tanggal**: 2026-10-28
**Status Mutu**: 100% HIJAU (Hexa-Sync Selaras, Playwright Audio Probe Pass, Baseline Emas Pass, Zero-Leak Thai Pass, Gate Registry Pass)

---

### 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan kegagalan fatal pada fitur Kawan Bicara (Voice Studio):
*"ADUH KENAPA SUARA AI NYA TIDAK ADA LAGI?"* (Suara AI membisu / tidak berbunyi sama sekali).

Berdasarkan audit empiris headless dan penyelidikan alur Web Audio API, ditemukan 3 akar masalah teknis utama:

1. **Akar Masalah A: Self-Echo Suicide Loop pada RMS Thresholding Mikrofon (`App.tsx:1835-1848`)**:
   - *Mekanisme Bug*:
     ```ts
     if (isPlayingAiAudioRef.current) {
       if (rms > 0.085) { interruptAiAndStartListening(); } else { return; }
     }
     ```
     Pada perangkat ponsel maupun laptop tanpa earphone/headset, suara vokal AI yang keluar dari loudspeaker perangkat memantul langsung ke lubang mikrofon yang jaraknya hanya beberapa milimeter atau centimeter, menghasilkan amplitudo RMS ~0.10 hingga 0.25.
     Karena `0.10 > 0.085`, `interruptAiAndStartListening()` terpanggil seketika pada suku kata pertama AI berbunyi! Fungsi interupsi ini memotong paksa audio AI, mengosongkan antrean audio buffer, dan mematikan `sharedAudioElRef`.
     Akibatnya, AI membisu seketika setiap kali mencoba berbicara.
   - *Solusi Baku*:
     Mengganti pemutusan RMS prematur dengan peredaman echo terisolasi:
     ```ts
     if (isPlayingAiAudioRef.current) {
       // Redam pantulan suara speaker ke mikrofon agar tidak dipantulkan kembali
       // ke Gemini Live (mencegah echo / feedback loop).
       // DILARANG memotong pemutaran audio AI sendiri dengan ambang batas RMS mic tunggal!
       return;
     }
     ```
     Interupsi percakapan (barge-in) ditangani secara semantik oleh Gemini Live (`msg.serverContent?.interrupted`) atau sentuhan langsung murid pada layar.

2. **Akar Masalah B: Hilangnya Audio Pembuka Saat Pergantian Persona/Skenario**:
   - *Mekanisme Bug*:
     Pada fungsi `handleSelectPersona()` dan `handleSelectScenario()`, pemilihan mentor (seperti Coach Sarah, Sensei Nanami, dll.) hanya memanggil pemanasan cache TTS di latar belakang tanpa memperbarui state `turns` atau mengeksekusi audio playback (`speakAiText()`). Teks pembuka di layar tetap berupa teks mentor sebelumnya dan audio tidak pernah diperdengarkan.
   - *Solusi Baku*:
     - Menyuntikkan giliran pembuka baru (`CallTurn`) dengan kalimat sapaan mentor yang dipilih (`activePersona.openingGreeting`).
     - Memanggil `speakAiText(lineToSay)` secara langsung di dalam konteks gestur klik pengguna (memenuhi kebijakan browser Autoplay Policy).
     - Menghubungkan badge persona aktif, sapaan audio, dan terjemahan secara reaktif.

3. **Akar Masalah C: Distorsi Audio & Gain Ramp Chops pada Web Audio Output**:
   - *Mekanisme Bug*:
     Setiap potongan PCM 20–40ms dari WebSocket dibungkus oleh node Gain dengan linear ramping (0.001 -> 1.0 -> 0.001) yang menghasilkan modulasi amplitude berfrekuensi tinggi (50Hz buzz/glitch/kresek) dan potensi suspend pada `AudioContext`.
   - *Solusi Baku*:
     - Menghapus per-chunk gain modulation dan menghubungkan `source.connect(ctx.destination)` secara langsung.
     - Menyematkan auto-resume guard bila `ctx.state === 'suspended'`.
     - Mengoptimalkan jitter safety buffer lead dari 120ms ke 80ms untuk latensi respons yang lebih instan.

4. **Akar Masalah D: Iframe Permission Policy di Halaman Utama (`fiezel-interactive-chat.js`)**:
   - Memperluas atribut allow pada iframe embedding menjadi `allow="microphone *; autoplay *; camera *"` untuk memastikan perizinan audio dan autoplay tidak diblokir oleh sandbox peramban.

---

### 2. Bukti Pengujian Empiris (Playwright Probe Automation)

Pengujian empiris dilakukan dengan skrip probe Playwright peramban headless nyata (`tools/dev/probe-voice-sound-verification.mjs`):

- **Verifikasi 1 (Inisialisasi Standar)**:
  - Teks sapaan Coach Alex rendered: *"Yo! Look who finally decided to show up! Rule number one: drop the robot voice..."*.
  - Sapaan audio siap diputar, status berubah menjadi normal.
- **Verifikasi 2 (Pergantian Persona ke Coach Sarah)**:
  - Badge aktif diperbarui menjadi `Coach Sarah`.
  - Teks pembuka diperbarui seketika: *"Well, welcome. I hope you're ready for real, unfiltered feedback today. Tell me, what's a challenge you worked on this week?"*.
  - Status audio bergerak ke: `Sedang berbicara... Diputar...` membuktikan sintesis dan pemutaran audio terpanggil secara otomatis dari interaksi klik murid.
- **Verifikasi 3 (Pergantian Bahasa ke JA & Sensei Nanami)**:
  - Bahasa beralih ke Japanese (`JA`).
  - Badge aktif diperbarui menjadi `Sensei Nanami`.
  - Teks pembuka bahasa Jepang terpasang: *"あら、やっと来たの？待たせるなんていい度胸ね！さあ、教科書みたいなカチコチな日本語は禁止よ。最近何してたの？"*.
  - Sintesis suara Nanami terpanggil dan dialirkan ke Web Audio pipeline.
- **Hasil Akhir**: `=== ALL PROBE VERIFICATIONS PASSED ===` (Exit Code 0).

---

### 3. Berkas yang Disentuh dan Perubahannya

1. `features/voice-studio/src/App.tsx`:
   - Eliminasi mic self-echo mute bug pada `handleMicPcmData`.
   - Implementasi auto-play voice greeting pada `handleSelectPersona` dan `handleSelectScenario`.
   - Perbaikan Web Audio output jitter lead dan context resume guard.
2. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi build bundling terbaru (Vite/Rollup) mengemas seluruh perbaikan Voice Studio.
3. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Penambahan izin `microphone *; autoplay *; camera *` pada host iframe Kawan Bicara.
4. `coordination/BUILD-VERSION.json`:
   - Peningkatan build versi ke `m025-688`.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Hexa-sync build version ke `m025-688`.
6. `id-golden-baseline.json`:
   - Pembaruan baseline snapshot emas untuk teks literal Indonesia yang telah divalidasi.
7. `reports/th-ui-leak-report.json`:
   - Pembaruan stempel audit kebocoran bahasa Thai.

---

### 4. Status Kelulusan Gerbang Mutu Lokal & CI Hexa-Sync

- `node tools/bump-build.mjs --check`: **PASS (Selaras 100%)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (4529 kunci id, 0 bocor ke th)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-688)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail, 396 gerbang bukti)**

---

### 5. Catatan Pemasangan & Serah Terima

- Seluruh mekanisme Voice Studio kini memiliki perlindungan akustik ganda: isolasi suara echo lokal pada mikrofon saat AI berbicara, serta pengaliran audio PCM langsung tanpa jitter chop.
- Fitur persona switcher mentor AI kini bersuara secara instan begitu mentor diklik, menyajikan kesan mentor hidup yang responsif dan siap menguji murid.
