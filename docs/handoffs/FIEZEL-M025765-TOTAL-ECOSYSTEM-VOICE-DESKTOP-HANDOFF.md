# FIEZEL HANDOFF DOSSIER: TOTAL ECOSYSTEM DESKTOP UI/UX & VOICE WORKBENCH OVERHAUL
**Reference Build:** `m025-764` -> Ready for `m025-765` (Holding Deploy Freeze per User Mandate)
**Worktree:** `C:\Users\hp\fiezel-voice-mentor-m025-764` (`feat/voice-mentor-hood-m025-764`)
**Status:** 100% Implemented, Visually Verified via Headless Playwright (`1440x900` Desktop & `390x844` Mobile), and All Local Quality Gates GREEN.

---

## 1. RINGKASAN PENYELESAIAN (EXECUTIVE SUMMARY)

Seluruh sasaran perombakan **AI Voice Studio, Onboarding Mochi, Portal KelasKu (`kurikulum.html` & `misi.html`), serta Desktop Bento Home (`index.html`)** telah dituntaskan dan diverifikasi secara empiris tanpa melanggar *Protected Surfaces* (`A10 Regression Watcher`: `0 errors, 0 warnings`).

### A. Onboarding (`features/onboarding/fiezel-onboarding.js` & `features/ui/fiezel-tactile-clay.css`)
- **Tipografi Step 4 (`Tes Penempatan` + `12 soal`)**: Membungkus judul kartu dan badge jumlah soal ke dalam `.fz-path-header-row` serta `.fz-path-soal-pill` dengan dukungan penuh `FiezelI18n` (`guru.soal-count`), memisahkan badge `12 soal` secara rapi dari `Tes Penempatan`.
- **Kontras Stepper 5 Titik**: Memperbaiki selector `.fiezel-dots` dan `span.fiezel-dot` / `span.fiezel-dot.is-active` (`22px` wine pill aktif `#7C1D3A`).
- **Mochi 3D Utuh 100%**: Menghapus stiker palsu (`.fz-mochi-rays`, `.fz-mochi-halo`, `.fz-ob-cloud-cushion`) dan memastikan panggung Mochi bebas terpotong di desktop maupun mobile tanpa menggunakan `height: 100%` pada blok adaptif (`multi-device-comfort-test.js` E2 hijau).

### B. Portal KelasKu Guru & Murid (`kurikulum.html` & `misi.html`)
- **Arsitektur Desktop 2 Kolom (`960px`)**: Mengubah `.auth-wrap` dari kotak sempit `440px` di tengah layar hitam menjadi portal profesional 2 kolom (`.auth-grid`, `.auth-pillars`, `.auth-action-panel`) dengan ambient radial glow dan tombol navigasi `← Kembali ke Fiezel` (`.auth-nav-back`).
- **Silent Boot Probe (`features/curriculum/fz-api.js`, `teacher-console.js`, `learning-mission.js`)**: Menghilangkan banner merah mentah `"Failed to fetch"` saat halaman pertama kali dibuka sebelum pengguna menekan tombol masuk, serta menerjemahkan galat jaringan ke kunci lokal `kurikulum.jaringan-gagal`.
- **100% Paritas i18n ID & TH**: Menambahkan 18 kunci baru `kurikulum.*` pada `copy-id-kurikulum.js` dan `copy-th-kurikulum.js` (`th-ui-leak-test` & `th-coverage-test` 100% hijau).

### C. AI Voice Studio & Papan Belajar (`call.html`, `App.tsx`, `InCallLearningWorkbenchModal.tsx`, `route-voice-live.js`)
- **Layout Desktop 2 Kolom Seimbang (`lg:grid-cols-12`, `max-w-4xl mx-auto px-4 sm:px-6 lg:max-w-6xl xl:max-w-7xl`)**:
  - Kolom kiri (5 kolom): Panggung 3D Volumetric Daifuku Mochi terpusat (`220x195`), indikator `Siap bicara`, bar kontrol berbungkus rapi (`Putar Suara`, `Mode Mentor`, `Papan Tulis`, `Telepon Live`), dan kartu ucapan aktif Coach.
  - Kolom kanan (7 kolom): Kartu `Bantuan Jawaban Natural · Fiezel Copilot` + area transkrip langsung dengan kartu *empty-state* dwibahasa (`transcript-empty-placeholder`).
