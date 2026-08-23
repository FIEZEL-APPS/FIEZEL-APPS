# m025-140 — Bukti dan sesi berhenti meminjam level orang lain

Menutup **B-01** dan **B-04** dari diagnosis ulang Brain Core. Keduanya kegagalan senyap:
tidak ada galat, tidak ada tes merah, hanya angka yang diam-diam berasal dari level yang salah.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. B-01 — readiness dihitung per level

`diagnosticEvidenceReady()` dulu membaca SELURUH riwayat. Akibatnya 24 jawaban B1 membuka
latihan adaptif untuk murid yang memilih A1: sistem mengira sudah mengenal murid di level yang
belum pernah ia sentuh, lalu menyusun latihan berdasarkan kenalan yang tidak ada.

Sekarang readiness dihitung dari bukti pada satu level. `state.adaptiveReadyByLevel` menyimpan
peta seluruh level; `state.adaptiveReady` dipertahankan tetapi artinya dipertegas menjadi
"siap di level yang SEDANG dipakai". Semua pemanggil lama tidak perlu diubah dan tidak ada yang
kehilangan arti.

Reproduksi diagnosis dijadikan tes: 24 jawaban berlabel B1 dengan level aktif A1 menghasilkan
`readyAtA1=false` dan **evidence 0 baris**, sementara bukti yang sama tetap penuh di B1.

## 2. B-04 — sesi membawa levelnya sendiri

`activeSession` tidak menyimpan level. Sesi yang dimulai di A1, lalu murid pindah ke B1 sebelum
menutupnya, dinilai ulang sebagai B1. `policyOutcomeSessionRows()` bahkan menyaring riwayat
dengan `getActiveLevel()` - level hari ini, bukan level sesinya - jadi satu kali ganti level
menulis ulang arti bukti yang sudah tercatat.

Sekarang `beginLearningSession()`, `abandonActiveSession()`, dan `completeActiveSession()`
semuanya menyimpan `level`, dan outcome dinilai dengan `sessionLevel(session)`. Sesi lama tanpa
label jatuh ke level aktif; label yang tidak dikenal tidak dipercaya.

`recentSkillAccuracy()` ikut disaring level - ia dipakai sebagai baseline sesi, dan baseline
dari level lain adalah bentuk kebocoran yang sama.

## 3. Bug yang ditemukan gara-gara perubahan ini, dan jauh lebih berbahaya

Setelah readiness dihitung di `sanitizeState()`, sepuluh gate berubah merah sekaligus. Sebabnya
bukan pada logika level:

```js
let activeStateStorageKey=..., state=loadState(), V=[], R=[], GRAMMAR_ITEMS=[], ...;
```

`state=loadState()` berdiri di depan `V`, `R`, dan `GRAMMAR_ITEMS` di dalam SATU pernyataan
`let`. Jalur readiness memanggil `contentLevelFor()` yang membaca ketiganya, sehingga pembacaan
itu jatuh ke **temporal dead zone**. `loadState()` melempar, `catch`-nya mengembalikan state
kosong - dan **seluruh progres murid hilang tanpa satu pun galat terlihat**.

Bank konten sekarang dideklarasikan sebelum `loadState()`. Ini bukan soal gaya penulisan: satu
pemanggilan baru dari dalam `sanitizeState()` sudah cukup untuk menghapus riwayat semua orang.

## 4. Dua penjaga lama yang ikut diperbaiki

- `regression-test.js` mengunci teks `state.adaptiveReady=diagnosticEvidenceReady(state)`.
  Maksud penjaganya - readiness harus berbasis bukti - masih berlaku, jadi assertion-nya
  diperbarui ke kontrak yang lebih kuat, bukan dihapus.
- Fixture readiness di berkas yang sama memakai grammar dan reading level apa pun. Itu persis
  celah B-01, dan fixture-nya lolos justru karena celahnya ada. Sekarang fixture memakai konten
  A1. Sepanjang perbaikan ini ditemukan juga bahwa binding `let` di dalam `vm` **tidak** muncul
  sebagai properti context - fixture yang membacanya dari luar selalu dapat kosong dan diam-diam
  jatuh ke jalur cadangan yang salah.
- `level-grammar-contract-test.js` menandai `diagnosticReadinessMap` sebagai "cross-level pool".
  Iterasi `LEVELS` di sana justru kebalikan dari mencampur level. Pengecualiannya ditulis per
  nama supaya tetap bisa diaudit, bukan dengan melonggarkan polanya.

## 5. Bukti

- Seluruh **86 gate** `.github/workflows/quality.yml`: PASS.
- `level-evidence-test.js`: **17/17 PASS**, menjalankan fungsi app.js yang asli di dalam `vm`.
- Versi naik bersama ke `m025-140`.

## 6. Sisa

B-06, B-07, B-11, B-12 masih terbuka; Speaking dan Listening belum berformat ujian; kalibrasi
300 bacaan lama masih terbalik. Verdict HOLD diagnosis belum tercabut.
