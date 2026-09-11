# Redesign v2 — mock desain aplikasi FIEZEL

Mock desain untuk **aplikasi saja**. Landing page website sengaja tidak ada di sini:
owner meminta redesain dibatasi ke aplikasi.

Kanvas berisi dua hal:

1. **Pilihan arah** — empat arah desain yang berbeda betul di kartu, huruf, warna, dan
   cara maskot ditampilkan. Tiga layar per arah (Hari ini, Latihan, Soal).
2. **Rancangan lengkap versi pertama** — 24 artboard, disimpan sebagai pembanding
   sampai satu arah dipilih. Begitu owner memilih, seluruh layar dibangun ulang
   dalam arah itu.

## Empat arah

| Arah | Kartu | Huruf | Watak |
| --- | --- | --- | --- |
| **A — Kartu Tebal** | garis 2,5px, bayangan padat tanpa blur | Fredoka + Nunito | paling ramai, ramah anak |
| **B — Lembut** | tanpa garis tepi, bayangan halus, radius besar | Quicksand + Nunito | paling tenang, paling lapang |
| **C — Editorial Rimba** | krem bergaris rambut emas, radius kecil | Lora (serif) + Work Sans | paling dewasa, condong ke SMA dan guru |
| **D — Blok Warna** | tanpa kartu; pita warna penuh dari tepi ke tepi | Archivo | paling berani |

**Arah C punya konsekuensi.** `assets/brand/BRAND-GUIDE.md` menyatakan "Plus Jakarta Sans
untuk semuanya… tidak ada huruf display kedua, tidak ada serif", dan
`tests/paw-mascot-test.js` menjaganya. Memilih C berarti panduan merek dan gerbang itu
ikut diperbarui — keputusan owner.

## Aturan maskot

Owner menemukan maskot yang "warnanya atau badannya bocor" di rancangan pertama. Memang
benar: gambar dipasang dengan offset negatif di dalam wadah ber-`overflow: hidden`, jadi
kaki dan ekornya terpotong tepi kartu; dan hiasan lingkaran padat yang ikut terpotong
wadah terbaca sebagai bercak bersudut.

Aturan yang berlaku sekarang, dipakai keempat arah (`arah-kit.mjs`):

1. Maskot berdiri di **panggung miliknya sendiri** — kotak yang ukurannya dihitung dari
   rasio aspek gambar (`RASIO`), jadi tidak ada sisi yang terpotong.
2. **Tidak ada offset negatif.** Tidak pernah.
3. Wadah yang memuat panggung tidak boleh lebih pendek dari panggungnya.
4. Hiasan warna memakai `radial-gradient` yang meluruh ke transparan (`cahaya()`), bukan
   bentuk padat yang dipotong wadah.

`arah-preview.mjs` memeriksa **tiap gambar terhadap wadah pemotongnya** dan melaporkan sisi
yang jatuh di luar. Angka sekarang: 12 layar, **0 bocor**.

## Diikat ke kenyataan kode, bukan dikarang

- **Navigasi bawah** memakai lima tab yang ada di `index.html`:
  Latihan · KelasKu · Hari ini · Progres · Profil.
- **Auth** memakai jalur yang benar-benar ada: nama + kata sandi
  (`features/auth/fiezel-account.js`), Masuk dengan Google (`features/auth/fiezel-google.js`),
  Lanjutkan dengan Puter, dan lanjut tanpa akun.
- **Ikon** diambil dari `lucide.min.js` yang sudah dipakai app (`icons.json`).
- **Maskot** memakai aset asli `assets/characters/` (Nusa & Mira, 9 pose).
- **Dua bahasa**: `Main` dan `MainThai` adalah satu tata letak dengan dua bank copy,
  cerminan pasangan `copy-id-*` / `copy-th-*`.

## Utang yang harus dibayar saat implementasi

1. **Belum ada kunci i18n yang dibuat.** Semua teks di artboard masih literal. Waktu
   diimplementasi, setiap kalimat wajib mendarat sebagai pasangan
   `copy-id-<domain>` + `copy-th-<domain>` sesuai CLAUDE.md.
2. **Huruf Thai.** Plus Jakarta Sans tidak punya glif Thai. Mock memasangkan
   `Noto Sans Thai`; keputusan final perlu diambil sebelum implementasi, dan berbeda
   per arah (Fredoka, Quicksand, Lora, dan Archivo juga tidak punya glif Thai).
3. **Tombol Google** digambar sebagai penampung netral — aset resmi Google
   menggantikannya di produksi.

## Cara membangun ulang

```bash
cd design/redesign-v2
node build.mjs         # 36 artboard + canvas.json, cek kontras WCAG
node preview.mjs       # render rancangan versi pertama, laporkan luberan
node arah-preview.mjs  # render empat arah + gerbang maskot-bocor
```

`build.mjs` gagal-keras kalau ada pasangan warna teks di bawah 4.5:1 — keluar dengan kode 1
dan **tidak menulis satu artboard pun**, supaya token yang jatuh tidak pernah ikut terkirim.
Ia juga menanggalkan spasi di ujung baris, karena gerbang A9/A10 menolaknya lewat
`git diff --check`.

`preview.mjs` dan `arah-preview.mjs` hanya menulis ke direktori scratchpad; berkas kerja
tidak disentuh. `fonts.mjs` mengunduh huruf Google sekali lalu memakainya lokal, supaya
perbedaan tipografi antar-arah benar-benar terlihat saat dirender.
