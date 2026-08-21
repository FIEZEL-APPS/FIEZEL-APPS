# FIEZEL — Onboarding Enam Langkah Handoff

Tanggal: 2026-08-21 WIB
Lane: brand / redesign
Release: `DIAG_BUILD=m025-77`, `SW_REV=m025-77-onboarding-six-steps-20260821-1`
Sumber: `FIEZEL_Design_Handoff_Detail.pdf`, baris **ONBOARDING SCREENS**

## APA YANG DIKERJAKAN

Step 0 (splash) sudah ada sejak m025-75/76. m025-77 menambahkan Step 1-6 sesuai sheet.

Modul baru `features/onboarding/fiezel-onboarding.js`. Murni dan bisa diuji tanpa aplikasi: ia hanya memanggil balik `onGoal`, `onPlacement`, dan `onFinish` yang diberikan pemanggil, jadi ia tidak bisa diam-diam merusak state belajar.

| Langkah | Judul | Aksi nyata |
|---|---|---|
| 1 | Selamat datang di FIEZEL! | Lanjut |
| 2 | Belajar jadi lebih seru | Lanjut |
| 3 | Pilih tujuan belajarmu | IELTS / TOEFL → menulis `preferences.goalProfile` + `preferences.examTrack` |
| 4 | Tes penempatan singkat | Memanggil `startPlacement()` yang asli |
| 5 | Atur jadwal & pengingat | Menjelaskan pengingat yang memang sudah aktif |
| 6 | Semua siap! | Menutup perkenalan dan masuk Home |

## ASET BARU

Pose dipotong dari baris ONBOARDING SCREENS, bukan dari baris ACTIVITIES. Alasannya teknis: di baris onboarding karakternya digambar sekitar dua kali lebih besar (170 px berbanding 78 px), dan itulah sumber paling tajam yang tersedia. `belajar` ikut naik ke sumber yang sama.

| Aset | Ukuran | Dipakai |
|---|---|---|
| `fiezel-belajar.png` | 170×180 (naik dari 78×87) | langkah 2 |
| `fiezel-mengintip.png` | 96×71 | langkah 3 |
| `fiezel-menulis.png` | 170×159 | langkah 4 |
| `fiezel-jadwal.png` | 147×163 | langkah 5 |
| `fiezel-siap.png` | 174×180 | langkah 6 |

Latar tetap transparan. Untuk `menulis`, flood fill biasa tidak bisa dipakai: meja dan kertasnya nyaris sewarna dengan dinding krem di belakangnya, sehingga benih dari seluruh tepi ikut memakan meja dan melubangi kertasnya — maskotnya jadi menulis di atas ruang kosong. Benihnya karena itu hanya diambil dari tepi di atas garis meja; garis meja yang gelap menahan sisanya.

Penulis PNG di `scratchpad/pngtool.mjs` sekarang memilih filter per baris dengan heuristik jumlah selisih mutlak terkecil, bukan filter 0 saja. Aset ini ikut ke shell offline, dan setiap kilobyte di sana dibayar ulang oleh setiap pemasangan.

## TIGA TEMPAT DI MANA DESAIN TIDAK DIIKUTI PERSIS, DAN ALASANNYA

**1. "Tes penempatan singkat" — tesnya 150 soal.**
Judulnya tetap seperti sheet, tetapi jumlah soal yang sebenarnya ditulis di kartunya: *"Isinya 150 soal dan bisa kamu hentikan kapan saja."* Menyebut 150 soal "singkat" adalah kebohongan kecil yang akan ditagih murid pada soal ke-30. **Kalau OWNER memang menginginkan tes penempatan singkat, itu pekerjaan produk tersendiri** — versi pendek yang jujur, bukan label baru untuk tes yang sama.

**2. Langkah 5 tidak memasang pemilih jam.**
FIEZEL belum punya jadwal yang diatur pengguna: pengingatnya dipilih mesin ALRS dari bukti belajar, dan target harian dihitung dari bukti juga. Pemilih jam di sini akan menjadi tombol yang tidak tersambung ke apa pun. Yang ditampilkan adalah apa yang benar-benar terjadi.

**3. Langkah 3 dan 4 mendapat tombol kedua "Nanti saja".**
Sheet hanya menggambar tombol utama. Tanpa jalur kedua, murid yang belum punya target ujian atau belum mau mengerjakan 150 soal **tidak akan pernah sampai ke langkah 5 dan 6** — satu-satunya jalannya keluar. Ini bug alur, bukan pilihan gaya, dan gate menahannya.

## IELTS DAN TOEFL BUKAN TOMBOL KEMBAR

Prasyarat kemampuan keduanya memang satu profil (`exam_foundation`), jadi keduanya menulis profil yang sama. Yang membedakan disimpan terpisah sebagai `preferences.examTrack`, dan itulah yang dipakai untuk label yang dilihat murid ("Tujuan belajar: Fondasi IELTS" berbanding "Fondasi TOEFL"). Dua tombol yang menulis hal yang persis sama adalah pilihan palsu, dan gate menahan itu juga.

Roadmap R4 melarang prediksi skor, dan layar tujuan belajar adalah tempat paling menggoda untuk melanggarnya. Batas itu ditulis di layar, bukan hanya di kode: *"FIEZEL tidak memprediksi skor. Yang ditampilkan hanya prasyarat kemampuan."*

**Yang belum tersambung, dan disebut terbuka:** `examTrack` baru muncul di konfirmasi pilihan. Menyambungkannya ke isi materi adalah pekerjaan lanjutan.

## URUTAN PEMBUKAAN

Gerbang notifikasi → splash → perkenalan. Splash sekarang memberi tahu saat ia selesai (`onClose`), sehingga perkenalan menyambung tepat waktu; sebelumnya pemanggil harus menebak dengan pewaktu kedua, dan tebakan itu meleset setiap kali splash ditutup lebih awal oleh sentuhan.

Perkenalan tampil **sekali saja**, bukan sekali sehari. Selesai maupun dilewati sama-sama dicatat selesai.

## GATE

`node onboarding-test.js` — 18 kasus. Yang paling penting: **setiap langkah wajib punya jalan keluar**, karena gerbang notifikasi ada di bawah lapisan ini dan notifikasi wajib di produk ini. Juga ditahan: langkah 5 dan 6 harus tetap bisa dicapai tanpa mengerjakan tes penempatan; tes penempatan tidak boleh dijalankan di balik lapisan yang masih terpasang; tidak ada janji skor; jumlah soal yang sebenarnya harus disebut; langkah pengingat tidak boleh memasang pemilih jam yang tidak tersambung.

Sudah didaftarkan ke `quality.yml`.

## LANJUTAN

1. Tes penempatan versi pendek — kalau OWNER memang menginginkan yang "singkat".
2. Menyambungkan `examTrack` ke isi materi dan label perjalanan belajar.
3. Berkas master AI/EPS/SVG untuk vektor sejati dan ikon 1024×1024.
4. Bagian "KENAPA FIEZEL?" pada sheet belum dibuat.
