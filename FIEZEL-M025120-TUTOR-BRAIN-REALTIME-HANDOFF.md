# m025-120 — Tutor Brain v3: dari perencana sesi menjadi guru yang menjawab

OWNER:

> "otakcore adaptive belum sempurna, belum sepenuhnya adaptive terhadap user, belum bisa
> berinteraksi realtime, belum seperti guru atau tutor sungguhan, tingkatkan lagi brain core
> nya lebih tinggi"

Tiga keluhan, dan ketiganya menunjuk ke satu kekurangan yang sama.

---

## 0. Kenapa Core Brain v2 belum terasa seperti guru

Core Brain v2 (m025-117) adalah **perencana sesi** yang baik: ia menaksir kemampuan dengan
3PL IRT, memilih kesulitan optimal, memodelkan lupa, dan menyusun porsi review. Tetapi ia
memutuskan **sekali, di awal sesi**, lalu diam sampai sesi berakhir. Kolam soalnya dikunci
di depan.

Guru sungguhan tidak bekerja begitu. Gelung seorang guru berjalan pada **setiap** jawaban:

```
amati jawaban  ->  diagnosis KENAPA  ->  putuskan tindakan  ->  sampaikan  ->  amati lagi
```

Perbedaannya bukan kecepatan, melainkan **jenis informasi** yang dipakai. v2 tahu murid
salah. Guru tahu murid salah **karena apa** — dan itu dua hal yang sama sekali berbeda.
Murid yang memilih `prepares` pada `Look! The chef ___ dinner` tidak sekadar salah: ia sedang
memperlakukan penanda waktu sebagai hiasan. Sampai keyakinan itu disentuh, soal berikutnya
dengan pola yang sama akan salah lagi, dan latihan berubah menjadi latihan gagal.

Itulah ketiga keluhan owner, dinyatakan ulang:

| Keluhan owner | Penyebab teknis |
|---|---|
| "belum sepenuhnya adaptive terhadap user" | keputusan diambil sekali di awal, dari agregat, bukan dari jawaban barusan |
| "belum bisa berinteraksi realtime" | tidak ada gelung per-jawaban sama sekali; soal salah hanya membuka kunci jawaban |
| "belum seperti guru atau tutor sungguhan" | tidak ada diagnosis sebab, tidak ada scaffolding, tidak ada yang **diucapkan** |

**Bahannya ternyata sudah ada dan selama ini dibuang.** Setiap distraktor di
`grammar-templates.json` membawa nama miskonsepsinya sendiri
(`"habitual-aspect overgeneralization"`, `"confusing in-progress with completed result"`),
dan `makeGrammarQuestion` membuangnya sebelum soal sampai ke kuis.

---

## 1. Yang ditambahkan — `features/brain/fiezel-tutor-brain.js` (v3)

Modul murni: tanpa DOM, tanpa jaringan, tanpa state global, tanpa jam sendiri (waktu masuk
sebagai argumen). Seluruh keputusan mengajar bisa diuji sebagai nilai.

**A. Diagnosis miskonsepsi** — dari pilihan yang **diambil**, bukan dari benar/salah. Dua
murid yang sama-sama salah pada soal yang sama, tetapi memilih distraktor berbeda, menerima
diagnosis berbeda. Soal tanpa peta miskonsepsi (vocabulary, reading) tetap terdiagnosis di
tingkat skill, dan modulnya **mengakui** presisinya lebih kasar lewat `precision`, bukan
menyembunyikannya.

**B. Model waktu jawab** — `guess` / `retrieved` / `reasoned` / `struggled`, relatif terhadap
kebiasaan murid **sendiri** (median waktu jawabnya), bukan ambang tetap. Murid yang memang
lambat membaca tidak boleh selamanya terbaca "tersendat". Benar dalam 1,2 detik pada pilihan
ganda empat opsi bukan penguasaan — itu keberuntungan seperempat, dan sekarang terbaca begitu.

**C. Keputusan per-jawaban** — delapan tindakan, diputuskan **ulang setiap jawaban**, dalam
urutan kegentingan yang disengaja:

```
breathe  (lelah)          ->  mengalahkan segalanya: latihan di atas kelelahan tidak menempel
reteach  (miskonsepsi 2x) ->  yang perlu disentuh keyakinannya, bukan itemnya
reteach  (3x salah)       ->  berhenti menguji, mulai mengajar
hint     (salah pertama)  ->  beri pijakan, jangan beri jawaban
consolidate (benar, lambat) -> penguasaan dan perhitungan ulang bukan hal yang sama
celebrate (terobosan)     ->  kemajuan yang tidak pernah diucapkan tidak terasa sebagai kemajuan
stretch  (beruntun cepat) ->  soal di bawah kemampuan membuang giliran
wrapup / continue
```

