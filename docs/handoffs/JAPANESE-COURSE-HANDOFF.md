# Kursus bahasa Jepang di FIEZEL — usulan tingkat pertama (A1 / JLPT N5)

Otoritas: OWNER. Dokumen ini **usulan**, bukan laporan pekerjaan selesai. Ia menjawab enam
pertanyaan yang diminta sebelum satu butir soal pun ditulis massal, dan menahan diri dari
menulis 2.000 butir sebelum mutunya dinilai.

## Status

**NOL byte produksi berubah.** Yang ada di PR ini hanya dokumen dan dua berkas usulan di
`docs/japanese/` yang tidak dimuat aplikasi mana pun:

| Berkas | Isi |
|---|---|
| `docs/japanese/n5-a1-sample-templates.json` | 10 contoh soal, skema PENUH `grammar-templates.json` |
| `docs/japanese/n5-a1-family-graph.json` | graf keluarga Jepang yang diusulkan untuk §5.1 |
| dokumen ini | silabus, provenans, temuan mesin, batasan, pertanyaan terbuka |

Karena nol byte produksi berubah, nomor build **tidak** dinaikkan — pola yang sama dengan
PR #365 (koreksi handoff).

---

## 1. Provenans dan hak cipta — jawaban jujur soal Irodori

**Irodori dipakai sebagai SILABUS SAJA.** Yang diambil: poin tata bahasa apa yang diajarkan
di tingkat berapa, dan urutannya. Itu fakta kebahasaan yang identik di semua kursus Jepang —
は/が muncul sebelum bentuk て di kursus mana pun, bukan karena Irodori memilikinya.

**Yang TIDAK diambil:** tidak ada satu pun kalimat, dialog, teks bacaan, ilustrasi, audio,
daftar kosakata beserta susunannya, atau latihan yang direproduksi, diterjemahkan, atau
diturunkan dari Irodori maupun Minna no Nihongo.

**Konsekuensi yang perlu owner tahu:** karena tidak ada materi turunan Irodori,
**FIEZEL TIDAK terikat kewajiban gratis-selamanya** dari lisensi Irodori. Kalau di kemudian
hari ada yang ingin memakai teks Irodori apa adanya, keterikatan itu lahir saat itu juga —
dan keputusannya milik owner, bukan milik sesi yang mengerjakan konten.

Seluruh 10 contoh di PR ini adalah kalimat yang ditulis baru. Bisa diperiksa: kalimatnya
sederhana, bertema keseharian netral, dan tidak satu pun memakai nama tokoh, latar, atau alur
yang khas buku mana pun.

---

## 2. Silabus tingkat pertama (A1 / N5)

Sumbu utama **CEFR** (`cefr: "A1"`), padanan JLPT dicatat sebagai keterangan (`jlpt: "N5"`) —
karena seluruh skema soal FIEZEL sudah memakai CEFR, dan Irodori pun disusun mengikutinya.

Dua belas keluarga, dengan subskill yang menjadi satuan lesson:

| # | Keluarga | Subskill inti A1 (satuan lesson) |
|---|---|---|
| 1 | `particles` | は topik · が informasi baru · を objek · に tujuan/waktu · で tempat kegiatan/alat · へ arah · も juga · と bersama/dan |
| 2 | `demonstratives` | これ/それ/あれ/どれ · この/その/あの · ここ/そこ/あそこ/どこ |
| 3 | `noun_modification` | の antar kata benda (milik, asal, jenis) |
| 4 | `adjectives` | kata sifat い vs な · negatif い · negatif な · lampau · menggabungkan dua sifat |
| 5 | `existence_location` | あります vs います · に tempat keberadaan · posisi (うえ/した/なか) |
| 6 | `verb_groups` | godan / ichidan / tak beraturan · akar ます |
| 7 | `polite_forms` | ます · ません · ました · ませんでした |
| 8 | `negation_past` | negatif kata benda dan kata sifat · lampau negatif |
| 9 | `question_words` | なに/だれ/どこ/いつ/いくら/どう · か di akhir kalimat |
| 10 | `counters` | にん · まい · ほん · つ · さい · じ/ふん (waktu) |
| 11 | `time_expressions` | に pada waktu tertentu · kata keterangan frekuensi · penanda hari/bulan |
| 12 | `te_form` | pembentukan て per golongan · てください · ています (sedang) |

