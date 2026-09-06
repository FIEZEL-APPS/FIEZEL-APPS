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

## Perbaikan m025-270 (temuan pemakaian pertama di kelas)

Pendeteksinya bekerja, tetapi tiga hal di jalur ke guru tidak:

1. **Kiriman yang ditolak server hilang diam-diam.** Lantai server satu laporan per 15 detik
   per murid (`LIMITS.LEARNER_MIN_INTERVAL_MS`) menolak laporan kedua dengan 429, dan klien
   membuangnya. Urutan paling wajar — murid membuka ujian (laporan #1), keluar layar beberapa
   detik kemudian (laporan #2, ditolak) — membuat guru hanya menerima kabar generik "laporan
   masuk", persis gejala yang dilaporkan. `pushToClass()` kini mengulang kiriman yang gagal
   (16 detik, berlipat sampai 2 menit, berhenti saat berhasil). Aman karena laporan kelas
   adalah upsert, bukan selisih.
2. **Kabar generik menenggelamkan peringatan.** Satu ronde sinkron bisa melahirkan
   `focus_exit` DAN `report_in` untuk murid yang sama. `report_in` sekarang ditahan bila ronde
   itu membawa peringatan, dan kalimat peringatannya diawali penanda: "⚠ Perlu ditengok: Ani
   keluar dari layar saat mengerjakan ujian "…" — 2× · 75 dtk. Tanyakan ke muridnya sebelum
   menilai." Barisnya juga dicat beda di kotak masuk (`.tg-inbox-item.is-warn`).
   Kalimatnya tetap menyebut FAKTA; kata "curang" sengaja tidak dipakai di mana pun, dan
   gerbang menolaknya.
3. **Detak otomatis papan guru mati sejak awal sesi.** `startAutoSync()` pulang lebih dulu
   (`if (S().syncAvailable() !== 'ok') return;`) **sebelum** timernya dipasang. `FiezelAccount`
   memulihkan sesi secara asinkron, jadi saat Ruang Guru dipasang peran akun sering belum
   terbaca — dan sesudah itu tidak ada apa pun yang menghidupkan detaknya kembali. Guru
   melihat papan yang hanya bergerak kalau tombol Sinkron ditekan tangan. Sekarang detaknya
   SELALU dipasang dan tiap denyut menanyakan rencananya ke `autoSyncPlan()` — fungsi murni,
   lima cabang, semuanya bergerbang: `sync`, `wait` (akun belum siap: tanpa jaringan, detak
   tetap hidup), `skip`, `reset` (ronde yang menggantung >45 detik melepas kuncinya), `idle`.
   Rantai `syncAll` juga mendapat `.catch` supaya satu galat cat-ulang tidak meninggalkan
   `ui.syncing = true` — kunci itu mematikan detak dengan cara yang sama diamnya.
4. **Papan murid tidak punya sistem yang sama, dan punya tombol yang tidak seharusnya ada.**
   Detak murid kini memakai perencana yang SAMA dengan papan guru
   (`features/notify/fiezel-sync-plan.js`, modul murni lima cabang), termasuk cabang `wait`
   (belum ada kode kelas / offline: jaringan tidak disentuh, detak tetap berdenyut) dan
   `reset` (ronde yang menggantung dilepas). Tombol "Kirim ulang laporan" di tab Kelas Saya
   **dihapus dari layar**: menyegarkan papan adalah tugas sistem, bukan pekerjaan rumah
   murid — laporan yang gagal sudah dikirim ulang sendiri (backoff 16 detik → 2 menit).
   Pintunya (`case 'resend'`) dibiarkan hidup untuk jalur pemulihan, tanpa tombol.
5. **Layar murid tertinggal jauh di belakang papan guru.** Guru menyegarkan diri tiap 10 detik
   (`SYNC_EVERY_MS`), murid tiap 60 detik — jadi murid harus menutup-buka aplikasi agar tugas
   baru muncul. Detak murid turun ke 15 detik (`NOTIF_POLL_MS`) dengan rem klien 10 detik
   (`fiezel-inbox.js`), keduanya masih di atas lantai server 5 detik, dan timernya tetap diam
   saat aplikasi tidak terlihat. `tests/exam-focus-guard-test.js` MERAH kalau detak murid
   melebihi 1,5× detak guru.

## Batas yang diketahui, dan kenapa dibiarkan

- **Murid yang keluar dan tidak pernah kembali.** Episode yang masih berjalan dikirim
  begitu masa tenggang lewat, jadi guru tetap melihatnya — tetapi kalau aplikasi
  langsung dimatikan sebelum pengiriman itu, angka terakhir yang guru punya adalah
  angka sebelum kepergian. Sisanya menyusul saat murid membuka lagi (`resumeFocus`).
- **Pembatas laju server 15 detik** (`LIMITS.LEARNER_MIN_INTERVAL_MS`). Dua lapis menahannya:
  jarak antar kiriman di klien (`REPORT_GAP_MS` di class-hub) dan pengulangan kiriman yang
  tetap ditolak (`pushToClass` di learner-flow). Yang tertinggal adalah keterlambatan belasan
  detik, bukan peristiwa.
- **Pendeteksi ini bukan bukti kecurangan.** Ia melaporkan bahwa layar ditinggalkan.
  Keputusannya tetap milik guru, dan laci murid menyebutkan itu dengan kalimat penuh.

## Langkah berikutnya (belum dikerjakan, milik OWNER untuk memutuskan)

- Ambang "berat" (`n >= 3` atau total ≥ 30 detik) masih tetapan; kalau guru ingin
  menyetelnya per kelas, tempatnya di payload tugas, bukan di klien murid.
- Ujian yang dijadwalkan serentak belum punya tampilan kelas-langsung ("siapa yang
  sedang di luar layar sekarang"); datanya sudah cukup untuk itu, layarnya belum ada.
- Mode papan (`tg-board`) belum menampilkan catatan ini; sengaja, karena papan diproyeksikan
  ke depan kelas dan nama murid di sana adalah hukuman publik, bukan informasi.
