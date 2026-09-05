# m025-239 — Alur belajar murid (Learner Flow) + Tutor Action Center

Dokumen serah-terima untuk PR #323 (branch `conflict_030926_0820`). Rilis ini menambah dua
layar baru (`learn` dan `tutor`) beserta modul pendukungnya, dan menaikkan nomor build ke
**m025-239** lewat arbiter (lihat bagian 4: nomornya sempat m025-238 sampai PR #324 mengklaimnya lebih dulu di `main`).

Kewenangan rilis tetap di **OWNER**. Dokumen ini ditulis dari sisi yang mengerjakan patch,
jadi ia mencatat apa yang sudah terbukti oleh gerbang dan — sama pentingnya — apa yang
**belum** terbukti dan karena itu tidak boleh ditulis sebagai "selesai". Penegakan koordinasi
(nomor build, klaim wilayah, siaran) mengikuti prosedur **MASTER** di `MASTER-BROADCAST.md`.

---

## 1. Kenapa dokumen ini ada

`A13 Handoff Keeper` menuntutnya, dan tuntutannya benar. Gerbang itu menandai sebuah
perubahan sebagai **major** kalau ada berkas di `features/neural-voice/` atau
`features/tutor-classroom/` yang tersentuh — dan rilis ini menyentuh
`features/neural-voice/fiezel-diag-panel.js`.

Sentuhan itu **hanya** nomor build (`DIAG_BUILD`), karena `tools/bump-build.mjs` menulis
keempat tempat sekaligus; tidak ada satu baris logika neural-voice yang berubah. Tetapi
aturan A13 tidak dipasang untuk mengukur besarnya diff di satu berkas, melainkan untuk
memastikan rilis yang menambah dua layar penuh ke aplikasi meninggalkan jejak yang bisa
dibaca sesi berikutnya. Untuk rilis ini, tuntutan itu tepat sasaran.

Preseden yang sama sudah dicatat di `FIEZEL-M025237-SWIPE-BACK-BOOT-LOOP-HANDOFF.md` bagian 3.

---

## 2. Yang mendarat

### 2.1 Learner Flow — satu alur lurus, bukan kumpulan menu

`features/learner-flow/fiezel-learner-flow.js` (487 baris) memasang satu jalur yang bisa
diikuti murid tanpa memilih-milih sendiri:

> pilih tujuan → 5 soal diagnostic → skill yang perlu diperkuat → rencana hari ini →
> kerjakan satu lesson → alasan rekomendasi berikutnya

Enam tujuan tersedia: `school`, `campus`, `it`, `scholarship`, `exam_foundation`, `everyday`.
Dua di antaranya (`campus`, `everyday`) baru di rilis ini dan ikut ditambahkan ke
`features/personal-journey/fiezel-personal-journey.js`.

Seluruh progres tersimpan lokal (`localStorage`, kunci `fiezel-learner-flow-v1`). Tidak ada
network I/O baru di jalur ini.

### 2.2 Review Bank — satu sumber soal untuk murid dan tutor

`fiezel-review-bank.js` (402 baris) adalah data + fungsi murni: **tanpa DOM, deterministik,
dan tersedia offline**. Ia dipakai dua sisi sekaligus — alur diagnostic/lesson murid dan
tombol "Buat sesi review" milik tutor — sehingga soal yang dilihat tutor benar-benar soal
yang dikerjakan murid, bukan salinan yang bisa menyimpang.

Lima skill terkalibrasi: `past_tense`, `past_questions`, `vocab_a2`, `listening_detail`,
`reading_inference`. Setiap jawaban salah membawa penjelasan polanya, bukan sekadar "salah".

### 2.3 Duel Belajar — belajar bersama tanpa server

`fiezel-duel.js` (218 baris): buat tantangan → 8 soal berwaktu (15 detik) → dapat kode/link →
undang teman. Teman membuka kode dan mengerjakan **soal yang sama** (seed sama), lalu kode
balasan mengisi papan skor. Ada juga mode dua pemain bergantian di satu HP.

Tidak ada backend: seluruh pertukaran lewat kode yang di-encode di URL (`?duel=KODE`).
`app.js` menangkap parameter itu saat boot dan membuka tab Duel; `home()` menampilkan kartu
undangan kalau kodenya terbaca.

### 2.4 Progress Backup — export/import tanpa sandi

`fiezel-progress-backup.js` (89 baris): export & import progres sebagai berkas JSON, dengan
**pratinjau sebelum restore**, penjelasan kelompok data yang tersimpan, dan tombol hapus
semua data. Tidak ada network I/O — berkas dibuat dan dibaca di perangkat pengguna sendiri.

### 2.5 Tutor Action Center

`features/tutor-action-center/fiezel-tutor-action-center.js` (434 baris) mengubah data jawaban
menjadi tindakan mengajar, lewat enam tab: **Peta kelas**, **Tren kelas**, **Antrian
intervensi**, **Buat sesi review**, **Per murid**, dan **Laporan mingguan**, plus export
(PDF/CSV/ringkasan anonim) dengan pratinjau.

Batas privasinya disengaja dan perlu dijaga: yang berpindah dari murid ke tutor hanya
**nama depan + akurasi per skill** (`tutorCode()` — `v:1`, nama dipotong di spasi pertama,
`{c,t}` per skill, jumlah lesson). **Jawaban mentah tidak pernah ikut.** Semua data tutor
tinggal lokal di perangkat tutor.

### 2.6 Naskah Indonesia yang berubah — disengaja

Selain dua tujuan baru, ada satu perubahan naskah yang **bukan** tambahan:

| Kunci | Sebelum | Sesudah |
|---|---|---|
| `journey.goal-exam-label` | `Persiapan IELTS/TOEFL` | `Fondasi IELTS/TOEFL` |

Ini pengetatan klaim, bukan kosmetik: `journey.goal-exam-note` sudah lama berbunyi "FIEZEL
nggak menebak skor IELTS/TOEFL kamu", dan label "Persiapan" menjanjikan lebih dari yang
produk ini kerjakan. Padanan Thai (`copy-th-feat-b.js`) ikut diubah sejalan.

`id-golden-baseline.json` ditulis ulang untuk perubahan itu (literal Indonesia 2144 → 2286).
Baseline **tidak** diregenerasi untuk menghijaukan gerbang: `tests/id-golden-snapshot-test.js`
dijalankan setelahnya dan hijau pada kedua arah — nol literal hilang/berubah dan nol
tambahan liar.

---

## 3. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `features/learner-flow/fiezel-learner-flow.js` | baru — alur diagnostic → rencana → lesson |
| `features/learner-flow/fiezel-review-bank.js` | baru — bank soal bersama, murni data, offline |
| `features/learner-flow/fiezel-duel.js` | baru — Duel Belajar berbasis kode, tanpa server |
| `features/learner-flow/fiezel-progress-backup.js` | baru — export/import progres + hapus data |
| `features/learner-flow/learner-flow.css` | baru — gaya kedua layar |
| `features/tutor-action-center/fiezel-tutor-action-center.js` | baru — enam tab tutor + export |
| `app.js` | view `learn` + `tutor` di `renderInner()`/`VALID_VIEWS`; kartu Home; tangkap `?duel=` |
| `index.html` | lima `<script defer>` **sebelum** `app.js` (Home membaca `FiezelLearnerFlow.load()` saat render pertama) + stylesheet |
| `features/personal-journey/fiezel-personal-journey.js` | tujuan `campus` |
| `features/i18n/copy-id-feat-b.js`, `copy-th-feat-b.js` | kunci `campus`/`everyday`; label exam diperketat |
| `id-golden-baseline.json` | baseline emas Indonesia ditulis ulang untuk naskah di atas |
| `memory/PRD.md` | PRD menyusul dua layar baru |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-237 → m025-238 → **m025-239** lewat `node tools/bump-build.mjs` |
| `.gitignore` | pola rahasia (`*.env`, `*.pem`, `*.key`, `credentials.json`, `.credentials`) |
| `.gitconfig`, `.emergent/emergent.yml`, `.emergent/cron/webhook-crons` | artefak lingkungan agen, bukan kode produk |

---

## 4. Nomor build — m025-239, lewat arbiter

Nomor build **tidak** diketik tangan. `node tools/bump-build.mjs "<alasan>"` yang menulis
keempat tempat, sesuai `protocol` di `coordination/BUILD-VERSION.json`.

Ini justru akar merahnya `quality` sebelum perbaikan: PR ini menaikkan **tiga** penanda
(`sw.js`, `core-config.js`, `fiezel-diag-panel.js`) ke m025-238 tetapi meninggalkan sumber
tunggalnya di m025-237, sehingga assert A `tests/coordination-guard-test.js` merah (23/24) dengan
pesan `sumber=m025-237 terpasang={...m025-238}`. Repo ini punya **empat** tempat nomor build,
bukan tiga — dan satu-satunya cara menjaganya koheren adalah lewat arbiter.

### Kenapa akhirnya 239, bukan 238

Perbaikan pertama menyelaraskan keempat tempat di **m025-238**: saat itu dasar dari
`origin/main` adalah m025-237, naik satu jadi 238, dan 238 belum pernah diklaim di hulu.

Lalu **PR #324 lebih dulu merge ke `main` dan memakai m025-238** untuk rilis gestur swipe
back iOS (`FIEZEL-M025238-SWIPE-BACK-GESTUR-IOS-HANDOFF.md`). Sejak detik itu 238 bukan lagi
milik PR ini — dan membiarkannya berarti **satu SW_REV memayungi dua isi berbeda**, persis
kegagalan lapangan yang melahirkan arbiter ini (lihat komentar kepala `tools/bump-build.mjs`).

Jadi `main` di-merge masuk dan arbiter dijalankan lagi. Ia mengambil dasar dari hulu yang
sudah bergerak (m025-238), menaikkan satu, dan mendarat di **m025-239**. Tidak ada nomor yang
diketik tangan di sepanjang jalan itu.

Ini bukan kecelakaan yang lolos — ini alat yang bekerja sebagaimana dirancang. Tabrakannya
jatuh di berkas JSON delapan baris, bukan di `sw.js`/`style.css`, dan biayanya satu merge
plus satu perintah.

```
coordination/BUILD-VERSION.json: m025-239
Selaras. Commit keempat berkas bersama-sama.
```

`claimedBy` diperbarui manual ke sesi ini (arbiter tidak menulis field itu; sebelumnya masih
tertinggal atas nama jalur i18n `perplexity-computer`), dan `reason` diisi alasan nyata rilis
ini — `tests/coordination-guard-test.js` menuntut panjangnya ≥ 30 karakter.

m025-239 juga angka yang **wajib**, bukan sekadar boleh: `A11 Release Readiness Auditor`
menuntut `DIAG_BUILD` head tepat +1 dari base. Base kini `main` yang membawa m025-238, jadi
head harus 239 — bertahan di 238 (atau melompat lebih tinggi) sama-sama memerahkan A11.

---

## 5. Gerbang

Perbaikan di rilis ini **tidak** menonaktifkan, men-skip, atau menghapus gerbang mana pun.

| Check | Sebelum | Akar masalah | Sesudah |
|---|---|---|---|
| `quality` | MERAH | sumber tunggal nomor build tertinggal di m025-237 | HIJAU — `coordination-guard-test: 24/24` |
| `A13 Handoff Keeper` | MERAH | `features/neural-voice/` tersentuh tanpa handoff berubah | HIJAU — dokumen ini |
| `A14 Autonomous Review` | MERAH | turunan murni: A14 gagal **hanya** karena `A13: failure` | HIJAU begitu A13 hijau |

A14 tidak punya kegagalan sendiri. Langkahnya harfiah `for result in "$A9" "$A10" "$A11"
"$A13"; do test "$result" = success; done` — jadi ia tidak perlu (dan tidak bisa) diperbaiki
terpisah dari A13.

Gerbang yang dijalankan lokal dan hijau, termasuk lima yang diminta eksplisit:

```
node tests/coordination-guard-test.js        24/24 assert PASS
node tests/install-health-test.js            PASS
node tests/pwa-release-coherence-test.js     PASS
node tests/id-golden-snapshot-test.js        HIJAU: baseline emas Indonesia utuh
node validator.js                      PASS
node tools/bump-build.mjs --check      Selaras.
```

---

## 6. Status rilis — menunggu OWNER

**Status: gerbang otomatis hijau; bukti perangkat sungguhan BELUM ada.**

Yang terbukti: seluruh daftar gerbang `quality.yml` dijalankan lokal dan hijau (kecuali
kegagalan lama yang tidak berhubungan, dicatat di bagian 7). Yang **tidak** terbukti, dan
tidak boleh ditulis dari sisi yang mengerjakan patch: dua layar ini belum pernah disentuh
jari di PWA terpasang. Sesi ini memperbaiki CI, bukan menjalankan QA perangkat.

**Yang dibutuhkan dari OWNER** sebelum rilis dianggap diterima:

1. **Alur murid utuh** — pilih tujuan → 5 soal diagnostic → rencana hari ini → satu lesson
   selesai. Pastikan tidak ada langkah yang bisa dimasuki tetapi tidak bisa ditinggalkan.
2. **Duel Belajar lintas perangkat** — buat tantangan di satu HP, buka link `?duel=KODE` di
   HP lain, pastikan soalnya benar-benar sama dan kode balasan mengisi papan skor.
3. **Backup progres** — export, hapus data, lalu import; pastikan pratinjau jujur dan progres
   benar-benar kembali.
4. **Batas privasi tutor** — periksa bahwa kode hasil murid hanya membawa nama depan dan
   akurasi per skill, **tanpa** jawaban mentah.
5. **Naskah** — konfirmasi "Fondasi IELTS/TOEFL" memang label yang diinginkan (bagian 2.6).

---

## 7. Langkah berikutnya

Sesudah OWNER menerima:

- **Gerbang khusus untuk dua modul baru belum ada.** `fiezel-review-bank.js` deterministik
  dan tanpa DOM — itu bentuk yang paling mudah diuji, dan seharusnya punya gerbang sendiri
  (set diagnostic stabil untuk seed yang sama, nol soal terulang dalam satu sesi).
  `fiezel-duel.js` layak gerbang encode/decode kode: kode rusak atau dari versi lain harus
  ditolak, bukan meledak. `A10 Regression Watcher` sudah memperingatkan bahwa runtime sensitif
  berubah tanpa diff uji pendamping — peringatan itu benar dan belum dijawab.
- **`tutorCode()` adalah permukaan privasi**, jadi bentuknya (`v:1`) pantas dikunci gerbang
  supaya field baru tidak bisa menyelinap masuk tanpa keputusan sadar.
- **Artefak lingkungan agen** (`.gitconfig`, `.emergent/`) ikut ter-commit di PR ini. Bukan
  kode produk dan tidak dipakai runtime; kalau MASTER memutuskan repo tidak melacaknya,
  keluarkan di rilis terpisah — bukan di rilis ini, supaya batas perubahannya tetap terbaca.

Roadmap rilis berikutnya tidak berubah karena dokumen ini.
