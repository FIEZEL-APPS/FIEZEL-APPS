# FIEZEL Handoff Dossier: m025-666 — PWA Auto-Updater Guard & Cache Purge Arbiter

## 1. Ringkasan Temuan & Diagnosis Masalah
- **Temuan Pengguna**:
  > *"SEPERTINYA AKU SUDAH TAU PENYEBAB BUG DAN LAIN SEBAGAINYA, YAITU UI DAN UX LAMA MASIH TERSANGKUT DI PWA FIEZEL, DAN MENIMPA UI DAN UX BARU"*
- **Akar Masalah Teknis**:
  1. **Siklus Hidup Service Worker (PWA Waiting State)**:
     - Sesuai desain awal di `sw.js` (baris 240), Service Worker FIEZEL sengaja tidak memanggil `self.skipWaiting()` secara otomatis saat install untuk mencegah terputusnya sesi belajar murid di tengah kuis.
     - Akibatnya, ketika build baru (`m025-665` / `m025-666`) dirilis, service worker baru masuk ke status `waiting` (menunggu) dan **TIDAK PERNAH** mengambil alih kendali (`active`) sampai seluruh tab, jendela peramban, dan proses latar belakang PWA ditutup secara total oleh sistem operasi perangkat.
     - Di ponsel Android (Chrome PWA WebClip / TWA), proses background sering tetap aktif di RAM, sehingga berkas lama `features/voice-studio/dist/voice-studio.js` yang tersimpan di cache `fiezel-shell-*` terus disajikan ke pengguna.
  2. **Interferensi Elemen DOM Lawas (`#fzcCallOverlay`)**:
     - Di `features/interactive-chat/fiezel-voice-call.js`, elemen `#fzcCallOverlay` memiliki `position: fixed; inset: 0; z-index: 99999;`.
     - Jika panggilan sebelumnya pernah dibuka dari chat biasa, elemen overlay hitam pekat ini dapat tertinggal di `document.body` dan menutupi kanvas/layar panggilan baru di `call.html`.
  3. **Absensi Update Guard di `call.html`**:
     - Halaman `call.html` sebelumnya adalah dokumen HTML mandiri yang tidak mendaftarkan pemantau status Service Worker (`navigator.serviceWorker.oncontrollerchange` / `updatefound`).

---

## 2. Solusi Rekayasa & Implementasi Perubahan

### A. PWA Auto-Updater Guard di `call.html` & `features/voice-studio/call.html`
Menambahkan skrip inline guard sebelum memuat `dist/voice-studio.js`:
- Mendeteksi `navigator.serviceWorker`.
- Secara proaktif memanggil `reg.update()`.
- Bila ditemukan Service Worker dalam status `waiting` atau `installing`, sistem langsung mengirim sinyal `{ type: 'FIEZEL_SKIP_WAITING' }`.
- Menangkap event `controllerchange` dan secara otomatis me-refresh halaman (`window.location.reload()`) saat Service Worker baru telah aktif.

### B. Pembersihan DOM Total di `features/interactive-chat/fiezel-interactive-chat.js`
Saat `interactiveChatView()` dimuat:
- Menghapus paksa elemen `#fzcCallOverlay` dari DOM (`overlay.remove()`).
- Menghentikan instansi panggilan lawas `root.FiezelVoiceCall.stop()` untuk memastikan tidak ada audio atau overlay hantu yang berjalan di latar belakang.

### C. Tombol Pembersih Cache Mandiri di Header Voice Studio (`App.tsx`)
Di bilah atas (Header) Voice Studio:
- Menambahkan lencana versi build `m025-666` dengan tombol ikon `RefreshCw`.
- Fungsi `handleForceFlushPwaCache`:
  1. Menghapus seluruh cache storage lokal yang berawalan `fiezel-shell-` via `caches.delete(name)`.
  2. Mengirim pesan `FIEZEL_SKIP_WAITING` ke seluruh Service Worker (`waiting`, `active`, `controller`).
  3. Melakukan `window.location.reload(true)` sehingga aset JavaScript dan CSS paling mutakhir langsung diunduh dari jaringan.

---

## 3. Hasil Pengujian Mutu Lokal (Quality Gate)

1. **Hexa-Sync Synchronization**:
   - `node tools/bump-build.mjs --check` $\to$ **Selaras** (6 titik selaras di `m025-666`).
2. **Baseline Emas Indonesia**:
   - `node tests/id-golden-snapshot-test.js` $\to$ **HIJAU** (20 checks pass, zero leakage).
3. **Curriculum Cache Version**:
   - `node tests/curriculum-cache-version-test.js` $\to$ **OK** (33 assertions, 3 pages, build `m025-666`).
4. **Gate Registry**:
   - `node tests/gate-registry-test.js` $\to$ **PASS** (10 pass, 0 fail).
5. **Vite Production Bundle**:
   - `dist/voice-studio.js` (918.24 kB)
   - `dist/voice-studio.css` (43.37 kB)
   - Dibuat bersih tanpa error sintaksis.

---

## 4. Panduan Pembaruan bagi Murid & Pengguna

Jika aplikasi masih menampilkan tampilan lawas di perangkat:
1. **Cara Tercepat**: Di dalam Voice Studio (`/app/call.html`), klik tombol lencana versi **`m025-666`** di pojok kanan atas. Aplikasi akan otomatis membersihkan cache PWA dan memuat ulang versi terbaru seketika.
2. **Di Chrome / PWA Android**: Buka Menu titik tiga $\to$ Setelan $\to$ Setelan Situs $\to$ Semua situs $\to$ cari `fiezel.my.id` $\to$ pilih **Hapus data & setel ulang**.
3. **Di Komputer / Laptop**: Tekan `Ctrl + Shift + R` (Windows) atau `Cmd + Shift + R` (Mac) untuk melakukan *hard refresh*.
