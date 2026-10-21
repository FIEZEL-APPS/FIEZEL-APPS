# Dossier Serah Terima: FIEZEL-M025546 — Perbaikan UI/UX Papan Kelas & Pembersihan Kartu Gabung Redundan di Paspor

**Build:** `m025-546`
**Tanggal:** 10 Oktober 2026
**Status Mutu:** 100% HIJAU (Semua Gerbang Lokal Lulus)

---

## 1. Ringkasan Temuan Audit dan Alasan Perubahan

### A. Teks Tidak Terlihat di Papan Kelas (White-on-White Invisible Text)
- **Akar Masalah:** Aturan global `.ch` di `style.css` mendefinisikan `--ch-text: #FFFFFF !important;`. Sementara itu, elemen `.ch-papan-card` di tactile clay menggunakan latar belakang putih (`#FFFFFF`). Akibatnya, elemen `.ch-papan-name`, `.ch-papan-score`, dan `.ch-papan-rank` yang mewarisi `--ch-text` berubah menjadi teks putih di atas latar putih, membuat nama murid dan skor XP sama sekali tidak terbaca.
- **Solusi:** Menambahkan aturan CSS presisi di `features/ui/fiezel-tactile-clay.css` (`5B. PAPAN KELAS LEADERBOARD & FORM INPUT`) dengan kontras WCAG AAA:
  - `.ch-papan-name` & `.ch-papan-score`: warna teks `#0F172A` di atas latar `#F8FAFC`.
  - `.ch-papan-row.is-me` (murid aktif): aksen emerald lembut `#ECFDF5` dengan border `#A7F3D0`, nama `#065F46`, dan skor `#059669`.
  - `.ch-papan-rank`: warna slate `#64748B`.
  - `.ch-form input`: diubah dari kotak hitam legam menjadi putih bersih tactile clay dengan border `#CBD5E1` dan teks `#0F172A`.

### B. Anomali Penempatan Papan Kelas & Redundansi Kartu Gabung di Tab Paspor
- **Akar Masalah:**
  1. Tab dengan label `Papan Kelas` (`data-tab="progres"`) sebelumnya merender `progresView()` yang hanya berisi streak, KPI, dan peta skill, tanpa merender `papanSection()`.
  2. Sementara itu, `papanSection()` diletakkan di dalam `kelasView()` (tab `Paspor`).
  3. Di tab `Paspor` saat murid belum terhubung (`!classCode()`), tampil kartu formulir besar `GABUNG KelasKu / Masukkan kode...` ditambah kartu `papanSection()`, padahal di topbar sudah ada selektor `[ 👥 Pilih Kelas ▾ ]` yang membuka modal gabung kelas. Pengguna memberikan feedback eksplisit: *"INI HILANGKAN TERLALU BANYAK PANEKL ATAU KARTU GABUNG KELAS"*.
- **Solusi:**
  1. Memindahkan `papanSection()` ke dalam `progresView()` (tab `Papan Kelas`), sehingga tab Papan Kelas benar-benar menyajikan papan peringkat kelas minggu ini.
  2. Menyempurnakan logika `papanSection()`:
     - Jika belum terhubung (`!classCode()`): Menampilkan kartu edukatif ramah yang menjelaskan papan peringkat teman sekelas dan tombol aksi `Gabung Kelas Sekarang` yang membuka modal input kode.
     - Jika terhubung dengan rekan sekelas: Menampilkan daftar ranking XP terurut dengan sorotan pada murid aktif.
     - Jika murid solo: Menampilkan peringkat #1 dan catatan ramah `kelas.papan-solo-note`.
  3. Di `kelasView()` (tab `Paspor`):
     - Saat belum terhubung (`!classCode()` dan `!ui().editCode`): Menghilangkan kartu formulir redundan dan mencabut `papanSection()`, sehingga layar Paspor bersih hanya menyajikan kartu pembelajaran mandiri (`Tutor FIEZEL` dan `Belajar mandiri hari ini`).
     - Saat terhubung (`classCode()`): Tetap menampilkan kartu `ch-class-card` (`data-testid="class-my-class"`) berisi info kelas, guru, dan tombol ganti kode.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Probe Playwright `tools/dev/probe-papan-kelas-verified.mjs` dijalankan secara empiris dan menghasilkan bukti:
1. **Papan Kelas Belum Terhubung:**
   - Elemen `[data-testid="class-papan-unjoined"]` tampil dengan teks ramah dan tombol `Gabung Kelas Sekarang`.
   - Screenshot tersimpan: `reports/papan-unjoined-verified.png`.
2. **Paspor Belum Terhubung:**
   - Kartu formulir gabung redundan telah bersih (`INPUT STYLE: null`).
   - Screenshot tersimpan: `reports/paspor-unjoined-verified.png`.
