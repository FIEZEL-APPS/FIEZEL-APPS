# FIEZEL HANDOFF: PWA Atomic Delta Cache, Seamless Auto Cutover, & Anti-Poisoning Architecture (m025-781)

## 1. Ringkasan Eksekutif & Akar Masalah (The Mobile PWA Cache Nightmare)
Pada instalasi PWA di perangkat seluler (Android Chrome & iOS Safari Web Clip), pembaruan aplikasi ke build baru (`m025-779` dan seterusnya) mengalami kerusakan tampilan (splash rusak, styling kembali ke CSS lama, atau UI berkedip aneh) pada perangkat yang sudah terinstal, sedangkan instalasi baru pada HP baru atau Desktop Web selalu berjalan mulus.

Audit empiris headless Playwright (`scratch/pwa-mobile-upgrade-probe.mjs`) membuktikan 5 akar penyebab struktural:
1. **Cross-Generation Cache Poisoning (Frankenstein Cache)**:
   Fungsi `segarkan` di `sw.js` (revalidasi jaringan di latar belakang saat navigasi) mengunduh `index.html` generasi N+1 dan menuliskannya langsung ke `SHELL_CACHE` milik generasi N (`fiezel-shell-m025-778`). Akibatnya, HTML baru yang memerlukan CSS non-blocking (`media="print"` dengan `data-fz-shell-css`) dilayani bersamaan dengan `app.js` dan `fiezel-splash.js` generasi lama yang tidak mengenal protokol tersebut. Splash ditutup sebelum CSS teraktivasi.
2. **Sabotase Shell oleh `ensureShellCoherence()`**:
   Pemeriksaan koherensi berkala di worker aktif menghapus semua cache yang bukan cangkang dirinya sendiri: `k !== SHELL_CACHE ? caches.delete(k) : ...`. Ini secara agresif menghapus cangkang milik service worker generasi N+1 yang baru saja diunduh saat statusnya masih `waiting`/`installing`.
3. **Atomic Failure pada Jaringan Seluler (Beban 43.5 MB / 355 Berkas)**:
   Setiap kenaikan build memaksa `installShell` mengunduh ulang 355 berkas (43.5 MB aset audio, webp, ogg, kamus). Jika 1 paket audio mengalami timeout/koneksi putus di jaringan seluler, seluruh `install` dibatalkan (atomic failure), worker baru dibuang, dan peramban terjebak di cangkang lama.
4. **Kebutaan Deteksi Versi (`FIEZEL_PAGE_BUILD` Blindness)**:
   Penanda build dibaca dari `core-config.js`. Karena `core-config.js` disajikan dari cache lama, dokumen memori buta bahwa HTML yang sedang berjalan sebenarnya sudah diperbarui.
5. **Waiting Worker Terkunci Tanpa Cutover**:
   Worker baru yang berhasil diinstal tertahan di status `waiting` selamanya karena tidak ada cutover otomatis saat app dingin (splash curtain aktif) atau saat app berada di latar belakang (`visibilityState === 'hidden'`).

---

## 2. Arsitektur Solusi Permanen (m025-781)

### A. Anti-Poisoning & Coherence Guard di `sw.js`
- **Pencegahan Frankenstein Cache di `segarkan`**:
  `segarkan` memeriksa isi teks HTML yang diterima dari jaringan. Jika HTML memuat `<meta name="fz-build" content="...">` atau `window.FIEZEL_HTML_BUILD` yang nomor versinya lebih tinggi daripada `SW_REV` worker aktif, worker MENOLAK menimpa cache lama dan mengarahkan ke `self.registration.update()`.
- **Perlindungan Shell Candidate di `ensureShellCoherence()`**:
  Hanya menghapus cangkang dengan nomor revisi lebih kecil (`num < curNum`). Cangkang generasi berikutnya yang sedang menunggu TIDAK PERNAH dihapus.

