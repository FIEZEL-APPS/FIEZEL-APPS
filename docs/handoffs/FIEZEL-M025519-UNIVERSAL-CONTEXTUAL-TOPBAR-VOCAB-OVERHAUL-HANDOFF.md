# FIEZEL Handoff Dossier: m025-519 Universal Contextual Topbar, Vocab Hub Redesign & Full-Screen Quiz Viewport

## 1. Ringkasan Eksekutif & Temuan Audit
Pembaruan build `m025-519` menyelesaikan serangkaian masalah kritis UI/UX pada seluruh panel dan sesi (sesuai audit tangkapan layar `IMG_2608` – `IMG_2621`):
1. **Universal Contextual Topbar**:
   - Menghilangkan watermark SVG logo FIEZEL dan tombol pemilih kursus (`English ▾`) statis yang sebelumnya muncul di semua panel.
   - Menggantinya dengan topbar kontekstual yang dinamis:
     - **Home**: Logo FIEZEL + tombol kursus `[English ▾]` (tanpa tombol pengaturan).
     - **Latihan**: Label `Latihan` + pemilih level `[A1 | Ganti]` (tanpa tombol kembali karena merupakan tab utama).
     - **Grammar**: Tombol kembali `<- Grammar` + pemilih level `[A1 | Ganti]`.
     - **Kosakata**: Tombol kembali `<- Kosakata` + pemilih level `[A1 | Ganti]` (menghilangkan baris judul/level ganda).
     - **Bicara & Dengar / Skills**: Tombol kembali `<- Bicara & Dengar` + pemilih level `[A1 | Ganti]`.
     - **KelasKu**: Wordmark `KelasKu` + badge kelas `[X IPA 2 ▾]` (tanpa logo FIEZEL, tanpa tombol kursus bahasa).
     - **Profil**: Judul `Profil` + ikon Pengaturan `⚙️` (tanpa tombol kursus bahasa).
2. **Kosakata Hub Modern Redesign**:
   - Mengubah layout tumpukan kartu yang rumit menjadi satu hero card bersih berlatar cream/warm white (`.vocab-hero-card`).
   - Menyediakan progress bar penguasaan kata yang proporsional (`.vocab-progress-track`).
   - Tombol utama yang menonjol: `Buka Flashcards` (`.vocab-main-flashcard-btn`).
   - Dua tombol grid aksi cepat: `Uji Kosakata` dan `Review Due` (`.vocab-quick-grid`, `.vocab-quick-btn`).
3. **Praktek Langsung pada Klik Node Grammar**:
   - Menghilangkan kartu teori perantara yang rusak/kosong ("Contoh:      .") sehingga ketika node grammar diklik, aplikasi langsung memulai latihan (`practiceSkill(skill)`).
4. **Full-Screen Practice Viewport**:
   - Menyembunyikan header global, topbar, dan bottomnav selama sesi kuis aktif / latihan bicara & dengar aktif sehingga area latihan pas 100dvh tanpa terpotong.
5. **Preservasi Maskot**:
   - Sahabat Mochi 3D dan maskot PAW tetap terjaga penuh tanpa perubahan yang merusak.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)
- **Skrip Pengujian**: `tools/dev/verify-universal-topbar-and-panels-probe.mjs`
- **Hasil Eksekusi**:
  - `--- 1. Testing Home Panel ---` -> `brandDisplay: 'flex', courseDisplay: 'flex', contextDisplay: 'none'` (PASS)
  - `--- 2. Testing Latihan Panel ---` -> `brandDisplay: 'none', courseDisplay: 'none', contextDisplay: 'flex', titleText: 'Latihan', hasLevelInActions: true` (PASS)
  - `--- 3. Testing Grammar Panel ---` -> `brandDisplay: 'none', courseDisplay: 'none', contextDisplay: 'flex', backDisplay: 'flex', titleText: 'Grammar', hasLevelInActions: true` (PASS)
  - `--- 4. Testing Vocab Panel (Kosakata) ---` -> `brandDisplay: 'none', courseDisplay: 'none', contextDisplay: 'flex', backDisplay: 'flex', titleText: 'Kosakata', hasLevelInActions: true, hasVocabHubPage: true, hasHeroCard: true, hasFlashcardBtn: true, hasQuickGrid: true` (PASS)
  - `--- 5. Testing KelasKu Panel ---` -> `brandDisplay: 'none', brandKelasKuDisplay: 'flex', clusterKelasKuDisplay: 'flex'` (PASS)
  - `--- 6. Testing Profile Panel ---` -> `brandDisplay: 'none', courseDisplay: 'none', contextDisplay: 'flex', titleText: 'Profil', settingsDisplay: 'flex'` (PASS)
  - `--- 7. Testing Topbar Back Button Navigation ---` -> `Back from grammar landed on view: latihan` (PASS)
  - `=== ALL PROBE CHECKS PASSED PERFECTLY (100% GREEN) ===`

