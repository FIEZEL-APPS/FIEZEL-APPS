# Handoff m025-197 — cincin fokus hanya untuk papan tik

**Kewenangan: OWNER.** Laporan ketiga pemilik atas cacat yang sama: "masih ada, hanya berubah
warna dari kuning keemasan menjadi hitam."

## Status

**SELESAI.** Kotaknya sekarang benar-benar tidak muncul saat disentuh, dan pengguna papan tik
tetap mendapat cincinnya.

## Kenapa m025-196 tidak cukup — dan ini pelajaran, bukan alasan

m025-196 memindahkan semua cincin dari `:focus` ke `:focus-visible` dan seluruh gerbang hijau.
Pemilik tetap melihat kotaknya. Sebabnya ada di spesifikasi, bukan di kode:

> Untuk **kolom teks**, peramban mencocokkan `:focus-visible` walau fokusnya datang dari
> ketukan jari atau klik tetikus — karena kolom yang sedang menerima ketikan dianggap selalu
> layak diberi penanda.

Jadi `:focus-visible` **bukan** obat untuk `<input>`. Yang berubah di m025-196 cuma warnanya:
emas → tinta. Dua build, dua kali "selesai", satu cacat yang sama.

## Mekanisme sekarang

CSS sendirian tidak bisa membedakan "fokus karena jari" dari "fokus karena Tab". Jadi:

1. `features/ui/fiezel-zoom-lock.js` memasang `data-fz-input` pada `<html>` —
   bawaannya `touch`; **hanya Tab** yang mengubahnya ke `key`; `pointerdown` /
   `mousedown` / `touchstart` mengembalikannya ke `touch`.
2. `style.css` menutup cincin saat `html[data-fz-input="touch"]`.

Dua keputusan yang jangan dibalik:

- **`outline-color:transparent`, bukan `outline:none`.** Lebar dan offset cincin tetap ada,
  jadi nol piksel bergeser saat mode berpindah — dan aturan `a11y-test` "setiap outline yang
  dimatikan punya penanda pengganti" tidak dilanggar, karena tidak ada outline yang dimatikan.
- **Bawaan `touch`, bukan `key`.** Kalau JS gagal dimuat, atributnya tidak pernah ada, aturan
  penyembunyi tidak pernah cocok, dan cincin tetap muncul. Kegagalan jatuh ke sisi aman
  aksesibilitas.

**Mengetik huruf tidak menyalakan cincin.** Kalau ya, kotaknya kembali muncul begitu murid
mulai mengetik namanya — persis cacat yang sedang dibuang.

## Gerbang, dan lubang di gerbangku sendiri yang kutemukan

`tests/app-interaction-policy-test.js` naik 26 → 34 assert, termasuk uji perilaku sungguhan:
`Policy.install()` dijalankan atas dokumen tiruan, lalu peristiwa ditembakkan.

Bentuk **pertama** assert "mengetik huruf tidak menyalakan cincin" menembak huruf **sesudah**
Tab, lalu memeriksa nilainya masih `key` — yang benar walau setiap tombol menyalakan mode
papan tik. Assert itu **tidak bisa merah**, jadi ia tidak menjaga apa pun. Ketahuan justru
saat aku menjalankan bukti merahnya, dan sudah diperbaiki: huruf kini ditembak dari garis
dasar **sentuh**.

Bukti merah tiga arah, semuanya turun ke 33/34 lalu pulih ke 34/34:
hapus aturan penyembunyi · buat setiap tombol menyalakan mode papan tik · hapus bawaan `touch`.

## Langkah berikutnya

1. Pemilik menekan **Update from Remote → Deploy HEAD Commit** di cPanel.
2. **Actions → FIEZEL Deploy Site → Run workflow** pada `main` untuk menuntut bukti `m025-197`.
3. Tutup total aplikasi di HP lalu buka lagi (`sw.js` sengaja tidak memanggil `skipWaiting()`).

## Utang yang MASIH milik sesi neural-voice

`#fiezelDiagSearch` (13px) dan `#fiezelDiagText` (11px) masih di bawah lantai 16px. Gayanya
disuntik dari `fiezel-diag-panel.js` dengan selector ID. Berkas itu di build ini hanya berubah
pada satu angka `DIAG_BUILD`, ditulis `tools/bump-build.mjs` — nol baris logika disentuh.
