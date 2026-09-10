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

## Koreksi m025-262: dua detak, dan cat ulang yang tahu kapan harus diam

m025-261 menurunkan ronde sinkron guru ke 3 detik dan memasang `paintSyncChip()` sebagai
pagarnya. Pagar itu benar tetapi tidak cukup, dan angkanya salah. Owner melaporkan tiga
gejala sekaligus; ketiganya berakar di dua kekeliruan yang sama.

**1. 3000 ms adalah lantai server, bukan jarak aman.** `LIMITS.TEACHER_MIN_INTERVAL_MS`
di `workers/api/teacher/class-sync-core.js` bernilai 3000 dan `makeRateLimiter` menolak
dengan 429 apa pun yang lebih rapat dari itu. Klien yang memakai persis 3000 ms berdiri
TEPAT di lantainya: jitter sekecil apa pun membuat sebagian ronde ditolak, `c.sync.error`
terisi, dan `syncFailStreak` menanjak tanpa ada yang benar-benar rusak. Setiap klien yang
memilih jeda polling wajib membacanya dari lantai server dan menambah marjin, tidak
menyamainya.

**2. Chip tidak butuh jaringan untuk tetap segar.** `syncLabel()` menghitung labelnya dari
selisih MENIT terhadap `lastPullAt`. "Tersinkron baru saja" karena itu bisa dijaga oleh
detak lokal 1 detik tanpa satu pun permintaan. Menyeret ronde jaringan ke 3 detik demi
label yang berubah tiap menit adalah membayar mahal sesuatu yang gratis. Sekarang ada dua
detak terpisah: `CHIP_TICK_MS` (1 detik, lokal) dan `SYNC_EVERY_MS` (10 detik, jaringan).

**3. Cat ulang penuh tidak boleh menimpa guru yang sedang memegang layar.** `render()`
mengganti `el.innerHTML`, jadi ia membuang simpul yang sedang dipegang. Inilah kenapa
"tugas baru tidak pernah sampai ke murid": kirimannya tidak gagal — formulirnya yang
dikosongkan sebelum guru sempat menekan kirim. Pagar `paintSyncChip()` hanya menahan ronde
KOSONG; begitu satu laporan murid masuk, `berubah` menjadi benar dan cangkangnya dicat
ulang, tepat di atas ketikan guru. Dengan beberapa murid aktif, itu terjadi hampir setiap
ronde.

Kontrak sekarang:

- **Cat ulang yang dipicu SINKRON melewati `syncRender()`, dan `syncRender()` menunda
  selama `busy()`** — ada modal/drawer/inbox terbuka, atau fokus berada di
  `input`/`textarea`/`select`/contenteditable di dalam cangkang. Yang tertunda disusulkan
  oleh detak chip begitu `busy()` reda. Cat ulang yang dipicu KETUKAN guru tetap memanggil
  `render()` langsung: menundanya di sana terbaca sebagai tombol yang tidak bereaksi.
- **Animasi masuk hanya berjalan saat layarnya berganti.** `render()` membandingkan
  `lastPaintKey` (view + kelas aktif + modal + drawer); bila sama, pembungkusnya memakai
  `.tg.is-repaint` dan `.tg-rise`/`tg-pop`/`tg-slide`/`chIn` dimatikan. Tanpa ini setiap
  ronde memutar ulang animasi masuk — kartu jatuh ke posisi awalnya lalu merangkak kembali,
  berulang. Yang guru lihat sebagai "kartu glitch berpindah-pindah" adalah animasi masuk
  yang di-restart, bukan tata letak yang bergerak.
- **`data-autofocus` juga hanya pada pergantian layar**, dengan alasan yang sama: pada cat
  ulang ia merebut kursor dari tempat guru meletakkannya.

## m025-263: nama @keyframes adalah ruang nama GLOBAL

Sesudah m025-262 owner melaporkan panel yang MASIH tidak mulus: modal "Tugas baru" dan
"Susun soal dari bank soal" muncul dari **bawah-kanan** layar lalu menjentik ke tengah. Itu
bukan sisa masalah cat ulang; itu bug CSS yang jauh lebih tua dan berdiri sendiri.

`features/teacher/teacher-shell.css` memuat **dua** blok bernama `@keyframes tg-pop` — satu
untuk modal (baris 236), satu untuk inbox (baris 297). Nama keyframe tidak dibatasi berkas,
selektor, atau komponen: ia satu ruang nama untuk seluruh dokumen, dan **definisi belakangan
menang tanpa peringatan apa pun** dari browser, linter, atau build. Jadi modal memakai
keyframe milik inbox.

Kenapa akibatnya "bawah-kanan": `.tg-modal` dipusatkan lewat
`transform: translate(-50%, -50%)` di atas `left:50%; top:50%`. Keyframe modal yang benar
membawa pemusatan itu di kedua ujungnya. Keyframe inbox berakhir di `transform: none` — yang
**menghapus** pemusatannya selama animasi berjalan. Selama 0,24 detik itu sudut kiri-atas
modal duduk tepat di titik tengah layar, jadi ia tampak di bawah-kanan, lalu menjentik balik
begitu animasinya habis dan aturan CSS statisnya berlaku lagi.

**Ini kedua kalinya bug yang sama menembus produksi.** Yang pertama `@keyframes pageIn` di
`style.css`, yang mematikan animasi masuk 15 layar `.fade`; ia ditutup pada 2026-08-29 dan
meninggalkan tombstone `audit 12-003`. Tombstone itu hanya komentar, dan komentar tidak
menahan siapa pun — sepuluh hari kemudian polanya terulang di berkas lain.

Kontrak sekarang, dijaga `tests/css-keyframe-uniq-test.js`:

- **Tidak boleh ada dua `@keyframes` bernama sama di antara CSS yang dimuat satu halaman.**
  Gerbangnya membaca `<link rel=stylesheet>` dari setiap `.html` yang benar-benar dikirim
  (PWA, website, halaman install) dan mengadu hanya berkas yang sedokumen. Nama yang sama di
  dua halaman berbeda bukan tabrakan — `website/` memang menyalin `fiezel-motion.css`, dan
  `design/redesign-v1/` prototipe yang tidak pernah dimuat.
- **Keyframe untuk elemen yang dipusatkan-oleh-transform wajib membawa pemusatan itu di
  kedua ujungnya**, dan tidak boleh berakhir di `transform: none`. Bentuk bug ini bisa
  kembali tanpa nama kembar sama sekali, jadi `.tg-modal` diperiksa terpisah.
