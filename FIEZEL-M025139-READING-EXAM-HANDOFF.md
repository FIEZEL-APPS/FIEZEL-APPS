# m025-139 — Reading yang berbentuk ujian, dan utang kalibrasi yang berhenti tersembunyi

Menyentuh **B-08/B-09**, tetapi tidak dengan cara yang diminta diagnosis, dan alasannya ada
di angka.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Yang terukur di bank Reading lama

| Level | Bacaan | Kata rata-rata | Flesch (makin tinggi = makin mudah) |
|---|---:|---:|---:|
| A1 | 50 | 58.1 | 38.0 |
| A2 | 50 | 58.0 | 32.5 |
| B1 | 50 | 58.1 | **29.0** |
| B2 | 50 | 58.1 | 32.4 |
| C1 | 50 | 58.2 | 35.1 |
| C2 | 50 | 60.9 | **43.3** |

Diagnosis menyebut kalibrasinya "tidak monotonik". Yang sebenarnya terjadi lebih tajam:
kurvanya **berbentuk V terbalik**. B1 adalah yang paling SULIT, dan C2 yang paling MUDAH.
Panjangnya seragam ~58 kata di semua level. Artinya, di jalur Reading, label level praktis
dekoratif.

Ada temuan kedua yang tidak ada di diagnosis dan lebih menentukan untuk target IELTS/TOEFL:
**bacaan 58 kata tidak melatih membaca ujian sama sekali.** IELTS Academic memakai 700-1000
kata per bacaan, TOEFL sekitar 700. Selisihnya bukan soal kalibrasi; ini beda jenis latihan.
Memperbaiki urutan kesulitan 300 bacaan mikro akan menghasilkan bank mikro yang rapi, dan
murid tetap tidak pernah membaca satu pun teks sepanjang soal ujian.

## 2. Karena itu: jalur terpisah, bukan tambalan

`reading-exam-v1.json` membawa dua set berformat ujian penuh, ditulis dari nol:

| Set | Format | Kata | Soal | Waktu |
|---|---|---:|---:|---:|
| The Return of the Urban Tram | IELTS Academic Reading (B2) | 736 | 13 | 20 menit |
| Reading the Rings of Trees | TOEFL iBT Reading (C1) | 702 | 10 | 18 menit |

Sepuluh tipe soal, semuanya tipe asli kedua ujian - tidak ada yang diadaptasi:
True/False/Not Given, matching information, multiple choice, factual, negative factual
(EXCEPT), vocabulary in context, inference, sentence simplification, rhetorical purpose, dan
insert text.

Jalur ini **terpisah** dari bank lama dan tidak pernah masuk pool acak maupun adaptif. Dua
alasan: kontrak level m025-136 tetap utuh, dan murid tahu persis sedang berlatih yang mana.
Pilihan jawaban **tidak diacak** - mengacak "Position A-D" atau True/False/Not Given
menghancurkan artinya.

## 3. Gate yang memeriksa penulisnya sendiri

Kunci jawaban yang salah lebih buruk daripada tidak ada soal, jadi `reading-exam-test.js`
memverifikasi pekerjaan saya, bukan sekadar bentuk berkasnya:

- **Setiap kutipan bukti harus ada verbatim di bacaannya.** Bukti yang terdengar meyakinkan
  tetapi tidak ada di teks akan menggagalkan gate.
- **Kunci matching-information harus menunjuk paragraf yang benar-benar memuat buktinya** -
  nomor paragraf, isi paragraf, dan pilihan yang ditandai benar diperiksa bertiga.
- **TFNG memakai ketiga vonis.** Set yang tidak pernah menjawab "Not Given" tidak melatih tipe
  soal yang paling sering salah dijawab.
- Panjang bacaan wajib berada di rentang ujiannya, jumlah soal sesuai kontrak formatnya, dan
  set TOEFL wajib memuat tipe yang menghukum pembaca tergesa (EXCEPT, insert-text,
  sentence simplification).

## 4. Utang kalibrasi: dicatat, dijaga, tidak diklaim selesai

Bank lama **belum diperbaiki**. Gate mengukurnya setiap kali CI jalan, menulis angkanya ke
`READING-EXAM-REPORT.json`, dan menahan jumlah inversi di plafon terukur saat ini (3:
B1→B2, B2→C1, C1→C2). Kalau ada perubahan yang membuatnya lebih kacau, CI merah.

Plafon itu **bukan tanda sehat** - ia tanda utang yang berhenti bisa hilang diam-diam.

## 5. Bukti

- Seluruh **85 gate** `.github/workflows/quality.yml`: PASS.
- `reading-exam-test.js`: **24/24 PASS**, 23 soal, 10 tipe soal.
- `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV` naik bersama ke `m025-139`;
  `reading-exam-v1.json` masuk precache service worker.
- `git diff --check`: bersih.

## 6. Yang jujur belum tertutup

- **Dua set saja.** Cukup untuk mengenal bentuk soalnya, belum cukup untuk berlatih rutin.
  Kontrak format dan gate-nya sudah berdiri, jadi menambah set berikutnya tinggal menulis
  bacaan dan soal - bagian yang memang harus ditulis pelan-pelan supaya kuncinya benar.
- **Belum ada set A1-B1.** Bacaan 700 kata memang bukan untuk level itu; jalur menuju ke sana
  perlu dirancang tersendiri.
- **Kalibrasi 300 bacaan lama** tetap terbalik. Itu pekerjaan konten besar, dan kalau
  dikerjakan sebaiknya dengan penulisan ulang bertarget, bukan pelabelan ulang otomatis
  berdasarkan proxy keterbacaan - proxy itu tidak tahu apa-apa tentang kesesuaian topik.
- **Speaking dan Listening belum berbentuk ujian.**
- Sisa P1: B-01, B-04, B-06, B-07, B-11, B-12. Verdict HOLD diagnosis belum tercabut.
