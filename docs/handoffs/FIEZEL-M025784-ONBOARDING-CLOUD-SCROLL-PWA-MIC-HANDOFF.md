# FIEZEL Handoff Dossier — m025-784: Onboarding Cloud Wave Seam, Mobile Goal Grid & Scroll Fix, and User PWA Microphone Activation

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Perbaikan Total Onboarding (`features/ui/fiezel-tactile-clay.css`, `features/onboarding/fiezel-onboarding.js`)
1. **Eliminasi Celah Horizontal Hitam 18px di Bawah Gelombang Awan (`"ini fatal sekali"`)**:
   - **Akar Masalah:** Di `features/ui/fiezel-tactile-clay.css`, elemen `.fz-cloud-mist`, `.fz-cloud-back`, `.fz-cloud-front`, dan `.fz-auth-wave` (`<svg viewBox="0 0 412 160" preserveAspectRatio="none">`) memiliki `inset: 0 !important; width: 100% !important; height: auto !important;` di dalam `.fz-ob-cloud-cushion` (`height: 158px`). Pada layar mobile lebar `360px`, peramban menghitung tinggi SVG berdasarkan rasio aspek (`360 * 160 / 412 = 139.8px`) dan menggantungnya dari `top: 0`, menyisakan celah kosong `18.2px` di bagian bawah (`y = 289..307px`) yang memperlihatkan warna gelap `#1C1417` dan garis topografi emas dari `.fiezel-ob-reveal`.
   - **Solusi:** Mengubah posisi seluruh layer SVG awan menjadi `top: auto !important; bottom: -2px !important; left: 0 !important; right: 0 !important; width: 100% !important; height: 162px !important;` serta menambahkan alas solid `#FAF5ED` pada `.fz-ob-cloud-cushion::after` sehingga transisi awan ke lembar krim `100%` menyatu tanpa celah di semua resolusi layar (`320px–1920px`).
2. **Perbaikan Scroll & Tata Letak Grid 2 Kolom pada Langkah Tujuan & Level (`"di bagian ini user tidak bisa scroll sampai bawah untuk klik lanjut"`)**:
   - **Akar Masalah:**
     - `:root div.fiezel-ob[role="dialog"]` (`spesifisitas 0,3,1`) memiliki `overflow: hidden !important` yang mengalahkan `@media (max-width: 767px) { html body div.fiezel-ob[role="dialog"] { overflow-y: auto !important } }` (`spesifisitas 0,2,3`), sehingga `overflowY` terkunci `"hidden"` di layar mobile.
     - `:root html body .fiezel-ob .fiezel-ob-reveal` merupakan selektor tidak sah (`:root` adalah `html`) dan tertimpa oleh aturan `.fiezel-ob-reveal { height: 308px !important }` di baris bawahnya.
     - `.fiezel-goal-card` mewarisi `flex-direction: column` dari `style.css` dan tanda centang ganda `::after` dari `fiezel-2.css`.
     - Fungsi `paint()` di `features/onboarding/fiezel-onboarding.js` selalu mereset `host.scrollTop = 0; card.scrollTop = 0;` setiap kali pengguna menekan kartu tujuan (`[data-ob-goal]`) atau chip level (`[data-ob-level]`).
   - **Solusi:**
     - Mengaktifkan `overflow-x: hidden !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; touch-action: pan-y !important;` pada `.fiezel-ob` dan menempatkan aturan responsif `@media (max-width: 767px)` dengan spesifisitas `html:root body .fiezel-ob ...` di akhir berkas `fiezel-tactile-clay.css`.
     - Menata `.fiezel-goal-grid` dalam grid 2 kolom (`grid-template-columns: repeat(2, minmax(0, 1fr))`) dan `.fiezel-goal-card` dengan `flex-direction: row !important`, serta mematikan pseudo-elemen centang ganda `::after`.
     - Memperbaiki kontras tombol `Furigana: ON` (`.fiezel-ob-furigana-pill.is-active`), teks `.fiezel-note`, dan tombol `Lewati langkah ini` (`[data-ob-step-skip]`).
     - Menjaga posisi scroll di `paint()` saat berada di langkah yang sama dan menggulir otomatis ke tombol `[data-ob-advance]` bila berada di bawah lipatan layar.

