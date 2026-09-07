# Paritas i18n Thai: mengapa pendaftarannya harus otomatis

Otoritas: OWNER. Dokumen ini menutup satu lubang yang sudah berbulan-bulan mengirim layar
berbahasa campur ke murid Thai tanpa satu pun gerbang berubah merah, dan mencatat kontrak
yang harus dijaga siapa pun yang menambah teks ke FIEZEL berikutnya.

## Aturannya, satu kalimat

**Setiap teks yang dilihat pengguna lahir dua bahasa — Indonesia dan Thai — atau tidak lahir
sama sekali.**

FIEZEL punya murid Thai. Kunci yang hanya ditulis dalam Indonesia tidak sampai kepada mereka
sebagai teks yang hilang; ia sampai sebagai kalimat Indonesia di tengah layar Thai. Fallback
per-kunci memang desain yang benar untuk ketahanan runtime — satu kunci rusak tidak boleh
mematikan sesi belajar — tetapi ia juga desain yang **menyembunyikan lubang dari mata
pengembang**. Yang terlihat bukan layar rusak, melainkan layar yang berfungsi dalam bahasa
yang salah.

## Apa yang rusak, dan kenapa tidak ada yang menangkapnya

`tests/th-coverage-test.js` sudah lama menegakkan hal yang benar: paritas kunci ID↔TH nol
selisih per domain, paritas himpunan `{placeholder}` per kunci, dan setiap nilai th wajib
ber-aksara Thai. Gerbangnya bagus. Yang bocor adalah **pendaftarannya**.

Daftar domainnya dulu sebuah array yang diketik tangan:

```js
const DOMAINS = ['core', 'app-a', …, 'grammar-labels'];   // 15 nama
```

Array semacam itu memeriksa dengan ketat apa yang tercantum di dalamnya, dan **buta total**
terhadap yang tidak. Domain baru lolos hijau tanpa pernah menyentuh Thai — kecuali penulisnya
ingat menyunting array ini. Tidak ada apa pun yang memaksanya ingat.

Menyalakan pendaftaran otomatis langsung menemukan **dua** lubang yang sudah berjalan di
produksi:

1. **`copy-id-redesign.js` — 76 kunci, tanpa kembaran th sama sekali.** Lahir di `m025-246`,
   dimuat di produksi lewat `index.html`, tidak pernah masuk array. Isinya justru permukaan
   yang paling sering dilihat: navigasi 4 tab, Home "Hari ini", ringkasan akhir sesi, tema
   malam, keadaan gagal audio.

2. **`copy-*-student.js` — 287 kunci yang tidak pernah terukur.** Domain ini mendaftar lewat
   `overrideCopy`, sementara stub pemuat gerbang hanya menyediakan `registerCopy`. Berkasnya
   `return` lebih awal, gerbangnya menghitung nol kunci, dan array yang diketik tangan
   menyembunyikan kejanggalan itu karena `student` memang tidak tercantum. Setelah stubnya
   dilengkapi, ketahuan 2 kuncinya belum punya th.

Keduanya lolos karena alasan yang sama: **pagarnya ada, pendaftarannya manual.**

## Kontrak yang harus dijaga

1. **Daftar domain DITEMUKAN, tidak diketik.** `DOMAINS` dibaca dari isi
   `features/i18n/` dengan pola `copy-(id|th)-<domain>.js`. Membuat `copy-id-apa-pun.js`
   otomatis menuntut `copy-th-apa-pun.js`, dan sebaliknya. Jangan pernah mengembalikannya
   menjadi array literal — itu memulihkan persis lubang yang dokumen ini tutup.

2. **Stub pemuat wajib menyediakan SETIAP pintu yang dipakai berkas copy.** Hari ini ada dua:
   `registerCopy` (kunci baru) dan `overrideCopy` (menimpa kalimat yang sudah ada). Berkas
   copy menyerah lebih awal bila pintunya tidak ada, dan modul yang menyerah menghitung nol
   kunci — hijau yang berarti "tidak diukur", bukan "tidak ada lubang". Pintu ketiga kelak
   harus ikut ditambahkan ke stub pada commit yang sama.

3. **Utang dicatat bertanggal, bukan didiamkan.** `UTANG_TANPA_TH` (domain tanpa kembaran)
   dan `UTANG_KUNCI` (kembarannya ada, sebagian kunci belum) menahan lubang yang sudah
   terlanjur ada saat pagar dipasang, supaya pagarnya bisa berdiri hari ini tanpa menyandera
   perbaikan yang butuh penutur Thai. Keduanya dicetak pada setiap kali gerbang berjalan,
   jadi tidak bisa hilang dari pandangan. Aturannya:
   - **Bukan tempat pekerjaan baru.** Menambah nama ke sini = memilih mengirim layar
     berbahasa campur. Tulis `copy-th`-nya.
   - Setiap entri wajib punya tanggal dan alasan.
   - **Utang yang sudah lunas wajib dicoret**; gerbangnya merah bila sebuah entri ternyata
     kuncinya sudah diterjemahkan. Tanpa aturan ini, daftar pengecualian mati akan
     diam-diam melonggarkan gerbang untuk domain lain kelak.

