# m025-137 — Prasyarat Grammar berhenti jadi saran, mulai mengunci

Menutup temuan **B-05** dari `FIEZEL-BRAIN-CORE-RE-DIAGNOSIS-2026-08-23`: prasyarat lesson
sudah ditampilkan sejak m025-136, tetapi tidak pernah ditegakkan. Semua lesson bisa dibuka
dan dilatih di luar urutan, jadi kurikulum berurutan yang baru saja dipasang masih bisa
dilangkahi begitu saja.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.** Otoritas rilis tetap milik
OWNER/MASTER; berkas ini tidak memberi wewenang merge atau deploy kepada siapa pun.

---

## 1. Yang dikerjakan

`lessonUnlockState(skill, sourceState)` — fungsi murni, satu-satunya sumber kebenaran untuk
"lesson ini boleh dibuka atau belum". Tidak menyentuh DOM, tidak menyimpan apa pun, jadi hub
dan pintu-pintu masuk memakai jawaban yang sama persis. Ia mengembalikan `{locked, threshold,
missing[], reason}` — `missing` memuat setiap prasyarat yang belum tuntas beserta mastery-nya,
supaya murid tahu APA yang menahannya, bukan hanya bahwa ia tertahan.

Penolakannya dipasang di tiga pintu, bukan satu:

- **Grammar Hub** — tombolnya `disabled`, bukan sekadar diberi label. Kartunya tetap terbaca
  supaya murid bisa melihat jalannya ke depan.
- **`openGrammarLesson()`** dan **`renderGrammarLesson()`** — menolak lagi di sini, jadi
  panggilan langsung (console, deep link, state lama) tidak menembus.
- **`practiceSkill()`** — pintu yang benar-benar memulai sesi, ditolak terakhir.

## 2. Ambang yang dipilih, dan alasannya

`GRAMMAR_UNLOCK_MASTERY = 60`, sengaja **dibedakan** dari `MASTERY_THRESHOLD = 80`.

80 adalah bar "sudah dikuasai" dan terlalu tinggi untuk sekadar melanjutkan jalur — murid bisa
terjebak mengulang satu lesson padahal sudah paham. Karena `mastery = akurasi × min(1, total/5)`,
satu sesi 25 soal dengan 60% benar sudah cukup untuk lanjut. Bar-nya tetap menuntut lessonnya
betul-betul dikerjakan, bukan sekadar dibuka. **Angka ini pilihan saya, bukan dari diagnosis**
— kalau OWNER menghendaki lebih ketat, satu konstanta yang perlu diubah.

Lesson tanpa prasyarat **selalu** terbuka. Tanpa aturan itu, murid baru bisa terkunci total di
level yang lesson pertamanya belum pernah disentuh.

## 3. Kegagalan yang ditangkap gate sendiri

Versi pertama saya juga mengunci `buildGrammarLessonQuestions()`. Itu salah, dan
`grammar-quality-audit.js` serta `tests/lesson-experience-test.js` langsung merah: inventaris soal
turun dari 3.475 ke 3.075 karena 16 lesson A1 menghasilkan 0 soal.

Sebabnya jelas begitu terlihat: fungsi itu **pembangun konten**, bukan pintu murid. Audit harus
bisa bertanya "lesson ini punya 25 soal valid atau tidak" tanpa bergantung pada progres siapa
pun. Penguncian dikembalikan ke tiga pintu murid saja, dan gate baru sekarang ikut menjaga arah
itu: ada check yang GAGAL kalau `buildGrammarLessonQuestions()` menyentuh progres lagi.

## 4. Cakupan sebenarnya — baca bagian ini

Diukur, bukan dikira: **hanya 16 dari 139 lesson yang benar-benar terkunci**, dan seluruhnya
A1. Sisanya (123) tidak punya prasyarat untuk ditegakkan.

Sebabnya ada di data, bukan di kode: `grammar-curriculum-v1.json` hanya mendeklarasikan rantai
prasyarat untuk A1. Seluruh 47 lesson B1, 32 B2, 17 A2, 19 C1, dan 7 C2 punya
`prerequisites: []`. Jadi B-05 tertutup **sejauh kurikulumnya menyatakan urutan** — di A1 murid
sekarang benar-benar dibimbing; di level lain masih bisa lompat, karena memang tidak ada yang
menyatakan apa prasyarat apa.

Menutup sisanya adalah pekerjaan **data**, bukan kode, dan ada dua jalan yang berbeda hasilnya:
menulis rantai prasyarat asli untuk A2–C2, atau menegakkan urutan `sequence` secara linear di
level yang tidak punya prasyarat. Yang kedua mengunci 47 lesson B1 jadi satu jalur lurus —
perubahan produk yang nyata, dan itu keputusan OWNER, bukan keputusan saya.

## 5. Bukti

- Seluruh **83 gate** `.github/workflows/quality.yml`: PASS (82 sebelumnya + `tests/grammar-unlock-test.js`).
- `tests/grammar-unlock-test.js`: **16/16 PASS**. Gate ini menjalankan `lessonUnlockState()` yang asli
  di dalam `vm` di atas kurikulum asli — bukan mencocokkan regex. Alasannya: B-05 muncul justru
  karena kode yang MENYEBUT prasyarat sudah ada dan terlihat benar dari luar; hanya eksekusi yang
  bisa membedakan "menyebut" dari "menolak". Termasuk fixture yang menyusuri seluruh 139 lesson
  berurutan dan memastikan tidak satu pun tertutup pada gilirannya.
- `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV` naik bersama ke `m025-137`.
- `git diff --check`: bersih.

## 6. Sisa P1 yang masih terbuka

B-01 (`adaptiveReady` masih global, belum per level), B-04 (`activeSession` belum menyimpan
levelnya), B-06, B-07, B-08/B-09, B-10, B-11, B-12. Verdict HOLD diagnosis belum tercabut.
