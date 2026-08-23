# m025-136 — Level aktif jadi satu-satunya konteks, Grammar berjalan berurutan

Asal pekerjaan ini adalah patch `FIEZEL-level-grammar-hardening` yang dikirim OWNER
bersama `FIEZEL-LEVEL-GRAMMAR-IMPLEMENTATION-REPORT.md` dan diagnosis ulang Brain Core
tertanggal 2026-08-23. Patch-nya tidak bisa dipasang apa adanya, dan itu bagian dari
laporan ini, bukan catatan kaki.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.** Otoritas rilis tetap
milik OWNER/MASTER; berkas ini tidak memberi wewenang merge atau deploy kepada siapa pun.

---

## 1. Kondisi patch waktu diterima

Tiga hal membuat `git apply` gagal total, dan ketiganya diperbaiki sebelum satu baris pun
dipakai:

1. **Baris berakhiran CRLF.** Seluruh berkas patch memakai akhiran baris Windows, jadi tidak
   satu pun konteks cocok dengan pohon kerja yang berakhiran LF.
2. **Teks Indonesia rusak dua kali encode.** `·` terbaca `Â·`, `—` terbaca `â€"`, emoji
   terbaca `ðŸ‘€`. Kalau dipasang begitu saja, teks yang dibaca murid ikut rusak — dan
   karena mojibake juga ada di baris konteks, hunk yang menyentuh teks Indonesia pasti
   ditolak. Diperbaiki dengan `ftfy`, per baris.
3. **Patch terpotong.** Berkasnya berhenti di tengah hunk terakhir `sw.js`. Bagian itu
   dikerjakan tangan: `grammar-curriculum-v1.json` masuk daftar `ASSETS` precache dan
   `SW_REV` dinaikkan.

Basis patch juga bukan `m025-134` seperti tertulis di laporannya. Diukur, bukan dikira:
terhadap `m025-134` ada 19 hunk `app.js` yang ditolak, terhadap `m025-135` hanya 9. Jadi
patch ini justru ditulis di atas Core Brain hardening, dan `m025-136` adalah tempat yang
benar untuknya.

## 2. Sembilan hunk `app.js` yang dipasang tangan

Semua konflik berasal dari kode yang disentuh m025-135, jadi keduanya harus dipertahankan:

- `sanitizeState()` — m025-135 menambahkan sanitasi `goalProfile`, patch menambahkan
  `activeLevel`/`levelMode`/`selfAssessedLevel`. Keduanya sekarang ada; tidak ada yang
  diam-diam menimpa yang lain.
- `buildAdaptivePool()` — pool vocab, grammar, dan reading disaring ke level aktif, dan
  bonus skor `level===level?1:0` dibuang karena setelah disaring bonus itu selalu benar.
- `makeVocabQuestion()`, `makeGrammarQuestion()`, `makeReadingQuestion()` — setiap soal
  membawa `level`-nya sendiri, supaya `record()` menyimpan bukti berlabel level.
- `startReadingAdaptive()` — memakai `getActiveLevel()`, bukan level hasil placement.
- `explainWithAI()` — level pada prompt tutor diambil dari level aktif, bukan ditebak dari
  `difficulty` soal.
- Blok resolver level (`getActiveLevel`, `historyMatchesActive`, `contentLevelFor`, dan
  kawan-kawannya) disisipkan tepat sebelum `sanitizeState()` sesuai maksud patch.

Dua variabel mati bawaan patch dibuang: `sequence='sequence'` di `grammarItemsForLevel()`
dan `sequenceField='sequence'` di `grammar()`. Keduanya hanya ada supaya regex gate
`level-grammar-contract-test.js` menemukan kata "sequence" dekat "sort". Gate-nya sekarang
lulus karena alasan yang sebenarnya: komparatornya diberi nama `bySequence`, jadi urutan
lesson terbaca dari kode, bukan dari variabel hantu.

## 3. Ritual versi

`FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, dan `SW_REV` naik bersama ke `m025-136`. Tanpa `SW_REV`
baru, PWA yang sudah terpasang akan terus menyajikan `app.js` lama tanpa
`grammar-curriculum-v1.json` — Grammar akan kembali terlihat acak di perangkat murid,
persis kondisi yang perbaikan ini tutup.

## 4. Bukti

- Seluruh 82 gate `.github/workflows/quality.yml`: PASS, termasuk dua gate baru
  `grammar-curriculum-test.js` dan `level-grammar-contract-test.js`.
- `node --check` untuk setiap `.js` yang berubah: PASS.
- `git diff --check`: bersih.

## 5. Yang BELUM dikerjakan di sini

Diagnosis ulang Brain Core (`FIEZEL-BRAIN-CORE-RE-DIAGNOSIS-2026-08-23`) menahan rilis
sampai P1 selesai. Patch ini menutup sebagian saja. Yang masih terbuka dan tidak boleh
dianggap selesai oleh berkas ini:

- **B-01** `adaptiveReady` masih global, belum readiness per level.
- **B-04** `activeSession` belum menyimpan `activeLevel`-nya sendiri.
- **B-05** prasyarat Grammar ditampilkan tetapi belum mengunci lesson (`lessonUnlockState()`).
- **B-06** graph Core Brain masih family-level dan kehilangan lima family.
- **B-07** backup belum membawa pilihan level manual dan ledger adaptif.
- **B-08**/**B-09** kualitas dan kalibrasi CEFR Reading.
- **B-10** Writing masih 9 prompt tanpa rubric analitik.
- **B-11** `isNeuralAsset()` masih selalu `false`.
- **B-12** belum ada E2E browser untuk alur level dan Grammar.