### B. Perbaikan Aktivasi Mikrofon PWA Pengguna (`features/voice-studio/src/App.tsx`, `app.js`, `features/mascot/fiezel-mochi-voice-sos.js`)
1. **Isolasi Realm `AudioContext` & Watchdog Stream Lintas-Iframe (`App.tsx`, `app.js`)**:
   - **Akar Masalah:** `App.tsx` di dalam iframe `call.html` menggunakan `parentWin.__fzSharedLiveAudioCtx` milik `index.html`, yang menyebabkan node `createMediaStreamSource` / `createScriptProcessor` lintas-realm menghasilkan sampel `0.0` (hening) di peramban mobile, ditambah timeout `1500ms` yang terlalu singkat saat pengguna sedang menekan dialog izin mikrofon OS.
   - **Solusi:** Selalu membuat `liveAudioCtxRef.current = new CtxClass()` di realm `window` milik `call.html` sendiri, memperpanjang batas tunggu `parentWin.__fzSharedMicStreamPromise` menjadi `6000ms` (dengan sambungan `.then()` bila izin diberikan lebih lambat), serta menambahkan watchdog `800ms` yang otomatis mengambil `navigator.mediaDevices.getUserMedia` native di dalam `call.html` bila stream lintas-realm mengirim sampel kosong.
2. **Kalibrasi Barge-In (`rms >= 0.016`), Anti-Deadlock `turnComplete`, & Self-Healing Gesture (`App.tsx`, `fiezel-mochi-voice-sos.js`)**:
   - Menurunkan ambang `rms` barge-in di `handleMicPcmData` dari `0.16` menjadi `0.016` agar suara bicara normal di ponsel langsung terdeteksi.
   - Membebaskan status `isPlayingAiAudioRef` saat `turnComplete` tiba meskipun `outputAudioCtxRef.current.state === 'suspended'`.
   - Memperbaiki `toggleMuteMic` dan menambahkan listener capture-phase `pointerdown`/`touchstart`/`click` di `App.tsx` serta `armAudioWarmup` di `fiezel-mochi-voice-sos.js` agar ketukan pertama pengguna otomatis me-resume `AudioContext` dan mengakuisisi `getUserMedia` bila track mikrofon belum aktif/mati.

## 2. Bukti Pengujian Empiris (Playwright Headless & Unit Gates)
- `scratch/probe-onboarding-all-steps.mjs`: Seluruh 7 langkah Onboarding (`step0_lang`, `step1_name`, `step2a_course_pick`, `step2b_course_ja_settings`, `step3a_goal`, `step3b_goal_level`, `step4_placement`) diuji pada viewport `360x640`, `390x844`, dan `1280x800`. Celah hitam di bawah awan `0px`, `overflowY: "auto"`, dan tombol `Lanjut →` (`bottom: 614px <= 640px`) tampil utuh serta dapat di-scroll dan diklik.
- `node tests/multi-device-comfort-test.js`: PASS (8/8 invarian terjaga).
- `node tests/voice-duplex-fullphone-contract-test.js`: PASS (7/7 kontrak lulus).
- `node tests/voice-studio-ui-architecture-test.js`: PASS (8/8 bagian lulus).
- `node tests/voice-duplex-e2e-probe.js`: PASS (E2E peramban headless Kawan Bicara & Mochi SOS lulus).
- `node tests/mochi-voice-sos-test.js`: PASS (27/27 unit assertions lulus).
- `node tests/id-golden-snapshot-test.js`, `node tests/th-ui-leak-test.js`, `node tests/curriculum-cache-version-test.js`, `node tests/gate-registry-test.js`: PASS.

## 3. Daftar Berkas yang Disentuh
- `features/ui/fiezel-tactile-clay.css`
- `features/onboarding/fiezel-onboarding.js`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `features/mascot/fiezel-mochi-voice-sos.js`
- `app.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`
- `docs/handoffs/FIEZEL-M025784-ONBOARDING-CLOUD-SCROLL-PWA-MIC-HANDOFF.md`

## 4. Status Kelulusan Gerbang Mutu & Catatan Utang Teknis
- Seluruh gerbang mutu lokal dan 6-titik Hexa-Sync `m025-784` lulus 100%. Tidak ada utang teknis baru.
