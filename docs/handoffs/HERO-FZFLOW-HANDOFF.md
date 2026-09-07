# HERO FZFLOW — animasi alur guru–murid di landing page (m025-289)

Wewenang: OWNER. Status: SELESAI untuk kedua halaman (id & th).

## Apa yang dibangun

Hero `fiezel.my.id` sebelumnya memperlihatkan dua device diam berdampingan: HP murid dan
MacBook guru. Yang tidak terlihat adalah **hubungan di antara keduanya** — bahwa tugas
berangkat dari guru, dikerjakan murid, dan hasilnya kembali. Itu justru satu-satunya hal
yang membuat produk ini berbeda dari aplikasi latihan biasa, dan halaman depannya diam
soal itu.

`fzflow` adalah lapisan animasi non-interaktif di ruang antara kedua mockup, dua lapis:

- **Lapisan alur (foreground)** — kartu tugas berangkat dari laptop guru, mendarat di HP
  murid, berubah jadi kartu hasil, lalu kembali; lencana notifikasi menyala di sisi guru.
  Loop otomatis, tanpa interaksi.
- **Lapisan atmosfer (background)** — aura berdenyut di belakang tiap device, aksara
  bahasa yang dipelajari melayang halus, garis tepi menyapu. Opasitas rendah, gerak
  lambat: prioritas visual tetap di lapisan alur.

Maskot **MIRA** (guru) turun dari balik laptop dan **PAW** (murid) melompat menyambut;
pose MIRA mengikuti fase alur, bukan berjalan sendiri. Master timeline 28 detik.

## Keputusan yang perlu dibaca sebelum menyunting

**Nama `@keyframes` semuanya berprefiks `fzflow-`.** `website/style.css` sudah memuat
puluhan keyframes lain, dan `tests/css-keyframe-uniq-test.js` memerahkan dua definisi
BERBEDA dengan nama sama — bentuk persis bug m025-263. Prefiks itu bukan gaya penamaan,
itu pagar.

**Halaman Thai ikut, bukan menyusul.** `website/th/index.html` menerima panggung guru dan
animasi yang sama. Aturan repo: setiap yang dilihat pengguna lahir dua bahasa. Landing page
Thai sempat tertinggal satu gelombang rebranding, dan konsekuensinya nyata — separuh
audiens FIEZEL tidak melihat produk gurunya ada.

**Seluruh lapisan dekoratif `pointer-events: none`** dan menghormati
`prefers-reduced-motion`: keadaan diamnya dirancang tetap enak dilihat, bukan
`animation:none` yang meninggalkan elemen di posisi acak.

## Riwayat penggabungan (kenapa nomornya 289)

Cabang ini dibuka saat `main` di m025-282. Selama pengerjaan `main` bergerak **tujuh
rilis** — kurikulum, kunci i18n hantu, demo guru, dua gelombang branding. Nomor build
dinaikkan mengikuti setiap kali, bukan dipaksakan: gerbang keunikan menolak nomor yang
sudah diklaim di hulu, dan A7 menuntut base+1 persis. Konfliknya selalu hanya di keempat
penanda build dan berkas laporan.

A9 sempat merah pada spasi di ujung dua baris `website/th/index.html`; dibersihkan, bukan
dikecualikan.

## Yang sengaja BELUM dikerjakan

- Animasi ini murni CSS/SVG di dalam halaman; tidak ada aset media baru dan tidak ada
  permintaan jaringan tambahan. Kalau kelak ingin lebih kaya, batas itu yang pertama akan
  ditawar — dan sebaiknya diukur dulu terhadap waktu muat halaman depan.
- Naskah pada kartu alur memakai ikon dan angka, bukan kalimat, sehingga netral bahasa.
  Kalau nanti ada label berkata-kata, ia wajib lewat copy-map id/th seperti naskah lain.
