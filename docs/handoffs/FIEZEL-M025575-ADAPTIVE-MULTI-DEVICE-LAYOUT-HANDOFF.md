# FIEZEL-M025575 — Tata letak adaptif multi-device: rail tablet, sidebar desktop, isi multi-kolom (`m025-575`)

**Status:** siap review OWNER. Keputusan merge dan rilis tetap di tangan OWNER/MASTER.
Tidak ada teks baru yang dilihat murid, jadi i18n id/th tidak tersentuh.

## 1. Permintaan OWNER

> *"MULTI ADAPTIVE DEVICE UI NYA TIDAK BERFUNGSI"* (sesudah #605 di-merge)

## 2. Akar masalah

- #602 membawa tiga tingkat perangkat: dok bawah di HP, rail kiri di iPad tegak, dan sidebar
  kiri plus isi multi-kolom di iPad mendatar/desktop. Tetapi #602 juga mengunci
  `html/body/main.app/#app` setinggi `100dvh` dengan `overflow:hidden`. Akibatnya scroll mati
  dan kartu terjepit.
- Revert #603 ikut membuang tingkat perangkatnya.
- #605 hanya melebarkan kolom HP (720/760 px) dan memakai dok tab mengambang. Di iPad dan
  desktop tampilannya masih aplikasi HP yang diperbesar, jadi tidak ada yang beradaptasi.

## 3. Perubahan

Semua di `features/ui/fiezel-tactile-clay.css` §15.8, ditambah satu fungsi di `app.js`.

| Lebar | Navigasi | Isi |
|---|---|---|
| < 768 px (HP) | dok bawah, **tidak diubah** (dicek piksel per piksel identik di iPhone SE dan 15) | tidak diubah |
| 768–1023 px (iPad tegak, iPad mini) | **rail kiri 88 px**, ikon di atas label, di bawah topbar | kolom hingga 760 px |
| ≥ 1024 px (iPad mendatar, laptop, desktop) | **sidebar kiri 232 px**, baris ikon + label | kolom 900 px untuk layar teks |
| ≥ 1100 px | sidebar | **multi-kolom**: Hari ini 2 kolom (misi + KelasKu kiri, Latihan Singkat kanan), Latihan dan Perpustakaan 3 kolom, Progres statistik (menempel saat digulir) + tab/detail, Profil 2 kolom; kolom 1160 px |
| ≥ 768 px | | Game: arcade 3 kolom |

- Geometri diatur tiga variabel di `<body>`: `--fz-rail`, `--fz-col`, dan `--fz-gut`.
  `--fz-rail` bernilai 0 saat navigasi disembunyikan (kuis, pelajaran, sesi bicara/dengar,
  kartu hafalan), jadi kuis tetap layar penuh seperti sebelumnya.
- Mode guru dikecualikan, karena punya cangkang sendiri di `teacher-shell.css`.
- **Tanpa kunci tinggi**:
  - scroll tetap milik jendela;
  - tidak ada `100dvh`, `overflow:hidden`, atau `height:100%` pada section;
  - semua grid memakai `align-items:start`.
- Latar halaman disatukan ke `#FFF9EE` di ≥768 px. Sebelumnya `index.html` memaku body
  `#FBF7F3`, sehingga kolom isi tampak sebagai pita samar.
- `app.js` `syncNavActivePill()`: pil aktif bergerak 2D (`translate3d` + tinggi) saat
  navigasi vertikal (`flex-direction: column`). Di dok HP tetap `translateX`, dan `top`/`height`
  inline dikembalikan ke CSS. Listener `resize`/`orientationchange` yang sudah ada menyelaraskan
  ulang saat iPad diputar.

## 4. Bukti

- Chromium (Playwright) di 7 ukuran: 393, 768, 820, 1024, 1180, 1280, dan 1440. Di tiap ukuran
  diuji 13 layar: Hari ini, Latihan, Progres, Profil, Perpustakaan, Game, Grammar, Kosakata,
  Membaca, Menulis, KelasKu, Dengar, dan Kuis.
  - Luapan horizontal 0 di semua kombinasi.
  - Pil aktif tepat menutupi tombol aktif di semua kombinasi.
  - Screenshot ditinjau visual.
- Putar ukuran 1440 → 820 → 390 → 1180 → 1440: navigasi berganti sidebar → rail → dok →
  sidebar, dan pil ikut pindah.
- Scroll jendela di Progres desktop jalan: kartu statistik menempel, dan tepi topbar
  `.is-scrolled` muncul.
- HP: 11 dari 13 layar identik piksel. Selisih di Kuis dan Dengar hanya berasal dari soal
  acak.
- Layar masuk/onboarding (lapisan penuh) tidak terpengaruh.
- Gerbang `tests/multi-device-comfort-test.js` diperbarui menjadi 8 invarian, dengan bukti
  negatif:
  - E1 menjaga rail, sidebar, multi-kolom, dan rail 0 saat kuis;
  - E2 menjaga tidak ada 100dvh, overflow hidden, atau height 100%;
  - E3 menjaga pil 2D.

## 5. Langkah berikutnya

- Uji fisik OWNER di iPad (tegak dan mendatar) dan laptop.
- PWA terpasang baru memakai build ini sesudah prompt "pembaruan tersedia" disetujui, atau
  sesudah aplikasi ditutup penuh lalu dibuka lagi. SW sengaja tidak memanggil `skipWaiting`
  (lihat `sw.js`).
- Kandidat putaran berikutnya:
  - Menulis dibuat dua kolom (soal/rubrik + editor);
  - Grammar dibuat jalur dua kolom.
  Keduanya sengaja belum diubah, karena urutan baca jalurnya penting.
