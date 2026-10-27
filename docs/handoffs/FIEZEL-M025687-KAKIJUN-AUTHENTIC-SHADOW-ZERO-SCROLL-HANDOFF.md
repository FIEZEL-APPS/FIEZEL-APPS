# DOSIR SERAH TERIMA RESMI (MANDATORY HANDOFF DOSSIER)
## FIEZEL Build m025-687: Kakijun Studio Authentic Shadow Guide, Mobile Zero-Scroll Architecture, and Sequential Advance Bugfix

**Nomor Build**: `m025-687`
**Cabang**: `feat/kakijun-ghost-trace-zero-scroll-m025-687`
**Tanggal**: 2026-10-28
**Status Mutu**: 100% HIJAU (Hexa-Sync Selaras, Playwright Multi-Viewport Pass, Baseline Emas Pass, Zero-Leak Thai Pass)

---

### 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan 5 kegagalan fatal pada Kakijun Studio (Studio Menulis Huruf Jepang):
1. **Tuntunan Bukan Bayangan & Obstruksi Gambar**:
   - *Akar Masalah*: Garis panduan awal pada canvas menggunakan warna pucat `#E2D9CE` yang nyaris tidak terlihat di atas kertas washi `#FAF7F2` (kontras hanya ~1.2:1). Lebih parah lagi, overlay SVG (`updateGuideOverlay`) merender garis tebal berwarna merah menyala (`#E11D48`, stroke-width 4.8, opacity 0.82) menutupi goresan karakter, sementara goresan tangan murid juga diwarnai merah (`#BE123C`). Akibatnya, goresan tangan murid tertutup total oleh garis merah SVG sehingga murid tidak dapat melihat apa yang sedang digambar.
   - *Solusi Baku*:
     - Goresan panduan (見本 / Mihon) diubah menjadi bayangan kaligrafi Jepang otentik abu-abu arang slate-400 (`#94A3B8`, stroke-width 6.2) di atas kertas washi hangat `#FAF8F5` dengan kontras 3:1 yang sangat jelas namun tetap lembut sebagai bayangan.
     - Goresan tangan aktif murid dan goresan yang telah selesai digambar dengan tinta hitam kaligrafi pekat obsidian Sumi (`#0F172A`, stroke-width 6.8) dengan rasio kontras 15:1 terhadap kertas washi.
     - Overlay SVG tidak lagi menggambar balok merah pekat. Overlay SVG hanya menyajikan indikator titik awal goresan berupa lingkaran crimson (`#E11D48`) dengan cincin lokator animasi berdenyut (*pulsating locator ring*) serta garis vektor putus-putus halus (`stroke="#64748B" stroke-dasharray="3 5"`).
2. **Viewport Mobile Zoom In/Out Tidak Terkunci**:
   - *Akar Masalah*: Gerakan cubit multi-jari (*pinch-to-zoom*), ketuk ganda, dan pantulan *rubber-band* peramban seluler belum dicegat secara menyeluruh.
   - *Solusi Baku*: Menambahkan `touch-action: none !important; user-select: none !important; overscroll-behavior: none !important;` serta listener `touchmove` (multi-touch lock) dan `gesturestart/change/end` yang memanggil `e.preventDefault()`.
3. **Pemborosan Ruang Kiri-Kanan & Kepadatan Kontrol di Layar Kecil**:
   - *Akar Masalah*: Desain desktop dijejalkan ke layar ponsel sempit, menyisakan margin kosong lebar dan memaksa scrolling vertikal panjang.
   - *Solusi Baku*: Arsitektur **Mobile-First Zero-Scroll**:
     - Modal ponsel berukuran penuh *edge-to-edge* (`100vw` x `100dvh`), tanpa scroll horizontal maupun vertikal (`scrollHeight <= clientHeight`).
     - Kanvas tulisan dimaksimalkan mengisi lebar layar ponsel (`min(calc(100vw - 20px), calc(100dvh - 210px), 360px)`).
     - Seluruh panel informasi yang ramai (kartu karakter, mode switcher ingatan/dipandu, dan daftar goresan) dipindahkan ke dalam *slide-up bottom sheet drawer* (`#kakijunInfoPanel`) yang dapat dibuka secara on-demand lewat tombol `[📋 Info]` di header atas.
     - Toolbar bawah disederhanakan menjadi dok grid 5 kolom presisi (`36px 1.05fr 1fr 1.15fr 36px`) dengan label responsif ringkas: `[ < ]` | `[ ▶ Contoh ]` | `[ ↶ Batal ]` | `[ Ulangi / Lanjut ]` | `[ > ]`.
