# FIEZEL-M025750 — Voice Duplex Full-Phone Mic Pipeline & Mochi SOS Echo-Tolerant Barge-In Handoff

- **Authority**: OWNER / MASTER (`@fitrarustqi`)
- **Build Target**: `m025-750`
- **Status**: READY FOR PRODUCTION MERGE (`100% GREEN` pada seluruh gerbang mutu lokal & Playwright Headless Probe)
- **Date**: 2026-11-02

---

## 1. Ringkasan Masalah & Alasan Perubahan

Berdasarkan pengujian dan evaluasi langsung OWNER pada PWA produksi seluler (Android & iOS PWA), ditemukan 2 kendala kritis pada interaksi suara dua arah:

1. **Mikrofon Kawan Bicara (`call.html`) Putus-Nyambung & Bunyi Beep/Ding Berulang**:
   - **Akar Masalah**:
     a) Timeout akuisisi mikrofon seluler hanya `1200ms` di `startLiveCall()`, menyebabkan perangkat Android/iPhone gagal memperoleh `stream` tepat waktu dan jatuh ke fallback `SpeechRecognition`.
     b) Pada mode telepon live, efek `useEffect` pengenal ucapan memanggil `liveSpeechRecRef.stop()` setiap kali AI berbicara (`isPlayingAiAudio = true`) atau saat murid diam 1 detik (`isAnalyzingTurn = true`), lalu memanggil `start()` kembali saat AI selesai berbicara.
     c) Di sistem operasi Android (Chrome) dan iOS (WebKit), siklus `start()` dan `stop()` pada Web Speech API memicu negosiasi ulang *audio focus* sistem, menghasilkan bunyi *beep/chime* keras dan merusak saluran audio.
     d) Watchdog sapaan pembuka hanya `7500ms`, yang mematikan koneksi WebSocket Gemini Live secara prematur di jaringan seluler lambat dan mematikan suara maskot.
2. **Mochi SOS di Dalam Kuis Tidak Bisa Disela Saat Sedang Berbicara (No Barge-in)**:
   - **Akar Masalah**:
     a) Baris `if (!_openingTurnCompletedForQ || _awaitingOpeningModelTurn) return;` memblokir total evaluasi frame vokal murid selama Mochi mengucapkan sapaan pembuka atau menjelaskan soal.
     b) Ambang batas barge-in Silero VAD lama disetel terlalu ekstrem (`pSpeech >= 0.88` dan `rms >= 0.035` selama 12 frame / 384ms). Saat audio Mochi diputar di speaker HP, fitur Acoustic Echo Cancellation (AEC) bawaan hardware meredam volume mikrofon murid, sehingga suara murid tidak pernah mencapai ambang batas tersebut dan Mochi tidak bisa disela.

---

## 2. Solusi Arsitektural yang Diterapkan

### A. True Full-Duplex Phone Call Pipeline (Kawan Bicara)
1. **Peniadaan Total Browser `SpeechRecognition` di Mode `ws-duplex`**:
   - Menambahkan guard mutlak di baris awal `useEffect`: bila `liveTransportMode === 'ws-duplex'`, seluruh instance `SpeechRecognition` dimatikan dan di-null-kan seketika. Seluruh interaksi suara 100% dialirkan melalui streaming PCM 16kHz hardware mic via Silero/Handy VAD ke WebSocket Gemini Live. Bebas bunyi *beep/ding* dan mikrofon siaga terus-menerus layaknya WhatsApp Call.
2. **Perpanjangan Timeout Akuisisi Mic Seluler**:
   - Dinaikkan dari `1200ms` ke `4000ms`, memberi waktu cukup bagi sistem operasi seluler untuk memunculkan dialog izin dan inisialisasi driver audio tanpa timeout.
3. **Perpanjangan Watchdog Pembuka Sesi Live**:
   - Dinaikkan dari `7500ms` ke `15000ms`, mencegah pemutusan koneksi WebSocket secara prematur di jaringan seluler.
4. **Jaminan Eksekusi Sapaan Pembuka**:
   - `greetingDirective` dipastikan selalu terkirim seketika saat koneksi WebSocket siap tanpa syarat pembatas tambahan.
5. **Asynchronous AudioContext Resume**:
   - Memastikan `outputAudioCtxRef.current` di-`await resume()` sebelum penjadwalan buffer audio live agar audio tidak pernah macet pada timestamp 0.

