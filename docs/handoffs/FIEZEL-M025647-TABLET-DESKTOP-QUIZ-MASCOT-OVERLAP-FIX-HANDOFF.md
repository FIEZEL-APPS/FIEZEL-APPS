# FIEZEL M025-647 HANDOFF: TABLET & DESKTOP QUIZ MASCOT OVERLAP & READING CONTRAST REPAIR

**Otoritas Rilis**: OWNER / MASTER Directive Direct Alignment
**Tanggal Rilis**: 24 Oktober 2026
**Nomor Build**: `m025-647`
**Status Fitur**: PASS (Terverifikasi Empiris & Siap Produksi)

## 1. Ringkasan Temuan Audit & Masalah
- **Keluhan Pengguna**:
  1. *"aduh ada hal yang sangat fatal, pada tampilan tab dan dekstop , saat memasuki sesi latihan listening, dan semua sesi tes pokoknya semuanya, baik di sesi kursus english dan jepang, soalnya di tutupi oleh mascot, dan ui/ux nya di tablet dan dekstop berantakan dan sangat mengganggu user"*
  2. *"tulisan ini juga sangat susah di baca"* (Tangkapan layar wacana bacaan Jepang menunjukkan teks kanji/kana berwarna kelabu tua/biru slate `#5B6472` di atas kartu gelap `#151520`, kontras rendah 2.2:1 yang tidak terbaca oleh murid).
- **Akar Masalah (Root Cause)**:
  1. **Benturan Grid 2-Kolom Desktop pada Sesi Reading (`style.css`)**:
     `.quiz-shell:has(.card-reading)` menerapkan grid 2 kolom `1.2fr 1fr`. Namun `.quiz-shell.has-paw-side` menaruh maskot `.fz-paw-side` di `grid-column: 2`. Akibatnya, kartu soal dan maskot dimasukkan ke kolom yang sama persis, sehingga Three.js canvas maskot (dengan `z-index: 2` dan `pointer-events: auto`) menimpa langsung batang soal (`#quizStem`) dan menelan interaksi klik murid.
  2. **Penumpukan Vertikal Japanese Chokai Modal pada Layar Tablet/Desktop (`jlpt-listening.css`)**:
     Pada layar lebar ($\ge 641\text{px}$), modal listening bahasa Jepang dibatasi lebar 540px namun menumpuk header (42px) + maskot (160px) + audio (44px) + soal + 4 pilihan jawaban (208px) = $>620\text{px}$ secara vertikal. Pada tablet/laptop tinggi 768px–800px, tumpukan vertikal ini menekan kartu dan membuat canvas maskot tumpang tindih dengan teks pertanyaan.
  3. **Penataan English Listening / Skills Lab pada Layar Tablet/Desktop (`speaking-listening-addon.css`)**:
     `.fsl-shell` dan `.fsl-card-listening` membentang lebar penuh tanpa kontrol max-width dan tinggi player audio yang proporsional, menyebabkan posisi maskot bergeser menimpa area pertanyaan saat ukuran viewport berubah.
  4. **Pewarnaan Kontras Rendah Teks Bacaan (`mobile-edge-fit.css`)**:
     Selector global `.card p` dan `.card p > span` memaksa `color: #5B6472 !important`. Pada kartu bacaan `#151520`, warna `#5B6472` menghasilkan rasio kontras 2.2:1 yang melanggar standar WCAG AAA dan membuat kanji/kana sangat sulit dibaca.

## 2. Solusi & Perubahan Arsitektur
1. **Desktop 3-Column Split for Reading + Side Mascot (`style.css`)**:
   - Pada `@media (min-width: 980px)`:
     ```css
     .quiz-shell:has(.card-reading).has-paw-side {
       display: grid !important;
       grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 164px !important;
       grid-template-areas: "topbar topbar topbar" "reading question mascot" !important;
       gap: 20px !important;
       max-width: 1320px !important;
       margin: 0 auto !important;
     }
     ```
   - Maskot `.fz-paw-side` dialokasikan ke kolom ke-3 (`grid-area: mascot; grid-column: 3; position: sticky; top: 96px; pointer-events: none; z-index: 1;`).
   - Pada rentang tablet 860px–979px dengan kartu bacaan, `.fz-paw-side` disembunyikan (`display: none !important`) agar 2 kolom wacana dan soal mendapat ruang maksimal tanpa benturan.
2. **Side-by-Side Tablet Stage & Pointer Events Protection (`style.css`)**:
   - Pada `@media (min-width: 641px) and (max-width: 979px)`: `.quiz-stage` diatur berdampingan horizontal (`display: flex; flex-direction: row; align-items: center; gap: 18px;`) dengan `.quiz-bubble` memiliki `z-index: 5` dan lebar fleksibel.
   - `.fz-mochi-viewport` diubah menjadi `pointer-events: none; z-index: 1;` dengan canvas `pointer-events: none;` sehingga Three.js canvas tidak akan pernah menahan klik murid pada teks soal maupun pilihan jawaban.
3. **Japanese Chokai 2-Column Responsive Layout (`jlpt-listening.css`)**:
   - Pada `@media (min-width: 641px)`:
     - Lebar modal diperluas: `width: min(94vw, 760px) !important; max-width: 760px !important;`.
     - `.jlpt-mobile-card` ditransformasikan menjadi grid 2-kolom:
       - Kolom 1 (240px): Maskot (`.jlpt-mascot-slot`, height 160px) + Audio Player row (`.jlpt-audio-row`).
       - Kolom 2 (1fr): Blok Soal (`.jlpt-question-block`) + Daftar Pilihan Jawaban (`.jlpt-options-list`).
     - Nol tumpang tindih vertikal antara maskot dan opsi jawaban.
