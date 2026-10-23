# FIEZEL-M025632 — Handoff Dossier: Audit & Perbaikan Menyeluruh UI/UX Sesi Latihan Grammar (`G-01` s/d `G-09`), Decommissioning Video Grammar, & Penyelarasan Baseline Voice Studio

- **Nomor Build**: `m025-632`
- **Tanggal**: 24 Oktober 2026
- **Otoritas**: OWNER & MASTER Architecture Directive
- **Status Hexa-Sync (`node tools/bump-build.mjs --check`)**: `Selaras` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)

---

## 1. Ringkasan Temuan Audit & Perbaikan UI/UX Grammar (`G-01` s/d `G-09`) & Sistemik

1. **G-01 (P0 — Tumpang Tindih `#quizFloatingBar` di Atas Kartu `#feedback` & `#tutorTurn`)**:
   - **Akar Masalah**: `#quizFloatingBar` (`position: fixed; bottom: 16px; z-index: 60`) menutupi bagian bawah kartu `#tutorTurn` ("PEGANGAN INGATAN"), akordion `#feedback` yang sedang dibuka, serta tombol `"Jelaskan dengan cara yang lebih sederhana"`, dan toast melayang menutupi indikator progres `1/10` di `.quiz-topbar`.
   - **Perbaikan**: Mendock `.quiz-shell #quizFloatingBar` secara proporsional di dalam alur dokumen (`position: relative !important; margin: 4px auto 16px !important; max-width: 600px !important`) tepat di bawah kartu soal `.quiz-shell > .card`, serta menggeser posisi `.toast` pada mode kuis ke `top: calc(66px + env(safe-area-inset-top))` tepat di bawah `.quiz-topbar`.
2. **G-02 (P0 — Decommissioning Video Grammar & Single Clean Flow)**:
   - **Akar Masalah**: Soal video grammar tidak pernah dimainkan di sesi kuis reguler, namun modul runtime, video mp4 berukuran puluhan megabyte, dan data bank video masih tersisa dan memicu regresi shell precache (`precache-covers-shell-test`).
   - **Perbaikan**: Menghapus total modul `features/grammar/fiezel-grammar-video.js`, bank `content/video-grammar-bank-v1.json`, video aset di `content/video/`, mockup generator, rujukan di `index.html` dan `sw.js`, serta membersihkan penanganan di `app.js` dan copy i18n.
3. **G-03 (P1 — Hierarki Tipografi Kalimat Soal `.question-main` Terbalik)**:
   - **Akar Masalah**: `.question-main` dikecilkan ke `15.6px`, `font-weight: 600`, lebih kecil dari opsi jawaban (`16.8px`) dan judul penjelasan (`18.4px`).
   - **Perbaikan**: Menaikkan `.question-main` di `features/grammar/grammar-upgrade.css` dan `features/ui/fiezel-tactile-clay.css` menjadi `clamp(1.12rem, 1.05rem + 0.45vw, 1.32rem)` (`18.5px–21px`, `font-weight: 700`, `line-height: 1.4`).
4. **G-04 (P1 — Soal Desktop `>= 980px` Kehilangan Bingkai Fokus)**:
   - **Perbaikan**: Menambahkan bingkai kartu fokus pada `.quiz-shell #quizStem:not(.quiz-bubble *):not(.quiz-stage *):not(.speech-bubble *)` (`background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 14px 18px; margin: 0 0 14px 0`).
5. **G-05 (P1 — Duplikasi Instruksi 3 Baris pada Soal Susun Kata)**:
   - **Perbaikan**: Membersihkan awalan instruksi redundan (`grammar.token-order-panduan`) dari `stem` di `renderQuizQuestionContent` (`app.js`) ketika badge `.question-instruction` sudah ditampilkan.
6. **G-06 (P1 — Race Condition Modal `Pilih Ritme Belajarmu` Muncul di Tengah Sesi Kuis)**:
   - **Perbaikan**: Menambahkan guard di dalam callback timer `checkFirstTimeIntensity()` agar batal membuka modal bila `document.body` sudah berada di `.fz-stage-quiz` / `.fz-lesson-mode` / `.quiz-shell`, serta menutup `.modal-intensity-sheet` yang masih tersisa saat `quizLoop` dimulai di `app.js`.