Urutan prasyaratnya ada di `docs/japanese/n5-a1-family-graph.json`, sudah diverifikasi: 15
keluarga (12 di atas + 3 untuk tingkat berikutnya), **nol siklus**, semua prasyarat dikenal,
dua akar (`particles`, `demonstratives`).

---

## 3. Temuan mesin — TIGA ikatan Inggris, bukan dua

Tugas menyebut dua modul brain yang terikat Inggris dan meminta klaim itu diverifikasi
sendiri. Diverifikasi, dan **ada yang ketiga.**

### 3.1 `PREREQUISITES` — `features/brain/fiezel-core-brain.js:662` (sudah diketahui)

21 keluarga Inggris yang dibekukan. Rencananya persis seperti diminta: jadikan bisa disuntik
data mengikuti pola `setCurriculumGraph(rows)` (baris 703) yang sudah terbukti, dengan graf
Inggris sebagai **nilai bawaan** sehingga murid Inggris tidak berubah satu byte pun.

### 3.2 `MORPHEME_SUFFIXES` — `features/brain/fiezel-production-grader.js:53` (sudah diketahui)

`['ing','es','ed','s','d']` plus `levenshtein` per kata yang mengandaikan spasi. Untuk Jepang
ini modul BARU, bukan penyesuaian. **Tingkat pertama tidak memakainya** — lihat §5.

### 3.3 `conceptOf()` — `features/brain/fiezel-question-memory.js:127` — **BARU, belum tercatat**

```js
var m = marker.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
if (!m) return null;
```

Baris kedua membuang **setiap karakter non-ASCII**. Marker berkana/kanji karena itu menjadi
string kosong, dan `conceptOf` mengembalikan `null`. Terukur, bukan dugaan:

```
marker 'yesterday'  -> "past_tense|yesterday"
marker 'は'          -> null
marker 'て形'        -> null
marker 'wa-topic'   -> "particles|wa-topic"
```

