# DOSSIER SERAH TERIMA FIEZEL: M025-535 — ELIMINASI JANK & OPTIMASI BUTTERY-SMOOTH SPLASH MOBILE PWA

## 1. Ringkasan Temuan & Latar Belakang Perubahan
- **Keluhan Pengguna**: "ada satu lagi msalah yang dihadapi oleh murid di pwa, yaitu saat memuat splash sangat lambat, dan animasinya patah patah tidak mulus" (Splash screen pembuka di mobile PWA lambat dimuat dan animasinya tersendat/patah-patah/freeze).
- **Hasil Audit Empiris (Playwright CDP CPU Profiler & PerformanceObserver)**:
  1. **Main Thread Monopolized by Three.js**:
     - `features/mascot/fiezel-mochi-companion.js` memanggil `init()` langsung saat `DOMContentLoaded`.
     - Inisialisasi ini mengimpor `three.module.js`, membuat context WebGL (`getContext`), mengompilasi shader (`onFirstUse`), dan membangun mesh 3D (`createShadow`, `createMochiMesh`) persis di tengah-tengah animasi partikel splash ($t \approx 1950\text{ms}$).
     - Akibatnya, terjadi Long Task raksasa (~450ms–700ms) yang membekukan animasi splash ("patah-patah" / freeze 0.4–0.7 detik).
  2. **Overloaded Mobile Particle Canvas**:
     - Modul `features/brand/fiezel-splash-particles.js` menetapkan minimum partikel di ponsel (`< 480px`) pada angka 1400–1700 titik. Pada layar 390px, kalkulasi trig dan 2D canvas per frame memakan ~10.8ms.
     - Canvas rendering di Retina/iPhone (DPR 3) membuat kanvas berukuran `1170x2532` (2,96 juta piksel), membebani fill-rate GPU mobile.
     - Setiap partikel memanggil `ctx.setTransform(cs * kx, sn * kx, ...)` bahkan ketika partikel sedang diam/tidak berputar.
  3. **Contention from Lazy Loader Scripts**:
     - `fiezel-lazy-loader.js` memicu pemuatan skrip idle (termasuk 265 KB modul suara neural) via `requestIdleCallback({ timeout: 1500 })` sebelum animasi splash tuntas, bersaing memperebutkan thread CPU.
  4. **DOM Style Invalidation Spams**:
     - `features/brand/fiezel-splash.js` menyuntikkan inline styles (`fGroup.style.opacity`, `barsGroup.style.opacity`, `wordSlot.style.transform`) di setiap frame rAF tanpa dirty-checking, memaksa style recalculation berulang kali meskipun nilainya sudah jenuh (0 atau 1).

---

## 2. Solusi & Optimasi Terpasang
1. **Penundaan Inisialisasi 3D Three.js Mochi Companion**:
   - `features/mascot/fiezel-mochi-companion.js`: Menambahkan penjaga `isSplashActive()`. Jika `#fiezelBootSplash` sedang tampil di layar, inisialisasi Three.js dan Mochi ditunda hingga splash selesai ditutup (`window.__fiezelBootSplashDismissed` / event `fiezel:splash-dismissed`).
   - Mencegah Long Task 450ms di tengah animasi splash secara total.
2. **Penyelarasan Siklus Hidup Splash & Event Dismissal**:
   - `features/brand/fiezel-splash.js`: Menyetel `target.__fiezelBootSplashDismissed = true` dan memancarkan CustomEvent `fiezel:splash-dismissed` saat `close()` dan `remove()` dipanggil.
   - Menambahkan dirty-checking pada `perFrame()`: nilai opasitas dan transform hanya dimutasi ke DOM jika nilai string berubah, mengeliminasi puluhan mutasi DOM per detik.
