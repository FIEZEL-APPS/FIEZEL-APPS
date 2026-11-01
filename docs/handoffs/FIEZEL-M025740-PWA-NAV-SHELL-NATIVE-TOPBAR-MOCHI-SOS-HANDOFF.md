# FIEZEL m025-740 Handoff Dossier: PWA Navigation Cache Fix, Native Status Bar & Topbar Geometry, Mochi SOS Zero-Collision & Clean Voice Studio

**Build Version**: `m025-740`
**Target Release**: Production (`https://fiezel.my.id/app/`)
**Date**: 2026-11-02
**Scope**: `fix(auth): [ALLOW-PROTECTED: auth|onboarding|pwa] resolve PWA shell cache, native header geometry, topbars, and mochi voice sos`

---

## 1. Ringkasan Temuan Audit & Solusi Tuntas
1. **PWA Sub-Document Navigation Cache Miss (`call.html` Menampilkan Splash Screen)**:
   - **Penyebab**: Di `sw.js`, penangan navigasi Service Worker memanggil `caches.match(e.request, { cacheName: SHELL_CACHE })` tanpa opsi `{ ignoreSearch: true }`. Ketika PWA iframe memanggil `call.html?embed=1&tab=call&lang=ja...`, query string menyebabkan cache miss, sehingga fallback navigasi langsung menyajikan `./index.html` (dengan splash screen boot `#1B1418`).
   - **Solusi**:
     - Menambahkan `{ ignoreSearch: true }` pada pencarian `SHELL_CACHE`.
     - Normalisasi rute URL pathname bersih (`cleanNavUrl`).
     - Menambahkan pengecekan eksplisit agar sub-dokumen kanonikal (`call.html`, `misi.html`, `kurikulum.html`) tidak pernah jatuh (fallback) ke `./index.html`.
     - Self-healing guard di `features/interactive-chat/fiezel-interactive-chat.js` dan `index.html` yang mendeteksi jika `index.html` termuat dalam iframe Kawan Bicara dan otomatis menggantinya kembali ke `call.html`.

2. **PWA iOS Launch Status Bar White Flash & Cut-Off Header**:
   - **Penyebab**: Di `index.html`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">` menyebabkan iOS Home Screen PWA merender bilah putih pekat di area status bar saat ikon ditekan sebelum webview sepenuhnya siap. Ditambah dengan `top: max(14px, ...)` tanpa safe-area yang memadai, elemen tombol bahasa dan header terpotong di bawah Dynamic Island iPhone 15+.
   - **Solusi**:
     - Mengubah status bar style ke `content="black-translucent"`, memungkinkan latar splash `#1B1418` membentang mulus ke ujung atas layar fisik (`viewport-fit=cover`) tanpa kedipan putih sama sekali.
     - Memperbaiki geometri SVG kontur di `index.html`, `features/brand/fiezel-splash.js`, `features/auth/fiezel-auth-screen.js`, dan `features/onboarding/fiezel-onboarding.js` menjadi `viewBox="0 -56 390 476"` dengan `preserveAspectRatio="xMidYMin slice"`.
     - Menghapus lapisan kabut hitam buatan (`mask-image` dan `.fz-auth-hero::before`) yang memotong garis lengkung secara anomali di layar Masuk, Daftar, Selamat Datang, dan Splash.

3. **Eliminasi Pop-up Hitam & Suara Ganda Bertabrakan pada Mochi SOS**:
   - **Penyebab**:
     - Mengetuk tombol toggle Mochi SOS memunculkan `fzMochiSosConfirmModal` modal hitam panjang berisi rincian kuota dan anti-hangus.
     - Saat pertama kali diaktifkan, `OPENING_AUDIO_WATCHDOG_MS` atau fallback token memanggil `_fallbackSpeechTurn` (Edge TTS wanita `gadis`), sementara koneksi WebSocket Gemini Live (suara `Puck`) juga tersambung dan memutar audio live secara bersamaan.
   - **Solusi**:
     - `showConfirmationModal` dan toggle handler langsung memanggil `setMochiEnabled(true, { userConfirmed: true })` seketika tanpa menampilkan modal pop-up hitam apa pun.
     - Menyinkronkan pemutar audio: ketika audio Gemini Live tiba, `_fallbackTtsSource` langsung dihentikan dan `_fallbackTtsAbort` langsung dibatalkan.
     - Menambahkan guard ketat di `_fallbackSpeechTurn` agar tidak pernah dieksekusi bila `_ws` sedang tersambung/terhubung (`readyState <= 1`) atau jika audio sedang aktif.

