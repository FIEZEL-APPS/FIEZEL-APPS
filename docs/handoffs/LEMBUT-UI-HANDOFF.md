# Arah "Lembut": lima lapisan token, dan apa yang belum dikerjakan

Otoritas: OWNER. OWNER memilih arah B ("Lembut") dari empat mock di PR #402 dan meminta
tampilan aplikasi diganti dengannya. Dokumen ini mencatat apa yang sudah pindah, **di mana
warna aplikasi sebenarnya diputuskan** (jawabannya bukan satu tempat), dan apa yang sengaja
ditahan supaya pembaca berikutnya tidak menyangkanya terlupakan.

Status: **palet, material, radius, bayangan, dan tipografi layar SUDAH pindah** (m025-302).
Tata letak per layar dan penggantian huruf ke Quicksand/Nunito **BELUM** — keduanya ditahan
dengan alasan yang ditulis di bawah, bukan karena kehabisan waktu.

## Aturannya, satu kalimat

**Bidang di arah ini dibatasi oleh bayangan, bukan oleh warnanya sendiri.**

Itu satu kalimat yang menjelaskan hampir setiap perubahan di commit ini. Kuning penuh
`#FFC700` dulu perlu keras karena ia yang harus menandai di mana sebuah kartu berakhir;
begitu kedalaman dipikul bayangan lembut, kuning penuh kehilangan pekerjaannya dan hanya
menyisakan kerasnya. Hal yang sama berlaku untuk garis tepi tinta 1,5–2px dan bayangan
keras `0 4px 0` — semuanya penanda batas yang sudah punya pengganti.

## Warna aplikasi diputuskan oleh LIMA blok, bukan satu

Ini bagian yang paling mahal untuk dipelajari ulang, jadi ia ditulis lebih dulu. Tidak satu
pun dari lima lapisan di bawah bisa dipercaya dari membaca berkasnya saja. Semuanya dipetakan
dengan **mengukur nilai terhitung di Chromium**, dan setiap kali hasilnya berbeda dari yang
tertulis di berkas:

| # | Lapisan | Yang sebenarnya ia putuskan |
|---|---|---|
| 1 | `style.css` `:root` pertama (baris ~6) | palet dasar |
| 2 | `style.css` `:root` kedua (baris ~787) | menimpa yang pertama |
| 3 | `style.css` "PALET CERIA PASTEL" (baris ~5007) | **menang** untuk bidang |
| 4 | `features/ui/fiezel-lux.css` | yang benar-benar **mengecat** permukaan terlihat |
| 5 | `fiezel-2.css` (dimuat terakhir) | menang untuk radius & tombol |

