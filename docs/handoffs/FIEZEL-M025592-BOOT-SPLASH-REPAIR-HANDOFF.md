# FIEZEL HANDOFF DOSSIER: BUILD M025-592
## Perbaikan Komprehensif Siklus Boot, Transisi Splash, Watchdog, dan Eliminasi Blank Gap / Flicker

**Tanggal Rilis**: 18 Oktober 2026  
**Build Number**: `m025-592` (Hexa-Sync Selaras)  
**Branch**: `fix/chat-scroll-mic-shadowing-ux`  
**Otoritas Audit**: Antigravity Assistant & FIEZEL Core Engineering  

---

### 1. Ringkasan Temuan Audit & Solusi Rekayasa

Berdasarkan audit terorkestrasi 5 subagent dan pengujian empiris Playwright pada 4 skenario peluncuran (Cold Launch, Warm/Refresh, Slow Network + 4x CPU Throttle, dan Prefers-Reduced-Motion):

1. **Eliminasi Blank Gap & Stutter Transisi Splash (Skenario B)**:
   - **Akar Masalah**: Pada warm reload (muat ulang halaman setelah kunjungan pertama), `isColdLaunch()` bernilai false. Hal ini memicu `showBrandSplash()` langsung memanggil `disposeBootSplash()` yang membuang elemen DOM `#fiezelBootSplash` secara mendadak. Namun `render()` antarmuka beranda tertahan oleh resolusi `bootAuth === 'pending'` hingga ratusan milidetik. Akibatnya, terjadi celah kosong (blank screen gap) selama **663ms** di mana splash sudah hilang tetapi beranda belum digambar.
   - **Solusi Rekayasa**:
     a) Di `index.html`, ditambahkan `#fiezelBootFastBypass` pada Frame 0 yang memeriksa `sessionStorage`. Jika warm reload terdeteksi, splash tidak menahan layar selama 3.4 detik, melainkan langsung transisi cepat.
     b) Di `app.js`, pemanggilan `dismissBootSplash()` diposisikan tepat setelah `render()` dan `done(now)`, sehingga tirai splash hanya terangkat setelah shell aplikasi benar-benar siap dan ter-render ke DOM (`html.fz-app-open`).

2. **Perbaikan Transisi Keluar (Fade-Out 320ms)**:
   - **Akar Masalah**: Pada `features/ui/mobile-edge-fit.css`, terdapat aturan pemusnah: `html:not(.fz-booting) #fiezelBootSplash { display: none !important; }`. Begitu kelas `fz-booting` dilepas, transisi kelas `.is-leaving` (fade out 300ms) terbunuh seketika, menyebabkan jump-cut visual yang kasar.
   - **Solusi**: Selector diperbaiki menjadi `html:not(.fz-booting) #fiezelBootSplash:not(.is-leaving) { display: none !important; }`, dan animasi `@keyframes fz-splash-fade-out` didaftarkan secara sinkron di CSS kritis `index.html` dan `style.css`.

3. **Penyelarasan Siklus Hidup Mesin Partikel (Zero Zombie Particle Loop)**:
   - **Akar Masalah**: Di `features/brand/fiezel-splash-particles.js`, saat `skipBuild: true` aktif, blok `if (!N)` di dalam `init()` kembali memicu pembuatan sprite dan kanvas partikel, mengakibatkan 480 partikel tetap berjalan invisibel di background.
   - **Solusi**: Memperketat penanganan `this._skipBuild` pada `init()` dan menambahkan *early-return* di `update()`.

4. **Pembersihan Bersih (Clean Teardown) & Aksesibilitas Reduced-Motion**:
   - **Akar Masalah**: Di `features/brand/fiezel-splash.js` jalur `startStill()`, jika pengguna menekan tombol lewati/spasi sebelum ketukan `stampAt` (2140ms), fungsi `pawstamp.skip()` tidak bekerja karena pawstamp belum di-play, menyebabkan pengguna terjebak. Selain itu, pendengar pawstamp tidak di-disarm pada `ctl.cleanup`.
   - **Solusi**: Memperbaiki `ctl.skip` pada `startStill()` untuk membersihkan timer dan langsung memanggil `ctl.finish()`, serta menambahkan `pawstamp.disarm()` pada `ctl.cleanup`.

5. **Pencegahan Watchdog False Positive & Standar Kontras WCAG AA**:
   - **Akar Masalah**: Pada koneksi lambat, watchdog 15 detik di `index.html` dapat memunculkan kartu pemulihan `fiezelBootRecovery` sementara aplikasi masih mengunduh skrip. Kartu pemulihan memiliki warna teks `#E8D9C5` di atas latar putih `#FFFFFF` (rasio kontras 1.41:1, gagal telak WCAG AA).
   - **Solusi**: 
     a) Menambahkan metode `clearWatchdog` pada `window.__fiezelBootSplash` yang otomatis dipanggil saat splash diadopsi atau didismiss oleh aplikasi.
     b) Memperbaiki kontras kartu pemulihan ke `#6E635C` di atas putih (kontras rasio $\ge 4.5:1$, lolos WCAG 2.1 AA).