Akibatnya persis kelas kegagalan yang tugas ini peringatkan: pembatas **kebaruan konsep** di
`fiezel-question-allocator.js` (PR #369) menerima `concept: null` untuk seluruh butir Jepang,
jadi ia berhenti membatasi pengulangan konsep — tanpa error, tanpa gejala, dengan soal yang
tetap keluar. Dua puluh soal berbeda yang menguji lima konsep yang sama akan lolos sebagai
"dua puluh konsep berbeda".

**Usulan penanganan — aturan penulisan, bukan perubahan mesin:** `marker` pada bank Jepang
WAJIB slug ASCII (`wa-topic`, `te-form-request-godan-ru`), bukan kana. Alasan memilih ini
daripada melebarkan regex: `marker` adalah kunci internal, tidak pernah dilihat murid,
sementara melebarkan regex menyentuh modul yang dipakai murid Inggris hari ini. Kesepuluh
contoh sudah mematuhinya dan terbukti menghasilkan concept yang sah (10/10).

Gerbang konten Jepang harus menegakkan aturan ini, karena satu marker berkana yang lolos akan
mematikan pembatasnya diam-diam.

### 3.4 Ikatan lunak yang tidak menghalangi

`fiezel-step-tutor.js` memetakan **verba pertama** frasa `reasoningOperation` ke kategori
pertanyaan bimbingan. Ia tidak terikat bahasa target, tetapi terikat bahasa **metadata** —
karena itu `reasoningOperation` di bank Jepang ditulis dengan pola yang sama seperti bank
Inggris (frasa kerja pendek), dan kembaran Indonesianya di `reasoningOperationId`.

Sisanya — BKT, kalibrasi Elo, ingatan soal (selain `conceptOf`), alokator, ledger miskonsepsi,
confusion matrix — diperiksa dan memang buta bahasa.

---

## 4. Keputusan aksara (§6.1) — usulan, menunggu keputusan owner

Yang saya usulkan: **furigana menyusut bertahap, dan murid boleh memaksanya selalu tampil.**

| Tingkat | Kanji di stem | Furigana |
|---|---|---|
| A1 (N5) | nyaris nol; stem ditulis kana | tersedia untuk kanji yang muncul di kosakata |
| A2 (N4) | kanji dasar mulai muncul | tampil otomatis |
| B1+ | kanji sesuai tingkat | tampil saat disentuh, atau selalu bila murid memilihnya |

Alasannya pedagogis, bukan teknis: murid A1 yang dipaksa membaca kanji akan menghabiskan
seluruh perhatiannya untuk mengenali bentuk, bukan untuk memahami tata bahasa yang sedang
diuji — dan soal ini menguji tata bahasa. Sebaliknya, murid yang tidak pernah melihat kanji
di A1 akan kaget di A2.

Bentuk datanya sudah disiapkan di sepuluh contoh: `stem` (yang dilihat murid pada tingkat itu),
`stemKana` (bacaan penuh), dan `furigana` sebagai pasangan `[kanji, bacaan]`.

**Yang perlu owner putuskan:** apakah sakelar "furigana selalu" itu ada di Pengaturan murid,
atau mengikuti tingkat saja tanpa pilihan.

---

## 5. Yang SENGAJA tidak ikut di tingkat pertama

Dikatakan di depan, bukan ditemukan owner belakangan:

1. **Listening.** Pipeline suara neural dan aset prerender FIEZEL berbahasa Inggris. Listening
   Jepang butuh aset audio sendiri, dan mengklaim ia bekerja tanpa aset itu adalah kebohongan
   yang akan terlihat di kelas pertama. **A1 dikirim tanpa listening.**
2. **Produksi bebas (menulis/berbicara yang dinilai mesin).** Menuntut modul penilai baru
   (§3.2): perbandingan tingkat mora/karakter plus normalisasi kana↔kanji. **A1 tidak memakai
   soal produksi bebas**, jadi modul itu ditunda — bukan diklaim bekerja.
3. **Kanji sebagai objek yang diuji.** A1 menguji tata bahasa dan kosakata; membaca kanji
   punya kurikulumnya sendiri dan tidak dicampur ke sini.
4. **Keigo, bentuk biasa, pasangan transitif-intransitif.** Ada di graf sebagai tingkat
   berikutnya, tidak dikirim di A1.

---

## 6. Rencana pengiriman A1 sesudah usulan ini disetujui

Urutannya sengaja menaruh mesin dan gerbang lebih dulu, supaya konten tidak pernah ditulis di
atas fondasi yang belum diuji:

1. **Mesin:** `PREREQUISITES` bisa disuntik (§3.1) + gerbang yang membuktikan graf Inggris
   **tidak berubah satu byte pun**, dengan mutasi yang dibuktikan MERAH lebih dulu.
2. **Sumbu bahasa target:** murid memilih Inggris atau Jepang; progres Inggris yang sudah
   berjalan tidak boleh kehilangan apa pun, dan murid Inggris tidak mengunduh satu byte pun
   tambahan (pola pemuatan yang sama dengan aset Thai).
3. **Gerbang konten Jepang:** skema penuh, setiap pengecoh bernama miskonsepsi, `marker`
   ASCII, paritas Indonesia–Thai. Dibuktikan merah dulu.
4. **Konten A1:** kosakata, template tata bahasa, diagnosis miskonsepsi id+th, graf kurikulum
   lesson, bacaan, ujian, prompt menulis (tanpa penilaian mesin).
5. **Sidecar Thai** untuk semuanya, terdaftar di `features/i18n/fiezel-th-loader.js`.

Perkiraan jujur untuk A1: **200–300 template** yang benar, bukan 2.000 yang asal. Angka itu
menutup 12 keluarga di §2 dengan 15–25 butir per keluarga — cukup untuk mesin adaptif punya
pilihan, dan masih bisa ditinjau manusia satu per satu.

---

## 7. Keputusan atas enam pertanyaan — DIPUTUSKAN

Owner menyerahkan keenam keputusan ini kepada agen (2026-09-06, "INI AKU SERAHKAN SEMUANYA
KEPADAMU"). Jadi keenamnya diputuskan di sini, lengkap dengan alasan dan dengan biaya kalau
suatu saat dibalik. Semuanya masih bisa dibalik owner kapan pun — yang mahal untuk dibalik
ditandai secara khusus.

**1. Sepuluh contoh soal layak jadi patokan — DITERIMA, dengan dua pengetatan.**
Skemanya sudah penuh dan tiap pengecoh punya miskonsepsi bernama, yang memang bagian
tersulitnya. Dua hal diketatkan sebelum 200-an berikutnya ditulis: (a) satu butir boleh
menguji tepat satu titik tata bahasa — beberapa contoh menumpang dua sekaligus, dan itu
membuat jawaban salah tidak bisa dibaca sebagai diagnosis; (b) pengecoh harus salah karena
SATU sebab yang bisa dinamai, bukan karena "kedengaran aneh".

**2. Graf keluarga A1 — DIPAKAI APA ADANYA, dan ini yang paling mudah dibalik.**
Urutannya mengikuti konvensi pengajaran yang lazim (partikel → nomina → adjektiva → kata
kerja → bentuk-te). Ini satu-satunya dari enam yang benar-benar bergantung pada cara owner
mengajar, dan aku tidak bisa mengetahuinya. Aku pilih konvensi karena itu tebakan paling
aman, bukan karena aku tahu itu benar. Menggantinya nanti cuma menyunting satu berkas JSON
selama kontennya belum ditulis — jadi kalau urutannya tidak cocok, **katakan sebelum 200-an
butir lahir**, bukan sesudah.

**3. Furigana — mengikuti tingkat, DITAMBAH satu sakelar "furigana selalu" di Pengaturan.**
Mengikuti tingkat saja gagal untuk kasus nyata di FIEZEL: murid Thai membaca aksara Jepang
tanpa bekal kanji dari bahasa ibunya, dan murid yang lambat di satu keluarga tetap dipaksa
kehilangan furigana karena tingkatnya sudah naik. Sakelarnya murah — satu preferensi, nol
dampak ke mesin — dan menahan murid yang seharusnya bisa lanjut adalah biaya yang jauh
lebih mahal daripada satu baris di Pengaturan.

**4. A1 tanpa listening dan tanpa produksi bebas — DITERIMA.**
Aset audio Jepang belum ada, dan penilai produksi bebas butuh normalisasi kana↔kanji yang
belum ada modulnya. Keduanya ditunda dengan jujur, bukan diklaim bekerja. Konsekuensinya
dikatakan di depan: A1 Jepang **lebih sempit** daripada A1 Inggris, dan itu harus terlihat di
layar murid, bukan disembunyikan.

**5. Sumbu bahasa target — DUA BAHASA SEKALIGUS, progres terpisah.**
FIEZEL sudah dipakai murid yang sedang belajar Inggris. Memaksa memilih berarti murid yang
mencoba Jepang menaruh progres Inggrisnya dalam bahaya, dan itu kerugian yang tidak perlu.
Progres, bukti Braincore, dan penjadwal memori dipisah per bahasa; satu bahasa aktif pada
satu waktu di layar, tapi tidak ada yang terhapus saat berganti. **Ini yang paling mahal
untuk dibalik** — begitu ada murid yang punya dua progres, menyatukannya kembali berarti
membuang salah satunya.

**6. Namespace berkas — `content/ja/`, bukan `*-ja.json` di akar.**
Akar repo sudah padat, dan A1 saja akan melahirkan belasan berkas bank. Pola berkas Inggris
di akar adalah warisan, bukan rancangan; menirunya berarti menyalin sesak yang sudah ada.
Berkas Inggris **tidak** dipindahkan — memindahkannya menyentuh `sw.js` dan setiap pemuat,
dengan nol manfaat bagi murid.

## 8. Yang sudah dikerjakan sesudah keputusan ini

**Langkah 1 dari rencana §6 — SELESAI.** Graf keluarga di `fiezel-core-brain.js` kini bisa
disuntikkan (`setFamilyGraph` / `resetFamilyGraph` / `familyGraph`), mengikuti pola
`setCurriculumGraph(rows)` yang sudah ada untuk graf lesson. `PREREQUISITES` tetap graf
Inggris dan tetap menjadi bawaan.

Gerbangnya `tests/family-graph-injection-test.js`, **dibuktikan merah lebih dulu** (7 assert
merah sebelum mesin disentuh, 9/9 hijau sesudah). Ia menahan graf Inggris pada patokan yang
**ditulis tangan di dalam gerbang** — bukan dibaca dari modul yang sedang diuji, sebab
patokan yang menyalin dirinya sendiri akan setuju dengan dirinya sendiri selamanya. Ia juga
membuktikan graf yang disuntikkan tidak bisa dimutasi dari luar setelah disuntikkan, dan graf
Jepang di `n5-a1-family-graph.json` bisa dipakai apa adanya.

Sisa rencana §6 belum dikerjakan: sumbu bahasa target, gerbang konten Jepang, konten A1, dan
sidecar Thai.

**Langkah 2 dari rencana §6 — SELESAI SEBAGIAN (modul + gerbang; belum ada pemanggil).**
`features/brain/fiezel-target-language.js` memutuskan bagaimana kunci penyimpanan sebuah
bahasa dibentuk. Aturannya satu, dan ia yang menentukan segalanya: **bahasa bawaan (Inggris)
tidak punya awalan sama sekali** — kunci Inggris sesudah modul ini lahir identik byte per byte
dengan kunci Inggris sebelumnya. Bahasa lain yang menumpang awalan (`fiezel-olm-v1@ja`),
bukan sebaliknya.

Alasannya bukan kerapian. Kalau semua kunci diberi awalan "supaya seragam", setiap murid
Inggris yang sudah ada membuka aplikasi dan menemukan dirinya kembali ke nol: progresnya
tidak terhapus, ia hanya tidak lagi dicari di tempat ia disimpan — tanpa error, tanpa gejala,
baru ketahuan dari keluhan murid.

Gerbangnya `tests/target-language-axis-test.js`, dibuktikan merah lebih dulu. Ia membaca
daftar kunci **langsung dari sumber** (`app.js`, `fiezel-learner-flow.js`,
`fiezel-core-brain.js`), bukan mengetiknya ulang, supaya ia ikut tumbuh saat kunci baru lahir
dan tidak bisa basi diam-diam. Yang dibuktikan: setiap kunci nyata tidak bergeser untuk
Inggris; masukan tak dikenal/kosong/salah bentuk jatuh ke Inggris, bukan melahirkan ruang
kunci asing; kunci bahasa kedua tidak pernah bertabrakan dengan kunci Inggris; dan kunci
berbahasa bisa dibaca balik menjadi kunci dasar + bahasanya.

Di manifest brain modul ini ditandai **`authorityKey: 'off'`, dan itu jujur**: belum ada satu
pun pemanggil di `app.js`. Menandainya `'active'` berarti berbohong tentang mesin yang sedang
berjalan.

**Yang BELUM ada, dan perlu dikatakan terang-terangan:** murid belum bisa memilih bahasa apa
pun di layar. Tidak ada pemilih bahasa target, tidak ada panel kursus di dashboard, dan nol
konten Jepang yang dimuat aplikasi. Yang ada di aplikasi hari ini hanyalah `learnerLocale` —
bahasa ANTARMUKA (Indonesia/Thai), bukan bahasa yang dipelajari. Panel pemilih sengaja
ditunda sampai progres terpisah benar-benar bekerja: menaruh tombol "pilih kursus" lebih dulu
berarti murid bisa memilih Jepang dan menimpa progres Inggrisnya.

**Nol byte tambahan bagi murid Inggris — dan itu diperiksa, bukan dijanjikan.**
`fiezel-target-language.js` SENGAJA belum didaftarkan di `index.html` maupun di ASSETS
`sw.js`. Selama belum ada pemanggilnya, memuatnya di shell berarti mengirim kode mati ke
setiap murid Inggris dan memaksa mereka mengunduh ulang shell tanpa mendapat apa pun.
Modul ini diuji lewat Node dari gerbangnya sendiri, dan baru akan masuk shell bersama
pemanggil pertamanya. Yang naik ke m025-280 adalah `fiezel-brain-manifest.js` (memang
dikirim, karena daftar modulnya bertambah).

## 9. Langkah 3 — gerbang konten Jepang (SELESAI)

`tests/japanese-content-test.js`, dibuktikan merah lebih dulu (3 assert merah), lalu 12/12
hijau. Ia menemukan bank Jepang dari isi direktori (`docs/japanese/`, `content/ja/`), jadi
bank yang lahir nanti ikut terperiksa tanpa daftar yang perlu disunting.

### Temuan: cacat KEDUA di `conceptOf()`, berbeda dari yang dicatat §3.3

§3.3 mencatat marker non-ASCII membuat `conceptOf()` mengembalikan `null`. Saat gerbang ini
memanggil fungsi yang sebenarnya — bukan menirunya — muncul cacat kedua yang tidak tercatat:

`conceptOf(item)` membaca **`item.skill`**, bukan `item.family`. Kesepuluh contoh di
`n5-a1-sample-templates.json` hanya punya `family` dan `subskill`, jadi setiap butir Jepang
menghasilkan `x|<marker>` — awalan cadangan.

Terukur:

| butir | concept |
|---|---|
| contoh apa adanya (tanpa `skill`) | `x\|wa-vs-ga-answer-to-question-word` |
| sesudah `skill` ditambahkan | `particles\|wa-vs-ga-answer-to-question-word` |
| contoh Inggris pembanding | `past_tense\|yesterday` |

Ini lebih licin daripada cacat pertama: `x|marker` **bukan null**, jadi pembatas kebaruan
konsep tampak bekerja. Yang hilang adalah pemisahan antar-keluarga — dua keluarga yang
kebetulan memakai marker sama terbaca sebagai satu konsep. Kesepuluh contoh sudah diperbaiki
(`skill` = `family`), dan gerbang menolak butir mana pun yang jatuh ke awalan cadangan.

**Pelajarannya, dan sengaja ditulis:** temuan §3.3 lahir dari MEMBACA kode; temuan ini lahir
dari MEMANGGIL kode. Yang kedua menemukan apa yang yang pertama lewatkan.

### Yang dijaga gerbang, dan semuanya dibuktikan lewat mutasi

Sebelas mutasi dijalankan, sebelas tertangkap: marker non-ASCII, butir kehilangan `skill`,
pengecoh sama dengan kunci, pengecoh tanpa miskonsepsi bernama, penjelasan kehilangan
kembaran Indonesia, stem tanpa rumpang, family asing dari graf, `correctIndex` di luar
jangkauan, pilihan kembar, tingkat JLPT tidak sah, id kembar.

Sisa rencana §6: konten A1 (200-300 template) dan sidecar Thai. Panel pemilih bahasa di
dashboard belum ada dan sengaja ditunda sampai progres terpisah benar-benar bekerja —
memasang tombolnya lebih dulu berarti murid bisa memilih Jepang dan menimpa progres
Inggrisnya.

---

## m025-286 — kursus Jepang akhirnya sampai ke layar murid

Catatan penutup di atas ("panel pemilih bahasa belum ada dan sengaja ditunda") **sudah tidak
berlaku**. Syarat yang menahannya sudah terpenuhi: sumbu bahasa target (m025-281) membuat
progres tiap bahasa berdiri sendiri — kunci penyimpanan Inggris tetap tanpa awalan, Jepang
memakai `<kunci>@ja` — jadi memilih Jepang tidak bisa lagi menimpa progres Inggris.

**Yang berubah untuk murid.** Di Pengaturan → Profil, di bawah pemilih bahasa tampilan,
muncul baris **Bahasa yang dipelajari**: Inggris (kursus lengkap) atau Jepang (A1/N5, draf).
Peringatan jujur ikut tampil saat Jepang aktif — baru A1, belum ada menyimak, naskah belum
ditinjau penutur asli.

**Satu mesin, dua bahasa.** Bank `content/ja/grammar-templates-ja.json` memakai nama medan
yang sama persis dengan bank Inggris, jadi ia lewat jalur hidrasi yang sama: alokator,
ingatan soal, dan tutor brain ikut. Jalur kedua akan membuat soalnya tetap keluar tetapi
kursusnya berhenti menyesuaikan diri.

**Yang dijaga.** Bawaan tetap `en`; graf keluarga Jepang disuntik lewat `setFamilyGraph` dan
**dipulihkan** lewat `resetFamilyGraph` saat kembali ke Inggris; kurikulum lesson dikosongkan
saat ja karena kurikulum lesson Jepang belum ada. `tests/japanese-course-wiring-test.js`
merah 7 assert lebih dulu, lalu 9/9 hijau, dan lima mutasi semuanya tertangkap.

**Kenapa berkas ini ikut berubah di m025-286:** ritual bump menyentuh `DIAG_BUILD` di
`features/neural-voice/fiezel-diag-panel.js`, dan A13 menuntut jejaknya tercatat. Panel
diagnostik sendiri tidak berubah perilakunya — hanya penanda buildnya naik ke m025-286.

**Utang yang masih berdiri:** sidecar Thai untuk 2.574 kalimat penjelasan butir Jepang, dan
tinjauan penutur asli atas 234 butir yang semuanya bertanda DRAFT AI.
