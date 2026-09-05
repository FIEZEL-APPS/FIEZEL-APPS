# Handoff m025-199 — boot: `style.css` berhenti menahan cat pertama

**Kewenangan: OWNER.** Laporan langsung: *"saat boot memasukin splash sangat lama sekali
hingga akhirnya muncul splash."*

## Status

**SELESAI dan terkunci gerbang.** FCP **6472 ms → 1588 ms** pada profil yang sama.

## Bukan regresi — diukur, bukan diasumsikan

Hal pertama yang diperiksa: apakah ini akibat m025-196/197/198? **Bukan.**

| checkout | FCP (Slow 4G, CPU 4x) |
|---|---|
| `d7fe7be` m025-195 — sebelum seluruh gelombang perubahan hari itu | 6472 ms |
| `2377fe5` m025-198 — sesudahnya | 6400 ms |

Selisihnya nol yang berarti. Ini biaya struktural lama yang baru terlihat.

## Penyebabnya satu berkas, dan dua hipotesis lain terbantah

Diuji dengan menulis ulang `index.html` di udara lewat route interception — repo tidak
disentuh sampai angkanya membuktikan sesuatu. Median 3 kali jalan, Chromium, Slow 4G, CPU 4x:

| skenario | FCP |
|---|---|
| apa adanya | 2304 ms |
| tiga CSS fitur dibuat non-blokir | 2668 ms — **nol perbaikan** |
| tiga CSS fitur non-blokir + skrip ditunda | 2660 ms — **nol perbaikan** |
| **`style.css` juga non-blokir** | **272 ms** |

Penahannya **`style.css` sendirian**: 286 KB yang wajib tiba, terurai, dan berlaku sebelum
peramban boleh mencat satu piksel. Tiga stylesheet lain karena itu **dibiarkan blokir** —
membuangnya tidak membeli apa pun, dan aturan urutan token `fiezel-motion.css` tetap utuh.

## Hubungannya dengan m025-84

m025-84 memperbaiki cacat dengan **gejala yang sama** ("jeda 3 detik, layar putih") dengan
memindahkan markup splash ke frame pertama. Itu benar dan tetap berlaku — tetapi ia
menyelesaikan **separuh**: markup-nya memang sudah di atas, sementara peramban tetap menahan
cat sampai lembar gaya terakhir berlaku. Separuh kedua bertahan sampai pemilik melaporkannya
lagi. Gerbang `tests/boot-first-paint-nonblocking-test.js` menjaga separuh kedua itu.

## Yang dijaga supaya tidak jadi masalah baru

Kilatan HTML telanjang **lebih buruk** daripada layar kosong yang baru saja dibuang. Jadi:

- Tirai splash **tidak boleh terangkat** sebelum lembarnya berlaku. `dismissBootSplash()`
  menunggu `shellCssSettled()`.
- Diuji sebagai perilaku sungguhan: `style.css` sengaja ditahan 6 detik, dan pada detik 1,5
  tirai masih menutup **penuh layar** (844 px) sementara `link.rel` masih `preload`.
- Penantiannya **berpagar 4 detik**. Lembar yang gagal atau lambat tidak boleh mengunci murid
  di balik tirai — aturan yang sudah tertulis di kepala `dismissBootSplash` sejak sebelum ini.
  `onerror` menandai lembar gagal supaya penantiannya berhenti seketika, bukan menunggu pagar.
- **Ragu = sudah siap.** Elemen tidak ketemu, peramban tanpa `querySelector`, apa pun: tirai
  naik. Kegagalan jatuh ke sisi "murid tetap bisa memakai aplikasi".

## Dua jebakan yang ditemukan saat mengerjakan

1. **Skrip inline penanda kesiapan memerahkan `splash-first-paint-test`** — gerbang itu
   menuntut markup splash berada di atas SETIAP elemen skrip. Benar, dan tidak dilonggarkan:
   penanda kesiapan dipindah untuk dibaca dari DOM (`link.rel` yang sudah bertukar).
2. **Komentar penjelasnya sendiri memuat literal tag skrip** dan ikut memerahkan gerbang yang
   sama. Kata-katanya diganti, bukan gerbangnya.

## Kenapa berkas ini menyentuh wilayah sesi lain

`features/neural-voice/fiezel-diag-panel.js` berubah **hanya** pada satu angka `DIAG_BUILD`
`m025-198` → `m025-199`, ditulis `tools/bump-build.mjs`. Nol baris logika disentuh.

## Langkah berikutnya

1. **Update from Remote → Deploy HEAD Commit** di cPanel.
2. **Actions → FIEZEL Deploy Site → Run workflow** pada `main` untuk menuntut bukti `m025-199`.
3. Tutup total aplikasi di HP lalu buka lagi.

## Utang yang MASIH terbuka

- `style.css` **286 KB** itu sendiri belum disentuh. Non-blokir menyembunyikan biayanya dari
  cat pertama; ia tidak mengecilkannya. Memecahnya jadi lembar kritis + sisanya adalah
  perbaikan berikutnya yang sebenarnya.
- `#fiezelDiagSearch` (13px) dan `#fiezelDiagText` (11px) masih milik sesi neural-voice.
- `tests/cf-config-killswitch-test.js` assert (g) bermargin nol (`configMs>=300` atas delay 300 ms) —
  terbukti flake di PR #259. Berkas itu wilayah klaim sesi A6.
