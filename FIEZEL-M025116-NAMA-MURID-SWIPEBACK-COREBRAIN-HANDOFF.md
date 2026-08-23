# m025-116 — Nama murid, swipe-back yang benar-benar berfungsi, dan Core Brain v2

OWNER (tiga permintaan dalam satu pesan):

1. "sekarang Jahran adalah single user, ubah agar appsnya menyesuaikan dengan nama user,
   misalnya saat masuk tanya dulu nama mereka di onboarding (WAJIB)"
2. "swipe back masih cacat sistem, meski di perbaiki, misalnya sudah masuk kedalam folder,
   dan ingin kembali, ketika swipe back malah stuck screen pokoknya masih error, inspeksi,
   diagnosa, perbaiki"
3. "kemudian tingkatkan inti otak core FIEZEL agar lebih pintar dan semakin jenius dari pada
   sebelumnya"

Diagnosis untuk (2) dijalankan di peramban sungguhan (Chromium, emulasi Pixel 5, PWA
dimuat dari server lokal), bukan dari membaca kode saja — dan itu yang menemukan penyebab
sesungguhnya, yang ternyata tidak ada di modul riwayat sama sekali.

---

## 0. Perpustakaan mati total — ditemukan di sini, sudah diperbaiki di main

Saat menjalankan reproduksi pertama untuk (2), layar Perpustakaan berbunyi:

> Perpustakaan belum bisa dimuat. Expected ',' or ']' after array element…

`features/library/library-books-v1.json` tidak bisa di-parse, jadi seluruh fitur
Perpustakaan — 9 buku, audiobook, subtitle — mati. Cabang ini memperbaikinya dengan
menambahkan satu koma yang hilang di sambungan antara `the_little_prince` dan
`charlottes_web_guide`.

**Sementara itu, PR #165 (m025-114) memperbaiki berkas yang sama lebih dulu dan sudah
masuk ke `main`**, dengan memulihkan versi sehat terakhir (`9dc132c`) alih-alih menambal
komanya, plus `library-integrity-test.js` sebagai gate baru. Saat `main` digabungkan ke
cabang ini, kedua hasilnya ternyata **identik byte-per-byte** (9 buku, 1.703 kalimat),
jadi tidak ada isi yang hilang dari sisi mana pun dan tidak ada konflik pada berkas itu.

Yang tetap berharga dari #165 bukan perbaikannya melainkan gate-nya: sebelum itu tidak
satu pun dari 64 tes membuka berkas data yang benar-benar dikirim ke perangkat. Gate itu
ikut berjalan di cabang ini.

## 1. Swipe back — diagnosis

### RC1 (penyebab utama): pembungkus `go()` menjatuhkan argumen keduanya

`features/daily-target/fiezel-daily-target.js` membungkus `window.go`:

```js
var guarded = function (view) { … return baseGo(view); };   // SEBELUM
```

`go()` punya **dua** parameter: `go(view, opts)`. `opts.viaHistory === true` adalah
satu-satunya hal yang menahan `go()` supaya tidak mendorong entri riwayat baru. Pembungkus
ini menjatuhkannya, jadi **setiap perpindahan MUNDUR mendorong entri MAJU** — persis gelung
`back → push → back` yang paling dijaga oleh `features/ui/fiezel-back-nav.js`.

Terbukti di peramban. Home → Perpustakaan → kembali:

| tekanan | view    | tumpukan setelahnya          |
|---------|---------|------------------------------|
| —       | library | `view:library ← home`        |
| back #1 | home    | `view:home ← library`  ← **entri baru didorong oleh jalur MUNDUR** |
| back #2 | library | `view:library ← home`        |
| back #3 | home    | `view:home ← library`        |

Murid berpindah-pindah di antara dua layar yang sama **selamanya** dan tidak ada tekanan
kembali yang membawanya keluar. Itulah "stuck screen"-nya.

**Perbaikan:** `return baseGo.apply(this, arguments);` — pembungkus membungkus KEPUTUSAN,
bukan tanda tangan fungsi.

### RC2: dua pemilik riwayat

