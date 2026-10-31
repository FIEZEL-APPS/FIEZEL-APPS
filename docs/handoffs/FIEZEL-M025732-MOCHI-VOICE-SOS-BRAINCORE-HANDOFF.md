# FIEZEL M025-732 — Mochi Voice SOS × Braincore 3-Stage Collaboration, Silero VAD v5, & Mobile PWA Update Hardening Handoff

- **Build Version**: `m025-732`
- **Authority**: OWNER / MASTER
- **Status**: READY FOR RELEASE (Verified 100% Green across local gates & Chromium E2E probe)
- **Date**: 2026-10-31

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

1. **Koneksi Penuh ke Teks Soal, Pilihan Jawaban, & Penjelasan di Layar (`extractLiveDomQuestionDetails` & `buildQuizContextSnapshot`)**:
   - Sebelumnya, Mochi Voice SOS kehilangan detail teks soal/penjelasan ketika `redactAnswerFromHint()` memotong kalimat `q.explain.rule` dan `q.explain.why`, atau ketika `q.explain.distractors` berbentuk objek (`{ "opsi": "alasan" }`).
   - Kini `extractLiveDomQuestionDetails()` membaca langsung elemen DOM aktif (`#quizStem`, `.question-instruction`, `.vocab-focus-word`, `.option`, `#quizPassage`, `#feedback`, `#quizScaffoldNudge`) dan menyatukannya dengan penjelasan pedagogis utuh di `buildQuizContextSnapshot()`.

2. **Sapaan Pembuka Utuh Tanpa Terpotong (*Greeting on Entry*)**:
   - Deklarasi `tools: MOCHI_SOS_TOOLS` pada frame `setup` di endpoint `BidiGenerateContentConstrained` (`models/gemini-3.8-live`) menyebabkan server menghentikan aliran suara setelah kata pertama (*"Halo!"*) untuk memanggil *tool call*.
   - Deklarasi `tools` telah dilepas dari `buildSetupFrame`, dan ditambahkan pelindung `_openingTurnCompletedForQ` pada `_wireMicrophoneStream` serta `_startParallelSpeechRecognition` agar pantulan speaker tidak memotong kalimat pembuka Mochi.

3. **Gaya Bahasa Setara Anak SMP, Anti-Hint Sempit di Awal, & Kolaborasi 3-Tahap Braincore × Mochi SOS**:
   - `evaluateBraincoreStruggleState(q)` membaca telemetri Braincore (`state.bkt`, `FiezelOLM`, `FiezelMisconceptionLedger`, `state.history`, dan `_attempts`) untuk mengatur 3 tahap pendampingan:
     - **Tahap 1 (`independent_think`)**: Saat soal baru muncul (`wrongAttemptsOnCurrent === 0`), menyapa hangat dan memberi gambaran umum soal dengan bahasa anak SMP tanpa menunjuk kata/kalimat kunci (`allowClueHighlight: false`, `deferred_think_first`) agar murid membaca dan berpikir mandiri lebih dulu.
     - **Tahap 2 (`smp_concept_scaffold`)**: Saat murid bertanya atau baru 1 kali salah, menjelaskan konsep dasar secara umum dengan bahasa anak SMP dan perumpamaan sehari-hari tanpa istilah linguistik kaku.
     - **Tahap 3 (`braincore_intensive_rescue`)**: Saat Braincore mendeteksi kesulitan berulang ($\ge 2\times$ salah pada butir aktif, $P(L_t) < 0.42$, atau miskonsepsi berulang), menyuntikkan paket diagnostik `[KOLABORASI BRAINCORE × MOCHI SOS AKTIF]` dan membimbing murid selangkah demi selangkah serta membuka penyorotan petunjuk (`allowClueHighlight: true`).

4. **Aturan Tampil Sesi Home vs Menu Mandiri, Tes Penempatan (`placement`), Banner Koneksi (`#fzMochiConnBanner`), & Penguatan Pembaruan PWA Mobile**:
   - Sesi latihan halaman depan Home (`level`, `adaptive`, `quick_win`), Tes Penempatan (`placement`) pertama kali pasca onboarding, serta sesi *Grammar*, *Reading*, dan *Writing* mengaktifkan Mochi Voice SOS; sesi mandiri *Vocabulary*, *Listening*, dan *Kana/Hiragana/Katakana/Kanji* dinonaktifkan.
   - `#fzMochiConnBanner` menampilkan status *offline*, *reconnecting*, *quota*, dan *error* di bagian atas layar (dengan kunci i18n terdaftar di `features/i18n/copy-id-core.js` dan `features/i18n/copy-th-core.js`).
   - `features/ui/fiezel-update-prompt.js` diperkuat (`promoteWorker` + `finishReload` + verifikasi pasca-muat ulang `fiezel-target-build`) agar ketika pengguna PWA di HP menekan tombol **"Perbarui sekarang"**, *Service Worker* baru (`m025-732`) benar-benar selesai terinstal dan aktif serta seluruh `fiezel-shell-*` lama dihapus bersih sebelum halaman dimuat ulang.

