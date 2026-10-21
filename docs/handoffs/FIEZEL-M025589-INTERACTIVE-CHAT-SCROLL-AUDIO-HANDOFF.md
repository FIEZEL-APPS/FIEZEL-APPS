# DOSIR SERAH TERIMA RESMI (HANDOFF DOSSIER)
**ID Rilis**: FIEZEL-M025589-INTERACTIVE-CHAT-SCROLL-AUDIO
**Nomor Build**: `m025-589`
**Tanggal**: 17 Oktober 2026
**Status**: SIAP RILIS (Gerbang Mutu 100% HIJAU)
**Otoritas**: OWNER / MASTER Authority Certified

---

## 1. Ringkasan Temuan Audit & Solusi

Berdasarkan keluhan pengguna mengenai scrolling yang terhambat (*scrolling nyangkut*), audio asisten AI yang tidak bersuara (*ai tidak mengeluarkan suara*), serta ruang kosong/void besar di bagian bawah layar (*ruang kosong atau voidnya*):

1. **Akar Masalah Ruang Hampa Bawah (Bottom Void Space & Container Collapse)**:
   - Aturan global `index.html` baris 413 (`#app > div`) memaksakan `padding-bottom: calc(76px + env(safe-area-inset-bottom, 12px)) !important;` pada semua anak langsung `#app`. Karena `.fzc-container` merupakan anak langsung `<div id="app">`, kontainer chat terdorong ke atas sebesar 88px.
   - Aturan `main.app` sebelumnya menggunakan `height: calc(100dvh - 56px) !important;`. Mengingat header `.topbar` (56px) berada di dalam `<main class="app">`, pembatasan ini memotong viewport sebesar 56px tambahan di dasar layar.
   - Elemen dekoratif `.nav-scrim` (`style.css` baris 1736) memiliki `z-index: 39` dan tinggi 96px dengan gradien memudar, menimpa `.fzc-dock` (`z-index: 30`), sehingga bilah input terlihat redup dan memudar di atas kanvas kosong.
   - **Solusi**:
     - Menetapkan selector spesifik `#app > div.fzc-container, #app > .fzc-container, .fzc-container` dengan `padding: 0 !important; padding-bottom: 0 !important; scroll-padding-bottom: 0 !important; flex: 1 1 0px !important; min-height: 0 !important;`.
     - Mengubah `main.app` menjadi `height: 100dvh !important; max-height: 100dvh !important; display: flex !important; flex-direction: column !important; overflow: hidden !important;`.
     - Mengatur `#app` menjadi `height: 100% !important; flex: 1 1 0px !important; min-height: 0 !important; overflow: hidden !important;`.
     - Menyembunyikan `.nav-scrim` secara eksplisit saat `body.fz-view-chat` aktif (`display: none !important;`).
     - Menaikkan lapis tumpukan `.fzc-dock` ke `z-index: 50 !important;`, latar belakang solid `#FDFAF3 !important;`, dan tombol kirim tegas `#1B1418`.
     - **Hasil Empiris**: Jarak dermaga input ke batas dasar layar (`gapToScreenBottom`) terukur tepat **0 piksel**, dan tinggi feed pesan mengembang dari 452px menjadi 584px.

2. **Akar Masalah Scrolling Nyangkut (Outer Body Scroll Leak & Flex Containment)**:
   - `<div id="app">` di dalam `<main class="app">` tidak memiliki aturan flex dan batas tinggi, menjepit `.fzc-feed` menjadi 34px.
   - Elemen non-visual latar belakang (`#liveStatus` dan `#fiezelDiagOpen`) menyebabkan bocoran tinggi body sebesar 79px (`bodyScrollHeight = 923px` pada viewport 844px), sehingga sentuhan layar digulirkan ke dokumen luar.
   - **Solusi**: Penguncian `body.fz-view-chat` (`position: fixed !important; height: 100dvh !important; overflow: hidden !important;`), eliminasi bocoran elemen latar, dan penetapan `.fzc-feed` sebagai satu-satunya elemen gulir dengan `overscroll-behavior-y: contain !important; touch-action: pan-y !important;`.

