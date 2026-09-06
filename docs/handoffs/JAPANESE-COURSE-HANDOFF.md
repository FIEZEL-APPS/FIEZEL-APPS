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

## 7. Pertanyaan yang menunggu jawaban owner

1. Mutu sepuluh contoh — layak dijadikan patokan untuk 200-an berikutnya?
2. Graf keluarga (§2, `n5-a1-family-graph.json`) — urutannya sesuai dengan cara owner mengajar?
3. Sakelar furigana: ada di Pengaturan, atau mengikuti tingkat saja?
4. A1 tanpa listening dan tanpa produksi bebas — diterima?
5. Sumbu bahasa target: satu murid boleh belajar keduanya sekaligus (progres terpisah), atau
   memilih satu dan bisa berganti?
6. Namespace berkas: `*-ja.json` di akar (mengikuti pola berkas Inggris) atau folder sendiri
   `content/ja/`? Yang kedua lebih rapi, yang pertama lebih mirip yang sudah ada.