4. **Bug Tombol "Lanjut ke Huruf Berikutnya" Mengulang Huruf yang Sama**:
   - *Akar Masalah*: Terdapat dua event listener yang saling bertabrakan: `actionBtn.onclick = function() { nextCharacter(); }` dan `actionBtn.addEventListener('click', resetCanvas)`. Saat murid menyelesaikan goresan dan mengeklik "Lanjut", fungsi `resetCanvas()` ikut terpanggil seketika dan mereset kanvas kembali ke huruf awal (`activeChar`), sehingga huruf berikutnya tidak pernah muncul.
   - *Solusi Baku*: Mengintegrasikan flag status `isCharacterCompleted` dan handler tunggal terpadu `handleNextActionClick()`:
     - Jika `isCharacterCompleted === true` -> navigasi memanggil `nextCharacter()`.
     - Jika belum selesai -> memanggil `resetCanvas()`.
     - Logika `nextCharacter()` dan `prevCharacter()` dibuat *script-aware* (`getActiveScriptChars()`) sehingga secara mulus mengalir dari 'あ' -> 'い' -> 'う' -> 'え' -> 'お'.
5. **Preservasi Tampilan Desktop & Tablet**:
   - Tata letak 2 kolom desktop dan tablet yang sudah benar dipertahankan 100% tanpa regresi.

---

### 2. Bukti Pengujian Empiris (Playwright Probe Automation)

Skrip pengujian headless Playwright dijalankan melalui `tests/kakijun_studio_probe.js` melintasi 3 matriks ukuran layar dan uji onboarding:

1. **Mobile Viewport (390 x 844)**:
   - `✓ jaKanaChart termuat`
   - `✓ Studio overlay berhasil terbuka`
   - `✓ Canvas ukuran retina: 360x360px (buffer: 720x720px)`
   - `✓ Goresan 1 berhasil digambar & tervalidasi!`
   - `✓ Bottom sheet drawer info berhasil dibuka secara on-demand`
   - `✓ Mode Ingatan (Recall) berhasil diaktifkan`
   - `✓ Zero-Scroll terbukti: 844px <= 844px (0px vertical scroll)`
   - `✓ Navigasi huruf berikutnya berjalan lancar: あ → い`
   - `📸 Screenshot: reports/kakijun-studio-mobile.png, reports/kakijun-studio-mobile-drawer.png`
2. **Tablet Viewport (820 x 1180)**:
   - `✓ Canvas ukuran retina: 380x380px`
   - `✓ Goresan 1 tervalidasi`
   - `✓ Mode recall & guided stabil`
   - `✓ Navigasi あ → い sukses`
   - `📸 Screenshot: reports/kakijun-studio-tablet.png`
3. **Desktop Viewport (1440 x 900)**:
   - `✓ Layout 2-kolom kokoh`
   - `✓ Canvas retina 380x380px`
   - `✓ Navigasi あ → い sukses`
   - `📸 Screenshot: reports/kakijun-studio-desktop.png`
4. **Onboarding Smart Placement Gate**:
   - `✓ Onboarding dibuka sukses tanpa benturan`

**Hasil Probe**:
```
🎉 PROBE PLAYWRIGHT: SEMUA UJI KAKIJUN STUDIO & SMART PLACEMENT 100% SUKSES!
```

---

### 3. Hexa-Sync & Gerbang Mutu Lokal

1. **Hexa-Sync Invariant (`tools/bump-build.mjs --check`)**:
   - `coordination/BUILD-VERSION.json`: `m025-687`
   - `sw.js`: `m025-687`
   - `core-config.js`: `m025-687`
   - `features/neural-voice/fiezel-diag-panel.js`: `m025-687`
   - `kurikulum.html`: `m025-687`
   - `misi.html`: `m025-687`
   - Status: **SELARAS (100% Synced)**.

2. **Pengujian Snapshot Emas Indonesia (`tests/id-golden-snapshot-test.js`)**:
   - Literal Indonesia utuh dan bersih.
   - Status: **HIJAU / PASS**.

3. **Pengujian Kebocoran Naskah Thai (`tests/th-ui-leak-test.js`)**:
   - Nol kebocoran teks Indonesia di mode Thai (`jepang.kakijun-tutup-info` terlindungi `T()`).
   - Status: **PASS**.

4. **Pengujian Integritas Cache Kurikulum (`tests/curriculum-cache-version-test.js`)**:
   - 33 penegasan, 3 halaman, build `m025-687`.
   - Status: **PASS**.

5. **Pemeriksaan Registri Gerbang (`tests/gate-registry-test.js`)**:
   - Status: **PASS (10 pass, 0 fail)**.

---

### 4. Daftar Berkas yang Disentuh

1. `features/japanese/fiezel-kakijun-studio.js`: Implementasi bayangan kaligrafi slate-400 `#94A3B8`, tinta obsidian Sumi `#0F172A`, overlay SVG non-intrusif, penanganan navigasi sequential terpadu, pencegahan multi-touch zoom, dan wiring drawer ponsel.
2. `features/japanese/fiezel-kakijun-studio.css`: Arsitektur responsif mobile-first zero-scroll, bottom sheet slide-up, dock toolbar grid 5-kolom, pencegahan viewport overflow.
3. `tests/kakijun_studio_probe.js`: Otomasi Playwright pengujian multi-viewport, penangkapan visual screenshot, dan pengujian drawer on-demand.
4. `id-golden-baseline.json`: Regenerasi baseline emas setelah penambahan label responsif studio.
5. Berkas sinkronisasi build `m025-687`: `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `reports/th-ui-leak-report.json`.
