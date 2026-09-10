# Handoff m025-207 — prior kesulitan item disambungkan ke kolam sesi belajar (T1/T2 Braincore v3)

**Asal:** bukan laporan OWNER dan bukan yang saya cari. Ditemukan saat menyusun bukti E2E
Braincore v3 untuk audit rilis (§20), ketika pertanyaan lanjutannya dikerjakan sungguhan:
kalau `ability` bergerak, apakah ia benar-benar mengubah **soal berikutnya**?

## Status

**SELESAI**, dengan satu utang yang ditulis terbuka di bagian akhir.

## Sentuhan pada `features/neural-voice/`

**Hanya nomor build.** `fiezel-diag-panel.js` disentuh semata oleh
`node tools/bump-build.mjs`, yang menaikkan `DIAG_BUILD` m025-206 → m025-207 bersama
`core-config.js`, `sw.js`, dan `coordination/BUILD-VERSION.json`. **Nol baris logika suara
neural berubah.** Tidak ada perilaku `features/neural-voice/` yang bergeser di rilis ini, jadi
tidak ada yang perlu diserahkan kepada pemegang klaim modul itu selain fakta ini.

## Akar masalah

`features/brain/fiezel-item-prior.js` ditulis **khusus** untuk menghapus satu cacat, dan
docstring-nya menamainya sendiri:

> **T2.** term penalti `|difficulty - target|` bernilai konstan untuk semua kandidat, lalu
> lenyap saat sorting. Sistem MENGAKU adaptif terhadap kesulitan, tetapi secara matematis
> tidak pernah memilih berdasarkan kesulitan.
>
> **T1.** informasi Fisher hanya sebanding dengan JUMLAH soal, bukan KECOCOKAN soal, sehingga
> "estimasi kemampuan" tidak pernah lebih pintar dari persentase benar.

Modulnya **ada**, **dimuat** `index.html`, dan unit-nya (`tests/item-prior-test.js`) **hijau**.

Yang tidak pernah disambungkan: **`makeLevelSource()`** — kolam yang dipakai
`startLevelPractice`, yaitu **sesi belajar biasa**. Ia masih menimpa `difficulty` dengan basis
level CEFR. Priornya hanya terpasang di pembangun sesi adaptif dan jalur cloze.

Jadi cacat yang sudah "diperbaiki" tetap hidup di jalur yang paling sering dilewati murid.

## Bukti (diukur, bukan dibaca dari kode)

Chromium sungguhan, kolam A1 sungguhan dari fungsi itu sendiri.

| ability | item terpilih `FiezelTutorBrain.selectNext` — **sebelum** |
|---|---|
| 0,5 | `vocab-vocab_00003-partOfSpeech…` |
| 0,863 | item yang **sama** |
| 1,5 | item yang **sama** |
| 2,5 | item yang **sama** |
| 3,5 | item yang **sama** |

Sebabnya: **seluruh 634 item A1 berkesulitan tepat 1**; tiap level satu nilai konstan
(A2=2 ×747, B1=3 ×988, B2=4 ×1020, C1=5 ×484, C2=6 ×376).

| | sebelum | sesudah |
|---|---|---|
| nilai kesulitan berbeda di A1 | **1** (semua 634 item) | **3** (1 ×601 · 1,15 ×3 · 1,45 ×30) |
| `selectNext` @ ability 0,5–1,5 | vocab d=1 | vocab d=1 |
| `selectNext` @ ability 2,5–3,5 | vocab d=1 (**sama**) | **grammar d=1,45** |

## Yang berubah

Prior disambungkan ke ketiga cabang `makeLevelSource` dengan pola guard yang **disalin** dari
pembangun sesi adaptif, bukan varian baru: tanpa modul prior, `difficulty` jatuh ke basis
level lama, jadi perilaku tanpa Braincore **identik** dengan hari ini.

## Gerbang

`tests/level-source-difficulty-variance-test.js` **menjalankan** `makeLevelSource` yang sesungguhnya
(diambil dari `app.js`, dieksekusi di VM) di atas modul prior yang sesungguhnya.

| bukti | hasil |
|---|---|
| kode lama | **MERAH** — `"T2 hidup lagi: seluruh 26 item satu level berkesulitan sama (1)"` |
| kode baru | HIJAU — 3 nilai kesulitan berbeda |

Gerbang yang menguji **modulnya** tidak akan pernah melihat cacat ini, karena modulnya memang
benar — yang putus **kabelnya**. Gerbang berbasis pola teks juga tidak: polanya masih ada di
berkas. Assert F menguncinya dari sisi lain: **tanpa** modul prior, difficulty wajib jatuh ke
basis level lama.

## Utang jujur

1. **601 dari 634 item A1 masih berbagi difficulty 1.** Diskriminasinya kini kasar tapi tidak
   lagi nol — ia memisahkan beban mode grammar dari massa vocab/reading, belum item dari item.
   Itu batas modul priornya sendiri, yang menyebut kalibrasi Elo dua-sisi (C1) sebagai langkah
   berikutnya.
2. Saya **tidak** menambal ini dengan menganeka-ragamkan mode soal yang dilihat murid: itu
   keputusan pedagogis milik OWNER, bukan perbaikan audit.
3. `id-golden-baseline` diregenerasi di commit yang sama; ketiga literal barunya seluruhnya
   potongan **kode** yang bergeser — **nol teks murid berubah**.
