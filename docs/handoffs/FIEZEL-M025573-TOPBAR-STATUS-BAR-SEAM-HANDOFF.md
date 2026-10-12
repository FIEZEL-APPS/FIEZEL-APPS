# FIEZEL-M025573 — Topbar "terpotong": status bar sewarna topbar + tepi saat scroll (`m025-573`)

**Status:** siap review OWNER (PR #601). Tidak ada teks baru yang dilihat murid, jadi i18n id/th tidak tersentuh.
**Otoritas:** keputusan merge dan rilis tetap di tangan OWNER/MASTER.

## 1. Laporan OWNER

> *"KENAPA TAMPILAN UI PWA FIEZEL TAMPAK TERLIHAT TERPOTONG DI TOPBAR TIDAK SEPERTI APLIKASI GENERIK?"*

## 2. Akar masalah (terukur di Chromium 390 px, bukan dari membaca kode)

1. **Status bar ≠ topbar.** `updateCelestialClock()` di `app.js` menulis palet langit
   (`SCENE_STATIC_PALETTE.top = #F4EDE6`, karena `scenePhases` mati) ke `meta theme-color`.
   OS menggambar status bar PWA dengan warna itu, sedangkan topbar berwarna `#FDFAF3`
   (`fiezel-tactile-clay.css`, "m025-501 TOPBAR AUTHORITY"). Puncak layar jadi dua pita:
   status bar gelap di atas topbar terang, sehingga topbar tampak seperti potongan terpisah.
2. **Topbar tanpa tepi.** TOPBAR AUTHORITY memaksa `border-bottom:none; box-shadow:none`, dan
   latarnya nyaris sama dengan latar halaman. Saat di-scroll, kartu hilang di garis yang
   tidak terlihat, sehingga tampak terpotong.

Yang **tidak** bermasalah: jarak aman notch. Dengan inset 47 px, topbar memanjang menjadi
103 px dan konten ikut turun.

Konteks: `.topbar` punya sekitar 12 aturan `!important` di 5 berkas (style.css ×6,
mobile-edge-fit, vivid, tutor-v3, tactile-clay). Yang menang adalah tactile-clay karena
dimuat paling akhir. PR ini tidak membereskan tumpukan itu. Perubahan hanya ditambahkan
tepat di bawah blok yang menang.

## 2b. Lanjutan: status bar saat splash, layar masuk, dan tur

OWNER: *"KAMU TIDAK MEMPERBAIKI TOPBAR SAAT SPLASH ATAU BOOT PWA, KARENA MASIH TAMPAK SEPERTI TERPOTONG"*.

Rekaman boot di Chromium 393x852 (notch tiruan 59 px) menunjukkan status bar tetap krem
`#FDFAF3`, padahal yang tampil paling atas gelap: splash `#1B1418` (0–3,5 dtk), hero layar
masuk `#1B1418` (murid baru), dan peredup tur `rgba(10,5,8,.78)`. Pita krem memotong layar
gelap. Perbaikannya:

- `statusBarSurfaceColor()` mengkomposit warna latar tumpukan `elementsFromPoint` di puncak
  layar, ditambah peredup tur yang `pointer-events:none`. `syncStatusBarColor()` menulis hasil
  itu ke `meta theme-color` (dibatasi rAF).
- Fungsi itu dipanggil oleh observer dangkal pada anak `<body>` dan kelas `<html>`/`<body>`
  (splash, layar masuk, dan tur menempel di sana), juga oleh `load`, `resize`, dan jam celestial.
- Warna awal `index.html` dan `manifest.json` (`theme_color` serta `background_color`, yaitu
  splash OS Android) = `#1B1418`. Urutannya: splash OS gelap → splash halaman gelap → app krem,
  tanpa kedip krem→gelap.
- Bukti sesudah perbaikan: splash 150–3000 ms `#1B1418`; layar masuk `#1B1418`; tur `#3F3B3C`;
  app `#FDFAF3`/`#FFF9EE`, sesuai latar paling atas.

## 3. Perubahan

- `app.js`
  - `TOPBAR_THEME_COLOR = '#FDFAF3'` kini ditulis ke `theme-color`, bukan lagi palet langit.
  - `syncTopbarScrolled(source)` mengatur kelas `.is-scrolled` di `header.topbar`.
    Listener `scroll` dipasang di document dengan fase capture (pasif, dibatasi rAF),
    sehingga menangkap scroll jendela **maupun** panel dalam `#app`. Ini diperlukan
    agar tetap benar bila suatu saat ada cangkang yang menggulir `#app > section`, bukan jendela (seperti #602, yang sudah di-revert lewat #603).
  - Penggulir horizontal dan penggulir di luar `#app` diabaikan.
  - `renderInner()` mereset tepi saat pindah layar.
- `index.html` (`meta theme-color`) dan `manifest.json` (`theme_color`): `#FBF7F3` → `#FDFAF3`.
  `background_color` (splash) tetap.
- `features/ui/fiezel-tactile-clay.css`: `header.topbar.is-scrolled` mendapat garis 1 px dan
  bayangan lembut. Transisi 0,18 dtk hanya berlaku bila `prefers-reduced-motion: no-preference`.
- `tests/topbar-status-bar-seam-test.js` (baru, terdaftar di `quality.yml`) menjaga:
  - kesamaan warna `theme-color` di index.html, manifest, dan app.js dengan latar topbar;
  - bentuk listener;
  - perilaku `syncTopbarScrolled` di atas DOM tiruan (jendela, panel dalam, horizontal,
    luar `#app`);
  - bukti negatif untuk tiap jalur.
- `id-golden-baseline.json`: hash `manifest.json` diperbarui (hanya `theme_color`).
- Build `m025-573` lewat `node tools/bump-build.mjs` (main memakai `m025-570` #600, `m025-571` #602, `m025-572` revert #603). Ini juga menyentuh
  `features/neural-voice/fiezel-diag-panel.js` (`DIAG_BUILD`), itulah sebabnya handoff ini
  diwajibkan A13.

## 4. Bukti

| Tata letak | Hasil |
|---|---|
| Sekarang (jendela yang digulir) | Home, Progres, Grammar, Profil: tepi muncul setelah scroll, hilang setelah pindah layar |
| Cangkang 100dvh #602 sebelum di-revert (panel dalam) | `ol.lesson-path`, `#onlineRoot`, `#progressTabPane`, `.game-hub-container` di-scroll 400 px → `is-scrolled`; tercabut saat ke Home |
| `theme-color` di semua layar | `#FDFAF3` |
| Sesi kuis dan Listening/Speaking | Bar sendiri yang sudah bergaris bawah dan berlatar `#FDFAF3`, tidak diubah |

Suite `quality.yml` lokal semuanya hijau, kecuali `e2e-bridge-selftest`. Gerbang itu juga
merah 25/36 di `origin/main` yang bersih, karena Playwright tidak bisa di-import lewat ESM
di sandbox.

## 5. Langkah berikutnya

- Utang yang dicatat jujur, belum dikerjakan: merampingkan sekitar 12 aturan `.topbar`
  menjadi satu definisi. Selama itu belum dilakukan, warna topbar wajib diubah serempak di
  TOPBAR AUTHORITY, `TOPBAR_THEME_COLOR`, `index.html`, dan `manifest.json`. Gerbang seam
  akan merah bila salah satunya tertinggal.
- Uji fisik di HP Android dan iPhone, dengan PWA terpasang, oleh OWNER: pastikan status bar
  dan topbar tampil satu warna, dan bayangan muncul hanya setelah halaman di-scroll.