`guardHistory()` di berkas yang sama mendorong entri `{fiezelDailyLock:true}` miliknya
sendiri saat start (1,2 detik setelah boot, **tanpa syarat**, bahkan ketika kunci tidak
pernah menyala) dan mendorong satu lagi pada setiap `popstate`. Modul back-nav memegang
tumpukan yang ia percaya 1:1 dengan entri yang **ia** dorong; entri asing menggeser
kesejajaran itu, dan sejak saat itu satu tekanan kembali bisa memakan entri yang tidak
diketahui siapa pun. Dari sisi murid: gesturnya jalan, layarnya diam.

**Perbaikan:** `guardHistory()` dihapus. Kunci harian kini hanya mengumumkan dirinya lewat
`body.daily-locked`; app.js membacanya di hook `locked` saat memasang back-nav, dan modul
back-nav yang menahan tekanan kembali. Satu pemilik riwayat, satu tumpukan.

### RC3: "folder" tidak terwakili di riwayat sama sekali

Kategori Classroom, rak buku, kartu flashcard, lesson Grammar, dan layar kuis semuanya
digambar dengan `setApp()` **di dalam satu view**. Tidak satu pun terekam. Tekanan kembali
dari dalam sebuah folder mengambil entri **view**-nya — murid yang cuma ingin naik satu
tingkat terlempar keluar dari seluruh bagian.

**Perbaikan:** lapisan *stage* di app.js, memakai `pushLayer()` milik modul back-nav
(mekanisme yang sama dengan modal dan pembaca perpustakaan — **bukan** pemilik riwayat
kedua lagi). Setiap stage menyimpan **cara menggambar dirinya sendiri**, bukan cara kembali
ke induk; menutup satu stage cukup menggambar apa pun yang kini di puncak. Model itu yang
membuat folder berlapis benar dengan sendirinya, dan yang membuat kuis — yang bisa dimulai
dari hub mana pun — tidak perlu tahu induknya.

Terdaftar: `vocab-flashcards`, `vocab-review`, `grammar-lesson`, `quiz`, `classroom-topic`,
`classroom-lesson`, `tutor-topic`, `tutor-lesson` (Classroom tutor lewat pengait opsional
`FiezelStage`, supaya berkasnya tetap bisa dimuat dan diuji sendirian).

### RC4: tekanan kembali yang berakhir tanpa perubahan apa pun

`handlePop()` bisa berakhir `noop`: entri riwayat habis, layar diam. Contoh nyatanya modal
yang ditutup lewat jalan lain, meninggalkan satu entri mati di dasar tumpukan.

**Perbaikan:** saat tumpukan HABIS dan tidak ada yang berubah, tujuannya jatuh ke beranda
(`action:'fallback'`). Batas `chained` sengaja **tidak** ikut jatuh ke sana: di sana masih
ada entri tersisa dan `chained` sudah dinolkan, jadi tekanan berikutnya melanjutkan
penelusuran — murid tetap maju, hanya lebih pelan.

### RC5: gerbang wajib bisa ditembus di layar pertama

`handlePop()` memeriksa tumpukan kosong **sebelum** `locked()`. Gerbang yang menyala di
layar pertama (kunci target harian, gerbang akun, undangan notifikasi) karena itu bisa
ditembus satu tekanan kembali — dan tekanan itu keluar dari aplikasi. **Perbaikan:** urutan
dibalik; entrinya didorong ulang.

### RC6: satu tarikan jari = dua langkah mundur di Android terpasang

Gestur tepi sintetis dipasang untuk **semua** aplikasi terpasang. Alasan gestur itu ada
hanya berlaku untuk iOS (di sana swipe-back milik chrome Safari, dan di PWA chrome itu tidak
ada). Android terpasang **sudah** punya gestur kembali sistem yang memanggil `history.back()`
sendiri. **Perbaikan:** `needsEdgeSwipe()` memagari pemasangan ke platform yang memang
membutuhkannya, plus jeda 450 ms supaya satu tarikan jari memicu paling banyak satu langkah.

### Verifikasi di peramban (sesudah perbaikan)

| skenario | tekanan kembali | hasil |
|---|---|---|
| Home → Perpustakaan → buku | 1 / 2 / 3 | rak buku → Home → keluar aplikasi |
| Home → Vocabulary → flashcards | 1 / 2 | hub Vocabulary → Home |
| Home → Grammar → lesson → kuis | 1 / 2 / 3 | lesson → hub → Home |
| Home → Classroom → subject → pelajaran | 1 / 2 / 3 | daftar topik → daftar subject → Home |