## Utang yang terbuka saat dokumen ini ditulis

| Domain | Lubang | Sejak |
| --- | --- | --- |
| `redesign` | 76 kunci, tanpa `copy-th-redesign.js` | 2026-09-05 |
| `student` | 2 kunci: `grammar.materi-new-memiliki-item-valid`, `fsl.exam-format-kicker` | 2026-09-05 |

Keduanya menunggu terjemahan yang ditinjau penutur Thai. Owner tidak menguasai bahasa Thai,
jadi terjemahan yang dikarang model tanpa peninjauan bukan penyelesaian — ia hanya
memindahkan lubangnya ke tempat yang tidak bisa dilihat siapa pun.

## Berikutnya

- Pertimbangkan gerbang yang menolak literal kalimat berbahasa Indonesia yang muncul langsung
  di `app.js`/modul fitur tanpa melewati `FiezelI18n.t`. Hari ini kontrak itu hanya dijaga
  kebiasaan; `id-golden-snapshot-test` menjaga kalimatnya tidak BERUBAH, bukan bahwa ia
  didaftarkan lewat i18n.
- Lapisan konten th non-copy (bank soal, naskah brain, kosakata) sudah punya gerbangnya
  sendiri di berkas yang sama. Pola "daftar yang diketik tangan" tidak dipakai di sana —
  ketiganya menghitung terhadap sumber kebenaran masing-masing. Biarkan begitu.

---

## m025-295 — kunci hantu di layar guru: cadangannya ADA, hanya tidak pernah dipakai

Owner melaporkan dasbor guru penuh frasa seperti `guru.merek-tag`, `guru.nav-ringkasan`,
`guru.tab-jurnal`, `guru.opsi-bab`. Dugaan pertama yang wajar — kuncinya belum didaftarkan —
**salah**: kesebelas kunci yang disebutkan owner terdaftar lengkap di id DAN th, dan di Node
semuanya terpecahkan dengan benar.

Penyebab sebenarnya ada di pembungkus `t()` lokal yang dipakai sebelas modul fitur:

```js
function t(k, fb) { ... return I && I.t ? I.t(k) : fb; }
```

`FiezelI18n.t(kunci)` mengembalikan **kuncinya sendiri** saat kalimatnya tidak ditemukan — itu
disengaja, supaya lubangnya terlihat dan bisa dihitung. Tetapi pembungkus di atas hanya
memakai cadangan `fb` kalau FiezelI18n **tidak ada sama sekali**. Kalau modulnya ada tetapi
kuncinya belum termuat — copy-map telat, satu berkas 404 di server, deploy tidak lengkap —
`I.t(k)` mengembalikan `'guru.merek-tag'` dan pembungkus meneruskannya apa adanya ke layar.

Yang paling menyakitkan: **104 dari 117 pemanggilan di Ruang Guru sudah menuliskan kalimat
cadangannya**. Teksnya ada di kode, satu baris di sebelahnya, dan tidak pernah dipakai.

**Acuan perbaikannya sudah ada di repo sendiri**: `features/class-hub/fiezel-class-hub.js`
menulis `if (s === undefined || s === k) s = fb == null ? k : fb;`. Sebelas modul lain
disamakan dengannya. Diukur: `t('guru.merek-tag', 'untuk Guru')` dengan FiezelI18n yang
kuncinya kosong — sebelumnya `guru.merek-tag`, sesudahnya `untuk Guru`.

### Gerbang: menjalankan, bukan membaca pola

`tests/i18n-fallback-wrapper-test.js` MENGAMBIL sumber tiap pembungkus, menjalankannya dengan
FiezelI18n palsu yang meniru keadaan kunci-tak-ditemukan, lalu menuntut hasilnya kalimat
cadangan. Gerbang yang membaca pola teks bisa dilewati dengan menulis ulang polanya; yang
menjalankan kodenya tidak.

Ia juga menahan arah sebaliknya: dengan FiezelI18n yang kuncinya ADA, pembungkus wajib
mengembalikan kalimat aslinya. Tanpa assert itu, "perbaikan" yang selalu mengembalikan
cadangan akan mematikan seluruh terjemahan Thai diam-diam dan assert pertama tetap hijau.

Dua penyempitan dilakukan setelah gerbang versi pertama menuduh kode yang sehat:
- Pembungkus yang menutup variabel modul lain tidak bisa dijalankan berdiri sendiri, jadi
  hanya yang memanggil `FiezelI18n` yang diuji.
- `features/ui/fiezel-update-prompt.js` memakai `t(kunci, params)` — parameter keduanya bukan
  cadangan, jadi mengembalikan kunci di sana memang benar. Gerbang kini menuntut nama
  parameter kedua benar-benar cadangan (`fb`/`fallback`/`cadangan`).

