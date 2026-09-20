# Hak akses free / pro / sekolah: apa yang sudah berdiri, dan apa syarat menyalakannya

Dibangun m025-349. Dokumen ini mencatat satu mesin yang **sudah selesai tetapi sengaja
dimatikan**, beserta alasan mematikannya — supaya siapa pun yang kelak menaikkan benderanya
tahu persis apa yang ia lepaskan, dan apa yang harus ada lebih dulu.

## Masalah yang ditutup

Sampai m025-348 FIEZEL tidak punya satu pun tempat yang bisa menjawab **"murid ini boleh
apa?"**.

Jatah suara memang sudah dijaga di `workers/api/quota/`, tetapi itu jatah **biaya mesin**
(TTS/AI) — ia menjawab "berapa banyak uang cloud yang sudah dipakai hari ini", bukan
"bagian mana dari produk ini yang menjadi hak murid tersebut". Akibatnya seluruh isi B1–C2
— bagian yang paling mahal dibuat, 114 dari 180 lesson — terbuka gratis untuk siapa pun,
dan tidak ada satu baris kode pun yang tahu arti kata "Pro".

Dua istilah itu gampang tertukar, dan pernah hampir tertukar saat naskahnya ditulis. Karena
itu naskahnya pun dipisah: `copy-id-quota.js` untuk jatah biaya mesin, `copy-id-monetization.js`
untuk hak akses produk. Keduanya kebetulan sama-sama membatasi; keduanya **tidak pernah
berubah bersama**.

## Apa yang sudah berdiri

| Berkas | Isi |
|---|---|
| `features/monetization/fiezel-entitlement.js` | mesin: resolusi rencana, gerbang sesi/level/suara/fitur, buku hari, harga |
| `features/i18n/copy-id-monetization.js` · `copy-th-monetization.js` | 36 kunci naskah, ID + TH |
| `tests/monetization-entitlement-test.js` | 52 assertion, hermetic, termasuk penjagaan penyambungan |
| `app.js` | adapter + gerbang di `quizLoop()` dan `setActiveLevel()` |
| `fiezel-ux-flags.js` | bendera `monetizationEnforce`, **mati** |

Mesinnya **murni**: tidak membaca `localStorage`, jaringan, atau jamnya sendiri. Semua fakta
masuk lewat argumen, semua keputusan keluar sebagai data, dan ia mengembalikan `copyKey`
bukan kalimat. Gerbangnya menegakkan kemurnian itu sebagai assertion, bukan sebagai niat
baik — termasuk larangan menuliskan satu pun kalimat murid di dalam mesin.

## Keputusan yang tidak boleh hilang

### 1. Ia mendarat gelap, dan itu bukan kehati-hatian berlebih

Penyambungan pertama langsung memerahkan `tests/e2e-level-grammar-test.js` — "Switching
level switches the panel with it" gagal karena gerbang komersial menolak B1 untuk rencana
gratis.

Gerbangnya benar. Justru **karena** ia benar, ia memperlihatkan apa yang akan terjadi di
lapangan: alur pembayaran belum ada, jadi menyalakan penegakan berarti memagari B1–C2 untuk
seluruh murid yang sudah memakai FIEZEL **tanpa satu pun jalan untuk membayar**. Murid yang
kemarin belajar B2 membuka aplikasi dan menemukan pintunya hilang, dan satu-satunya tombol
yang kita tawarkan tidak menuju ke mana-mana. Itu bukan monetisasi, itu pemadaman.

Benderanya memisahkan dua hal yang gampang tertukar:

- **Menghitung** selalu jalan, bahkan saat bendera mati. Buku hari tetap dicatat, sehingga
  saat bendera dinaikkan nanti angkanya sudah mengalir dan teruji di lapangan — bukan
  dinyalakan bersamaan dengan kode yang belum pernah dipakai siapa pun.
- **Menghalangi** hanya saat bendera hidup.

`e2e-level-grammar-test.js` hijau kembali **tanpa disentuh**. Ia memang kontrak produk yang
berlaku hari ini; tes yang memerah karena fitur baru bukan otomatis tes yang perlu diperbaiki.