6. **Sinkronisasi Animasi Topbar Wordmark Birth**:
   - **Akar Masalah**: Di `features/ui/fiezel-boot-tail.js`, fungsi `birth()` untuk ledakan wordmark topbar terpicu sebelum `html.fz-app-open` aktif. Karena topbar memiliki `visibility: hidden !important` sebelum `fz-app-open`, animasi ledakan terjadi tanpa terlihat oleh pengguna.
   - **Solusi**: Memperkenalkan `readyForBirth()` yang memverifikasi kehadiran `fz-app-open` sebelum memicu `birth()`.

7. **Pencegahan Kebocoran UI (Zero UI Leak)**:
   - Di `features/ui/fiezel-tactile-clay.css`, `.nav-scrim` disembunyikan selama `html:not(.fz-app-open)`, elemen navigasi murid disembunyikan dari mode guru (`fz-teacher-mode`) dan layar auth (`fz-auth-open`), serta `body.fz-auth-open` diberi latar `#1B1418` untuk mengeliminasi kilatan krem 320ms.

---

### 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip pengujian: `tools/dev/probe-empirical-boot-audit.mjs`, `tools/dev/probe-returning-user-refresh.mjs`, dan `tools/dev/surface-transition-leak-probe.js`.

#### Rekap Metrik Pengujian 4 Skenario:
| Skenario | FCP | Splash Claimed | Splash Gone | Target Screen | Durasi Total | Status Error |
|---|---|---|---|---|---|---|
| **A. Cold Launch (Baru)** | 540 ms | 2599 ms | 3518 ms | Auth 3519 ms (Gap: 1ms) | 5826 ms | 0 Error / 0 Warn |
| **B. Warm Reload (Refresh)**| - | Disposed 199 ms | 1803 ms | Auth 2340 ms | 3918 ms | 0 Error / 0 Warn |
| **C. Slow 4G + CPU 4x** | 2236 ms | - | 17073 ms | Recovery Card (WCAG AA) | 19237 ms | 0 Error / 0 Warn |
| **D. Reduced-Motion** | 372 ms | 1896 ms | 3018 ms | Auth 3018 ms (Gap: 0ms) | 5135 ms | 0 Error / 0 Warn |

Bukti laporan lengkap tersimpan di: `tools/dev/empirical-audit-results.json`.

---

### 3. Daftar Berkas yang Dimodifikasi

1. `index.html`:
   - Penambahan style kritis `#fiezelBootSplash.is-leaving` dan `.fiezel-splash-still` kelasku tags.
   - Fast warm-bypass frame 0 pada script `#fiezelBootFastBypass`.
   - Perbaikan kontras teks recovery card dari `#E8D9C5` ke `#6E635C`.
   - Pembersihan listener `AbortSignal` di `__fiezelBootFetchGuard`.
   - Penambahan metode `clearWatchdog` pada `window.__fiezelBootSplash`.
   - Peningkatan ketahanan sandbox storage shim.
2. `style.css`:
   - `@keyframes fz-splash-fade-out` dan aturan kurangi-gerak `.fiezel-splash-still .kelasku-wordmark`.
3. `features/brand/fiezel-splash.js`:
   - Penanganan try/catch pada `makeClock` callbacks.
   - Penambahan `pawstamp.disarm()` pada pembersihan `ctl.cleanup`.
   - Perbaikan `ctl.skip` pada `startStill()` untuk bypass instan jika ditekan sebelum pawstamp dimulai.
   - Pemanggilan `clearWatchdog` saat elemen splash diadopsi dan didispose.
4. `features/brand/fiezel-splash-particles.js`:
   - Penghentian inisialisasi dan loop partikel saat `_skipBuild: true`.
5. `features/ui/mobile-edge-fit.css`:
   - Pengecualian `:not(.is-leaving)` pada aturan penyembunyian splash pasca-boot.
6. `features/ui/fiezel-tactile-clay.css`:
   - Cloaking `.nav-scrim` saat `html:not(.fz-app-open)`.
   - Penolakan bocoran navigasi murid pada mode guru dan auth gate.
   - Background `#1B1418` pada `body.fz-auth-open`.
7. `features/ui/fiezel-boot-tail.js`:
   - Sinkronisasi ledakan wordmark topbar (`readyForBirth()`) dengan kelas `fz-app-open`.
8. `app.js`:
   - Pemanggilan `dismissBootSplash()` setelah `render()` dan pembalikan urutan `done(now)` sebelum `dismissBootSplash()`.
   - Pemanggilan `clearWatchdog` di dalam `dismissBootSplash()`.
9. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Hexa-Sync sinkronisasi build nomor `m025-592`.
10. `id-golden-baseline.json`:
    - Regenerasi baseline emas naskah Indonesia untuk mengakomodasi dialog izin mikrofon chat.

---

### 4. Status Gerbang Mutu Lokal

- `node tests/splash-first-paint-test.js` → **PASS** (31/31)
- `node tests/splash-choreography-test.js` → **PASS** (28/28)
- `node tests/boot-order-test.js` → **PASS** (15/15)
- `node tests/boot-auth-verdict-test.js` → **PASS** (5/5)
- `node tests/teacher-instant-boot-test.js` → **PASS** (6/6)
- `node tests/id-golden-snapshot-test.js` → **PASS** (18/18)
- `node tests/th-ui-leak-test.js` → **PASS** (27/27)
- `node tests/curriculum-cache-version-test.js` → **PASS** (26/26)
- `node tests/gate-registry-test.js` → **PASS** (10/10)
- `node tools/bump-build.mjs --check` → **Selaras** (`m025-592`)
