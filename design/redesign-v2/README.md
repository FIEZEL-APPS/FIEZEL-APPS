# Redesain aplikasi FIEZEL — arah "Lembut"

Mock desain untuk **aplikasi saja**. Landing page website sengaja tidak ada di sini
maupun di berkas mana pun: owner meminta redesain dibatasi ke aplikasi.

Owner memilih **arah B "Lembut"** dari empat arah yang diajukan. Seluruh layar
aplikasi dibangun ulang dalam arah itu — 24 artboard.

## Watak arah ini

Tidak ada garis tepi di mana pun. Kedalaman datang dari bayangan halus dan ruang
kosong, bukan dari garis. Huruf membulat, pastel diredam, dan elemen per layar
sengaja lebih sedikit daripada yang muat.

| | |
| --- | --- |
| Huruf judul | Quicksand 700 |
| Huruf badan | Nunito 400–700 |
| Huruf Thai | Noto Sans Thai — Quicksand dan Nunito tidak punya glif Thai |
| Latar | `#FBF7F3` · Kertas `#FFFFFF` |
| Aksen | `#9B3A4A` (marun diredam) |
| Kedalaman | `0 14px 32px rgba(46,39,36,.07)` — tidak ada `border` |
| Radius | kartu 28 · ubin 26 · pil 999 |

Enam ranah latihan punya blok pastel diredam dengan tinta gelap masing-masing.
Semua pasangan teks/latar lolos WCAG AA; gerbang di `build.mjs` menolak build
kalau ada yang jatuh.

## Isi

| Halaman kanvas | Artboard |
| --- | --- |
| Menu utama | `Main` `MainThai` `Latihan` `KelasKu` `Progres` `Profil` `Pengaturan` |
| Masuk & Perkenalan | `Login` `Daftar` `Splash` `Intro1` `Intro2` `Intro3` `ObNama` `ObTujuan` `ObTes` `ObSelesai` |
| Sesi belajar | `Peta` `Soal` `Benar` `Salah` `Hasil` `TanyaMira` |
| Sistem desain | `Sistem` |

`Main.dc.html` adalah artboard pintu masuk.

## Lima aturan maskot

Lahir dari dua temuan owner, dan keduanya dijaga gerbang otomatis.

**"Badannya bocor."** Gambar dipasang dengan offset negatif di dalam wadah
ber-`overflow: hidden`, jadi kaki Mira dan ekor Nusa terpotong tepi kartu; hiasan
lingkaran padat yang ikut terpotong wadah terbaca sebagai bercak bersudut.

**"Mascot di Tanya Mira jelek sekali."** Pose `head-explain` dipakai sebagai avatar
34px di tiap gelembung. Komposisinya lebar — topi lebar, tangan menunjuk, sanggul di
luar kepala — jadi begitu diperkecil, wajahnya tinggal belasan piksel.

Aturannya sekarang, di `b-kit.mjs`:

1. Maskot berdiri di **panggung miliknya sendiri** — kotak seukuran rasio aspek
   gambar (`RASIO`), jadi tidak ada sisi yang terpotong.
2. **Tidak ada offset negatif.** Tidak pernah.
3. Wadah tidak boleh lebih pendek dari panggungnya.
4. Hiasan warna memakai `radial-gradient` yang meluruh (`cahaya()`), bukan bentuk padat.
5. Maskot **tidak pernah dirender di bawah `MIN_MASKOT` = 72px** pada sisi panjangnya.
   Untuk tempat yang lebih sempit dipakai `paw()` atau `inisial()` — bukan wajah yang
   diperkecil. `maskot()` dan `potret()` melempar galat kalau dilanggar.

Tanya Mira sekarang menampilkan Mira **sekali** di kartu pembuka pada 118px, dan
gelembung sesudahnya tidak memakai wajah sama sekali — posisi dan warna sudah cukup
memberi tahu siapa yang bicara.

## Diikat ke kenyataan kode, bukan dikarang

- **Navigasi bawah** memakai lima tab yang ada di `index.html`:
  Latihan · KelasKu · Hari ini · Progres · Profil.
- **Auth** memakai jalur yang benar-benar ada: nama + kata sandi
  (`features/auth/fiezel-account.js`), Masuk dengan Google
  (`features/auth/fiezel-google.js`), Lanjutkan dengan Puter, dan lanjut tanpa akun.
- **Ikon** diambil dari `lucide.min.js` yang sudah dipakai app (`icons.json`).
- **Maskot** memakai aset asli `assets/characters/` (Nusa & Mira, 9 pose).
- **Dua bahasa**: `Main` dan `MainThai` adalah satu tata letak dengan dua bank copy,
  cerminan pasangan `copy-id-*` / `copy-th-*`.

### Satu penyimpangan yang disengaja dari sketsa yang dipilih

Sketsa arah B memakai navigasi bawah **berikon saja**. Versi penuh ini menambahkan
label di bawah ikon: lima tujuan dengan ikon yang tidak jelas sendirinya (KelasKu vs
Progres) tidak boleh bergantung pada tebakan, apalagi di aplikasi dua bahasa.
Kalau owner lebih suka versi tanpa label, hapus `label` di `nav()` di `b-kit.mjs`.

## Utang yang harus dibayar saat implementasi

1. **Belum ada kunci i18n yang dibuat.** Semua teks di artboard masih literal. Waktu
   diimplementasi, setiap kalimat wajib mendarat sebagai pasangan
   `copy-id-<domain>` + `copy-th-<domain>` sesuai CLAUDE.md.
2. **Huruf Thai** perlu diputuskan resmi. Mock memasangkan `Noto Sans Thai`.
3. **Tombol Google** digambar sebagai penampung netral — aset resmi menggantikannya.

## Cara membangun ulang

```bash
cd design/redesign-v2
node build.mjs    # 24 artboard + canvas.json, gerbang kontras
node preview.mjs  # render di Chromium, gerbang luberan + maskot
```

**`build.mjs` gagal-keras** kalau ada pasangan warna teks di bawah 4.5:1 — keluar dengan
kode 1 dan tidak menulis satu artboard pun. Ia juga menanggalkan spasi di ujung baris,
karena gerbang A9/A10 menolaknya lewat `git diff --check`.

**`preview.mjs` gagal-keras** kalau ada isi yang meluber keluar bingkai, maskot yang
terpotong wadahnya, atau maskot di bawah 72px. Angka sekarang: 24 layar, 0 luberan,
0 bocor, 0 terlalu kecil. Ia hanya menulis ke direktori scratchpad.

`fonts.mjs` mengunduh huruf Google sekali lalu memakainya lokal, supaya pratinjau tidak
bergantung jaringan dan tipografinya benar-benar terlihat saat dirender.
