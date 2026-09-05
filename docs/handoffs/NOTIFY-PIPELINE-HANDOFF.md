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