4. **Penyelarasan UI Kawan Bicara (`call.html`) & Topbar Bersih**:
   - Menghapus teks melayang `"MOCHI"` yang sempat menimpa wajah dan mata maskot 3D.
   - Merapikan topbar mobile pada layar 390px agar nama tutor (`Sensei Nanami`) terpotong rapi dengan ellipsis dan tombol `EN | JA` tidak bertabrakan dengan tombol kembali.
   - Menyederhanakan modal konfirmasi panggilan menjadi teks ringkas dan padat (hanya informasi penggunaan Gem gratis dari latihan harian serta tombol Sambungkan & Batal).
   - Menghilangkan ornamen titik/jaring laba-laba (`.topbar-ornament-bg`) yang mengotori judul halaman pada seluruh topbar PWA.
   - Menyesuaikan tinggi dan safe-area quiz topbar (`height: calc(54px + env(safe-area-inset-top, 0px))`) agar elemen kontrol kuis tidak pernah terpotong oleh notch / Dynamic Island.

---

## 2. Bukti Kelulusan Seluruh Gerbang Mutu (Unit Test & Verification Gates)
Semua gerbang berikut dijalankan dan diverifikasi 100% HIJAU:
- `node tests/sw-nav-shell-first-test.js` -> PASS (17/17 assertions)
- `node tests/update-prompt-test.js` -> PASS (13/13 assertions)
- `node tests/auth-screen-test.js` -> PASS (11/11 assertions)
- `node tests/topbar-status-bar-seam-test.js` -> PASS (8/8 assertions)
- `node tests/mochi-voice-sos-test.js` -> PASS (27/27 assertions + Braincore FSRS-6 + Japanese Grammar)
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline Indonesia utuh)
- `node tests/th-ui-leak-test.js` -> PASS (0 kebocoran UI di mode Thai)
- `node tests/curriculum-cache-version-test.js` -> PASS (33 assertions, m025-740)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tests/pwa-cache-test.js` -> PASS (5.19.0 shell cache verified)
- `node tools/bump-build.mjs --check` -> PASS (Selaras m025-740)

---

## 3. Daftar Berkas yang Dimodifikasi
- `index.html`: status bar style `black-translucent`, SVG topografi `viewBox="0 -56 390 476"`, iframe containment self-heal guard.
- `sw.js`: navigasi `SHELL_CACHE` dengan `ignoreSearch: true`, pembersihan query string pada sub-dokumen, bump build `m025-740`.
- `features/auth/fiezel-auth-screen.js`: perbaikan viewBox SVG topografi.
- `features/brand/fiezel-splash.js`: perbaikan viewBox SVG topografi.
- `features/onboarding/fiezel-onboarding.js`: perbaikan viewBox SVG topografi.
- `features/interactive-chat/fiezel-interactive-chat.js`: penanganan mandiri pemulihan iframe `call.html`.
- `features/mascot/fiezel-mochi-voice-sos.js`: toggle langsung tanpa modal hitam, pelindung anti-tabrakan suara Edge TTS vs Gemini Live.
- `features/ui/fiezel-update-prompt.js`: perlindungan integritas cache saat kontrol aktif.
- `features/ui/fiezel-tactile-clay.css`: pengecualian tombol tutup dialog dari efek clay 3D, penyembunyian ornamen `.topbar-ornament-bg`.
- `features/ui/mobile-edge-fit.css`: penghapusan kabut topbar `mask-image`.
- `features/voice-studio/src/App.tsx`: pembersihan teks Mochi melayang, responsivitas topbar mobile 390px, modal ringkas Kawan Bicara.
- `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: kompilasi Vite terbaru.
- `style.css`: penghapusan efek kabut hitam, penyesuaian quiz topbar safe area, isolasi topbar classroom.
- Titik Hexa-Sync kanonikal (`coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`).