Urutannya penting: murid yang lelah tidak butuh soal yang lebih mudah, ia butuh berhenti.
Memeriksa "mudahkan" lebih dulu akan membuat sesi yang seharusnya sudah selesai berjalan
sepuluh soal lagi.

**D. Tangga scaffolding dengan fading** — `probe -> hint -> worked -> tell`. Bantuan paling
sedikit yang masih mungkin berhasil, naik satu anak tangga hanya setelah gagal lagi. Titik
mulai **tidak pernah** melewati `hint`, betapapun rendah penguasaan murid: kesalahan pertama
selalu dijawab dengan dorongan, bukan dengan contoh yang sudah dikerjakan.

**E. Penyusun ucapan tutor** — apa yang tutor **katakan**, spesifik pada kesalahan barusan.
Tiga aturan yang dipegang setiap baris: memuji apa yang **dilakukan** (tidak pernah orangnya),
menyebut kesalahannya dengan **spesifik**, dan tidak pernah menyodorkan jawaban sebelum
tangga sampai di `tell`.

**F. Ingatan kerja sesi** — apa yang sudah dicoba, penjelasan mana yang sudah gagal, berapa
lama sejak kemenangan terakhir. Tanpa itu setiap jawaban dinilai seolah yang pertama, dan
tutor akan mengulang penjelasan yang barusan tidak nyantol.

**Pemilihan soal jadi hidup.** `selectNext` memilih soal berikutnya dari **sisa** kolam
berdasarkan keadaan sesi sekarang — bukan dari urutan yang dikunci sebelum soal pertama
dijawab. Peluang benar diprediksi memakai `successProbability` milik Core Brain v2: satu
model kemampuan, dua pemakai. Menduplikasinya akan membuat dua taksiran yang pelan-pelan
berbeda, dan perbedaan itu tidak akan terlihat sampai keputusannya sudah lama keliru.

---

## 2. Yang berubah di `app.js`

- **Peta miskonsepsi diselamatkan.** Tuple item grammar mendapat indeks 15:
  `{teks pilihan -> nama miskonsepsi}`, diteruskan sebagai `optionMisconceptions`.
- **Jembatan tutor** (`tutorAvailable`, `tutorSession`, `tutorPick`, `tutorObserve`,
  `tutorCompose`, `tutorEscalate`, `tutorSummary`) — semuanya `?.` + `try/catch`. Kalau modul
  tutornya tidak termuat, sesi belajar **tetap berjalan persis seperti sebelumnya**, hanya
  tanpa lapisan mengajar. Fitur yang mematikan kuis saat gagal dimuat lebih buruk daripada
  fitur yang tidak ada.
- **`quizLoop` ditulis ulang**: kolam `remaining` + pemilihan hidup tiap soal; jawaban salah
  pertama **tidak lagi langsung membuka kunci jawaban** — tutor bicara, pilihan tetap terbuka,
  dan murid mencoba lagi. Tombol "Aku masih belum paham" menaikkan satu anak tangga bantuan
  atas permintaan murid sendiri.
- **Skor tetap jujur**: yang dihitung hanya percobaan pertama, dan layar akhir menyebutnya
  "benar pada percobaan pertama" supaya angkanya tidak menyesatkan.

---

## 3. Dua cacat yang ditemukan di peramban, bukan di kode

Verifikasi dijalankan di Chromium sungguhan (emulasi Pixel 5, PWA dari server lokal),
menjawab soal grammar sampai tutornya bicara. Dua-duanya tidak akan pernah terlihat dari
membaca kode.

### 3.1 Tutornya bicara bahasa Inggris

Jalan pertama menghasilkan:

> "Pilihan itu belum jalan: *Check the polarity of the first speaker's verb: negative
> statement pairs with 'Neither/Nor'…*"

Penyebabnya: `tutorCompose` memakai `q.source` — objek `explanation` **mentah dari bank
soal** — sebagai sumber penjelasan. Seluruh isi `grammar-templates.json` (`whyCorrect`,
`rule`, `memoryCue`, `howToAvoid`) berbahasa Inggris; bidang `q.explain` hasil olahan FIEZEL
lah yang berbahasa Indonesia. Tutor yang berpindah bahasa di tengah kalimat jauh lebih
membingungkan daripada kalimat umum yang bahasanya benar.

Perbaikan:
- `explanation` sekarang **selalu** dari `q.explain`, tidak pernah dari `q.source`
  (bidang `source` dihapus dari soal karena tidak ada pemakai lain).
- `tutorIndonesian()` — penjaga bahasa berbasis kata fungsi (kata isi bisa sama di kedua
  bahasa, kata fungsi hampir tidak pernah). Ambangnya konservatif supaya kalimat Indonesia
  pendek tidak ikut terbuang.