Setiap tekanan naik **tepat satu tingkat**, dan tidak ada satu pun yang berakhir tanpa
perubahan di layar.

---

## 2. Nama murid (Step 1 perkenalan, WAJIB)

`DEFAULT_USER_NAME` masih berisi satu nama sungguhan sebagai nilai bawaan, dan tidak ada
satu pun layar yang pernah menanyakannya — jadi murid mana pun yang memasang FIEZEL disapa
dengan nama orang lain.

- **Step 1 baru** menanyakan nama; penomoran langkah lain bergeser (LAST_STEP 5 → 6).
- **WAJIB**, dan satu-satunya langkah tanpa "Lewati". Penyimpangan dari batas "tidak pernah
  mengurung" ditulis terbuka di kepala modul: jalan keluarnya tetap satu ketukan (tombol
  menyala pada huruf pertama), dan menutup aplikasi di sini **tidak** menandai perkenalan
  selesai, jadi pertanyaannya datang lagi.
- **Nama diserahkan ke state SEKETIKA** (`onName`), bukan di ujung alur: murid yang menutup
  aplikasi di tengah perkenalan tetap punya namanya saat kembali.
- **Murid lama** yang menyelesaikan perkenalan sebelum rilis ini mendapat **satu langkah
  saja** (`show(env,{nameOnly:true})` dari jalur boot), bukan seluruh perkenalan.
- `DEFAULT_USER_NAME` kini kosong; `FALLBACK_LEARNER_NAME` adalah sapaan **netral**, bukan
  nama orang.
- Nama bisa diganti kapan saja dari Pengaturan, tetapi **tidak bisa dikosongkan** dari sana —
  kolom kosong berarti "tidak diubah", dan itu dikatakan kepada murid.

Nama yang dipaku di kode dibersihkan dari: `app.js`, `sw.js`, `manifest.json`,
`fiezel-core-worker.js`, `fiezel-report-worker.js`, `fiezel-tutor-v3.js`,
`fiezel-tutor-dialog.js`, `creator-report-setup.html`, `creator-report-dashboard.html`,
serta bank materi `classroom-lessons-v1.json` dan `speaking-bank-v1.json` (token `{name}`,
diganti sekali saat paket dimuat — paketnya di-cache, jadi tidak ada titik render yang bisa
lupa).

Pengingat push Core Brain ikut menyapa nama: klien mengirim `activity.learnerName` ke
backend akun Puter **milik murid sendiri**, dan naskah janji privasi di Step 1 ditulis sesuai
kenyataan itu, bukan "nggak dikirim ke mana-mana" yang akan dilanggar oleh kodenya sendiri.

---

## 3. Core Brain v2 — `features/brain/fiezel-core-brain.js`

Kebijakan lama berdiri di atas **rata-rata dan ambang tetap**. Empat hal yang tidak bisa
dilihat cara itu, dan keempatnya menentukan apakah murid benar-benar maju:

1. **Rata-rata tidak punya arah.** Akurasi 60% dari murid yang naik dari 40% dan yang turun
   dari 80% terlihat identik.
2. **"Level ± 1" bukan kesulitan yang tepat.** Tidak ada model yang bisa menjawab "soal
   setingkat apa yang peluang benarnya ~80%".
3. **Skill lemah belum tentu akar masalah.** Gagal di third conditional sering sebenarnya
   gagal di past perfect.
4. **Lupa tidak seragam.** Satu `stability` yang naik pelan tidak membedakan materi yang
   sudah diingat lima kali dari yang baru sekali benar.

Tujuh model murni (tanpa DOM / jaringan / state), sehingga setiap keputusan bisa diuji
sebagai **angka**:

| | model | keputusan yang dipengaruhi |
|---|---|---|
| A | Kemampuan laten **3PL** (Rasch + Elo daring, lantai tebakan 0,25 untuk pilihan ganda empat opsi) | taksiran level, kesulitan |
| B | Kesulitan optimal (target peluang benar 0,80 **teramati**) | tingkat soal, label pita |
| C | Paruh-waktu ingatan (pengulangan eksponensial, lapse memotong tajam) | jadwal ulang, urutan review |
| D | Tren & momentum (regresi kuadrat terkecil per blok 5 jawaban) | naik/turun kesulitan, ukuran sesi |
| E | Graf prasyarat skill (16 keluarga grammar + urutan CEFR) | fokus = akar masalah, bukan gejala |
| F | Profil waktu belajar | jam pengingat |
| G | Beban kognitif dalam sesi (melambat **DAN** makin sering salah) | panjang sesi, pace |