5. **Pemulihan Ikon PWA Native Full-Bleed Square (`colorType=2`) & Penyelarasan `vendor/silero-vad/ort-wasm-simd-threaded.js`**:
   - Memulihkan 6 berkas ikon PWA (`apple-touch-icon.png`, `assets/brand/fiezel-icon-192.png`, `assets/brand/fiezel-icon-512.png`, `favicon-64.png`, `website/assets/brand/fiezel-icon-192.png`, `website/assets/brand/fiezel-icon-512.png`) ke format persegi *full-bleed* (`RGB Opaque colorType=2`) sesuai standar iOS Home Screen & Android Native App.
   - Mengganti nama `vendor/silero-vad/ort-wasm-simd-threaded.mjs` menjadi `vendor/silero-vad/ort-wasm-simd-threaded.js` agar tidak tersapu aturan `*.mjs` di `deploy/site-exclude.txt`.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Chromium)

- **Probe E2E (`probe-e2e-mochi-sos.mjs` terhadap `http://localhost:8080/`)**:
  - `callActive: true`, `hasCardToggle: true`, `hasVoiceUnder: true`, `promptContainsDomStem: true`.
  - Output suara `models/gemini-3.8-live` utuh (`43 chunks` PCM 24kHz): *"Halo Haiza! Yuk, coba perhatikan dulu kalimat di layar itu, kira-kira maksud dari pertanyaan tersebut sedang menanyakan tentang apa ya?"*
  - Tahap awal terverifikasi `stage: 1 ('independent_think', allowClueHighlight: false)`.
  - Banner `#fzMochiConnBanner` (`quotaVisible: true, offlineVisible: true, clearedOnConnected: true`).
  - Sesi mandiri *Vocabulary* terverifikasi nonaktif (`callActive: false, hasCardToggle: false, hasThoughtBubble: false`).

---

## 3. Daftar Berkas yang Disentuh

- `features/mascot/fiezel-mochi-voice-sos.js`
- `features/mascot/mochi-voice-sos.css`
- `features/mascot/fiezel-mochi-companion.js`
- `mochi-mascot/fiezel-mochi.js`
- `features/ui/fiezel-update-prompt.js`
- `app.js`
- `index.html`, `kurikulum.html`, `misi.html`, `call.html`, `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`
- `features/neural-voice/fiezel-diag-panel.js`
- `features/audio/fiezel-ui-sfx.js`
- `features/brain/fiezel-brain-manifest.js`, `features/brain/fiezel-fsrs-bridge.js`, `features/brain/fiezel-production-grader.js`
- `features/grammar/fiezel-grammar-upgrade.js`
- `features/japanese/fiezel-ja-conjugator.js`, `features/japanese/fiezel-ja-ui.js`, `features/japanese/fiezel-story-reader.js`
- `features/i18n/copy-id-core.js`, `features/i18n/copy-th-core.js`
- `features/voice-studio/**`
- `vendor/silero-vad/**`
- `tests/mochi-voice-sos-test.js`, `tests/brain-fsrs-oracle-test.js`, `tests/japanese-grammar-conjugator-test.js`

---

## 4. Status Kelulusan Gerbang Mutu & Langkah Berikutnya (Next Steps / Roadmap)

- `node tests/mochi-voice-sos-test.js`: **25/25 PASS**
- `node tests/brain-fsrs-oracle-test.js`: **PASS**
- `node tests/japanese-grammar-conjugator-test.js`: **PASS**
- `node tests/update-prompt-test.js` & `node tests/update-prompt-signal-test.js`: **PASS**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 assertions, `m025-732`)**
- `node tools/bump-build.mjs --check`: **Selaras (`m025-732`)**
- **Langkah Berikutnya (Next Steps)**: Pantau CI GitHub Actions pada PR `m025-732`, gabungkan ke `main` setelah seluruh gerbang wajib hijau, dan verifikasi bita produksi di `https://fiezel.my.id/app/`.
