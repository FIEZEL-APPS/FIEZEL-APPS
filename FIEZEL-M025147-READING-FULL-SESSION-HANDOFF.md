# m025-147 — Satu sesi Reading penuh, untuk masing-masing ujian

m025-139 membangun jalur Reading berformat ujian dengan **dua** bacaan. Cukup untuk mengenal
bentuk soalnya; tidak cukup untuk duduk satu sesi penuh. Rilis ini menutup selisihnya.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Yang kurang, diukur

| Ujian | Satu sesi penuh | Sebelum | Sesudah |
|---|---|---|---|
| IELTS Academic Reading | 3 bacaan, 40 soal, 60 menit | 1 bacaan, 13 soal | **3 bacaan, 40 soal** |
| TOEFL iBT Reading | 2 bacaan, 20 soal, 35 menit | 1 bacaan, 10 soal | **2 bacaan, 20 soal** |

Tiga bacaan baru, seluruhnya ditulis dari nol:

- **Why Buildings Fall Down Less Often** (IELTS, B2, 735 kata) — rekayasa struktur dan
  kebiasaan berbagi kegagalan.
- **The Problem of Measuring Poverty** (IELTS, C1, 752 kata) — pengukuran sosial dan definisi.
- **Why Some Lakes Turn Over** (TOEFL, B2, 700 kata) — limnologi.

## 2. Satu tipe soal baru, dan alasannya

IELTS memakai **dua** tipe yang bentuknya nyaris kembar:

- **True / False / Not Given** menguji **fakta** di dalam teks.
- **Yes / No / Not Given** menguji **pandangan penulis**.

Tertukarnya keduanya adalah salah satu sebab kehilangan nilai yang paling sering, dan sampai
rilis ini FIEZEL hanya melatih yang pertama. Bacaan kemiskinan — yang memang berisi argumen,
bukan sekadar keterangan — sekarang membawa empat soal YNNG, dan kontrak formatnya menjelaskan
perbedaannya.

## 3. Tiga kesalahan saya yang ditangkap gate

**Jumlah soal per bacaan.** Kontrak lama mematok `questionsPerPassage: 13` — padahal IELTS
memberi 40 soal untuk tiga bacaan (13/13/14), bukan 13 rata. Kontraknya diperbaiki agar
mengikuti ujiannya: **rentang per bacaan DAN total per sesi**. Ini lebih ketat, bukan lebih
longgar — rentang saja bisa lolos dengan jumlah bacaan yang salah, sedangkan total per sesi
menjaga bahwa satu sesi penuh benar-benar tersedia.

**Kutipan bukti yang tidak cocok.** Satu kutipan memakai tanda hubung biasa sedangkan teksnya
memakai em dash. Kutipannya saya perbaiki, dan normalisasi gate diperluas agar varian
tipografis tanda hubung tidak lagi menentukan lulus-tidaknya — tanpa melonggarkan pemeriksaan
isinya.

**Vonis YNNG yang timpang.** Keempat soal YNNG pertama saya berjawab No, No, No, Not Given —
tidak pernah "Yes". Murid yang menyadari polanya bisa menebak tanpa membaca. Gate baru menuntut
ketiga vonis terpakai, sama seperti yang sudah berlaku untuk TFNG, dan satu soal diganti:
yang lama ("penulis menganggap ukuran absolut penipuan") adalah pembeda lemah karena tidak ada
pembaca yang benar-benar menduga penulis berkata begitu.

## 4. Bukti

- Seluruh **91 gate** `.github/workflows/quality.yml`: PASS.
- `reading-exam-test.js`: **28/28 PASS** — 5 bacaan, 60 soal, 11 tipe soal.
- Sebaran vonis: TFNG True 6 / False 4 / Not Given 2; YNNG Yes 1 / No 2 / Not Given 1.
- Setiap kutipan bukti diverifikasi ada verbatim di bacaannya; setiap kunci
  matching-information diverifikasi menunjuk paragraf yang memuat buktinya.
- Versi naik bersama ke `m025-147`.

## 5. Sisa

- **Baru satu sesi penuh per ujian.** Berlatih sampai hari ujian butuh beberapa sesi, dan
  bacaan yang sudah dikerjakan kehilangan sebagian nilainya saat diulang.
- **Belum ada mode sesi penuh bertimer.** Bacaannya kini cukup untuk itu — menjalankan tiga
  bacaan berturut-turut dalam 60 menit adalah langkah berikutnya yang wajar, dan itulah yang
  melatih ketahanan, bukan hanya pengenalan bentuk soal.
- Kalibrasi 300 bacaan lama (B-08/B-09) masih terbalik.
- Listening enam set, Speaking sebelas.
