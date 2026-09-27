# m025-378 — Soal latihan grammar baru A1–A2

Build m025-378: nomor m025-377 dipakai lebih dulu oleh `main` (#474), jadi PR ini naik satu lewat
`tools/bump-build.mjs` sesudah `main` digabung.

Lanjutan m025-375 (sesi lesson "latihan dulu", 10 soal). Di sana tercatat utang terbesar: tiap lesson hanya
punya 1–2 kalimat Inggris, jadi sesi 10 soal memakai kalimat yang sama ±5× dalam bentuk berbeda. Owner meminta
soal baru yang "sangat sempurna dan tidak membosankan", disusun dari riset, lalu diuji dengan memposisikan diri
sebagai murid, termasuk ketepatan bahasa Indonesianya.

## Hasil

| | Sebelum | Sesudah |
| --- | --- | --- |
| Templat grammar | 328 | 512 (+184) |
| Kalimat per lesson A1 (17 lesson) | 2 | 6 |
| Kalimat per lesson A2 (lesson 18–46, 29 lesson) | 2 | 6 |
| Nama label miskonsepsi berdiagnosis | 682 | 865 (+183, semua punya kode taksonomi) |
| Butir cloze (dibangun dari templat) | 279 | 436 |

Soal baru: A1-301..368 (paket `new-templates-g.json`), A2-301..356 (`new-templates-h.json`), dan A2-357..416 (`new-templates-i.json`). Setiap soal
membawa teks Inggris, Indonesia, dan Thai: tujuan, miskonsepsi, aturan, alasan benar, alasan tiap pilihan salah,
perbandingan pilihan, cara cek, pengingat, dan 3 langkah penalaran.

## Riset yang dipakai

| Sumber | Yang diambil |
| --- | --- |
| Shute (2008), *Focus on Formative Feedback* | Umpan balik spesifik, tidak menilai, **pendek**; jawaban benar + kenapa + kenapa pilihanmu keliru. |
| Haladyna, Downing & Rodriguez (2002), pedoman penulisan pilihan ganda | Satu jawaban benar; pengecoh masuk akal dan diambil dari kesalahan khas murid; pilihan sejajar; tanpa isyarat tak sengaja. |
| Analisis galat pelajar Indonesia (tense, artikel, preposisi, kesesuaian subjek-verba, *be* hilang) | Pengecoh meniru galat nyata: *be* hilang, -s hilang/berlebih, “di” diterjemahkan jadi *in*, “sama dengan” jadi *same with*, “selama” jadi *during five years*. |
| Studi galat pelajar Thai (bahasa tak berinfleksi, tanpa artikel) | Penjelasan Thai menyebut isyarat waktu/subjek secara eksplisit; tidak ada teks Indonesia yang bocor. |
| *Retrieval practice*, *spacing*, *interleaving* | Satu aturan dilatih lewat banyak kalimat berbeda, bukan satu kalimat diulang. |
| Audit FIEZEL m025-255/256/375 | "Grammar-nya yang menantang, bukan bacaannya"; teks Indonesia A1–A2 pendek; contoh Inggris di dalam “…”. |

Kalimat soal memakai konteks murid (sekolah, keluarga, jajan, HP, bus, liburan) dan nama Indonesia/Thai.

## Cara soal disusun dan diperiksa

Alat: `tools/dev/grammar-authoring/` (README di sana). Sumber soal ditulis sebagai modul Python ringkas; pembangun
menghasilkan paket JSON dan menolaknya bila ada satu saja pelanggaran. Aturannya tumbuh dari kesalahan yang
ditemukan saat soal dimainkan sebagai murid di mesin aplikasi yang sebenarnya:

- Panel menampilkan “opsi” + alasan, jadi alasan pilihan salah harus berupa predikat. Sekitar 35 alasan awal
  terbaca janggal ("“walk” sesudah subjek …") dan ditulis ulang.
- Mode "kenapa benar" membuang alasan yang menyebut kunci; mode "betulkan pilihan teman" menyambung
  "Yang benar “X”: …", jadi alasan benar tidak boleh berakhir dengan jawabannya.
- Tuntunan langkah tampil sebelum murid memilih lagi, jadi langkah terakhir tidak boleh membocorkan jawaban.
- Filter tutor app.js menolak teks yang terlalu banyak kata Inggris; beberapa aturan dan alasan harus ditulis ulang
  supaya tutor benar-benar membacakannya.
- Thai: dua kutipan Inggris berdempetan dibaca sebagai daftar kata; disisipkan penyambung ("ส่วน"). Kalimat yang
  terdeteksi sebagai terjemahan kata per kata ditulis ulang.
- Audit membandingkan opsi setelah apostrof dibuang: *brothers'* dan *brothers* dianggap kembar (A2-310 diganti *brother*).

Setelah itu setiap soal dibaca ulang sebagai murid, dalam bahasa Indonesia dan Thai. Yang diganti karena alasan isi:

- Pengecoh yang ternyata masih sah di bahasa Inggris nyata dibuang: *you will get purple* untuk fakta umum,
  *some old photo* (lisan), *Which is big, a cat or a dog?*, *Some apples were sweet* (dibaca "sebagian"),
  *so fast like*, dan *so that* sebagai pengecoh akibat (A2-410: *The shop was closed, so that we went home* sah
  dalam ragam resmi, jadi diganti *but*).
- Istilah yang tidak dikenal murid diganti: "kata kerja polos/kata sifat polos" → "bentuk dasar".
- Label yang teks diagnosisnya tidak cocok dengan pilihan diganti label yang tepat atau label baru (183 label baru,
  dipetakan ke 49 kode taksonomi yang sudah ada).

## Perubahan kode (m025-378)

- **Rencana sesi berbasis slot** (`buildGrammarLessonQuestions`): 10 slot, 7 latihan bentuk + 3 soal "kenapa".
  Slot latihan mengambil kalimat yang paling jarang muncul; kalimat yang sama tidak muncul dua kali berturut-turut;
  sesi berikutnya dibuka dengan kalimat lain. Dengan 6 kalimat, satu sesi memperlihatkan 6 kalimat berbeda.
- **Alasan pilihan salah memakai alasan kartu itu sendiri** lebih dulu, baru diagnosis label bersama.
- **Tuntunan langkah dari `reasoningId`** (Indonesia, atau Thai lewat overlay), tanpa titik akhir di Thai.
- `grammarCausalKey`: kartu "Yang benar “X”: …" tidak lagi mengecilkan huruf nama/hari yang tertulis di soal
  ("monday", "nadia").
- `adaptiveGrammarItems`: pool adaptif mengambil 2 kalimat per lesson (3 untuk lesson sasaran), bergilir dari jumlah
  jawaban. Tanpa ini kandidat grammar melipat tiga dan mendesak reading keluar dari pool (`regression-test`).
- `tools/grammar-upgrade/stem-rewrites.json` disamakan dengan bank: 19 stem yang diedit sesudah paket rewrite ditulis
  selama ini dikembalikan diam-diam setiap pipa dijalankan.
- `tools/apply-grammar-upgrade.js` membaca paket a..i.
- `grammarReasonForLearner`: pencocokan "alasan sudah diawali opsinya" kini berhenti di batas kata. Sebelumnya alasan
  "bentuk dasar…" untuk opsi *be* dan "artinya…" untuk opsi *a* tampil tanpa kutipan opsi (12 alasan, 5 di antaranya lama).
- `grammarVersionReason` (mode "pilih kalimat yang benar"): alasan pilihan salah kini dibuka "Di kalimat ini, “opsi” …"
  (Thai "ในประโยคนี้ …"). Sebelumnya "Versi pakai “beauty” kata benda" terbaca seolah versinya yang kata benda, dan 206
  alasan lama yang sudah diawali opsinya tampil dobel: "Versi pakai “less” “less” disediain…". Baris jawaban benar tetap
  "Versi pakai “X” pas — …".
- `grammarCausalKey`: alasan yang dibuka dengan kutipan Inggris ikut dikecilkan saat disambung di tengah kalimat
  ("pas di sini — “expensive” kata panjang", bukan "“Expensive”"). Yang dicocokkan ke soal adalah seluruh isi kutipan,
  jadi kutipan yang memang tertulis begitu di soal ("Look!", "My dad", "July") tetap berhuruf besar.

## Gerbang

Semua dijalankan dari checkout ini. Daftar lengkap `quality.yml`: lihat deskripsi PR untuk hasil terakhir.
Yang langsung menyentuh konten baru: `grammar-quality-audit.js`, `content-integrity-audit.js` (0 kritis;
8 MAJOR lama yang juga ada di `main`), `tests/misconception-diagnosis-test.js` (865 nama, cakupan 100%),
`tests/misconception-taxonomy-test.js`, `tests/lesson-experience-test.js` (0 duplikat lintas lesson), `tests/th-coverage-test.js`, `tests/th-bank-purity-test.js`, `tests/step-tutor-test.js`,
`tests/content-integrity-gate-test.js`, `tests/regression-test.js`, `tests/cloze-bank-test.js`,
`tests/id-golden-snapshot-test.js` (baseline diregenerasi karena perubahan disengaja).

## Temuan lama yang tidak diubah di PR ini

1. Teks diagnosis label lama memakai ragam sangat santai ("buat", "udah", "kayak"); teks baru memakai santai-rapi.
2. Beberapa label lama tidak cocok dengan pilihannya: A1-204, A1-205, TA-202, CM-201; QN-201 *none* memakai label
   "memecah kata ganti negatif jadi dua kata"; TA-203 *don't knowing* memakai label yang teksnya soal pola lain.
3. CO-001 menyalahkan *will melt* untuk fakta umum, padahal *will* di bagian akibat masih wajar dalam bahasa Inggris nyata.
4. AR-001/AR-101 memakai *some* + kata benda tunggal sebagai pengecoh; di bahasa lisan bentuk itu masih dipakai.
5. Opsi "(no article)" (AR-004, AR-201, dan 2 lainnya) tampil harfiah di mode "pilih kalimat yang benar".
6. A1-023 masih memakai istilah "nomina tak tercacah"; beberapa aturan lama diawali huruf kecil.
7. Mode "kenapa benar": alasan yang benar adalah satu-satunya yang menyebut jawabannya (desain mesin).

## Sisa pekerjaan

- Semua lesson A1 dan A2 sudah 6 kalimat. B1–C2 belum disentuh: alurnya sama (sumber baru di
  `tools/dev/grammar-authoring/sources/`, paket baru, lalu dimainkan sebagai murid dalam Indonesia dan Thai).
