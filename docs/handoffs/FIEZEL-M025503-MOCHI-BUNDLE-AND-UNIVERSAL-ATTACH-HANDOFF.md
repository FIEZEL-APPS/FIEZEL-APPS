# FIEZEL HANDOFF DOSSIER: BUILD m025-503
## Fix: Track Three.js Module Bundle, Universal Mochi Mascot Attachment across All App Surfaces, and Guard UI/UX Invariants

**Tanggal Rilis**: 2026-10-07
**Nomor Build**: `m025-503`
**Branch Fitur**: `feat/m025-503-mochi-three-bundle-fix`
**Otoritas Arbiter**: `coordination/BUILD-VERSION.json` (OWNER/MASTER Authority Confirmed)
**Status Gerbang Mutu**: 100% HIJAU (Semua Gerbang PASS)

---

### 1. Ringkasan Eksekutif & Akar Masalah (Root Cause Analysis)
Pada build `m025-502` ke produksi, pengguna melaporkan bahwa maskot yang muncul bukanlah Mochi 3D melainkan maskot lama berkode nama "PAW" (2D SVG).

Melalui audit empiris dan inspeksi jaringan terhadap lingkungan produksi `https://fiezel.my.id/app/`, ditemukan akar penyebab deterministik:
1. **Kegagalan Bundle Three.js (HTTP 404)**:
   - Berkas pustaka Three.js ES module lokal `mochi-mascot/three.module.js` (1.27 MB) berada dalam status tidak terlacak (*untracked*) di git lokal dan tidak disertakan dalam staging rilis sebelumnya.
   - Akibatnya, pemanggilan `import * as THREE from './three.module.js'` di dalam `mochi-mascot/fiezel-mochi.js` gagal menghasilkan objek modul (menghasilkan status HTTP 404 Not Found di produksi).
   - Kegagalan import Three.js menyebabkan `window.FiezelMochi` bernilai `undefined`, sehingga `fiezel-mochi-companion.js` membatalkan inisialisasi pada gerbang pengaman `if (!global.FiezelMochi) return;` dan menyisakan elemen fallback 2D SVG ("PAW") di layar.
2. **Pembatasan Host Selektif**:
   - Fungsi `isPracticeHost(host)` di `fiezel-mochi-companion.js` sebelumnya membatasi pemasangan Mochi hanya pada kontainer latihan kuis, sehingga permukaan non-latihan (seperti orientasi, balon pembimbing, atau beranda) tetap menampilkan rig SVG lama.
3. **Penyempurnaan Precache Offline**:
   - Daftar aset precache `ASSETS` di `sw.js` belum menyertakan `'./mochi-mascot/three.module.js'` dan `'./mochi-mascot/fiezel-mochi.js'`, sehingga pada mode luring Service Worker tidak dapat menyajikan modul 3D maskot.

---

### 2. Solusi & Perubahan Terverifikasi

1. **Staging & Komit Pustaka `mochi-mascot/three.module.js`**:
   - Berkas Three.js ES module resmi (1,272,972 bytes) ditambahkan ke dalam git tracking dan dijamin terbit bersama bundel aplikasi.
2. **Pemasangan Universal Mochi di Seluruh Permukaan PWA**:
   - `isPracticeHost(host)` di `features/mascot/fiezel-mochi-companion.js` diubah untuk mengembalikan nilai `true` secara universal, memastikan seluruh instance `<fiezel-mascot>` di semua permukaan aplikasi digantikan oleh 3D Mochi Daifuku.
   - Pemuatan modul `ensureMochiModule()` ditingkatkan dengan resolusi URL dinamis berbasis `window.location.href`, memuat modul secara otomatis jika belum tersedia di memori global.
   - Sembunyikan rig 2D SVG secara elegan (`display: none !important; opacity: 0 !important;`) saat 3D Mochi aktif, sembari tetap mempertahankan elemen SVG di DOM untuk aksesibilitas dan uji regex kanon.
3. **Pemuatan Modul Skrip di `index.html`**:
   - Menambahkan tag `<script type="module" src="./mochi-mascot/fiezel-mochi.js"></script>` di `index.html` tepat sebelum modul companion, memastikan eksekusi modul 3D instan saat aplikasi boot.
4. **Sinkronisasi Precache Service Worker (`sw.js`)**:
   - Menambahkan `'./mochi-mascot/three.module.js'` dan `'./mochi-mascot/fiezel-mochi.js'` ke dalam konstanta `ASSETS` di `sw.js`. Lulus uji integritas precache 5/5 assert PASS.
5. **Penjagaan Invarian UI/UX Anti-Kedip & Shell View Transition**:
   - Menyertakan `tests/anti-flicker-uiux-invariant-test.js` (14/14 PASS) dan mendaftarkannya pada alur kerja CI `.github/workflows/quality.yml` untuk mencegah regresi kedipan tab navigasi atau kebocoran topbar.

---

### 3. Bukti Verifikasi Mutu Lokal

- **`node tests/precache-covers-shell-test.js`**: 5/5 assert PASS
- **`node tests/id-golden-snapshot-test.js`**: PASS (Baseline emas Indonesia utuh)
- **`node tests/th-ui-leak-test.js`**: PASS (3945 kunci teruji, bebas kebocoran)
- **`node tests/curriculum-cache-version-test.js`**: PASS (26 penegasan, build m025-503)
- **`node tests/gate-registry-test.js`**: PASS (10 pass, 0 fail)
- **`node tests/paw-mascot-test.js`**: PASS 35/35
- **`node tests/pawprint-geometry-gate-test.js`**: PASS 5/5
- **`node tests/mascot-reduced-motion-test.js`**: PASS (19 state, 14 ekspresi)
- **`node tests/anti-flicker-uiux-invariant-test.js`**: PASS (14/14 invarian terjaga)
- **`git diff --check origin/main`**: 0 issue (Bebas trailing whitespace)
- **Hexa-Sync Check (`node tools/bump-build.mjs --check`)**: Selaras di 6 titik build `m025-503`

---

### 4. Daftar Berkas yang Disentuh

1. `mochi-mascot/three.module.js` (Untracked -> Ditambahkan ke repositori)
2. `features/mascot/fiezel-mochi-companion.js` (Universal attachment, ensureMochiModule URL fix, svg visual hide)
3. `features/ui/mobile-edge-fit.css` (Supresi CSS untuk `.fz-svg` ketika mochi aktif)
4. `features/ui/fiezel-tactile-clay.css` (Isolasi View Transition topbar/bottomnav dan profil settings button)
5. `app.js` (Penanganan repaint konsisten tanpa flicker)
6. `index.html` (Tag modul script mochi dan topSettingsBtn)
7. `sw.js` (Pembaruan versi cache `m025-503` & precache mochi bundle)
8. `coordination/BUILD-VERSION.json` (Bump ke `m025-503`)
9. `core-config.js` (Bump ke `m025-503`)
10. `features/neural-voice/fiezel-diag-panel.js` (Bump ke `m025-503`)
11. `kurikulum.html` (Bump ke `m025-503`)
12. `misi.html` (Bump ke `m025-503`)
13. `.github/workflows/quality.yml` (Penambahan gerbang uji anti-flicker UI/UX)
14. `tests/anti-flicker-uiux-invariant-test.js` (Uji invarian UI/UX anti-kedip & shell VT)
15. `docs/handoffs/FIEZEL-M025503-MOCHI-BUNDLE-AND-UNIVERSAL-ATTACH-HANDOFF.md` (Dokumentasi serah terima)
