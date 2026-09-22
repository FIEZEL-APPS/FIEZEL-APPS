# Audit UI/UX FIEZEL — 23 September 2026 (build m025-360)

Salinan kerja dari laporan audit (artifact claude.ai `3Azvsqy359r5EpLa4PKbPH`) supaya sesi
berikutnya tidak bergantung pada tautan luar. Status perbaikan per temuan ada di
`docs/handoffs/AUDIT-UIUX-F01-F28-HANDOFF.md`.

Lingkup audit: aplikasi live `fiezel.my.id/app` versi 5.19.0 (build m025-360), diuji sebagai
murid baru lewat dua jalur onboarding, ditambah demo guru dan landing page. Chromium
(Playwright) 390×844 dan 1440×900, bahasa Indonesia; Thai hanya dicek sampai langkah 1
onboarding. axe-core 4.13 (WCAG 2.2 AA) di onboarding, Home, Latihan, Progres. Tidak diuji:
iPhone/Safari, login Google, suara/mikrofon, PAW Arena, Duel, layar "Mau diingatkan?".

Ringkasan: 28 temuan — 5 kritis, 16 sedang, 7 minor.

## Masuk pertama & tes awal

- **F01 (Kritis) Tombol "Mulai tes penempatan" tidak memulai tes.** Level dilewati → Home +
  tur, tes tidak muncul. Level A2 → gerbang "Mau belajar di A2?" yang meminta Ujian Naik
  Level. Saran: tombol langsung membuka tes layar penuh; tur dan notifikasi menunggu.
- **F02 (Kritis) CTA Home buntu.** "Lanjutkan sesi" untuk murid belum dites hanya memunculkan
  toast "Latihan terbuka setelah tes awal selesai." (ikon centang), tanpa jalan ke tes.
  Saran: "Mulai tes awal · ±5 menit", ikon toast sesuai jenis pesan.
- **F03 (Kritis) "Bukan ujian, bisa dihentikan kapan saja" ternyata ujian berpenalti.** Keluar
  di soal 1 Ujian Naik Level = gagal + kunci 24 jam. Saran: tes awal tanpa penalti; layar
  aturan sebelum ujian berisiko; murid baru tidak diarahkan ke ujian dari onboarding.
- **F04 (Sedang) Lima konsep tes tumpang tindih.** Tes penempatan 25, Ujian Naik Level 25,
  Tes Level 12, Tes singkat 5, "Sudah bisa? Lewati" 5; "Level A2 · terverifikasi sampai A1"
  vs "Belum diuji · A2". Saran: satu tes awal kanonis; status "Level kerja: A2 · belum dites".
- **F05 (Sedang) Pertanyaan diulang, jalan keluar membingungkan.** Tujuan ditanya lagi di
  Rencana Hari Ini dalam bahasa Inggris; judul langkah 3 bertanya level lagi; tiga tombol
  keluar. Saran: simpan sekali, satu tombol lewati, judul "Mau dites sekarang?".
- **F06 (Kritis) Nama panggilan otomatis menjadi ID publik dan ikut liga.** Langkah 1
  mewajibkan nama tanpa menjelaskan kegunaannya; `registerStudentOnce` membuat profil online
  (mis. @sari2) dengan `friendsVisible: true` dan `leagueOptIn: true`. FAQ landing: "Kami
  tidak meminta nama…". Saran: jelaskan di langkah nama, papan teman + liga opt-in (bawaan
  mati), murid memilih ID sendiri, selaraskan landing.

## Saat belajar: kuis & materi

- **F07 (Sedang) Label DICOBA/BENAR pecah per huruf** (`::after` terjepit ~20 px).
- **F08 (Sedang) Dua tombol "Lanjut"; yang mengambang menembus dialog "Yakin keluar?".**
- **F09 (Sedang) Pembahasan panjang dan berulang.** Kalimat boilerplate sama di intro, umpan
  balik salah, pembahasan benar; umpan balik salah tetap tampil setelah jawaban benar; ~3
  ketukan per soal. Saran: satu kalimat aturan + satu contoh, pembahasan lengkap dilipat,
  umpan balik lama diganti, jawaban benar langsung menawarkan "Lanjut".
- **F10 (Sedang) Materi tidak mengajarkan aturannya.** Intro Materi 15 hanya strategi umum;
  soal 1 identik dengan contoh; typo "client call.."; soal 1 Ujian A2 berupa pertanyaan
  strategi dengan judul template tersisip ("…di Menyatakan setara dengan as ... as?").
- **F11 (Minor) Soal terjepit di balon bicara** (~45% lebar, 7 baris, pilihan D di bawah layar).

## Navigasi & lapisan

