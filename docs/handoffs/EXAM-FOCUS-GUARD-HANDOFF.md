# Pendeteksi keluar layar saat ujian (exam focus guard)

Otoritas: OWNER. Dokumen ini kontrak singkat untuk subsistem
`features/class-hub/fiezel-focus-guard.js` dan jalur laporannya ke guru, yang masuk di
build `m025-269`. Yang ada di sini hanya hal yang wajib dijaga siapa pun yang
menyentuhnya berikutnya — bukan ulangan isi kode.

## Status

SELESAI dan terpasang: inti murni `features/class-hub/fiezel-focus-guard.js`,
pemasangan di `features/class-hub/fiezel-class-hub.js` (sisi murid + chip sisi guru),
transport `features/learner-flow/fiezel-learner-flow.js` → `assign.f`, gerbang server
`workers/api/teacher/class-sync-core.js`, tampilan guru di
`features/teacher/fiezel-teacher-store.js` + `fiezel-teacher-shell.js`, naskah dua
bahasa `features/i18n/copy-id-proctor.js` + `copy-th-proctor.js`. Gerbangnya sendiri:
`tests/exam-focus-guard-test.js`, terdaftar di `.github/workflows/quality.yml`.

## Masalah yang ditutup

Ujian mini dari guru (`assignment.mode === 'ujian'`) dikerjakan di perangkat murid
sendiri, tanpa pengawas. Satu ketukan tombol Home sudah cukup untuk membuka mesin
pencari lalu kembali seolah tidak terjadi apa-apa, dan yang sampai ke guru selama ini
hanya hasil akhir — celah itu tidak meninggalkan jejak apa pun.

## Kontrak yang harus dijaga

1. **Hanya mode `ujian`.** Latihan harian dikerjakan sambil hidup berjalan: murid
   dipanggil orang rumah, membuka kamus, membalas pesan. Memantaunya mengubah latihan
   menjadi pengawasan dan tidak menjawab satu pun pertanyaan guru. Gerbang MERAH kalau
   pendengar terpasang di mode `latihan`.

2. **Tiga bilangan, tidak lebih.** Yang sampai ke guru hanya `f = { n, s, x }` — berapa
   kali keluar, total detik di luar, kepergian terlama. Tanpa nama aplikasi, tanpa jam
   presisi, tanpa teks bebas. Gerbang server menolak bentuk lain (`bad_assign_focus`),
   dan penolakan itu memang pagarnya: sekali satu field bebas diizinkan lewat, laporan
   kelas berubah menjadi kanal pengintaian yang tidak pernah disepakati siapa pun.

3. **Masa tenggang 1,5 detik (`GRACE_MS`).** Laci notifikasi, dialog izin mikrofon,
   rotasi layar, dan keyboard virtual mengirim `blur`/`hidden` tanpa ada yang pergi ke
   mana-mana. Menurunkannya berarti menuduh murid yang tidak ke mana-mana; itu merusak
   kepercayaan kelas jauh lebih dalam daripada satu episode yang lolos.

4. **Murid tahu sebelum dan sesudah.** Pita di layar ujian menyebutkan pemantauan
   SEBELUM murid sempat keluar, dan berubah jadi catatan begitu ada kepergian.
   Pengawasan diam-diam bukan bagian dari kesepakatan kelas, dan menghapus pita itu
   mengubah fitur ini menjadi hal lain.

5. **Naskahnya menyebut fakta, tidak memvonis.** "Keluar layar 2× · 75 dtk", bukan
   "curang". Chip di layar guru hanya muncul untuk murid yang punya catatan; menampilkan
   "0×" pada setiap baris mengubah daftar kelas menjadi papan kecurigaan.

6. **Inti tetap murni.** `fiezel-focus-guard.js` tanpa DOM, jaringan, penyimpanan, atau
   jam internal — semua waktu masuk sebagai argumen. Itu yang membuat setiap batas bisa
   diuji di Node tanpa menunggu waktu nyata, dan yang membuat state-nya bisa
   diserialisasi apa adanya ke `ui().focus` sehingga memuat ulang halaman di tengah ujian
   (cara paling gampang menghapus jejak) tidak mengosongkan hitungan.

7. **Kabar guru hanya saat angkanya NAIK.** Laporan kelas adalah upsert yang dikirim
   berulang; membangunkan guru setiap kali laporan yang sama mendarat akan mengubur
   kabar yang benar-benar baru.

## Batas yang diketahui, dan kenapa dibiarkan

- **Murid yang keluar dan tidak pernah kembali.** Episode yang masih berjalan dikirim
  begitu masa tenggang lewat, jadi guru tetap melihatnya — tetapi kalau aplikasi
  langsung dimatikan sebelum pengiriman itu, angka terakhir yang guru punya adalah
  angka sebelum kepergian. Sisanya menyusul saat murid membuka lagi (`resumeFocus`).
- **Pembatas laju server 15 detik** (`LIMITS.LEARNER_MIN_INTERVAL_MS`). Kiriman yang
  kena batas disusulkan di ujung jendela (`REPORT_GAP_MS` di class-hub), jadi yang
  tertinggal adalah keterlambatan, bukan peristiwa.
- **Pendeteksi ini bukan bukti kecurangan.** Ia melaporkan bahwa layar ditinggalkan.
  Keputusannya tetap milik guru, dan laci murid menyebutkan itu dengan kalimat penuh.

## Langkah berikutnya (belum dikerjakan, milik OWNER untuk memutuskan)

- Ambang "berat" (`n >= 3` atau total ≥ 30 detik) masih tetapan; kalau guru ingin
  menyetelnya per kelas, tempatnya di payload tugas, bukan di klien murid.
- Ujian yang dijadwalkan serentak belum punya tampilan kelas-langsung ("siapa yang
  sedang di luar layar sekarang"); datanya sudah cukup untuk itu, layarnya belum ada.
- Mode papan (`tg-board`) belum menampilkan catatan ini; sengaja, karena papan diproyeksikan
  ke depan kelas dan nama murid di sana adalah hukuman publik, bukan informasi.
