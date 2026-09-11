# FIEZEL — Sistem Karakter Merek (PAW)

Satu karakter, satu palet, satu bahasa bentuk, di seluruh aplikasi dan seluruh materi.
Dokumen ini menjelaskan apa yang ada, dari mana ia lahir, dan aturan yang menjaganya.

Lihat seluruh sistem sekaligus: buka **`mockups/character-system.html`** di peramban
(lembar kontak hasil generate; jangan disunting tangan).

---

## 1. Prinsip yang tidak bisa ditawar

1. **PAW tetap PAW.** Sistem ini EVOLUSI, bukan penggantian. Tidak ada spesies baru,
   tidak ada gaya baru, tidak ada aksesori acak. Karakter lama dan baru berdampingan
   wajib terbaca sebagai karakter yang sama.
2. **Satu sumber bentuk.** Tubuh PAW hanya hidup di `features/mascot/fiezel-mascot.js`.
   Seluruh 64 aset di `assets/brand/character-system/` adalah HASIL GENERATE dari rig itu
   (aturan E5/G11). Menyunting SVG dengan tangan memerahkan CI.
3. **Palet tertutup G1.** Sembilan warna, titik. Tanpa gradien, tanpa tekstur, tanpa
   filter, tanpa raster tertanam. Menambah warna adalah keputusan OWNER dengan rujukan
   spec — bukan penyesuaian tes.
4. **Terbaca sebagai siluet.** Kepala PAW harus tetap dikenali pada 24 px. Detail yang
   tidak selamat pada ukuran ikon tidak dipakai.
5. **Siap animasi.** Setiap bagian tubuh punya kelas sendiri (`fz-head`, `fz-ear-l`,
   `fz-arm-r`, `fz-tail-tip`, `fz-pupil`, …) dan tiap prop punya `fz-prop-<nama>`.
   Bisa langsung dipecah di Lottie/Rive tanpa membongkar path.

### Satu keputusan yang perlu ditulis terang

Brief merek generik untuk maskot SaaS biasanya meminta **kontur tebal konsisten**.
Sistem ini **sengaja tidak memakainya**. Bahasa bentuk PAW sejak awal adalah isian datar
tanpa kontur; memberi kontur berarti menggambar ulang karakter — melanggar prinsip 1 dan
membatalkan checksum E5. Kohesi "satu semesta" dikejar lewat jalan lain, dan dijaga
gerbang: palet tertutup, bentuk membulat, prop yang juga tanpa kontur, dan bingkai
seragam per kelompok. Kalau OWNER memang mau PAW berkontur, itu keputusan seni tingkat
rig — ubah `svgMarkup` di `fiezel-mascot.js`, lalu regenerasi semuanya dari sana.

---

## 2. Palet G1

| Peran | Hex | Dipakai untuk |
| --- | --- | --- |
| Kuning | `#FFD94F` | tubuh, kepala, telinga luar |
| Emas | `#EDB93A` | ekor, kaki, bayangan bentuk |
| Krem | `#FFF4DA` | moncong, dada, bidang adegan |
| Marun | `#8C2233` | emblem telapak, telinga dalam, aksen |
| Tinta | `#33201F` | mata, mulut |
| Merona | `#F0A0AC` | pipi |
| Tan | `#D8B36B` | alas, garis, tepi prop |
| Merah lembut | `#D9536A` | penekanan |
| Biru | `#9CC7E8` | keringat/air mata (pengecualian tersahkan) |

Putih `#fff` (sorot) dan hitam `#000` (hanya pada opacity bayangan) menyusul.
Dijaga `tests/palette-gate-test.js`.

---

## 3. Isi pustaka

```
assets/brand/character-system/
  master/         1   karakter master (pose idle, 320x300)
  expressions/   14   crop kepala per ekspresi (276x244)
  poses/         16   badan penuh per pose/gestur (320x332)
  props/         12   benda, kotak 100x100
  badge/          4   lencana telapak, kotak 96x96
  illustrations/ 17   kit UI, bingkai 480x360
  character-system.json   manifest + sha256 tiap berkas
```

**Ekspresi (14).** neutral · happy · excited · curious · thinking · confused ·
encouraging · proud · surprised · celebrating · calm · sleepy · welcoming · concern

