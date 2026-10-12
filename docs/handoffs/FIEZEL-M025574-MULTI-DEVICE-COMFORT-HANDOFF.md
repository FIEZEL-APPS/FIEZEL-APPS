# FIEZEL-M025574 — Kenyamanan tampilan multi-device: iPhone, iPad, desktop (`m025-574`)

**Status:** siap review OWNER. Keputusan merge dan rilis tetap di tangan OWNER/MASTER.
Tidak ada teks baru yang dilihat murid, jadi i18n id/th tidak tersentuh.

## 1. Permintaan OWNER

> *"COBA AUDIT UI DAN UX PWA FIEZEL PADA tampilan iPhone, Tablet/iPad, dan Desktop"*
> *"KAMU PERBAIKI SEMUA, AGAR TAMPILAN DI MULTI DEVICE NYAMAN DI PANDANG MATA"*

## 2. Cara audit

Chromium (Playwright) dijalankan pada 5 ukuran:

- iPhone SE 375×667
- iPhone 15 393×852, dengan notch tiruan 59/34
- iPad tegak 820×1180
- iPad mendatar 1180×820
- desktop 1440×900

Ada 13 layar di tiap ukuran (Hari ini, Latihan, Grammar, Kosakata, Membaca, Menulis, Bicara &
Dengar, Perpustakaan, Progres, KelasKu, Game, Profil, Kuis), ditambah layar pertama dan kuis
di ponsel mendatar 852×393. Yang diukur per layar: luapan ke samping, elemen terpotong,
target sentuh di bawah 44 px, teks di bawah 12 px, dan kontras teks WCAG. Setiap temuan
kontras juga dicek secara visual dari potongan screenshot, karena latar gradien bisa
menyesatkan pengukuran.

## 3. Temuan → perbaikan

| # | Temuan (terukur) | Perangkat | Perbaikan |
|---|---|---|---|
| 1 | Soal kuis putih di kartu krem, **tidak terbaca**. `fiezel-paw-slot.js` memakai anchor `side` (≥980px) dan `peek` (ponsel mendatar); di kedua anchor `#quizStem` berada di kartu terang, sedangkan `.question-main` dipaku `#FFFFFF`. | iPad mendatar, desktop, ponsel mendatar | §15.1: soal di luar gelembung gelap bertinta `#241A11`. |
| 2 | Judul kartu hilang: Membaca "Materi level A1", Menulis (topik dan rubrik), Tes Level "A1", Progres "Minggu ini". Penyebabnya `mobile-edge-fit.css` memaku `.card b/strong/h1-h4` `#FFFFFF` untuk tema kartu gelap yang sudah diganti kartu putih. | semua | §15.2: `.card :is(h1..strong){color:inherit}`, dimuat sesudah mobile-edge-fit dengan spesifisitas sama. Petak statistik Progres dan lencana Prasasti terkunci tetap putih. |
| 3 | Teks redup kartu `#CBD5E1` = 1,48:1 di putih (label hari, "Level kamu", "53 bacaan", "TOPIK A1", "0 kata", catatan Prasasti). | semua | Di sumbernya (`mobile-edge-fit.css`) diganti `#5B6472` (5,9:1). Pil gelap dan lencana Prasasti dikecualikan, di mobile-edge-fit dan di vivid. |
| 4 | Judul buku Perpustakaan putih di kartu putih; kartu Undercover bertulisan gelap di latar gelap; kartu Tujuan Belajar (judul gelap di kartu gelap, opsi putih di petak putih). | semua | §15.3, aturan khusus dengan awalan `html body #app`. |
| 5 | Kontras kecil: chip VOCAB/GRAMMAR 2,34; label tab bawah 3,1 pada 10 px; amber (TARGET HARIAN, HARI, pil level) 3,2; biru (IPA, "Semua Modul") 3,9; "Online" 3,6. | semua | Amber `#B45309`, biru `#0369A1`, hijau `#047857`, label tab `#6B5658` opasitas 1 pada 11 px; semuanya ≥4,5:1. |
| 6 | Tujuh hari kosong di "Minggu ini" digambar hitam pekat, terbaca seperti tujuh hari selesai. | semua | §15.4: hari kosong = petak terang bergaris, aktif = emas, hari ini = garis putus amber. |
| 7 | Baris geser (alat Grammar, tab Progres) terpotong di tepi kanan tanpa tanda bisa digeser. | ponsel | §15.5: tepi memudar dan ruang akhir 28 px. |
| 8 | Teks label 10–10,5 px dan tombol ikon topbar 34 px. | semua | §15.6: dinaikkan ke 11–11,5 px. §15.7: area ketuk 44 px lewat `::after` tak terlihat. |
| 9 | Tablet dan desktop memakai kolom HP 440 px (29% layar 1440); tab bawah membentang 1440 px dengan jarak antar-ikon sekitar 240 px; topbar tidak sejajar isi; latar berganti putih/krem per layar. | iPad, desktop | §15.8 (≥768 px): kolom 720 px (760 px di ≥1200 px), dok tab mengambang di tengah (560 px, radius 24), topbar sejajar kolom, latar seragam. **Scroll halaman tetap milik jendela** (tanpa 100dvh, pelajaran #602/#603). |

## 4. Bukti

- Pemindai kontras setelah perbaikan, di ponsel dan desktop: semua layar 0 temuan, kecuali
  yang ternyata salah tandai sesudah dicek visual: teks gradien poster Game, cincin "0/17"
  dan "A1" di hero gelap, dan emoji sampul buku. Satu yang tersisa nyata: kicker
  "BOSS RAID SINTAKSIS" putih di atas merah, 3,67:1 pada 11 px. Ini tidak diubah.
- Screenshot 5 ukuran × 13 layar ditinjau visual sesudah perbaikan.
- Gerbang baru `tests/multi-device-comfort-test.js` (7 invarian, dengan bukti negatif),
  terdaftar di `quality.yml`.

## 5. Langkah berikutnya

- Uji fisik OWNER di iPhone, iPad, dan laptop.
- Utang yang dicatat jujur: `.topbar`, `.card`, dan teks redup masih punya banyak lapisan
  aturan `!important` yang saling menimpa di mobile-edge-fit, vivid, tactile-clay, dan
  style.css. Perbaikan di sini sengaja tidak membereskan lapisan itu, dan gerbang di atas
  yang menjaga hasilnya.
- Kicker "BOSS RAID SINTAKSIS" (3,67:1) bisa digelapkan merahnya pada putaran desain Game.
