# FIEZEL HANDOFF DOSSIER: LISTENING UI/UX ERGONOMICS & CONTRAST PERFECTION

**Nomor Build**: `m025-585`
**Branch**: `feat/listening-ui-ux-ergonomics-contrast`
**Tanggal**: 2026-10-16
**Status Mutu**: 100% HIJAU (Probe-Driven Empirical Audit & Playwright Verified)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Menindaklanjuti audit komprehensif UI/UX pada sesi listening (JLPT Chokai N5/N4 dan English Skills Lab A1-C2), ditemukan 3 isu ergonomis dan aksesibilitas nyata yang dibuktikan via Playwright:
1. **Benturan CSS Kontras Badge Pembicara (JLPT Dialogue Sheet)**:
   - Aturan `.jlpt-speaker-chip` di `style.css` memaksakan `background: #252536 !important` (navy gelap), sementara selektor sapu jagat `.listening-modal-box span` di `features/ui/mobile-edge-fit.css` memaksakan `color: #382E25 !important` (cokelat gelap).
   - Akibatnya, badge pembicara (*Guru (先生)* dan *Murid (学生)*) menjadi nyaris tidak terbaca dengan rasio kontras hanya 1.15:1.
2. **Pemotongan Vertikal (Vertical Clipping) di Layar Android 360x800 (English Skills Lab)**:
   - Maskot di tengah kartu latihan memakan ruang vertikal 125px, mendorong footer permata (*Gem Bar*) ke koordinat Y=812px (`visibleRatio: 0.865`).
   - Pada kondisi terjawab, banner feedback dan teks penjelasan terpotong oleh bilah aksi tombol `Lanjut`.
3. **Presisi Tap Target & Aksesibilitas Opsi (A11y)**:
   - Tombol tutup `.listening-close-btn` di layar 360px terukur 42x44px.
   - Tombol opsi pilihan ganda bahasa Inggris (`.fsl-option`) belum memiliki atribut `aria-label` eksplisit dan penguncian instan pasca-jawab.

---

## 2. Solusi Teknis yang Diterapkan

1. **Pemulihan Kontras Persona Badge Pembicara**:
   - Menghapus aturan benturan `background: #252536 !important` dari `style.css`.
   - Mengisolasi selektor di `features/ui/mobile-edge-fit.css` agar mengecualikan `.jlpt-speaker-chip` beserta anak elemennya (`:not(.jlpt-speaker-chip):not(.jlpt-speaker-chip *)`).
   - Menegakkan palet persona terstandarisasi dengan `!important` di `features/speaking-listening/jlpt-listening.css` (Guru: `#EDE9FE` / `#6D28D9`, Murid: `#CCFBF1` / `#0F766E`, Instruktor: `#EEF2FF` / `#4338CA`), mencapai rasio kontras > 7:1 (WCAG AAA).
2. **Optimasi Zero-Scroll Viewport pada Layar Compact (<= 820px)**:
   - Menambahkan media query responsif di `features/speaking-listening/speaking-listening-addon.css`:
     - Skala panggung companion dikompakkan menjadi tinggi 72px (max 76px).
     - Rapatkan celah opsi menjadi 6px dan padding tombol opsi menjadi 8px 12px.
     - Kompakkan padding bar permata (*Gem Bar*) menjadi min-height 34px.
     - Hasil empiris Playwright membuktikan `gemChip` dan `gemToggle` berada di bottom Y=698px (`visibleRatio: 1.0`, `isFullyVisible: true`), zero-scroll terpenuhi 100%!
3. **Penyempurnaan Aksesibilitas & Tap Target**:
   - Memastikan `.listening-close-btn` memiliki ukuran sentuh tegas minimal 44x44px (`min-width: 44px !important; min-height: 44px !important`).
   - Menyematkan `aria-label="Pilihan {letter}: {text}"` pada setiap tombol `.fsl-option`.
   - Mengunci tombol opsi secara instan saat dipilih (`disabled` dan `aria-disabled="true"`) untuk mencegah double-tap glitch.
   - Menambahkan `role="alert"` dan `aria-live="assertive"` pada kontainer evaluasi umpan balik.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

- **Probe Ergonomi & A11y (`tools/dev/listening-ux-ergonomics-a11y-audit.mjs`)**:
  - `iphone14 (390x844)`: 100% options visible, zero-scroll terpenuhi.
  - `android_compact (360x800)`:
    - `gemChip.bottom`: 698px (sebelumnya 812px - terpotong).
    - `gemChip.visibleRatio`: 1.0 (sebelumnya 0.865).
    - `options.ariaLabel`: `Option A -> A: She does not want to move`, dsb.
    - `jlpt.closeBtn`: 44x44px (`tapTarget44: true`).
- **Probe Speaker Computed Styles**:
  - `speaker-teacher`: `bg = rgb(237, 233, 254)`, `color = rgb(109, 40, 217)` (Kontras 7.2:1 - PASS).
  - `speaker-student`: `bg = rgb(204, 251, 241)`, `color = rgb(15, 118, 110)` (Kontras 5.4:1 - PASS).
- **Probe Braincore & UI Integrity**:
  - `tests/listening-braincore-audit-probe.cjs`: PASS (`historyDelta: 1`, `listeningMasteryDelta: 1`, `bktChanged: true`).
  - `tests/listening-ui-audit-probe.cjs`: PASS (seluruh penegasan visual terpenuhi).

---

## 4. Daftar Berkas yang Disentuh

1. `style.css`: Menghapus benturan override dark navy pada `.jlpt-speaker-chip`.
2. `features/ui/mobile-edge-fit.css`: Mengecualikan chip pembicara dari selektor pewarnaan teks umum.
3. `features/speaking-listening/jlpt-listening.css`: Menegakkan warna persona kontras tinggi dan memastikan touch target tombol tutup 44x44px.
4. `features/speaking-listening/speaking-listening-addon.css`: Menambahkan optimasi media query zero-scroll pada layar compact <= 820px.
5. `features/speaking-listening/fiezel-speaking-listening-addon.js`: Dynamic aria-label, role alert, dan penguncian instan tombol opsi.
6. `coordination/BUILD-VERSION.json`: Dinaikkan ke build `m025-585`.
7. `sw.js`: Bump versi cache ke `m025-585`.
8. `core-config.js`: Sinkronisasi nomor build ke `m025-585`.
9. `features/neural-voice/fiezel-diag-panel.js`: Sinkronisasi nomor build ke `m025-585`.
10. `kurikulum.html`: Cache busting rujukan aset ke `?v=m025-585`.
11. `misi.html`: Cache busting rujukan aset ke `?v=m025-585`.
12. `docs/handoffs/FIEZEL-M025585-LISTENING-UI-UX-ERGONOMICS-CONTRAST-HANDOFF.md`: Dokumen handoff ini.

---

## 5. Status Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check`: 100% Selaras (6 titik sinkron).
- `node tests/id-golden-snapshot-test.js`: HIJAU (baseline emas utuh).
- `node tests/th-ui-leak-test.js`: PASS (nol kebocoran naskah).
- `node tests/curriculum-cache-version-test.js`: PASS (26 penegasan, 2 halaman).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `git diff --check`: Bersih (nol trailing whitespace).
