# m025-143 — Diagnosis akar masalah berhenti berhenti di tingkat keluarga

Menutup **B-06**. Graph prasyarat Core Brain hanya mengenal keluarga materi, dan **kehilangan
lima dari 21 keluarga** yang benar-benar ada di bank soal.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Dua masalah, satu graph

### 1.1 Lima keluarga tidak ada di graph

Bank soal memuat 21 keluarga; `PREREQUISITES` hanya menyebut 16. Yang hilang: `nouns`,
`possession`, `pronouns_determiners`, `quantifiers`, dan `question_formation` - empat di
antaranya materi paling awal A1, dan semuanya baru masuk bank saat m025-136.

Akibatnya tidak pernah terlihat sebagai galat. `prerequisiteChain()` mengembalikan daftar
kosong untuk keluarga yang tidak dikenal, jadi `rootCause()` selalu menyimpulkan
`isRoot: true` - "gejala ini akarnya sendiri". Jawaban yang masuk akal, selalu tersedia, dan
diam-diam salah untuk seperlima materi.

### 1.2 Graph keluarga terlalu kasar untuk membimbing

Graph lama tahu "conditionals butuh modals", tetapi tidak tahu lesson mana di dalamnya yang
harus lebih dulu. Untuk murid, "kamu belum kuat di `articles_determiners`" jauh kurang berguna
daripada "kamu belum kuat di *articles a/an/the*".

## 2. Perbaikannya

Graph kurikulum tingkat lesson disuntikkan dari `grammar-curriculum-v1.json` - berkas yang
**sama** dengan yang dipakai Grammar Hub, jadi urutan yang dilihat murid dan urutan yang
dipakai diagnosis tidak bisa berbeda. Core Brain tidak ikut membaca berkas apa pun, sehingga
tetap bisa diuji sendirian.

`prerequisiteChain(node)` sekarang menerima lessonId maupun family: kalau graph mengenal
lessonId-nya, rantainya dibangun di tingkat lesson; kalau tidak, ia jatuh ke graph keluarga.
Satu fungsi untuk keduanya - pemanggil tidak perlu tahu bukti mana yang sudah berlabel lesson
dan mana yang masih legacy.

**Keluarga tetap dipertahankan sebagai cadangan**, dan lima keluarga yang hilang ditambahkan.
Bukti lama menyebut family tanpa lessonId; menghapus jalur itu berarti materi legacy kehilangan
diagnosisnya.

`rootCause()` mengumpulkan bukti per lesson berdampingan dengan bukti per keluarga, mencoba
tingkat lesson dulu, lalu jatuh ke keluarga. Dua syarat konservatif yang sudah ada **tidak
dilonggarkan**: prasyarat hanya menggantikan gejala kalau ia terukur (minimal 4 percobaan) dan
nyata lebih lemah (selisih penguasaan minimal 12). Hasilnya kini membawa `scope: 'lesson'|'family'`
supaya bisa dibedakan.

## 3. Gate

`tests/prerequisite-graph-test.js`, 13 pemeriksaan, dan diuji dua arah - saya hapus sementara kelima
keluarga itu dan gate-nya **merah**, menyebut namanya satu per satu.

Yang dijaga, selain kelengkapan keluarga:

- Graph memetakan **seluruh 139 lesson**, dan ukurannya dilaporkan apa adanya.
- **Rantainya transitif**: kalau A butuh B dan B butuh C, maka A butuh C. Graph keluarga lama
  tidak pernah bisa menjawab ini di tingkat lesson.
- lessonId yang tidak dikenal jatuh ke graph keluarga, bukan melempar.
- Prasyarat yang **sudah dikuasai tidak pernah dituduh**, dan prasyarat dengan bukti terlalu
  tipis (2 percobaan) juga tidak - menuduhnya berarti menyuruh murid mengulang materi yang
  belum pernah benar-benar diukur.
- Aplikasi benar-benar menyuntikkan graph-nya; graph yang tidak pernah disuntik sama saja
  dengan tidak ada.

## 4. Bukti

- Seluruh **88 gate** `.github/workflows/quality.yml`: PASS.
- `tests/prerequisite-graph-test.js`: **13/13 PASS**, 21 keluarga, 139 lesson.
- Versi naik bersama ke `m025-143`.

## 5. Sisa

B-12 (E2E browser) satu-satunya P1 yang belum tersentuh. Speaking dan Listening belum berformat
ujian; kalibrasi 300 bacaan lama masih terbalik.
