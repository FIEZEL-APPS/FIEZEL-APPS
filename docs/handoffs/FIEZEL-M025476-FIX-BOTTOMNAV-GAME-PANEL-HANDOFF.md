# FIEZEL Handoff Dossier: m025-476
**Fix UI Catastrophe: 6-Column Floating Bottom Navigation Bar & Self-Contained Game Hub Poster Cards**

## 1. Ringkasan Temuan Audit & Akar Masalah
- **Latar Belakang Masalah (Visual Catastrophe):**
  Pada uji layar mobile (khususnya Safari iOS di perangkat iPhone murid), ditemukan tampilan hancur total:
  1. Bottom navigation bar terbungkus menjadi 2 baris (5 tab di baris pertama, tab ke-6 "Profil" terlempar ke baris kedua), meregang 100% lebar tanpa bentuk pil terapung (*floating dock*).
  2. Panel Game (Arcade & PAW Arena) tampil tanpa gaya kartu sama sekali (*naked unstyled text*) di atas latar putih polos: teks "PAW ARENA", piala emas melayang tanpa latar, dan tombol aksi tanpa kontras maupun bayangan 3D.
- **Akar Masalah (Root Causes):**
  1. **Cache Miss Akibat Query Parameter di Service Worker (`sw.js` vs `index.html`):**
     `index.html` memuat stylesheet dengan query parameter `?v=clay-v2`, `?v=contrast-v25`, `?v=vivid-v2`, `?v=hunt-v2`. Namun di `sw.js`, daftar `ASSETS` menyimpannya sebagai path bersih tanpa query. Pengecekan `isShellRequest` membandingkan URL penuh (`href`), sehingga permintaan peramban dengan query parameter dianggap non-shell dan gagal dilayani dari cache offline/shell cache.
  2. **Pelanggaran Invarian Gaya Mandiri (*Self-Contained Stylesheet*):**
     Seluruh aturan kartu poster game (`.game-poster-card`, `.paw-poster-card`, `.bug-poster-card`, `.poster-action-btn`, `.game-hub-top-nav`, `.game-quick-badges`, `.game-arcade-card`, dll.) sebelumnya hanya ditulis di `features/ui/fiezel-tactile-clay.css`. Jika berkas tersebut gagal termuat atau tertunda, `style.css` sama sekali tidak memiliki cadangan gaya, menyebabkan halaman Game runtuh menjadi teks telanjang.
  3. **Konflik Penimpaan CSS Antar-Stylesheet:**
     - Di `style.css`, selector `.bottomnav` sebelumnya menggunakan pembatasan selektor spesifik (`body.fz-view-game`, `body.fz-lux`, dll.) yang dapat luput dalam mode standar.
     - Di `features/ui/fiezel-vivid.css`, terdapat aturan `border-top: 1.5px solid ...` dan `box-shadow` negatif yang menimpa batas pil terapung tactile clay.
     - Di `style.css`, aturan lawas `.nav.active::after` memunculkan kapsul oval kuning aneh di belakang ikon saat aktif.

## 2. Perubahan yang Dilakukan
1. **`style.css` (Self-Contained Game Hub & Bulletproof Bottomnav):**
   - Menambahkan aturan mandiri lengkap untuk seluruh komponen Game Hub ke dalam `style.css`:
     - `.game-hub-container`, `.game-hub-top-nav`, `.game-back-pill`, `.game-quick-badges`, `.game-badge-trophy`, `.game-badge-flame`, `.game-hub-header-titles`
     - `.game-poster-card`, `.poster-cyber-grid`, `.poster-kicker`, `.poster-live-tag`, `.poster-main-title`, `.poster-tagline`, `.poster-mode-pill`, `.poster-action-btn`, `.paw-action-btn`
     - `.bug-poster-card`, `.boss-hp-stack`, `.boss-hp-unit`, `.boss-hp-bar`, `.bug-raid-action-btn`
     - `.game-arcade-grid`, `.game-arcade-card` (.mochi-card, .puzzle-card, .voice-card, .nujum-card)
   - Memperkuat selektor `.bottomnav` menjadi universal: `html body nav.bottomnav, html body .bottomnav` dengan `display: grid !important; grid-template-columns: repeat(6, 1fr) !important; width: min(500px, calc(100% - 20px)) !important; border-radius: 24px !important; border: 2px solid #E2E8F0 !important; box-shadow: 0 6px 0 #CBD5E1, 0 16px 32px rgba(15, 23, 42, 0.08) !important; z-index: 1000 !important;`.
   - Mematikan pseudo-elemen bentrok: `html body nav.bottomnav .nav::after, html body .bottomnav .nav::after { display: none !important; }`.
   - Mengukuhkan status aktif tactile clay: `#FEF3C7` dengan bingkai `#F59E0B` dan bayangan 3D `#D97706` untuk tab umum, serta tema emerald (`#EAF5F1` + `#10B981`) untuk KelasKu.
2. **`sw.js` (Ketahanan Jalur Cache Shell):**
   - Mengubah `shellUrls` dan `isShellRequest` agar membandingkan `pathname` kanonikal, sehingga permintaan dengan query parameter tetap dikenali sebagai aset cangkang sah.
   - Menambahkan opsi `ignoreSearch: true` pada `caches.match(e.request, { cacheName: SHELL_CACHE, ignoreSearch: true })` agar aset cangkang selalu cocok byte-for-byte terlepas dari query string.
3. **`index.html`:**
   - Menyelaraskan seluruh tautan `<link rel="stylesheet">` (`mobile-edge-fit.css`, `fiezel-vivid.css`, `fiezel-nujum.css`, `fiezel-bug.css`, `fiezel-tactile-clay.css`) tanpa query parameter basi agar persis sesuai entri `ASSETS` di `sw.js`.
4. **`features/ui/fiezel-vivid.css`:**
   - Menetralkan penimpaan lawas `border-top` dan `box-shadow` pada `.bottomnav` agar tidak mengganggu bentuk pil terapung.

## 3. Bukti Verifikasi Empiris Playwright
- Dijalankan pengujian peramban headless Playwright (`tools/dev/inspect-safari-layout.mjs`) pada viewport iPhone 390x844:
  - Uji simulasi 404 pada berkas `fiezel-tactile-clay.css` membuktikan bahwa `style.css` kini mandiri 100% merender kartu poster PAW Arena, Boss Raid Bug Arena, dan 6 tab navigasi tanpa kerusakan layout.
  - Uji normal membuktikan layout 6 tab terapung berjarak seimbang (`repeat(6, 1fr)`), radius 24px, bevel border 2px solid, dan tombol aktif amber bersih.
  - Tangkapan layar visual tersimpan di `safari-game-layout-check.png` dan diverifikasi bersih.

## 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS (26 penegasan, 2 halaman, build m025-476)
- `node tests/gate-registry-test.js`: PASS (352 gerbang bukti, 10 pass, 0 fail)
- `node tests/ui-structure-test.js`: PASS (primaryNavigation: 5)
- `node tests/view-reachability-test.js`: PASS (63/63 lulus; 19 layar, 23 nama view)
- `node tools/bump-build.mjs --check`: SELARAS (6 titik selaras pada versi m025-476)
