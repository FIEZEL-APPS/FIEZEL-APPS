# FIEZEL M025-634 — Serah Terima Audit & Perbaikan UI/UX Home Panel

**Build:** `m025-634`  
**Tanggal:** 24 Oktober 2026  
**Cakupan:** Audit empiris UI/UX Home Panel (`.today-home-cockpit`) & eksekusi perbaikan P0, P1, dan P2.

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Melalui probe peramban headless Chromium Playwright di 7 skenario viewport/bahasa/status (`390×844` aktif EN, `360×640` pengguna baru EN, `390×844` sesi selesai `10/10` EN, `390×844` kursus Jepang `ja`, `390×844` locale Thailand `th`, `768×1024` Tablet, dan `1280×800` Desktop), ditemukan dan diperbaiki masalah berikut:

1. **`[P0]` Benturan Dua Modal Sekaligus (`#fzRitual` + `.fz-tour`) & Target Tur Basi**:
   - `homeScreenIsClear()` dan `tourLayerIsClear()` di `app.js` sebelumnya tidak memeriksa keberadaan `#fzRitual`, sehingga dialog *Pilih Ritme Belajarmu* dan *Tur Menu* dapat bertumpuk bersamaan.
   - `FiezelTour.resolveSteps()` di `features/onboarding/fiezel-tour.js` hanya memulihkan 4/7 langkah pada Home modern karena `.learning-launcher` dan `.home-level-context` sudah digantikan oleh `#heroCard` dan `#fzCourseSwitchBtn`, serta `#topSettingsBtn` tersembunyi (`0×0`) di layar mobile.
   - **Perbaikan**: Menambahkan `#fzRitual` ke penjaga layar bersih di `app.js` dan menambahkan `FALLBACK_TARGETS` sadar-visibilitas (`hasBox`) di `features/onboarding/fiezel-tour.js` sehingga `7/7` langkah tur menu teresolusi di mobile dan desktop.

2. **`[P1]` Sinkronisasi Status `#heroCard` & `#btnStartSession` (Sesi Selesai & Kursus Jepang)**:
   - Saat sesi harian selesai (`selesai === true`, `10/10`), `#heroCard` sebelumnya tetap menampilkan `"LATIHAN HARI INI"` dan `"MULAI SESI HARI INI (10 MENIT)"`. Kini menampilkan `"SESI HARI INI SUDAH BERES"`, pil istirahat, dan CTA `"Latihan tambahan →"` dengan aksen emerald (`.is-done`).
   - Pada kursus Jepang (`jaCourseOn() === true`), murid yang belum mengikuti tes penempatan bahasa Inggris sebelumnya diarahkan ke `"MULAI TES LEVEL SEKARANG"` (`go('test')`) dengan label `A1`. Kini `hasTestedLevel` dan `heroRencanaModel` menghormati `jaCourseOn()` dan menampilkan level `N5` serta `"MULAI SESI HARI INI"`.

3. **`[P1]` Konsistensi Kartu *KelasKu* di Home vs. Navigasi Bawah**:
   - Mengubah kartu `.class-bar` di Home agar langsung membuka `go('classroom')` (`#fzClassHub`), melokalisasi seluruh teksnya (`id`/`th`/`ja`), dan mengganti `<button>` bersarang di dalam `<section onclick>` menjadi `<span class="class-btn-3d" aria-hidden="true">`.

4. **`[P1]` Kebocoran Bahasa (`th` & `ja`) pada *Latihan Singkat***:
   - Melokalisasi tautan `.section-see-all` (`FiezelI18n.t('home.latihan-soal-sub')`), lencana `.tile-badge` (`N5 · 言葉/文法/読解/聴解` untuk Jepang; hitungan jatuh tempo / level aktif untuk Inggris), serta judul & subjudul kartu ke-4 (`Chōkai` / `聴解 · menyimak`) saat kursus Jepang aktif.

5. **`[P1]` Aksesibilitas Keyboard & Semantik `<h1>` (WCAG 2.1 AA)**:
   - Mengubah `<div class="fz-greet-title">` menjadi `<h1 class="fz-greet-title">`.
   - Menambahkan `role="button" tabindex="0"` dan *handler* `onkeydown` (`Enter`/`Space`) pada `#topBrandWrap`, `.fz-kawan-card`, `.section-see-all`, keempat `.grid-tile`, dan `.class-bar`.

6. **`[P2]` Urutan *Above-the-Fold* Mobile, Target Sentuh `44×44px`, Kontras, & Pemotongan Pil**:
   - Menempatkan `#heroCard` di urutan visual pertama (`order: 2`) di atas `.fz-kawan-card` (`order: 3`) pada viewport `< 1100px` sehingga CTA utama 100% terlihat di atas `.bottomnav` pada layar `360×640`.
   - Menaikkan ukuran area sentuh `.topbar .icon-button` menjadi `44×44px` dan `.section-see-all` menjadi `min-height: 44px`.
   - Menghapus `text-overflow: ellipsis; white-space: nowrap` pada `.hero-plan .hero-pil > span` agar kalimat rencana belajar tampil utuh.
   - Memperbaiki kontras `.class-badge-dot` (`#475569`) dan ukuran font lencana ke `11px`.

---

## 2. Daftar Berkas yang Disentuh

- `index.html` — Menambahkan *handler* `onkeydown` (`Enter`/`Space`) pada `#topBrandWrap`.
- `app.js` — Penjaga `#fzRitual` di `homeScreenIsClear()`/`tourLayerIsClear()`, dukungan kursus Jepang & status `selesai` di `#heroCard`, semantik `<h1>` pada `.fz-greet-title`, lokalisasi & aksesibilitas `.quick-practice-section` dan `.class-bar`.
- `features/onboarding/fiezel-tour.js` — Resolusi target cadangan sadar-kotak-visual (`FALLBACK_TARGETS` + `findVisibleTarget`) untuk `MENU_STEPS`.
- `style.css` — Pembungkusan teks penuh tanpa elipsis pada `.hero-plan .hero-pil > span`.
- `features/ui/fiezel-tactile-clay.css` — Urutan visual `#heroCard` di atas `.fz-kawan-card` pada `< 1100px`, gaya `.hero-card.is-done`, target sentuh `44×44px`, dan perbaikan kontras/ukuran font lencana.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `id-golden-baseline.json` — Sinkronisasi nomor build `m025-634` dan baseline snapshot emas.

---

## 3. Status Kelulusan Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check` → **Selaras (`m025-634`)**
- `node tests/id-golden-snapshot-test.js` → **HIJAU**
- `node tests/th-ui-leak-test.js` → **PASS (4412 kunci, 0 kebocoran baru)**
- `node tests/curriculum-cache-version-test.js` → **OK (`m025-634`)**
- `node tests/gate-registry-test.js` → **PASS (10/10)**
- `node tests/tour-test.js` & `node tests/tours-test.js` → **PASS**
- `node tests/home-honesty-test.js` → **PASS (9/9)**
- `node tests/home-kawan-bicara-card-test.js` → **PASS (5/5)**
- `node tests/alasan-soal-test.js` → **PASS (39/39)**
- `node tests/multi-device-comfort-test.js` → **HIJAU (8/8)**
