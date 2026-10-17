# DOSIR SERAH TERIMA RESMI (HANDOFF DOSSIER)
**ID Rilis**: FIEZEL-M025591-INTERACTIVE-CHAT-SCROLL-AUDIO
**Nomor Build**: `m025-591`
**Tanggal**: 17 Oktober 2026
**Status**: SIAP RILIS (Gerbang Mutu 100% HIJAU)

---

## 1. Ringkasan Temuan Audit & Solusi

Berdasarkan keluhan pengguna mengenai scrolling yang terhambat (*scrolling nyangkut*) dan asisten AI yang tidak mengeluarkan suara (*ai tidak mengeluarkan suara*):

1. **Akar Masalah Scrolling Nyangkut (Outer Body Scroll Leak & Flex Collapse)**:
   - `<div id="app">` di dalam `<main class="app">` tidak memiliki deklarasi `flex` atau batas tinggi, sehingga `.fzc-container` terjepit menjadi 355px dan `.fzc-feed` menyusut menjadi 34px.
   - Elemen non-visual di latar belakang (`#liveStatus` dan panel `#fiezelDiagOpen`) menyebabkan bocoran tinggi body sebesar 79px (`bodyScrollHeight = 923px` pada viewport 844px), sehingga peramban ponsel mendistribusikan gestur gulir ke dokumen luar alih-alih kontainer pesan dalam.
   - **Solusi**:
     - Menerapkan penguncian total pada `body.fz-view-chat` (`position: fixed !important; height: 100dvh !important; overflow: hidden !important; width: 100% !important;`).
     - Menyembunyikan elemen latar belakang tak terlihat (`#liveStatus`, `#fiezelDiagOpen`) secara absolut saat mode chat aktif.
     - Menerapkan fleksibilitas kolom penuh pada `#app` dan `main.app` (`flex: 1 1 0px !important; min-height: 0 !important; height: 100% !important;`).
     - Menetapkan `.fzc-feed` sebagai satu-satunya elemen gulir dengan `overscroll-behavior-y: contain !important; touch-action: pan-y !important; -webkit-overflow-scrolling: touch !important;`.
     - Hasil empiris: `bodyScrollHeight` turun menjadi tepat 844px (bocoran 0px), dan `.fzc-feed` mengembang penuh ke 452px dengan kemampuan gulir mulus.

2. **Akar Masalah Audio AI Bisu (Speech Synthesis Routing & Strict IDL TypeError)**:
   - `getActiveCourse()` mengembalikan `'en'` karena `FiezelI18n.getCourse()` bernilai `null` dan dievaluasi dengan `null === 'ja' ? 'ja' : 'en'`.
   - `playVoice()` mengarahkan semua pemutaran secara buta ke `FiezelVoiceSay.say()`. Fungsi tersebut mengembalikan `false` dan langsung keluar (`return;`) saat menerima teks Jepang atau kalimat dinamis yang tidak ada di cache hash audio, sehingga tidak pernah mencapai `speechSynthesis`.
   - Menetapkan objek tiruan ke properti `SpeechSynthesisUtterance.voice` menyebabkan `TypeError` di Chromium.
   - Panggilan `updateUI()` secara menyeluruh saat status audio berubah menghancurkan DOM obrolan dan mereset posisi scroll pengguna.
   - **Solusi**:
     - Rombak `getActiveCourse()` untuk memprioritaskan bahasa target aktif (`activeTargetLang()`) dan pengecekan kursus secara eksplisit.
     - Rombak `playVoice()`: Kalimat bahasa Jepang langsung dialirkan ke `speakViaWebSpeech()`, sedangkan bahasa Inggris mencoba `FiezelVoiceSay` terlebih dahulu dan bertransisi mulus ke `speakViaWebSpeech()` bila tidak tersedia di bank suara.
     - Membungkus penugasan `utter.voice = selected` dalam blok `try/catch` guna melindungi dari galat antarmuka Web IDL.
     - Mengganti render ulang seluruh halaman dengan `updateAudioButtonUI()`, menjaga posisi scroll, momentum, dan fokus input murid tetap utuh.

3. **Penyempurnaan Tampilan UI/UX**:
   - Merapikan tombol tindakan di bawah bubble asisten menjadi micro-pills elegan satu baris: `🔊 Dengar`, `🌐 Arti`, `🎙️ Shadowing` dengan `white-space: nowrap !important;`.
   - Merapikan header mitra agar `フィゼル先生` tampil rapi dalam satu baris.

---

## 2. Bukti Pengujian Empiris (Empirical Verification)

1. **Pengujian Headless Playwright Probe (`tools/dev/probe-interactive-chat.mjs`)**:
   - `Scroll audit results`:
     - `bodyScrollHeight`: 844, `bodyClientHeight`: 844 (0px leak, 100% terkunci).
     - `htmlScrollHeight`: 844, `htmlClientHeight`: 844.
     - `feedHeight`: 452, `feedScrollHeight`: 527, `feedCanScroll`: true.
   - `Speech playback result`:
     - `spoken.text`: `'いらっしゃいませ！ラーメン屋へようこそ。何名様ですか？ご注文はお決まりですか？'`.
     - `spoken.lang`: `'ja-JP'`.
     - `isPlayingClass`: true.
   - `Zero-Loss Input & State Flow`:
     - Bubble murid di feed terisi dan tersimpan: `"ごちそうさまでした！とても美味しかったです。"`.
     - Navigasi kembali via Topbar bekerja mulus menuju layar `latihan`.
   - **Hasil Probe**: `>>> EMPIRICAL PLAYWRIGHT AUDIT: 100% PASS <<<`.

2. **Suite Pengujian Mutu Lokal**:
   - `node tests/interactive-chat-test.js`: **8/8 PASS**
   - `node tests/id-golden-snapshot-test.js`: **HIJAU**
   - `node tests/th-ui-leak-test.js`: **PASS**
   - `node tests/curriculum-cache-version-test.js`: **PASS (build m025-591)**
   - `node tests/gate-registry-test.js`: **10/10 PASS**
   - `node tests/i18n-kunci-hantu-test.js`: **PASS**
   - `git diff --check origin/main`: **PASS (0 whitespace error)**
   - `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync Invariant)**

---

## 3. Daftar Berkas yang Disentuh (Files Changed)

- `features/interactive-chat/fiezel-interactive-chat.js`: Perbaikan perutean audio Web Speech Synthesis, `getActiveCourse`, penanganan suara aman Web IDL, dan pembaruan UI audio lokal tanpa kedip.
- `features/interactive-chat/interactive-chat.css`: Penguncian viewport, penataan flexbox penuh kontainer chat, perbaikan dimensi feed, dan micro-pills satu baris.
- `features/ui/fiezel-tactile-clay.css`: Pengaturan gaya tactile clay pendukung.
- `id-golden-baseline.json`: Pembaruan baseline emas naskah Indonesia.
- `tools/dev/probe-interactive-chat.mjs`: Penambahan audit metrik scroll, pembuktian sintesis audio, dan tangkapan layar visual.
- `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `sw.js`: Kenaikan nomor build terkoordinasi ke `m025-591`.
- `docs/handoffs/FIEZEL-M025591-INTERACTIVE-CHAT-SCROLL-AUDIO-HANDOFF.md`: Dokumen serah terima resmi rilis ini.
