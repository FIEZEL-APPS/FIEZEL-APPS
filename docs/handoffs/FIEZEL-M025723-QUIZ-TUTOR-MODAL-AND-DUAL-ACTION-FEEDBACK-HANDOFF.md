# FIEZEL-M025723-QUIZ-TUTOR-MODAL-AND-DUAL-ACTION-FEEDBACK-HANDOFF.md

## 1. Executive Summary & Problem Scope
Sesuai arahan dan keluhan langsung pengguna pada sesi ini terkait 5 masalah kritis (Gambar 1, 2, 3, 4, 5):

1. **Gambar 1 (Quiz Header Progress Counter Stacking)**:
   - *Masalah*: Elemen counter kemajuan kuis `1 / 10` pecah menjadi dua baris bertumpuk vertikal (`1 /` di atas, `10` di bawah) karena tag pembungkus turunan terkomputasi sebagai blok dan tertekan ruang sempit.
   - *Solusi*: Normalisasi markup dengan `.quiz-progress-text` berstruktur flex horizontal terisolasi (`<span class="quiz-progress-num">`, `<span class="quiz-progress-sep">/</span>`, `<span class="quiz-progress-total">`) dengan CSS mutlak `display: inline-flex !important; flex-direction: row !important; align-items: center !important; white-space: nowrap !important; line-height: 1 !important;`. Terbukti berada dalam 1 baris horizontal presisi di mobile (`txtHeight: 16px`, `isSingleLine: true`).

2. **Gambar 2 (Furigana / Romaji Toggle Control)**:
   - *Masalah*: Tombol pengalih teks jepang Furigana/Romaji berbentuk pil hitam raksasa yang kaku, memiliki teks tercoret (*strikethrough*), dan merusak estetika antarmuka daylight.
   - *Solusi*: Redesain menjadi segmented pill control daylight bergaya iOS/Apple & Duolingo (`.ja-display` dan `.ja-toggle`): wadah halus `#F1F5F9`, border `1px solid #E2E8F0`, tinggi ergonomis 28px, segmen aktif putih salju `#FFFFFF` dengan bayangan lembut `0 1px 3px rgba(15,23,42,0.1)`, teks arang charcoal `#0F172A`, dan eliminasi total garis coret teks.

3. **Gambar 3 (Petunjuk Guru Pop-up Modal & Anti-Scroll)**:
   - *Masalah*: Petunjuk guru (*step tutor*) sebelumnya memanjang ke bawah halaman, memicu scrolling berlebih, teks terpotong aneh (`Langkah` / `1` / `: `), dan membuang ruang. Pengguna secara spesifik meminta: **Pop-up modal Petunjuk Guru di tengah layar** dengan tombol **"Coba Lagi"**, tanpa membuat murid harus men-scroll layar.
   - *Solusi*: Mengimplementasikan `showTutorHintModal(questionObj, lastPickIndex, clueText)` dengan `.tutor-hint-backdrop` dan `.tutor-hint-modal` terpusat presisi di tengah layar (`top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(440px, calc(100vw - 32px))`). Modal memuat badge "Petunjuk Guru", tombol silang `[×]`, callout petunjuk pengarah, daftar langkah tuntunan bernomor rapi, dan tombol penuh **"Coba Lagi"** (`#tutorModalRetryBtn`). Saat ditekan, modal langsung menutup dan murid dapat memilih jawaban lain seketika tanpa pergeseran scroll.

4. **Gambar 4 (Feedback Sheet Dual Actions & Zero-Trap Exit)**:
   - *Masalah*: Jika percobaan kedua salah, kotak kesimpulan "INTINYA:" kosong, tidak ada tombol keluar, dan tidak ada tombol lanjut sehingga murid terjebak (*fatal trapping bug*).
   - *Solusi*:
     - **Pedagogical Takeaway Invariant**: Sintesis otomatis penjelasan pedagogis bermakna jika `whyText` kosong sehingga kotak "INTINYA:" pantang kosong.
     - **Dual Actions & Close Exit**: Menambahkan tombol silang `[×]` di sudut kanan atas sheet (`#feedbackSheetClose`), dan sticky footer dengan 3 tombol ergonomis:
       - **"Keluar"** (`#quizSheetExit`) untuk membatalkan/keluar sesi dengan konfirmasi aman.
       - **"Buka Pembahasan"** (`#quizSheetExplain`) yang secara instan membuka drawer lipatan detail pembahasan (`<details class="feedback-drawer-details">`) dan menggulirkannya ke viewport.
       - **"Lanjut"** (`#quizSheetNext`) untuk melanjutkan ke soal berikutnya.
     - **Defensive Guard**: Mencegah pemusnahan elemen DOM (`f.remove()`) agar referensi `#feedback` tetap ada dan kebal dari `TypeError: Cannot read properties of null`.

