# FIEZEL — Tahap 1 brief redesign: markdown mentah dan nav pill (handoff m025-93)

**Status:** selesai pada m025-93. **Cabang:** `m025-93-tahap1-bug-kritis` · **PR:** #139
**Penerimaan fisik:** WAIVED_BY_OWNER, dipilih OWNER di sesi kerja m025-93.
**Sumber:** `FIEZEL_Instruksi_Redesign_Eksklusif` (v2) Bab 2 — dua bug yang brief-nya taruh
**sebelum styling apa pun**.

---

## 1. Dua aturan baru

### Aturan A — teks dari model TIDAK PERNAH disisipkan mentah

Semua permukaan AI mengalir lewat dua fungsi saja: `renderAIResult()` dan
`renderCoachResult()`. Keduanya kini melewati `renderMarkdown()`.

**Urutannya adalah keamanannya, dan urutan itu tidak boleh dibalik:** `esc()` dijalankan
DULU per baris, baru penanda diubah menjadi tag. Dengan begitu tidak satu pun karakter dari
model bisa menjadi markup — yang menjadi tag hanya pola yang dikenali penerjemah.

Kalau nanti ada yang tergoda memakai pustaka markdown yang mengurai lebih dulu lalu meng-escape
belakangan: itu membalik urutannya, dan lubangnya kembali. Tiga tes akan memerah.

### Aturan B — chrome yang mengapung tidak boleh transparan tanpa blur

`--glass-thick` dirancang untuk kaca **buram**. m025-81 mencabut `backdrop-filter` dari chrome
demi baterai tetapi meninggalkan transparansinya, dan sejak itu tab bar menjadi panel bening:
26% dari apa pun yang lewat di bawahnya menembus ke atas.

Chrome yang mengapung sekarang memakai `--glass-solid` (`.97`), dan konten diredupkan sebelum
sampai ke sana lewat `.nav-scrim`. **Blur tidak boleh dikembalikan** sebagai jalan pintas —
keputusan baterai m025-81 masih berlaku, dan `ui-structure-test.js` menolaknya.

## 2. Yang paling mudah disalahpahami

**Keluhan "nav bar menimpa konten" BUKAN soal padding.** Diukur di peramban: `.app` sudah
punya `padding-bottom: 112px + safe-area`, sementara pill hanya memakan 73px dari dasar layar.
Tidak ada satu pun elemen daun yang tertimpa di Home/Vocab/Grammar/Reading/Peta, bahkan saat
digulir sampai habis.

Orang berikutnya yang membaca keluhan itu akan menambah padding dan tidak akan mengubah apa
pun. Yang salah adalah materialnya, bukan ruangnya.

## 3. Dua tes yang memaku bentuk, bukan sifat

`regression-test.js:18` dan `product-audit.js:40` mencocokkan literal
`esc(text).replace(/\n/g,'<br>')`. Keduanya merah setelah perubahan ini — **walau keamanannya
justru naik** — karena yang mereka jaga adalah bentuk implementasinya.

Keduanya diubah memeriksa sifatnya: teks model tidak pernah disisipkan mentah, dan
penerjemahnya meng-`esc` setiap baris sebelum menyentuh satu penanda pun. Ini pola yang layak
ditiru: kalau sebuah gerbang memaksa implementasi tertentu, ia akan menghalangi perbaikan yang
benar suatu hari nanti.

## 4. Semua gerbang diuji-mutasi

| Mutasi | Hasil |
|---|---|
| pill dikembalikan ke `--glass-thick` | merah |
| elemen `.nav-scrim` dihapus dari `index.html` | merah |
| `renderMarkdown` dilepas dari `renderAIResult` | merah |
| `esc(raw)` dicabut dari penerjemah | merah di 3 tes sekaligus |

## 5. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `app.js` | `renderMarkdown()`, `mdInline()`, dua pemanggilnya, `{name}` di jalur AI Coach |
| `style.css` | `--glass-solid` di setiap palet, `.bottomnav`, `.nav-scrim` |
| `index.html` | elemen `.nav-scrim` |
| `ai-integration-test.js` | gerbang markdown + XSS lewat jalur yang sama |
| `ui-structure-test.js` | gerbang material chrome, termasuk larangan blur kembali |
| `regression-test.js`, `product-audit.js` | gerbang yang diubah dari bentuk ke sifat |

## 6. Yang BELUM dikerjakan dari brief

Tahap 3.7 — kepadatan. Diukur di Home: **3.811px = 4,69 layar penuh**, 285 kata, 8 blok.
Penyumbang terbesar `.learning-launcher{grid-template-columns:1fr}` di `@media(max-width:640px)`
yang meruntuhkan 6 kartu modul menjadi satu kolom setinggi 976px.

Catatan penting untuk yang mengerjakannya: `ui-structure-test.js` **menuntut** keruntuhan satu
kolom itu (`'Learning launcher does not collapse for mobile.'`). Itu keputusan yang sengaja
dan diuji, jadi mengubahnya berarti mengubah tesnya juga — dengan alasan yang ditulis, bukan
dihapus diam-diam.
