# FIEZEL Handoff Dossier — Build m025-530: Pengikatan FiezelLazy Dekoder QR & Paritas PWA Produksi

Otoritas: OWNER / CI Arbiter
Tanggal: 9 Oktober 2026
Branch: `fix/m025-530-qr-lazy-binding`
Target Merge: `main` via PR (sesuai Git Protection Rule)
Build Version: `m025-530` (Hexa-Sync Arbiter Verified, base `origin/main` @ m025-529 `d1bfd54c`)

---

## 1. Ringkasan Eksekutif & Temuan Empiris

Melalui verifikasi probe headless Playwright langsung ke lingkungan produksi live `https://fiezel.my.id/app/` (`tools/dev/live-prod-m025-529-verify-probe.mjs`), ditemukan anomali pada pemanggilan lazy loading dekoder jsQR:
1. Pustaka lazy-loader mengekspor objek global `target.FiezelLazy` pada cangkang dokumen.
2. Fungsi `ensureQrDecoderLoaded()` di `app.js` sebelumnya mengecek `window.FiezelLazyLoader` alih-alih `FiezelLazy`, sehingga pemanggilan on-demand `load('qr')` jatuh ke cabang `false` dan jsQR tidak terhidrasi.

### Solusi di Build m025-530:
- **`app.js`**: Menyelaraskan pembacaan pengikatan lazy loader menjadi `self.FiezelLazy || self.FiezelLazyLoader` (selaras dengan pemanggilan `FiezelLazy.load('voice')` dan `FiezelLazy.load('classroom')`).
- **`fiezel-lazy-loader.js`**: Menyediakan alias resmi `target.FiezelLazyLoader = api` di samping `target.FiezelLazy = api` untuk menjamin toleransi pemanggilan 100%.
- **`tests/qr-scanner-test.js`**: Menambahkan Test 8 untuk mengunci invarian pengikatan `FiezelLazy` pada `ensureQrDecoderLoaded()`.
- **Hexa-Sync Arbiter**: Mengangkat build ke `m025-530` di seluruh 6 titik wajib.

---

## 2. Bukti Pengujian Mutu Lokal

Seluruh gerbang mutu lokal lolos 100% HIJAU:
- `tests/qr-scanner-test.js`: 20/20 PASS.
- `tests/boot-order-test.js`: PASS.
- `tests/friend-system-contract-test.js`: 44/44 PASS.
- `tests/curriculum-cache-version-test.js`: 26 assertions PASS pada m025-530.
- `tests/gate-registry-test.js`: 10/10 PASS.
- `tests/id-golden-snapshot-test.js`: HIJAU.
- `tools/bump-build.mjs --check`: Selaras 6 titik pada m025-530.
