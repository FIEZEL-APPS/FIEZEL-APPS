# FIEZEL — koreografi pembuka dan identitas bunyi (handoff m025-86)

**Status:** selesai dan dideploy pada m025-86. Diminta OWNER, dikerjakan penuh.
**Cabang:** `claude/splash-white-flash-sfx-y3hx7e` · **PR:** #130

---

## 1. Untuk siapa dokumen ini

Siapa pun yang berikutnya menyentuh splash, animasi pembuka, atau SFX. Ada satu aturan
baru di sini yang tidak terlihat dari membaca satu berkas saja, dan melanggarnya akan
mengembalikan bug yang baru saja diperbaiki.

## 2. Aturan barunya

**Ritme pembukaan hidup di `features/brand/fiezel-choreography.js`, dan HANYA di sana.**

Sebelum m025-86 ritmenya ditulis dua kali - sebagai jeda animasi di `style.css` dan
sebagai waktu nada di `features/audio/fiezel-ui-sfx.js` - tanpa apa pun yang menjaga
keduanya tetap sama. Keduanya sudah melenceng, dan hasilnya terukur:

```
    0ms  batang F tumbuh       -> ada bunyi
  105ms  lengan F atas         -> ada bunyi
  155ms  lengan F bawah        -> SENYAP
  210ms  batang emas naik      -> ada bunyi
  250ms  batang emas kedua     -> SENYAP
  420ms  kilau emas menyapu    -> SENYAP
  540ms  wordmark naik         -> SENYAP
  680ms  tagline naik          -> SENYAP
```

Animasi berakhir di 1160ms, bunyi terakhir dipicu di 210ms: **950 milidetik terakhir
pembukaan berjalan tanpa suara sama sekali.** Itulah yang OWNER rasakan sebagai "tidak
selaras" - bukan nadanya yang salah, melainkan lima dari delapan gerakan yang tidak pernah
dibunyikan.

## 3. Cara mengubah ritme sekarang

Ubah `BEATS` di `features/brand/fiezel-choreography.js`. Itu saja.

- `style.css` membaca jeda lewat `var(--fz-bN)`; modul splash memasangnya ke elemen host.
- `fiezel-ui-sfx.js` menjadwalkan nada dari tabel yang sama lewat `audioBeats()`.
- `index.html` menyimpan salinan nilainya sebagai default di `<style id="fiezelBootCritical">`,
  karena splash frame-pertama bergerak **sebelum** satu baris JavaScript pun berjalan.

**Salinan di `index.html` itu satu-satunya duplikasi yang tersisa, dan ia dijaga tes.**
Kalau kamu mengubah `BEATS`, jalankan `node tests/splash-choreography-test.js`; ia akan gagal dan
menuliskan blok pengganti yang persis harus disalin ke `index.html`.

Yang TIDAK boleh dilakukan: menulis jeda animasi sebagai angka di `style.css`. Tes menolak
itu secara eksplisit, karena persis begitulah kedua sistem melenceng pertama kali.

## 4. Kenapa nadanya seperti itu

Motifnya akor **F mayor add9** yang diurai naik: `F2 F3 C4 F4 A4 C5 G5`, satu nada per
ketukan visual.

- **F sebagai pusat** karena F adalah huruf mereknya sendiri.
- **Terts besar (A4) jatuh tepat saat batang emas naik.** Emas adalah warna aksen merek;
  terts besar adalah nada yang memberi warna pada akor. Warna di layar dan warna di akor
  tiba pada frame yang sama. Ini kaitan yang melekat tanpa pendengarnya sadar kenapa - dan
  kalau kamu memindahkan ketukan emas, pindahkan A4 bersamanya atau kaitannya hilang.
- **Penutupnya G5, nada kesembilan, bukan tonika.** Terbuka dan menggantung; aplikasi
  belajar tidak sedang mengucapkan titik. Add9 inilah yang membedakan akor "mahal" dari
  trinada polos yang terdengar seperti bunyi bawaan sistem.
- **F2 di ketukan pertama nyaris bukan nada, melainkan bobot.** Prinsip yang sama dipakai
  "ta-dum" Netflix: yang melekat adalah dorongan rendah di dada, bukan pitch-nya.

Seluruh SFX transisi adalah nada dari akor yang sama, jadi setiap ketukan di dalam aplikasi
terdengar sebagai kutipan sapaan pembukanya. Menambah SFX baru dengan nada di luar akor itu
akan ditolak tes.

## 5. Batas yang tetap berlaku dari m025-84

Perbaikan "SFX bocor ke menu" tidak boleh mundur. Aturannya tetap: **jangan pernah
menjadwalkan ke `AudioContext` yang belum berjalan.** Konteks yang lahir tanpa sentuhan
pengguna berada dalam keadaan `suspended`, dan di sana `ctx.currentTime` beku - jadwal yang
ditulis ke sana tidak dibuang melainkan ditahan, lalu tumpah sekaligus saat konteks
di-resume oleh sentuhan pertama. Motif splash karena itu disiagakan dengan tenggat yang
diikat ke umur splash (`options.windowMs`); lewat tenggat itu ia dibuang.

`tests/splash-first-paint-test.js` menjaga ini dengan `AudioContext` tiruan yang benar-benar
meniru `currentTime` yang beku. Jangan melonggarkannya.

## 6. Tipografi

Fredoka dilepas dari bundel, berkasnya dihapus dari repo dan precache. Penggantinya dua
lapis:

- **Instrument Serif** (OFL, 21 KB, self-hosted) **hanya di ukuran display** - wordmark,
  judul layar, judul dialog. Beratnya dipaku `400` karena berkasnya memang hanya punya itu.
- **Plus Jakarta Sans** untuk teks tubuh dan judul kecil.

Serif kontras-tinggi di ukuran kecil merusak keterbacaan di layar ponsel. Kalau nanti ada
yang tergoda memakai `--fz-display` untuk judul kartu atau label, jangan; itu sebabnya
tokennya dipisah dari `--fz-heading` alih-alih sekadar mengganti nilainya.

## 7. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `features/brand/fiezel-choreography.js` | tabel ketukan - satu-satunya sumber ritme |
| `features/audio/fiezel-ui-sfx.js` | sintesis motif dan SFX transisi |
| `features/brand/fiezel-splash.js` | memasang ketukan ke elemen host |
| `style.css` | animasi splash, membaca `var(--fz-bN)` |
| `index.html` | salinan default ketukan + CSS kritis frame-pertama |
| `tests/splash-choreography-test.js` | menjaga seluruh invarian di atas |
| `tests/splash-first-paint-test.js` | menjaga batas m025-84 |

## 8. Langkah berikutnya

Tiga pekerjaan menyusul sebagai PR masing-masing, sesuai instruksi OWNER untuk deploy satu
per satu:

1. **Teks tidak terbaca di mode gelap** - `button{background:#fff}` dipaku putih,
   `fiezel-ui-v6` terpasang se-aplikasi, dan `body.scene-*` mengalahkan `:root` sehingga 15
   dari 32 token gelap jadi kode mati. Inventaris lengkapnya di
   `FIEZEL-M02585-KONTRAS-DAN-SWIPEBACK-HANDOFF.md`.
2. **Notification gate yang terlalu agresif** - dijadikan undangan kontekstual setelah
   perkenalan, tidak lagi mengunci aplikasi. Ini membalik keputusan m025-34.
3. **Boot lambat** - `js.puter.com` dikeluarkan dari jalur kritis, dan modul berat
   (neural voice, tutor) di-lazy-load setelah layar Home tampil.
