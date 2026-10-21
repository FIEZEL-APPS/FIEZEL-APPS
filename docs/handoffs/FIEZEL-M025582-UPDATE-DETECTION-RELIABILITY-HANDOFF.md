# FIEZEL HANDOFF DOSSIER: KEANDALAN DETEKSI PEMBARUAN PWA & CELEBRATION POST-UPDATE (m025-582)

## 1. Ringkasan Masalah & Temuan Audit Empiris
Pengguna melaporkan: *"di pwa user tidak muncul popup pembaharuan seperti biasa"*.
Berdasarkan audit teknis dan penelusuran probe Playwright headless Chromium, ditemukan 4 titik penyebab sistemik:

1. **Silent Update Disorientation (Tanpa Konfirmasi Visual Saat Versi Sudah Baru)**:
   Saat aplikasi dibuka setelah rilis atau dimuat ulang oleh browser, dokumen `core-config.js` langsung menyajikan build terbaru (`m025-581`). Pembanding versi melihat `localBuild === remoteBuild`, sehingga popup pembaruan sengaja tidak dimunculkan (anti-spam). Namun karena tidak ada notifikasi konfirmasi bahwa aplikasi *sudah berhasil diperbarui*, pengguna mengira sistem pembaruan macet atau tidak berjalan.
2. **Boot Registration Race Condition**:
   `fiezel-boot-tail.js` mendaftarkan `sw.js` secara asinkron. Di `fiezel-update-prompt.js`, pemanggilan `navigator.serviceWorker.getRegistration()` pada inisialisasi awal terkadang mengembalikan `null` jika pendaftaran belum tuntas, menyebabkan pengecekan awal langsung batal dan tertunda hingga interval 60 detik.
3. **Premature Reload Before Precache Complete**:
   Pada saat `reg.update()` berjalan, Service Worker mengunduh 294 aset shell di latar belakang. Jika popup pembaruan dipicu saat worker masih dalam status `installing` dan pengguna menekan "Perbarui sekarang", pemanggilan `location.reload()` mendahului selesainya unduhan aset, membatalkan aktivasi worker baru dan menyembunyikan popup di sesi reload berikutnya.
4. **Visibilitas Build di Pengaturan (Settings)**:
   Tombol "Cek Pembaruan" tidak menampilkan nomor build aktif saat ini secara langsung, sehingga pengguna tidak dapat memastikan apakah aplikasinya sudah mutakhir atau belum.

---

## 2. Solusi & Perbaikan yang Diterapkan

1. **Konfirmasi Post-Update Otomatis (`checkPostUpdateCelebration`)**:
   - Ditambahkan pelacak `localStorage['fiezel-last-seen-build-v1']` di `app.js`.
   - Jika terdeteksi peningkatan nomor build (`curBuild > lastSeenBuild`), sistem secara otomatis menampilkan toast ramah bersuara:
     *"FIEZEL berhasil diperbarui ke build m025-XXX! Selamat belajar."* (didukung i18n ID & TH).
   - Pengguna mendapatkan kepastian 100% setiap kali aplikasi berpindah ke versi baru.
2. **Penyelarasan Ekor Boot & Staggered Update Check**:
   - `features/ui/fiezel-boot-tail.js` kini langsung memanggil `FiezelUpdatePrompt.check(true)` begitu pendaftaran Service Worker sukses, dan memicu pengecekan ulang setelah `reg.update()` (2000ms).
   - `features/ui/fiezel-update-prompt.js` menambahkan pengecekan bertahap pasca-boot pada $t = 2.5\text{s}, 8\text{s}, 20\text{s}$, dan periodic 60s, menangkap transisi worker dari `installing` ke `installed` tanpa jeda lama.
3. **Penyelesaian Unduhan Aman Sebelum Reload**:
   - Fungsi `apply()` di `fiezel-update-prompt.js` kini memeriksa ketersediaan `reg.waiting` atau `reg.installing` sebelum memuat ulang halaman, memastikan pesan `FIEZEL_SKIP_WAITING` terkirim dan aset selesai diunduh.
   - Fungsi `show()` mengembalikan `true` bila kartu sudah tampil, sehingga `check(true)` secara akurat melaporkan bahwa pembaruan sedang aktif.
4. **Indikator Build Aktif di Pengaturan**:
   - Kartu cache di menu Pengaturan kini menampilkan teks jelas: `Build aktif: m025-XXX`.
   - Tombol "Cek Pembaruan" memberikan umpan balik langsung dengan menyebut nomor build: *"Aplikasi sudah versi terbaru (m025-XXX)."*

---

## 3. Berkas yang Dimodifikasi
- `features/ui/fiezel-update-prompt.js` (resolveRegistration, staggered check, robust apply worker check)
- `features/ui/fiezel-boot-tail.js` (hook pendaftaran SW ke update-prompt check)
- `app.js` (checkPostUpdateCelebration, status build aktif & feedback toast di Pengaturan)
- `features/i18n/copy-id-app-b.js` & `features/i18n/copy-th-app-b.js` (kunci i18n `update.success-toast`)
- `id-golden-baseline.json` (regenerasi baseline emas resmi)
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` (Hexa-Sync Arbiter build `m025-582`)

---

## 4. Hasil Pengujian Empiris
- `tests/update-prompt-signal-test.js`: 7/7 PASS
- `tests/update-prompt-test.js`: 13/13 PASS
- `tests/sw-build-marker-freshness-test.js`: PASS
- `tools/dev/probe-update-card.js` (Playwright Chromium): PROBE PASS (Konteks perangkat lama memunculkan kartu pembaruan, konteks mutakhir senyap)
- `tests/id-golden-snapshot-test.js`: PASS
- `tests/th-ui-leak-test.js`: PASS
- `tests/curriculum-cache-version-test.js`: PASS
- `tests/gate-registry-test.js`: PASS
- `node tools/bump-build.mjs --check`: Selaras (m025-582)
