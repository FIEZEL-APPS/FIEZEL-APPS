# Redesign v2 — "Ekspedisi"

Mock desain penuh FIEZEL: masuk/daftar, perkenalan, landing page, dan semua menu.
25 artboard, dipublikasikan sebagai kanvas Claude Design.

## Arah desain

Tiga referensi yang diberikan owner menyumbang **bahasa tata letak**: panel terbelah
untuk auth, blok warna penuh satu layar untuk carousel, tombol pil gemuk, titik
indikator, sudut membulat besar. Bahasa itu dipasang di atas **merek FIEZEL yang
sudah ada**, bukan menggantikannya:

| Dari panduan merek | Dari seni karakter | Dari referensi |
| --- | --- | --- |
| Marun `#8C2233` (tindakan utama), emas `#D8B36B` | Hijau rimba `#1F4D3A` (jaket Mira), krem `#FFF8EF` | Enam blok pastel untuk enam ranah latihan |
| Plus Jakarta Sans, tanpa huruf display kedua | Kuning matahari `#FFC94F` (aksen, bandana Nusa) | Pil, radius besar, titik indikator |

Maskotnya **Nusa** (monyet berbandana paw) dan **Mira** (anak penjelajah) —
aset asli dari `assets/characters/`, bukan ilustrasi baru. Sembilan pose dipakai.

## Isi

| Halaman kanvas | Artboard |
| --- | --- |
| Masuk & Perkenalan | `Login` `Daftar` `Splash` `Intro1-3` `ObNama` `ObTujuan` `ObTes` `ObSelesai` |
| Menu utama | `Main` `MainThai` `Latihan` `KelasKu` `Progres` `Profil` `Pengaturan` |
| Sesi belajar | `Peta` `Soal` `Benar` `Salah` `Hasil` `TanyaMira` |
| Landing & sistem | `Landing` `Sistem` |

## Yang diikat ke kenyataan kode, bukan dikarang

- **Auth** memakai jalur yang benar-benar ada: nama + kata sandi
  (`features/auth/fiezel-account.js`), Masuk dengan Google
  (`features/auth/fiezel-google.js`), Lanjutkan dengan Puter, dan lanjut tanpa akun.
  Bukan email/Facebook/Apple seperti di referensi.
- **Navigasi bawah** memakai lima tab yang ada di `index.html`:
  Latihan · KelasKu · Hari ini · Progres · Profil.
- **Ikon** diambil dari `lucide.min.js` yang sudah dipakai app (`icons.json`).
- **Angka di landing** memakai angka resmi `assets/brand/BRAND-GUIDE.md` tanpa
  dibulatkan, dan bagian "Apa yang FIEZEL tidak janjikan" menjaga aturan klaim jujur.
- **Dua bahasa**: `Main` dan `MainThai` adalah satu tata letak dengan dua bank copy,
  cerminan pasangan `copy-id-*` / `copy-th-*`. Nilai Thai diambil dari bank yang
  sudah ada bila kuncinya tersedia.

## Utang yang harus dibayar saat implementasi

1. **Belum ada kunci i18n yang dibuat.** Semua teks di artboard masih literal.
   Waktu diimplementasi, setiap kalimat wajib mendarat sebagai pasangan kunci
   `copy-id-<domain>` + `copy-th-<domain>` sesuai CLAUDE.md.
2. **Huruf Thai.** Plus Jakarta Sans tidak punya glif Thai. Mock ini memasangkan
   `Noto Sans Thai`; keputusan huruf Thai final perlu diambil sebelum implementasi.
3. **Tombol Google** digambar sebagai penampung netral — aset resmi Google
   menggantikannya di produksi.

## Cara membangun ulang

```bash
cd design/redesign-v2
node build.mjs      # tulis 25 .dc.html + canvas.json, cek kontras WCAG
node preview.mjs    # render tiap artboard di Chromium, laporkan luberan
```

`build.mjs` gagal-keras kalau ada pasangan warna teks di bawah 4.5:1.
`preview.mjs` hanya menulis ke direktori scratchpad; berkas kerja tidak disentuh.
