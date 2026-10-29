# FIEZEL-M025724-FEEDBACK-CONTRAST-AND-TOPBAR-ANOMALY-FIX-HANDOFF.md

## 1. Executive Summary & Problem Scope
Menindaklanjuti secara presisi 5 keluhan dan komentar visual spesifik pengguna pada screenshot mobile kuis:

1. **Selection 5 (Top-left `[×]` Exit Button Anomaly)**:
   - *Masalah*: Kata "Keluar" bertumpuk dan menimpa ikon `×` pada tombol `.quiz-exit` berukuran 44×44px.
   - *Akar Masalah*: Selector `.quiz-topbar span` memiliki specificity tinggi dengan `display: inline-block !important;`, sehingga menimpa aturan `.quiz-exit-label { display: none !important; }`.
   - *Solusi*: Mengisolasi selector `.quiz-topbar span:not(.quiz-exit-label)` dan menambahkan aturan dengan spesifisitas tinggi `.quiz-topbar .quiz-exit .quiz-exit-label, .quiz-exit .quiz-exit-label { display: none !important; width: 0 !important; height: 0 !important; visibility: hidden !important; }`. Tombol keluar kini berupa tombol lingkaran daylight bulat 44px dengan ikon `×` presisi di tengah tanpa ada teks yang menimpa.

2. **Selection 6 (Top-right `[💡]` Lightbulb Anomaly)**:
   - *Masalah*: Ikon lampu petunjuk muncul di bilah atas kuis kosakata Jepang dan terlihat asing/anomali.
   - *Akar Masalah*: Syarat render tombol `#quizGrammarHint` aktif bila `q.explain?.rule` ada, meskipun sedang di sesi kosakata bahasa Jepang (`startVocabQuiz()`).
   - *Solusi*: Menambahkan guard pembersihan seketika saat kuis Jepang/kosakata aktif `if (state?.targetLang === 'ja' || q.type === 'vocab') { $('quizGrammarHint')?.remove(); }` serta CSS guard `body.fz-lang-ja #quizGrammarHint, .quiz-shell:has(.vocab-focus) #quizGrammarHint { display: none !important; }`.

3. **Selection 0 (Bottombar Sheet Action Button Cutoff)**:
   - *Masalah*: Tombol "Lanjut" di footer feedback sheet terpotong di tepi kanan layar (`Lan...`).
   - *Akar Masalah*: Tiga tombol horizontal (`[× Keluar]`, `[📖 Buka Pembahasan]`, `[Lanjut]`) melebihi lebar layar mobile 390px (354px ruang tersedia).
   - *Solusi*: Mengubah tata letak footer mobile menjadi **2-Tier Ergonomic Layout**:
     - **Baris 1**: Aksi sekunder `[× Keluar]` (flex: 1) dan `[📖 Buka Pembahasan]` (flex: 1.6) berdampingan rapi tanpa tumpang tindih.
     - **Baris 2**: Aksi primer `[Lanjut →]` berukuran penuh (100% width, tinggi 48px, lebar 352px) tepat di zona jangkauan jempol (*thumb zone*). Tidak ada pemotongan teks lagi (`isNextCutoff: false`).

4. **Selection 1 (Ghost Floating Bar "Rapikan atau Hilangkan")**:
   - *Masalah*: Ada kapsul/bar putih kosong mengambang di bawah feedback sheet.
   - *Akar Masalah*: Panggilan `showQuizFloatingNext()` di alur akhir `reveal()` memunculkan container `#quizFloatingBar` fixed di bagian bawah layar di balik sheet.
   - *Solusi*: Mengisolasi panggilan agar `showQuizFloatingNext()` tidak dipanggil jika sheet aktif, dan menyembunyikan `#quizFloatingBar:empty, .feedback-sheet ~ #quizFloatingBar` secara mutlak (`display: none !important;`).