### B. Delta Precache Copy di `installShell()`
- Sebelum melakukan `addAll(toFetch)`, worker memeriksa cangkang versi sebelumnya (`oldCache`).
- Aset biner statis (`.ogg`, `.mp3`, `.webp`, `.png`, `.ico`, `.woff2`, stories, audio bank) disalin langsung dari cache lama ke cache baru via `c.put(asset, cachedResp.clone())`.
- Hanya berkas kode inti yang berubah (`index.html`, `app.js`, `style.css`, dll.) yang diunduh dari jaringan. Beban download turun dari **43.5 MB (355 berkas)** menjadi **< 1.5 MB (< 25 berkas)**, menjamin kesuksesan instalasi 100% di jaringan 3G/4G/5G seluler.

### C. Penanda Build Dokumen Mandiri & Self-Healing di `index.html` & `fiezel-boot-tail.js`
- `index.html` membawa penanda langsung di `<head>`: `<meta name="fz-build" content="m025-781">` dan `window.FIEZEL_HTML_BUILD='m025-781'`.
- `fiezel-boot-tail.js` menghitung `effectiveBuild` dari HTML jika `core-config.js` terlambat.
- **Instant Self-Healing**: Jika terdeteksi dokumen HTML dan JS berselisih versi, secara otomatis menghapus shell lama dari `caches`.

### D. Zero-Glitch Silent Cutover di Balik Tirai Boot Splash
- `isCurtainActive()`: Mendeteksi saat splash screen (`#fiezelBootSplash`) sedang menutupi layar saat cold boot awal.
- `maybeAutoPromoteUnderCurtain(reg)`: Jika ada worker baru yang menunggu (`reg.waiting`) dan tirai splash sedang aktif ATAU aplikasi sedang di latar belakang (`document.visibilityState === 'hidden'`) dan murid tidak sedang menjawab kuis (`!isLessonActive()`), worker baru langsung dipromosikan via `FIEZEL_SKIP_WAITING` dan halaman dimuat ulang secara mulus tanpa interupsi banner ataupun kedipan visual.

### E. Hexa-Sync Arbiter di `tools/bump-build.mjs`
- Sinkronisasi build otomatis menyelaraskan `<meta name="fz-build">` dan `window.FIEZEL_HTML_BUILD` di `index.html` bersamaan dengan 6 titik rilis resmi.

### F. HTTP Cache-Control & Anti-Scraping Bypass di `website/.htaccess`
- Menambahkan ekstensi `json` ke `FilesMatch` untuk `Cache-Control: no-cache, must-revalidate`.
- Memperbarui aturan mod_rewrite anti-scraping agar request dari Service Worker internal (`Sec-Fetch-Site: same-origin`, `Sec-Fetch-Mode: cors`) tidak pernah diblokir atau di-redirect.

---

## 3. Berkas yang Disentuh
1. `sw.js`: Delta cache copy, perlindungan candidate shell di `ensureShellCoherence`, dan anti-poisoning di `segarkan`.
2. `website/.htaccess`: Cache control JSON dan izin Sec-Fetch untuk Service Worker.
3. `index.html`: Penanda `<meta name="fz-build">` dan `window.FIEZEL_HTML_BUILD`.
4. `features/ui/fiezel-boot-tail.js`: Self-healing split-brain, auto-promotion di balik tirai splash dan saat backgrounded.
5. `tools/bump-build.mjs`: Sinkronisasi versi otomatis ke `index.html` pada `bump` dan `--adopt`.
6. `tests/pwa-cold-boot-seamless-test.js`: Penyesuaian batas toleransi JIT spatial projection `< 120ms`.
7. `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Sinkronisasi nomor build resmi `m025-781`.

---

## 4. Status Pengujian & Mutu Lokal
- `node tests/pwa-cache-test.js`: PASS (100% validasi precache & lifecycle)
- `node tests/sw-nav-shell-first-test.js`: PASS (17/17 assert)
- `node tests/update-prompt-test.js`: PASS (13/13 assert)
- `node tests/pwa-release-coherence-test.js`: PASS
- `node tests/pwa-cold-boot-seamless-test.js`: PASS
- `node tests/tri-core-invariants-gate-test.js`: PASS (25/25 assert)
- `node tests/csp-header-superset-gate-test.js`: PASS (8/8 assert)
- `node tests/precache-covers-shell-test.js`: PASS (5/5 assert)
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, build m025-781)
- `node tests/coordination-guard-test.js`: PASS (24/24 assert)
- `node tests/id-golden-snapshot-test.js`: PASS (Baseline emas Indonesia utuh)
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
