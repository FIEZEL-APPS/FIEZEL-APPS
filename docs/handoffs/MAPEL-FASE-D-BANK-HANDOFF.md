# HANDOFF — Bank Mapel Fase D (MAT / IPA / ENG)

**Status:** isi LENGKAP dan dijaga gerbang; satu jalur runtime SENGAJA belum disambung.
**Wewenang:** OWNER. Keputusan yang tersisa di bawah milik OWNER, bukan milik pelaksana.
**Build saat mendarat:** `m025-346` · **PR:** #444 · **Gerbang:** `tests/mapel-fase-d-content-test.js`

---

## 1. Apa yang ditutup

`synthesizeMapelQuestions()` menerima `compCode` sejak awal tetapi tidak pernah memakainya
untuk menyaring apa pun — kolamnya satu per mapel:

```js
var baseList = templates[subjectId] || templates.MAT || [];
```

Akibatnya terukur, bukan dugaan: guru Matematika kelas 9 yang menerbitkan "Statistika &
Peluang" mengirim kolam yang PERSIS SAMA dengan guru kelas 7 yang menerbitkan "Bilangan
Bulat" — irisan 15 dari 15.

| | sebelum (`m025-339`) | sesudah (`m025-346`) |
|---|---|---|
| Soal unik per mapel (diminta 20) | 15 | 20 |
| Irisan dua kompetensi berbeda | **15 dari 15** | **0 dari 12** |
| Minta 20 dari kompetensi berisi 12 | 20 (lintas bab) | 12, nol tambalan |
| Kompetensi Fase D | 4 / 3 / 3 | 9 / 9 / 9 |
| Butir | 15 literal `.js` per mapel | 324 JSON + 324 sidecar Thai |

## 2. Bentuk yang sekarang berlaku

```
content/mapel/mapel-{mat,ipa,eng}-d.json       <- naskah Indonesia, sumber kebenaran
content/mapel/mapel-{mat,ipa,eng}-d-th.json    <- sidecar Thai, kunci sama persis
```

- Kunci jawaban SELALU indeks 0 di berkas sumber; pengacakan terjadi saat terbit
  (`shuffleOptions`). Karena itu tidak ada penjelasan yang boleh menyebut POSISI pilihan.
- `distractorWhy` adalah peta miskonsepsi bernama untuk ketiga pengecoh, dan ia ikut
  dipetakan ulang saat opsi diacak.
- Katalog kompetensi guru (`MAPEL_CATALOG`) mengikuti bank begitu bank termuat: satu sumber
  kebenaran, sehingga dropdown tidak bisa menawarkan kompetensi yang banknya kosong.
- Pemuatan bank GAGAL LUNAK di dua jalur (fs sinkron di Node, fetch non-blok di peramban).
  Bank absen berarti perilaku lama — bukan lemparan, bukan layar kosong. 14 mapel lain
  hidup di jalur itu setiap hari dan tidak berubah sama sekali.

## 3. Yang BELUM disambung — ini inti handoff ini

**Sidecar Thai belum dibaca satu pun jalur runtime.** Isinya lengkap (324 butir, nol utang),
sudah dijaga gerbang paritas, dan sudah ada di repo — tetapi murid Thai hari ini tetap
menerima butir berbahasa Indonesia, karena `synthesizeMapelQuestions()` hanya membaca berkas
id.

Menyambungkannya menuntut satu keputusan arsitektur yang BUKAN milik pelaksana:

> Satu tugas diterbitkan sekali oleh guru dan dikirim identik ke seluruh murid
> (`buildAssignment` menyimpan satu larik `items`). Kalau satu kelas memuat murid Indonesia
> DAN murid Thai, bahasa mana yang dibekukan saat terbit?

Tiga jalan yang terlihat, masing-masing dengan harganya:

1. **Bahasa dibekukan saat terbit** (guru memilih). Paling murah; salah untuk kelas campur.
2. **Tugas membawa kedua bahasa**, murid memilih saat mengerjakan. Payload dua kali lipat,
   tetapi jujur untuk kelas campur. Menuntut perubahan `assignmentPayload` dan runner murid.
3. **Murid menarik butir per-locale saat mengerjakan**, tugas hanya menyimpan `id` butir.
   Paling bersih, paling jauh dari bentuk sekarang, dan menuntut bank ikut ter-precache
   untuk offline.

Konsekuensi teknis yang menempel pada pilihan 2 dan 3: sidecar `-th.json` SENGAJA belum
masuk precache `sw.js` hari ini (tidak ada yang membacanya, dan memprecache berkas yang tak
pernah dibaca membebani setiap pemasangan). Jalur baca th nanti yang WAJIB membawa entrinya
sendiri beserta kenaikan `SW_REV`.

## 4. Langkah berikutnya (next steps / roadmap)

- [ ] **OWNER memutuskan** satu dari tiga jalan di §3. Tanpa itu, pekerjaan lanjutan hanya
      menebak bentuknya.
- [ ] Sesudah keputusan: sambungkan jalur baca th, tambahkan entri sidecar ke precache
      `sw.js`, naikkan `SW_REV` lewat `tools/bump-build.mjs`.
- [ ] Tambahkan assert di `tests/mapel-fase-d-content-test.js` yang menuntut jalur baca itu
      benar-benar memilih sidecar untuk locale th — hari ini gerbangnya baru menjaga ISI,
      belum menjaga PENYAJIANnya.
- [ ] Terjemahan Thai berstatus `DRAFT AI` di header tiap sidecar (pola `vocabulary-th.json`).
      Review penutur asli belum dilakukan dan wajib sebelum rilis ke murid Thai.

## 5. Lingkup yang sengaja TIDAK disentuh

- 14 mapel di luar MAT/IPA/ENG, dan seluruh jenjang SD/SMA. Kolam lama mereka tetap utuh
  sebagai jalur fail-quiet.
- `KOMP-ENG-E-10-EXP-01` (Fase E, kelas 10) tidak dihapus dari repo, tetapi tidak lagi
  dipakai sebagai kompetensi Fase D.
- 206 kunci `mapel_*` tanpa titik di `MAPEL_CATALOG` yang lolos `i18n-kunci-hantu-test`
  karena gerbang itu melewati kunci tanpa titik. Utang lama, menyentuh 17 mapel sekaligus,
  jadi di luar lingkup pekerjaan ini — TETAPI pekerjaan ini tidak menambahinya: nama dan
  materi kompetensi baru lahir di JSON dwibahasa, bukan sebagai kunci hantu baru.

## 6. Rujukan

- Kompetensi diturunkan dari **Kepmendikbudristek/BSKAP No. 032/H/KR/2024**, CP Fase D, pada
  tingkat **Elemen**. Rujukan sengaja berhenti di situ: nomor butir CP yang lebih rinci tidak
  dapat dipastikan, dan kurikulum palsu lebih merusak daripada kurikulum yang jujur mengaku
  hanya sampai tingkat Elemen.
- Pola sidecar meniru `content/ja/` dan sensus bertanggal `tests/japanese-th-parity-test.js`.
- Prinsip "saringan yang habis tidak ditambal" mengikuti `curriculumOnly` di
  [`KURIKULUM-SEKOLAH-HANDOFF.md`](KURIKULUM-SEKOLAH-HANDOFF.md).