- **F12 (Sedang) Nama tab tidak cocok dengan isinya.** "Profil" → layar "Teman"; Beranda
  disebut "Hari ini"/"Home"/"Beranda"; sub-tab "KelasKu"/"Progres" bentrok dengan tab utama;
  label KelasKu selalu hijau tebal; layar Tes Level tanpa tab aktif.
- **F13 (Sedang) Lapisan saling menimpa.** Gelembung maskot menutupi kartu; tur + modal lencana
  bersamaan di desktop; modal lencana tanpa tombol tutup dan Esc.
- **F14 (Sedang) Toast status server setiap aplikasi dibuka** (termasuk di tengah tur).
- **F15 (Minor) Halaman Progres terlalu panjang untuk murid baru** (~4.400 px, "Belum terukur"
  5×, tabel "Lab komunikasi beasiswa" tak sejajar, reset di dasar halaman).
- **F16 (Sedang) Pengaturan rusak di 390 px, menu developer terbuka.** Deskripsi satu kata per
  baris, dropdown terpotong; grup "Lanjutan" memuat Creator Learning Report / Endpoint Webhook
  / Pasang Creator Hub; judul ganda; tur menyebut "FIEZEL Control Room".

## Visual & konsistensi

- **F17 (Sedang) Tombol utama tidak punya satu wujud.** "Lanjut" aktif putih = sekunder,
  nonaktif pink = terpilih; maroon di Home/kuis, emas di Latihan; token menyimpang dari
  `docs/DESIGN-SYSTEM.md`; empat blok `:root` di style.css + satu di fiezel-2.css.
- **F18 (Sedang) Pilihan terpilih nyaris tak terlihat.** Kartu tujuan terpilih 1,18:1; chip
  level maroon (dua bahasa visual); tanpa role/aria-checked; segmen progres 1,03–1,08:1.
- **F19 (Minor) Hierarki tipografi dan spasi kata** (H2 24/400 vs 13/700; letter-spacing
  negatif di teks 12,5–13 px).
- **F20 (Minor) Bahasa dan istilah bercampur** (runtun/streak, PB, Gem, Prasasti, "Practice
  pathway", "ADAPTIVE ENGLISH", "Coba Bahasa Jepang · masih draf", "Aku Fiezel" vs PAW).
- **F21 (Minor) Desktop = ponsel yang dilebarkan** (kolom 720 px, kartu onboarding/tur 1.408 px).

## Aksesibilitas

- **F22 (Kritis) Zoom dikunci, penggantinya belum ada.** `user-scalable=no` +
  `fiezel-zoom-lock.js`; utang "pengatur ukuran teks" belum ada. Terukur: chip "BELUM DIUJI ·
  A2" 1,27:1 @10,6 px; teks lencana belum didapat 2,21–2,46:1 @11,2 px; subjudul Rencana Hari
  Ini / PAW ARENA 3,91 / 3,27:1; label "Level" badge desktop 9,3 px; kontrol "Ganti" 10,6 px;
  nav bawah guru 9,9 px. Saran: pengatur ukuran teks 100/115/130% di Pengaturan (atau pinch
  lagi), teks ≥12 px, perbaiki kontras.

## KelasKu untuk guru

- **F23 (Sedang) "Buka Demo Guru" tidak langsung ke demo** (bahasa → nama → peran dulu).
- **F24 (Minor) Font dasbor guru diblokir CSP** (`@import` Google Fonts di teacher-shell.css;
  CSS guru juga dimuat untuk murid).
- **F25 (Minor) Dasbor guru terlalu padat** (dua lapis nav, "Braincore", "Hapus kelas" sejajar
  "Ubah", nav bawah 7 item 9,9 px).

## Landing page

- **F26 (Sedang) Nav landing meluap di 390 px** (428 px, halaman geser ke samping; kredit
  "CREATE BY" di atas nav).
- **F27 (Sedang) Hero tidak menjelaskan produk** (tagline Inggris; label dekoratif bertumpuk;
  klaim tidak sesuai aplikasi: 25 soal, tidak meminta nama, demo langsung).

## Performa

- **F28 (Sedang) Pembukaan pertama sangat berat:** 196 berkas (188 `<script>`), ~3,2 MB
  transfer / 13,9 MB terdekompresi sebelum soal pertama, termasuk bank konten JSON dan modul
  guru. Saran: lazy import per fitur, bundel guru terpisah, bank diambil saat latihan dibuka.

## Yang sudah bagus (pertahankan)

Tab Latihan; umpan balik salah yang manusiawi + "Aku masih belum paham"; splash sekali
sehari dan hormat `prefers-reduced-motion`; onboarding Thai tanpa bocoran; cincin fokus,
target sentuh ≥24 px; aksi berisiko berkonfirmasi; banner DEMO guru; landing jujur soal batas.

## Efek samping audit

Pendaftaran otomatis F06 membuat beberapa profil online uji di server produksi (mis. @sari2).
Aman dihapus.