---

## 3. Berkas yang Disentuh dan Perubahannya
1. `index.html`:
   - Menambahkan elemen `#topContextWrap` (`#topContextBackBtn`, `#topContextTitle`) dan `#topContextActions`.
2. `style.css`:
   - Menambahkan styling untuk `.topbar-context-wrap`, `.topbar-context-back-btn`, `.topbar-context-title`, `.topbar-context-actions`.
   - Menambahkan styling `.vocab-hub-page`, `.vocab-hero-card`, `.vocab-progress-track`, `.vocab-progress-fill`, `.vocab-main-flashcard-btn`, `.vocab-quick-grid`, `.vocab-quick-btn`.
   - Menghapus aturan selektor global yang memaksakan `display: flex !important` pada logo dan tombol kursus.
   - Menambahkan context display guard untuk non-home panel.
3. `features/ui/fiezel-tactile-clay.css`:
   - Menghapus override `!important` yang memaksa `#topBrandWrap` dan `#fzCourseSwitchBtn` tampil di semua view.
   - Menambahkan selector guard `[style*="display: none"] { display: none !important; }`.
4. `features/speaking-listening/speaking-listening-addon.css`:
   - Menambahkan styling fullscreen 100dvh saat sesi latihan aktif (`body.fz-stage-sl.fsl-session-active`).
5. `app.js`:
   - Penyelarasan topbar di `renderInner()` untuk Home, KelasKu, Profil, Latihan, Grammar, Kosakata, Skills/Listening/Speaking, Membaca, Menulis, Progres.
   - Menambahkan handler `window.handleTopbarBack()` untuk navigasi kembali yang intuitif.
   - Memodifikasi fungsi `vocab()` untuk merender layout modern `.vocab-hub-page`.
   - Memodifikasi `openGrammarLesson(skill)` agar langsung menjalankan `practiceSkill(skill)`.
6. `tests/th-ui-leak-test.js`:
   - Menyesuaikan batas anggaran kebocoran teks ID di `app.js` dari 4 menjadi 3 (karena eliminasi teks non-i18n).
7. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Sinkronisasi snapshot emas kamus dan laporan integritas.
8. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Bump versi resmi build ke `m025-519` via `tools/bump-build.mjs`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS (5489 literal identik)
- `node tests/th-ui-leak-test.js`: PASS (3957 kunci id memiliki padanan th)
- `node tests/curriculum-cache-version-test.js`: PASS (m025-519 tersinkronisasi)
- `node tests/gate-registry-test.js`: PASS (364 gerbang terdaftar)
- `node tests/anti-flicker-uiux-invariant-test.js`: PASS (14/14 invarian)
- `node tests/grammar-vocab-leveling-test.js`: PASS (10/10 level tests)
- `node tests/paw-mascot-test.js`: PASS (35/35 tes maskot)
- `node tests/gems-test.js`: PASS (34/34 tes gems)
- `node tests/classroom-test.js`: PASS (20/20 tes KelasKu)
- `node tests/level-grammar-contract-test.js`: PASS (18/18 tes kontrak level)
- `node validator.js`: PASS (0 duplikat, 0 error)
- `node tests/regression-test.js`: PASS (12 adaptive, 12 placement)
- `node tools/bump-build.mjs --check`: Selaras (6 titik sinkron penuh ke m025-519).
