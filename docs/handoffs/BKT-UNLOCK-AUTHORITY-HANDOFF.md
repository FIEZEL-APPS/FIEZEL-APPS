# BKT: parameter tetap beku, otoritas unlock dibuka (m025-331)

Wewenang: OWNER. Permintaan persis: *"BKT nya jangan di bekukan."* Status: **selesai** —
`bktUnlock` naik dari `shadow` ke `active` di `FiezelBrainManifest`, dibuktikan gate.

## Dua hal berbeda yang kebetulan sama-sama disebut "dibekukan"

Sebelum sesi ini, "BKT dibekukan" sebenarnya menunjuk ke DUA keputusan terpisah yang
kebetulan sama-sama menyandang kata itu:

1. **Parameter** `L0=0.2, T=0.15, slip=0.1, guess=0.25` (`Object.freeze` di
   `features/brain/fiezel-mastery-bkt.js:70`) — dibekukan sampai N > 1.000 murid, karena
   presisi hasil fit berskala 1/√n dan FIEZEL di-hard-cap 250 pengguna
   (`docs/BRAIN-EVOLUTION-DECISIONS.md` §5). **Keputusan ini TIDAK diubah** — owner memilih
   opsi "kasih BKT otoritas nyata" saat ditanya, bukan opsi refit parameter dari data lokal.
2. **Otoritas** (`bktUnlock` di `features/brain/fiezel-brain-manifest.js`) — BKT menghitung
   posterior mastery per lesson tapi hasilnya cuma tampil di panel diagnostik
   (`bktShadowMarkup`); keputusan buka-kunci lesson tetap 100% di heuristik v2 lama
   (`accuracy × min(1, total/5)`). **Ini yang diubah sesi ini.**

Klarifikasi ini penting karena solusinya beda total: (1) butuh data murid yang belum ada,
(2) hanya butuh menyambungkan kode yang sudah ditulis dan diuji.

## Apa yang sebenarnya berubah

`lessonUnlockState(skill, sourceState, bktMastered)` (`app.js`) punya parameter ketiga baru:
Set skill yang lolos `FiezelMasteryBKT.masteryGate()` (L ≥ 0,95 **dan** n ≥ 5 — gerbang
kepercayaan bukti, bukan sekadar posterior tinggi). Sebuah prasyarat dianggap terpenuhi kalau
salah satu dari tiga hal benar: akurasi mentah v2 ≥ 60, `skippedAt` (lulus gate skip), atau ada
di Set BKT ini.

`bktMasteredSkills()` (helper baru di `app.js`, dekat `bktRecord`) membangun Set itu dari
`bktRead()` + `masteryGate()` — nol modul baru, nol perubahan pada
`features/brain/fiezel-mastery-bkt.js` itu sendiri. Lima pemanggil disambungkan: `grammar()`
(hub), `openGrammarLesson()`, `renderGrammarLesson()`, `practiceSkill()`,
`buildGrammarQuickQuestions()`.

## Aturan yang dijaga: satu arah saja

**BKT hanya bisa MEMBUKA, tidak pernah MENGUNCI.** `bktMastered` yang null/undefined/kosong
membuat `lessonUnlockState()` berperilaku identik dengan sebelum perubahan ini — modul absen
(atau tanpa bukti) = perilaku hari ini, konvensi yang sama dipakai di seluruh
`features/brain/`. Konsekuensinya:

- Murid yang mastery mentahnya sudah di atas ambang tetap terbuka seperti biasa (BKT tidak
  ikut campur di jalur ini sama sekali).
- Murid yang akurasi mentahnya BELUM sampai ambang tapi BKT sudah yakin (≥95% posterior,
  ≥5 bukti — memperhitungkan slip/guess, bukan rasio mentah) sekarang bisa lanjut lebih awal.
- Tidak ada skenario di mana lesson yang sudah terbuka heuristik lama menjadi terkunci lagi
  gara-gara BKT — itu akan melanggar janji "lesson berikutnya tetap terbuka" yang sudah
  ditegakkan sejak m025-177 untuk jalur skip.

## Bukti

- `tests/mastery-bkt-test.js` — **tidak disentuh**, tetap 14/14 PASS (modul BKT sendiri tidak
  berubah, hanya pemanggilnya).
- `tests/grammar-unlock-test.js` — 4 check baru, semua red-then-green terhadap
  `lessonUnlockState()` yang ASLI dijalankan di vm (bukan regex): BKT membuka prasyarat
  berakurasi-mentah-0, BKT parsial tetap mengunci, Set kosong = argumen absen (bukti nol
  regresi), BKT tidak bisa membuka lesson lewat skill yang bukan prasyaratnya. 19/19 PASS.
- `tests/brain-manifest-test.js` — `bktUnlock` naik ke `active`, `bundleVersion` naik ke
  `3.9.0` (perubahan versi bundle adalah keputusan sadar yang dipatok literal, bukan pola
  semver longgar — supaya tidak lolos tanpa disadari). Gate independen "otoritas off
  DITURUNKAN dari permukaan aplikasi" (yang membaca app.js langsung, bukan menghafal klaim)
  tetap PASS tanpa disunting. 14/14 PASS.
- `tests/id-golden-snapshot-test.js` — dua literal panel diagnostik diubah sadar (baris
  "bayangan - tanpa otoritas unlock" sudah tidak jujur), baseline di-regenerate di commit
  yang sama.
- `tests/th-coverage-test.js` — 233/233 PASS, pasangan `copy-id-app-d.js` /
  `copy-th-app-d.js` diedit bersamaan (kunci sama, `{tracked}` sama, nilai th ber-aksara
  Thai).

## Yang TIDAK berubah, ditulis eksplisit supaya tidak ditemukan-ulang

- Parameter BKT tetap beku (`docs/BRAIN-EVOLUTION-DECISIONS.md` §5 tidak dicabut).
- `features/brain/fiezel-mastery-bkt.js` nol baris berubah — modulnya sudah lengkap sejak
  awal, cuma tidak ada yang memanggil `masteryGate()` di luar panel bacaan.
- Panel diagnostik (`bktShadowMarkup`) tetap tampilan-saja untuk frontier/root-cause; yang
  berubah cuma judulnya (tidak lagi mengklaim "tanpa otoritas").
- Modul lain yang masih `shadow` di `AUTHORITY_MAP` (confusionMap, olmInsight,
  listeningPolicy, retentionProbe, learningMetrics, dst.) — **tidak disentuh**. Ini murni
  permintaan owner soal BKT, bukan sapuan umum menaikkan semua modul shadow.

## Langkah berikutnya (tidak dikerjakan sesi ini, dicatat supaya tidak hilang)

- Domain lain (Vocabulary, Reading, Listening, Speaking) belum punya BKT per-item/per-skill
  — otoritas yang baru dibuka ini murni jalur Grammar (satu-satunya domain dengan graf
  prasyarat lesson-ke-lesson hari ini).
- `frontier()` (rekomendasi ZPD) masih tampilan-saja di panel diagnostik; belum dipakai
  memilih soal di `buildAdaptivePool`. Itu perubahan otoritas terpisah, tidak diminta sesi
  ini.
