# m025-149 — Audit integritas konten sistem-wide, perbaikan akar masalah, dan gerbangnya

OWNER melaporkan beberapa tangkapan layar: soal grammar dengan pilihan yang tidak nyambung,
instruksi internal muncul sebagai jawaban, konten tercampur antar-topik, dan bahasa yang
teraduk. Arahannya tegas: **contoh-contoh itu gejala, bukan lingkup pekerjaan.** Yang diminta
adalah audit seluruh aplikasi secara mandiri, mencari kerusakan yang belum ditemukan siapa pun,
memperbaiki akar masalahnya, lalu memasang penjaga permanen.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Cara auditnya dilakukan

Bukan dengan membaca berkas sumber. `content-integrity-audit.js` mem-boot `app.js` di dalam VM
lalu **membangkitkan soal yang benar-benar dilihat murid**, kemudian memeriksa hasilnya. Sebuah
record bisa berupa JSON yang sempurna dan tetap merakit diri menjadi soal yang rusak, jadi
memeriksa sumbernya saja tidak membuktikan apa pun.

| Modul | Diperiksa |
|---|---|
| Grammar | 139 template → **3.475** soal hasil render (139 lesson × 25 mode latihan) |
| Vocabulary | 1.765 record → **7.060** soal hasil render (4 jenis soal per kata) |
| Reading | 300 bacaan / 1.500 soal → **1.500** hasil render |
| Placement | **25** soal, seluruh blueprint |
| Listening / Speaking / Writing / ujian | 1.407 / 36 / 36 / 114 record |

Total: **3.844 record, 12.060 soal hasil render.**

Temuan CRITICAL: **6.053 → 0.**

## 2. Empat akar masalah

Tidak satu pun berupa "soal yang salah tulis".

**(1) Terjemahan tingkat-kata atas konten yang sudah rilis.** Sebuah proses terjemahan mengganti
kata satu per satu di DALAM kalimat Inggris yang sudah jadi. Bekasnya deterministik dan bisa
dihitung: 170 kunci jawaban reading, 225 pengecoh reading, 442 ruas listening.

- `"...and the evidence-led response"` → `"...and the respons berbasis bukti"`
- `"with her school class"` → `"with her sekolah class"`
- `"My umbrella is at home on the kitchen table"` → `"My payung adalah at home on the dapur meja"`

Naskah skenario listening (`listening-scenarios-*.js`) diperiksa dan ternyata **masih bersih** —
artinya kerusakan terjadi SESUDAH generasi. Karena itu banknya dibangun ulang dari generatornya
sendiri (`tools/dev/rebuild-speaking-listening-data.js`), bukan ditambal. Reading dipulihkan dari
`meta.answer`, satu-satunya salinan yang tidak ikut tersentuh.

**(2) Jembatan terjemahan yang tidak pernah dipasang.** Ini yang memunculkan gejala yang
dilaporkan OWNER.

- `grammarMeta()` membaca `item[16]` — hidrasi **tidak pernah mengisinya**.
- `grammarExercise()` membaca `item[12].distractors` — kunci `explanation.distractors`
  **tidak ada di satu pun dari 139 template**; `distractors` adalah saudara `explanation`,
  bukan anaknya.

Kedua pembacaan itu diam-diam mengembalikan `undefined` dan jatuh ke catatan penulis soal
berbahasa Inggris. Sembilan dari 25 mode latihan menyajikannya sebagai **pilihan jawaban**.
Di mode `diagnose_distractor`, catatan Inggris itu bahkan menjadi **kuncinya**:

> **Soal:** Seorang siswa memilih "prepares". Alasan mana yang paling tepat menjelaskan mengapa
> pilihan itu gagal?
> ✅ `The stem's 'Look!' signals an action visibly unfolding now, not a routine.`
> ❌ `Kata "Look!" menunjuk pada kegiatan yang sedang terlihat berlangsung.`

Murid dilatih memilih catatan internal berbahasa Inggris sebagai jawaban benar. Terjemahan
Indonesianya (`pedagogicalObjectiveId`, `whyFailsId`, `misconceptionId`, …) **sudah ada di bank
sejak lama** dan tidak pernah dibaca sekali pun.

**(3) Perender reading menambal kerusakan dengan kerusakan.** Ketika `meta.answer` dan
`options[correctIndex]` berselisih, perender menimpa `shuffled[0]` dengan `meta.answer` — satu
pengecoh sungguhan lenyap, dan yang lenyap **berbeda setiap kali soal dibuka**. Identitas jawaban
sekarang dipegang indeks; soal yang tetap tidak sehat DITOLAK, bukan ditambal.

**(4) Kolam pengecoh tanpa batas topik.** `grammarAlternativeMeta` menarik dari seluruh 139
template, sehingga lesson A2 soal tense mendapat pengecoh aturan linking device C1 — bisa
dijawab tanpa tahu aturan mana pun. Kolamnya sekarang berjenjang: keluarga yang sama, lalu
level yang sama, baru sisanya.

## 3. Perbaikan lain yang DITEMUKAN audit, bukan dilaporkan

- 10 template A1 tanpa terjemahan Indonesia sama sekali (140 ruas ditulis; cakupan kini 139/139).
- Satu label miskonsepsi Indonesia yang menggabungkan dua miskonsepsi Inggris berbeda (AR-003),
  sehingga mode pelabelan punya dua pilihan identik dan tidak bisa dijawab.
- Satu contoh vocabulary yang tidak memuat katanya sama sekali (`bum`), membuat soal
  "apa arti kata ini dalam kalimat tersebut" mustahil dijawab.
