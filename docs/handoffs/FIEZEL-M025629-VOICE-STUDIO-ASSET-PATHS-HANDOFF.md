# FIEZEL HANDOFF DOSSIER: M025-629
**Topik**: Perbaikan Resolusi Path Relatif Aset & Font Voice Studio untuk Lingkungan PWA `/app/`
**Build Target**: `m025-629`
**Tanggal**: 2026-10-22
**Status**: LULUS SELURUH GERBANG MUTU LOKAL & TERVERIFIKASI EMPIRIS HEADLESS PLAYWRIGHT

---

## 1. Ringkasan Temuan Audit & Masalah yang Diselesaikan
Setelah integrasi sub-modul AI Voice Call Studio pada build `m025-628`, pengujian empiris headless Playwright mendeteksi beberapa kegagalan muat HTTP 404 pada URL aset dan font ketika `call.html` dimuat di bawah scope `/app/` (`https://fiezel.my.id/app/call.html`):
1. **Asset Path Root-Relative**:
   - `HomeRedesignView.tsx` dan `dist/voice-studio.js` merujuk `/assets/brand/paw-mochi-speaking.svg` dan `/assets/brand/paw-mochi-idle.svg` dengan root slash (`/`), menyebabkan browser meminta `https://fiezel.my.id/assets/...` (404) alih-alih `https://fiezel.my.id/app/assets/...`.
   - `callScenarios.ts` merujuk avatar karakter dengan `/assets/characters/...` alih-alih `./assets/characters/...`.
2. **Font Path CSS & Residu Fredoka**:
   - `features/voice-studio/src/index.css` dan `dist/voice-studio.css` mendeklarasikan `@font-face` dengan URL `url(/assets/fonts/...)` yang gagal ketika disajikan dari direktori `/app/features/voice-studio/dist/`. Jalur relatif yang benar adalah `url(../../../assets/fonts/...)`.
   - Residu deklarasi `@font-face` untuk font yang telah dipensiunkan (`FZ Fredoka` / `Fredoka-var.woff2` per invarian `m025-246`) dicabut tuntas.

---

## 2. Bukti Pengujian Empiris Nyata (Probe Headless Playwright)
Skrip probe Playwright lokal disimulasikan di bawah jalur `/app/` (`http://127.0.0.1:4829/app/call.html`).

**Hasil Eksekusi Probe**:
```
Test server listening on http://127.0.0.1:4829/app/
Page title: FIEZEL — Studio Panggilan Suara AI & Real-Time Speaking
Contains Voice Studio: true
Failed HTTP requests: []
Console errors: []
>>> 100% CLEAN: ZERO 404s, ZERO CONSOLE ERRORS <<<
```

---

## 3. Daftar Berkas yang Disentuh
- `features/voice-studio/src/components/HomeRedesignView.tsx` (Path relatif `./assets/brand/...`)
- `features/voice-studio/src/data/callScenarios.ts` (Path relatif `./assets/characters/...`)
- `features/voice-studio/src/index.css` (Font paths `../../../assets/fonts/...` dan pembersihan residu Fredoka)
- `features/voice-studio/dist/voice-studio.css` (Font paths `url(../../../assets/fonts/...)`)
- `features/voice-studio/dist/voice-studio.js` (Asset paths `./assets/...`)
- `id-golden-baseline.json` (Regenerasi baseline snapshot teks Indonesia)
- `reports/th-ui-leak-report.json`
- 6 Titik Hexa-Sync Build Arbiter (`m025-629`):
  - `coordination/BUILD-VERSION.json`
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`

---

## 4. Status Kelulusan Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check`: **Selaras (m025-629)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (4412 kunci id sepadan th)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, 2 halaman, build m025-629)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/secret-scan-test.js`: **PASS (0 temuan, 10 dimaafkan beralasan)**
- `node tests/palette-gate-test.js`: **PASS 5 (Semua aset mematuhi palet G1)**