Blok 1 dan 2 masih memegang palet generasi lalu meski blok 3 sudah pastel. Komentar di blok 2
**sendiri** sudah memperingatkan jebakan ini ("blok ini gampang terlewat justru karena ia yang
menang"), dan peringatan itu tetap tidak cukup — lubangnya baru tertutup ketika seseorang
mengukur, bukan membaca. `tests/pastel-field-contrast-test.js` sekarang membaca **kedua** blok
`:root` dan menolak jalan kalau salah satunya hilang.

Kalau kamu mengubah warna dan layarnya tidak berubah, jangan menambah `!important`. Ukur dulu:
buka halaman, ambil `getComputedStyle`, dan cari lapisan mana yang sebenarnya menang.

## Yang sudah pindah

- Kertas hangat `#FBF7F3` menggantikan krem kuning; tinta `#2E2724` (13,8:1); garis `#EFE7DE`.
- **Aksen utama jadi maroon `#9B3A4A`** (putih di atasnya 6,8:1). Sebelumnya `fiezel-lux.css`
  memetakan `--accent` ke `--lux-ink`, jadi satu-satunya penekanan yang tersedia adalah
  gelap-di-atas-terang dan **setiap tombol utama lahir hampir hitam**. Sekarang aksen punya
  warnanya sendiri, dan tinta kembali sekadar tinta.
- Kuning penuh turun pangkat jadi bidang emas pucat `#F7EACB`.
- Selimut kuning se-halaman (dua radial di `body::before`) diredam. Inilah yang membuat setiap
  tangkapan layar berwarna kuning betapapun kartunya diputihkan.
- Langit harian (`SCENE_STOPS` di `app.js`) **tetap bergerak** sepanjang hari; amplitudonya saja
  yang diturunkan. Puncak tengah hari `#F4EDE6`. Yang berpindah kini suhu warna, bukan warnanya.
- Radius naik ke 34/28/22/18/14.
- Serif berhenti dipakai untuk judul layar dan onboarding. **Tokennya tetap ada**:
  `tests/splash-choreography-test.js` mensyaratkan `--fz-display:'FZ Instrument Serif'` hadir,
  dan wordmark splash masih memakainya. Jangan mencabut tokennya.

## Regresi maskot yang ditemukan sambil jalan

OWNER melaporkan "maskot di Tanya Mira jelek sekali". Sebabnya bisa diukur, dan ada **dua**:

1. **Resep potong-kepala hilang.** Kelas `has-mascot` masih dipasang dari JS (`app.js`
   `pawFaceMarkup`, `fiezel-coach-bubble` `pawHost`) dan masih dirujuk **tiga komentar** sebagai
   "resep yang MEMOTONG badan jadi lingkaran" — tetapi resepnya tinggal di `fiezel-motion.css`
   dan **tidak ikut pindah** ketika `features/mascot/fiezel-character.css` menggantikannya di
   m025-303. Sejak itu cap kecil merender pose bertubuh penuh apa adanya: di cap 42px,
   `full-neutral` (558×1129) terukur 38×77 — badan meluber, wajah tinggal ±12px.
2. **Bantalan tombol umum.** `body button{padding:13px 20px}` di `fiezel-2.css` berlaku juga pada
   FAB bulat 58×58 yang isinya cuma maskot. Kotak isinya tinggal 16×30, dan maskotnya **15×30**.
   Memotong kepala saja tidak akan menolong — yang dipotong tetap akan 15px.

Sesudah perbaikan: Tanya 15×30 → 56×57, Home 38×77 → 42×42, Progres 4×18 → 44×44.

**Ambang yang dipakai: ~72px sisi terpanjang.** Di bawah itu, pose bertubuh penuh tidak
menyisakan piksel yang cukup untuk sebuah wajah — pakai pose kepala (ada sembilan di
`assets/characters/manifest.json`) atau ikon paw, jangan tokoh utuh yang dikecilkan.

Dua percobaan yang **gagal** sengaja ditinggalkan sebagai komentar di `fiezel-character.css`:

- `position:relative` pada wadah menimpa `position:fixed` milik FAB → tombolnya lepas ke
  `x=-16`, separuh keluar layar.
- Trek grid `auto` diukur dari isinya → kolomnya menyusut ke 27,7px meski bantalannya sudah nol.
  `1fr` mengambil ukurannya dari wadah yang sudah pasti.

## Gerbang yang ikut dipindah — bukan dilonggarkan

`tests/pastel-field-contrast-test.js` memaku `--cream`/`--ink`/`--yellow` sebagai "brief OWNER".
Kuncinya dipindah ke nilai baru **dan** palet lama dimasukkan ke `SUPERSEDED` supaya tidak bisa
kembali diam-diam. Seluruh assert kontrasnya tetap hidup dan tetap **menghitung rasio**, bukan
mencocokkan hex.

Preseden prosedurnya tertulis di `design/redesign-v1/spec/LAPORAN.md`: sunting nilai **dan**
pindahkan kunci test **di commit yang sama**, supaya tidak pernah ada jendela waktu ketika palet
berjalan tanpa ada yang menjaganya. Ikuti itu, jangan mematikan gerbangnya.

Ikut dipindah dengan alasan yang sama: literal `'#FFC700'` di dalam assert
`tests/quota-notice-a11y-test.js`, dan `id-golden-baseline.json` (ditulis ulang dengan
`--write-baseline` karena `manifest.json` + `quota-copy.js` berubah **hex-nya saja**; assert
literal teks Indonesia di gerbang itu tetap hijau tanpa disentuh, dan justru itulah yang
membuktikan tidak ada teks murid yang berubah).

## Yang BELUM dikerjakan — langkah berikutnya

Ditahan dengan sengaja, bukan terlupakan:

1. **Tata letak per layar.** Struktur kartu, susunan seksi, dan penempatan maskot per layar
   masih mengikuti struktur lama. Artboard di `design/redesign-v2/` merancang ulang tata
   letaknya; yang sudah dipindah baru palet/material/tipografinya. Ini pekerjaan terbesar yang
   tersisa.
2. **Huruf Quicksand/Nunito.** Arah B memakainya, tetapi menambah berkas woff2 baru menyentuh
   muatan jalur pasang PWA (precache `sw.js` + preload `index.html`). Itu keputusan OWNER soal
   ukuran unduhan murid, jadi jangan diputuskan sendiri.
3. **Kartu hitam "LEVEL KAMU" di Progres** dibiarkan — ia elemen kontras yang disengaja, bukan
   sisa palet lama. Kalau OWNER mau ia ikut melembut, itu permintaan terpisah.
4. **Palet logo splash tidak digeser.** `features/brand/fiezel-splash.js` menandainya "terkunci
   (ruling OWNER)". Wordmark splash justru **diselaraskan ke ramp logo itu** (`#FFD94F→#F0C241`)
   supaya splash tidak punya dua emas berbeda. Jangan menggeser salah satunya sendirian.

   **Wordmark TOPBAR beda perlakuan, dan bedanya punya alasan.** `--wordmark-accent-hi/lo` di
   `style.css` IKUT pindah ke maroon, karena komentarnya sendiri sudah menyatakan aturannya:
   "terracotta sebagai AKSEN" bukan warna merdeka milik wordmark, melainkan peran AKSEN palet
   yang kebetulan terracotta waktu itu. Aksennya pindah, jadi balok ikut. Logo splash tidak
   punya kalimat seperti itu — yang ia punya justru tanda terkunci. Jadi aturannya: **ikuti apa
   yang tertulis di tempat warnanya didefinisikan**, jangan menyamaratakan "semua merah harus
   sama" ke arah mana pun.

## Gerbang hanya memaku nilai BARU — itu setengah perlindungan

Ini pelajaran dari review PR #404, dan ia berlaku untuk setiap penggantian palet berikutnya.

`tests/pastel-field-contrast-test.js` memaku nilai **baru** (`BRIEF_PALETTE`) dan pakuan itu
hanya membaca `style.css`. Nilai **lama** tidak dilarang di mana pun, jadi berkas lain bebas
menyimpannya dan tidak ada gerbang yang merah. Akibatnya nyata: `features/tutor-classroom/tutor-v3.css`
lolos **setengah pindah** — `--ui-bg`/`--ui-text` ikut arah baru sementara `--ui-accent`
tertinggal terracotta, jadi layar Ruang Kelas memakai aksen yang sudah dipensiunkan di seluruh
aplikasi lain.

Yang menutupnya adalah sisi satunya: memasukkan nilai lama ke daftar `SUPERSEDED`, yang memindai
lima berkas dan menolak nilai itu muncul lagi di mana pun. Daftar itu langsung membayar sendiri —
ia menemukan **29 cadangan `var(--accent,#C2402C)`** di `style.css` yang selamat dari penggantian
pertama karena peta penggantinya tidak memuat hex itu.

**Jadi setiap kali kamu memindahkan sebuah token: paku nilai barunya DAN larang nilai lamanya.**
Memaku yang baru saja hanya menjaga satu berkas; melarang yang lama menjaga semuanya.

## Jebakan yang akan memakan waktumu

- `index.html` menyimpan **salinan apa adanya** blok `.fiezel-splash,.fiezel-ob{…}` dari
  `style.css` sebagai CSS kritis, dan markup splash statisnya harus **identik byte** dengan
  `FiezelSplash.markup()`. `tests/splash-first-paint-test.js` membandingkan ketiganya. Satu
  suntingan di `style.css` = tiga tempat yang harus ikut.
- Suite lokal menulis ulang timestamp di `reports/*.json` — pulihkan dengan `git restore`, jangan
  di-commit.
- Suite lokal juga meninggalkan `CF-LIVE-REPORT.json` di akar, yang membuat
  `tests/cf-live-selftest.js` **merah pada run kedua** di mesin yang sama. Hapus berkas itu
  sebelum menjalankan suite ulang. Di CI tidak terjadi karena checkout selalu segar.
- Nomor build **jangan diketik tangan**. Jalankan `node tools/bump-build.mjs "<alasan>"`; ia
  menulis keempat tempat sekaligus, dan `tests/coordination-guard-test.js` akan menangkapmu
  kalau tidak.
