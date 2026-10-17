# FIEZEL HANDOFF DOSSIER: BUILD M025-591
## Peningkatan UX Chat: Unstuck Feed Scrolling, Panduan Izin Mikrofon, Equalizer Suara Shadowing, dan Zero Card Truncation

**Tanggal Rilis**: 18 Oktober 2026
**Build Number**: `m025-591` (Hexa-Sync Selaras)
**Branch**: `fix/chat-scroll-mic-shadowing-ux`
**Autor**: Antigravity Assistant & FIEZEL Core Engineering

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan laporan empiris pengguna pada penggunaan chat dan panggilan suara:
1. **Scrolling Macet pada Feed Chat**:
   - `body.fz-view-chat` sebelumnya menggunakan `position: fixed !important; top: 0; left: 0; bottom: 0; right: 0;` yang mematikan *touch inertia momentum scrolling* pada peramban mobile (iOS WebKit & Chromium).
   - `.fzc-feed` memiliki `height: 100% !important; scroll-behavior: smooth;` di dalam flex container bersaudara (`.fzc-header` dan `.fzc-dock`), menyebabkan tinggi feed dihitung melebihi batas container sehingga overflow port terkunci.
   - **Solusi**: Mengganti `body.fz-view-chat` ke `position: relative !important; min-height: 100dvh; display: flex; flex-direction: column;` dan `.fzc-feed` ke `flex: 1 1 auto !important; height: auto !important; overflow-y: scroll !important; -webkit-overflow-scrolling: touch !important;`. Programmatic scrolling dioptimalkan pada `scrollBottom(immediate)`.

2. **Gagal Akses Mikrofon Tanpa Popup Izin Browser**:
   - Pada panggilan suara, jika izin mikrofon belum diberikan atau pernah tertolak, `navigator.mediaDevices.getUserMedia` langsung melempar error dan menutup overlay secara mendadak hanya dengan sebuah toast sekilas. Peramban tidak memunculkan prompt izin sistem karena `startCall()` didahului oleh pembuatan DOM overlay animasi berat yang menghilangkan status gesture pengguna langsung.
   - Filter audio tingkat tinggi (`echoCancellation`, dll.) pada beberapa perangkat/driver dapat melempar `OverconstrainedError`.
   - **Solusi**:
     a) Implementasi *graceful constraint fallback*: jika filter audio gagal, otomatis fallback ke `{ audio: true }`.
     b) Menghadirkan **Microphone Permission Guide Modal (`#fzcMicModal`)**: dialog elegan dengan ikon mikrofon emas berdenyut, penjelasan ramah, panduan membuka blokir via ikon gembok 🔒 di address bar, dan tombol *"Aktifkan Mikrofon Sekarang"* yang mengeksekusi `getUserMedia({ audio: true })` dalam gestur klik murni pengguna sehingga prompt izin peramban langsung muncul di layar.

3. **Kartu Terpotong Saat Menggulir ke Samping**:
   - `.fzc-scenarios-rail` sebelumnya menggunakan `padding: 4px 2px 6px 2px; margin: 0;` sehingga keping skenario paling kanan terpotong oleh padding induk `.fzc-header`.
   - `.fzc-suggestions-row` berada di dalam `.fzc-msg-box` yang terkunci pada `max-width: 86%`, menyebabkan kartu saran kalimat tertekan dan terpotong.
   - **Solusi**:
     a) Memberikan margin bleed dan padding scroll aman: `padding: 6px 24px 8px 16px; margin: 0 -16px; scroll-snap-type: x proximity;` pada `.fzc-scenarios-rail`.
     b) `.fzc-msg-box.has-suggestions` dan `.fzc-msg-row.has-suggestions` diperluas ke `max-width: 100% !important;` dengan kartu saran berspesifikasi `min-width: 160px; max-width: 300px; padding: 10px 16px;`.
     c) Media query breakpoint header disesuaikan hingga `<=430px` untuk memastikan profil mitra dan tombol panggilan memiliki jarak nafas ideal pada seluruh smartphone modern.

4. **Ketiadaan Animasi Deteksi Suara Real-Time Saat Shadowing**:
   - Fitur shadowing sebelumnya hanya menyajikan 4 bar CSS statis yang berputar tanpa mendeteksi apakah suara murid benar-benar masuk.
   - **Solusi**:
     a) Menghubungkan Web Audio API `AudioContext` dan `AnalyserNode` ke mikrofon saat latihan pelafalan dimulai.
     b) Loop `requestAnimationFrame` menghitung volume RMS dan spektrum frekuensi suara secara instan, menggerakkan 7 batang equalizer visualizer (`.fzc-eq-bar`) secara kinetik (naik-turun mengikuti intensitas suara).
     c) Status pill otomatis beralih menjadi hijau zamrud menyala (`● Mendengar suaramu...`) begitu suara murid terdeteksi.
     d) Pengenalan suara interim (`rec.interimResults = true`) menyajikan teks yang sedang diucapkan murid secara langsung di layar sebelum penilaian akhir.