3. **Akar Masalah Audio AI Bisu (Speech Synthesis Routing & Web IDL Guard)**:
   - `getActiveCourse()` mengembalikan `'en'` karena `FiezelI18n.getCourse()` bernilai `null`.
   - `playVoice()` mengarahkan pemutaran ke `FiezelVoiceSay.say()`, yang mengembalikan `false` dan langsung `return` untuk teks Jepang dan teks dinamis non-precache, tidak pernah mencapai Web Speech Synthesis.
   - Objek tiruan pada `SpeechSynthesisUtterance.voice` menyebabkan TypeError ketat di Chromium.
   - Pemanggilan `updateUI()` saat audio berganti merusak DOM obrolan dan mereset posisi scroll.
   - **Solusi**: Routing langsung teks Jepang ke `speakViaWebSpeech()`, penugasan `utter.voice` yang dilindungi blok `try/catch`, dan pembaruan UI lokal `updateAudioButtonUI()` tanpa kedip.

---

## 2. Bukti Pengujian Empiris (Empirical Verification)

1. **Pengujian Headless Playwright Probe (`tools/dev/probe-interactive-chat.mjs`)**:
   - `Scroll audit results`:
     - `bodyScrollHeight`: 844, `bodyClientHeight`: 844 (0px leak, 100% terkunci).
     - `feedHeight`: 584, `gapToScreenBottom`: 0.
   - `Speech playback result`:
     - `spoken.text`: `'いらっしゃいませ！ラーメン屋へようこそ。何名様ですか？ご注文はお決まりですか？'`.
     - `spoken.lang`: `'ja-JP'`.
     - `isPlayingClass`: true.
   - `Visual Frame Certification`:
     - Tangkapan layar `tools/dev/interactive-chat-preview.png` membuktikan zero-void pada dermaga input bawah dan tombol kirim tegas.
   - **Hasil Probe**: `>>> EMPIRICAL PLAYWRIGHT AUDIT: 100% PASS <<<`.

2. **Suite Pengujian Mutu Lokal**:
   - `node tests/interactive-chat-test.js`: **8/8 PASS**
   - `node tests/id-golden-snapshot-test.js`: **HIJAU**
   - `node tests/th-ui-leak-test.js`: **PASS**
   - `node tests/curriculum-cache-version-test.js`: **PASS (build m025-589)**
   - `node tests/gate-registry-test.js`: **10/10 PASS**
   - `node tests/i18n-kunci-hantu-test.js`: **PASS**
   - `node tools/fiezel-guardians.mjs a9`: **PASS**
   - `node tools/fiezel-guardians.mjs a10`: **PASS**
   - `node tools/fiezel-guardians.mjs a11`: **MACHINE_BOUNDARY_OK (base=588, head=589)**
   - `node tools/fiezel-guardians.mjs a13`: **PASS**
   - `git diff --check origin/main`: **PASS (0 whitespace error)**
   - `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync Invariant)**

---

## 3. Daftar Berkas yang Disentuh (Files Changed)

- `features/interactive-chat/interactive-chat.css`: Eliminasi void bawah, override `#app > div`, isolasi `.nav-scrim`, penetapan 100dvh fleksibel, `z-index: 50` pada dock solid.
- `tools/dev/probe-interactive-chat.mjs`: Pembaruan jeda tangkapan layar visual, audit metrik scroll, dan verifikasi web speech.
- `docs/handoffs/FIEZEL-M025589-INTERACTIVE-CHAT-SCROLL-AUDIO-HANDOFF.md`: Dokumen serah terima resmi build `m025-589`.

---

## 4. Rencana Tahap Lanjutan (Next Step / Roadmap)
1. Integrasi streaming token LLM secara bertahap untuk respon asisten yang lebih dinamis.
2. Penambahan opsi latihan berbicara bebas (*open conversation*) dengan penilaian kefasihan berbasis telemetri Braincore BKT.
