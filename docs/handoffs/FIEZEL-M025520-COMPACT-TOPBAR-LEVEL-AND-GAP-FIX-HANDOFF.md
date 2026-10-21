# FIEZEL-M025520: Compact Topbar Level Pill, Seamless Topbar Edge, and Redundant Header Elimination Dossier

## 1. Ringkasan Temuan Audit & Alasan Perubahan
Berdasarkan tinjauan visual komparatif build live `m025-519` di peramban mobile (`390x844`), ditemukan tiga inkonsistensi UI/UX visual yang memicu keluhan pengguna:
1. **Oversized Level Card di Topbar**:
   - Komponen pemilih level (`.active-level-control`) di dalam `#topContextActions` topbar mewarisi gaya kartu halaman penuh dari `features/ui/fiezel-tactile-clay.css:3471` (`padding: 12px 18px !important; strong { font-size: 22px !important; }`).
   - Akibatnya, tombol level membengkak dan meluap (*overflow*) ke bawah keluar dari area navigasi 56px topbar.
2. **Garis Batas/Celah Kasar di Bawah Topbar (*Visual Seam / Gap*)**:
   - `header.topbar` memegang `border-bottom: 1px solid #E2E8F0 !important;` yang kontras dengan latar belakang travertine hangat (`#FDFAF3`).
   - Selain itu, `main.app.app` memiliki `padding-top: calc(56px + env(safe-area-inset-top, 0px) + 12px)` serta `#app` memiliki `padding-top: 14px`, menciptakan celah kosong 26px yang memotong kontinuitas visual.
3. **Baris Judul Duplikat di Tubuh Halaman (`.section-head`)**:
   - Di tab `Latihan` dan `Grammar`, `shell()` merender `.section-head` (`Latihan` / `Grammar` + `[A1 | Ganti]`).
   - Meskipun topbar telah menyediakan judul kontekstual dan pemilih level di atas, `.section-head` di dalam badan halaman tetap ditampilkan karena deklarasi spesifisitas tinggi `html body.fz-view-latihan #app .section-head { display: flex !important; }` di `fiezel-tactile-clay.css:4246`.
4. **String Template Bocor di Hub Kosakata**:
   - String jumlah kosakata di hero card kosakata menampilkan placeholder literal `{jumlah} kata` akibat pemanggilan pembungkus `t('vocab.n-kata', {jumlah})` yang menempatkan objek parameter di posisi fallback.

---

## 2. Solusi Teknis yang Diterapkan
1. **Refaktor Topbar Active Level Control Menjadi Compact Pill**:
   - Diterapkan styling kontekstual presisi untuk `html body header.topbar .active-level-control`, `#topContextActions .active-level-control`:
     - `display: inline-flex !important; flex-direction: row !important; align-items: center !important; height: 32px !important;`
     - `padding: 2px 8px 2px 10px !important; margin: 0 !important; border-radius: 9999px !important; border: 1.5px solid #E2E8F0 !important;`
     - Label kata `Level` disembunyikan (`span { display: none !important; }`), teks level disesuaikan menjadi `strong { font-size: 13px !important; }`, dan tombol `Ganti` menjadi `small { font-size: 10.5px !important; padding: 2px 7px !important; }`.
2. **Penghapusan Garis Batas dan Penyelarasan Latar Belakang Topbar**:
   - `border-bottom: none !important;` dan `border: none !important;` diterapkan pada `header.topbar` di `style.css`, `features/ui/fiezel-tactile-clay.css`, dan `features/ui/mobile-edge-fit.css`.
   - Warna latar topbar disatukan menjadi solid travertine `var(--bgDay, #FDFAF3) !important;` tanpa distorsi warna.
   - Mengurangi celah padding berlebih pada `main.app.app` dan `#app` menjadi `padding-top: 4px` sehingga konten mengalir mulus di bawah topbar.
3. **Penghapusan Total Baris Judul Ganda di Badan Halaman**:
   - Menghapus aturan `display: flex !important;` lama dan memberlakukan `display: none !important; margin: 0 !important; padding: 0 !important; height: 0 !important; overflow: hidden !important;` untuk `html body.fz-view-latihan #app .section-head`, `html body.fz-view-grammar #app .section-head`, `html body.fz-view-vocab #app .section-head`, dsb.
4. **Perbaikan Interpolasi Jumlah Kosakata**:
   - Menggunakan `FiezelI18n.t('vocab.n-kata', { jumlah: active.length })` langsung pada `vocab()` di `app.js` sehingga angka penguasaan kata tercetak akurat (misal `339 kata`).

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)
Skrip probe Playwright dieksekusi secara lokal (`tools/dev/capture-local-pwa-fixes.mjs`):
- `01-home-screen.png`: Topbar home solid travertine tanpa celah/garis bawah kontras.
- `02-latihan-panel.png`: Topbar `Latihan` + pill ramping `[A1 | Ganti]` (tinggi 32px), judul badan duplikat 100% lenyap, 6 kartu langsung terfokus di atas.
- `03-grammar-map.png`: Topbar `← Grammar` + pill ramping `[A1 | Ganti]`, baris duplikat badan 100% lenyap, kartu materi level langsung menyambut murid.
- `04-vocab-hub.png`: Topbar `← Kosakata` + pill ramping `[A1 | Ganti]`, badge kata tercetak akurat `339 kata` (bukan placeholder).
- `05-kelasku-panel.png`: Topbar KelasKu menyatu tanpa garis batas.
- `06-profil-panel.png`: Topbar Profil menyatu tanpa garis batas.

---

## 4. Daftar Berkas yang Dimodifikasi
- `app.js`: Pemanggilan i18n langsung `FiezelI18n.t` untuk badge jumlah kata kosakata.
- `style.css`: Menghapus border-bottom topbar, mengintegrasikan styling pill level 32px, menyembunyikan `.section-head`, dan menyelaraskan warna page container ke `#FDFAF3`.
- `features/ui/fiezel-tactile-clay.css`: Menghapus border-bottom topbar, meniadakan override `display: flex` pada `.section-head`, dan menyematkan styling pill ramping `32px` untuk `.active-level-control`.
- `features/ui/mobile-edge-fit.css`: Menghapus sisa `border-bottom: 1px solid #E2E8F0` pada `.topbar`.
- `fiezel-2.css`: Menghapus `border-bottom` pada `.topbar` kursus Jepang.
- `id-golden-baseline.json`: Regenerasi baseline sadar untuk pengujian snapshot emas Indonesia.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump nomor build ke `m025-520` via arbiter resmi.
- `reports/th-ui-leak-report.json`: Laporan audit kebocoran teks mode Thai terbarukan.

---

## 5. Status Gerbang Mutu
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (HIJAU)**
- `node tests/curriculum-cache-version-test.js`: **PASS (HIJAU)**
- `node tests/gate-registry-test.js`: **PASS (HIJAU)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik, m025-520)**
- `git diff --check origin/main`: **PASS (0 trailing whitespace)**
