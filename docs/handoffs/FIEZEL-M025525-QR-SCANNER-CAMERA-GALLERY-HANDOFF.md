# FIEZEL HANDOFF DOSSIER: BUILD M025-525
**Fitur: Pemindai Kamera Kode QR Langsung & Unggah Gambar dari Galeri untuk Sistem Pertemanan**
**Tanggal**: 9 Oktober 2026
**Status**: SIAP RILIS / PRODUKSI

---

## 1. Ringkasan & Alasan Perubahan
1. **Latar Belakang**:
   - Sebelumnya, tombol "Scan & QR" di kartu profil hanya membuka modal pasif yang menampilkan kode QR pribadi pengguna tanpa adanya fungsi pemindai kamera aktif.
   - Murid tidak dapat memindai kode QR teman langsung dari layar ponsel, maupun memindai kode QR teman dari file tangkapan layar/foto galeri ponsel saat teman tidak sedang berada di lokasi fisik yang sama.
2. **Solusi yang Diimplementasikan**:
   - **Pemindai Kamera Langsung**:
     - Menggunakan `navigator.mediaDevices.getUserMedia` dengan `facingMode: { ideal: 'environment' }` untuk mengakses kamera belakang secara optimal di perangkat seluler.
     - Viewfinder responsif dengan reticle bidik, 4 bracket sudut aksen emas `#FFC800`, dan garis laser pemindai teranimasi (`fzQrScanLaser`).
     - Loop pemindaian 60 FPS menggunakan dekoder murni `jsQR` via canvas offscreen berkecepatan tinggi.
   - **Unggah Gambar dari Galeri**:
     - Tombol taktil "Pilih dari Galeri" di dalam tampilan pemindai kamera yang memicu `<input type="file" accept="image/*">`.
     - File gambar dibaca melalui `FileReader` -> `Image` -> canvas `2d` -> `jsQR` dengan mode `attemptBoth` (inversi kontras).
     - Menghubungkan secara otomatis ke lembar konfirmasi pertemanan (`socialFriendLinkSheet`) begitu QR berhasil didekode.
   - **Manajemen Siklus Hidup Kamera Tanpa Kebocoran (Zero-Loss Lifecycle)**:
     - Kamera langsung dihentikan (`stream.getTracks().forEach(t => t.stop())`) seketika pengguna menutup modal, menekan Tutup, menekan tombol kembali peramban/HP, maupun beralih tab di dalam modal.
   - **Pencegahan Kasus Sudut (Edge Cases Guarded)**:
     - Jika pengguna memindai kode QR miliknya sendiri: menampilkan toast ramah *"Ini adalah kode QR profil kamu sendiri."*
     - Jika kode QR bukan tautan pertemanan FIEZEL: menampilkan toast *"Kode QR ini bukan tautan profil atau ID teman FIEZEL."*
     - Jika gambar galeri tidak memuat QR: menampilkan toast *"Kode QR tidak ditemukan pada gambar ini. Pastikan gambar jelas."*
     - Jika kamera ditolak atau tidak tersedia: antarmuka fallback menampilkan pesan informatif tanpa macet, dan tombol galeri tetap dapat digunakan 100%.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)
Skrip probe Playwright: `tools/dev/verify-qr-scanner-flow-probe.mjs`
- **Hasil Eksekusi**:
  ```
  ✓ Profile view loaded
  ✓ Clicked Scan & QR button
  ✓ Scanner viewport box (#fzQrScannerBox) is visible
  ✓ "Pilih dari Galeri" button is visible
  ✓ Segmented nav tabs (Pindai QR, ID & QR) are visible
  ✓ Scanner screenshot saved to: reports/qr_scanner_camera_view.png
  ✓ Synthesized test QR code for @siti_nurhaliza
  ✓ Friend modal opened with title: Tambahkan @siti_nurhaliza sebagai teman?
  ✓ Successfully decoded QR code from gallery and opened friend request confirmation!
  ✓ Friend confirmation screenshot saved to: reports/qr_scanned_friend_confirm.png
  ✓ openQrScanner() verified directly
  ✓ Switched to "ID & QR" tab successfully
  ✓ Switched back to "Pindai QR" tab successfully

  ==========================================
  EMPIRICAL AUDIT VERIFIED: ALL PROBES PASSED 100%
  ==========================================
  ```
- **Tangkapan Layar Bukti**:
  - `01_qr_scanner_camera_view.png`: Menampilkan modal pemindai kamera dengan reticle sudut emas, laser pemindaian aktif, 4 tab tersegmentasi, dan tombol "Pilih dari Galeri".
  - `02_qr_scanned_friend_confirm.png`: Menampilkan lembar konfirmasi pertemanan untuk `@siti_nurhaliza` setelah berhasil memindai QR code via galeri.

---

## 3. Berkas yang Diubah / Ditambahkan
1. `features/social/jsqr.js`: Bundel UMD pustaka dekoder QR murni cross-platform (Apache-2.0, zero dependencies).
2. `index.html`: Memuat `features/social/jsqr.js` dengan atribut `defer`.
3. `sw.js`: Mendaftarkan `'./features/social/jsqr.js'` ke dalam daftar precache `ASSETS`, menaikkan build `SW_REV` ke `m025-525`.
4. `core-config.js` & `features/neural-voice/fiezel-diag-panel.js` & `kurikulum.html` & `misi.html` & `coordination/BUILD-VERSION.json`: Selaras hexa-sync di `m025-525`.
5. `app.js`:
   - Implementasi siklus hidup scanner: `startQrVideoScan`, `tickQrScan`, `stopQrScanner`, `parseFriendHandleFromQr`, `handleScannedQrResult`, `handleQrFilePicked`.
   - Pembaruan `openFriendConnectModal` dengan 4 tab: `scan` (Pindai QR), `my-qr` (ID & QR), `invite` (Tambah ID), `requests` (Terima).
   - Penghentian kamera otomatis di `closeModalNow()`.
   - Pembaruan tombol profil "Scan & QR" untuk membuka tab pemindai.
6. `style.css`: Kelas gaya pemindai `.fz-qr-scanner-box`, `.fz-qr-video`, `.fz-qr-reticle`, `.fz-qr-corner`, `.fz-qr-laser`, dan `@keyframes fzQrScanLaser`.
7. `features/i18n/copy-id-friend.js` & `features/i18n/copy-th-friend.js`: Penambahan kunci salinan `social3.scan-*` (terverifikasi bebas tanda hubung dan lulus uji kebocoran bahasa).
8. `id-golden-baseline.json`: Diperbarui via `--write-baseline` untuk memasukkan kunci teks resmi baru.
9. `package.json`: Penambahan `jsqr`.

---

## 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (3966 kunci selaras th)**
- `node tests/i18n-kunci-hantu-test.js`: **PASS (5014 kunci id terdaftar, 2 utang tercatat)**
- `node tests/lucide-icon-coverage-test.js`: **PASS (125 subset glyph, 90 dipakai)**
- `node tests/precache-covers-shell-test.js`: **PASS (5/5 assert)**
- `node tests/pwa-cache-test.js`: **PASS (pass: true)**
- `node tests/curriculum-cache-version-test.js`: **PASS (build m025-525)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras)**
