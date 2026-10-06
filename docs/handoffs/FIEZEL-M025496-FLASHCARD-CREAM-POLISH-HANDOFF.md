# FIEZEL Release Handoff Dossier — Build m025-496
**Tanggal:** 2026-10-06
**Nomor Build:** `m025-496`
**Branch:** `feat/m025-495-pwa-flashcard-cream-polish`
**Author:** Antigravity AI

---

## 1. Ringkasan Eksekutif & Temuan Audit
Pembaruan komprehensif pada tampilan **PWA Flashcard Kosakata**:
1. **Palet Warna "Warm Daylight Cream" & Tipografi Kontras Tinggi:**
   - Mengubah latar belakang aplikasi dari warna gelap/suram menjadi krem cerah hangat daylight (`#FFFDF8` / travertine ivory).
   - Menghilangkan warna teks maroon gelap/kusam (`#5E1420`), menggantinya dengan warna midnight navy kontras tinggi (`#0B132B` & `#1E293B`, rasio kontras >14:1) yang sangat nyaman dan menenangkan mata murid.
2. **Besaran Tipografi & Skala Visual:**
   - Membesarkan kata utama (`.word`) menjadi `clamp(3.2rem, 11vw, 4.6rem)` dengan bobot `800`.
   - Membesarkan transkripsi fonetik (`.phonetic`) menjadi `1.25rem - 1.6rem`.
   - Membesarkan arti kata di sisi belakang (`.flash-meaning`) menjadi `clamp(2.4rem, 8vw, 3.4rem)`.
3. **Penyederhanaan Tampilan (Anti-Clutter):**
   - Menghapus tombol kecerdasan buatan *"Tanya arti"* (`#aiWord`).
   - Menghapus lencana *"Status: Baru / Mengulang"* (`.notice`).
   - Menghapus teks instruksi swipe *"Geser"* (`.swipe-hint`).
4. **Pemanfaatan Maksimal Ruang Layar (Zero Dead Void):**
   - Memperluas dimensi kartu flashcard (`height: clamp(400px, 58vh, 560px)`) agar mengisi ruang vertikal ponsel secara proporsional.
   - Menyembunyikan menu navigasi bawah (`.bottomnav`) secara bersih selama sesi kartu flashcard (`body.fz-lesson-mode`, `body:has(.card-flashcard)`), sehingga tombol evaluasi **Belum hafal** dan **Sudah hafal** duduk mantap dan leluasa di bagian bawah layar tanpa tumpang tindih.
5. **Harmonisasi Posisi Tombol & Konten:**
   - Menempatkan tombol `[ Dengar kata ]` di sisi depan pada slot aksi bagian bawah kartu (`.flash-front-actions`).
   - Memusatkan arti kata (`h3.flash-meaning`) di tengah kartu sisi belakang (`.flash-back-main`), diikuti kotak contoh kalimat.
   - Menata kedua tombol audio sisi belakang (`[ Dengar kata ]` & `[ Dengar kalimat ]`) secara horizontal berdampingan (`flex-direction: row; flex-wrap: nowrap; gap: 12px;`) sejajar dan seimbang, pada baseline yang sama dengan tombol sisi depan.

---

## 2. Berkas yang Disentuh (Files Touched)
1. `app.js` — Penyusunan ulang markup DOM `.card-flashcard` untuk `flashcards()` dan `reviewVocab()` (wadah `.flash-front-actions` & `.flash-back-main`, pemeliharaan fallback suara).
2. `style.css` — Penyesuaian tata letak kartu, centering arti dan kata, flexbox tombol aksi berdampingan, dan safe margins.
3. `features/ui/mobile-edge-fit.css` — Penyembunyian `bottomnav` saat sesi flashcard, normalisasi kontras teks daylight cream, dan tombol audio berdampingan.
4. `features/ui/fiezel-tactile-clay.css` — Menambahkan pengecualian `display: none !important` untuk `.bottomnav` pada `body.fz-lesson-mode` dan `body:has(.card-flashcard)`.
5. `sw.js` — Penyesuaian `SW_REV` ke `m025-495`.
6. `core-config.js` — Penyesuaian `FIEZEL_PAGE_BUILD` ke `m025-495`.
7. `features/neural-voice/fiezel-diag-panel.js` — Penyesuaian `DIAG_BUILD` ke `m025-495`.
8. `kurikulum.html` & `misi.html` — Penyesuaian query string versi shell cache ke `m025-495`.
9. `coordination/BUILD-VERSION.json` — Pencatatan versi rilis resmi `m025-495`.

---

## 3. Bukti Pengujian Empiris (Empirical Probe Verification)
- Skrip probe Playwright peramban headless dijalankan via `scratch/capture_flashcard.mjs` pada viewport ponsel `390x844` Retina (2x scale factor):
  - Tampak Depan: `flashcard_cream_daylight_front.png` — kata di tengah, tombol dengar kata di bawah, nol obstruksi.
  - Tampak Belakang: `flashcard_cream_daylight_back.png` — arti di tengah, tombol audio berdampingan sejajar, nol penumpukan.

---

## 4. Status Kelulusan Gerbang Mutu Lokal (Quality Gates)
Semua 4 suite uji lokal lulus 100% HIJAU:
- `node tests/id-golden-snapshot-test.js` -> **PASS** (13 berkas terkunci identik, baseline emas utuh)
- `node tests/th-ui-leak-test.js` -> **PASS** (nol kebocoran naskah)
- `node tests/curriculum-cache-version-test.js` -> **PASS** (26 penegasan, 2 halaman, build `m025-495`)
- `node tests/gate-registry-test.js` -> **PASS** (10 pass, 0 fail)
