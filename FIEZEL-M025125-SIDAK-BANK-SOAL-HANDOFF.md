# m025-125 — Sidak bank soal: temuan dan rencana perbaikan

Pemilik melaporkan dua cacat dari layar siswa:

1. **Soal ambigu.** *“Di lesson ini, ‘dance’ termasuk jenis kata apa?”* dengan pilihan kata
   benda / kata kerja / kata keterangan / kata sifat. Tanpa kalimat konteks, `dance` sah
   sebagai kata benda maupun kata kerja, jadi soal itu memang tidak bisa dijawab.
2. **Bahasa Inggris di bagian belajar.** Judul lesson (`SUBJECT OBJECT PRONOUNS AND
   POSSESSIVES`), pilihan pada soal “aturan mana yang menjelaskan jawaban”, dan alasan
   distraktor semuanya tampil dalam Bahasa Inggris.

## Hasil sidak

`node audit/bank-audit.js` menyisir keempat bank dan menulis `audit/BANK-SOAL-AUDIT.json`.

| Bank | Isi | Temuan |
| --- | --- | --- |
| Kosakata | 1.765 kata | 60 |
| Grammar | 129 template | 1.595 |
| Reading | 300 bacaan / 1.500 soal | 5.550 |
| Listening | 1.407 butir | 3.340 |
| Speaking | 36 butir | 0 |

**Total 10.545 temuan.** Yang terbesar:

- `reading/bocoran-template` (3.000) — stem membawa sisa generator apa adanya:
  *“In the case at a neighborhood repair studio, What problem is the case trying to
  understand? Target: “urban gardening access timing reliability”.”*
- `reading/pertanyaan-berbahasa-inggris` (1.500) — seluruh pertanyaan pemahaman.
- `listening/tanpa-penjelasan` (1.407) — tidak ada penjelasan apa pun setelah menjawab.
- `listening/pilihan-berbahasa-inggris` (1.091) dan `reading/pilihan-...` (1.050).
- `grammar/penjelasan-berbahasa-inggris` (855) — `rule`, `whyCorrect`, `objective`,
  `misconception`, `reasoning`, `howToAvoid`, `memoryCue`. Semua field ini **tampil sebagai
  pilihan jawaban**, bukan sekadar catatan internal.
- `grammar/alasan-distraktor-...` (370) dan `grammar/label-miskonsepsi-...` (241).

Temuan reading yang paling serius bukan soal bahasa: bacaan “Food Waste — Case 009” tidak
pernah menyebut observasi, tetapi soal urutannya menawarkan *“The group gathered observations
before testing the change.”* sebagai kunci. Jawabannya tidak ada di dalam teks.

### Aturan bahasa yang dipakai audit

- Boleh Inggris: teks bacaan, script listening, stem grammar, dan pilihan yang memang
  berupa bentuk Inggris yang sedang diuji (`is preparing`, `have been`).
- Wajib Indonesia: pertanyaan, penjelasan, aturan, alasan tiap distraktor, dan pilihan yang
  berupa pernyataan pemahaman.

## Yang sudah diperbaiki di rilis ini

### Kosakata — soal jenis kata tidak lagi ambigu

Stem sekarang menyandarkan kata pada kalimat contohnya:

> Dalam kalimat “They performed a traditional dance.”, kata “dance” berperan sebagai jenis kata apa?
> Dalam kalimat “They are building a new house next door.”, kata “building” (bentuk dari “build”) berperan sebagai jenis kata apa?

- `vocabSurfaceForm()` mencari bentuk kata sebagaimana benar-benar tertulis di kalimat —
  termasuk bentuk berimbuhan (`build` → `building`, `study` → `studies`) dan varian ejaan
  (`color/colour`) — lalu stem mengutip bentuk itu, bukan bentuk kamusnya.
- `partOfSpeechAskable()` menolak membuat soal jenis kata kalau kata targetnya tidak muncul
  di kalimat contoh. Hanya 6 dari 1.765 kata yang terkena; sisanya dialihkan ke soal arti.
- `PART_OF_SPEECH_ID` melengkapi label yang dulu bocor mentah (`prefix` → *awalan*,
  `number` → *kata bilangan*, `article` → *kata sandang*).
- Distraktor jenis kata kini diacak dari seluruh label, bukan tiga label pertama yang tetap.

### Grammar — judul dan teks cadangan sudah Bahasa Indonesia

- `grammar-labels-id.js` memetakan **seluruh 129 subskill** ke judul Bahasa Indonesia.
  `present_simple_vs_continuous` menjadi *“Kebiasaan atau sedang berlangsung: present simple
  dan present continuous”*. Nama bentuk grammar sengaja dipertahankan karena itu memang
  istilah yang dipelajari; yang diterjemahkan adalah kalimat penjelasnya.
- Dua teks cadangan berbahasa Inggris di `app.js` — `Correct: ...` dan *“… does not satisfy
  the grammar rule tested here.”* — diganti Bahasa Indonesia. Keduanya tampil sebagai
  **pilihan jawaban** pada mode latihan diagnosis distraktor.
- `grammarMeta()` sekarang membaca varian `...Id` lebih dulu (`ruleId`, `whyCorrectId`,
  `memoryCueId`, `objectiveId`, dan seterusnya), sehingga penerjemahan isi bank soal
  berikutnya cukup menambah field data tanpa menyentuh runtime lagi.

### Pagar

`bank-soal-audit-test.js` masuk ke Quality Gate dan mengunci: stem jenis kata wajib memuat
kalimat contoh, setiap `partOfSpeech` wajib punya label Indonesia, setiap subskill wajib
punya judul Indonesia, `grammar-labels-id.js` wajib dimuat sebelum `app.js` dan ikut
di-precache, serta kedua teks cadangan wajib tetap Bahasa Indonesia.

## Yang belum selesai

Sisa temuan bersifat data, bukan runtime, dan dikerjakan sebagai rilis lanjutan:

1. **Terjemahan isi 129 template grammar** (±1.466 kalimat: `ruleId`, `whyCorrectId`,
   `whyOthersFailId`, `howToAvoidId`, `memoryCueId`, `objectiveId`, `misconceptionId`,
   `reasoningId`, serta `whyFailsId`/`misconceptionId` tiap distraktor). Runtime sudah siap
   menerimanya.
2. **Reading bank ditulis ulang.** 300 bacaan sekarang adalah keluaran generator dengan
   bocoran template dan kunci jawaban yang tidak ada di dalam teks. Rencananya bank diganti
   dengan bacaan yang benar-benar ditulis dan soal yang jawabannya dapat ditunjuk di dalam
   teks — lebih sedikit bacaan, tetapi setiap soal bisa dijawab.
3. **Listening**: pertanyaan dan pilihan pemahaman dialihbahasakan, dan setiap butir
   diberi penjelasan Bahasa Indonesia setelah menjawab.

Jalankan ulang `node audit/bank-audit.js` setiap tahap untuk melihat angka temuan turun.
