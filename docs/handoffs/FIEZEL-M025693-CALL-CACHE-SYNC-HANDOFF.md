# FIEZEL-M025693 — Sinkronisasi Cache Version Query call.html & voice-studio (`m025-693`)

**Status:** Siap review OWNER & Merge via Pull Request.
**Build:** `m025-693` (Hexa-Sync Selaras di semua titik rilis).

---

## 1. Ringkasan Akar Masalah
Setelah PR #753 digabungkan, alur CI mendeteksi kegagalan pada gerbang:
`tests/curriculum-cache-version-test.js`

**Penyebab Utama:**
Pada saat bot CI auto-healing melakukan sinkronisasi build sebelumnya, berkas yang dinaikkan versinya hanya mencakup `kurikulum.html` dan `misi.html`, sementara `call.html` dan `features/voice-studio/call.html` (yang baru ditambahkan ke dalam proteksi cache-busting peramban) masih tertinggal di `m025-691`. Perbedaan ini menyebabkan gerbang anti-cache lama mendeteksi ketidakselarasan dengan `FIEZEL_PAGE_BUILD` (`m025-692`).

---

## 2. Tindakan Perbaikan
1. **Penaikan Build Resmi via Arbiter**:
   - Menjalankan `node tools/bump-build.mjs "fix(build): align call.html query params with m025-693 to pass cache version gate"`
   - Seluruh 4 berkas halaman berversi dinaikkan secara atomik ke `m025-693`:
     - `kurikulum.html`
     - `misi.html`
     - `call.html`
     - `features/voice-studio/call.html`
   - Sinkronisasi selaras di `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, dan `coordination/BUILD-VERSION.json`.
2. **Sinkronisasi Shell Aset Android**:
   - Menjalankan `node tools/sync-android-assets.mjs` (787 files, 67.00 MB, bundle integrity certified 100% PASS).

---

## 3. Hasil Pengujian Mutu Lokal
- `node tests/curriculum-cache-version-test.js`: **PASS (33 assertions, 3 halaman, build m025-693)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras)**
- `node tests/id-golden-snapshot-test.js`: **PASS (100% HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
