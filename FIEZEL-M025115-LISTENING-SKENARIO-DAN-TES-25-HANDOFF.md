# FIEZEL — Bank listening dari skenario, dan tes penempatan 25 soal (handoff m025-115)

Rilis: `m025-115`
Status: **menunggu penerimaan fisik OWNER** (A12 Evidence Gatekeeper — lihat bagian 7)

Berkas yang berubah: `features/speaking-listening/listening-quality.js` (baru),
`listening-generate.js`, `listening-lint.js` (baru), `listening-scenarios-{a1,a2,b1,b2,c1,c2}.js`
(baru), `listening-bank-v1.json`, `speaking-listening-config.js`, `check-listening-similarity.js`
(baru), `rebuild-speaking-listening-data.js`, `app.js`, `style.css`,
`features/onboarding/fiezel-onboarding.js`, `features/diagnostics/fiezel-diagnostic-targets.js`,
`tools/fiezel-guardians.mjs`, `regression-test.js`, `speaking-listening-test.js`,
`onboarding-test.js`, `diagnostic-scanner-test.js`, `.github/workflows/quality.yml`,
`core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `sw.js`

Dihapus: `listening-source-{a1-a2,b1-b2,c1-c2}.js`

---

## 1. Kenapa dokumen ini ada

OWNER memeriksa sendiri bank soal listening hasil m025-108 dan menolaknya:

> "aku baru saja mengecek soal a1 aku ga suka"

lalu memberi enam aturan, dan sebelum satu soal baru boleh ditulis:

> "kamu harus diagnosa lebih detail lagi, dan harus ketat dalam pembuatan soal, karena ini
> akan berdampak kepada siswa yang belajar, dan hanya mengikuti kamu, tanpa tahu atau benar,
> itu larangan exstream"

Kalimat terakhir itu yang menentukan bentuk seluruh pekerjaan ini: mutu tidak boleh
bergantung pada ketelitian penulisnya saat itu, karena murid tidak punya cara memeriksa.

Berikutnya, OWNER mengganti tes penempatan:

> "buat ulang soal tes kemampuan yang terdiri 150 soal itu, menjadi 25 soal test kemampuan
> dasar, tanpa ada reading, tapi masukkan listening, grammar, dan vocabulary, level A1-C2,
> dengan pilihan soal yang beragam dan tingkatan kesusahan paling gampang, dan polanya sama
> seperti sebelumnya, setiap kali user masuk urutan soalnya acak"

---

## 2. Diagnosa bank lama — angka, bukan rasa

Diukur pada 1236 soal sebelum satu baris ditulis:

| Aturan OWNER | Hasil | Bukti |
|---|---|---|
| 1. Tidak mirip pola | GAGAL | C2 45% naskah berbagi empat kata pembuka; C1 25%; B1 18% |
| 2. Skenario/karakter unik | GAGAL TOTAL | **5 nama orang untuk 1236 soal**; 1231 soal tanpa karakter |
| 3. Format resmi + distraktor logis | GAGAL | 3 tipe saja; **28% soal terjawab lewat pencocokan kata tanpa mendengar**; 158 soal punya pengecoh yang menempel ke naskah >= kuncinya |
| 4. Kalibrasi CEFR | GAGAL | 99-100% naskah satu kalimat; B2 (12,2 kata) lebih pendek dari B1 (13,2) |
| 5. Cross-check sebelum output | TIDAK ADA | `assertSound` lama tidak punya satu pun pemeriksaan kemiripan |
| 6. Schema + tombol Next | LULUS | selesai di m025-110 |

Tambahan: 92 naskah ejaan British sementara voice-nya `en-US`; di C2 kunci adalah opsi
terpanjang pada 50% soal (peluang acak 25-40%).

## 3. Bentuk barunya: satu skenario, lima soal

240 skenario (40 per level), masing-masing dengan karakter, tempat, dan situasi sendiri.
Dari satu skenario lahir lima soal format resmi TOEFL/IELTS — gist, detail, inference,
attitude/purpose, paraphrase — ditambah satu dictation yang kalimatnya diambil dari naskah
skenario yang sama. Total 1407 soal.

Naskahnya kini beberapa kalimat, dan itu bukan pilihan gaya: gist dan inference tidak bisa
diuji sungguhan pada satu kalimat tunggal, sedangkan bank lama 99% satu kalimat.

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Karakter unik | 5 | 240 |
| Naskah berbagi empat kata pembuka | sampai 45% | 0 |
| Terjawab lewat pencocokan kata | 28% | 0% |
| Pengecoh lebih kuat dari kunci | 158 soal | 0 |
| Pertanyaan unik | ~360 | 1196 |
| Panjang naskah A1 -> C2 (kata) | 7,5 / 10,2 / 13,2 / 12,2 / 12,4 / 12,6 | 38 / 47 / 58 / 64 / 75 / 86 |

## 4. Gerbangnya, bukan kehati-hatiannya

`features/speaking-listening/listening-quality.js` menegakkan setiap cacat terukur di atas
sebagai aturan, dan **dijalankan generator sebelum berkas ditulis** — bank cacat tidak
pernah sampai tersimpan, bukan ditemukan berminggu-minggu kemudian di CI.

Ditolak: naskah berbagi empat kata pembuka atau Jaccard trigram >= 0,34 · karakter atau
setting dipakai dua skenario · string pengecoh dipakai lebih dari dua kali · soal terjawab
tanpa mendengar · pengecoh lebih menempel daripada kunci pada gist/detail · paraphrase yang
justru paling harfiah · kunci jadi opsi terpanjang di atas 40% per level · sebaran posisi
jawaban di luar 18-32% · panjang dan kepadatan kata di luar pita CEFR · ejaan British.

Dua alat pendamping:
- `listening-lint.js` — aturan sama, tetapi melaporkan SEMUA pelanggaran sekaligus. Gerbang
  berhenti di pelanggaran pertama; itu benar untuk gerbang dan menyiksa saat menulis
  ratusan skenario.
- `check-listening-similarity.js` (root, terpasang di CI) — memeriksa bank yang SUDAH
  tersimpan dan melaporkan semua pasangan mirip. Hasil sekarang: 4680 pasangan
  dibandingkan, **nol temuan**, bahkan pada ambang 0,15.

## 5. Tes penempatan: 150 -> 25 soal kemampuan dasar

- **Tanpa reading.** Tes ini gerbang pertama sebelum murid punya kebiasaan apa pun, dan satu
  paragraf bacaan di soal ketiga adalah tempat murid berhenti. Blueprint lama memuat 48 soal
  reading dari 150.
- **Bentuk termudah di tiap level.** Vocabulary dikunci ke arti langsung (`makeVocabQuestion`
  kini menerima `preferType`), grammar ke mode penerapan dasar, listening hanya gist dan
  detail. Tanpa penguncian ini, satu tes 25 soal bisa kebetulan berisi empat soal
  part-of-speech dan salah membaca level.
- **Bobot menurun A1 -> C2: 6/5/4/4/3/3.** Tes yang berat di pangkalnya menghasilkan angka
  lebih rapat justru di tempat sebagian besar murid berada.
- **Urutan diacak setiap masuk**, lewat `quizLoop` — pola yang sama dengan Skills Lab.

Naskah listening **tidak pernah** dirender sebagai teks; kalau dirender, soalnya berubah
menjadi soal membaca dan tes ini justru dibuat tanpa reading. Murid menekan **Dengarkan**,
pilihan terkunci sampai audio berbunyi — dan **terbuka juga bila suaranya gagal**, supaya
murid tidak terjebak di soal yang tidak bisa dijawab.

## 6. Yang ditemukan di alat, bukan di produk

`tools/fiezel-guardians.mjs` memanggil `spawnSync` dengan `maxBuffer` bawaan 1 MB. Diff
lebih besar dari itu membuat anak prosesnya dibunuh, `status` menjadi `null`, dan A9
Security Sentinel serta A10 Regression Watcher melaporkannya sebagai `git diff failed` —
kegagalan alat yang terbaca persis seperti temuan keamanan. Satu perubahan konten besar
cukup untuk memblokir kedua gerbang itu selamanya tanpa ada yang salah di perubahannya.
`maxBuffer` dinaikkan ke 64 MB. A9 dan A10 kembali PASS.

## 7. Langkah berikutnya — yang HANYA bisa dilakukan OWNER

A12 Evidence Gatekeeper menahan rilis ini karena perubahan menyentuh jalur suara, dan
penerimaan fisik bukan sesuatu yang boleh diberikan mesin kepada dirinya sendiri.

Yang perlu OWNER coba di perangkat sungguhan:

1. Buka **Tes Kemampuan Dasar**, mulai 25 soal.
2. Pada soal listening, tekan **Dengarkan** — pastikan suaranya berbunyi dan pilihan
   jawaban terbuka setelahnya.
3. Matikan koneksi lalu ulangi satu soal listening — pastikan pilihan tetap **terbuka**
   (murid tidak boleh terkunci) dan pesan kegagalannya terbaca.
4. Buka **Skills Lab -> Listening**, pastikan soal-soal skenario baru berbunyi seperti
   biasa dan subtitle Indonesia tetap berjalan.

Setelah itu, tambahkan penanda ini ke badan PR:

```
<!-- FIEZEL_PHYSICAL_ACCEPTANCE: ACCEPTED -->
```

Selama penanda itu belum ada, PR ditahan sebagai draft dan A12 melaporkan `HOLD_DRAFT`,
bukan `BLOCK`. Tidak ada bagian dari pekerjaan ini yang boleh memberi dirinya sendiri
otoritas rilis.