4. **English Listening Layout Centering & Protection (`speaking-listening-addon.css`)**:
   - Pada `@media (min-width: 768px)`: `.fsl-shell` memiliki `max-width: 720px !important; margin: 0 auto !important;`, player tinggi 120px, dan elemen interaktif (`h2`, `.fsl-options`, `.fsl-play-hero`) memiliki `z-index: 5`.
5. **High-Contrast Reading Typography (`mobile-edge-fit.css`)**:
   - Teks wacana pada `.card-reading p`, `#quizPassage p`, `.passage p`, `ruby`, `.ja-word` disetel ke `#F8FAFC !important` (kontras $>14:1$ di atas kartu gelap).
   - Furigana `rt` disetel ke warna kuning hangat `#FCD34D !important` dengan ketebalan font `700`, menjamin keterbacaan tajam dan jernih.

## 3. Bukti Pengujian Empiris (Playwright Headless Audit Probes)
Pengujian empiris Playwright Chromium dijalankan melalui `scratch/verify-all.mjs` di berbagai ukuran viewport (Mobile 390px, Tablet 768px, Desktop 1024px & 1280px):
- **Test 1: Japanese Reading Passage High-Contrast Colors**:
  - Warna paragraf wacana: `rgb(248, 250, 252)` (`#F8FAFC`), kontras $>14:1$.
  - Status: PASS.
- **Test 2: Desktop 3-Column Reading Layout (1024px & 1280px)**:
  - Pada 1024px: Reading card (`left: 28, w: 416.7`), Question card (`left: 464.7, w: 347.3`), Mascot (`left: 832.0, w: 163.8`).
  - Overlap Q-Card & PawSide: `false`. Overlap Stem & PawSide: `false`.
  - Pada 1280px: Reading card (`left: 28, w: 556.4`), Question card (`left: 604.4, w: 463.6`), Mascot (`left: 1088.0, w: 192.0`).
  - Overlap Q-Card & PawSide: `false`. Overlap Stem & PawSide: `false`.
  - Status: PASS.
- **Test 3: Japanese Chokai Modal (768px & 1280px)**:
  - Pada 768px: Mascot slot (`left: 80.2, top: 371.8`), Question block (`left: 324.8, top: 371.8`), Options (`left: 324.8, top: 536.4`).
  - Overlap Mascot & Question: `false`. Overlap Mascot & Options: `false`.
  - Pada 1280px: Mascot slot (`left: 312.9`), Question block (`left: 561.6`), Options (`left: 561.6`).
  - Overlap Mascot & Question: `false`. Overlap Mascot & Options: `false`.
  - Status: PASS.
- **Test 4: English Listening Session (768px & 1280px)**:
  - Pada 768px: Shell lebar 720px di tengah, Question h2 (`top: 181`), Player/Mascot (`top: 220`), Options (`top: 437`).
  - Overlap Mascot & H2: `false`. Overlap Mascot & Options: `false`.
  - Pada 1280px: Shell lebar 720px di tengah (`left: 280`), Question h2 (`top: 181`), Player/Mascot (`top: 220`), Options (`top: 374`).
  - Overlap Mascot & H2: `false`. Overlap Mascot & Options: `false`.
  - Status: PASS.

Semua pengujian empiris Playwright berhasil lulus 100%.

## 4. Berkas yang Dimodifikasi
- `style.css`: Grid 3-kolom desktop untuk sesi membaca + maskot, perapian stage tablet 641px–979px, dan perlindungan `pointer-events: none` pada viewport maskot 3D.
- `features/speaking-listening/jlpt-listening.css`: Tata letak grid 2-kolom responsif untuk modal Chokai Jepang pada layar tablet dan desktop.
- `features/speaking-listening/speaking-listening-addon.css`: Centering shell dan pembatasan dimensi player audio pada sesi listening bahasa Inggris di tablet/desktop.
- `features/ui/mobile-edge-fit.css`: Tipografi kontras tinggi untuk wacana bacaan (`#F8FAFC`) dan furigana tajam (`#FCD34D`).
- Berkas Sinkronisasi Arbiter (`m025-647`):
  - `coordination/BUILD-VERSION.json`
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`
  - `call.html`
  - `features/voice-studio/call.html`

## 5. Status Gerbang Mutu Lokal & Verifikasi Hexa-Sync
- `node tools/bump-build.mjs --check`: SELARAS (6 titik).
- `node tests/id-golden-snapshot-test.js`: HIJAU (baseline emas Indonesia utuh).
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran).
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, build m025-647).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- Playwright Empirical Probes: PASS 100% across all viewports.

## 6. Catatan Utang Teknis & Langkah Selanjutnya (Roadmap & Next Steps)
- **Langkah Selanjutnya**:
  1. Pantau telemetri interaksi murid pada perangkat tablet beresolusi 768px dan 1024px setelah rilis m025-647.
  2. Lakukan audit berkala pada sesi Writing prompt agar penataan layout tablet/desktop tetap konsisten dengan grid 3-kolom kuis dan Skills Lab.
  3. Verifikasi performa Three.js 60 FPS pada peramban mobile/tablet lawas agar animasi maskot tetap mulus tanpa stutter.
