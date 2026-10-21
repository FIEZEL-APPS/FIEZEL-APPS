# FIEZEL Handoff Dossier: m025-518 Topbar Coverage & Compact Viewport Fit Polish

- **Versi Build**: `m025-518`
- **Branch**: `fix/m025-518-topbar-coverage-and-compact-fit`
- **Target**: `main`
- **Tanggal**: 2026-10-08

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sesi rilis ini menuntaskan verifikasi menyeluruh dan perbaikan atas edge-case yang teridentifikasi dalam audit independen pasca-m025-517:

1. **Kelengkapan Cakupan Topbar Kontekstual (`app.js:renderInner()`)**:
   - Menambahkan penanganan eksplisit untuk panel `kana` (Latihan Huruf Jepang), `ask` & `search` (Kamus & Tanya Kata), `tutor` (Tutor Center), dan `nujum` (Mentor Nujum), serta fallback ke `TAB_PARENT[state.view]`.
   - Mengeliminasi regresi di mana panel-panel latihan sekunder seperti `kana`, `ask`, dan `search` jatuh ke default tag `AKTIF` alih-alih `LATIHAN`.

2. **Ketahanan Viewport Kompak Vertikal (`@media (max-height: 560px)`)**:
   - Menambahkan aturan media query tinggi layar terbatas di `features/ui/mobile-edge-fit.css` dan `style.css`.
   - Menyesuaikan `min-height` deck flashcard dan padding kartu sehingga tombol aksi penguasaan (Belum hafal / Sudah hafal) tetap muat secara ergonomis dalam 1 layar tanpa memicu scroll vertikal pada orientasi lanskap ponsel maupun layar sangat kompak.

3. **Hexa-Sync Invariant & PWA Cache**:
   - Build dinaikkan ke `m025-518` melalui arbiter resmi `node tools/bump-build.mjs`.
   - Memastikan keselarasan penuh pada 6 titik konfigurasi dan PWA shell cache.

---

## 2. Bukti Pengujian Empiris (Test Suites & Invariants)

- `node tools/bump-build.mjs --check`: PASS (`Selaras` 6 titik)
- `node tests/curriculum-cache-version-test.js`: PASS (m025-518)
- `node tests/id-golden-snapshot-test.js`: PASS (5.489 literal emas utuh)
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran)
- `node tests/paw-mascot-test.js`: PASS (35/35 maskot invarian)
- `node tests/anti-flicker-uiux-invariant-test.js`: PASS (14/14 checks)
- `node tests/gate-registry-test.js`: PASS (10/10 checks)
- `node tests/gems-test.js`: PASS (34/34 checks)
- `node tests/classroom-test.js`: PASS (20/20 checks)
- `node tests/pwa-cache-test.js`: PASS
- `node tests/course-persistence-test.js`: PASS (8/8 checks)
- `node tests/regression-test.js`: PASS

---

## 3. Berkas yang Berubah

1. `app.js` — Perluasan cakupan `_bTag` untuk seluruh rute latihan & sub-layar (`kana`, `ask`, `search`, `tutor`, `nujum`, `TAB_PARENT`).
2. `features/ui/mobile-edge-fit.css` — Penambahan `@media (max-height: 560px)` untuk fit flashcard di layar vertikal terbatas.
3. `style.css` — Penambahan `@media (max-height: 560px)` selaras dengan `mobile-edge-fit.css`.
4. `coordination/BUILD-VERSION.json` — Bump versi ke `m025-518`.
5. `sw.js` — Bump `SW_REV` ke `m025-518`.
6. `core-config.js` — Bump `self.FIEZEL_PAGE_BUILD` ke `m025-518`.
7. `features/neural-voice/fiezel-diag-panel.js` — Bump `var DIAG_BUILD` ke `m025-518`.
8. `kurikulum.html` — Update parameter `?v=m025-518`.
9. `misi.html` — Update parameter `?v=m025-518`.
10. `docs/handoffs/FIEZEL-M025518-TOPBAR-COVERAGE-AND-COMPACT-FIT-HANDOFF.md` — Dossier serah terima ini.