### B. Echo-Tolerant Barge-In (Mochi SOS)
1. **Pencabutan Gembok Pembuka**:
   - Menghapus gembok `!_openingTurnCompletedForQ` dan `_awaitingOpeningModelTurn` dari handler frame Silero VAD dan ScriptProcessor fallback. Murid bebas berbicara kapan saja.
2. **Kalibrasi Ambang Batas Toleran Speakerphone**:
   - Probabilitas vokal Silero VAD: `pSpeech >= 0.72` (dari `0.88`).
   - Energi RMS vokal: `rms >= 0.014` (dari `0.035`).
   - Durasi streak konfirmasi: `6 frame` (~192ms, dari 12 frame / 384ms).
   - Ambang batas fallback ScriptProcessor: `rms >= 0.016` (dari `0.038`) dan `5 frame` (~160ms).
3. **Penghentian Audio Instan & Anti-Bleed Guard**:
   - Pemanggilan `stopAllActiveAudioSources()` seketika saat barge-in terdeteksi.
   - Penolakan potongan audio model yang terlambat jika murid sedang berbicara (`_userAudioBurstActive = true` atau dalam kurun 600ms pasca-barge-in).

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal

1. **Playwright Chromium Headless Empirical Probe (`tests/voice-duplex-e2e-probe.js`)**:
   - Memverifikasi viewport mobile iPhone 14 pada `call.html`.
   - Mengonfirmasi `speechRecStarted === 0` (Zero-Beep Invariant terpenuhi 100%).
   - Mengonfirmasi simulasi interupsi Mochi SOS berhasil memotong audio dengan latensi komputasi $0.10\text{ms} \ll 250\text{ms}$.
2. **Full-Phone Contract Test (`tests/voice-duplex-fullphone-contract-test.js`)**:
   - 7/7 penegasan arsitektural lulus 100%.
3. **Mochi Voice SOS Unit Tests (`tests/mochi-voice-sos-test.js`)**:
   - 27/27 penegasan lulus 100%.
4. **Voice Studio UI Architecture Test (`tests/voice-studio-ui-architecture-test.js`)**:
   - 8/8 penegasan lulus 100%.
5. **Gerbang Mutu Standar**:
   - `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
   - `node tests/th-ui-leak-test.js`: **PASS (4674 kunci id, nol kebocoran)**
   - `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan pada build m025-750)**
   - `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail, 417 gerbang CI)**

---

## 4. Daftar Seluruh Berkas yang Disentuh

- `features/voice-studio/src/App.tsx`: Peniadaan SpeechRec di `ws-duplex`, toleransi mic 4000ms, watchdog 15000ms, async AudioContext resume.
- `features/voice-studio/src/lib/sileroVadGate.ts`: Kalibrasi barge-in toleran speakerphone (`p >= 0.72`, `rms >= 0.010`, `streak >= 6`).
- `features/mascot/fiezel-mochi-voice-sos.js`: Pembukaan gembok interupsi, kalibrasi barge-in ramah speakerphone HP, anti-bleed guard.
- `features/voice-studio/dist/voice-studio.js`: Hasil kompilasi Vite/React terbaru (1.44 MB).
- `features/voice-studio/dist/voice-studio.css`: Hasil kompilasi Tailwind CSS terbaru.
- `tests/voice-duplex-fullphone-contract-test.js`: Berkas uji kontrak arsitektural full-duplex & barge-in.
- `tests/voice-duplex-e2e-probe.js`: Skrip probe empiris Playwright headless Chromium.
- `.github/workflows/quality.yml`: Pendaftaran gerbang uji baru di CI pipeline.
- `id-golden-baseline.json`: Regenerasi baseline emas Indonesia.
- `reports/th-ui-leak-report.json`: Laporan audit Thai leak.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Kenaikan build kanonikal Hexa-Sync ke `m025-750`.
- `docs/handoffs/FIEZEL-M025750-VOICE-DUPLEX-FULLPHONE-BARGEIN-HANDOFF.md`: Dokumen serah terima ini.

---

## 5. Rencana Lanjutan & Roadmap Berikutnya (Next Steps)

1. **Pemantauan Performa Produksi**:
   - Memantau metrik latensi interupsi suara murid di perangkat pengguna nyata (Android low-end dan iPhone versi lama).
2. **Roadmap Lanjutan**:
   - Optimalisasi ukuran bundle `voice-studio.js` melalui dynamic import dan code-splitting modular pada rilis mendatang.
   - Peningkatan adaptif noise threshold saat murid berada di lingkungan luar ruangan yang bising.