3. **Optimasi Kanvas Partikel Mobile**:
   - `features/brand/fiezel-splash-particles.js`:
     * Mengatur `adaptiveCount` untuk layar mobile (`< 480px`) pada rentang ideal 480–680 partikel (menghasilkan ~514 partikel di layar 390x844). Kerapatan visual huruf F dan dua kapsul emas tetap padat dan tajam, namun memotong beban kalkulasi CPU hingga 70%.
     * Membatasi `dpr` kanvas mobile maksimum 1.5. Mengurangi ukuran buffer kanvas dari ~3 juta piksel menjadi ~740 ribu piksel (penghematan 75% fill-rate GPU).
     * Fast-path unrotated particles: partikel yang berkecepatan rendah (`sp2 <= 0.09`) langsung digambar dengan `ctx.setTransform(kx, 0, 0, kx, ...)` tanpa kalkulasi trigonometri matriks rotasi.
4. **Penjadwalan Ramah Animasi di Lazy Loader**:
   - `fiezel-lazy-loader.js`: `whenIdle()` memeriksa apakah `#fiezelBootSplash` sedang aktif di layar. Jika aktif, eksekusi pemuatan skrip idle menunda diri 300ms sampai splash selesai, memastikan seluruh siklus rAF splash berjalan bebas hambatan.

---

## 3. Bukti Pengujian Empiris (Playwright Benchmark)
Dijalankan via `tools/dev/probe-splash-perf.mjs` & `tools/dev/trace-profile-longtask.mjs`:

| Metrik Kinerja | Sebelum Optimasi | Sesudah Optimasi (m025-535) | Peningkatan |
|---|---|---|---|
| **Frame Rate Splash (1x CPU)** | 34.8 FPS | **57.2 FPS** | **+64.3% (Mulus 60 FPS)** |
| **Total Frames Rendered** | 84 frames | **144 frames** | **+71.4% frame density** |
| **Max Frame Delta / Freeze (1x CPU)** | 366.5 ms (freeze 0.36s) | **50.0 ms** | **-86.4% eliminasi jank** |
| **Total Long Tasks Duration (1x CPU)** | 752 ms | **53 ms** | **-93.0% CPU blocking drop** |
| **Long Task Count (Splash Loop)** | 6 task | **1 task** (bootstrap awal) | **-83.3% eliminasi gangguan** |
| **Throttled Mobile (4x CPU) Active FPS** | 24.8 FPS | **48.6 FPS** | **+96.0% kelancaran** |
| **Throttled Max Frame Delta (Splash Active)**| 1249.9 ms (macet 1.2s) | **149.9 ms** | **-88.0% eliminasi macet** |
| **Three.js CPU Hits selama Splash** | 224 hits | **0 hits (Bersih Total)** | **100% tereliminasi** |

---

## 4. Daftar Berkas yang Disentuh & Perubahan
1. `features/brand/fiezel-splash-particles.js`: Optimasi `adaptiveCount` mobile (480–680), DPR clamp 1.5, dan fast-path unrotated particles.
2. `features/brand/fiezel-splash.js`: Menambahkan dirty checking di `perFrame()` dan memancarkan event `fiezel:splash-dismissed`.
3. `features/mascot/fiezel-mochi-companion.js`: Menambahkan `isSplashActive()` guard untuk menunda inisialisasi Three.js WebGL sampai splash selesai.
4. `fiezel-lazy-loader.js`: Menambahkan pemeriksaan splash di `whenIdle()` untuk mencegah kontensi background loading.
5. Berkas Hexa-Sync:
   - `coordination/BUILD-VERSION.json` -> `m025-535`
   - `sw.js` -> `m025-535`
   - `core-config.js` -> `m025-535`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-535`
   - `kurikulum.html` -> `m025-535`
   - `misi.html` -> `m025-535`
6. `docs/handoffs/FIEZEL-M025535-SPLASH-PERF-HANDOFF.md`: Dokumen serah terima ini.

---

## 5. Status Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js` -> PASS (HIJAU: baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js` -> PASS
- `node tests/curriculum-cache-version-test.js` -> PASS (build m025-535)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tests/splash-choreography-test.js` -> PASS
- `node tests/splash-first-paint-test.js` -> PASS
- `node tests/boot-first-paint-nonblocking-test.js` -> PASS (13/13 assert PASS)
- `node tests/test-jlpt-mochi-wire.js` -> PASS (ALL EMPIRICAL CHECKS PASSED WITH 100% SUCCESS)
- `node tools/bump-build.mjs --check` -> PASS (Selaras 6 titik m025-535)