**Pose & gestur (16).** idle · waving · pointing · looking · thinking · reading ·
studying · listening · presenting · encouraging · celebrating · jumping · sitting ·
walking · running · sleeping

**Prop (12).** buku · pensil · lampu · bintang · piala · gelembung · tanya · kaca ·
awan · hati · jam · centang

**Badge telapak (4).** `solid` (krem di atas marun) · `ring` (marun di atas krem) ·
`emas` (tinta di atas kuning) · `mono` (satu tinta, untuk cetak & favicon).
Glyph-nya BUKAN gambar baru: ia disalin apa adanya dari `assets/brand/fiezel-paw.svg`
saat ekspor, dan gerbang menuntutnya tetap identik.

**Kit ilustrasi (17).** Lima kelompok: `empty` (4) · `success` (3) · `error` (3) ·
`onboarding` (4) · `marketing` (3). Tata letak setiap adegan sama persis — karakter di
kolom kiri berdiri di alas yang sama, prop rata-kanan pada poros y=186, badge (kalau ada)
di pojok kanan atas. Itulah yang membuat 17 gambar terbaca sebagai satu seri.

---

## 4. Cara mengubah sesuatu

| Yang berubah | Sentuh berkas ini | Lalu |
| --- | --- | --- |
| Bentuk tubuh, mata, ekor, pose, ekspresi | `features/mascot/fiezel-mascot.js` | `npm run mascot:export` **dan** `npm run character:export` |
| Glyph telapak (merek) | `assets/brand/fiezel-paw.svg` | `npm run character:export` |
| Prop, badge, adegan kit | `tools/character-system/library.mjs` | `npm run character:export` |
| Susunan lembar kontak | `tools/export-character-system.mjs` | `npm run character:export` |

**Jangan pernah** menyunting berkas di `assets/brand/character-system/` atau
`mockups/character-system.html`. Keduanya hasil generate; CI memerahkannya.

Menambah prop = satu entri di `PROPS`. Menambah adegan = satu entri di `SCENES`.
Pose baru datang dari rig, dan langsung ikut terekspor tanpa daftar yang perlu disunting.

---

## 5. Gerbang

| Gerbang | Menjaga |
| --- | --- |
| `tests/character-system-gate-test.js` | aset benar-benar hasil generate (`--check`), glyph badge = glyph merek, tanpa gradien/filter/raster/`<style>`, aria-label ada, bingkai seragam per kelompok, lima kelompok adegan lengkap, lembar kontak sinkron |
| `tests/palette-gate-test.js` | palet G1 atas SELURUH isi direktori (lewat `SVG_DIRS`, jadi berkas baru ikut terjaga otomatis) |
| `tests/e5-checksum-gate-test.js` | rig kanonik + aset merek inti tidak drift |
| `tests/pawprint-geometry-gate-test.js` | geometri telapak di rig dan aset merek |

---

## 6. Status kapal

Pustaka ini **sumber desain, bukan aset runtime**: tidak dimuat `index.html`, tidak ada
di `ASSETS` `sw.js`, tidak pernah diunduh murid. Karena itu ia **tidak** ikut ritual bump
`FIEZEL_PAGE_BUILD` / `DIAG_BUILD` / `SW_REV`.

Kalau suatu hari sebuah adegan dipakai di layar sungguhan, tiga hal wajib terjadi dalam
PR yang sama: daftarkan berkasnya di `ASSETS` `sw.js`, naikkan ketiga nomor build
bersama, dan ubah gerbang §5 dari "tidak dikapalkan" menjadi pemeriksaan precache.
`tests/character-system-gate-test.js` memerahkan diri kalau jalur ini muncul di shell —
supaya kenaikan itu selalu lewat keputusan orang, bukan lewat diam.

## 7. Teks dua bahasa

`aria-label` di dalam SVG ditulis Indonesia karena berkas ini aset desain, bukan layar.
Begitu sebuah adegan dipakai di UI, teksnya **tidak boleh** diambil dari `aria-label`
SVG: daftarkan lewat pasangan `features/i18n/copy-id-*.js` + `copy-th-*.js` dan panggil
dengan `FiezelI18n.t()`, sesuai aturan dua bahasa repo ini. Kolom `label` di
`character-system.json` disediakan sebagai titik awal terjemahan, bukan sebagai sumber
teks UI.
