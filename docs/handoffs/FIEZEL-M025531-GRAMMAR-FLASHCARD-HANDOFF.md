# Berkas Serah Terima: FIEZEL-M025531-GRAMMAR-FLASHCARD-HANDOFF

## 1. Ringkasan Temuan Audit & Solusi
Rilis build **m025-531** mencakup dua perbaikan terintegrasi:
1. **Audit Menyeluruh UI/UX Sesi Latihan Grammar (G1–G17)**:
   - Penuntasan kontras tinggi teks putih di atas kartu terang (G1).
   - Penyelarasan leksikon kamus bahasa Thai di quest tahap 1 (G2).
   - Pengamanan sintaksis escaping pada token yang memuat apostrof seperti *I'm* (G3).
   - Penggantian fallback kalimat kaku dengan bank kurikulum otentik (G4).
   - Pembersihan jejak tutor turn basi pada percobaan salah kedua (G5).
   - Penyelarasan stem soal dialog non-video & anti-duplikasi stem kalimat (G6).
   - Penambahan jeda apresiasi modal prasasti menjadi 4,8 detik (G7).
   - Akordion pembahasan ringkas dan pemaparan aturan mendalam (G8).
   - Penataan umpan balik bertingkat tanpa banjir popover redundan (G9).
   - Penyelarasan instruksi dinamis stem grammar (G10).
   - Aksara Thai murni pada nama topik latihan di quest tahap 2 (G11).
   - Penstabilan layout shift tombol pilihan saat vonis benar/salah (G12).
   - Desensitisasi kapitalisasi bank token susun kata (G13).
   - Normalisasi ketinggian kontainer chip kosakata hasil belajar (G14).
   - Penyelarasan istilah pedagogis penguasaan kosa kata prasyarat (G15).
   - Penegasan area sentuh minimal 44px dan kontras tombol reset (G16).
   - Eliminasi kebocoran naskah pembahasan Indonesia pada mode Thai (G17).

2. **Hardening 3D Flip Flashcard Kosakata di Perangkat Mobile/PWA**:
   - **Touch Suppression Fix**: Memperbaiki `bindSwipe()` di `app.js` agar getaran/wobble sentuhan jari (<25px) tidak membatalkan event `click`, sehingga kartu dapat dibalik dengan mulus melalui ketukan layar.
   - **WebKit/Safari 3D Flattening Fix**: Menghapus `overflow: hidden` pada `.flash-face` di `style.css` dan `mobile-edge-fit.css` (diganti `overflow: visible !important`) agar konteks 3D tidak diratakan menjadi 2D oleh engine WebKit.
   - **3D Depth & Prefixes**: Menambahkan `-webkit-perspective: 1400px`, `-webkit-transform-style: preserve-3d;`, dan `translateZ(1px)` untuk mencegah z-fighting pada GPU seluler.
   - **Fail-safe Opacity Toggle**: Menambahkan transisi opasitas dan pointer-events eksplisit pada `.flash-front` dan `.flash-back` saat kelas `.flipped` aktif/nonaktif.
   - **Penyelarasan Review Vocab**: Menyamakan chip `.chips-row` (`chip-level` dan `chip-cat`) di `reviewVocab()` agar identik dengan `flashcards()`.

---

## 2. Bukti Pengujian Empiris (Playwright Headless)
1. **Pengujian Mini Game & Grammar Cycle**:
   ```bash
   node tests/chrome-mini-game-test.js
   ```
   *Hasil*: LULUS (Semua putaran mini-game dan navigasi gerbang berhasil).

2. **Pengujian Touch Tap & Flip Flashcard**:
   ```bash
   node tools/dev/capture-vocab-session.mjs
   ```
   *Hasil*:
   - `04-vocab-flashcard-front.png`: Bersih, proporsional, tanpa popover sisa kuis.
   - `05-vocab-flashcard-back.png`: Sisi belakang terbalik sempurna dengan tap layar sentuh (`isFlipped: true`), memuat chip A1 + ARTI, arti tebal, kotak contoh bilingual, tombol dengar kata & kalimat, dan bilah `Belum hafal` / `Sudah hafal`.

---

## 3. Verifikasi Gerbang Mutu Lokal & Hexa-Sync
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (Zero leak)**
- `node tests/curriculum-cache-version-test.js`: **PASS (build m025-531)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- Hexa-Sync Arbiter (`node tools/bump-build.mjs --check`):
  ```json
  {
    "sumber": "m025-531",
    "terpasang": {
      "sw.js": "m025-531",
      "core-config.js": "m025-531",
      "features/neural-voice/fiezel-diag-panel.js": "m025-531"
    },
    "selaras": true
  }
  ```

---

## 4. Otoritas OWNER/MASTER & Status Rilis
- **Status Mutu**: READY FOR MERGE (Semua gerbang hijau, hexa-sync m025-531 valid).
- **Otoritas**: MASTER & OWNER compliance verified.
- **Langkah Berikut (Next Steps)**: Pantau seluruh alur CI hingga rilis terpasang di produksi.
