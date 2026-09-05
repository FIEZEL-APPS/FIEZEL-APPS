# Pipa notifikasi murid: dari mana kabar lahir, dan kapan ia ditanyakan

Otoritas: OWNER. Dokumen ini lahir dari empat laporan owner pada m025-258 yang
ternyata berasal dari tiga cacat berbeda di pipa yang sama.

## Status

SELESAI di build `m025-259` (PR #350).

## Dua sumber kabar yang TERPISAH

Murid punya dua pipa yang tidak saling tahu, dan keduanya polling — tidak ada
push dari server:

| Pipa | Modul | Sumber | Syarat diam |
| --- | --- | --- | --- |
| Sosial | `features/social/fiezel-social-notify.js` | selisih potret `/api/social/friends` + `/api/social/friends/requests` | flag sosial mati, offline, jeda 90 dtk |
| Tugas guru | `features/notify/fiezel-inbox.js` | `/api/learner/class-assignments` | **tanpa kode kelas**, tanpa nama, akun guru, offline |

Keduanya digerakkan satu timer di `app.js` (`startNotifPolling`, 60 detik) yang
**sengaja diam saat aplikasi tidak terlihat**.

## Tiga cacat yang ditutup, dan kontraknya

### 1. Kabar hanya bisa lahir dari yang ada di dalam POTRET

`socialNotifyPoll()` menyusun kabar dari selisih potret. Apa pun yang tidak ikut
dipotret tidak bisa melahirkan kabar — titik. Permintaan teman adalah contohnya:
ia **bukan** teman (itu inti alur Terima/Tolak), jadi ia tidak pernah muncul di
`/api/social/friends`, dan selama satu rilis penuh tidak ada satu pun tempat yang
bisa mengabarkannya.

**Kontrak:** setiap keadaan baru yang layak dikabarkan WAJIB masuk `snapshotOf()`
dan punya cabangnya sendiri di `diff()`. Menambah layar tanpa menambah medan
potret berarti menambah fitur bisu.

### 2. Potret lama tanpa medan baru = GARIS DASAR, bukan "kosong"

Saat medan `requests` ditambahkan, potret yang tersimpan di perangkat murid belum
memilikinya. Memperlakukan ketiadaannya sebagai himpunan kosong akan membuat
setiap permintaan yang sedang menggantung meledak jadi kabar sekaligus pada
pembaruan pertama.

**Kontrak:** medan potret yang baru diperkenalkan wajib dijaga
`Array.isArray(prev.<medan>)` sebelum di-diff — sama seperti potret pertama yang
memang tidak melahirkan kabar apa pun.

### 3. Timer yang diam saat tak terlihat WAJIB punya pembangun

Timer 60 detik berhenti saat `visibilityState !== 'visible'`, dan itu benar —
menanyai server untuk layar yang tidak dipandang hanya membakar baterai. Tapi
tanpa pendengar `visibilitychange`, murid yang kembali menunggu tick berikutnya,
lalu masih bisa tertahan jeda 90 detik `socialNotifyPoll`. Gejalanya terbaca
sebagai "notif baru muncul setelah keluar-masuk PWA, itu pun lama" — dan relaunch
terasa menyembuhkan hanya karena boot memaksa satu poll di detik 6,5.

**Kontrak:** setiap poll yang dihentikan oleh visibilitas wajib dipasangkan
dengan pembangun yang memanggilnya `force` begitu aplikasi terlihat lagi.

## Sisi GURU: kontrak yang sama, timer yang berbeda (m025-261)

Ruang Guru punya pipa ketiga yang tidak lewat `startNotifPolling`: `startAutoSync()` di
`features/teacher/fiezel-teacher-shell.js`. Ia menarik laporan murid per kelas
(`syncClass` → `claimClass` + `pullReports`) dan menyalakan chip "Tersinkron baru saja".

Jedanya diturunkan 45 → **3 detik** atas permintaan OWNER, dan kontrak nomor 3 di atas
berlaku penuh: timernya tidur saat tab tidak dilihat, dengan `visibilitychange` yang
menjalankan satu ronde SEGERA saat guru kembali.

Satu kontrak tambahan yang khusus milik sisi guru:

**Ronde yang tidak membawa data baru TIDAK BOLEH mencat ulang cangkang.** `syncAll()`
memanggil `render()` dua kali per ronde. Pada 45 detik itu tidak terasa; pada 3 detik ia
mencabut fokus dari kolom yang sedang diketik guru, menutup dropdown yang terbuka, dan
melompatkan posisi gulir — setiap tiga detik. Karena itu ronde senyap hanya memanggil
`paintSyncChip()`, dan `render()` penuh disimpan untuk ronde yang benar-benar membawa
laporan, tugas, atau kabar. Siapa pun yang mempercepat sebuah timer di aplikasi ini wajib
memeriksa dulu apa yang dicat ulang setiap tick — bukan hanya berapa sering ia bertanya.

Dua pagar sisanya: `ui.syncing` menahan ronde bertumpuk, dan `syncFailStreak` menaikkan
jeda sesudah kegagalan beruntun supaya server yang sakit tidak dihujani 20 permintaan
per menit.

## Yang masih rapuh, dan layak dikerjakan berikutnya

- **`inbox.poll()` diam TANPA PESAN** bila murid belum memasukkan kode kelas atau
  namanya kosong. Dari kursi murid, "tidak ada tugas" dan "aku tidak pernah
  menanyakannya" terlihat sama persis. Layar Notifikasi sebaiknya menyebut
  keadaan itu, bukan menampilkan kotak kosong.
- **Tugas dicocokkan dengan NAMA DEPAN** (`?name=`). Dua murid bernama depan sama
  di satu kelas akan saling menerima tugas. Ini perlu pengenal yang stabil.
- **Semua kabar bergantung polling.** Push sungguhan (Web Push) sudah ada
  jalurnya di `push-dispatcher.mjs` tetapi belum menyalurkan kabar sosial maupun
  tugas guru.
