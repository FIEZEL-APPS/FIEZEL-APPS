# FIEZEL Brand Guide — PAW si Kucing Geometris

Panduan ini mengikat tiga hal: identitas maskot, palet + gerak yang boleh dipakai, dan aturan klaim
yang tidak boleh dilanggar siapa pun. Bagian terakhir bukan saran gaya. Itu batas yang menentukan
apakah aplikasi ini jujur atau tidak.

## 1. Identitas maskot

**Nama:** PAW
**Bentuk:** kucing geometris. Kepala membulat, telinga triangular, badan satu massa tunggal,
tanpa garis luar tebal. Semua bentuknya bisa digambar dari lingkaran, kapsul, dan segitiga.
**Peran:** pembimbing, bukan wasit. Ia menemani murid yang salah, tidak menghukumnya.

Kenapa geometris: aset ini hidup di ukuran 22px (avatar panel) sampai 512px (ikon). Bentuk
organik hancur di ujung bawah rentang itu. Bentuk geometris tetap terbaca.

### Aset

| Berkas | Pakai untuk |
| --- | --- |
| `paw-mascot-full.svg` | maskot badan penuh: onboarding, halaman kosong, layar hasil |
| `paw-mascot-head.svg` | kepala saja: avatar, daftar, tempat sempit |
| `paw-mascot-full-512.png` | pratinjau, berbagi, tempat yang tidak bisa memuat SVG |
| `paw-mascot-head-512.png` | ikon, thumbnail |
| `fiezel-paw.svg` | jejak kaki (bukan maskot). Ini tanda tempel merek, dipakai lewat `FiezelIcons.markup('paw')` |

Satu sumber bentuk paw: `features/ui/fiezel-icons.js`. Jangan menyalin path SVG paw ke berkas lain.
`paw-mascot-test.js` menjaga aturan ini dan akan gagal kalau dilanggar.

### Yang tidak boleh dilakukan pada maskot

- Jangan memutar, memiringkan, atau memantulkan (mirror) badannya. Arah pandangnya bagian dari karakter.
- Jangan mengubah warnanya per fitur. Satu PAW, satu palet.
- Jangan menambahkan mata ketiga, kacamata, topi, atau atribut musiman.
- Jangan memberinya balon kata berisi klaim (lihat bagian 5).
- Jangan meregangkan tidak proporsional. Skala seragam saja.

## 2. Palet

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| Marun | `#8C2233` | warna utama merek, tindakan primer |
| Marun gelap | `#6D1926` | bayangan tombol, tekan |
| Emas | `#D8B36B` | aksen, cincin ekor, tindakan sekunder |
| Kuning | `#FFD94F` | badan maskot |
| Kuning tua | `#F8CF4D` | bayangan badan maskot, confetti |
| Krem | `#FDFAF3` | latar halaman |
| Krem hangat | `#FFF4DA` | perut, dalam telinga, bidang lembut |
| Gelap | `#1B1418` | tinta paling gelap, garis mata |
| Cokelat | `#33201F` | garis wajah, kumis, hidung |
| Blush | `#F0A0AC` | pipi, dalam telinga |
| Merah | `#D9536A` | salah, hati, peringatan lembut |

### Peringatan tabrakan token

Nama token `--fz-gold`, `--fz-ink`, dan `--fz-line` sudah dipakai `style.css` dengan nilai yang
berbeda dari paket motion (`#d9a441`, `#2c1b1c`, `#ecdec0`). Karena itu
`features/mascot/fiezel-motion.css` memasang tokennya pada kelas `.fz-mascot` / `.fz-motion`,
BUKAN di `:root`. Kalau ada yang memindahkannya ke `:root`, palet seluruh aplikasi ikut berubah
dan kontrasnya berhenti sesuai `contrast-test.js`.

## 3. Tipografi

**Plus Jakarta Sans** untuk semuanya. Bobot 400 badan teks, 700 penekanan, 800 angka besar.
Tidak ada huruf display kedua, tidak ada serif. `paw-mascot-test.js` menjaga agar Home tidak
kembali memakai huruf display.

## 4. Token gerak

| Token | Nilai | Untuk |
| --- | --- | --- |
| `--fz-spring` | `cubic-bezier(.34, 1.56, .64, 1)` | gerak yang menghidupkan: pop, lompat, tekan |
| `--fz-out` | `cubic-bezier(.22, 1, .36, 1)` | gerak yang menenangkan: masuk, keluar, geser |
| `--fz-fast` | `120ms` | reaksi sentuh, hover |
| `--fz-base` | `240ms` | transisi elemen |
| `--fz-slow` | `420ms` | masuknya panel, layar |

**Aturan keras:** hanya `transform` dan `opacity` yang dianimasikan. Bukan estetika, ini soal
biaya. Properti lain memaksa layout atau paint di setiap frame, dan aplikasi ini harus tetap
mulus di ponsel murah. Satu pengecualian yang disepakati: `stroke-dashoffset` untuk cincin
progres dan centang SVG, karena tidak ada cara lain menggambarnya.

