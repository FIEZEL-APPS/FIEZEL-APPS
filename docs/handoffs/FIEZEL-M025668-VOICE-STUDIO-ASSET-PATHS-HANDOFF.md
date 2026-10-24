# FIEZEL Handoff Dossier: m025-668 — Perbaikan Path Relatif Aset Font & SVG Voice Studio

## 1. Ringkasan Temuan
- **Temuan Hasil Audit Probe Playwright**:
  Pada inspeksi peramban langsung di `https://fiezel.my.id/app/call.html`, ditemukan 8 permintaan berkas font (`PlusJakartaSans-*.woff2`, `NotoSansThaiLooped-*.woff2`) dan SVG (`paw-mochi-idle.svg`) mengembalikan status HTTP 404 karena diminta ke root domain (`https://fiezel.my.id/assets/...`) alih-alih sub-path aplikasi (`/app/...`).
- **Akar Masalah**:
  1. Konfigurasi `vite.voice-studio.config.ts` tidak memiliki opsi `base: './'`, sehingga Vite secara default mengompilasi URL aset di berkas CSS dengan path absolut root (`/assets/...`).
  2. Di `features/voice-studio/src/App.tsx`, rujukan `paw-mochi-idle.svg` menggunakan awalan garis miring `/assets/brand/paw-mochi-idle.svg`.

---

## 2. Solusi Rekayasa
1. **`vite.voice-studio.config.ts`**:
   - Menambahkan `base: './'` sehingga seluruh URL font di `dist/voice-studio.css` berubah menjadi path relatif `./assets/...`.
2. **`features/voice-studio/src/App.tsx`**:
   - Mengubah rujukan ikon SVG menjadi `./assets/brand/paw-mochi-idle.svg` dan `./assets/brand/paw-mochi-speaking.svg`.
3. **Rebuild & Golden Snapshot**:
   - Menjalankan Vite production build ulang (bebas error).
   - Memperbarui baseline snapshot literal emas `id-golden-baseline.json`.
4. **Hexa-Sync**:
   - Dinaikkan ke build `m025-668` melalui arbiter resmi `tools/bump-build.mjs`.

---

## 3. Hasil Pengujian Lokal
- `node tests/id-golden-snapshot-test.js` $\to$ **PASS**.
- `node tests/curriculum-cache-version-test.js` $\to$ **PASS** (`m025-668`).
- `node tests/update-prompt-test.js` $\to$ **PASS** (13/13).
- `node tests/pwa-cache-test.js` $\to$ **PASS** (eagerActivationDisabled = true, pass = true).
- `node tests/gate-registry-test.js` $\to$ **PASS** (10/10).
- `node tools/bump-build.mjs --check` $\to$ **Selaras** (`m025-668`).