- `tutorWhyFails()` — alasan per-pilihan selalu dibuka dengan pilihannya sendiri di dalam
  tanda kutip; pada varian metakognitif pilihan itu adalah kalimat Inggris mentah, jadi bagian
  kutipannya dibuang dan hanya diagnosis Indonesianya yang diucapkan.
- Perangkai naskah membuang tanda baca akhir sebelum menyambung, supaya tutor tidak menulis
  titik ganda.

### 3.2 Kesalahan pertama langsung disodori contoh yang sudah dikerjakan

Jalan kedua menunjukkan tutor melompat ke anak tangga `worked` pada kekeliruan **pertama**
murid — melanggar aturan modulnya sendiri.

Penyebabnya: tangga scaffolding disuapi `attemptsOnConcept`, yaitu berapa kali konsep itu
**muncul**. Satu lesson grammar berisi belasan soal dengan konsep yang sama, jadi murid yang
menjawab benar lima kali lalu keliru sekali diperlakukan seolah sudah gagal enam kali.

Perbaikan: sesi kini menyimpan `missesOnConcept` yang terpisah — menghitung **kegagalan**,
bukan paparan, dan **nol lagi** begitu konsepnya dijawab benar. `attemptsOnConcept` tetap ada
dan tetap dipakai `selectNext` untuk menyebar materi; satu menghitung kesulitan, satu
menghitung paparan, dan menyatukannya membuat keduanya salah.

Setelah perbaikan, jalan yang sama di peramban menghasilkan gelung yang benar:

```
salah pertama       -> "Pegangan singkatnya: … Sekarang coba lagi."   (jawaban BELUM dibuka,
                                                                       3 pilihan masih terbuka)
"aku belum paham"   -> "Aku kerjakan satu yang mirip dulu ya…"        (naik ke `worked`)
salah lagi          -> jawaban dibuka + diagnosis spesifik:
                       "'prepares' akan memberi kesan kebiasaan atau fakta umum, padahal
                        konteks kalimat meminta makna lain."
benar berikutnya    -> "Nah, itu dia. Yang tadi bikin kamu keliru, barusan kamu lewati —
                        dan kamu melewatinya dengan alasan yang benar, bukan tebakan."
```

Tidak ada `pageerror`.

---

## 4. Gate — `tutor-brain-v3-test.js` (41 gate, terdaftar di `quality.yml`)

Lapisan mengajar lebih mudah dipalsukan daripada lapisan merencanakan: `decideMove` yang
selalu mengembalikan `'continue'` akan lulus setiap tes yang hanya memeriksa "apakah
fungsinya ada". Karena itu gate ini **tidak pernah memeriksa keberadaan** — yang diperiksa
keputusannya, pada kasus yang tidak bisa diperdebatkan guru mana pun:

- dua murid yang salah karena sebab berbeda tidak menerima tindakan yang sama;
- jawaban benar dalam sedetik tidak terbaca sebagai penguasaan;
- kesalahan pertama tidak pernah membuka jawaban, betapapun lemah muridnya;
- tangga dihitung dari **kegagalan**, bukan dari berapa kali konsepnya keluar (regresi 3.2);
- miskonsepsi sama dua kali **mengubah tindakan**, bukan menambah hitungan;
- setelah mengajar ulang, soal berikutnya adalah konsep yang barusan diajarkan;
- murid lelah dihentikan, bukan dimudahkan, dan itu mengalahkan tindakan lain;
- pujian tidak pernah mengarah ke orangnya;
- tidak satu pun naskah tutor keluar dalam bahasa Inggris (regresi 3.1);
- modulnya tetap murni, dan `app.js` tetap memanggilnya lewat penjaga.

---

## 5. Penanda rilis

`FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV` — ketiganya `m025-120`, dijaga
`install-health-test.js` dan `pwa-release-coherence-test.js`.

## 6. Verifikasi

Seluruh 69 perintah di `.github/workflows/quality.yml` dijalankan lokal — hijau, termasuk
pemeriksaan sintaks seluruh berkas dan gate baru.

Cabang ini dibuat dari m025-117; sementara berjalan, main maju ke m025-119 (kontras bidang
pastel #169, palet brief OWNER #170). main disatukan ke sini — satu-satunya konflik adalah
ketiga penanda rilis, yang diselesaikan ke **m025-120**. Gate pastel baru dari main
(`pastel-field-contrast-test.js`) hijau atas gaya `.tutor-turn`, dan gelung tutor
diverifikasi ulang di Chromium setelah penyatuan: hasilnya sama persis, tanpa `pageerror`.

## 7. Yang sengaja belum dikerjakan

`decideMove` sudah memutuskan `reteach` dan `breathe`, tetapi UI-nya belum menyajikan **kartu
konsep** sebelum soal berikutnya (`reteach`) dan belum menawarkan **menutup sesi lebih awal**
(`breathe`) — keduanya baru terlihat sebagai naskah tutor. Itu langkah berikutnya, bukan
bagian dari cabang ini.
