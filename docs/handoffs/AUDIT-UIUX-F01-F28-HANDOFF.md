# Audit UI/UX F01–F28 (build m025-360): status perbaikan

Otoritas: OWNER. Laporan sumber: `reports/AUDIT-UIUX-FIEZEL-2026-09-23.md`, salinan dari
artifact audit 23 Sep 2026. Dokumen ini mencatat temuan mana yang sudah ditutup, di commit
mana, dan kontrak apa yang harus dijaga. Tujuannya supaya sesi berikutnya tidak perlu lagi
mencari laporan aslinya.

## Status

SEDANG BERJALAN. PR #459 (branch `claude/adoring-goodall-nshlug`) memulai pekerjaan ini, dan
branch `claude/gallant-pascal-ot28dv` melanjutkannya dari ujung PR itu.

| Temuan | Status | Catatan |
|---|---|---|
| F01 tes penempatan tidak jalan | Selesai | commit 5dc5332 (PR #459) |
| F02 CTA Home buntu | Selesai | commit 5dc5332 |
| F03 "bukan ujian" berpenalti | Selesai | commit 5dc5332 |
| F04 lima konsep tes | Selesai | commit 5dc5332 |
| F05 pertanyaan diulang | Selesai | commit 5dc5332 |
| F06 nama jadi ID publik + liga | Selesai (klien + worker) | lihat kontrak F06 di bawah; rute worker perlu deploy |
| F07 label pecah per huruf | Selesai | commit 2576b48 |
| F08 dua tombol Lanjut | Selesai | commit 2576b48 |
| F09–F28 | Belum | urutan kerja: F22, F13/F14, F18/F17, F16/F12/F15, F09–F11, F23–F25, F26/F27, F19–F21, F28 |

## Kontrak F06

1. Pendaftaran di onboarding tetap satu kali dan tetap tanpa kotak centang (keputusan owner
   m025-262). Yang berubah hanya bawaannya: `friendsVisible:true`, `leagueOptIn:false`.
   Papan Teman hanya memperlihatkan murid kepada teman yang ia terima sendiri.
2. Ikut atau keluar liga adalah satu ketukan di papan Liga (`socialSetLeague`), lewat rute
   `POST /api/social/rank/league {optIn:boolean}`. Rute ini hanya mengubah bit
   `LEAGUE_OPT_IN` dan tidak menyentuh Mode privat (`BOARD_HIDDEN`).
3. Langkah nama menjelaskan dalam satu baris bahwa nama itu menjadi ID online dan boleh nama
   samaran. Jangan dikembalikan jadi paragraf, karena m025-242 mencabutnya supaya langkah 1
   muat tanpa digulir.
4. Gerbang: `tests/student-single-registration-test.js` (R2) dan
   `tests/social-api-contract-test.js` (bagian 11).

Tindakan owner: deploy worker `workers/api` supaya rute liga hidup di produksi. Sebelum itu
tombol "Ikut liga" menjawab dengan toast gagal yang sopan, tanpa merusak papan.

## Gerbang yang merah di `main`, bukan dari pekerjaan ini

Kelima gerbang berikut juga merah di `main` (0130cc2), diuji pada checkout bersih:
`tests/class-hub-test.js`, `tests/teacher-i18n-lazy-test.js`, `tests/i18n-kunci-hantu-test.js`
(ketiganya berasal dari commit `659a1a0` restrukturisasi KelasKu: tombol Tutor dicabut dari tab
Kelas, kartu mapel diganti chip, dan 27 kunci `kelas.*` dipakai tanpa didaftarkan),
`tests/id-golden-snapshot-test.js`, dan `tests/lucide-icon-coverage-test.js`.

## Berikutnya

- Lanjutkan F09–F28 sesuai urutan di tabel. Perbarui tabel ini di setiap commit.
- Setelah owner memutuskan nasib tombol Tutor di tab Kelas, perbaiki gerbang class-hub di PR
  terpisah (daftarkan kunci `kelas.*` id+th, sesuaikan asersi dengan chip strip).