**Catatan kalibrasi.** Lantai tebakan 0,25 dimodelkan eksplisit; tanpa itu murid yang
menjawab asal terbaca sebagai "sedikit tahu", dan kekeliruan itu merambat ke setiap
keputusan lain. Dengan `a = 1,5`: soal setingkat kemampuan ≈ 62% benar, satu tingkat di
bawah ≈ 86%, satu tingkat di atas ≈ 39%. Target 0,80 (bukan 0,85 yang biasa dikutip) karena
0,85 berlaku untuk tugas **tanpa** tebakan.

**Lapisan, bukan pengganti.** `refinePolicy()` menyempurnakan `fiezel-adaptive-policy-v1`
dan mengembalikan skema yang sama — protokol 1.7 antara aplikasi dan Core Worker tidak
berubah, mode pemulihan dan riwayat hasil kebijakan v1 tetap utuh, dan lapisan ini bisa
dimatikan tanpa mematikan kebijakan. **Bukti tipis (< 0,25) berarti v2 hanya MELAPOR**,
tidak mengambil satu keputusan pun.

**Di mana ia berjalan.** Di perangkat murid, karena di sanalah datanya: riwayat jawaban
lengkap, waktu jawab tiap soal, dan jadwal ulang per materi tidak pernah dikirim ke mana pun
(`observability-privacy-test.js` menjaga batas itu, dan rilis ini tidak melonggarkannya).
Yang dikirim ke Core Worker hanyalah **ringkasan keputusannya**, dan worker memakai ringkasan
itu (`refinePolicyWithBrain`, setiap angka dijepit ulang di sisi server) supaya menyalakan
Core Worker tidak lagi berarti **membatalkan** penalaran v2.

**Terlihat oleh murid.** Kartu "Core Brain v2" di tab Adaptive Engine menampilkan angka yang
benar-benar dipakai untuk memilih soal berikutnya. Saat buktinya tipis, kartu itu
mengatakannya apa adanya.

Verifikasi di peramban dengan riwayat 90 jawaban: kemampuan B1 (indeks 2,56), tren grammar
`improving` sementara keseluruhan `plateau`, 2 materi rawan lupa, dan kebijakan akhir membawa
kode `brain_optimal_challenge` / `brain_trend_plateau` / `brain_memory_at_risk`.

---

## Gate

- **Baru:** `core-brain-v2-test.js` (27 pemeriksaan; terdaftar di `quality.yml`). Ia tidak
  memeriksa "apakah ada modelnya" melainkan apakah **keputusannya benar** — antara lain:
  dua deret dengan rata-rata **identik** (satu naik, satu turun) harus menghasilkan pembacaan
  yang berlawanan; kesulitan pilihan harus benar-benar mengembalikan peluang target;
  prasyarat yang sudah dikuasai **tidak boleh** dilatih ulang; melambat tanpa makin sering
  salah **bukan** kelelahan.
- **Diperluas:** `back-nav-test.js` (+11) mengunci keenam akar masalah; `onboarding-test.js`
  (+8) mengunci langkah nama, termasuk bahwa ia wajib **dan** tidak mengurung. Fake DOM-nya
  kini melihat `<input>`, bukan hanya `<button>`.