5. **Gambar 5 (Penghapusan Kartu Info KelasKu di Home)**:
   - *Masalah*: Kartu promo *"KelasKu • Tugas Aktif / Latihan & Materi Kelas / Sinkronisasi Kurikulum & Guru / SEGERA ->"* di halaman depan Home mengganggu murid. Pengguna meminta kartu ini dihapus seutuhnya baik di kursus Jepang maupun Inggris.
   - *Solusi*: Menghapus deklarasi dan penyisipan `${kelaskuCard}` dari `todayHomeMarkup()` di `app.js`. Terverifikasi 100% lenyap dari DOM pada mobile dan desktop.

---

## 2. Quantitative Verification Table (Rule 2 Quantitative Reporting)

| Item / Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Progress Counter Layout (Gbr 1)** | 1 baris horizontal seimbang, tanpa pecah vertikal | `isSingleLine: true`, `txtHeight: 16px`, `whiteSpace: nowrap` | **PASS** |
| **Furigana Segmented Pill (Gbr 2)** | Daylight segmented control, tanpa coretan teks | Apple pill style, h: 28px, active white `#FFF`, no strikethrough | **PASS** |
| **Centered Tutor Modal (Gbr 3)** | Pop-up tengah layar + tombol "Coba Lagi", no scroll | `modalBox: {x: 16, y: 181, w: 358, h: 481}`, centered translate, `retryBtn: true` | **PASS** |
| **Retry Dismissal Flow** | Menutup modal & mengembalikan pilihan jawaban | `modalDismissed: true`, `wasTriedCount: 1`, `retryAvailableCount: 3` | **PASS** |
| **Pedagogical Takeaway (Gbr 4)** | Kotak "INTINYA:" pantang kosong | `takeawayText` tersintesis padat & terisi otomatis | **PASS** |
| **Dual Actions & Exit (Gbr 4)** | Tombol Keluar, Buka Pembahasan, Lanjut, dan [×] | `hasExitBtn: true`, `hasExplainBtn: true`, `hasNextBtn: true`, `hasCloseX: true` | **PASS** |
| **Drawer Pembahasan Deep Dive** | Klik "Buka Pembahasan" membuka drawer pembahasan | Terbuka & meluncur ke viewport saat tombol ditekan | **PASS** |
| **Eliminasi KelasKu Card (Gbr 5)** | Kartu lenyap dari Home Jepang & Inggris | `hasKelaskuCard: false`, 0 node di mobile & desktop | **PASS** |
| **Localhost Auth Gate Bypass** | Tombol Masuk Tamu + bypass localhost untuk uji | Tamu visitor auth terpasang, bypass localhost aktif | **PASS** |
| **Hexa/Octa-Sync Alignment** | 8 titik nomor build selaras kanonikal | `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, turunan `call.html` = `m025-723` | **PASS** |
| **Content Integrity Gate** | 4 dari 4 gerbang konten lulus | `node tests/content-integrity-gate.js` PASS (100% HIJAU) | **PASS** |
| **Regression Test Suite** | 100% lulus tanpa kegagalan | `node tests/regression-test.js` PASS | **PASS** |
| **Thai Coverage Test** | 258/258 penegasan lulus | `node tests/th-coverage-test.js` PASS | **PASS** |

---

## 3. Concurrency & Zero-Collision Invariant (Rule 12 Compliance)
- **Worktree**: Terisolasi di `C:\Users\hp\fiezel-feedback-m025-716` pada branch `feat/feedback-slide-sheet-m025-719`.
- **Nomor Build**: `m025-723` (naik dari `m025-722` yang disinkronisasi oleh Fiezel Bot dan menghindari tabrakan dengan PR #778 `m025-720`).
- **Verifikasi Visual**: Seluruh 5 poin diverifikasi dengan screenshot Playwright Chromium murni pada Mobile (`390 × 844 px`) dan Desktop (`1280 × 800 px`):
  - `mobile-home-no-kelasku.png`
  - `mobile-quiz-header-and-toggle.png`
  - `mobile-tutor-hint-modal.png`
  - `mobile-after-modal-retry-click.png`
  - `mobile-feedback-sheet-dual-action.png`
  - `mobile-feedback-deep-dive-opened.png`
  - `desktop-home-no-kelasku.png`
  - `desktop-tutor-hint-modal.png`
  - `desktop-feedback-sheet.png`
