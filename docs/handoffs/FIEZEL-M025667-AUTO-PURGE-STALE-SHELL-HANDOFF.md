# FIEZEL Handoff Dossier: m025-667 — Eliminasi Total Pembersihan Manual: Auto-Purge Shell Lama & Seamless Install Saat Klik Perbarui

## 1. Ringkasan Permintaan & Diagnosis Masalah
- **Permintaan Tegas Pengguna**:
  > *"INI FATAL, USER DI LUAR SANA TIDAK AKAN TAHU CARA INI DAN TIDAK MAU JUGA MELAKUKAN HAL YANG MEREPOTKAN SEPERTI INI, JADI CARA SIMPLE, BAGAIMANA CARANYA, AGAR SETIAP KALI USER KLIK TOMBOL PERBAHARUI, MAKA CACHE SHELL LAMA AKAN OTOMATIS TERHAPUS DAN TERINSTAL SHELL BARU"*
- **Akar Masalah Mengapa Cache Lama Tersangkut**:
  1. **Logika Cacat pada `purgeStaleCaches()` di `fiezel-update-prompt.js`**:
     - Sebelumnya terdapat baris `if (!target && APP_BUILD && name.indexOf(APP_BUILD) === -1) return Promise.resolve();`
     - Ketika update dipicu oleh Service Worker yang sedang menunggu tanpa parameter target eksplisit, baris tersebut justru mengabaikan dan mempertahankan cache shell lawas (`fiezel-shell-m025-665`, dll.) alih-alih menghapusnya!
  2. **Kondisi Balapan (*Race Condition*) Saat Menekan "Perbarui sekarang"**:
     - Kartu pembaruan sebelumnya langsung memanggil `show(null, remote)` seketika saat `coordination/BUILD-VERSION.json` terdeteksi lebih baru, padahal Service Worker baru masih dalam proses mengunduh 181 aset di latar belakang (`installing`).
     - Jika murid langsung menekan tombol "Perbarui sekarang", `reg.waiting` masih bernilai `null`. Akibatnya, sistem langsung memanggil `reloadIfApproved()` tanpa menunggu instalasi selesai, membatalkan unduhan shell baru, dan memuat ulang cangkang lawas kembali.
  3. **Absensi `self.clients.claim()` di `sw.js`**:
     - Saat `FIEZEL_SKIP_WAITING` diterima dan Service Worker baru aktif, `sw.js` tidak memanggil `self.clients.claim()`.
     - Ketiadaan `clients.claim()` membuat tab/jendela PWA yang sedang terbuka tidak otomatis dikendalikan oleh worker baru hingga navigasi berikutnya, sehingga event `controllerchange` sering tidak tertembak di peramban seluler.
  4. **Pembersihan Cache Tanpa Aktivasi di `app.js`**:
     - Fungsi `clearAppCache()` di `app.js` membersihkan cache tetapi tidak mengirimkan `FIEZEL_SKIP_WAITING` ke worker yang menunggu.

---

## 2. Solusi Rekayasa & Implementasi Perubahan

### A. Rekayasa Ulang `purgeStaleCaches()` & `apply()` di `features/ui/fiezel-update-prompt.js`
1. **Pembersihan Bersih Tanpa Ampun**:
   - Menghapus logika pengecualian yang cacat.
   - Jika target build baru diketahui, hanya cangkang build baru yang dipertahankan.
   - Bila target belum eksplisit, cangkang apa pun yang memiliki versi $\le$ build saat ini (`APP_BUILD`) **wajib dihapus secara total** via `caches.delete(name)`.
2. **Penanganan Alur 3 Cabang di `apply()`**:
   - **Cabang 1 (Worker Siap/Waiting)**: Langsung kirim `FIEZEL_SKIP_WAITING`, tunggu `controllerchange`, lalu muat ulang.
   - **Cabang 2 (Worker Sedang Mengunduh/Installing)**: Tampilkan status *"Membersihkan cache lama & memasang pembaruan... Mohon tunggu sebentar"*, pasang pendengar `statechange`. Begitu status berubah menjadi `installed`, kirim `FIEZEL_SKIP_WAITING` seketika.
   - **Cabang 3 (Worker Belum Mulai)**: Panggil `reg.update()`, dengarkan `updatefound`, kawal hingga terpasang, lalu aktifkan.
3. **Umpan Balik Visual Jelas**:
   - Kartu tidak langsung disembunyikan (`hide()`), melainkan tombol berubah menjadi disabled dengan teks *"Memperbarui..."* dan deskripsi menginformasikan proses pembersihan sedang berlangsung.

### B. Aktivasi Seketika dengan `self.clients.claim()` di `sw.js`
- Menambahkan `self.clients.claim()` di dalam penanganan event `activate` di `sw.js`.
- Begitu worker baru aktif, seluruh tab dan jendela PWA langsung diklaim seketika, memicu `controllerchange` tanpa jeda.

### C. Sinkronisasi Penuh di `app.js` (`clearAppCache`)
- Menambahkan pengiriman `FIEZEL_SKIP_WAITING` ke `reg.waiting` dan `reg.installing` sebelum memuat ulang, memastikan pembersihan dari menu Pengaturan juga langsung mengaktifkan Service Worker terbaru.

### D. Auto-Purge Cache Guard di `call.html` & `features/voice-studio/call.html`
- Saat `controllerchange` tertembak di halaman studio suara, seluruh cangkang `fiezel-shell-*` dibersihkan dari `window.caches` sebelum `window.location.reload()`.

---

## 3. Hasil Pengujian Mutu Lokal (Quality Gate)

- `node tests/id-golden-snapshot-test.js` $\to$ **PASS** (baseline emas utuh).
- `node tests/curriculum-cache-version-test.js` $\to$ **PASS** (33 assertions, build `m025-667`).
- `node tests/update-prompt-test.js` $\to$ **PASS** (13/13).
- `node tests/update-prompt-signal-test.js` $\to$ **PASS** (7/7).
- `node tests/settings-cache-test.js` $\to$ **PASS** (21/21).
- `node tests/gate-registry-test.js` $\to$ **PASS** (10 pass, 0 fail).
- `node tests/th-ui-leak-test.js` $\to$ **PASS** (0 kebocoran).
- `node tools/bump-build.mjs --check` $\to$ **Selaras** (`m025-667`).