### 2. Kode kelas yang belum diverifikasi tidak pernah membuka apa pun

`joinClassWithCode()` (`app.js`) menerima kode kelas **hanya dengan memeriksa bentuknya**
(`/^[A-Z0-9][A-Z0-9-]{2,11}$/`) lalu menyimpannya ke perangkat. Tidak ada server yang pernah
ditanya.

Kalau hak akses diberikan atas dasar kode tersimpan itu, mengetik `8A-ENG` — atau menebak
`AAA` — membuka seluruh isi berbayar untuk siapa pun. Maka `resolve()` menuntut
`school.verifiedAt`. Kode tanpa verifikasi menghasilkan rencana `free` dengan
`schoolPending: true`, supaya layar tetap jujur ("kelasmu sedang diperiksa") alih-alih
diam-diam menolak.

**Konsekuensinya: jalur sekolah belum bisa aktif sampai rute verifikasi kelas ada.** Itu
arah gagal yang benar — tidak ada satu murid pun yang salah dibukakan pintu.

### 3. Tenggang yang tidak simetris

```
PRO_GRACE_MS    = 0        langganan pribadi diperpanjang sendiri dalam hitungan detik.
                           Tenggang di sini hanyalah pendapatan yang bocor.
SCHOOL_GRACE_MS = 14 hari  lisensi sekolah dibayar bendahara, lewat invoice, menurut
                           kalender semester. Mengunci 30 murid di tengah tugas karena
                           transfer telat tiga hari menghancurkan kepercayaan yang
                           harganya jauh di atas 14 hari akses.
```

Selama tenggang, `inGrace: true` tetap terbaca — sekolah bisa ditagih tanpa satu pun murid
merasakan pintu tertutup.

### 4. Pagar yang melindungi jalur B2B dari jalur B2C

Tugas guru, ujian, penempatan, dan ulangan **tidak pernah** dihitung terhadap jatah
konsumen. Kalau PR dari guru bisa diblokir batas B2C, satu kelas berhenti bekerja dan
sekolah berhenti membayar. Ini diuji sebagai aturan, bukan dibiarkan sebagai kebetulan.

### 5. Dua gerbang level yang tidak boleh saling meniru