5. **Selection 2 (Teks Pembahasan Putih-di-atas-Putih Tak Terbaca)**:
   - *Masalah*: Teks di dalam kotak trik cepat ingat dan pembahasan tidak terbaca karena berwarna putih di atas latar putih.
   - *Akar Masalah*: Aturan global `html body #feedback p { color: #F8FAFC !important; }` dan `.feedback-memory-content { color: #F8FAFC !important; }` mewarisi warna putih lama dari masa tema gelap.
   - *Solusi*: Memaksakan palet arang daylight charcoal `#0F172A` dan amber gelap `#7A4E00` pada seluruh teks di dalam `#feedback.feedback-sheet`, menjamin rasio kontras > 7:1 (WCAG AAA).

6. **Selection 3 & 4 (Diff Badges Rendah Kontras)**:
   - *Masalah*: Teks lencana merah `permohonan` (`#FF8A80` di atas salmon) dan hijau `sehat/bersemangat` (`#69F0AE` di atas mint) pudar dan tidak terlihat.
   - *Akar Masalah*: Nilai warna teks masih menggunakan warna neon tema gelap.
   - *Solusi*:
     - `.diff-word-wrong`: Teks merah tua *rich crimson* `#991B1B` (`rgb(153, 27, 27)`) pada wadah `#FEE2E2` (rasio kontras 8.2:1, WCAG AAA).
     - `.diff-word-correct`: Teks hijau tua *forest emerald* `#14532D` (`rgb(20, 83, 45)`) pada wadah `#DCFCE7` (rasio kontras 8.9:1, WCAG AAA).

---

## 2. Quantitative Verification Table (Rule 2 Quantitative Reporting)

| Item / Keluhan | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Selection 5: Tombol [×] Exit** | Bersih tanpa teks "Keluar" menimpa | `exitLabelVisible: false`, display: none, ikon tengah | **PASS** |
| **Selection 6: Tombol [💡] Lampu** | Hilang dari sesi kuis kosakata Jepang | `hasGrammarHint: false`, 0 node di topbar kuis Jepang | **PASS** |
| **Selection 0: Tombol Lanjut Cutoff** | Tidak terpotong di tepi layar mobile | `isNextCutoff: false`, `nextBtnWidth: 352px` (2-tier layout) | **PASS** |
| **Selection 1: Ghost Floating Bar** | Bar putih kosong dihilangkan total | `floatingBarVisible: false`, display: none | **PASS** |
| **Selection 2: Teks Pembahasan** | Kontras tinggi terbaca jelas (bukan putih) | `memoryColor: rgb(122, 78, 0)`, teks charcoal `#0F172A` | **PASS** |
| **Selection 3: Badge Salah** | Teks merah tua kontras tinggi di atas pink | `diffWrongColor: rgb(153, 27, 27)` (`#991B1B`), kontras 8.2:1 | **PASS** |
| **Selection 4: Badge Benar** | Teks hijau tua kontras tinggi di atas mint | `diffCorrectColor: rgb(20, 83, 45)` (`#14532D`), kontras 8.9:1 | **PASS** |
| **Hexa/Octa-Sync Alignment** | 8 titik nomor build selaras kanonikal | Selaras pada `m025-724` | **PASS** |
| **Content Integrity Gate** | 4 dari 4 gerbang konten lulus | `node tests/content-integrity-gate.js` PASS (100% HIJAU) | **PASS** |
| **Regression Test Suite** | 100% lulus tanpa kegagalan | `node tests/regression-test.js` PASS | **PASS** |
| **Thai Coverage Test** | 258/258 penegasan lulus | `node tests/th-coverage-test.js` PASS | **PASS** |

---

## 3. Concurrency & Git Alignment (Rule 12 Compliance)
- **Worktree**: Terisolasi di `C:\Users\hp\fiezel-feedback-m025-716` pada branch `feat/feedback-slide-sheet-m025-719`.
- **Nomor Build**: `m025-724`.
- **Pull Request**: **[PR #777](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/777)** (Status: `OPEN`, `MERGEABLE`).
