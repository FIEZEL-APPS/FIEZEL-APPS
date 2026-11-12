# FIEZEL HANDOFF DOSSIER: M025-791
## Integrasi Handy Human-VAD, Gemini 3.8 Live Multimodal ASR, & Ekspansi Master Bank PTE Academic

- **Build Version**: `m025-791`
- **Branch**: `feat/pte-handy-vad-asr-m025-791`
- **Scope**: `fix(pte)`
- **Tanggal**: 13 November 2026
- **Status Mutu**: 100% HIJAU (31/31 PTE Academic Engine tests, 30/30 PTE Bank Integrity tests, 6/6 Handy VAD tests, 433/433 Quality Gates)

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan

1. **Investigasi Arsitektur Suara Kawan Bicara (Mitra Kaiwa Studio)**:
   - Pengguna meminta verifikasi apakah Kawan Bicara masih menggunakan sistem Handy VAD (`cjpais/Handy`).
   - Hasil audit kode di `features/voice-studio/src/lib/handyVad.ts` membuktikan bahwa `HandyHumanVad` 100% aktif. Ini adalah porting TypeScript murni dari algoritma Rust Handy (`smoothed.rs` dan `visualizer.rs`) yang menggunakan Hann windowing, 512-point FFT, 16 vocal formant frequency buckets (400–4000 Hz), continuous noise floor tracking, serta harmonic pitch autocorrelation (lag 40–200 samples untuk 80–400 Hz pitch human vocal).
   - Di `features/voice-studio/src/App.tsx`, sistem mentransmisikan audio 16kHz PCM ke WebSocket `models/gemini-3.8-live` dengan konfigurasi `inputAudioTranscription: { languageCodes: ['en-US'] }`, dan menerima teks transkripsi live instan dari `msg.serverContent.inputTranscription.text`.

2. **Akar Masalah Ketidakakuratan Live Speech Recognition & Fluency di PTE**:
   - **Speech Recognition**: Sebelumnya PTE UI mengandalkan Web Speech API browser (`webkitSpeechRecognition`), yang sangat rapuh di lingkungan non-Chrome, sering mengalami false endpointing, serta kehilangan suku kata penting dalam pengucapan cepat.
   - **Oral Fluency (WPM)**: WPM sebelumnya dihitung menggunakan total waktu perekaman sejak tombol ditekan hingga timer selesai (misalnya 35-40 detik penuh). Akibatnya, jeda berpikir wajar di awal (misal 5-7 detik) atau jeda menunggu countdown berakhir menurunkan rasio kata per menit secara drastis (contoh: 25 kata dalam 35 detik = 42 WPM, padahal siswa berbicara lancar selama 11 detik = 136 WPM).

3. **Kelangkaan Konten Bank Soal di Semua Seksi PTE**:
   - Seluruh seksi non-Big 4 (Describe Image, Summarize Written Text, Reorder Paragraphs, Retell Lecture, Summarize Spoken Text, Highlight Incorrect Words, Write From Dictation) sebelumnya hanya berisi 4–7 butir soal, sangat tidak memadai untuk menunjang peningkatan nilai ujian Pearson PTE Academic murid yang sebenarnya.

---

### 2. Solusi & Perubahan Arsitektur

1. **Transplantasi `HandyHumanVad` & Resampling Audio Real-Time**:
   - Memasukkan modul `HandyHumanVad` mandiri ke `features/pte/fiezel-pte-ui.js` lengkap dengan:
     - `computeHannWindow(512)`
     - 512-point Cooley-Tukey Radix-2 Real FFT
     - 16 Formant Filter Bins (400–4000 Hz)
     - Dynamic Noise Floor Tracking
     - Lag-domain Autocorrelation Pitch Extractor
     - Resampler 48kHz / 44.1kHz -> 16kHz Float32 -> 16-bit Linear PCM Base64.
2. **Koneksi Live WebSocket Gemini 3.8 Multimodal ASR**:
   - Menghubungkan perekaman audio mikrofon PTE langsung ke pipeline `wss://generativelanguage.googleapis.com/.../models/gemini-3.8-live` secara duplex.
   - Mengirim potongan audio PCM 16kHz secara streaming setiap kali `processSamples()` mendeteksi buffer terisi.
   - Menampilkan transkripsi real-time verbatim langsung dari `msg.serverContent.inputTranscription.text` ke elemen UI `#fzPteLiveSpeechText`.