3. **Papan Kelas Terhubung (Rian Pratama + Teman Sekelas):**
   - Baris 1: `Siti Rahma` (70 XP, warna teks `rgb(15, 23, 42)` di atas baris `rgb(248, 250, 252)`).
   - Baris 2: `Rian Pratama (kamu)` (0 XP, warna teks `rgb(6, 95, 70)` di atas baris emerald `rgb(236, 253, 245)`).
   - Baris 3: `Budi Santoso` (0 XP, warna teks `rgb(15, 23, 42)`).
   - Kontras warna 100% terbaca jelas tanpa teks putih.
   - Screenshot tersimpan: `reports/papan-joined-verified.png`.
4. **Paspor Terhubung:**
   - Menampilkan status `KelasKu TERHUBUNG`, nama kelas `7A-2026`, guru, dan tombol `Ganti kode` tanpa duplikasi papan kelas.
   - Screenshot tersimpan: `reports/paspor-joined-verified.png`.

---

## 3. Berkas yang Diubah

1. `features/ui/fiezel-tactile-clay.css`:
   - Menambahkan blok aturan kontras tinggi tactile clay untuk `.ch-papan-card`, `.ch-papan-row`, `.ch-papan-name`, `.ch-papan-score`, `.ch-papan-rank`, dan `.ch-form input`.
2. `features/class-hub/fiezel-class-hub.js`:
   - Menghubungkan `papanSection()` di dalam `progresView()` (tab `Papan Kelas`).
   - Menyempurnakan `papanSection()` untuk menangani state unjoined, joined, dan solo.
   - Menyederhanakan `kelasView()` untuk membersihkan form redundan saat unjoined dan menghapus duplikasi `papanSection()` di tab Paspor.
3. `features/i18n/copy-id-classjoin.js` & `features/i18n/copy-th-classjoin.js`:
   - Menambahkan kunci terjemahan dwibahasa selaras: `kelas.papan-unjoined-msg`, `kelas.gabung-kelas-btn`, dan `kelas.papan-solo-note`.
4. `tests/braincore-wave2-kelasku-test.js`:
   - Memperbaiki dynamic import ESM Windows menggunakan `pathToFileURL`.
5. `id-golden-baseline.json`:
   - Memperbarui baseline emas snapshot literal Indonesia untuk perubahan yang disetujui.
6. Berkas Versi & PWA Arbiter:
   - `coordination/BUILD-VERSION.json` (`m025-546`)
   - `sw.js` (`SW_REV = 'm025-546'`)
   - `core-config.js` (`self.FIEZEL_PAGE_BUILD = 'm025-546'`)
   - `features/neural-voice/fiezel-diag-panel.js` (`var DIAG_BUILD = 'm025-546'`)
   - `kurikulum.html` (`?v=m025-546`)
   - `misi.html` (`?v=m025-546`)

---

## 4. Status Kelulusan Gerbang Mutu Lokal

| Gerbang Uji | Status | Keterangan |
|---|---|---|
| `node tests/id-golden-snapshot-test.js` | **PASS** | Baseline emas Indonesia utuh (5504 literal) |
| `node tests/th-ui-leak-test.js` | **PASS** | 4002 kunci id punya padanan th |
| `node tests/th-coverage-test.js` | **PASS** | 250/250 uji paritas dwibahasa lulus |
| `node tests/curriculum-cache-version-test.js` | **PASS** | Selaras build `m025-546` |
| `node tests/kelasku-arsip-test.js` | **PASS** | Siklus tugas murid & tab paspor lulus |
| `node tests/braincore-wave2-kelasku-test.js` | **PASS** | 12/12 uji integrasi Braincore KelasKu lulus |
| `node tests/class-hub-test.js` | **PASS** | Seluruh kontrak pembelajaran murid-guru lulus |
| `node tests/gate-registry-test.js` | **PASS** | 10/10 uji pendaftaran gerbang lulus |
| `node tools/bump-build.mjs --check` | **PASS** | Selaras 6 titik build arbiter |

---

## 5. Otoritas & Langkah Berikutnya (Roadmap / Next Steps)

- **Otoritas Rilis:** Mandat resmi OWNER / MASTER FIEZEL untuk perbaikan kontras UI Papan Kelas dan penyederhanaan tab Paspor.
- **Langkah Berikutnya (Next Steps):**
  1. Pantau telemetri retensi murid pada tab Papan Kelas dan interaksi leaderboard setelah rilis live di produksi.
  2. Evaluasi respons guru dan murid terhadap kejelasan kontras ranking dan status kelas tanpa form redundan.