- Label jenis kata `prefix` yang tidak dikenal perender sehingga tampil mentah dalam bahasa
  Inggris — dan di soal jenis kata menjadi satu-satunya pilihan berbahasa Inggris dari empat.
- Enam soal listening di tes penempatan yang masuk **tanpa band CEFR**: `difficulty` diturunkan
  dari `item.level`, tetapi `level`-nya sendiri tidak pernah ikut terbawa.

## 4. Gerbang permanen

`contentIntegrityGate()` dipasang di dalam `validateQuestion()` — titik yang **sudah** dilewati
setiap pembangun soal, sehingga penolakan otomatis menarik kandidat deterministik berikutnya dan
memvalidasinya ulang, tanpa satu pun jalur render baru. Ia memeriksa yang tidak terlihat dari
bentuk: kebocoran teks internal, belahan bahasa antar-pilihan, sisipan terjemahan, penjelasan
yang menunjuk pilihan yang tidak ada di layar, bukti reading yang tidak ada di bacaannya, dan
identitas lesson yang melenceng.

`tests/content-integrity-gate-test.js` mengunci setiap BENTUK kegagalan yang pernah rilis — dan
membawa **kontrol positif**, supaya gerbang tidak pernah bisa "lulus" dengan cara mengosongkan
lesson: latihan melengkapi kalimat yang seluruhnya berbahasa Inggris dan penjelasan Indonesia
yang mengutip istilah tata bahasa Inggris keduanya HARUS tetap lolos.

`content-qa-agent` mendapat deteksi bacaan nyaris-kembar; pemeriksaan exact-match-nya tidak bisa
melihat kembaran template sama sekali.

## 5. Cache dan versi

Ritual build naik `m025-148` → `m025-149` di `core-config.js`, `fiezel-diag-panel.js`, dan
`sw.js`. Keempat bank yang diperbaiki adalah aset shell, jadi kenaikan `SW_REV` itulah yang
membuang salinan rusak yang sudah ada di perangkat murid — data yang sudah diperbaiki tidak bisa
hidup berdampingan dengan cache lama.

Entri review (`wrongAnswers`) yang TEREKAM saat konten rusak sekarang dibuang saat state dimuat,
berdasarkan tanda kerusakannya. Riwayat dan mastery tidak disentuh: keduanya hitungan, dan
menghapusnya berarti menghapus bukti belajar yang sah.

## 6. Bukti

- `content-integrity-audit.js`: **0 temuan CRITICAL** (sebelumnya 6.053).
- `tests/content-integrity-gate-test.js`: **17/17 PASS**.
- Suite lengkap: **93/93 PASS**, termasuk **11 tes yang sudah merah sebelum perubahan ini** —
  kemerahannya adalah sidik jari insiden ini sendiri: `content-qa-agent` melaporkan tepat 170
  blocker, dan gerbang mutu `speaking-listening` gagal karena terjemahan telah mencopot kata
  Inggris dari kunci listening.
- Seluruh 139 lesson tetap terisi penuh 25/25 mode setelah gerbang dipasang — gerbang ini tidak
  menolak satu pun konten yang sah.

Tiga regresi yang MUNCUL selama pengerjaan tertangkap oleh suite yang sudah ada dan sudah
diperbaiki: dua lesson bertabrakan di satu-satunya mode yang teks soalnya tidak menyebut lesson
mana pun (sekarang menyebut), dan satu tes yang mengunci nama properti yang berubah (diperbarui
supaya menguji kontraknya, bukan ejaannya).

## 7. Sisa — perlu keputusan OWNER

- **276 dari 300 bacaan adalah kembaran template.** Kerangka kalimat sama persis, topik dan nama
  ditukar ("A message sent to volunteers working on *renewable energy*…" / "…*wildlife corridor*…"),
  sampai 24 bacaan per klaster. Ini utang konten sungguhan: murid belajar mengenali pola, bukan
  membaca. Sekarang **terukur dan terlaporkan** (80 klaster, severity review) tetapi TIDAK
  diperbaiki — memperbaikinya berarti menulis 300 bacaan baru, dan itu pemesanan konten, bukan
  perbaikan integritas.
- **Tes penempatan 25 soal, bukan 150** seperti tertulis di arahan. `PLACEMENT_SIZE=25` dan
  `PLACEMENT_BLUEPRINT` adalah keputusan produk yang terdokumentasi, dan blueprint-nya sah serta
  kini ber-band CEFR lengkap (A1:6, A2:5, B1:4, B2:4, C1:3, C2:3). Menaikkannya ke 150 membuat
  penempatan ~6× lebih lama untuk setiap murid — itu keputusan OWNER, jadi dilaporkan, bukan
  diubah sendiri.
- **126 `CROSS_FAMILY_FALLBACK` (MAJOR, diterima).** Lima keluarga grammar hanya punya satu lesson
  (`possession`, `nouns`, `question_formation`, `quantifiers`, `pronouns_determiners`) dan
  `emphasis_inversion` hanya tiga, jadi mereka tidak bisa memasok tiga pengecoh sekeluarga.
  Lintas-keluarga pada CEFR yang sama adalah pilihan paling tidak buruk; perbaikannya menambah
  lesson di keluarga itu, bukan menambah kode.
- Pendeteksi kerangka bahasa bersifat heuristik (kata fungsi sebagai penentu kerangka, istilah
  tata bahasa Inggris dianggap netral). Ia disetel terhadap korpus ini dan dijaga kontrol positif,
  tetapi konten baru dengan gaya tulis yang tidak biasa bisa menuntut leksikonnya diperluas.
