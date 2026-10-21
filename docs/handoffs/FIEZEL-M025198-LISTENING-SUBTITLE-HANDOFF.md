# Handoff m025-198 — subtitle terjemahan mati di soal listening

**Kewenangan: OWNER.** Laporan langsung pemilik, dan ia menyebutnya fatal: saat ujian tes
kemampuan, bagian listening memunculkan terjemahan Indonesia sambil rekaman berbunyi.

## Status

**SELESAI dan terkunci gerbang.** Terjemahan tidak lagi muncul pada pemutaran listening mana
pun — Indonesia maupun Thai — sementara Vocabulary dan Reading tetap punya terjemahannya.

## Cacatnya, dan kenapa m025-148 tidak menutupnya

`app.js` sudah menulis invariannya sendiri di `makeListeningQuestion`:

> *"Naskahnya TIDAK ikut ke question: kalau tampil sebagai teks, soalnya berubah menjadi soal
> membaca, dan tes ini justru dibuat tanpa reading."*

Naskahnya memang tidak ikut. **Terjemahannya** yang lewat pintu lain — `FiezelVoiceSay.say()`
memanggil `prepareSubtitle()` kecuali diberi `suppressSubtitles`.

m025-148 membangun tombol itu dan memakainya di Skills Lab. Tombolnya benar. Jalur kuisnya
yang tidak pernah menekannya, di **dua** mata rantai:

1. `AudioService.play()` hanya meneruskan `speed`/`contentType`/`locale`, jadi
   `suppressSubtitles` dari pemanggil mana pun **hilang di pintu itu** — ditekan pun tak sampai.
2. Titik panggil listening tes penempatan memang tidak pernah mengirimnya.

Menambal salah satu meninggalkan cacatnya hidup lewat yang lain.

## Perbaikan, dan kenapa dua lapis

- Bendera **diteruskan** melewati `AudioService.play()`.
- Bendera **diturunkan** dari `contentType === 'listening'`.

Lapis kedua yang menutup **kelasnya**: setiap pemutaran listening lewat pintu ini bisu
subtitle, sekarang dan untuk pemanggil yang ditulis nanti walau penulisnya tidak tahu
benderanya ada. Lapis pertama saja hanya menambal satu pemanggil.

Terjemahan **apa pun** tertutup, bukan hanya Indonesia: `prepareSubtitle` memanggil
`FiezelSubtitleTranslate` yang mengikuti locale murid, jadi jalur Thai mati di titik sama.

## Batasnya diuji, bukan diasumsikan

Membisukan semuanya akan merusak Vocabulary dan Reading. `tests/listening-subtitle-suppression-test.js`
**menjalankan** `AudioService` asli (diekstrak dari `app.js`, bukan disalin) dengan
`FiezelVoiceSay` tiruan yang mencatat options yang benar-benar diterimanya — perilaku, bukan
pola teks. Assert berbasis pola teks persis yang membiarkan cacat ini lolos sejak m025-148.

| bukti merah | hasil |
|---|---|
| kembalikan pintu yang menjatuhkan bendera | 6/8 |
| matikan penurunan dari `contentType` | 7/8 |
| bisukan **semuanya** | 6/8 — Vocabulary & Reading yang jatuh |
| pulih | **8/8** |

Suite lokal **210/210**.

## Kenapa berkas ini menyentuh wilayah sesi lain

`features/neural-voice/fiezel-diag-panel.js` berubah **hanya** pada satu angka: `DIAG_BUILD`
`m025-197` → `m025-198`, ditulis `tools/bump-build.mjs` — pintu tunggal yang disepakati
protokol koordinasi. Nol baris logika panel diagnostik disentuh, dan `fiezel-voice-say.js`
**tidak disentuh sama sekali**: tombolnya sudah benar sejak m025-148, yang salah ada di
`app.js`.

## Baseline emas diregenerasi — nol teks murid berubah

`id-golden-snapshot-test` membekukan potongan byte `app.js`. Selisihnya diperiksa satu per satu
sebelum baseline disentuh: hanya `,suppressSubtitles:noSubtitles` dan blok komentar m025-198.
Nol literal yang dilihat murid berubah.

## Langkah berikutnya

1. Pemilik menekan **Update from Remote → Deploy HEAD Commit** di cPanel.
2. **Actions → FIEZEL Deploy Site → Run workflow** pada `main` untuk menuntut bukti `m025-198`.
3. Tutup total aplikasi di HP lalu buka lagi.

## Utang yang MASIH milik sesi neural-voice

`#fiezelDiagSearch` (13px) dan `#fiezelDiagText` (11px) masih di bawah lantai 16px.
