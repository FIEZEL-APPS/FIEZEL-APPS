# m025-487 — Menghilangkan Kedipan Transisi PWA ("Berkedip Seperti Merefresh Halaman")

## 1. Ringkasan Keluhan & Alasan Perubahan

USER:
> "aku ingin kamu memperbaiki tampilan di pwa yang berkedip kedip seperti sedang merefresh halaman, itu sangat mengganggu bagi murid"

### Diagnosis Empiris (Bukan Asumsi)
Melalui probe headless Chromium Playwright (`tools/dev/fiezel-vt-audit.js`), kami merekam composite opacity setiap frame saat perpindahan tab/layar. Ditemukan akar penyebab kedipan:
1. **Double Entrance Animation Stack**:
   - `go()` di `app.js` membungkus navigasi dengan `document.startViewTransition(swap)` (aktif di browser Chrome/Android).
   - `style.css` menerapkan `::view-transition-new(root) { animation: pageIn ... }` yang menganimasikan snapshot halaman baru dari `opacity: 0` ke `1`.
   - Pada saat yang sama, elemen root di dalam `#app` (seperti `<section class="fade home-page">`) **juga** menjalankan `animation: pageIn` dari `opacity: 0` ke `1`.
   - **Efek visual**: Kedua animasi opacity saling mengalikan (`newOp * fadeOp`). Di tengah transisi, konten baru tembus pandang ganda, menyebabkan cakupan layar (*coverage*) jatuh ke **0.752** (layar meredup 25% setiap pindah tab). Bagi murid, peredupan singkat ini terbaca sebagai "halaman berkedip seperti me-refresh".
2. **Kurva Easing yang Tidak Saling Menutupi**:
   - `::view-transition-old(root)` menggunakan `pageOut` dengan kurva bezier, sedangkan `::view-transition-new(root)` menggunakan `pageIn` dengan kurva berbeda.
   - Handoff tidak linier: snapshot lama memudar lebih cepat daripada laju kemunculan snapshot baru, menciptakan celah transparansi di tengah transisi.

---

## 2. Solusi Perbaikan

1. **Pagar `vtViewPaint` & Penahanan `.is-repaint`**:
   - Di `app.js`: Saat `document.startViewTransition` aktif, bendera `vtViewPaint` dinyalakan dan kelas `.is-repaint` dipasang ke `#app`.
   - Aturan `.is-repaint .fade { animation: none !important; }` di `style.css` menonaktifkan `pageIn` internal di elemen `#app`, menyerahkan animasi transisi sepenuhnya ke root View Transition browser.
   - Kelas `.is-repaint` dipertahankan sepanjang transisi dan dilepas secara bersih begitu `vt.finished.finally()` terpenuhi.
   - Di browser tanpa View Transition (iOS Safari PWA / Firefox), `vtViewPaint` bernilai `false`, sehingga `.fade` tetap berfungsi normal sebagai satu-satunya animasi masuk.

2. **Cross-Fade Linier yang Saling Mengisi (`vtFadeOut` & `vtFadeIn`)**:
   - Di `style.css`: Mengganti `pageOut`/`pageIn` pada pseudo `::view-transition-old/new(root)` dengan pasangan keyframe baru:
     ```css
     ::view-transition-old(root) { animation: vtFadeOut var(--dur-l) linear forwards; }
     ::view-transition-new(root) { animation: vtFadeIn var(--dur-l) linear forwards; }
     @keyframes vtFadeOut { from { opacity: 1; } to { opacity: 0; } }
     @keyframes vtFadeIn { from { opacity: 0; } to { opacity: 1; } }
     ```
   - Dengan durasi dan laju linier yang identik, rumus `opacity(old) + opacity(new) = 1.000` di setiap titik waktu. Nol celah transparansi, nol kedipan.

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip audit: `tools/dev/fiezel-vt-audit.js` dijalankan sebelum dan sesudah perbaikan:

| Transisi Layar | Coverage Minimum SEBELUM | Coverage Minimum SESUDAH | Status |
|---|---|---|---|
| Home → Game | **0.765** (kedip/redup 24%) | **1.000** (solid, mulus) | **TERATASI** |
| Game → Home | **0.752** (kedip/redup 25%) | **1.000** (solid, mulus) | **TERATASI** |
| Home → Progress | **0.752** (kedip/redup 25%) | **1.000** (solid, mulus) | **TERATASI** |
| Progress → Home | **0.752** (kedip/redup 25%) | **1.000** (solid, mulus) | **TERATASI** |

---

## 4. Daftar Berkas yang Berubah

| Berkas | Perubahan |
|---|---|
| `app.js` | Penambahan gate `vtViewPaint`, penahanan kelas `is-repaint` pada `#app` selama View Transition, pembersihan di `finished.finally()`. |
| `style.css` | Keyframes linier `vtFadeOut` dan `vtFadeIn` untuk `::view-transition-old/new(root)`. |
| `tools/dev/fiezel-flicker-probe.js` | Probe reproduksi garis waktu frame DOM dan lifecycle PWA. |
| `tools/dev/fiezel-backnav-probe.js` | Probe integritas riwayat dan pencegahan unload dokumen. |
| `tools/dev/fiezel-vt-audit.js` | Probe audit frame-by-frame opacity View Transition. |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json` | Peningkatan nomor build arbiter `m025-486` → `m025-487` (Hexa-Sync). |

---

## 5. Status Kelulusan Mutu Lokal

- `node tests/a11y-test.js` → **PASS**
- `node tests/back-nav-test.js` → **PASS**
- `node tests/id-golden-snapshot-test.js` → **PASS**
- `node tests/th-ui-leak-test.js` → **PASS**
- `node tests/curriculum-cache-version-test.js` → **PASS**
- `node tests/gate-registry-test.js` → **PASS** (10 pass, 0 fail)
- `node tools/bump-build.mjs --check` → **Selaras (Hexa-Sync HIJAU)**
