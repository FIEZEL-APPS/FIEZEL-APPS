# m025-375 — Grammar "latihan dulu": sesi 10 soal + penjelasan khusus lesson

## Latar

Lebih dari 50 murid melaporkan bahwa soal dan penjelasan BrainCore FIEZEL "susah dipahami —
bahasanya, panjang kalimatnya, pokoknya semuanya". Sebelum mengubah apa pun, latihan grammar,
kosakata, dan membaca dikerjakan seperti murid: aplikasi dijalankan di VM Node (pola harness
`content-integrity-audit.js`), soal dirakit lewat fungsi produksi (`buildGrammarLessonQuestions`,
`makeVocabQuestion`, `makeReadingQuestion`), dan setiap soal dibaca beserta pembahasan dan
giliran tutornya.

## Yang ditemukan saat mengerjakan latihannya

1. **80% soal grammar bukan latihan bahasa Inggris** — di setiap level. Tiap lesson punya 1–2
   kalimat Inggris (180 lesson, 328 templat), lalu "diregangkan" jadi 25 soal lewat 25 mode.
   Hanya 5 mode (isi titik-titik, pilih kalimat, perbaiki) yang melatih bahasa Inggris. Sisanya
   bertanya "Tujuan belajar mana yang cocok?", "Langkah berpikir mana yang paling tepat?",
   "Kalimat ini termasuk kelompok grammar mana?", "Cek mandiri apa yang paling tepat?".
2. **Pilihan jawaban teori panjang dan penuh istilah.** Rata-rata 11–16 kata per pilihan,
   maksimum 52 (A1) sampai 62 kata (B1/B2) — empat pilihan seperti itu per soal. 29% soal A1
   memuat istilah seperti "nomina tercacah", "refleksif", "kepemilikan mandiri".
3. **Pilihan dipinjam dari lesson lain** yang belum pernah dipelajari murid. Lesson A1 pertama
   ("I, me, my") meminta murid menolak aturan refleksif, *each other*, dan *one/ones*.
4. **Kalimat yang sama muncul ±12 kali** dalam satu sesi dengan bingkai teori berbeda.
5. **Penjelasan sesudah menjawab panjang dan generik** (±60 kata). Panel "Intinya" menempelkan
   strategi umum sekeluarga ("Mulai dari subjek, kata kerja utama, dan waktu kejadian…") plus
   "Fokus khusus: <judul lesson>" — bahkan di lesson kata ganti. Pegangan ingatan selalu
   "Inget fokus …, ya. Cek kenapa tiap jebakan beda dari jawaban benar." Tutor membacakan
   kalimat generik yang sama sebagai "Pegangan singkatnya".
   Padahal **setiap templat sudah punya aturan, pengingat, dan cara cek sendiri yang pendek**
   ("He, she, it: kata kerjanya dapat -s.") — 328/328 terisi id dan th — dan justru teks itu
   yang dipakai sebagai *pilihan* soal teori, bukan sebagai penjelasan.
