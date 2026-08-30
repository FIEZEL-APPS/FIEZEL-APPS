# FIEZEL m025-203 â€” F1: jebakan jangkar censoring mastery

**Build:** m025-203 Â· **Basis:** 5.19.0 Â· **Tanggal:** 2026-08-30 Â· **PR:** #253
**Otoritas:** keputusan trade-off di bawah adalah **keputusan OWNER/MASTER**, diambil
2026-08-30. Wave tidak berwenang memutuskannya sendiri â€” aturan itu ditulis di
[BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md) butir #10 dan sengaja dipatuhi.

## Status

`approved` untuk kebijakan, **belum ter-merge** untuk kode. PR #253 keluar dari DRAFT setelah
keputusan OWNER; merge menunggu `quality` hijau, yang saat handoff ini ditulis **terhalang
kerusakan di `main`, bukan oleh perubahan ini** (lihat bagian "Yang menghalangi").

## Apa yang berubah, dan kenapa

`features/brain/fiezel-core-brain.js`:

- `momentum()` basis residual mengekspor **`residualPositiveShare`** â€” porsi blok jendela yang
  mean residualnya positif (0..1). Dipilih ketimbang streak mentah karena streak jatuh ke nol
  oleh satu blok derau, dan varian streakâ‰¥3 terbukti menaikkan osilasi 2.98â†’4.08 per 10 sesi
  (gagal gate keras vs v1).
- `planSession`: cabang baru â€” bila `state !== 'declining'` dan `residualPositiveShare >= 0.75`,
  kesulitan naik satu tingkat **di dalam pita** (ceiling p=0.55 tetap pagar), rationale
  `'sustained_overperformance'`.

Klasifikasi momentum dan guard false-decline **tidak diubah satu angka pun**. Payload lama
tanpa field baru â†’ perilaku lama utuh.

Masalah yang ditutup: dalam simulasi 35 hari, kebijakan shipped v2 hanya mencapai mastery pada
~12,9% run vs v1 ~44,4%. Akarnya loop tertutup, bukan satu parameter: jangkar `targetDifficulty`
tertinggal dari kemampuan nyata, informasi Fisher mengecil, Î¸Ì‚ makin lambat menyusul, jangkar
tidak pernah naik.

## Trade-off yang diterima OWNER, dengan angkanya

50 seed Ã— 9 profil, CI bootstrap berpasangan, sebelum â†’ sesudah pada kebijakan shipped:

| Metrik | Sebelum | Sesudah | Î”CI 95% | Arah |
|---|---|---|---|---|
| censoredRate | 0.8711 | 0.6489 | [âˆ’0.260, âˆ’0.184] | lebih baik |
| timeToMastery (58 pasangan tak tersensor) | 29.0 h | 20.7 h | [âˆ’9.62, âˆ’6.97] | lebih baik |
| falseDeclineRate (seed 42, konstrain â‰¤ 0.010) | 0.0101 | 0.0000 | â€” | terpenuhi |
| retentionDay90 | 0.3618 | 0.3204 | [âˆ’0.050, âˆ’0.033] | **lebih buruk** |
| brier | 0.1554 | 0.1884 | [+0.031, +0.035] | **lebih buruk** |

Regresi retensi/Brier itu **relatif terhadap versi sebelum-perbaikan, bukan terhadap v1**:
gate keselamatan shipped vs v1 tetap `kandidat_lebih_baik` pada ketiganya. Kenaikan Brier
mekanis â€” akurasi turun 0.80â†’0.74 menaikkan lantai p(1âˆ’p) 0.159â†’0.191, jadi margin kalibrasi
justru sedikit membaik.

Varian yang ditolak: `share >= 0.875` (melanggar konstrain false-decline seed-42, 0.0202 >
0.010) dan `streak >= 3` (gagal gate osilasi keras, +0.69 vs v1).

## Bump versi

m025-200 â†’ **m025-203** lewat `node tools/bump-build.mjs`. Wajib, bukan kosmetik: A7 menuntut
`DIAG_BUILD = base+1` setiap kali berkas berpola `features/` berubah, dan F1 mengubah
`fiezel-core-brain.js` yang ikut precache. `SW_REV` membawa prefiks `m025-203-` supaya PWA
terpasang menarik ulang shell.

## Yang menghalangi (bukan dari perubahan ini)

Dua gerbang gagal pada `origin/main` polos, diverifikasi di worktree terpisah:

1. `voice-fallback-chain-test.js` â€” "tangga suara NOT READY (42 pass, 3 fail)". **Bukan bug
   produksi**: kunci `fsl.audio-error-*` ada di `features/i18n/copy-id-feat-d.js:58` dan
   `index.html:348` memuatnya, jadi murid melihat teks yang benar. Yang basi adalah harness
   test-nya, yang tidak melakukan preload i18n â€” kelas kerusakan yang sama sudah pernah
   diperbaiki untuk 10 harness lain.
2. `content-drift-test.js` â€” assert konsistensi-diri gerbang wave F2: alat perbaikan
   `tools/sync-grammar-explanations-id.js` melaporkan data SINKRON sementara gerbangnya
   mengharapkan sebaliknya.

Keduanya masuk lewat wave m025-200 yang di-merge dalam keadaan merah. Selama belum diperbaiki,
tidak ada PR yang bisa hijau.

## Langkah berikutnya

1. Perbaiki dua gerbang merah di `main` di atas â€” keputusan arah untuk nomor 2 ada di OWNER
   kalau ternyata gerbangnya yang salah, bukan datanya.
2. Merge PR #253 setelah `quality` hijau.
3. Merge PR #261 (arbiter nomor build) â€” terhalang oleh dua gerbang yang sama.
4. **Tidak** termasuk dalam keputusan ini dan tetap `research_hold`: klaim nilai praktis
   kalibrasi item (butir #10 nomor 1 dan 4 BRAIN-EVOLUTION-DECISIONS.md) dan desain skenario
   dunia-bank yang tersensor identik pada baseline maupun varian shipped. Keduanya mendakwa
   skenario/ablasi, bukan kebijakan shipped.
