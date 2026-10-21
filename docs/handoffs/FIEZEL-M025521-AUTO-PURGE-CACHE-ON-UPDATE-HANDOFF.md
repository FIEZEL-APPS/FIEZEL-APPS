# Handoff Dossier: FIEZEL-M025521 (Pembersihan Cache Otomatis Saat Pembaruan PWA)

## 1. Ringkasan Kebutuhan & Perubahan
- **Permintaan User**: "aku ingin, setiap kali muncul popup pemberitahuan update, saat user klik pembaharuan, cache nya ikut di bersihkan ketika update baru".
- **Akar Masalah**: Sebelumnya, tombol "Perbarui sekarang" pada popup pembaruan (`#updateBannerApply` / `apply()`) hanya mengirim `FIEZEL_SKIP_WAITING` dan memuat ulang halaman tanpa membersihkan CacheStorage peramban (`window.caches`). Akibatnya, pada perangkat murid dengan PWA terpasang, cangkang shell versi lama (`fiezel-shell-*`) serta entri runtime cache non-neural (`fiezel-v*`) masih bisa tertinggal di peramban, menyebabkan tampilan baru tertunda atau memerlukan muat ulang ganda.
- **Solusi**:
  1. Menambahkan fungsi `purgeStaleCaches()` di `features/ui/fiezel-update-prompt.js`.
  2. Saat tombol pembaruan ditekan:
     - Menghapus seluruh cangkang lama `fiezel-shell-*` yang bukan cangkang rilis baru.
     - Membersihkan entri non-neural usang dari runtime cache `fiezel-v*`, sementara berkas model neural (`/vendor/`, ~152 MB) tetap dipertahankan agar kuota murid tidak terbuang.
     - Mengirimkan `FIEZEL_SKIP_WAITING` ke worker baru dan memuat ulang halaman secara bersih.
  3. Menambahkan verifikasi unit test di `tests/update-prompt-test.js`.
  4. Menaikkan build version ke `m025-521` melalui arbiter resmi `tools/bump-build.mjs`.

## 2. Berkas yang Diubah
- `features/ui/fiezel-update-prompt.js`: Implementasi `purgeStaleCaches()` dan integrasi ke dalam alur `apply()`.
- `tests/update-prompt-test.js`: Penambahan assertion pembersihan cache pada tombol pembaruan.
- `coordination/BUILD-VERSION.json`: Dinaikkan ke `m025-521`.
- `sw.js`: Dinaikkan ke `m025-521`.
- `core-config.js`: Dinaikkan ke `m025-521`.
- `features/neural-voice/fiezel-diag-panel.js`: Dinaikkan ke `m025-521`.
- `kurikulum.html`: Query version dinaikkan ke `m025-521`.
- `misi.html`: Query version dinaikkan ke `m025-521`.

## 3. Hasil Pengujian Lokal
- `node tests/update-prompt-test.js`: PASS (13/13)
- `node tests/update-prompt-signal-test.js`: PASS (7/7)
- `node tests/contrast-test.js`: PASS
- `node tests/gate-registry-test.js`: PASS (10/10)
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tools/bump-build.mjs --check`: Selaras (m025-521)