Aplikasi sudah punya gerbang **pedagogis** (`isLevelLocked`/`levelEntryDecision` —
"buktikan dulu lewat ujian"). Yang baru adalah gerbang **komersial** ("B1 ke atas ada di
Pro"). Keduanya harus lulus, tetapi tidak boleh bicara dengan kalimat yang sama: murid yang
sudah lulus ujian B1 tetapi belum berlangganan harus membaca *"buka dengan Pro"*, bukan
*"ikuti ujian dulu"*.

Urutannya juga disengaja — pedagogis dulu, komersial belakangan. Menawarkan Pro kepada murid
yang sebenarnya perlu mengulang ujian adalah menjual di saat yang salah.

### 6. Fail-open saat mesinnya absen

Kalau `fiezel-entitlement.js` gagal mendarat (jaringan buruk, cache shell setengah jalan),
pilihannya dua: anggap semua murid gratis, atau lepaskan gerbangnya. Yang pertama **mengunci
pelanggan yang sudah membayar karena kesalahan kita sendiri**. Maka: modul absen = gerbang
absen. Kebocorannya berumur sependek satu muat ulang; kemarahan pelanggan tidak.

Arahnya dibalik di `sanitizeState()`, dan pembalikan itu juga disengaja: `pro`/`school` hanya
diterima sebagai objek (state korup tidak boleh bisa **menciptakan** langganan), sedangkan
buku hari justru dipertahankan sekuat mungkin (membuangnya = jalan reroll jatah).

## Batas keamanan, dikatakan terus terang

FIEZEL local-first: catatan hak akses tinggal di perangkat murid. Murid yang mau dan tahu
caranya **bisa** memberi dirinya sendiri rencana Pro dengan menyunting penyimpanan peramban,
dan tidak ada satu baris pun di modul ini yang bisa mencegahnya. Itu konsekuensi arsitektur,
bukan kelalaian yang menunggu ditambal.

Yang dijaga modul ini adalah kecurangan **murah**: jam yang diputar mundur, kode kelas yang
ditebak, state yang rusak. Ketiganya tidak butuh pengetahuan khusus dan karena itu akan
terjadi dalam skala besar kalau dibiarkan.

Penegakan yang benar-benar mengikat menuntut server. `verifiedAt` untuk sekolah sudah ditulis
dengan bentuk itu sejak awal; Pro kelak membutuhkan padanannya (tanda tangan berbatas waktu
yang diperiksa saat sinkronisasi).

## Syarat menyalakan `monetizationEnforce`

Ketiganya sekaligus, bukan salah satu:

1. **Alur pembayaran Pro benar-benar bisa menerima uang.** Naskah dan harganya sudah ada dan
   teruji; layarnya belum. Sampai itu ada, `presentEntitlementNotice()` sengaja hanya
   menawarkan kode kelas — tombol "Lihat Pro" yang tidak membuka apa-apa lebih merusak
   daripada tidak ada tombol sama sekali.
2. **Rute verifikasi kode kelas ada**, sehingga murid sekolah tidak ikut terkunci.
3. **Naskah Thai sudah direview penutur asli.** Nilai th saat ini draft AI dan ditandai
   begitu di headernya. Naskah yang meminta pembayaran punya biaya kesalahan tertinggi —
   nada yang meleset sedikit berubah dari "ajakan" jadi "tuntutan".

Menaikkannya berarti menyunting tiga tempat sekaligus (`fiezel-ux-flags.js`, salinan
`UX_FALLBACK_FLAGS` di `app.js`, `REQUIRED` di `tests/ux-flags-test.js`) — memang dibuat
begitu supaya keputusan produk itu terlihat sebagai perubahan tes, bukan satu huruf yang
lewat tanpa dibaca.

## Yang sengaja belum disambungkan

- **Gerbang suara neural.** `voiceGate()` ada dan teruji, tetapi chokepoint-nya
  (`fiezel-neural-voice-bootstrap.js` `prepare()`) juga dipanggil jalur perbaikan cache dan
  autoload offline. Memagari di situ berarti memutus perbaikan untuk murid yang langganannya
  baru lewat. Tempat yang benar adalah pintu opt-in paket suara di Pengaturan (bendera
  `voicePackGate`), bukan runtime-nya.
- **Gerbang sertifikat dan ujian latihan.** `featureGate()` ada dan teruji;
  `FiezelCertificate` belum punya pemanggil di `app.js`, jadi memagarinya sekarang berarti
  memagari pintu yang belum ada.

## Kalau kamu menambah naskah di domain ini

Berlaku aturan repo yang sama: kunci baru lahir **dua bahasa sekaligus**, di
`copy-id-monetization.js` + `copy-th-monetization.js`, placeholder identik per kunci.
`tests/th-coverage-test.js` menemukan domain ini sendiri dari isi direktori.

Tambahannya, khusus domain ini, dijaga `monetization-entitlement-test.js`:

- setiap `copyKey` yang **bisa dikeluarkan mesin** (dikumpulkan dari pemakaian nyata, bukan
  daftar yang diketik tangan) wajib punya `.judul` dan `.pesan` di kedua locale;
- harga tidak boleh diketik tangan ke dalam naskah — hanya lewat `{harga}`, supaya angkanya
  tidak pernah berbeda antara naskah id, naskah th, dan aritmetika penawaran.

Dan kanon nadanya lebih ketat dari layar lain, karena ini layar yang meminta uang: jangan
menakuti (peringatan hanya muncul pada sesi terakhir, bukan sebagai hitungan mundur), jangan
menyalahkan (batas ini keputusan kami, bukan kegagalan murid), dan selalu tunjuk satu jalan
yang masih terbuka sekarang dan gratis.