7. **G-07 (P1 — Target Sentuh `< 44x44px` & Teks Tombol Skip Terpotong)**:
   - **Perbaikan**: Menaikkan ukuran seluruh tombol interaktif ke standar WCAG `>= 44x44px` (`.path-cta`, `.lesson-skip-link`, `.skill-back-btn`, `.skill-help-dot`, `.modal-close-corner`, `#hintCloseBtn`, `#feedback details.acc > summary`, `.puzzle-tile`, `#fzCourseSwitchBtn`, `.level-change-btn`, `.retry-giveup-btn`) serta memperbaiki wrapping `.lesson-skip-link`.
8. **G-08 (P2 — Kontras Teks WCAG AA `< 4.5:1`)**:
   - **Perbaikan**: Menaikkan kontras `.skill-help-panel .skill-badge` (`#78350F` di atas `#FEF3C7`, `opacity: 1`), kartu terkunci di Grammar Hub List View (`.grammar-grid .card.lesson-locked` + `.lesson-lock-note` `#334155`), tombol `#tokenResetBtn:disabled` & `#tokenSubmitBtn:disabled` (`#334155` di atas `#E2E8F0`), `.puzzle-tile.is-used`, serta `.fz-kawan-cta` (`#1B1418` di atas amber) dan `.fz-kawan-tag` (`#92400E`).
9. **G-09 (P2 — Pembatalan Slot Kosong `↳ isi di sini` & Aksesibilitas Keyboard Kartu Intensitas)**:
   - **Perbaikan**: Menambahkan handler klik pada `.gx-vacant-slot` di `features/grammar/fiezel-grammar-upgrade.js` untuk membatalkan mode sisip slot kosong (`vacantSlotIndex = null`), serta menambahkan `role="button" tabindex="0" aria-pressed="..."` dan dukungan tombol `Enter`/`Space` pada `.intensity-option-card` di `features/grammar/grammar-vocab-bridge.js`.
10. **Penyelarasan Baseline Emas Voice Studio & CI Sanitization**:
    - Menyelaraskan hash `id-golden-baseline.json` terhadap bundle `features/voice-studio/dist/voice-studio.js` dari PR #691 dan menghapus literal string video grammar.
    - Membersihkan trailing whitespace di `tests/audit-all-question-step-guidance.js` yang memicu kegagalan `git diff --check` pada guardian A9, A10, dan A11.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe — Validasi Dua Arah)

Probe empiris Playwright dijalankan pada seluruh layar latihan Grammar (Mobile `390×844`, Desktop `1280×800`, EN/JA, ID/TH):
- `overlaps`: **`0`** di seluruh tahapan layar.
- `lowContrast`: **`0`** di seluruh tahapan layar.
- `smallTargets` (elemen interaktif murid): **`0`** di seluruh tahapan layar.
- `overflowX`: **`false`** di seluruh tahapan layar.
- `node tests/probe-video-grammar-eliminated-test.js` → **100% PASS** (bersih dari video grammar).

---

## 3. Status Kelulusan Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check` → **PASS (`Selaras` 6 titik)**
- `node tests/grammar-ux-p1-2026-10-04-test.js` → **PASS (11/11)**
- `node tests/grammar-ux-p3-2026-10-04-test.js` → **PASS (23/23)**
- `node tests/grammar-8-upgrades-full-test.js` → **PASS (9/9)**
- `node tests/braincore-pedagogy-audit-2026-10-11-test.js` → **PASS (15/15)**
- `node tests/multi-device-comfort-test.js` → **PASS (8/8)**
- `node tests/home-kawan-bicara-card-test.js` → **PASS (5/5)**
- `node tests/id-golden-snapshot-test.js` → **PASS (utuh)**
- `node tests/precache-covers-shell-test.js` → **PASS (5/5)**
- `node tests/th-ui-leak-test.js` → **PASS (4412/4412 kunci)**
- `node tests/curriculum-cache-version-test.js` → **PASS (26/26, build `m025-632`)**
- `node tests/gate-registry-test.js` → **PASS (10/10)**

---

## 4. Langkah Berikutnya (Next Steps / Roadmap)

1. Merge PR ke `main` setelah seluruh gerbang CI GitHub Actions 100% HIJAU.
2. Pantau workflow `FIEZEL Deploy Site` di GitHub Actions sampai tuntas.
3. Verifikasi live di `https://fiezel.my.id/app/` bahwa build `m025-632` telah aktif dan disajikan kepada pengguna.