- **100% Dynamic Papan Belajar (Zero Static/Mad-Libs Templates)**:
  - Menghapus fallback Mad-Libs statis (`buildEmergencyBoardForWorker`) di `route-voice-live.js` dan mengunci prioritas utama `derivePedagogicalBoard` pada field dinamis AI (`sampleTarget`, `trapWrongSentence`, `trapWrongReason`, `drillMeaningPrompt`, `drillTargetSentence`, `drillTrapSentence`) dengan urutan opsi A/B acak berbasis hash (`makeQuizPair`).
  - Menambahkan `invokeGeminiLiveStructuredJson` (`models/gemini-3.8-live` function-calling bridge) pada `runGeminiJsonWithPool` sehingga walau model REST terkena rate limit `429`, kartu Papan Belajar tetap diracik secara kontekstual sesuai pertanyaan spesifik murid.
- **Transisi Suara & Bahasa Instan Bebas Glitch (`Inggris/Jepang/Mandarin -> Indonesia -> Bahasa Target`)**:
  - Menambahkan `invokeGeminiLiveWavTts` (`24kHz` PCM16 RIFF/WAVE) di dalam `routeVoiceGeminiTts` (`workers/api/voice/route-voice-live.js`) sehingga `/api/voice/gemini-tts` selalu mengembalikan `200 OK` WAV dengan aksen mentor Indonesia/Thai natural tanpa `503` round-trip.
  - Mencegah pemutaran ganda (bahasa Inggris + Indonesia tumpang tindih) pada `resolveAiReply` saat `actionType === 'open_learning_popup'`.
  - Memisahkan lifecycle `onClose` (`Tutup ✕` -> langsung hening total, `dismissedByUser = true`, nol audio terlambat / pop-up terbuka ulang) dari `onResumeConversation` (`🎙️ Lanjut Ngobrol` -> transisi mulus kembali ke bahasa target `en`/`ja`/`zh`).

### D. Home (`index.html`, `app.js`, `fiezel-tactile-clay.css`, `copy-*-feat-b.js`)
- **Pembersihan Referensi Lama `"PAW"`**: Mengganti seluruh teks tur `"saran latihan dari PAW"` / `"tanya PAW"` menjadi `"Mochi"` di `copy-id-feat-b.js`, `copy-th-feat-b.js`, dan `tests/tours-test.js`.
- **Anti-Tabrakan Modal (`#fzRitual` vs `.fz-tour`)**: Menambahkan guard pada `maybeShowDailyRitual()` di `app.js` agar ritual harian tidak menumpuk di atas tur pengenalan yang sedang aktif.
- **Desktop Bento Grid (`>= 1100px`, `max-width: 1120px`)**: Menyusun `#heroCard` bersandingan seimbang dengan `.quick-practice-section` (grid 2x2 `.fz-vissol-grid`), menyembunyikan `.fz-vissol-header-wave-bg` di desktop agar tidak memunculkan kotak kuning terpotong di belakang Mochi 3D, dan memastikan maskot fallback menggunakan `paw-mochi-idle.svg`.

---

## 2. DAFTAR BERKAS YANG DISENTUH

- `app.js`
- `features/onboarding/fiezel-onboarding.js`
- `features/ui/fiezel-tactile-clay.css`
- `features/curriculum/fz-api.js`
- `features/curriculum/teacher-console.js`
- `features/curriculum/learning-mission.js`
- `features/curriculum/console.css`
- `features/i18n/copy-id-kurikulum.js`
- `features/i18n/copy-th-kurikulum.js`
- `features/i18n/copy-id-feat-b.js`
- `features/i18n/copy-th-feat-b.js`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `workers/api/voice/route-voice-live.js`
- `tests/tours-test.js`
- `id-golden-baseline.json`
- `reports/th-ui-leak-report.json`

---

## 3. BUKTI PENGUJIAN EMPIRIS & GERBANG MUTU LOKAL

Seluruh gerbang mutu telah dieksekusi di worktree `C:\Users\hp\fiezel-voice-mentor-m025-764` dengan hasil **100% LULUS (PASS)**:
1. `node tests/multi-device-comfort-test.js` — **PASS (8/8 invarian)**
2. `node tests/id-golden-snapshot-test.js` — **PASS (baseline emas Indonesia utuh)**
3. `node tests/th-ui-leak-test.js` — **PASS (4.722 kunci ID-TH selaras, 0 leak)**
4. `node tests/th-coverage-test.js` — **PASS (258/258)**
5. `node tests/onboarding-test.js` — **PASS**
6. `node tests/tour-test.js` & `node tests/tours-test.js` — **PASS**
7. `node tests/curriculum-cache-version-test.js` (33/33), `curriculum-console-gate-test.js` (9/9), `curriculum-single-door-test.js` (23/23) — **PASS**
8. `node tests/gate-registry-test.js` — **PASS (10/10)**
9. `node tools/fiezel-guardians.mjs a10` — **PASS_WITH_RISK_REPORT (`errors=0, warnings=0`)**