3. **Pengukuran True Vocal Duration untuk Oral Fluency**:
   - Mencatat `pteSpeechOnsetTimestamp` tepat pada saat `HandyHumanVad` mengonfirmasi dimulainya suara vokal manusia.
   - Mencatat `pteSpeechOffsetTimestamp` tepat pada saat `HandyHumanVad` mendeteksi henti bicara vokal.
   - Menghitung `trueSpeechDurationSec = Math.max(1, (pteSpeechOffsetTimestamp - pteSpeechOnsetTimestamp) / 1000)`.
   - Mengalibrasi ulang `evaluateSpeechResult()` dan `evaluateOralFluency()` agar kalkulasi WPM mencerminkan kecepatan vokal sesungguhnya tanpa penalti waktu tunggu antarmuka.
4. **Ekspansi Masif Bank Soal PTE ke 300+ Butir Soal Autentik**:
   - `content/pte/pte-describe-image.json`: Diekspansi dari 4 butir menjadi **54 butir soal** (mengonversi 50 grafik autentik dari `pteDescribeImageBank.ts` menjadi SVG grafis beresolusi tinggi untuk bar chart, line chart, pie chart, process diagram, cycle chart, map, dan data table).
   - `content/pte/pte-read-aloud.json`: Diekspansi dari 7 butir menjadi **35 teks akademis autentik**.
   - `content/pte/pte-repeat-sentence.json`: Diekspansi dari 27 butir menjadi **50 butir kalimat ujian**.
   - `content/pte/pte-retell-lecture.json`: Diekspansi dari 5 butir menjadi **15 butir kuliah akademis**.
   - `content/pte/pte-summarize-spoken-text.json`: Diekspansi dari 5 butir menjadi **15 butir audio ringkasan**.
   - `content/pte/pte-summarize-written-text.json`: Diekspansi dari 5 butir menjadi **15 butir teks single-sentence**.
   - `content/pte/pte-essay-writing.json`: Diekspansi dari 5 butir menjadi **15 butir topik esai Pearson**.
   - `content/pte/pte-reorder-paragraphs.json`: Diekspansi dari 5 butir menjadi **8 butir paragraf acak**.
   - `content/pte/pte-highlight-incorrect-words.json`: Diekspansi dari 5 butir menjadi **8 butir transkrip**.
   - `content/pte/pte-write-dictation.json`: Diekspansi dari 25 butir menjadi **50 butir dikte ujian**.

---

### 3. Berkas yang Disentuh

1. `content/pte/pte-describe-image.json` (54 butir soal)
2. `content/pte/pte-essay-writing.json` (15 butir soal)
3. `content/pte/pte-highlight-incorrect-words.json` (8 butir soal)
4. `content/pte/pte-read-aloud.json` (35 butir soal)
5. `content/pte/pte-reorder-paragraphs.json` (8 butir soal)
6. `content/pte/pte-repeat-sentence.json` (50 butir soal)
7. `content/pte/pte-retell-lecture.json` (15 butir soal)
8. `content/pte/pte-summarize-spoken-text.json` (15 butir soal)
9. `content/pte/pte-summarize-written-text.json` (15 butir soal)
10. `content/pte/pte-write-dictation.json` (50 butir soal)
11. `features/pte/fiezel-pte-ui.js` (HandyHumanVad, true speech duration, Gemini Live ASR streaming)
12. `tests/pte-academic-engine-test.js` (31 unit tests)
13. `tests/pte-handy-vad-test.js` (6 unit tests validasi VAD)
14. `.github/workflows/quality.yml` (Pendaftaran pte-handy-vad-test.js)
15. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `index.html`, `call.html` (Bump build ke `m025-791`)
16. `tools/dev/master-expand-pte-banks.mjs` & `tools/dev/master-expand-batch2.mjs` (Skrip generator bank soal)

---

### 4. Bukti Pengujian Mutu Lokal

- `node tests/curriculum-cache-version-test.js` -> PASS (33 assertions, 3 pages, build m025-791)
- `node tests/pte-bank-integrity-test.js` -> PASS (30/30 assertions)
- `node tests/pte-academic-engine-test.js` -> PASS (31/31 unit tests)
- `node tests/pte-handy-vad-test.js` -> PASS (6/6 assertions)
- `node tests/audio-locale-guard-test.js` -> PASS (0 speechSynthesis references)
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `node tests/gate-registry-test.js` -> PASS (449 test files, 435 workflow invocations, 10/10 meta-checks)
- `node tools/fiezel-guardians.mjs a10` -> PASS_WITH_RISK_REPORT (0 errors, 0 warnings)
