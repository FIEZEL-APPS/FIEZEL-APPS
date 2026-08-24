# m025-138 — Writing berbentuk ujian, dan rubrik yang menilainya

Menutup temuan **B-10** dari `FIEZEL-BRAIN-CORE-RE-DIAGNOSIS-2026-08-23`, dan menutup jarak
yang lebih besar dari itu: FIEZEL menyebut IELTS/TOEFL di seluruh copy motivasinya — pesan
login, brief tujuan, peta kesiapan akademik — tetapi tidak pernah sekali pun menyuruh murid
menulis esai Task 2, dan tidak punya alat untuk menilainya.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.** Otoritas rilis tetap milik
OWNER/MASTER.

---

## 1. Keadaan sebelumnya, diukur

9 prompt untuk enam level: A1=2, A2=2, B1=2, **B2=1, C1=1, C2=1**. Tiga level teratas —
persis level tempat persiapan ujian sesungguhnya terjadi — punya satu soal masing-masing.
Tidak ada yang berbentuk soal ujian. "Penilaian" offline-nya menghitung kata, kalimat, dan
kata yang berulang; umpan balik AI-nya tiga bagian bebas tanpa kriteria.

## 2. Yang dikerjakan

**`writing-prompts-v1.json`** — 36 prompt, **enam per level**, tiap level minimal tiga genre.
23 di antaranya berbentuk soal ujian sungguhan dengan kontraknya sendiri:

| Bentuk | Batas kata | Waktu |
|---|---|---|
| IELTS Writing Task 2 (opini, dua sisi, masalah-solusi, untung-rugi, dua pertanyaan) | 250 | 40 menit |
| IELTS General Training Task 1 (surat, tiga poin wajib) | 150 | 20 menit |
| IELTS Academic Task 1 (laporan data) | 150 | 20 menit |
| TOEFL iBT Writing for an Academic Discussion | 100 | 10 menit |
| TOEFL iBT Integrated Writing (**adaptasi teks**) | 150 | 20 menit |

A1 dan A2 sengaja tetap fondasi tanpa label ujian — memberi label IELTS pada tugas lima
kalimat hanya akan mengaburkan artinya.

**Rubrik analitik 0–4, lima kriteria**, deskriptor lengkap untuk tiap tingkat: penuntasan
tugas, keruntutan dan keterkaitan, kekayaan kosakata, ragam dan ketepatan tata bahasa, serta
nada dan kerapian. Empat yang pertama mengikuti keluarga kriteria IELTS Writing; yang kelima
dipisah supaya bisa dilatih sendiri.

**Batas kata yang mengikat.** `writingTargetWords()` mengambil angka terbesar antara target
prompt dan batas ujiannya. Di IELTS, tulisan di bawah batas kena penalti sebelum isinya
sempat dinilai — menampilkan target yang lebih rendah daripada ujian aslinya berarti melatih
murid gagal pada hal yang paling mudah dihindari.

## 3. Batas kejujuran yang saya jaga

Modul Academic Readiness sudah lama menyatakan FIEZEL **tidak memprediksi skor IELTS/TOEFL**.
Pekerjaan ini tidak boleh diam-diam melanggarnya, jadi:

- **Cek offline tidak mengeluarkan skor.** `writingFormSignals()` dan `writingFormChecklist()`
  hanya menghitung BENTUK: panjang terhadap batas ujian, jumlah paragraf, kata yang menumpuk.
  Dua kriteria terakhir — ketepatan tata bahasa dan nada — dikembalikan berstatus `ai` dengan
  alasan tertulis, karena keduanya memang tidak bisa dinilai tanpa membaca. Gate akan GAGAL
  kalau cek offline mulai mencetak pola `n/4`.
- **Prompt AI dilarang menyebut band.** Instruksinya memuat aturan keras: jangan menyebut band
  IELTS atau skor TOEFL, dan jangan menyatakan murid siap atau belum siap ujian. Yang diminta
  hanya 0–4 per kriteria dengan bukti dari tulisannya, satu langkah berikutnya, dan satu
  kalimat yang ditulis ulang.
- **Format yang tidak bisa direplikasi mengaku sebagai adaptasi.** TOEFL Integrated aslinya
  memakai kuliah audio; FIEZEL menyajikan bantahannya tertulis. Dua prompt itu diberi label
  `toefl_integrated_adapted`, membawa `sourceNote`, dan gate memaksa label itu tetap ada.

Rubrik ini alat latihan dan umpan balik. Band resmi hanya keluar dari ujian resmi.

## 4. Bukti

- Seluruh **84 gate** `.github/workflows/quality.yml`: PASS.
- `writing-rubric-test.js`: **29/29 PASS**, termasuk fixture yang menjalankan pemeriksa bentuk
  yang asli di dalam `vm` — bukan mencocokkan regex: esai 12 kata dilaporkan di bawah batas 250
  IELTS, esai 260 kata lolos, tiga paragraf lolos cek struktur, pengulangan berat terdeteksi,
  dan tepat dua kriteria mengaku butuh AI.
- `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV` naik bersama ke `m025-138`;
  `writing-prompts-v1.json` masuk precache service worker.
- `git diff --check`: bersih.

## 5. Yang jujur belum tertutup

- **Reading belum terkalibrasi ujian** (B-08/B-09): 61 item masih di review queue, dan proxy
  keterbacaan tidak monotonik menurut CEFR — C2 justru terbaca paling mudah. Untuk target
  IELTS/TOEFL, ini yang paling layak dikerjakan berikutnya.
- **Speaking belum berbentuk ujian.** Bank Speaking ada, tetapi belum mengikuti struktur IELTS
  Part 1/2/3 atau TOEFL Speaking Task 1–4.
- **Listening belum berbentuk ujian**, dan TOEFL Integrated yang sebenarnya butuh audio.
- Sisa P1 lain: B-01, B-04, B-06, B-07, B-11, B-12. Verdict HOLD diagnosis belum tercabut.