- Seluruh gate `quality.yml` hijau, termasuk `library-integrity-test.js` yang datang
  bersama `main`. Penanda rilis dinaikkan bersama ke `m025-116` (`main` sudah memakai
  `m025-114` untuk PR #165).

---

## Catatan penggabungan: `main` bergerak dua kali selama rilis ini

`main` menyerap dua PR lain saat cabang ini berjalan, dan keduanya mengklaim penanda
milestone berurutan — #165 mengambil `m025-114`, lalu #163 mengambil `m025-115`. Rilis ini
karena itu bergeser dua kali dan berakhir di **`m025-116`**; ketiga penandanya tetap
dinaikkan bersama, sesuai ritual.

Penggabungan kedua (#163: tes penempatan 25 soal + bank listening) berkonflik di tiga
tempat, dan cara penyelesaiannya perlu dicatat karena satu di antaranya tidak sepele:

- **`sw.js`** — hanya `SW_REV`.
- **`fiezel-onboarding.js`** — hanya baris komentar: `main` mengubah "150 soal" menjadi
  "25 soal", cabang ini mengubah "Step 3" menjadi "Step 4" (pergeseran karena langkah nama).
  Keduanya benar, jadi keduanya dipakai.
- **`app.js`, `quizLoop()`** — konflik sungguhan. Fungsi itu satu baris panjang, dan kedua
  sisi mengubahnya: `main` menambahkan dukungan soal listening (opsi terkunci sampai audio
  benar-benar berbunyi) dan melonggarkan validasi penempatan dari 150 ke jumlah apa pun;
  cabang ini menambahkan pendaftaran stage. **Sisi `main` diambil utuh**, lalu dua delta
  cabang ini dipasang ulang di atasnya — pendaftaran stage, dan tombol "Keluar" yang tidak
  lagi menutup sesinya sendiri karena `leave()` milik stage yang memegangnya.

Diverifikasi di peramban sesudah penggabungan: tes penempatan 25 soal milik `main` berjalan,
stage-nya terdaftar, dan tekanan kembali dari dalam kuis keluar dengan `activeSession`
benar-benar tertutup — bukti bahwa pemilik tunggal itu bekerja lewat jalur riwayat, bukan
hanya lewat tombol.

---

## Status rilis — DRAFT, menunggu OWNER

PR #166 sengaja **draft**. Dua job merah di CI, dan keduanya perlu dicatat di sini supaya
tidak dibaca ulang sebagai kegagalan rilis ini.

### `A12 Evidence Gatekeeper` — kontrol yang bekerja sebagaimana mestinya

A12 memblokir PR yang menyentuh jalur suara/Classroom bila ia BUKAN draft dan tidak membawa
`<!-- FIEZEL_PHYSICAL_ACCEPTANCE: ACCEPTED -->` atau `WAIVED_BY_OWNER`. Rilis ini menyentuh
`features/tutor-classroom/**` dan `features/neural-voice/fiezel-diag-panel.js`, jadi ia
memang termasuk.

Penandanya **tidak** ditambahkan, dan itu keputusan yang disengaja: penanda itu adalah
pernyataan OWNER bahwa rilis sudah dicoba di perangkat sungguhan. Menuliskannya dari sisi
yang mengerjakan patch berarti membatalkan justru kontrol yang A12 jaga — gerbang yang bisa
dibuka sendiri oleh yang lewat bukan gerbang. Jalan yang sah sudah disediakan gate itu
sendiri: PR draft menghasilkan `HOLD_DRAFT` (peringatan, bukan galat), dan dengan status itu
**A12 hijau** — bersama `quality`, `A6`, `A7`, `A9`–`A14`, dan `MASTER-only authority`.

**Yang dibutuhkan dari OWNER:** coba rilis ini di perangkat — terutama empat skenario
swipe-back di bagian 1, langkah nama di perkenalan, dan suara Classroom — lalu tandai
penerimaannya. Sesudah itu PR bisa keluar dari draft.

### `audiobook-safari` — satu-satunya yang merah, dan sudah rusak sebelum rilis ini

Gagal dalam 7 detik pada `cd vendor/supertonic-3: No such file or directory`. Direktori itu
**dihapus dari repo di m025-100** (`8a69bd0`, "mesin lokal dihapus") dan tidak ada di `main`
maupun di cabang ini. Rilis ini tidak menyentuh `vendor/` sama sekali.

Buktinya bukan dugaan: **PR #165 juga merah pada job yang sama** dan tetap di-merge. Gate itu
berjalan pada setiap PR yang menyentuh `features/library/**` atau `features/neural-voice/**`,
jadi ia sudah rusak untuk seluruh PR semacam itu sejak m025-100.

**Usulan, dikerjakan terpisah** supaya perbaikan CI tidak tercampur ke rilis produk:
`.github/workflows/m02547-neural-library-safari.yml` dan `m02526-product-neural-safari.yml`
dihapus atau dinonaktifkan. Keduanya menguji mesin suara lokal yang memang sengaja dibuang di
m025-100; gate yang menguji sesuatu yang tidak lagi dikirim tidak menjaga apa pun, dan merah
permanennya justru melatih orang mengabaikan CI - persis kebiasaan yang membuat kerusakan
Perpustakaan di bagian 0 lolos selama beberapa commit.
