# FIEZEL — Maskot Resmi dan Splash Handoff

Tanggal: 2026-08-21 WIB
Lane: brand / redesign
Release: `DIAG_BUILD=m025-76`, `SW_REV=m025-76-official-artwork-20260821-1`
Sumber: `FIEZEL_Design_Handoff_Detail.pdf` (sheet karakter resmi)

## KOREKSI ATAS m025-75

m025-75 menuliskan ulang karakter ini sebagai jalur SVG buatan sendiri. **OWNER menolaknya, dan penolakan itu benar.** Ilustrasi bergaya lukis dengan bulu, gradasi, dan garis tangan tidak bisa disamai oleh jalur yang ditulis manual; hasil yang "mirip-mirip" justru merusak merek. Satu-satunya yang bisa persis adalah pikselnya sendiri.

m025-76 membuang SVG itu sepenuhnya dan memakai **karya aslinya**, dipotong langsung dari sheet di PDF.

## APA YANG DIKERJAKAN

Delapan aset PNG berlatar transparan, semuanya potongan nyata dari sheet:

| Aset | Ukuran | Isi |
|---|---|---|
| `fiezel-hero.png` | 240×311 | maskot melambai (wink + paw wave) |
| `fiezel-belajar.png` | 78×87 | membaca dengan kacamata |
| `fiezel-semangat.png` | 73×95 | memegang pensil |
| `fiezel-coding.png` | 70×88 | di depan laptop |
| `fiezel-pencapaian.png` | 78×99 | membawa piala |
| `fiezel-istirahat.png` | 73×66 | beristirahat |
| `fiezel-mark.png` | 92×106 | tanda F dengan bintang emas |
| `fiezel-icon.png` | 64×64 | ikon aplikasi (wajah maskot) |

Total 267 KB, semuanya masuk shell offline.

**Seluruh teks anotasi sheet dibuang**: judul baris (`ACTIVITIES / POSES`), keterangan pose (`Belajar`, `Semangat!`), `WARNA PALET`, dan `APP ICON VARIATIONS`. Potongan pertama sempat membawanya ikut — OWNER menolak, dan memang benar: itu catatan untuk desainer, bukan bagian karakter.

Untuk `fiezel-mark.png` dipilih **tanda F saja tanpa huruf**, karena wordmark "FIEZEL" sudah ditulis sebagai teks di splash. Memakai gambar berhuruf hanya menggandakan kata yang sama dan mengunci ukurannya.

## CARA LATAR DIANGKAT

Flood fill dari tepi, bukan color-key global. Dada dan moncong karakter ini berwarna krem yang sama dengan latar sheet; color-key global akan melubangi karakternya sendiri. Warna latar diambil dari warna yang paling sering muncul di tepi potongan, bukan dari satu piksel pojok — pojok bisa jatuh tepat di garis bingkai kartu, dan satu piksel yang salah membuat seluruh latar gagal terangkat.

ImageMagick tidak tersedia di mesin ini, jadi pemotongnya ditulis sendiri di Node (`scratchpad/pngtool.mjs`).

## SOAL LOTTIE

Lottie tidak dipakai, dan ini alasannya. Lottie unggul bila animasinya berasal dari **vektor sejati** — di situ ia ringan dan tajam di semua ukuran. Yang kita punya adalah ilustrasi raster, dan Lottie yang membungkus PNG hanya menambah pustaka pemutar (ratusan KB) untuk gerakan yang sudah bisa dilakukan CSS tanpa tambahan apa pun.

Lottie baru masuk akal setelah ada berkas master AI/EPS/SVG. Kalau master itu ada, saya bisa langsung memakainya — dan pada saat itu Lottie memang pilihan yang tepat untuk gerakan per-bagian (telinga, ekor, kedipan).

## ANIMASI SEKARANG

Karena asetnya gambar utuh, yang dianimasikan gambar utuhnya: `hero` mengambang pelan, `semangat` melompat kecil, `pencapaian` bergoyang, `belajar`/`coding`/`istirahat` bernapas. Semuanya CSS, sehingga otomatis ikut diam ketika perangkat meminta kurangi-gerak.

Aturan produksi handoff dijaga gate: tidak direntangkan (tinggi selalu dihitung dari rasio asli), tidak diwarnai ulang (tidak ada `filter`/`hue-rotate`), tidak dicerminkan.

## BATAS YANG HARUS DIKETAHUI

Aset ini **raster**, bukan vektor. Sumber di PDF terbatas — hero hanya 286 px pada kualitas tertinggi yang tersedia. Untuk layar 3x dan ikon aplikasi 1024×1024, dibutuhkan berkas master. Handoff itu sendiri sudah memintanya di halaman logo: *"Untuk produksi, logo/icon sebaiknya tersedia sebagai SVG/PDF vector."*

## GATE

`node brand-mascot-test.js` — 17 kasus, termasuk: maskot wajib berupa aset gambar dan **tidak boleh** kembali menjadi jalur SVG buatan sendiri, setiap aset benar-benar ada dan bukan berkas kosong, dimensi terdaftar cocok dengan berkas PNG-nya, semua aset ikut ke shell offline, rasio asli dipertahankan, tidak ada teks anotasi yang terbawa, animasi tetap CSS, dan splash selalu punya jalan keluar.

## LANJUTAN

1. Berkas master (AI/EPS/SVG) untuk vektor sejati dan ikon 1024×1024.
2. Onboarding 6 langkah — pose sudah siap dipakai, tanpa aset tambahan.
3. Nama maskot: spesifikasi menyebut "Percik", sheet dan aplikasi menyebut FIEZEL.
