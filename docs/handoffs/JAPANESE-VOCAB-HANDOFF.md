# Bank kosakata Jepang — JAPANESE-VOCAB-HANDOFF

**Status:** data mentah yang sudah dinormalkan. **Nol byte produksi** — tidak ada berkas
aplikasi yang memuatnya, jadi nomor build sengaja tidak dinaikkan (pola PR #365, #373).

## Apa yang ada di sini

`docs/japanese/kosakata-jlpt.json` — **1.371 entri**, gabungan dua berkas kosakata milik
owner, dinormalkan ke satu bentuk dan dikelompokkan per tingkat JLPT.

| Sumber | Entri masuk | Isi aslinya |
|---|---|---|
| `DaftarKosaKataBahasaJepang.txt` | 862 | daftar **romaji–Indonesia** (bagian hiragana lalu bagian katakana), tanpa aksara Jepang sama sekali |
| `Dokumen.txt` | 549 | daftar **kata kerja** Indonesia–hiragana–kanji |
| **Jumlah** | **1.411** | |

1.411 masuk → **1.371 keluar**; 40 selisihnya adalah entri yang benar-benar sama
(kana + arti identik) di kedua berkas, digabung jadi satu dan pasangannya dicatat di
medan `alsoFrom`. **Nol entri sumber hilang** — diverifikasi programatik dengan
mencocokkan kembali setiap nomor sumber 1–862 dan 1–549.

### Bentuk tiap entri

```json
{
  "romaji": "okimasu",
  "kana": "おきます",
  "kanji": "起きます",
  "id": "bangun tidur",
  "pos": "verb",
  "verbGroup": "ichidan",
  "jlpt": "N5",
  "src": "kosakata#1"
}
```

Medan opsional: `verbGroup` (godan/ichidan/suru/kuru/irregular — ada pada kata kerja dari
berkas kedua), `proper` (nama diri), `note` (catatan penilaian, lihat di bawah),
`alsoFrom` (entri sumber kembar yang digabung).

### Sebaran tingkat

| Tingkat | Entri |
|---|---|
| N5 | 486 |
| N4 | 327 |
| N3 | 279 |
| N2 | 202 |
| N1 | 77 |

Sebaran kelas kata: kata kerja 690, nomina 476, ungkapan 72, adjektiva-i 54,
adjektiva-na 24, pronomina 21, adverbia 17, penggolong 15, numeralia 2.
996 dari 1.371 entri punya ejaan kanji; sisanya memang lazim ditulis kana saja
(termasuk seluruh 264 kata serapan katakana).

## Yang harus owner tahu sebelum memakainya

**1. Tingkat JLPT di sini adalah perkiraan, bukan daftar resmi.** Japan Foundation
berhenti menerbitkan daftar kosakata resmi sejak pembaruan ujian 2010; yang beredar
sekarang adalah rekonstruksi komunitas. Penilaian di berkas ini disusun dari frekuensi
pemakaian dan tingkat pengajaran yang lazim. Kalau owner punya daftar acuan sendiri,
medan `jlpt` bisa ditimpa tanpa menyentuh medan lain.

**2. Berkas pertama tidak punya aksara Jepang sama sekali.** Seluruh 862 kana dan kanji
di bagian itu **direkonstruksi dari romaji**, dipandu kolom arti Indonesia. Itu tepat
untuk kata yang jelas, tetapi romaji tidak membedakan homograf: sumber menulis `hashi`
untuk 橋 dan 箸, `hana` untuk 鼻 dan 花, `kami` untuk 紙 dan 髪. Di kasus begitu kolom arti
dipakai untuk memilih, dan pilihannya dicatat di `note`. Kana dan kanji dari berkas kedua
**tidak** direkonstruksi — itu tulisan owner sendiri dan dibiarkan apa adanya.

**3. Ada 74 entri bercatatan.** Isinya tiga macam: ejaan kanji yang diperbaiki
(斃す→倒す, 明らめる→諦める, 基く→基づく, 非難する→避難する untuk "mengevakuasi"),
romaji yang tampaknya salah ketik OCR (`gurabu`→クラブ, `pocchikisu`→ホッチキス,
`fuirimu`→フィルム), dan bentuk yang bukan bahasa Jepang baku tapi tetap disimpan karena
ada di sumber owner (`ばかする`, `まとめする`, `必要する`, `興味する`, `工程する`).
Yang terakhir itu **sengaja tidak dipakai** kalau bank ini nanti jadi bahan soal —
menyaring lewat `note` sebelum dipakai adalah langkah wajib.

**4. Satu entri tanpa kana.** `kosakata#635` (`Tetto` = "kontan") tidak cocok dengan kata
serapan mana pun; ia disimpan dengan `kana: ""` dan `note: "unidentified"` supaya terlihat,
bukan dibuang diam-diam.

**5. Hak cipta.** Kedua berkas adalah milik owner sendiri, bukan Minna no Nihongo maupun
Irodori. Batasan yang berlaku di `JAPANESE-COURSE-HANDOFF.md` — silabus boleh, kalimat
tidak — tidak tersentuh oleh berkas ini.

## Hubungannya dengan usulan kursus (PR #373)

Bank ini **bahan**, bukan konten soal. Kalau usulan A1/N5 di PR #373 disetujui, daftar ini
memasok kosakata inti tiap tingkat, sedangkan setiap kalimat, pengecoh, dan penjelasan
tetap ditulis baru sesuai janji di sana. Aturan penulisan yang sudah ditemukan di PR itu
juga berlaku di sini: `marker` untuk butir Jepang wajib slug ASCII, sebab `conceptOf()` di
`features/brain/fiezel-question-memory.js:127` membuang aksara non-ASCII dan diam-diam
mematikan pembatas kebaruan konsep.

## Kalau mau dipakai di aplikasi

Belum ada gerbang untuk berkas ini karena belum ada modul yang memuatnya. Saat pertama
kali dimuat, yang harus lahir bersamanya (dibuktikan merah dulu):

1. Gerbang skema: setiap entri punya `kana` beraksara Jepang, `id` tidak kosong, `jlpt`
   salah satu dari lima tingkat, `pos` dari daftar tertutup.
2. Gerbang utang: entri ber-`note` "unidentified" atau berbentuk tak baku tidak boleh
   masuk bank soal.
3. Kembaran Thai — teks yang dilihat murid lahir dua bahasa, jadi arti yang tampil di layar
   perlu sidecar `th` sebelum dikirim, sesuai `I18N-TH-PARITY-HANDOFF.md`.