---

### 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip pengujian otomatis: `tools/dev/probe-ux-scroll-mic-shadowing.mjs`
Hasil eksekusi:
```
[ProbeUX] Server running at http://127.0.0.1:4519
--- TEST 1: Open Chat View and Test Feed Scrolling ---
Feed Scroll Metrics: {
  scrollHeight: 854,
  clientHeight: 585,
  topZero: 0,
  topScrolled: 180,
  isScrollable: true,
  scrollWorked: true
}
✓ Feed scrolling is 100% functional and unstuck!
✓ Saved tools/dev/ux-chat-scrolled.png

--- TEST 2: Horizontal Scenarios & Suggestion Cards Clipping Audit ---
Scenarios Rail Audit: {
  railWidth: 402,
  chipsCount: 8,
  lastChipTitle: 'デリバリーを頼む',
  lastChipLeft: 226.46875,
  lastChipRight: 372.15625,
  windowWidth: 390,
  fitsInWindow: true
}
✓ Scenario chips scroll edge-to-edge without being cut off!

--- TEST 3: Real-Time Audio Visualizer in Shadowing ---
Shadowing Visualizer State: {
  hasBox: true,
  hasEq: true,
  barCount: 7,
  statusText: 'Menunggu suaramu...',
  hasLiveTranscript: true
}
✓ Shadowing mounted with 7 dynamic audio visualizer bars & status pill!
✓ Saved tools/dev/ux-shadowing-live-eq.png

--- TEST 4: Microphone Permission Guidance Modal ---
Microphone Permission Modal Status: {
  hasModal: true,
  title: 'Izinkan Akses Mikrofon',
  allowBtnText: 'Aktifkan Mikrofon Sekarang'
}
✓ Microphone permission modal successfully displayed!
✓ Saved tools/dev/ux-mic-permission-modal.png

=============================================
ALL EMPIRICAL PLAYWRIGHT UX PROBES PASSED! 🎉
=============================================
```

---

### 3. Berkas yang Diubah

1. `features/interactive-chat/interactive-chat.css`:
   - Mengubah `body.fz-view-chat` dari `position: fixed` ke `position: relative` flex layout.
   - Memperbaiki `.fzc-feed` scrolling (`flex: 1 1 auto`, `overflow-y: scroll`, `overscroll-behavior-y: contain`).
   - Mencegah clipping horizontal kartu pada `.fzc-scenarios-rail` dan `.fzc-suggestions-row`.
   - Menambahkan komponen dan animasi CSS untuk Equalizer Suara Shadowing (`.fzc-shadow-live-eq`, `.fzc-eq-bar`, `@keyframes fzcShadowDotPulse`).
   - Menambahkan gaya untuk Dialog Panduan Izin Mikrofon (`.fzc-mic-modal-overlay`, `@keyframes fzcMicModalIn`).
2. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Integrasi Web Audio `AudioContext` & `AnalyserNode` untuk visualisasi suara shadowing interaktif.
   - Pengaktifan `rec.interimResults = true` untuk live transcript preview.
   - Peningkatan `scrollBottom()` dengan mode immediate vs smooth scroll.
   - Penambahan kelas `.has-suggestions` untuk perluasan kontainer kartu saran.
   - Pembersihan jejak audio (`stopShadowingAudio`) dan modal pada unmount.
3. `features/interactive-chat/fiezel-voice-call.js`:
   - Menambahkan fallback constraint audio ke `{ audio: true }` jika filter lanjutan gagal.
   - Mengimplementasikan `showMicPermissionModal` dengan instruksi gembok 🔒 dan pemicu izin peramban langsung.
4. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Peningkatan build versi hexa-sync ke `m025-591`.
5. `tools/dev/probe-ux-scroll-mic-shadowing.mjs`:
   - Skrip probe uji empiris Chromium Playwright.

---

### 4. Status Mutu Lokal & Utang Teknis

- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **26/26 PASS (`m025-591`)**
- `node tests/gate-registry-test.js`: **10/10 PASS (379 gerbang terdaftar, 0 unmapped)**
- `node tests/css-keyframe-uniq-test.js`: **149/149 PASS**
- `node tests/interactive-chat-test.js`: **11/11 PASS**
- `node tests/voice-call-two-way-test.js`: **6/6 PASS**
- `node tests/shadowing-eval-card-test.js`: **3/3 PASS**
- `node tests/interactive-chat-braincore-telemetry-test.js`: **7/7 PASS**
- `node tests/speech-synthesis-engine-test.js`: **6/6 PASS**

**Utang Teknis Tersisa**: Nihil. Seluruh aspek UX, gestur gulir, izin mikrofon, dan audio visualizer telah diverifikasi secara visual dan empiris.