6. **Murid Thai** menerima alasan "pilihan ini salah" yang generik ("ไม่ตรงกับเวลา หน้าที่
   หรือโครงสร้าง…") untuk hampir setiap pilihan salah, karena jalur nama miskonsepsi hanya
   berbahasa Indonesia dan heuristik cadangannya mencocokkan istilah Inggris.
7. **Kosakata:** kunci soal sinonim selalu `synonyms[0]` — 694 dari 1.016 kata menjawab dengan
   kata yang tidak ada di bank atau di atas level murid (A2 "ancestor" → "forebear"). Soal arti
   kata tidak menampilkan kalimat, tetapi pembahasannya menyuruh "baca seluruh kalimat".
8. Reading A1–B1 wajar: pertanyaan pendek, pilihan 5–6 kata, bukti dikutip dari teks.

## Perubahan

| Bagian | Sebelum | Sesudah |
| --- | --- | --- |
| Sesi lesson | 25 soal, 25 mode | maks 10 soal (`GRAMMAR_SESSION_SIZE`), dari `GRAMMAR_LESSON_MODES` |
| Mode lesson | 25, termasuk 16 mode teori | isi titik-titik, pilih kalimat, perbaiki pilihan teman, "kenapa benar", "kenapa salah" |
| Asal pilihan | boleh pinjaman lesson lain | hanya teks milik lesson itu (`grammarLessonQuestionOwnOnly`) |
| "Intinya" + aturan | 1 paragraf: alasan + strategi keluarga + "Fokus khusus" | alasan, lalu baris "Aturannya:" dengan aturan lesson |
| Pegangan ingatan / tutor | kalimat generik | `memoryCue` lesson (id/th) |
| Bandingkan pilihan | kalimat generik | `whyOthersFail` + `howToAvoid` lesson |
| Alasan pilihan salah | kategori heuristik bila tak ada nama miskonsepsi (selalu di th) | alasan bank soal pilihan itu; soal "kenapa salah" menegaskan alasan kartunya sendiri |
| Halaman materi | petunjuk & tips generik, "25 mode latihan terfokus", "diagnosis distraktor" | alasan contoh + pengingat lesson, "10 soal latihan singkat" |
| Latihan adaptif | varian 0..7 (5 di antaranya teori) | 5 mode pertama `GRAMMAR_LESSON_MODES`, tanpa pinjaman |
| Sinonim vocab | `synonyms[0]` | sinonim yang ada di bank pada level ≤ kata itu, atau jadi soal arti |
| Pembahasan soal arti | "baca seluruh kalimat" | kalimat contoh bank + terjemahan |

Lesson dua templat (A1–B2, 148 lesson): 10 soal. Lesson satu templat (C1/C2): 8–9 soal —
`GRAMMAR_SESSION_MIN` = 5 adalah batas bawah sesi yang masih dibuka.

### Angka sesudah (seluruh 180 lesson)

| Level | Latihan Inggris | Kata maks per pilihan non-latihan | Kata pembahasan (rata-rata) | Soal berpilihan istilah |
| --- | --- | --- | --- | --- |
| A1 | 20% → 63% | 52 → 18 | 59 → 38 | 29% → 8% |
| A2 | 20% → 66% | 58 → 29 | 62 → 44 | 30% → 9% |
| B1 | 20% → 65% | 62 → 28 | 63 → 48 | 37% → 12% |
| B2 | 20% → 66% | 62 → 32 | 65 → 52 | 46% → 17% |
| C1 | 20% → 58% | 59 → 37 | 63 → 54 | 54% → 22% |
| C2 | 20% → 58% | 51 → 33 | 62 → 51 | 59% → 31% |

Pilihan pinjaman dari lesson lain di sesi lesson: **0**.

## Yang sengaja TIDAK diubah

- Mesin 25 mode (`GRAMMAR_PRACTICE_MODES`, `grammarExercise`) tetap utuh — indeksnya kontrak
  `fiezel-item-prior.js`, audit, dan gerbang provenansi. Hanya pemilihan mode sesi yang berubah;
  kembali ke 25 mode cukup mengganti `GRAMMAR_LESSON_MODES`/`GRAMMAR_SESSION_SIZE`.
- `grammar-templates.json` dan bank penjelasan tidak disentuh (byte-identik, dikunci baseline emas);
  `practiceBlueprintVersion` tetap `focused-25-v1` karena menggambarkan mesin generatornya.
- Naskah tutor BrainCore (`brain-tutor.*`) tidak diubah; isinya membaik karena bahan yang
  diterimanya kini aturan & pengingat lesson.
- Ujian (`EXAM_MODES`), Sesi Kilat (lima mode bentuk), dan gerbang Lewati Materi tetap memakai
  kontraknya; Sesi Kilat kini merakit mode bentuknya sendiri lewat `buildGrammarModeQuestions`.

## Gerbang yang diperbarui ke kontrak baru

`grammar-quality-audit.js`, `content-integrity-audit.js`, `product-audit.js`, `release-audit.py`,
`tests/lesson-experience-test.js`, `tests/content-integrity-gate-test.js`,
`tests/experience-integration-test.js`, `tests/regression-test.js`,
`tests/r2-ux-overhaul-smoke-test.js`, cek kontrak grammar di `release-audit.py`, `tests/grammar-memory-scope-test.js` (kini menjaga generator
`recall_memory_cue` langsung, karena sesi lesson tidak lagi memakainya). Asersi baru: sesi lesson
hanya berisi mode lesson, nol pilihan pinjaman, minimal separuh soal latihan bentuk, dan lesson
dua templat dibuka dengan isian kalimat.

## Utang yang tersisa (butuh keputusan konten owner)

1. **Variasi kalimat.** Tiap lesson tetap hanya punya 1–2 kalimat Inggris; sesi 10 soal memakai
   kalimat yang sama ±5 kali dalam bentuk berbeda. Obat sebenarnya adalah menulis 4–6 kalimat
   baru per lesson (mulai A1–A2: 46 lesson), lengkap dengan alasan id + th.
2. **Register.** Teks templat memakai ragam santai ("nggak", "udah", "nunjuk") — keputusan
   council m025-160. Belum ada bukti dari laporan murid bahwa ragamnya yang jadi masalah; yang
   terukur adalah panjang, istilah, dan soal teori.
3. **Istilah di level atas.** Teks templat B2–C2 masih memuat istilah seperti "participle",
   "klausa". Wajar untuk level itu, tetapi layak diaudit bila murid SMA melapor hal serupa.