**Kurangi gerak wajib dihormati.** Dua jalur, keduanya sudah terpasang:
`@media (prefers-reduced-motion: reduce)` untuk permintaan sistem, dan `body.reduce-motion`
untuk murid yang mematikannya sendiri di Pengaturan (`state.preferences.motion === false`).
Di JS, gerbangnya `pawMotionAllowed()` di `app.js`. Kalau salah satu aktif, maskot tidak
bereaksi sama sekali — bukan bereaksi lebih pelan.

## 5. Empat belas state maskot

Komponen `<fiezel-mascot>` (`features/mascot/fiezel-mascot.js`) punya 14 state:

| State | Kapan |
| --- | --- |
| `idle` | bawaan; bernapas, kedip sesekali |
| `greeting` | menyapa; melambai |
| `curious` | soal baru muncul, murid berpikir |
| `thinking` | jawaban AI sedang diproses |
| `listening` | latihan dengar sedang jalan |
| `encouraging` | jawaban benar, dorongan biasa |
| `celebrating` | benar berturut-turut; ada 3 tingkat eskalasi |
| `confused` | jawaban salah |
| `hinting` | petunjuk diberikan; bohlam menyala |
| `completion` | sesi tuntas; lompat besar + confetti |
| `proud` | lencana atau pencapaian |
| `sleepy` | lama tidak ada interaksi |
| `sad` | streak putus |
| `love` | ditandai favorit |

### Event `react()`

Pemanggil tidak memilih state langsung. Pemanggil melaporkan APA YANG TERJADI, komponen yang
memilih state dan tingkatnya. Itu sebabnya benar tiga kali berturut-turut terasa berbeda dari
benar sekali, tanpa satu pun pemanggil menghitungnya sendiri.

`onboard` · `question-shown` · `hover-answer` · `answer-picked` · `correct` · `wrong` · `hint` ·
`listening-start` · `listening-stop` · `lesson-complete` · `streak-lost` · `favorite` ·
`badge-earned` · `idle-timeout` · `wake`

Pintu masuknya satu: `self.FiezelPaw.react(event, detail)`. Jangan memanggil elemennya langsung —
ada lebih dari satu maskot hidup di halaman (gelembung pembimbing dan panel Home), dan keduanya
harus bereaksi bersamaan.

## 6. ATURAN KLAIM JUJUR

Bagian ini tidak bisa dinegosiasi. Klaim yang tidak bisa dipertahankan merusak kepercayaan lebih
cepat daripada fitur yang hilang bisa memperbaikinya.

### Dilarang

- **Dilarang mengklaim "tanpa kuota" / "tanpa internet" / "sepenuhnya offline.**" Aplikasi ini
  PWA dengan shell yang di-precache. Shell-nya jalan offline. Suara neural, tutor AI, dan
  pembimbing AI butuh jaringan. Mengklaim tanpa kuota adalah klaim yang salah, bukan
  penyederhanaan.
- **Dilarang menjanjikan suara neural yang jalan offline.** Model suaranya tidak ikut
  di-precache (`pwa-cache-test.js` justru MELARANG `vendor/kokoro-*` masuk precache — 265 KB+
  di jalur pemasangan akan mematikan pemasangan di jaringan lemah). Kalau jaringan tidak ada,
  yang jalan adalah suara bawaan peranti. Katakan begitu.
- Dilarang mengklaim jaminan hasil ("pasti lulus", "naik level dalam 30 hari").
- Dilarang mengklaim sertifikasi, afiliasi, atau pengakuan resmi CEFR. Aplikasi ini MEMETAKAN
  materi ke tingkat CEFR A1–C2. Itu bukan hal yang sama dengan diakui secara resmi.
- Dilarang membulatkan angka konten ke atas. Kalau isinya 129, tulis 129, bukan "130+".

### Angka resmi

Hanya angka ini yang boleh dipakai di teks pemasaran, halaman toko, dan salinan dalam aplikasi:

- **129 grammar lesson** (3.225 soal)
- **1.765 kosakata**
- **300 bacaan** (1.500 soal)
- **36 listening + 36 speaking**
- **CEFR A1–C2**
- **Gratis tanpa langganan**

Kalau bank konten berubah, angka di sini yang diperbarui lebih dulu, lalu tempat lain menyusul.
Angka yang berbeda-beda antar halaman lebih merusak daripada angka yang sedikit lama.

### Kalimat yang boleh dipakai

- "Materi dan latihan bisa dibuka tanpa internet. Suara neural dan tutor AI butuh jaringan."
- "Dipetakan ke tingkat CEFR A1–C2."
- "Gratis, tanpa langganan."

## 7. Sumber

- Komponen dan CSS gerak: `features/mascot/` (`fiezel-mascot.js`, `fiezel-motion.css`,
  `micro-ui.css` sebagai referensi yang belum dipakai)
- Satu sumber bentuk paw: `features/ui/fiezel-icons.js`
- Gerbang otomatis yang menjaga panduan ini: `paw-mascot-test.js`, `ui-structure-test.js`,
  `contrast-test.js`, `a11y-test.js`, `pwa-cache-test.js`, `boot-order-test.js`
