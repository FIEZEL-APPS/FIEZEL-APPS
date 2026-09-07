# Masuk kelas lewat kode: ketukan murid sampai ke guru

Otoritas: OWNER. Kontrak singkat untuk jalur "murid mengetik kode kelas → guru memutuskan",
yang masuk di build `m025-272`.

## Status

SELESAI dan terpasang: penanda `j` di laporan kelas (`workers/api/teacher/class-sync-core.js`),
`announceJoin()` di `features/learner-flow/fiezel-learner-flow.js`, ketukan saat murid menekan
Gabung (`setClassCode` di `features/class-hub/fiezel-class-hub.js`), antrean + keputusan guru
(`acceptJoin` / `rejectJoin` / `pendingJoins` di `features/teacher/fiezel-teacher-store.js`),
kartu "Menunggu persetujuan" di tab Kelas sisi guru, kabar `join_request` di kotak masuk guru,
dan naskah dua bahasa `copy-id-classjoin.js` + `copy-th-classjoin.js`.
Gerbangnya: `tests/class-join-test.js`, terdaftar di `.github/workflows/quality.yml`.

## Masalah yang ditutup

Menekan "Gabung" dulu hanya menulis kode ke `localStorage` murid. Guru baru tahu muridnya ada
saat murid itu menyelesaikan tugas PERTAMANYA — dan murid yang salah ketik kode mengira dirinya
sudah tergabung padahal tidak ada siapa pun di ujung sana. Dua kebisuan dalam satu momen.

## Kontrak yang harus dijaga

1. **Ketukan bergabung BUKAN pendaftaran.** Kode kelas enam huruf bisa salah ketik dan bisa
   ditebak. Nama baru yang mengetuk berhenti di antrean `c.pending`; guru yang menambahkannya
   tahu siapa yang ia terima. Melonggarkan ini memerahkan gerbang.
2. **Laporan yang membawa HASIL tetap mendaftar otomatis.** Murid yang sudah mengerjakan tugas
   kelas ini jelas bukan orang asing, dan menahannya berarti membuang buktinya. Perilaku lama
   ini sengaja tidak diubah.
3. **Penanda `j` bertahan sampai satu kiriman BERHASIL.** Murid yang menekan Gabung saat sinyal
   putus tetap sampai ke guru begitu jaringannya kembali. Melepasnya di percobaan pertama
   berarti ketukan itu hilang tanpa jejak — persis mode kegagalan yang sudah kita bayar sekali
   di jalur peringatan keluar-layar.
4. **Yang diabaikan tidak diberi tahu.** Memberitahunya sama dengan memastikan bahwa kode itu
   benar, dan itu justru menolong penebak. Ia hanya tidak pernah menerima tugas — keadaan yang
   sama persis dengan sebelum ia mengetik kode.
5. **Satu bilangan, nilai tunggal.** `j` hanya boleh `1`. Gerbang server menolak bentuk lain;
   jangan menjadikannya kantong untuk data lain.

## Batas yang diketahui

- **Murid tidak diberi tahu saat ia diterima.** Yang ia lihat: tugas mulai berdatangan. Kalimat
  di toast sudah menyiapkan harapan itu ("tugas muncul otomatis setelah kamu ditambahkan").
- **Nama depan tetap kunci identitas.** Dua "Ani" di satu kelas masih bertabrakan, sama seperti
  jalur laporan yang sudah ada. Memperbaikinya berarti menyentuh identitas murid secara
  menyeluruh, bukan hanya layar ini.
- **Antrean disimpan lokal di perangkat guru** (`c.pending`, maksimum 40 entri). Guru yang
  berganti perangkat kehilangan antreannya; ketukan berikutnya dari murid yang sama akan
  memunculkannya lagi hanya kalau ia menekan Gabung lagi.

## Langkah berikutnya (keputusan OWNER)

- Beri tahu murid saat ia diterima — jalurnya sudah ada (kotak masuk murid), naskahnya belum.
- Tolakan yang bertahan: sekarang "abaikan" hanya membuang entri; ketukan berikutnya akan
  memunculkannya lagi. Kalau kelas ramai penebak, daftar tolak lokal layak dipertimbangkan.
- Antrean di server, bukan di perangkat guru, kalau guru mulai memakai dua perangkat.