### 12 kunci hantu sejati, didaftarkan dua bahasa

Pindaian menyeluruh (`t()` di seluruh app.js + features/**, dibandingkan dengan seluruh
copy-id) menemukan 16 kunci yang dipanggil tetapi tak pernah terdaftar. Dua di antaranya
tampil sebagai nama kunci karena memang tanpa cadangan: `progress.belum-terukur`,
`quiz.tombol-dengar`. Dua belas lainnya punya cadangan Indonesia — artinya **murid Thai
membaca kalimat Indonesia di sana**: `account.err-pass-mismatch`, lima `fsl.explain-*`, empat
`social.validate-*`, `social.milestone-default`, `social.error-rate-limited-with-retry`.
Semuanya kini terdaftar id + th.

Nilai id disalin **verbatim** dari cadangan yang sudah ada di kode, mengikuti HUKUM BESI di
`copy-id-gems.js`. Buktinya: baseline emas **hijau tanpa perlu diregenerate** — himpunan
kalimat murid tidak berubah sama sekali.

**Dua kunci sisanya sengaja dibiarkan**: `gems.chip-aria` dan `gems.streak-toast`. Keduanya
th-murni menurut desain — padanan id-nya adalah FUNGSI di `gems-core.js` yang merakit
kalimat, bukan literal. Mendaftarkannya justru akan melanggar gerbang emas. Alasannya sudah
tertulis di kepala `copy-id-gems.js` sejak Wave 2; catatan ini hanya menegaskan bahwa ia
diperiksa, bukan terlewat.

### Yang belum terjawab, dan sengaja dikatakan

Perbaikan ini membuat layar **anggun saat gagal** — guru membaca kalimat Indonesia, bukan
nama kunci. Ia tidak menjawab *kenapa* kuncinya tidak terpecahkan di perangkat owner, karena
di repo semuanya terpecahkan dengan benar. Tersangka terkuat: salinan yang ter-deploy tidak
lengkap (ingat galat Git cPanel "0 - Unknown Error" yang belum tuntas) sehingga sebagian
`features/i18n/copy-id-*.js` tidak ikut terkirim. Kalau frasa hantu masih muncul sesudah
build ini terpasang, yang perlu diperiksa adalah daftar berkas di server, bukan kodenya.

### AKAR MASALAHNYA KETEMU — lima copy-map tidak pernah diprecache

Catatan di atas menutup dengan "tersangka terkuat: deploy tidak lengkap" dan menyarankan
memeriksa daftar berkas di server. **Tidak perlu.** Penyebabnya ada di repo, dan bisa diukur:

```
'guru.merek-tag'  hidup di  features/i18n/copy-id-feat-d.js
copy-id-feat-d.js dimuat    index.html
copy-id-feat-d.js ADA di    ASSETS sw.js?   TIDAK
```

Lima copy-map dalam keadaan yang sama sekaligus — `copy-id-app-e`, `copy-id-app-f`,
`copy-id-feat-c`, `copy-id-feat-d`, `copy-id-grammar-labels` — plus
`features/mascot/fiezel-paw-outfit.js`.

PWA yang sudah terpasang dilayani dari cache shell. Berkas yang tidak pernah diprecache tidak
ada di cache; ia hanya sampai kalau jaringan sedang baik pada detik itu juga. Di jaringan
buruk atau offline — keadaan paling sering di lapangan, dan justru keadaan yang PWA ada untuk
melayaninya — berkasnya tidak pernah dieksekusi, seluruh kunci di dalamnya tidak terdaftar,
dan guru membaca nama kuncinya. Dua dari lima berkas itu memuat naskah Ruang Guru.

**Kenapa gerbang PWA yang sudah ada tidak menangkapnya.** `tests/pwa-cache-test.js` memeriksa
DAFTAR TETAP yang ditulis tangan di dalam berkas gerbangnya. Daftar tetap hanya menjaga yang
sempat diingat penulisnya; setiap berkas yang ditambahkan ke `index.html` sesudah daftar itu
ditulis tidak pernah masuk, dan gerbangnya tetap hijau sambil melewatkan justru hal yang
paling penting. `tests/precache-covers-shell-test.js` menurunkan tuntutannya dari
`index.html` SENDIRI, jadi skrip baru mana pun langsung ikut terjaga tanpa ada daftar yang
perlu disunting — dan satu assertnya menyebut kasus ini dengan nama: berkas TEMPAT kunci
`guru.*` benar-benar tinggal wajib diprecache.

**Hubungannya dengan perbaikan pembungkus di atas:** keduanya perlu, dan tidak saling
menggantikan. Precache membuat kuncinya benar-benar sampai; pembungkus membuat layarnya
anggun kalau suatu hari ada yang tidak sampai lagi. Yang pertama memperbaiki sebabnya, yang
kedua memperbaiki akibatnya.
